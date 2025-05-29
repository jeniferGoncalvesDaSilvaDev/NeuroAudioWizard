import { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, FileText, Music, Share, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ProcessingJob } from "@shared/schema";

interface ResultsSectionProps {
  job: ProcessingJob;
}

export default function ResultsSection({ job }: ResultsSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30); // 30 seconds as per specs
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Auto download files when job completes
  useEffect(() => {
    if (job.status === 'completed' && job.audioFileName && job.pdfFileName && !autoDownloaded) {
      // Show notification about auto download
      toast({
        title: "Downloads Automáticos",
        description: "Iniciando downloads automáticos dos arquivos...",
      });
      
      setTimeout(() => {
        handleDownload('audio');
        setTimeout(() => {
          handleDownload('pdf');
        }, 1500);
        setAutoDownloaded(true);
      }, 1000);
    }
  }, [job.status, job.audioFileName, job.pdfFileName, autoDownloaded]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleDownload = async (type: 'audio' | 'pdf') => {
    try {
      const response = await fetch(`/api/download/${job.id}/${type}`);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = type === 'audio' ? job.audioFileName! : job.pdfFileName!;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Iniciado",
        description: `Download do ${type === 'audio' ? 'arquivo de áudio' : 'relatório PDF'} foi iniciado.`,
      });
    } catch (error) {
      toast({
        title: "Falha no Download",
        description: error instanceof Error ? error.message : "Falha ao fazer download do arquivo",
        variant: "destructive",
      });
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Arquivos Gerados</h3>
          <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-700 rounded-full">
            Etapa 3 de 3 • Completa
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Audio File */}
          <div className="border border-slate-200 rounded-xl p-6 hover:border-primary/30 transition-colors">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Music className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Arquivo de Áudio (MP3)</h4>
                <p className="text-sm text-slate-600 mb-4">{job.audioFileName}</p>
                
                {/* Audio Player */}
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <Button
                      size="sm"
                      onClick={handlePlayPause}
                      className="w-8 h-8 p-0 bg-primary hover:bg-primary/90"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <div className="w-full bg-slate-200 rounded-full h-2 cursor-pointer">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  
                  <audio
                    ref={audioRef}
                    src={`/static/${job.company_name}/${job.audioFileName}`}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    preload="metadata"
                  />
                </div>

                <div className="text-xs text-slate-500 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Duração: <span className="font-medium">30 segundos</span></div>
                    <div>Formato: <span className="font-medium">MP3 192kbps</span></div>
                    <div>Frequências: <span className="font-medium">{job.frequencyCount}</span></div>
                    <div>Empresa: <span className="font-medium">{job.company_name}</span></div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleDownload('audio')}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar MP3
                </Button>
              </div>
            </div>
          </div>

          {/* PDF Report */}
          <div className="border border-slate-200 rounded-xl p-6 hover:border-red-300 transition-colors">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2">Relatório Técnico (PDF)</h4>
                <p className="text-sm text-slate-600 mb-4">{job.pdfFileName}</p>
                
                {/* Report Preview */}
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="font-medium">Conteúdo do Relatório:</div>
                    <div>• Parâmetros de Processamento</div>
                    <div>• Resumo da Análise de Frequência</div>
                    <div>• Histograma de Frequências</div>
                    <div>• Detalhes de Geração de Áudio</div>
                    <div>• Especificações Técnicas</div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Páginas: <span className="font-medium">3</span></div>
                    <div>Formato: <span className="font-medium">PDF</span></div>
                    <div>ID Aroma: <span className="font-medium">{job.aroma_id}</span></div>
                    <div>Gerado: <span className="font-medium">
                      {job.completedAt ? new Date(job.completedAt).toLocaleString('pt-BR') : 'Agora mesmo'}
                    </span></div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleDownload('pdf')}
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Actions */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Download All Files</span>
            </Button>
            
            <Button variant="outline" className="flex items-center space-x-2">
              <Share className="w-4 h-4" />
              <span>Share Results</span>
            </Button>
            
            <Button variant="outline" className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4" />
              <span>Process Another File</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
