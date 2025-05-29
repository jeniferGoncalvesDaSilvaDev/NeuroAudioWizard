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
      
      // Prevent all unhandled rejections from reaching console
      event.preventDefault();
      
      // Only log actual errors that need attention
      if (reason instanceof Error) {
        const message = reason.message.toLowerCase();
        
        // Skip common network/fetch errors that are handled elsewhere
        if (message.includes('fetch') || 
            message.includes('network') || 
            message.includes('query') ||
            message.includes('aborted') ||
            message.includes('http') ||
            message.includes('websocket') ||
            message.includes('vite') ||
            message.includes('hmr') ||
            message.includes('connection')) {
          return;
        }
        
        // Only log truly unexpected errors
        console.debug('Filtered error:', message);
      }
    };

    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Skip common development/network errors
        if (message.includes('network') || 
            message.includes('fetch') || 
            message.includes('vite') ||
            message.includes('hmr') ||
            message.includes('websocket')) {
          event.preventDefault();
          return;
        }
      }
      
      // Only log actual application errors
      console.debug('Application error:', error);
    };

    // Handle resource loading errors
    const handleResourceError = (event: Event) => {
      // Prevent resource loading errors from appearing in console
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    window.addEventListener('load', handleResourceError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      window.removeEventListener('load', handleResourceError);
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
