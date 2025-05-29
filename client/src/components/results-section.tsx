
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Music, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Job {
  id: number;
  fileName: string;
  originalName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  frequencyCount?: number;
  audioFileName?: string;
  pdfFileName?: string;
  frequencyMin?: number;
  frequencyMax?: number;
  aroma_id?: string;
  company_name?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface ResultsSectionProps {
  job: Job;
}

function ResultsSection({ job }: ResultsSectionProps) {
  const [downloadProgress, setDownloadProgress] = useState<{[key: string]: number}>({});

  const downloadFile = async (type: 'audio' | 'pdf') => {
    try {
      setDownloadProgress(prev => ({ ...prev, [type]: 0 }));

      const fileName = type === 'audio' ? job.audioFileName! : job.pdfFileName!;
      
      // For mobile devices, open the download URL directly in a new tab
      // This allows the browser's native download manager to handle it
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        const downloadUrl = `/api/download/${job.id}/${type}`;
        
        // Create a temporary link and trigger click
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Add to DOM temporarily
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setDownloadProgress(prev => ({ ...prev, [type]: 100 }));
        
        // Clear progress after 3 seconds
        setTimeout(() => {
          setDownloadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[type];
            return newProgress;
          });
        }, 3000);
        
        return;
      }

      // For desktop browsers, use fetch with progress tracking
      const response = await fetch(`/api/download/${job.id}/${type}`);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Unable to read response');

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        if (total > 0) {
          const progress = Math.round((receivedLength / total) * 100);
          setDownloadProgress(prev => ({ ...prev, [type]: progress }));
        }
      }

      // Combine chunks and create blob
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      const blob = new Blob([chunksAll], {
        type: type === 'audio' ? 'audio/mpeg' : 'application/pdf'
      });

      // Create download link that triggers browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloadProgress(prev => ({ ...prev, [type]: 100 }));

      // Clear progress after 3 seconds
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[type];
          return newProgress;
        });
      }, 3000);

    } catch (error) {
      console.error('Download error:', error);
      alert(`Erro no download: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[type];
        return newProgress;
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        {job.status === 'completed' && job.audioFileName && job.pdfFileName ? (
          <div className="flex flex-col space-y-4">
            <Button onClick={() => downloadFile('audio')} disabled={!!downloadProgress['audio']}>
              Download Audio
              {downloadProgress['audio'] ? (
                <Progress value={downloadProgress['audio']} className="w-24 ml-2" />
              ) : (
                <Music className="w-4 h-4 ml-2" />
              )}
            </Button>
            <Button onClick={() => downloadFile('pdf')} disabled={!!downloadProgress['pdf']}>
              Download PDF
              {downloadProgress['pdf'] ? (
                <Progress value={downloadProgress['pdf']} className="w-24 ml-2" />
              ) : (
                <FileText className="w-4 h-4 ml-2" />
              )}
            </Button>
          </div>
        ) : job.status === 'failed' ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Job failed: {job.errorMessage || 'Unknown error'}
            </AlertDescription>
          </Alert>
        ) : job.status === 'processing' ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Job is processing...
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>
              Job is pending...
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default ResultsSection;
