import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { insertProcessingJobSchema } from "@shared/schema";

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

  // Download generated files
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

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Download failed' 
      });
    }
  });

  const httpServer = createServer(app);
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
