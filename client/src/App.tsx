import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      
      // Ignore network errors and query client errors that are already handled
      if (reason instanceof Error) {
        const message = reason.message.toLowerCase();
        if (message.includes('fetch') || 
            message.includes('network') || 
            message.includes('query') ||
            message.includes('aborted') ||
            message.includes('http')) {
          event.preventDefault();
          return;
        }
      }
      
      console.warn('Unhandled promise rejection (filtered):', reason);
      event.preventDefault();
    };

    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch')) {
          return;
        }
      }
      console.warn('Global error (filtered):', error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
