import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200 max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Ups! Ein Fehler ist aufgetreten.</h1>
            <p className="text-gray-600 mb-4">
              Die Anwendung ist abgestürzt. Dies kann bei Speicherproblemen oder unerwarteten Daten passieren.
            </p>
            
            <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-64 mb-6 font-mono text-sm border border-gray-200">
               <p className="text-red-800 font-bold mb-2">{this.state.error?.toString()}</p>
               <pre className="text-gray-600">{this.state.errorInfo?.componentStack}</pre>
            </div>

            <div className="flex gap-4">
                <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                Anwendung neu laden
                </button>
                 <button
                onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                }}
                className="px-6 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-medium transition-colors"
                >
                Cache leeren & Neustart
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
