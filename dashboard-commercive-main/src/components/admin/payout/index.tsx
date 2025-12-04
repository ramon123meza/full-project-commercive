"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { toast } from "react-toastify";
import { PayoutUserRow } from "@/app/utils/types";
import { IoMdClose } from "react-icons/io";
import {
  FiDollarSign,
  FiClock,
  FiCalendar,
  FiTrendingUp,
  FiDownload,
  FiFilter,
  FiCheck,
  FiX,
  FiCreditCard,
  FiChevronLeft,
  FiChevronRight,
  FiCheckSquare,
  FiSquare,
} from "react-icons/fi";

// Color Palette for Admin Light Purple Theme
const colors = {
  background: "#F8F7FC",
  cards: "#FFFFFF",
  accent: "#8e52f2",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#E5E7EB",
  hover: "#EDE9FE",
};

type PayoutStatus = "Pending" | "Processing" | "Completed" | "Failed" | "Approved";

interface StatsData {
  totalPayouts: number;
  pendingRequests: number;
  thisMonthPaid: number;
  outstandingBalance: number;
}

interface ProcessModalData {
  payout: PayoutUserRow | null;
  transactionId: string;
  paymentMethod: string;
}

const PAYOUT_STATUSES: PayoutStatus[] = ["Pending", "Processing", "Completed", "Failed", "Approved"];

