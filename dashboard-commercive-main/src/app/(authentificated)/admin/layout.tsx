"use client";

import { createClient } from "@/app/utils/supabase/client";
import { ReactNode, useEffect, useState } from "react";
import { useStoreContext } from "@/context/StoreContext";

// Admin Dark Theme Colors
const colors = {
  background: "#1B1F3B",
  card: "#252A4A",
  accent: "#3A6EA5",
  textPrimary: "#FFFFFF",
  textMuted: "#94A3B8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#374151",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const { userinfo } = useStoreContext();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUserDetails = async () => {
      try {
        setIsLoading(true);
        const {
          data: { user: userData },
        } = await supabase.auth.getUser();

        if (!userData) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const { data: user, error } = await supabase
          .from("user")
          .select("role")
          .eq("id", userData.id)
          .single();

        if (error || !user) {
          console.error("Error fetching user role:", error);
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        setIsAuthorized(user.role === "admin" || user.role === "employee");
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching user details:", error);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    };

    getUserDetails();
  }, []);

  // Loading State
  if (isLoading) {
    return (
      <div
        className="w-full h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <div className="flex flex-col items-center gap-6">
          {/* Animated Loading Spinner */}
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${colors.accent}33`, borderTopColor: colors.accent }}
            />
            <div
              className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
              style={{
                borderColor: "transparent",
                borderTopColor: colors.accent,
                animationDuration: "1.5s",
                animationDirection: "reverse",
              }}
            />
          </div>
          <div className="text-center">
            <h2
              className="text-xl font-semibold mb-2"
              style={{ color: colors.textPrimary }}
            >
              Loading Admin Panel
            </h2>
            <p style={{ color: colors.textMuted }}>
              Verifying your credentials...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized State
  if (!isAuthorized) {
    return (
      <div
        className="w-full h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <div
          className="max-w-md w-full mx-4 p-8 rounded-2xl text-center"
          style={{
            backgroundColor: colors.card,
            boxShadow: `0 0 40px ${colors.error}20`,
            border: `1px solid ${colors.error}30`,
          }}
        >
          {/* Error Icon */}
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${colors.error}20` }}
          >
            <svg
              className="w-10 h-10"
              fill="none"
              stroke={colors.error}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: colors.textPrimary }}
          >
            Access Denied
          </h1>
          <p className="mb-6" style={{ color: colors.textMuted }}>
            You do not have permission to access the admin panel. This area is restricted to administrators and employees only.
          </p>
          <a
            href="/home"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: colors.accent,
              color: colors.textPrimary,
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Authorized Admin Layout
  return (
    <div
      className="flex flex-col w-full min-h-screen overflow-auto custom-scrollbar"
      style={{ backgroundColor: colors.background }}
    >
      {/* Admin Header Bar */}
      <div
        className="sticky top-0 z-10 px-6 py-4 border-b"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          boxShadow: `0 4px 20px ${colors.background}80`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}80 100%)`,
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke={colors.textPrimary}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h1
                className="text-lg font-bold"
                style={{ color: colors.textPrimary }}
              >
                Admin Panel
              </h1>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                Commercive Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${colors.success}20`,
                color: colors.success,
                border: `1px solid ${colors.success}40`,
              }}
            >
              {userinfo?.role === "admin" ? "Administrator" : "Employee"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <div
          className="rounded-2xl p-4 md:p-6 lg:p-8 min-h-full"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 4px 30px ${colors.background}60`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
