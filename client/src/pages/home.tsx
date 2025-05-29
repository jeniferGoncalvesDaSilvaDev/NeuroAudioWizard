import { useState } from "react";
import { Music } from "lucide-react";
import FileUpload from "@/components/file-upload";
import ProcessingStatus from "@/components/processing-status";
import ResultsSection from "@/components/results-section";
import RealtimeAudioPreview from "@/components/realtime-audio-preview";
import { useQuery } from "@tanstack/react-query";
import type { ProcessingJob } from "@shared/schema";

export default function Home() {
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  // Get current job status if we have a job ID
  const { data: currentJob } = useQuery({
    queryKey: ['/api/jobs', currentJobId],
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      // Stop polling if job is completed or failed
      return data?.status === 'completed' || data?.status === 'failed' ? false : 2000;
    },
  });

  const handleJobCreated = (jobId: number) => {
    setCurrentJobId(jobId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent-500 rounded-lg flex items-center justify-center">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">NeuroAudio</h1>
              </div>
              <span className="hidden sm:inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary-700 rounded-full">
                v2.1 Profissional
              </span>
            </div>
            <div className="flex items-center space-x-6">
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Processamento Profissional de Frequências de Áudio
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Transforme seus dados de frequência em arquivos de áudio de alta qualidade com nosso mecanismo avançado NeuroAudio. 
            Faça upload de arquivos Excel, gere áudio MP3 e receba relatórios técnicos detalhados.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Suporte Excel (.xlsx, .xls)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Exportação MP3 de Alta Qualidade</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Relatórios PDF Automáticos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Processamento em Tempo Real</span>
            </div>
          </div>
        </div>

        {/* Processing Workflow */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            <FileUpload onJobCreated={handleJobCreated} />
            {currentJob && <ProcessingStatus job={currentJob} />}
            {currentJob && currentJob.status === 'processing' && (
              <RealtimeAudioPreview 
                jobId={currentJob.id} 
                isProcessing={currentJob.status === 'processing'} 
              />
            )}
            {currentJob?.status === 'completed' && <ResultsSection job={currentJob} />}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Technical Specifications */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Especificações Técnicas</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Faixa de Frequência</span>
                  <span className="font-medium text-slate-900">18-22 kHz</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Duração do Áudio</span>
                  <span className="font-medium text-slate-900">30 segundos</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Taxa de Amostragem</span>
                  <span className="font-medium text-slate-900">44.1 kHz</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Taxa de Bits</span>
                  <span className="font-medium text-slate-900">192 kbps</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Nível de Volume</span>
                  <span className="font-medium text-slate-900">-10 dB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Versão do Motor</span>
                  <span className="font-medium text-slate-900">v2.1.3</span>
                </div>
              </div>
            </div>

            {/* Processing Tips */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Dicas de Processamento</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Use arquivos Excel com coluna "THz" para melhores resultados</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>O processamento pode levar alguns minutos dependendo do número de frequências</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Arquivos MP3 e relatórios PDF são gerados automaticamente</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <p>Downloads funcionam diretamente no navegador móvel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent-500 rounded-lg"></div>
              <span className="font-bold text-white">NeuroAudio</span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              © 2025 Cycor Cibernética™ e Scentesia™. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
