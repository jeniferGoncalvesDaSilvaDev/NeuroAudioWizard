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

  // Get recent jobs for sidebar
  const { data: recentJobs = [] } = useQuery({
    queryKey: ['/api/jobs'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

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
            <nav className="flex items-center space-x-6">
              <span className="text-slate-600 font-medium">Documentação</span>
              <span className="text-slate-600 font-medium">API</span>
              <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                Suporte
              </button>
            </nav>
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

            {/* Recent Projects */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Projetos Recentes</h3>
              <div className="space-y-3">
                {recentJobs.slice(0, 5).map((job: ProcessingJob) => (
                  <div 
                    key={job.id}
                    className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer"
                    onClick={() => setCurrentJobId(job.id)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      job.status === 'completed' ? 'bg-green-100' :
                      job.status === 'failed' ? 'bg-red-100' :
                      job.status === 'processing' ? 'bg-blue-100' :
                      'bg-slate-100'
                    }`}>
                      <Music className={`w-4 h-4 ${
                        job.status === 'completed' ? 'text-green-600' :
                        job.status === 'failed' ? 'text-red-600' :
                        job.status === 'processing' ? 'text-blue-600' :
                        'text-slate-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {job.company_name}_{job.aroma_id?.slice(0, 6) || job.id}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentJobs.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Nenhum projeto recente
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent-500 rounded-lg"></div>
                <span className="font-bold text-white">NeuroAudio</span>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Plataforma profissional de processamento de frequências de áudio para aplicações científicas e de pesquisa.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Plataforma</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-slate-300">Processamento de Áudio</span></li>
                <li><span className="text-slate-300">Análise de Frequência</span></li>
                <li><span className="text-slate-300">Geração de Relatórios</span></li>
                <li><span className="text-slate-300">Processamento em Lote</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-slate-300">Central de Ajuda</span></li>
                <li><span className="text-slate-300">Contatar Suporte</span></li>
                <li><span className="text-slate-300">Status do Sistema</span></li>
                <li><span className="text-slate-300">Política de Privacidade</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-800 text-center">
            <div className="mb-4">
              <span className="text-slate-300">contato@cycor.com.br</span>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              © 2025 Cycor Cibernética™ e Scentesia™. Todos os direitos reservados.
            </p>
            <p className="text-xs text-slate-500">
              A API, incluindo seu código, funcionamento e objetivos, são propriedade exclusiva da Cycor Cibernética S.A.™
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
