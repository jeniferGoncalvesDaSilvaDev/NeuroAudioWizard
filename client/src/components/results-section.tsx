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
  const [downloadProgress, setDownloadProgress] = useState<{[key: string]: number}>({});
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
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
      setDownloadingFiles(prev => new Set(prev).add(type));
      setDownloadProgress(prev => ({ ...prev, [type]: 0 }));

      toast({
        title: "Iniciando Download",
        description: `Baixando ${type === 'audio' ? 'arquivo de áudio' : 'relatório PDF'}...`,
      });

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setDownloadProgress(prev => ({ ...prev, [type]: progress }));
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const blob = new Blob([xhr.response], {
                type: type === 'audio' ? 'audio/mpeg' : 'application/pdf'
              });
              
              if (blob.size === 0) {
                throw new Error('File is empty');
              }

              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = type === 'audio' ? job.audioFileName! : job.pdfFileName!;
              link.style.display = 'none';
              
              document.body.appendChild(link);
              link.click();
              
              // Clean up
              setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              }, 100);

              toast({
                title: "Download Concluído",
                description: `${type === 'audio' ? 'Arquivo de áudio' : 'Relatório PDF'} baixado com sucesso!`,
              });
              
              resolve();
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error(`Download failed: ${xhr.statusText}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Download failed'));
        });
        
        xhr.responseType = 'arraybuffer';
        xhr.open('GET', `/api/download/${job.id}/${type}`);
        xhr.setRequestHeader('Accept', type === 'audio' ? 'audio/mpeg' : 'application/pdf');
        xhr.send();
      });

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Falha no Download",
        description: error instanceof Error ? error.message : "Falha ao fazer download do arquivo",
        variant: "destructive",
      });
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(type);
        return newSet;
      });
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[type];
        return newProgress;
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

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Audio File */}
          <div className="border border-slate-200 rounded-xl p-4 sm:p-6 hover:border-primary/30 transition-all hover:shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                <Music className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2 text-center sm:text-left">Arquivo de Áudio (MP3)</h4>
                <p className="text-sm text-slate-600 mb-4 text-center sm:text-left break-all">{job.audioFileName}</p>
                
                {/* Audio Player */}
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                    <Button
                      size="sm"
                      onClick={handlePlayPause}
                      className="w-10 h-10 p-0 bg-primary hover:bg-primary/90 mx-auto sm:mx-0 flex-shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <div className="w-full bg-slate-200 rounded-full h-3 cursor-pointer">
                        <div 
                          className="bg-primary h-3 rounded-full transition-all"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-mono text-center sm:text-right whitespace-nowrap">
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

                {downloadingFiles.has('audio') && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                      <span>Baixando áudio...</span>
                      <span>{downloadProgress.audio || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress.audio || 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => handleDownload('audio')}
                  disabled={downloadingFiles.has('audio')}
                  className="w-full bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {downloadingFiles.has('audio') ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Baixando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar MP3
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* PDF Report */}
          <div className="border border-slate-200 rounded-xl p-4 sm:p-6 hover:border-red-300 transition-all hover:shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2 text-center sm:text-left">Relatório Técnico (PDF)</h4>
                <p className="text-sm text-slate-600 mb-4 text-center sm:text-left break-all">{job.pdfFileName}</p>
                
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

                {downloadingFiles.has('pdf') && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                      <span>Baixando PDF...</span>
                      <span>{downloadProgress.pdf || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress.pdf || 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => handleDownload('pdf')}
                  disabled={downloadingFiles.has('pdf')}
                  className="w-full bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {downloadingFiles.has('pdf') ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Baixando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Actions */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="outline" className="flex items-center justify-center space-x-2 hover:bg-slate-50 transition-all">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download All Files</span>
              <span className="sm:hidden">Download Tudo</span>
            </Button>
            
            <Button variant="outline" className="flex items-center justify-center space-x-2 hover:bg-slate-50 transition-all">
              <Share className="w-4 h-4" />
              <span className="hidden sm:inline">Share Results</span>
              <span className="sm:hidden">Compartilhar</span>
            </Button>
            
            <Button variant="outline" className="flex items-center justify-center space-x-2 hover:bg-slate-50 transition-all">
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Process Another File</span>
              <span className="sm:hidden">Novo Arquivo</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
