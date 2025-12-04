"use client";
import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Container,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { IoCheckmarkCircle, IoRocketSharp } from "react-icons/io5";
import { useSearchParams } from "next/navigation";

const LAMBDA_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL || "";

/**
 * Affiliate Form Landing Page
 *
 * This page is accessed via affiliate tracking links like:
 * https://dashboard.commercive.co/affiliate-form?ref=ABC123
 *
 * Users fill out their business information and submit a lead.
 * The affiliate gets credited for the referral.
 */
export default function AffiliateFormPage() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    product_link: "",
    order_volume: "0",
    pending_orders: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!refCode) {
      setError("Invalid referral link. Please use a valid affiliate link.");
      return;
    }

    // Validate Lambda URL is configured
    if (!LAMBDA_URL) {
      setError("Service temporarily unavailable. Please try again later.");
      console.error("[Affiliate Form] Lambda URL not configured");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      console.log("[Affiliate Form] Submitting lead with ref code:", refCode);

      const response = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "affiliate/submit-lead",
          link_id: refCode,
          lead_data: formData,
        }),
      });

      console.log("[Affiliate Form] Response status:", response.status);

      // Handle 404 by trying alternative action name
      if (response.status === 404) {
        console.log("[Affiliate Form] Trying alternative action name...");
        const altResponse = await fetch(LAMBDA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "leads/submit",
            affiliate_link_id: refCode,
            ref: refCode,
            lead: formData,
          }),
        });

        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log("[Affiliate Form] Alternative response:", altData);
          if (altData.success || altData.lead_id) {
            setSubmitted(true);
            return;
          }
        }

        setError("Unable to submit application. Please contact support.");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Affiliate Form] Error response:", errorText);
        setError("Failed to submit. Please try again or contact support.");
        return;
      }

      const data = await response.json();
      console.log("[Affiliate Form] Response data:", data);

      if (data.success || data.lead_id) {
        setSubmitted(true);
      } else {
        setError(data.error || data.message || "Failed to submit. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
      console.error("[Affiliate Form] Error submitting lead:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!refCode) {
    return (
      <Container maxWidth="sm" className="py-12">
        <Paper className="p-8 text-center">
          <Box className="mb-4">
            <img
              src="https://i.imgur.com/tjOWdO7.png"
              alt="Commercive Logo"
              className="max-w-full h-auto mx-auto"
              style={{ maxHeight: "60px" }}
            />
          </Box>
          <Typography variant="h5" color="error" gutterBottom>
            Referral Link Required
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            This page requires a valid affiliate referral link to access.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            If you received a link from someone, please make sure you're using the complete URL.
            The link should look like: <code>...?ref=YOUR_CODE</code>
          </Typography>
          <Box className="mt-6">
            <Button
              variant="contained"
              color="primary"
              href="https://commercive.co"
              className="mt-4"
            >
              Visit Commercive.co
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (submitted) {
    return (
      <Container maxWidth="sm" className="py-12">
        <Paper className="p-8 text-center">
          <IoCheckmarkCircle size={80} className="text-green-500 mx-auto mb-4" />
          <Typography variant="h4" gutterBottom>
            Thank You!
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            Your information has been submitted successfully. Our team will
            review your application and get back to you within 1-2 business days.
          </Typography>
          <Box className="mt-6 p-4 bg-blue-50 rounded">
            <Typography variant="body2" color="primary">
              What happens next?
            </Typography>
            <ul className="text-left mt-2 text-sm text-gray-600">
              <li>✓ Our team will review your business information</li>
              <li>✓ We'll assess if Commercive is a good fit for your needs</li>
              <li>✓ You'll receive a personalized demo and onboarding plan</li>
              <li>✓ Your referrer will be notified of your application</li>
            </ul>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className="py-12">
      <Paper className="p-8">
        {/* Header with Logo */}
        <Box className="text-center mb-6">
          <img
            src="https://i.imgur.com/tjOWdO7.png"
            alt="Commercive Logo"
            className="max-w-full h-auto mx-auto mb-4"
            style={{ maxHeight: "80px" }}
          />
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Fulfillment Application
          </Typography>
          <Typography variant="h6" color="textSecondary">
            Please fill out your product information below and one of our fulfillment agents will reach out shortly with a quote and further instructions.
          </Typography>
        </Box>

        {/* Referral Info */}
        <Box className="mb-6 p-4 bg-purple-50 rounded">
          <Typography variant="body2" color="primary">
            <strong>You're using an exclusive affiliate link!</strong>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Someone who values your success has shared Commercive with you.
            Get started by filling out the form below.
          </Typography>
        </Box>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Box className="flex flex-col gap-4">
            <TextField
              required
              fullWidth
              type="email"
              label="Email address"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
            />

            <TextField
              required
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full name"
            />

            <TextField
              required
              fullWidth
              type="tel"
              label="Phone number (WhatsApp preferred)"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+123456789"
            />

            <TextField
              required
              fullWidth
              type="url"
              label="Link to product (Ex. Aliexpress)"
              name="product_link"
              value={formData.product_link}
              onChange={handleChange}
              placeholder="http://..."
            />

            <FormControl fullWidth required>
              <InputLabel>Daily average order volume</InputLabel>
              <Select
                name="order_volume"
                value={formData.order_volume}
                label="Daily average order volume"
                onChange={(e) =>
                  setFormData({ ...formData, order_volume: e.target.value })
                }
              >
                <MenuItem value="0">0 Orders Per Day</MenuItem>
                <MenuItem value="1-5">1-5 Orders Per Day</MenuItem>
                <MenuItem value="5-20">5-20 Orders Per Day</MenuItem>
                <MenuItem value="20-100">20-100 Orders Per Day</MenuItem>
                <MenuItem value="100+">100+ Orders Per Day</MenuItem>
              </Select>
            </FormControl>

            <TextField
              required
              fullWidth
              type="number"
              label="How many orders are pending on your store?"
              name="pending_orders"
              value={formData.pending_orders}
              onChange={handleChange}
              placeholder="Enter number of pending orders"
              inputProps={{ min: 0 }}
            />

            {/* Error Message */}
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={submitting}
              fullWidth
              className="mt-4"
            >
              {submitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Submit Application"
              )}
            </Button>

            {/* Privacy Notice */}
            <Typography variant="caption" color="textSecondary" className="text-center mt-2">
              By submitting this form, you agree to our{" "}
              <a href="https://commercive.co/privacy" className="text-blue-600">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="https://commercive.co/terms" className="text-blue-600">
                Terms of Service
              </a>
              .
            </Typography>
          </Box>
        </form>
      </Paper>

      {/* Features Section */}
      <Box className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Paper className="p-4 text-center">
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Real-Time Inventory
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Track stock levels across all locations in real-time
          </Typography>
        </Paper>
        <Paper className="p-4 text-center">
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Smart Forecasting
          </Typography>
          <Typography variant="body2" color="textSecondary">
            AI-powered demand forecasting based on actual sales
          </Typography>
        </Paper>
        <Paper className="p-4 text-center">
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Comprehensive insights to make data-driven decisions
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
