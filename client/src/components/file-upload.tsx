import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  onJobCreated: (jobId: number) => void;
}

interface FileValidation {
  isValid: boolean;
  fileName: string;
  fileSize: string;
  frequencyCount?: number;
  errors: string[];
}

export default function FileUpload({ onJobCreated }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: "Your file has been uploaded and processing has started.",
      });
      onJobCreated(data.jobId);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      
      // Reset form
      setSelectedFile(null);
      setValidation(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  });

  const validateFile = (file: File): FileValidation => {
    const errors: string[] = [];
    
    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const hasValidExtension = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    
    if (!validTypes.includes(file.type) && !hasValidExtension) {
      errors.push('File must be an Excel file (.xlsx or .xls)');
    }
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      errors.push('File size must be less than 50MB');
    }
    
    if (file.size === 0) {
      errors.push('File is empty');
    }

    // Check filename pattern for company extraction
    const companyMatch = file.name.match(/Frequencias_Aroma_(.+)\.(xlsx?|xls)$/i);
    if (!companyMatch) {
      errors.push('Filename should follow pattern: Frequencias_Aroma_CompanyName.xlsx');
    }
    
    return {
      isValid: errors.length === 0,
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      errors
    };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const validationResult = validateFile(file);
    setValidation(validationResult);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValidation(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartProcessing = () => {
    if (selectedFile && validation?.isValid) {
      uploadMutation.mutate(selectedFile);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Upload de Dados de Frequência</h3>
          <span className="px-3 py-1 text-sm font-medium bg-slate-100 text-slate-700 rounded-full">
            Etapa 1 de 3
          </span>
        </div>

        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              isDragOver 
                ? 'border-primary bg-primary/5 scale-105' 
                : 'border-slate-300 hover:border-primary/50 hover:bg-primary/5'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <div className="space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors ${
                isDragOver ? 'bg-primary/20' : 'bg-primary/10'
              }`}>
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-900 mb-2">
                  Arraste seu arquivo Excel aqui, ou clique para navegar
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  Suporta arquivos .xlsx e .xls até 50MB
                </p>
                <p className="text-xs text-slate-400">
                  Obrigatório: Coluna chamada "THz" com dados de frequência
                </p>
              </div>
              <Button variant="default" className="bg-primary hover:bg-primary/90">
                Selecionar Arquivo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Preview */}
            <div className="p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    validation?.isValid ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <FileSpreadsheet className={`w-5 h-5 ${
                      validation?.isValid ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{validation?.fileName}</p>
                    <p className="text-sm text-slate-500">{validation?.fileSize}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Validation Results */}
            {validation && (
              <div className="space-y-3">
                {validation.isValid ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-slate-700">Validação de formato aprovada</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-slate-700">Tamanho do arquivo dentro dos limites</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-slate-700">Formato do nome do arquivo válido</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {validation.errors.map((error, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <X className="w-4 h-4 text-red-500" />
                        <span className="text-red-700">{error}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleStartProcessing}
                  disabled={!validation.isValid || uploadMutation.isPending}
                  className={`w-full mt-6 font-medium ${
                    validation.isValid
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {uploadMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Carregando...</span>
                    </div>
                  ) : (
                    'Iniciar Processamento de Áudio'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
