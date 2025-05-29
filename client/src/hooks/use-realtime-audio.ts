import { useEffect, useRef, useState } from 'react';

interface AudioPreviewData {
  type: 'audio_preview';
  jobId: number;
  frequencyProgress: number;
  totalFrequencies: number;
  currentFrequency: number;
  previewAudioUrl?: string;
}

interface UseRealtimeAudioProps {
  jobId: number | null;
  enabled: boolean;
}

export function useRealtimeAudio({ jobId, enabled }: UseRealtimeAudioProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [audioPreview, setAudioPreview] = useState<AudioPreviewData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !jobId) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Conectado ao servidor');
        setIsConnected(true);
        
        // Subscribe to job updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          jobId: jobId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'audio_preview' && data.jobId === jobId) {
            setAudioPreview(data);
          }
        } catch (error) {
          console.error('[WebSocket] Erro ao processar mensagem:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Conexão fechada');
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Erro de conexão:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('[WebSocket] Erro ao conectar:', error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setAudioPreview(null);
    };
  }, [jobId, enabled]);

  return {
    isConnected,
    audioPreview,
    disconnect: () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    }
  };
}