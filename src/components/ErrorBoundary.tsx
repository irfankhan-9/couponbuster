import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center m-4">
                    <h3 className="text-lg font-bold text-red-800 mb-2">Something went wrong</h3>
                    <p className="text-red-600 text-sm mb-4">The admin panel encountered an error.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
                    >
                        Reload Page
                    </button>
                    {this.state.error && (
                        <pre className="mt-4 p-2 bg-red-100 text-red-900 text-xs text-left overflow-auto rounded max-h-32">
                            {this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
