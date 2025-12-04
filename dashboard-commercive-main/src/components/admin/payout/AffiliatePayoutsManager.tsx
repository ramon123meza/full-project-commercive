"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { toast } from "react-toastify";
import Papa from "papaparse";
import {
  HiOutlineCloudArrowUp,
  HiOutlineArrowDownTray,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUpDown,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlineCurrencyDollar,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineArrowPath,
  HiOutlineCalculator,
  HiOutlineTableCells,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineEnvelope,
} from "react-icons/hi2";
import { FaPaypal } from "react-icons/fa";

// =============================================================================
// TYPES
// =============================================================================

interface AffiliateOrder {
  id: string;
  order_date: string;
  business_type: string;
  client_country: string;
  customer_code: string;
  store_name: string;
  client_niche: string;
  client_group: string;
  affiliate_name: string;
  affiliate_id: string;
  commission_per_order: number;
  commission_type: "per_order" | "percentage";
  order_number_range: string;
  quantity_of_orders: number;
  invoice_total: number;
  total_commission: number;
  status: "pending" | "approved" | "paid";
  created_at: string;
  import_id?: string;
  paid_at?: string;
  payment_reference?: string;
}

interface AffiliateSummary {
  affiliate_id: string;
  affiliate_name: string;
  total_orders: number;
  total_commission: number;
  pending_commission: number;
  paid_commission: number;
  unique_customers: number;
  paypal_email?: string;
}

interface PaymentHistory {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_reference: string;
  orders_paid: number;
}

type SortField = "order_date" | "affiliate_name" | "quantity_of_orders" | "total_commission" | "status";
type SortDirection = "asc" | "desc";
type OrderTab = "pending" | "paid";

// =============================================================================
// LIGHT PURPLE THEME COLORS
// =============================================================================

const colors = {
  bg: "#F8F7FC",
  card: "#FFFFFF",
  accent: "#8e52f2",
  accentLight: "#EDE9FE",
  accentDark: "#5B21B6",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  paypal: "#0070BA",
  paypalLight: "#E5F1FA",
};

// =============================================================================
// CSV TEMPLATE
// =============================================================================

const CSV_TEMPLATE_HEADERS = [
  "order_date",
  "business_type",
  "client_country",
  "customer_code",
  "store_name",
  "client_niche",
  "client_group",
  "affiliate_name",
  "affiliate_id",
  "commission_per_order",
  "commission_type",
  "order_number_range",
  "quantity_of_orders",
  "invoice_total",
];

const CSV_TEMPLATE_EXAMPLE = [
  "2024-01-15",
  "Dropship",
  "United States",
  "H284",
  "Clothing - Song-YNT",
  "Fashion & Apparel",
  "Venus",
  "Nam",
  "AFF-12345678",
  "0.20",
  "per_order",
  "1036-1047",
  "10",
  "500.00",
];

// =============================================================================
// LAMBDA URL
// =============================================================================

