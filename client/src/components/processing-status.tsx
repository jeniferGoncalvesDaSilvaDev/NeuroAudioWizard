import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProcessingJob } from "@shared/schema";

interface ProcessingStatusProps {
  job: ProcessingJob;
}

export default function ProcessingStatus({ job }: ProcessingStatusProps) {
  const getStepStatus = (step: number) => {
    if (job.status === 'failed') {
      return step === 1 ? 'completed' : 'failed';
    }
    
    switch (job.status) {
      case 'pending':
        return step === 1 ? 'pending' : 'waiting';
      case 'processing':
        return step === 1 ? 'completed' : step === 2 ? 'processing' : 'waiting';
      case 'completed':
        return 'completed';
      default:
        return 'waiting';
    }
  };

  const getProgressPercentage = () => {
    switch (job.status) {
      case 'pending':
        return 10;
      case 'processing':
        return 60;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };

  const renderStepIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-white" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-white animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-white" />;
      default:
        return <span className="text-xs font-bold text-slate-600">3</span>;
    }
  };

  const getStepStyles = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500 animate-pulse';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-slate-300';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Processing Status</h3>
          <span className="px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 rounded-full">
            Step 2 of 3
          </span>
        </div>

        <div className="space-y-6">
          {/* Step 1: File Processing */}
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getStepStyles(getStepStatus(1))}`}>
              {renderStepIcon(getStepStatus(1))}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">
                {getStepStatus(1) === 'completed' ? 'File Analysis Complete' : 'Analyzing File'}
              </p>
              <p className="text-sm text-slate-500">
                {job.frequencyCount 
                  ? `Processed ${job.frequencyCount} frequency entries`
                  : 'Reading Excel file and validating THz column'
                }
              </p>
            </div>
          </div>

          {/* Step 2: Audio Generation */}
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getStepStyles(getStepStatus(2))}`}>
              {renderStepIcon(getStepStatus(2))}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">
                {getStepStatus(2) === 'completed' ? 'Audio Generation Complete' : 
                 getStepStatus(2) === 'processing' ? 'Generating Audio Frequencies' :
                 'Generate Audio Frequencies'}
              </p>
              <p className="text-sm text-slate-500">
                {getStepStatus(2) === 'processing' ? 'Converting THz to audio spectrum' :
                 getStepStatus(2) === 'completed' ? 'MP3 file generated successfully' :
                 'Pending audio processing'}
              </p>
              {getStepStatus(2) === 'processing' && (
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Report Generation */}
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getStepStyles(getStepStatus(3))}`}>
              {renderStepIcon(getStepStatus(3))}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">
                {getStepStatus(3) === 'completed' ? 'Technical Report Generated' : 'Generate Technical Report'}
              </p>
              <p className="text-sm text-slate-500">
                {getStepStatus(3) === 'completed' ? 'PDF report ready for download' :
                 getStepStatus(3) === 'processing' ? 'Creating detailed analysis report' :
                 'Pending audio completion'}
              </p>
            </div>
          </div>
        </div>

        {/* Processing Details */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Frequency Range:</span>
              <span className="font-medium text-slate-900 ml-2">
                {job.frequencyMin && job.frequencyMax 
                  ? `${job.frequencyMin.toFixed(2)} - ${job.frequencyMax.toFixed(2)} THz`
                  : '18.0 - 22.0 THz'
                }
              </span>
            </div>
            <div>
              <span className="text-slate-600">Audio Duration:</span>
              <span className="font-medium text-slate-900 ml-2">30 seconds</span>
            </div>
            <div>
              <span className="text-slate-600">Sample Rate:</span>
              <span className="font-medium text-slate-900 ml-2">44.1 kHz</span>
            </div>
            <div>
              <span className="text-slate-600">Output Format:</span>
              <span className="font-medium text-slate-900 ml-2">MP3 (192 kbps)</span>
            </div>
          </div>
          
          {job.status === 'failed' && job.errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Processing Failed</p>
                  <p className="text-sm text-red-600">{job.errorMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
