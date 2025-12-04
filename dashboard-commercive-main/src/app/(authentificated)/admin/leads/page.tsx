"use client";
import { useState, useEffect, useCallback } from "react";
import {
  IoCheckmark,
  IoClose,
  IoEye,
  IoPerson,
  IoSearch,
  IoRefresh,
  IoChevronBack,
  IoChevronForward,
  IoCalendarOutline,
  IoMailOutline,
  IoCallOutline,
  IoLinkOutline,
  IoDocumentTextOutline,
  IoTimeOutline,
  IoPersonOutline,
  IoWarningOutline,
} from "react-icons/io5";

const LAMBDA_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL || "";

interface Lead {
  lead_id: string;
  affiliate_id: string;
  link_id: string;
  status: "pending" | "approved" | "rejected";
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  product_link: string;
  order_volume: string;
  pending_orders: string;
  created_at: number;
  updated_at: number;
  commission_amount?: number;
  admin_notes?: string;
  rejection_reason?: string;
  affiliate_name?: string;
  affiliate_email?: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });

  const itemsPerPage = 10;

  // Calculate stats from leads
  const calculateStats = useCallback((allLeads: Lead[]) => {
    const newStats: Stats = {
      total: allLeads.length,
      pending: allLeads.filter(l => l.status === "pending").length,
      approved: allLeads.filter(l => l.status === "approved").length,
      rejected: allLeads.filter(l => l.status === "rejected").length,
    };
    setStats(newStats);
  }, []);

  // Fetch leads from Lambda
  const fetchLeads = useCallback(async () => {
    if (!LAMBDA_URL) return;

    setLoading(true);
    try {
      // Always fetch all leads for stats, then filter client-side
      const url = `${LAMBDA_URL}?action=admin/leads&status=all&limit=500`;
      console.log("[Leads] Fetching from:", url);

      const response = await fetch(url);
      console.log("[Leads] Response status:", response.status);

      if (!response.ok) {
        console.error(`[Leads] HTTP error: ${response.status} ${response.statusText}`);
        // Try alternative action name
        const altUrl = `${LAMBDA_URL}?action=leads/list&status=all&limit=500`;
        console.log("[Leads] Trying alternative URL:", altUrl);
        const altResponse = await fetch(altUrl);
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (altData.leads) {
            calculateStats(altData.leads);
            setLeads(altData.leads);
            setLastRefresh(new Date());
            return;
          }
        }
        return;
      }

      const data = await response.json();
      console.log("[Leads] Response data:", data);

      if (data.leads && Array.isArray(data.leads)) {
        calculateStats(data.leads);
        setLeads(data.leads);
        setLastRefresh(new Date());
      } else if (data.items && Array.isArray(data.items)) {
        // Handle alternative response format
        calculateStats(data.items);
        setLeads(data.items);
        setLastRefresh(new Date());
      } else if (Array.isArray(data)) {
        // Handle direct array response
        calculateStats(data);
        setLeads(data);
        setLastRefresh(new Date());
      } else {
        console.log("[Leads] No leads in response or unexpected format:", data);
      }
    } catch (error) {
      console.error("[Leads] Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  // Handle approve
  const handleApprove = async () => {
    if (!selectedLead || !LAMBDA_URL) return;

    setProcessing(true);
    try {
      const response = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin/approve-lead",
          lead_id: selectedLead.lead_id,
          status: "approve",
          commission_amount: parseFloat(commissionAmount) || 0,
          admin_notes: adminNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setApprovalDialogOpen(false);
        setDetailsOpen(false);
        setCommissionAmount("");
        setAdminNotes("");
        fetchLeads();
      }
    } catch (error) {
      console.error("Error approving lead:", error);
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedLead || !LAMBDA_URL) return;

    setProcessing(true);
    try {
      const response = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin/approve-lead",
          lead_id: selectedLead.lead_id,
          status: "reject",
          rejection_reason: rejectionReason,
          admin_notes: adminNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRejectDialogOpen(false);
        setDetailsOpen(false);
        setRejectionReason("");
        setAdminNotes("");
        fetchLeads();
      }
    } catch (error) {
      console.error("Error rejecting lead:", error);
    } finally {
      setProcessing(false);
    }
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    // Status filter
    if (statusFilter !== "all" && lead.status !== statusFilter) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !lead.lead_name.toLowerCase().includes(query) &&
        !lead.lead_email.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom).getTime();
      if (lead.created_at < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo).getTime() + 86400000; // Include the end date
      if (lead.created_at > toDate) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, dateFrom, dateTo]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5"></span>
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-1.5"></span>
            Rejected
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mr-1.5 animate-pulse"></span>
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
            {status}
          </span>
        );
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!LAMBDA_URL) {
    return (
      <main className="flex flex-col items-center justify-center h-full w-full p-8" style={{ backgroundColor: "#1B1F3B" }}>
        <div className="p-8 rounded-xl text-center" style={{ backgroundColor: "#252A4A" }}>
          <IoWarningOutline size={48} className="mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-semibold text-white mb-2">Configuration Required</h2>
          <p className="text-slate-400">
            Lead management is not configured. Please set up AWS Lambda integration.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-full w-full gap-6 p-6 overflow-auto" style={{ backgroundColor: "#1B1F3B" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "#3A6EA5" }}>
              <IoPerson size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Lead Management</h1>
          </div>
          <p className="text-slate-400 text-sm ml-12">
            Review and manage affiliate-referred leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#3A6EA5", color: "#FFFFFF" }}
          >
            <IoRefresh size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-5 rounded-xl border border-slate-700/50" style={{ backgroundColor: "#252A4A" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Leads</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-600/30">
              <IoPerson size={24} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="p-5 rounded-xl border border-amber-500/30" style={{ backgroundColor: "#252A4A" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-400 text-sm font-medium">Pending Review</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.pending}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/20">
              <IoTimeOutline size={24} className="text-amber-400" />
            </div>
          </div>
        </div>

        {/* Approved */}
        <div className="p-5 rounded-xl border border-emerald-500/30" style={{ backgroundColor: "#252A4A" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-400 text-sm font-medium">Approved</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.approved}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/20">
              <IoCheckmark size={24} className="text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Rejected */}
        <div className="p-5 rounded-xl border border-red-500/30" style={{ backgroundColor: "#252A4A" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-sm font-medium">Rejected</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.rejected}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/20">
              <IoClose size={24} className="text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="p-5 rounded-xl border border-slate-700/50" style={{ backgroundColor: "#252A4A" }}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-slate-400 mb-2">Status</label>
            <div className="flex gap-2">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === status
                      ? "text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  style={{
                    backgroundColor: statusFilter === status ? "#3A6EA5" : "transparent",
                    border: statusFilter === status ? "none" : "1px solid rgba(148, 163, 184, 0.3)",
                  }}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="flex gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">From Date</label>
              <div className="relative">
                <IoCalendarOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 focus:outline-none focus:border-blue-500"
                  style={{ backgroundColor: "#1B1F3B" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">To Date</label>
              <div className="relative">
                <IoCalendarOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 focus:outline-none focus:border-blue-500"
                  style={{ backgroundColor: "#1B1F3B" }}
                />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-2">Search</label>
            <div className="relative">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: "#1B1F3B" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden" style={{ backgroundColor: "#252A4A" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#1B1F3B" }}>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Lead Info
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Product Link
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Order Volume
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Pending Orders
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-slate-400 text-sm">Loading leads...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-4 rounded-full bg-slate-700/30 mb-4">
                        <IoDocumentTextOutline size={32} className="text-slate-500" />
                      </div>
                      <p className="text-slate-400 font-medium mb-1">No leads found</p>
                      <p className="text-slate-500 text-sm">
                        {searchQuery || dateFrom || dateTo
                          ? "Try adjusting your filters"
                          : "New leads will appear here when submitted"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr
                    key={lead.lead_id}
                    className="hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: "#3A6EA5" }}>
                          {lead.lead_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{lead.lead_name}</p>
                          <p className="text-slate-400 text-xs">{lead.lead_email}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{formatDate(lead.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-slate-300 text-sm">{lead.lead_phone || "N/A"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <a
                        href={lead.product_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm hover:underline flex items-center gap-1"
                      >
                        <IoLinkOutline size={14} />
                        View Product
                      </a>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-slate-300 text-sm">{lead.order_volume}/day</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-slate-300 text-sm">{lead.pending_orders}</p>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setDetailsOpen(true);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/30 transition-all"
                          title="View Details"
                        >
                          <IoEye size={18} />
                        </button>
                        {lead.status === "pending" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setCommissionAmount("");
                                setAdminNotes("");
                                setApprovalDialogOpen(true);
                              }}
                              className="p-2 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-all"
                              title="Approve"
                            >
                              <IoCheckmark size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setRejectionReason("");
                                setAdminNotes("");
                                setRejectDialogOpen(true);
                              }}
                              className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                              title="Reject"
                            >
                              <IoClose size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLeads.length > itemsPerPage && (
          <div className="px-4 py-4 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IoChevronBack size={18} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                      currentPage === pageNum
                        ? "text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-600/30"
                    }`}
                    style={{
                      backgroundColor: currentPage === pageNum ? "#3A6EA5" : "transparent",
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IoChevronForward size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lead Details Modal */}
      {detailsOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#252A4A" }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between" style={{ backgroundColor: "#1B1F3B" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: "#3A6EA5" }}>
                  {selectedLead.lead_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedLead.lead_name}</h2>
                  <p className="text-sm text-slate-400">{selectedLead.lead_email}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/30 transition-all"
              >
                <IoClose size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <IoMailOutline className="text-slate-500" size={18} />
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="text-sm text-white">{selectedLead.lead_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <IoCallOutline className="text-slate-500" size={18} />
                      <div>
                        <p className="text-xs text-slate-500">Phone</p>
                        <p className="text-sm text-white">{selectedLead.lead_phone || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Business Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <IoLinkOutline className="text-slate-500" size={18} />
                      <div>
                        <p className="text-xs text-slate-500">Product Link</p>
                        <a
                          href={selectedLead.product_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:underline"
                        >
                          {selectedLead.product_link.length > 30
                            ? selectedLead.product_link.substring(0, 30) + "..."
                            : selectedLead.product_link}
                        </a>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Order Volume</p>
                      <p className="text-sm text-white">{selectedLead.order_volume} orders/day</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pending Orders</p>
                      <p className="text-sm text-white">{selectedLead.pending_orders} orders</p>
                    </div>
                  </div>
                </div>

                {/* Referral Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Referral Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <IoPersonOutline className="text-slate-500" size={18} />
                      <div>
                        <p className="text-xs text-slate-500">Affiliate ID</p>
                        <p className="text-sm text-white font-mono">{selectedLead.affiliate_id}</p>
                      </div>
                    </div>
                    {selectedLead.affiliate_name && (
                      <div>
                        <p className="text-xs text-slate-500">Affiliate Name</p>
                        <p className="text-sm text-white">{selectedLead.affiliate_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500">Link ID</p>
                      <p className="text-sm text-white font-mono">{selectedLead.link_id}</p>
                    </div>
                  </div>
                </div>

                {/* Status Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status & Dates</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">Current Status</p>
                      <div className="mt-1">{getStatusBadge(selectedLead.status)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <IoTimeOutline className="text-slate-500" size={18} />
                      <div>
                        <p className="text-xs text-slate-500">Submitted</p>
                        <p className="text-sm text-white">{formatDateTime(selectedLead.created_at)}</p>
                      </div>
                    </div>
                    {selectedLead.updated_at !== selectedLead.created_at && (
                      <div>
                        <p className="text-xs text-slate-500">Last Updated</p>
                        <p className="text-sm text-white">{formatDateTime(selectedLead.updated_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Commission & Notes (if approved/rejected) */}
              {selectedLead.commission_amount !== undefined && selectedLead.commission_amount > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-xs text-emerald-400 font-medium mb-1">Commission Amount</p>
                  <p className="text-xl font-bold text-emerald-400">${selectedLead.commission_amount.toFixed(2)}</p>
                </div>
              )}

              {selectedLead.rejection_reason && (
                <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-400 font-medium mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-300">{selectedLead.rejection_reason}</p>
                </div>
              )}

              {selectedLead.admin_notes && (
                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "#1B1F3B" }}>
                  <p className="text-xs text-slate-400 font-medium mb-1">Admin Notes</p>
                  <p className="text-sm text-slate-300">{selectedLead.admin_notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-between items-center" style={{ backgroundColor: "#1B1F3B" }}>
              <button
                onClick={() => setDetailsOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/30 text-sm font-medium transition-all"
              >
                Close
              </button>
              {selectedLead.status === "pending" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setRejectionReason("");
                      setAdminNotes("");
                      setRejectDialogOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                  >
                    Reject Lead
                  </button>
                  <button
                    onClick={() => {
                      setCommissionAmount("");
                      setAdminNotes("");
                      setApprovalDialogOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all text-white"
                    style={{ backgroundColor: "#10B981" }}
                  >
                    Approve Lead
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalDialogOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#252A4A" }}
          >
            <div className="px-6 py-4 border-b border-slate-700/50" style={{ backgroundColor: "#1B1F3B" }}>
              <h2 className="text-lg font-semibold text-white">Approve Lead</h2>
              <p className="text-sm text-slate-400 mt-1">Set commission and add notes for {selectedLead.lead_name}</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Commission Amount ($) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={commissionAmount}
                    onChange={(e) => setCommissionAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={processing}
                    className="w-full pl-8 pr-4 py-3 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    style={{ backgroundColor: "#1B1F3B" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes about this approval..."
                  disabled={processing}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-none"
                  style={{ backgroundColor: "#1B1F3B" }}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3" style={{ backgroundColor: "#1B1F3B" }}>
              <button
                onClick={() => setApprovalDialogOpen(false)}
                disabled={processing}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/30 text-sm font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing || !commissionAmount}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all text-white flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: "#10B981" }}
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Approving...
                  </>
                ) : (
                  <>
                    <IoCheckmark size={18} />
                    Approve Lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectDialogOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#252A4A" }}
          >
            <div className="px-6 py-4 border-b border-slate-700/50" style={{ backgroundColor: "#1B1F3B" }}>
              <h2 className="text-lg font-semibold text-white">Reject Lead</h2>
              <p className="text-sm text-slate-400 mt-1">Provide a reason for rejecting {selectedLead.lead_name}</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={processing}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white border border-slate-600/50 focus:outline-none focus:border-red-500 disabled:opacity-50"
                  style={{ backgroundColor: "#1B1F3B" }}
                >
                  <option value="">Select a reason...</option>
                  <option value="Invalid product link">Invalid product link</option>
                  <option value="Insufficient order volume">Insufficient order volume</option>
                  <option value="Duplicate submission">Duplicate submission</option>
                  <option value="Incomplete information">Incomplete information</option>
                  <option value="Does not meet requirements">Does not meet requirements</option>
                  <option value="Other">Other (specify in notes)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Additional details about this rejection..."
                  disabled={processing}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 focus:outline-none focus:border-blue-500 disabled:opacity-50 resize-none"
                  style={{ backgroundColor: "#1B1F3B" }}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3" style={{ backgroundColor: "#1B1F3B" }}>
              <button
                onClick={() => setRejectDialogOpen(false)}
                disabled={processing}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600/30 text-sm font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-all text-white flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: "#EF4444" }}
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <IoClose size={18} />
                    Reject Lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