const LAMBDA_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL || "";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateCommission(
  commissionType: string,
  commissionRate: number,
  quantityOfOrders: number,
  invoiceTotal: number
): number {
  if (commissionType === "per_order") {
    return commissionRate * quantityOfOrders;
  } else {
    return invoiceTotal * commissionRate;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AffiliatePayoutsManager() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [orders, setOrders] = useState<AffiliateOrder[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>("order_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedTab, setSelectedTab] = useState<"orders" | "summary" | "history">("orders");
  const [orderTab, setOrderTab] = useState<OrderTab>("pending");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateSummary | null>(null);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    console.log("[PayoutsManager] Fetching orders...");

    try {
      if (LAMBDA_URL) {
        try {
          const response = await fetch(`${LAMBDA_URL}?action=crm/orders&limit=500`);
          if (response.ok) {
            const data = await response.json();
            if (data.orders && Array.isArray(data.orders)) {
              const transformedOrders = data.orders.map((order: any) => ({
                id: order.order_id || order.id,
                order_date: order.order_date || "",
                business_type: order.business_type || "Dropship",
                client_country: order.client_country || "",
                customer_code: order.customer_code || "",
                store_name: order.store_name || "",
                client_niche: order.client_niche || "",
                client_group: order.client_group || "",
                affiliate_name: order.affiliate_name || order.affiliate_id || "",
                affiliate_id: order.affiliate_id || "",
                commission_per_order: parseFloat(order.commission_rate) || 0,
                commission_type: order.commission_type || "per_order",
                order_number_range: order.order_number || order.order_number_range || "",
                quantity_of_orders: parseInt(order.order_quantity) || parseInt(order.quantity_of_orders) || 1,
                invoice_total: parseFloat(order.invoice_total) || 0,
                total_commission: parseFloat(order.commission_earned) || parseFloat(order.total_commission) || 0,
                status: order.status || "pending",
                created_at: order.created_at || "",
                import_id: order.import_id || "",
                paid_at: order.paid_at || "",
                payment_reference: order.payment_reference || "",
              }));
              setOrders(transformedOrders);
              console.log(`[PayoutsManager] Loaded ${transformedOrders.length} orders from Lambda`);
              setLoading(false);
              return;
            }
          }
        } catch (lambdaError) {
          console.log("[PayoutsManager] Lambda not available, using local state");
        }
      }

      setOrders([]);
    } catch (error) {
      console.error("[PayoutsManager] Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaymentHistory = useCallback(async () => {
    if (!LAMBDA_URL) return;

    try {
      const response = await fetch(`${LAMBDA_URL}?action=crm/payments/history&limit=100`);
      if (response.ok) {
        const data = await response.json();
        if (data.payments && Array.isArray(data.payments)) {
          setPaymentHistory(data.payments);
        }
      }
    } catch (error) {
      console.log("[PayoutsManager] Could not fetch payment history");
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchPaymentHistory();
  }, [fetchOrders, fetchPaymentHistory]);

  // =============================================================================
  // CSV OPERATIONS
  // =============================================================================

  const downloadTemplate = () => {
    const instructions = [
      "# Affiliate Orders Import Template",
      "# Fill in the data below the header row",
      "# commission_type: 'per_order' for fixed amount per order, 'percentage' for % of invoice",
      "# commission_per_order: Amount for per_order (e.g., 0.20 = $0.20) or decimal for percentage (e.g., 0.01 = 1%)",
      "# Total commission will be auto-calculated",
      "",
    ];

    const csvContent = [
      ...instructions,
      CSV_TEMPLATE_HEADERS.join(","),
      CSV_TEMPLATE_EXAMPLE.join(","),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "affiliate_orders_template.csv";
    link.click();
    toast.success("Template downloaded!");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          const validRows = rows.filter(
            (row) => row.order_date && row.affiliate_name && !row.order_date.startsWith("#")
          );

          if (validRows.length === 0) {
            toast.error("No valid data found in CSV");
            setLoading(false);
            return;
          }

          const newOrders: AffiliateOrder[] = validRows.map((row, index) => {
            const commissionType = (row.commission_type || "per_order") as "per_order" | "percentage";
            const commissionRate = parseFloat(row.commission_per_order) || 0;
            const quantityOfOrders = parseInt(row.quantity_of_orders) || 1;
            const invoiceTotal = parseFloat(row.invoice_total) || 0;

            const totalCommission = calculateCommission(
              commissionType,
              commissionRate,
              quantityOfOrders,
              invoiceTotal
            );

            return {
              id: `ORD-${Date.now()}-${index}`,
              order_date: row.order_date || "",
              business_type: row.business_type || "Dropship",
              client_country: row.client_country || "",
              customer_code: row.customer_code || "",
              store_name: row.store_name || "",
              client_niche: row.client_niche || "",
              client_group: row.client_group || "",
              affiliate_name: row.affiliate_name || "",
              affiliate_id: row.affiliate_id || `AFF-${Date.now()}`,
              commission_per_order: commissionRate,
              commission_type: commissionType,
              order_number_range: row.order_number_range || "",
              quantity_of_orders: quantityOfOrders,
              invoice_total: invoiceTotal,
              total_commission: totalCommission,
              status: "pending",
              created_at: new Date().toISOString(),
              import_id: `IMP-${Date.now()}`,
            };
          });

          if (LAMBDA_URL) {
            try {
              const response = await fetch(`${LAMBDA_URL}?action=crm/orders/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orders: newOrders.map((order) => ({
                    affiliate_id: order.affiliate_id,
                    customer_code: order.customer_code,
                    store_name: order.store_name,
                    order_number: order.order_number_range,
                    order_date: order.order_date,
                    order_quantity: order.quantity_of_orders,
                    invoice_total: order.invoice_total,
                    commission_type: order.commission_type,
                    commission_rate: order.commission_per_order,
                    affiliate_name: order.affiliate_name,
                    business_type: order.business_type,
                    client_country: order.client_country,
                    client_niche: order.client_niche,
                    client_group: order.client_group,
                    status: "pending",
                  })),
                  imported_by: "admin",
                }),
              });

              if (response.ok) {
                const result = await response.json();
                console.log("[PayoutsManager] Import result:", result);
              }
            } catch (lambdaError) {
              console.log("[PayoutsManager] Lambda import failed, storing locally");
            }
          }

          setOrders((prev) => [...newOrders, ...prev]);
          toast.success(`Successfully imported ${newOrders.length} orders!`);
          setUploadModalOpen(false);
        } catch (error) {
          console.error("[PayoutsManager] CSV parse error:", error);
          toast.error("Failed to parse CSV file");
        } finally {
          setLoading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      },
      error: (error) => {
        console.error("[PayoutsManager] CSV error:", error);
        toast.error("Failed to read CSV file");
        setLoading(false);
      },
    });
  };

  const exportToCSV = () => {
    const exportData = filteredAndSortedOrders.map((order) => ({
      order_date: order.order_date,
      business_type: order.business_type,
      client_country: order.client_country,
      customer_code: order.customer_code,
      store_name: order.store_name,
      client_niche: order.client_niche,
      client_group: order.client_group,
      affiliate_name: order.affiliate_name,
      affiliate_id: order.affiliate_id,
      commission_per_order: order.commission_per_order,
      commission_type: order.commission_type,
      order_number_range: order.order_number_range,
      quantity_of_orders: order.quantity_of_orders,
      invoice_total: order.invoice_total,
      total_commission: order.total_commission,
      status: order.status,
      paid_at: order.paid_at || "",
      payment_reference: order.payment_reference || "",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `affiliate_orders_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Orders exported!");
  };

  // =============================================================================
  // FILTERING & SORTING
  // =============================================================================

  const pendingOrders = useMemo(() => orders.filter((o) => o.status !== "paid"), [orders]);
  const paidOrders = useMemo(() => orders.filter((o) => o.status === "paid"), [orders]);

  const currentOrders = useMemo(() => {
    return orderTab === "pending" ? pendingOrders : paidOrders;
  }, [orderTab, pendingOrders, paidOrders]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return currentOrders;
    const query = searchQuery.toLowerCase();
    return currentOrders.filter(
      (order) =>
        order.affiliate_name.toLowerCase().includes(query) ||
        order.customer_code.toLowerCase().includes(query) ||
        order.store_name.toLowerCase().includes(query) ||
        order.client_niche.toLowerCase().includes(query)
    );
  }, [currentOrders, searchQuery]);

  const filteredAndSortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "order_date":
          comparison = new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
          break;
        case "affiliate_name":
          comparison = a.affiliate_name.localeCompare(b.affiliate_name);
          break;
        case "quantity_of_orders":
          comparison = a.quantity_of_orders - b.quantity_of_orders;
          break;
        case "total_commission":
          comparison = a.total_commission - b.total_commission;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredOrders, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedOrders.slice(start, start + itemsPerPage);
  }, [filteredAndSortedOrders, currentPage, itemsPerPage]);

  // Affiliate Summaries
  const affiliateSummaries: AffiliateSummary[] = useMemo(() => {
    const summaryMap = new Map<string, AffiliateSummary>();

    orders.forEach((order) => {
      const key = order.affiliate_id || order.affiliate_name;
      const existing = summaryMap.get(key) || {
        affiliate_id: order.affiliate_id,
        affiliate_name: order.affiliate_name,
        total_orders: 0,
        total_commission: 0,
        pending_commission: 0,
        paid_commission: 0,
        unique_customers: 0,
      };

      existing.total_orders += order.quantity_of_orders;
      existing.total_commission += order.total_commission;

      if (order.status === "pending" || order.status === "approved") {
        existing.pending_commission += order.total_commission;
      } else if (order.status === "paid") {
        existing.paid_commission += order.total_commission;
      }

      summaryMap.set(key, existing);
    });

    const customersByAffiliate = new Map<string, Set<string>>();
    orders.forEach((order) => {
      const key = order.affiliate_id || order.affiliate_name;
      if (!customersByAffiliate.has(key)) {
        customersByAffiliate.set(key, new Set());
      }
      customersByAffiliate.get(key)!.add(order.customer_code);
    });

    customersByAffiliate.forEach((customers, key) => {
      const summary = summaryMap.get(key);
      if (summary) {
        summary.unique_customers = customers.size;
      }
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.pending_commission - a.pending_commission);
  }, [orders]);

  // Stats
  const stats = useMemo(
    () => ({
      totalOrders: orders.reduce((sum, o) => sum + o.quantity_of_orders, 0),
      totalCommission: orders.reduce((sum, o) => sum + o.total_commission, 0),
      pendingCommission: pendingOrders.reduce((sum, o) => sum + o.total_commission, 0),
      paidCommission: paidOrders.reduce((sum, o) => sum + o.total_commission, 0),
      uniqueAffiliates: new Set(orders.map((o) => o.affiliate_id || o.affiliate_name)).size,
      pendingOrdersCount: pendingOrders.length,
      paidOrdersCount: paidOrders.length,
    }),
    [orders, pendingOrders, paidOrders]
  );

  // =============================================================================
  // PAYMENT ACTIONS
  // =============================================================================

  const handleOpenPaymentModal = (summary: AffiliateSummary) => {
    setSelectedAffiliate(summary);
    setPaypalEmail("");
    setPaymentReference("");
    setPaymentModalOpen(true);
  };

  const handleSendPayment = async () => {
    if (!selectedAffiliate) return;

    if (!paypalEmail || !paypalEmail.includes("@")) {
      toast.error("Please enter a valid PayPal email address");
      return;
    }

    setProcessingPayment(true);

    try {
      const affiliateOrders = orders.filter(
        (o) =>
          (o.affiliate_id === selectedAffiliate.affiliate_id ||
            o.affiliate_name === selectedAffiliate.affiliate_name) &&
          o.status !== "paid"
      );

      const paidAt = new Date().toISOString();
      const reference = paymentReference || `PAY-${Date.now()}`;

      // Update orders to paid status
      const updatedOrders = orders.map((order) => {
        if (
          (order.affiliate_id === selectedAffiliate.affiliate_id ||
            order.affiliate_name === selectedAffiliate.affiliate_name) &&
          order.status !== "paid"
        ) {
          return {
            ...order,
            status: "paid" as const,
            paid_at: paidAt,
            payment_reference: reference,
          };
        }
        return order;
      });

      // Try to update in Lambda/DynamoDB
      if (LAMBDA_URL) {
        try {
          await fetch(`${LAMBDA_URL}?action=crm/payments/record`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              affiliate_id: selectedAffiliate.affiliate_id,
              affiliate_name: selectedAffiliate.affiliate_name,
              amount: selectedAffiliate.pending_commission,
              paypal_email: paypalEmail,
              payment_reference: reference,
              payment_date: paidAt,
              orders_paid: affiliateOrders.length,
              order_ids: affiliateOrders.map((o) => o.id),
            }),
          });
        } catch (lambdaError) {
          console.log("[PayoutsManager] Lambda payment record failed");
        }
      }

      setOrders(updatedOrders);

      // Add to payment history locally
      const newPayment: PaymentHistory = {
        id: reference,
        affiliate_id: selectedAffiliate.affiliate_id,
        affiliate_name: selectedAffiliate.affiliate_name,
        amount: selectedAffiliate.pending_commission,
        payment_date: paidAt,
        payment_method: "PayPal",
        payment_reference: reference,
        orders_paid: affiliateOrders.length,
      };
      setPaymentHistory((prev) => [newPayment, ...prev]);

      toast.success(
        `Payment of ${formatCurrency(selectedAffiliate.pending_commission)} sent to ${selectedAffiliate.affiliate_name}!`
      );
      setPaymentModalOpen(false);
      setSelectedAffiliate(null);
    } catch (error) {
      console.error("[PayoutsManager] Payment error:", error);
      toast.error("Failed to process payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleMarkAsPaid = async (summary: AffiliateSummary) => {
    const confirmed = window.confirm(
      `Mark all pending orders for ${summary.affiliate_name} as paid?\n\nAmount: ${formatCurrency(summary.pending_commission)}`
    );

    if (!confirmed) return;

    const paidAt = new Date().toISOString();
    const reference = `PAY-${Date.now()}`;

    const affiliateOrders = orders.filter(
      (o) =>
        (o.affiliate_id === summary.affiliate_id || o.affiliate_name === summary.affiliate_name) &&
        o.status !== "paid"
    );

    const updatedOrders = orders.map((order) => {
      if (
        (order.affiliate_id === summary.affiliate_id || order.affiliate_name === summary.affiliate_name) &&
        order.status !== "paid"
      ) {
        return {
          ...order,
          status: "paid" as const,
          paid_at: paidAt,
          payment_reference: reference,
        };
      }
      return order;
    });

    // Try to update in Lambda
    if (LAMBDA_URL) {
      try {
        await fetch(`${LAMBDA_URL}?action=crm/orders/mark-paid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            affiliate_id: summary.affiliate_id,
            order_ids: affiliateOrders.map((o) => o.id),
            paid_at: paidAt,
            payment_reference: reference,
          }),
        });
      } catch (lambdaError) {
        console.log("[PayoutsManager] Lambda mark-paid failed");
      }
    }

    // Also record payment in Supabase for affiliate Partners page visibility
    try {
      // Look up the user_id from affiliates table
      const { data: affiliateData } = await supabase
        .from("affiliates")
        .select("user_id")
        .eq("affiliate_id", summary.affiliate_id)
        .single();

      if (affiliateData?.user_id) {
        // Insert payment record into payouts table
        await supabase.from("payouts").insert({
          user_id: affiliateData.user_id,
          amount: summary.pending_commission,
          status: "Completed",
          paypal_address: summary.paypal_email || null,
          payment_reference: reference,
          created_at: paidAt,
        });
        console.log("[PayoutsManager] Supabase payment record created for affiliate");
      }
    } catch (supabaseError) {
      console.log("[PayoutsManager] Supabase payment record failed:", supabaseError);
    }

    setOrders(updatedOrders);
    toast.success(`All orders for ${summary.affiliate_name} marked as paid!`);
  };

  // =============================================================================
  // OTHER ACTIONS
  // =============================================================================

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: "pending" | "approved" | "paid") => {
    const paidAt = newStatus === "paid" ? new Date().toISOString() : undefined;

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status: newStatus, paid_at: paidAt }
          : order
      )
    );

    // Update in Lambda
    if (LAMBDA_URL) {
      try {
        await fetch(`${LAMBDA_URL}?action=crm/orders/update-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            status: newStatus,
            paid_at: paidAt,
          }),
        });
      } catch (error) {
        console.log("[PayoutsManager] Status update to Lambda failed");
      }
    }

    toast.success(`Order status updated to ${newStatus}`);
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
    toast.success("Order deleted");
  };

  // =============================================================================
  // UI HELPERS
  // =============================================================================

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <HiOutlineChevronUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === "asc" ? (
      <HiOutlineChevronUp className="w-4 h-4" style={{ color: colors.accent }} />
    ) : (
      <HiOutlineChevronDown className="w-4 h-4" style={{ color: colors.accent }} />
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: colors.warningLight, text: colors.warning },
      approved: { bg: colors.accentLight, text: colors.accent },
      paid: { bg: colors.successLight, text: colors.success },
    };
    const style = styles[status] || styles.pending;
    return (
      <span
        className="px-2.5 py-1 text-xs font-medium rounded-full"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="flex flex-col w-full gap-6 p-6" style={{ backgroundColor: colors.bg, minHeight: "100%" }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${colors.accentDark} 0%, ${colors.accent} 100%)` }}
          >
            <HiOutlineCurrencyDollar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
              Affiliate Payouts CRM
            </h1>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              Manage affiliate commissions and payouts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchOrders()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.textMuted }}
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.textMuted }}
          >
            <HiOutlineArrowDownTray className="w-4 h-4" />
            Template
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.textMuted }}
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: colors.accent }}
          >
            <HiOutlineCloudArrowUp className="w-4 h-4" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.accentLight }}>
              <HiOutlineTableCells className="w-5 h-5" style={{ color: colors.accent }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.totalOrders.toLocaleString()}</p>
              <p className="text-xs" style={{ color: colors.textMuted }}>Total Orders</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.warningLight }}>
              <HiOutlineClock className="w-5 h-5" style={{ color: colors.warning }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{formatCurrency(stats.pendingCommission)}</p>
              <p className="text-xs" style={{ color: colors.textMuted }}>Pending ({stats.pendingOrdersCount})</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.successLight }}>
              <HiOutlineCheckCircle className="w-5 h-5" style={{ color: colors.success }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{formatCurrency(stats.paidCommission)}</p>
              <p className="text-xs" style={{ color: colors.textMuted }}>Paid ({stats.paidOrdersCount})</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.accentLight }}>
              <HiOutlineCurrencyDollar className="w-5 h-5" style={{ color: colors.accent }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{formatCurrency(stats.totalCommission)}</p>
              <p className="text-xs" style={{ color: colors.textMuted }}>Total Commission</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.accentLight }}>
              <HiOutlineUsers className="w-5 h-5" style={{ color: colors.accent }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.uniqueAffiliates}</p>
              <p className="text-xs" style={{ color: colors.textMuted }}>Affiliates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 p-1 rounded-xl max-w-lg" style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
        <button
          onClick={() => setSelectedTab("orders")}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all`}
          style={{
            backgroundColor: selectedTab === "orders" ? colors.accent : "transparent",
            color: selectedTab === "orders" ? "white" : colors.textMuted,
          }}
        >
          <HiOutlineTableCells className="w-4 h-4" />
          Orders
        </button>
        <button
          onClick={() => setSelectedTab("summary")}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all`}
          style={{
            backgroundColor: selectedTab === "summary" ? colors.accent : "transparent",
            color: selectedTab === "summary" ? "white" : colors.textMuted,
          }}
        >
          <HiOutlineUsers className="w-4 h-4" />
          Affiliates
        </button>
        <button
          onClick={() => setSelectedTab("history")}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all`}
          style={{
            backgroundColor: selectedTab === "history" ? colors.accent : "transparent",
            color: selectedTab === "history" ? "white" : colors.textMuted,
          }}
        >
          <HiOutlineBanknotes className="w-4 h-4" />
          Payment History
        </button>
      </div>

      {/* Orders Tab Content */}
      {selectedTab === "orders" && (
        <>
          {/* Order Sub-tabs */}
          <div className="flex items-center gap-4">
            <div className="flex gap-2 border-b" style={{ borderColor: colors.border }}>
              <button
                onClick={() => { setOrderTab("pending"); setCurrentPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  orderTab === "pending" ? "border-current" : "border-transparent"
                }`}
                style={{ color: orderTab === "pending" ? colors.warning : colors.textMuted }}
              >
                Pending Orders ({stats.pendingOrdersCount})
              </button>
              <button
                onClick={() => { setOrderTab("paid"); setCurrentPage(1); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  orderTab === "paid" ? "border-current" : "border-transparent"
                }`}
                style={{ color: orderTab === "paid" ? colors.success : colors.textMuted }}
              >
                Paid Orders ({stats.paidOrdersCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: colors.textMuted }} />
              <input
                type="text"
                placeholder="Search by affiliate, customer, store..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead style={{ backgroundColor: colors.bg }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>
                      <button onClick={() => handleSort("order_date")} className="flex items-center gap-1">
                        Date {getSortIcon("order_date")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>
                      <button onClick={() => handleSort("affiliate_name")} className="flex items-center gap-1">
                        Affiliate {getSortIcon("affiliate_name")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Niche</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>
                      <button onClick={() => handleSort("quantity_of_orders")} className="flex items-center gap-1">
                        Orders {getSortIcon("quantity_of_orders")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>
                      <button onClick={() => handleSort("total_commission")} className="flex items-center gap-1 ml-auto">
                        Commission {getSortIcon("total_commission")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>
                      Status
                    </th>
                    {orderTab === "paid" && (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Paid At</th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: colors.border }}>
                  {paginatedOrders.length > 0 ? (
                    paginatedOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm" style={{ color: colors.text }}>
                          {formatDate(order.order_date)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium" style={{ color: colors.text }}>{order.affiliate_name}</p>
                            <p className="text-xs" style={{ color: colors.textMuted }}>{order.affiliate_id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium" style={{ color: colors.text }}>{order.customer_code}</p>
                            <p className="text-xs truncate max-w-[150px]" style={{ color: colors.textMuted }}>{order.store_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: colors.textMuted }}>{order.client_niche}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold" style={{ color: colors.text }}>{order.quantity_of_orders}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.accentLight, color: colors.accent }}>
                            {order.commission_type === "per_order"
                              ? `$${order.commission_per_order}/order`
                              : `${(order.commission_per_order * 100).toFixed(1)}%`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold" style={{ color: colors.success }}>
                            {formatCurrency(order.total_commission)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {orderTab === "pending" ? (
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                              className="text-xs px-2 py-1 rounded border focus:outline-none"
                              style={{ borderColor: colors.border }}
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="paid">Paid</option>
                            </select>
                          ) : (
                            getStatusBadge(order.status)
                          )}
                        </td>
                        {orderTab === "paid" && (
                          <td className="px-4 py-3 text-sm" style={{ color: colors.textMuted }}>
                            {formatDate(order.paid_at || "")}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                              title="Delete"
                            >
                              <HiOutlineTrash className="w-4 h-4" style={{ color: colors.error }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={orderTab === "paid" ? 10 : 9} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
                            <HiOutlineTableCells className="w-8 h-8" style={{ color: colors.textMuted }} />
                          </div>
                          <p className="font-medium" style={{ color: colors.text }}>
                            {orderTab === "pending" ? "No pending orders" : "No paid orders yet"}
                          </p>
                          {orderTab === "pending" && (
                            <>
                              <p className="text-sm" style={{ color: colors.textMuted }}>Upload a CSV to import affiliate orders</p>
                              <button
                                onClick={() => setUploadModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white mt-2"
                                style={{ backgroundColor: colors.accent }}
                              >
                                <HiOutlineCloudArrowUp className="w-4 h-4" />
                                Import CSV
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredAndSortedOrders.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: colors.border, backgroundColor: colors.bg }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: colors.textMuted }}>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border rounded text-sm"
                    style={{ borderColor: colors.border }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="text-sm" style={{ color: colors.textMuted }}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length)} of {filteredAndSortedOrders.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border disabled:opacity-50"
                    style={{ borderColor: colors.border }}
                  >
                    <HiOutlineChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm" style={{ color: colors.text }}>Page {currentPage} of {totalPages || 1}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded border disabled:opacity-50"
                    style={{ borderColor: colors.border }}
                  >
                    <HiOutlineChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Affiliate Summary Tab */}
      {selectedTab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {affiliateSummaries.map((summary) => (
            <div
              key={summary.affiliate_id}
              className="rounded-xl p-5 border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: colors.accent }}
                  >
                    {summary.affiliate_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: colors.text }}>{summary.affiliate_name}</p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>{summary.affiliate_id}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
                  <p className="text-lg font-bold" style={{ color: colors.text }}>{summary.total_orders.toLocaleString()}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Total Orders</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: colors.bg }}>
                  <p className="text-lg font-bold" style={{ color: colors.accent }}>{formatCurrency(summary.total_commission)}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Total Commission</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: colors.warningLight }}>
                  <p className="text-lg font-bold" style={{ color: colors.warning }}>{formatCurrency(summary.pending_commission)}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Pending</p>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: colors.successLight }}>
                  <p className="text-lg font-bold" style={{ color: colors.success }}>{formatCurrency(summary.paid_commission)}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Paid</p>
                </div>
              </div>

              <div className="pt-3 border-t space-y-2" style={{ borderColor: colors.border }}>
                <p className="text-xs" style={{ color: colors.textMuted }}>
                  {summary.unique_customers} unique customers
                </p>

                {summary.pending_commission > 0 && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleOpenPaymentModal(summary)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90"
                      style={{ backgroundColor: colors.paypal }}
                    >
                      <FaPaypal className="w-4 h-4" />
                      Send via PayPal
                    </button>
                    <button
                      onClick={() => handleMarkAsPaid(summary)}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
                      style={{ backgroundColor: colors.successLight, color: colors.success }}
                    >
                      <HiOutlineCheck className="w-4 h-4" />
                      Mark Paid
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {affiliateSummaries.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p style={{ color: colors.textMuted }}>No affiliate data available</p>
            </div>
          )}
        </div>
      )}

      {/* Payment History Tab */}
      {selectedTab === "history" && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.bg }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Affiliate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Reference</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm" style={{ color: colors.text }}>
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium" style={{ color: colors.text }}>{payment.affiliate_name}</p>
                          <p className="text-xs" style={{ color: colors.textMuted }}>{payment.affiliate_id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold" style={{ color: colors.success }}>
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: colors.paypalLight, color: colors.paypal }}>
                          <FaPaypal className="w-3 h-3" />
                          {payment.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono" style={{ color: colors.textMuted }}>
                        {payment.payment_reference}
                      </td>
                      <td className="px-4 py-3 text-center text-sm" style={{ color: colors.text }}>
                        {payment.orders_paid}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
                          <HiOutlineBanknotes className="w-8 h-8" style={{ color: colors.textMuted }} />
                        </div>
                        <p className="font-medium" style={{ color: colors.text }}>No payment history yet</p>
                        <p className="text-sm" style={{ color: colors.textMuted }}>Payments will appear here after you process affiliate payouts</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 rounded-2xl p-6" style={{ backgroundColor: colors.card }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: colors.text }}>Import Affiliate Orders</h2>
              <button onClick={() => setUploadModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-current transition-colors"
                style={{ borderColor: colors.border }}
                onClick={() => fileInputRef.current?.click()}
              >
                <HiOutlineCloudArrowUp className="w-12 h-12 mx-auto mb-3" style={{ color: colors.accent }} />
                <p className="font-medium" style={{ color: colors.text }}>Click to upload CSV file</p>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>or drag and drop</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.bg }}>
                <p className="font-medium mb-2" style={{ color: colors.text }}>Need the template?</p>
                <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                  Download our CSV template with all required columns
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm"
                  style={{ borderColor: colors.accent, color: colors.accent }}
                >
                  <HiOutlineArrowDownTray className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              <div className="text-xs" style={{ color: colors.textMuted }}>
                <p className="font-medium mb-1">Required columns:</p>
                <p>order_date, affiliate_name, customer_code, commission_per_order, commission_type, quantity_of_orders</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedAffiliate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ backgroundColor: colors.card }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: colors.text }}>Send Payment via PayPal</h2>
              <button onClick={() => setPaymentModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Affiliate Info */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.bg }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: colors.accent }}
                  >
                    {selectedAffiliate.affiliate_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: colors.text }}>{selectedAffiliate.affiliate_name}</p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>{selectedAffiliate.affiliate_id}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: colors.border }}>
                  <span className="text-sm" style={{ color: colors.textMuted }}>Amount to pay:</span>
                  <span className="text-xl font-bold" style={{ color: colors.success }}>
                    {formatCurrency(selectedAffiliate.pending_commission)}
                  </span>
                </div>
              </div>

              {/* PayPal Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  PayPal Email Address *
                </label>
                <div className="relative">
                  <HiOutlineEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: colors.textMuted }} />
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="affiliate@email.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                    style={{ borderColor: colors.border, color: colors.text }}
                  />
                </div>
              </div>

              {/* Payment Reference */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Payment Reference (optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., PayPal Transaction ID"
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: colors.border, color: colors.text }}
                />
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: colors.paypalLight, color: colors.paypal }}>
                <p className="flex items-start gap-2">
                  <FaPaypal className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>This will mark all pending orders for this affiliate as paid and record the payment in history.</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-lg border font-medium transition-colors hover:bg-gray-50"
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendPayment}
                  disabled={processingPayment || !paypalEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colors.paypal }}
                >
                  {processingPayment ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FaPaypal className="w-4 h-4" />
                      Confirm Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 flex items-center gap-4">
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: colors.accent, borderTopColor: "transparent" }} />
            <p style={{ color: colors.text }}>Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
