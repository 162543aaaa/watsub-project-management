import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-2">
              เกิดข้อผิดพลาด
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              กรุณาลองรีเฟรชหน้าเว็บ
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary px-6 py-2.5"
            >
              รีเฟรช
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
