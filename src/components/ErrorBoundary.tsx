import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  parsedDetail: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      parsedDetail: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    let parsedDetail: string | null = null;
    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && parsed.operationType) {
        parsedDetail = `${parsed.operationType.toUpperCase()} on ${parsed.path || 'unknown'}: ${parsed.error}`;
      }
    } catch {
      parsedDetail = null;
    }
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
      parsedDetail,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('MealLoop ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {this.state.parsedDetail || this.state.errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