export default function PayoutManagement() {
  const supabase = createClient();
  const [payoutsData, setPayoutsData] = useState<PayoutUserRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<StatsData>({
    totalPayouts: 0,
    pendingRequests: 0,
    thisMonthPaid: 0,
    outstandingBalance: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");

  // Bulk selection
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Process modal
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processModalData, setProcessModalData] = useState<ProcessModalData>({
    payout: null,
    transactionId: "",
    paymentMethod: "PayPal",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk process modal
  const [bulkProcessModalOpen, setBulkProcessModalOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const limit = 10;

  // Fetch stats
  const fetchStats = async () => {
    try {
      const { data: allPayouts, error } = await supabase
        .from("payouts")
        .select("amount, status, created_at");

      if (error) {
        console.error("Error fetching stats:", error);
        return;
      }

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalPayouts = allPayouts?.length || 0;
      const pendingRequests = allPayouts?.filter((p) => p.status === "Pending").length || 0;
      const thisMonthPaid =
        allPayouts
          ?.filter(
            (p) =>
              p.status === "Completed" && new Date(p.created_at) >= firstDayOfMonth
          )
          .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const outstandingBalance =
        allPayouts
          ?.filter((p) => p.status === "Pending" || p.status === "Approved")
          .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      setStats({
        totalPayouts,
        pendingRequests,
        thisMonthPaid,
        outstandingBalance,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Fetch payouts
  const fetchPayoutsData = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const start = (currentPage - 1) * limit;

      let query = supabase
        .from("payouts")
        .select("*, user(*)", { count: "exact" });

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply date range filter
      if (dateRangeStart) {
        query = query.gte("created_at", dateRangeStart);
      }
      if (dateRangeEnd) {
        query = query.lte("created_at", dateRangeEnd + "T23:59:59");
      }

      const { data: payouts, count, error } = await query
        .range(start, start + limit - 1)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payouts:", error);
        return;
      }

      setPayoutsData(payouts || []);
      setTotalRecords(count || 0);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle approve
  const handleApprove = async (payout: PayoutUserRow) => {
    try {
      const { error } = await supabase
        .from("payouts")
        .update({ status: "Approved" })
        .eq("id", payout.id);

      if (error) {
        toast.error("Failed to approve payout: " + error.message);
      } else {
        toast.success("Payout approved successfully!");
        await fetchPayoutsData(page);
        await fetchStats();
      }
    } catch (error: any) {
      toast.error("Error approving payout: " + (error?.message || "Unknown error"));
    }
  };

  // Handle reject
  const handleReject = async (payout: PayoutUserRow) => {
    try {
      const { error } = await supabase
        .from("payouts")
        .update({ status: "Failed" })
        .eq("id", payout.id);

      if (error) {
        toast.error("Failed to reject payout: " + error.message);
      } else {
        toast.success("Payout rejected!");
        await fetchPayoutsData(page);
        await fetchStats();
      }
    } catch (error: any) {
      toast.error("Error rejecting payout: " + (error?.message || "Unknown error"));
    }
  };

  // Open process modal
  const handleOpenProcessModal = (payout: PayoutUserRow) => {
    setProcessModalData({
      payout,
      transactionId: "",
      paymentMethod: "PayPal",
    });
    setProcessModalOpen(true);
  };

  // Process payout (mark as paid)
  const handleProcessPayout = async () => {
    if (!processModalData.payout) return;
    if (!processModalData.transactionId.trim()) {
      toast.error("Please enter a transaction ID");
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("payouts")
        .update({
          status: "Completed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", processModalData.payout.id);

      if (error) {
        toast.error("Failed to process payout: " + error.message);
      } else {
        toast.success(`Payout marked as paid! Transaction ID: ${processModalData.transactionId}`);
        setProcessModalOpen(false);
        await fetchPayoutsData(page);
        await fetchStats();
      }
    } catch (error: any) {
      toast.error("Error processing payout: " + (error?.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle select payout
  const toggleSelectPayout = (payoutId: string) => {
    const newSelected = new Set(selectedPayouts);
    if (newSelected.has(payoutId)) {
      newSelected.delete(payoutId);
    } else {
      newSelected.add(payoutId);
    }
    setSelectedPayouts(newSelected);
    setSelectAll(newSelected.size === payoutsData.filter((p) => p.status === "Pending" || p.status === "Approved").length);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPayouts(new Set());
    } else {
      const pendingPayouts = payoutsData
        .filter((p) => p.status === "Pending" || p.status === "Approved")
        .map((p) => p.id);
      setSelectedPayouts(new Set(pendingPayouts));
    }
    setSelectAll(!selectAll);
  };

  // Bulk process
  const handleBulkProcess = async () => {
    if (selectedPayouts.size === 0) {
      toast.error("No payouts selected");
      return;
    }
    setBulkProcessModalOpen(true);
  };

  const confirmBulkProcess = async () => {
    setIsBulkProcessing(true);
    try {
      const { error } = await supabase
        .from("payouts")
        .update({
          status: "Completed",
          processed_at: new Date().toISOString(),
        })
        .in("id", Array.from(selectedPayouts));

      if (error) {
        toast.error("Failed to process payouts: " + error.message);
      } else {
        toast.success(`${selectedPayouts.size} payouts processed successfully!`);
        setSelectedPayouts(new Set());
        setSelectAll(false);
        setBulkProcessModalOpen(false);
        await fetchPayoutsData(page);
        await fetchStats();
      }
    } catch (error: any) {
      toast.error("Error processing payouts: " + (error?.message || "Unknown error"));
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      let query = supabase.from("payouts").select("*, user(*)");

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (dateRangeStart) {
        query = query.gte("created_at", dateRangeStart);
      }
      if (dateRangeEnd) {
        query = query.lte("created_at", dateRangeEnd + "T23:59:59");
      }

      const { data: exportData, error } = await query.order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to export data");
        return;
      }

      if (!exportData || exportData.length === 0) {
        toast.error("No data to export");
        return;
      }

      const csvHeaders = ["ID", "User Name", "Email", "Amount", "PayPal Address", "Status", "Request Date", "Processed Date"];
      const csvRows = exportData.map((payout: any) => [
        payout.id,
        payout.user?.user_name || "N/A",
        payout.user?.email || "N/A",
        payout.amount,
        payout.paypal_address,
        payout.status,
        payout.created_at?.split("T")[0] || "N/A",
        payout.processed_at?.split("T")[0] || "N/A",
      ]);

      const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `payouts_export_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();

      toast.success("CSV exported successfully!");
    } catch (error) {
      toast.error("Failed to export CSV");
    }
  };

  // Clear filters
  const clearFilters = () => {
    setStatusFilter("all");
    setDateRangeStart("");
    setDateRangeEnd("");
    setPage(1);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; text: string }> = {
      Pending: { bg: "bg-amber-100", text: "text-amber-700" },
      Processing: { bg: "bg-blue-100", text: "text-blue-700" },
      Approved: { bg: "bg-purple-100", text: "text-purple-700" },
      Completed: { bg: "bg-emerald-100", text: "text-emerald-700" },
      Failed: { bg: "bg-red-100", text: "text-red-700" },
    };
    const style = statusStyles[status] || { bg: "bg-gray-100", text: "text-gray-700" };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status}
      </span>
    );
  };

  // Pagination
  const handleNext = () => {
    if (page < Math.ceil(totalRecords / limit)) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  // Effects
  useEffect(() => {
    fetchPayoutsData(page);
  }, [page, statusFilter, dateRangeStart, dateRangeEnd]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Stats cards configuration
  const statsCards = [
    {
      title: "Total Payouts",
      value: stats.totalPayouts.toString(),
      icon: <FiDollarSign className="w-6 h-6" />,
      color: colors.accent,
    },
    {
      title: "Pending Requests",
      value: stats.pendingRequests.toString(),
      icon: <FiClock className="w-6 h-6" />,
      color: colors.warning,
    },
    {
      title: "This Month Paid",
      value: `$${stats.thisMonthPaid.toLocaleString()}`,
      icon: <FiCalendar className="w-6 h-6" />,
      color: colors.success,
    },
    {
      title: "Outstanding Balance",
      value: `$${stats.outstandingBalance.toLocaleString()}`,
      icon: <FiTrendingUp className="w-6 h-6" />,
      color: colors.error,
    },
  ];

  const pendingCount = payoutsData.filter((p) => p.status === "Pending" || p.status === "Approved").length;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>
            Payout Management
          </h1>
          <p className="mt-1" style={{ color: colors.textSecondary }}>
            Manage and process affiliate payout requests
          </p>
        </div>
        <div className="flex gap-3">
          {selectedPayouts.size > 0 && (
            <button
              onClick={handleBulkProcess}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
              style={{ backgroundColor: colors.success, color: colors.textPrimary }}
            >
              <FiCreditCard className="w-4 h-4" />
              Process Selected ({selectedPayouts.size})
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: colors.accent, color: colors.textPrimary }}
          >
            <FiDownload className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((card, index) => (
          <div
            key={index}
            className="rounded-xl p-6 transition-all hover:scale-[1.02]"
            style={{ backgroundColor: colors.cards, border: `1px solid ${colors.border}` }}
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
            </div>
            <p className="text-sm mb-1" style={{ color: colors.textSecondary }}>
              {card.title}
            </p>
            <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ backgroundColor: colors.cards, border: `1px solid ${colors.border}` }}
      >
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-sm" style={{ color: colors.textSecondary }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 rounded-lg outline-none min-w-[150px]"
                style={{
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <option value="all">All Statuses</option>
                {PAYOUT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div className="flex flex-col gap-1">
              <label className="text-sm" style={{ color: colors.textSecondary }}>
                From Date
              </label>
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => {
                  setDateRangeStart(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 rounded-lg outline-none"
                style={{
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </div>

            {/* Date Range End */}
            <div className="flex flex-col gap-1">
              <label className="text-sm" style={{ color: colors.textSecondary }}>
                To Date
              </label>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => {
                  setDateRangeEnd(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 rounded-lg outline-none"
                style={{
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(statusFilter !== "all" || dateRangeStart || dateRangeEnd) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{
                backgroundColor: colors.background,
                color: colors.textSecondary,
                border: `1px solid ${colors.border}`,
              }}
            >
              <FiX className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Payouts Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: colors.cards, border: `1px solid ${colors.border}` }}
      >
        {/* Table Header with Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm"
                style={{ color: colors.textSecondary }}
              >
                {selectAll ? (
                  <FiCheckSquare className="w-5 h-5" style={{ color: colors.accent }} />
                ) : (
                  <FiSquare className="w-5 h-5" />
                )}
                Select All Pending
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Showing {totalRecords > 0 ? (page - 1) * limit + 1 : 0}-
              {Math.min(page * limit, totalRecords)} of {totalRecords}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePrevious}
                disabled={page === 1}
                className="p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
              >
                <FiChevronLeft style={{ color: colors.textPrimary }} />
              </button>
              <button
                onClick={handleNext}
                disabled={page >= Math.ceil(totalRecords / limit)}
                className="p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
              >
                <FiChevronRight style={{ color: colors.textPrimary }} />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.background }}>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Select
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textSecondary }}>
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textSecondary }}>
                  PayPal Address
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Request Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Processed Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.accent }}></div>
                    </div>
                  </td>
                </tr>
              ) : payoutsData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center" style={{ color: colors.textSecondary }}>
                    No payouts found
                  </td>
                </tr>
              ) : (
                payoutsData.map((payout) => (
                  <tr
                    key={payout.id}
                    className="transition-all hover:bg-opacity-50"
                    style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: selectedPayouts.has(payout.id) ? colors.hover : "transparent" }}
                  >
                    <td className="px-4 py-4">
                      {(payout.status === "Pending" || payout.status === "Approved") && (
                        <button onClick={() => toggleSelectPayout(payout.id)}>
                          {selectedPayouts.has(payout.id) ? (
                            <FiCheckSquare className="w-5 h-5" style={{ color: colors.accent }} />
                          ) : (
                            <FiSquare className="w-5 h-5" style={{ color: colors.textSecondary }} />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium" style={{ color: colors.textPrimary }}>
                          {payout.user?.user_name || "N/A"}
                        </p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                          {payout.user?.email || "N/A"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-lg" style={{ color: colors.success }}>
                        ${payout.amount?.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4" style={{ color: colors.textPrimary }}>
                      {payout.paypal_address || "N/A"}
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(payout.status)}</td>
                    <td className="px-4 py-4" style={{ color: colors.textSecondary }}>
                      {payout.created_at?.split("T")[0] || "N/A"}
                    </td>
                    <td className="px-4 py-4" style={{ color: colors.textSecondary }}>
                      {payout.processed_at?.split("T")[0] || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {payout.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(payout)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                              style={{ backgroundColor: colors.success, color: colors.textPrimary }}
                            >
                              <FiCheck className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(payout)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                              style={{ backgroundColor: colors.error, color: colors.textPrimary }}
                            >
                              <FiX className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                        {payout.status === "Approved" && (
                          <button
                            onClick={() => handleOpenProcessModal(payout)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                            style={{ backgroundColor: colors.accent, color: colors.textPrimary }}
                          >
                            <FiCreditCard className="w-4 h-4" />
                            Mark Paid
                          </button>
                        )}
                        {payout.status === "Completed" && (
                          <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm" style={{ color: colors.success }}>
                            <FiCheck className="w-4 h-4" />
                            Done
                          </span>
                        )}
                        {payout.status === "Failed" && (
                          <span className="text-sm" style={{ color: colors.error }}>
                            Rejected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Payout Modal */}
      {processModalOpen && processModalData.payout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div
            className="rounded-xl w-full max-w-md p-6 relative"
            style={{ backgroundColor: colors.cards, border: `1px solid ${colors.border}` }}
          >
            <button
              onClick={() => setProcessModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: colors.background }}
            >
              <IoMdClose size={20} style={{ color: colors.textPrimary }} />
            </button>

            <h2 className="text-xl font-bold mb-6" style={{ color: colors.textPrimary }}>
              Process Payout
            </h2>

            {/* Payout Details */}
            <div
              className="rounded-lg p-4 mb-6"
              style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
            >
              <h3 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
                Payout Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: colors.textSecondary }}>User:</span>
                  <span style={{ color: colors.textPrimary }}>
                    {processModalData.payout.user?.user_name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textSecondary }}>Email:</span>
                  <span style={{ color: colors.textPrimary }}>
                    {processModalData.payout.user?.email || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textSecondary }}>Amount:</span>
                  <span className="font-bold" style={{ color: colors.success }}>
                    ${processModalData.payout.amount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textSecondary }}>PayPal:</span>
                  <span style={{ color: colors.textPrimary }}>
                    {processModalData.payout.paypal_address || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Payment Method
              </label>
              <select
                value={processModalData.paymentMethod}
                onChange={(e) =>
                  setProcessModalData({ ...processModalData, paymentMethod: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg outline-none"
                style={{
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <option value="PayPal">PayPal</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Transaction ID */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Transaction ID *
              </label>
              <input
                type="text"
                value={processModalData.transactionId}
                onChange={(e) =>
                  setProcessModalData({ ...processModalData, transactionId: e.target.value })
                }
                placeholder="Enter payment transaction ID"
                className="w-full px-4 py-2 rounded-lg outline-none"
                style={{
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setProcessModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayout}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: colors.success, color: colors.textPrimary }}
              >
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Process Modal */}
      {bulkProcessModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div
            className="rounded-xl w-full max-w-md p-6 relative"
            style={{ backgroundColor: colors.cards, border: `1px solid ${colors.border}` }}
          >
            <button
              onClick={() => setBulkProcessModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: colors.background }}
            >
              <IoMdClose size={20} style={{ color: colors.textPrimary }} />
            </button>

            <h2 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>
              Bulk Process Payouts
            </h2>

            <p className="mb-6" style={{ color: colors.textSecondary }}>
              Are you sure you want to mark {selectedPayouts.size} payout(s) as completed?
            </p>

            <div
              className="rounded-lg p-4 mb-6"
              style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}
            >
              <div className="flex justify-between items-center">
                <span style={{ color: colors.textSecondary }}>Total Amount:</span>
                <span className="text-xl font-bold" style={{ color: colors.success }}>
                  $
                  {payoutsData
                    .filter((p) => selectedPayouts.has(p.id))
                    .reduce((sum, p) => sum + (p.amount || 0), 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBulkProcessModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkProcess}
                disabled={isBulkProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: colors.success, color: colors.textPrimary }}
              >
                {isBulkProcessing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4" />
                    Confirm All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
