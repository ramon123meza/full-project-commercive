"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  HiOutlineTableCells,
  HiOutlineBanknotes,
} from "react-icons/hi2";

// Dynamic imports for better performance
const AffiliatePayoutsManager = dynamic(
  () => import("@/components/admin/payout/AffiliatePayoutsManager"),
  { ssr: false }
);
const PayoutManagement = dynamic(
  () => import("@/components/admin/payout/index"),
  { ssr: false }
);

const colors = {
  bg: "#F8F7FC",
  card: "#FFFFFF",
  accent: "#8e52f2",
  accentLight: "#EDE9FE",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
};

type TabType = "crm" | "requests";

export default function PayoutPage() {
  const [activeTab, setActiveTab] = useState<TabType>("crm");

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Tab Navigation */}
      <div
        className="sticky top-0 z-50 px-6 pt-4 pb-0"
        style={{ backgroundColor: colors.bg }}
      >
        <div className="flex gap-1 p-1 rounded-xl max-w-md" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
          <button
            onClick={() => setActiveTab("crm")}
            className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "crm" ? "text-white shadow-sm" : ""
            }`}
            style={{
              backgroundColor: activeTab === "crm" ? colors.accent : "transparent",
              color: activeTab === "crm" ? "white" : colors.textMuted,
            }}
          >
            <HiOutlineTableCells className="w-4 h-4" />
            Orders CRM
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "requests" ? "text-white shadow-sm" : ""
            }`}
            style={{
              backgroundColor: activeTab === "requests" ? colors.accent : "transparent",
              color: activeTab === "requests" ? "white" : colors.textMuted,
            }}
          >
            <HiOutlineBanknotes className="w-4 h-4" />
            Payout Requests
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-0">
        {activeTab === "crm" ? (
          <AffiliatePayoutsManager />
        ) : (
          <PayoutManagement />
        )}
      </div>
    </div>
  );
}
