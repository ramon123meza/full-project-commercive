"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Grid,
  Paper,
} from "@mui/material";
import React from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("code");
    const msg = searchParams.get("msg");

    if (code === "400") {
      toast.error(msg || "Something went wrong. Please try again.");
    }
  }, [searchParams]);

  const handleRetry = () => {
    router.push("/login");
  };

  return (
    <Grid
      container
      direction="column"
      alignItems="center"
      justifyContent="center"
      style={{
        width: "100%",
        height: "100vh",
        background: "linear-gradient(to right, #ffcccb, #f44336)",
      }}
    >
      <Paper
        elevation={3}
        style={{
          padding: "16px",
          borderRadius: "8px",
          textAlign: "center",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <Box>
          <Typography variant="h4" color="error" gutterBottom>
            Oops! Something Went Wrong
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            {searchParams.get("msg") ||
              "An unexpected error occurred. Please try again."}
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={handleRetry}
            style={{ marginTop: "16px" }}
          >
            Go to Home
          </Button>
        </Box>
      </Paper>
    </Grid>
  );
}

export default function ErrorPage() {
  return (
    <React.Suspense
      fallback={
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          style={{ height: "100vh", width: "100%" }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <ErrorContent />
    </React.Suspense>
  );
}
