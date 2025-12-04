"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Typography, CircularProgress, Paper, Button } from "@mui/material";
import { BiMessageSquareDetail } from "react-icons/bi";
import { useRouter } from "next/navigation";

// Dynamically import AdminChatManager with no SSR to prevent hydration issues
const AdminChatManager = dynamic(
  () => import("@/components/chat/AdminChatManager"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <CircularProgress />
      </div>
    ),
  }
);

/**
 * Admin Support Chat Manager
 *
 * Allows administrators to:
 * - View all customer support conversations
 * - Reply to customer messages in real-time
 * - Filter conversations by status (open/closed)
 * - See unread message counts
 * - Close resolved conversations
 *
 * Backend: AWS Lambda + DynamoDB
 *
 * FIX: Uses dynamic import with no SSR to prevent React error #130
 */
export default function SupportPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Set client-side flag
    setIsClient(true);

    // Check if Lambda URL is configured
    if (!process.env.NEXT_PUBLIC_AWS_LAMBDA_URL) {
      console.error("AWS Lambda URL not configured");
      setHasError(true);
    }
  }, []);

  if (!isClient) {
    return (
      <main className="flex flex-col h-full w-full gap-4 p-4">
        <div className="flex items-center gap-3">
          <BiMessageSquareDetail size={24} color="#E5E1FF" />
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#E5E1FF" }}>
            Support Chat Management
          </Typography>
        </div>
        <div className="flex items-center justify-center h-64">
          <CircularProgress />
        </div>
      </main>
    );
  }

  if (hasError) {
    return (
      <main className="flex flex-col h-full w-full gap-4 p-4">
        <div className="flex items-center gap-3">
          <BiMessageSquareDetail size={24} color="#E5E1FF" />
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#E5E1FF" }}>
            Support Chat Management
          </Typography>
        </div>
        <Paper className="p-6">
          <Typography variant="h6" color="error" gutterBottom>
            Configuration Error
          </Typography>
          <Typography variant="body1" paragraph>
            AWS Lambda URL is not configured. Please set the NEXT_PUBLIC_AWS_LAMBDA_URL environment variable.
          </Typography>
          <Button variant="contained" onClick={() => router.refresh()}>
            Retry
          </Button>
        </Paper>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-full w-full gap-4 p-4">
      <div className="flex items-center gap-3">
        <BiMessageSquareDetail size={24} color="#E5E1FF" />
        <Typography variant="h5" fontWeight="bold" sx={{ color: "#E5E1FF" }}>
          Support Chat Management
        </Typography>
      </div>
      <AdminChatManager />
    </main>
  );
}
