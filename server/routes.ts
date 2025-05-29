import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { insertProcessingJobSchema } from "@shared/schema";

// WebSocket connections map for real-time updates
const wsConnections = new Map<number, WebSocket[]>();

// Function to broadcast updates to clients subscribed to a job
function broadcastJobUpdate(jobId: number, data: any) {
  const connections = wsConnections.get(jobId);
  if (connections) {
    const message = JSON.stringify(data);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const allowedExtensions = ['.xlsx', '.xls'];

    const hasValidType = allowedTypes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (hasValidType || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// Ensure required directories exist
const ensureDirectories = () => {
  const dirs = ['uploads', 'output', 'static'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
    }
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  ensureDirectories();

  const httpServer = createServer(app);

  // Setup WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('[WebSocket] Client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe' && data.jobId) {
          // Subscribe to job updates
          const jobId = parseInt(data.jobId);
          if (!wsConnections.has(jobId)) {
            wsConnections.set(jobId, []);
          }
          wsConnections.get(jobId)!.push(ws);
          console.log(`[WebSocket] Client subscribed to job ${jobId}`);
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      // Remove from all subscriptions
      wsConnections.forEach((connections, jobId) => {
        const index = connections.indexOf(ws);
        if (index !== -1) {
          connections.splice(index, 1);
          if (connections.length === 0) {
            wsConnections.delete(jobId);
          }
        }
      });
      console.log('[WebSocket] Client disconnected');
    });
  });

  // Serve static files (generated audio and PDFs)
  app.use('/static', express.static('output'));

  // Upload Excel file and start processing
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { originalname, filename, size } = req.file;

      // Extract company name from filename (e.g., Frequencias_Aroma_Company1.xlsx)
      const companyMatch = originalname.match(/Frequencias_Aroma_(.+)\.(xlsx?|xls)$/i);
      const companyName = companyMatch ? companyMatch[1] : 'Unknown';

      // Create processing job
      const job = await storage.createJob({
        fileName: filename,
        originalName: originalname,
        status: "pending",
        company_name: companyName
      });

      // Start processing in background
      processFileAsync(job.id, req.file.path, originalname);

      res.json({ 
        jobId: job.id, 
        message: 'File uploaded successfully. Processing started.',
        job 
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Upload failed' 
      });
    }
  });

  // Get job status
  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJob(jobId);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      res.json(job);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to get job status' 
      });
    }
  });

  // Get recent jobs
  app.get('/api/jobs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const jobs = await storage.getRecentJobs(limit);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to get jobs' 
      });
    }
  });

  // Download generated files with streaming support
  app.get('/api/download/:jobId/:type', async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const type = req.params.type; // 'audio' or 'pdf'

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (job.status !== 'completed') {
        return res.status(400).json({ message: 'Job not completed yet' });
      }

      let fileName: string;
      let contentType: string;

      if (type === 'audio' && job.audioFileName) {
        fileName = job.audioFileName;
        contentType = 'audio/mpeg';
      } else if (type === 'pdf' && job.pdfFileName) {
        fileName = job.pdfFileName;
        contentType = 'application/pdf';
      } else {
        return res.status(400).json({ message: 'Invalid file type or file not available' });
      }

      const filePath = path.join('output', job.company_name || 'Unknown', fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      const fileSize = fs.statSync(filePath).size;
      const rangeHeader = req.headers.range;

      // Support for range requests (enables download progress and resume)
      if (rangeHeader && type === 'audio') {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const fileStream = fs.createReadStream(filePath, { start, end });
        fileStream.pipe(res);
      } else {
        // Regular download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Accept-Ranges', 'bytes');

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      }

    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Download failed' 
      });
    }
  });

  // Download routes with range support for better mobile experience
  app.get('/api/download/audio/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'output');

    // Find the file in subdirectories
    const findFile = (dir: string, target: string): string | null => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        if (fs.statSync(itemPath).isDirectory()) {
          const found = findFile(itemPath, target);
          if (found) return found;
        } else if (item === target) {
          return itemPath;
        }
      }
      return null;
    };

    const audioPath = findFile(filePath, filename);

    if (!audioPath || !fs.existsSync(audioPath)) {
      console.log(`Audio file not found: ${filename}`);
      return res.status(404).json({ error: 'Audio file not found' });
    }

    try {
      const rangeHeader = req.headers.range;
      const fileSize = fs.statSync(audioPath).size;

      if (rangeHeader) {
        // Parse range header: "bytes=0-1023"
        let [start, end] = rangeHeader.replace(/bytes=/, "").split("-").map(x => parseInt(x, 10));

        if (isNaN(start)) start = 0;
        if (isNaN(end) || end >= fileSize) end = fileSize - 1;

        const contentLength = end - start + 1;
        const stream = fs.createReadStream(audioPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': contentLength,
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${filename}"`
        });

        stream.pipe(res);
      } else {
        // No range header - send entire file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${filename}"`
        });

        const stream = fs.createReadStream(audioPath);
        stream.pipe(res);
      }
    } catch (error) {
      console.error('Error serving audio file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return httpServer;
}

// Background processing function
async function processFileAsync(jobId: number, filePath: string, originalName: string) {
  try {
    // Update job status to processing
    await storage.updateJob(jobId, { status: "processing" });

    // Run Python audio processor
    const pythonProcess = spawn('python3', ['server/audio_processor.py', filePath, originalName, jobId.toString()]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`Processing output: ${data}`);

      // Parse progress updates and send via WebSocket
      const dataStr = data.toString();
      if (dataStr.includes('Progress:')) {
        // Extract progress information from Python output
        const progressMatch = dataStr.match(/Progress: (\d+)\/(\d+) frequencies processed/);
        if (progressMatch) {
          const [, current, total] = progressMatch;
          broadcastJobUpdate(jobId, {
            type: 'audio_preview',
            jobId,
            frequencyProgress: parseInt(current),
            totalFrequencies: parseInt(total),
            currentFrequency: 0, // Will be enhanced later
          });
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Processing error: ${data}`);
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        // Parse output to get processing results
        try {
          const result = JSON.parse(output.trim());
          await storage.updateJob(jobId, {
            status: "completed",
            frequencyCount: result.frequency_count,
            audioFileName: result.audio_file,
            pdfFileName: result.pdf_file,
            frequencyMin: result.frequency_min,
            frequencyMax: result.frequency_max,
            aroma_id: result.aroma_id
          });
        } catch (parseError) {
          console.error('Failed to parse processing output:', parseError);
          await storage.updateJob(jobId, {
            status: "failed",
            errorMessage: "Failed to parse processing results"
          });
        }
      } else {
        await storage.updateJob(jobId, {
          status: "failed",
          errorMessage: errorOutput || `Processing failed with code ${code}`
        });
      }

      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
    });

  } catch (error) {
    console.error('Processing error:', error);
    await storage.updateJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : 'Unknown processing error'
    });
  }
}