import { useRef, useEffect, useState } from "react";
import { Play, Pause, Volume2, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRealtimeAudio } from "@/hooks/use-realtime-audio";

interface RealtimeAudioPreviewProps {
  jobId: number;
  isProcessing: boolean;
}

export default function RealtimeAudioPreview({ jobId, isProcessing }: RealtimeAudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { isConnected, audioPreview } = useRealtimeAudio({
    jobId,
    enabled: isProcessing
  });

  const progressPercentage = audioPreview 
    ? (audioPreview.frequencyProgress / audioPreview.totalFrequencies) * 100 
    : 0;

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

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      const handlePause = () => setIsPlaying(false);
      const handlePlay = () => setIsPlaying(true);

      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);

      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
      };
    }
  }, []);

  if (!isProcessing) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Preview de Áudio em Tempo Real</h3>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="w-4 h-4" />
                <span className="text-sm">Conectado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm">Desconectado</span>
              </div>
            )}
          </div>
        </div>

        {audioPreview && (
          <>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>Processando frequências...</span>
                <span>{audioPreview.frequencyProgress} de {audioPreview.totalFrequencies}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePlayPause}
                    disabled={!audioPreview.previewAudioUrl}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-1 text-slate-600">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-sm">Preview Atual</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900">
                    {audioPreview.currentFrequency.toFixed(3)} THz
                  </div>
                  <div className="text-xs text-slate-500">
                    Frequência Atual
                  </div>
                </div>
              </div>

              {audioPreview.previewAudioUrl && (
                <audio
                  ref={audioRef}
                  src={audioPreview.previewAudioUrl}
                  preload="metadata"
                  className="hidden"
                />
              )}
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <div>• O preview é gerado automaticamente durante o processamento</div>
              <div>• Você pode ouvir as frequências conforme são processadas</div>
              <div>• O áudio final estará disponível quando o processamento for concluído</div>
            </div>
          </>
        )}

        {!audioPreview && isConnected && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Aguardando dados de preview...</p>
          </div>
        )}

        {!isConnected && (
          <div className="text-center py-8">
            <WifiOff className="w-8 h-8 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Conectando ao servidor para preview em tempo real...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}