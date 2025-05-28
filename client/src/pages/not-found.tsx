import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">404 Página Não Encontrada</h1>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              A página que você está procurando não existe ou foi movida.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="mb-4">
            <a href="mailto:contato@cycor.com.br" className="text-slate-300 hover:text-white underline">
              contato@cycor.com.br
            </a>
          </div>
          <p className="text-sm text-slate-400 mb-2">
            © 2025 Cycor Cibernética™ e Scentesia™. Todos os direitos reservados.
          </p>
          <p className="text-xs text-slate-500">
            A API, incluindo seu código, funcionamento e objetivos, são propriedade exclusiva da Cycor Cibernética S.A.™
          </p>
        </div>
      </footer>
    </div>
  );
}
