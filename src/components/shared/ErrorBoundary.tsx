import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/forms/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-card rounded-xl border border-border shadow-sm max-w-2xl mx-auto my-12 animate-fade-in">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground max-w-md mb-6">
            An unexpected error occurred in this module. You can try resetting the module state, refreshing the page, or returning to the dashboard.
          </p>
          
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <Button onClick={this.handleReset} variant="default" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin-hover" />
              Try Again
            </Button>
            <Button onClick={this.handleReload} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </Button>
            <Button onClick={this.handleGoHome} variant="secondary" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </div>

          {this.state.error && (
            <div className="w-full text-left border border-border rounded-lg overflow-hidden bg-muted/50">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-muted transition-colors outline-none"
              >
                <span className="text-muted-foreground flex items-center gap-2">
                  Technical Details
                </span>
                {this.state.showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {this.state.showDetails && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  <pre className="text-xs font-mono bg-background p-3 rounded-md overflow-x-auto text-red-500 max-h-40 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
