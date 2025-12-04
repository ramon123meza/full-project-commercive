"use client";
import React, { Component, ReactNode } from "react";
import { Paper, Typography, Button, Box } from "@mui/material";
import { IoWarning } from "react-icons/io5";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Reload the page to reset state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box className="flex items-center justify-center min-h-screen p-4">
          <Paper className="p-8 max-w-lg text-center">
            <IoWarning className="mx-auto mb-4 text-yellow-500" size={64} />
            <Typography variant="h5" className="mb-4 font-bold">
              Something went wrong
            </Typography>
            <Typography variant="body1" className="mb-6 text-gray-600">
              We encountered an unexpected error. Please try refreshing the page.
            </Typography>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <Box className="mb-6 p-4 bg-gray-100 rounded text-left overflow-auto">
                <Typography variant="caption" className="font-mono text-xs text-red-600">
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
            <div className="flex gap-4 justify-center">
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReset}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                onClick={() => (window.location.href = "/")}
              >
                Go Home
              </Button>
            </div>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
