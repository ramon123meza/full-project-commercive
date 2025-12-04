"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  HiOutlineCube,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowDownTray,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUpDown,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineChartBar,
} from "react-icons/hi2";
import { useStoreContext } from "@/context/StoreContext";
import { createClient } from "@/app/utils/supabase/client";

// =============================================================================
// TYPES
// =============================================================================

interface InventoryItem {
  id: string;
  product_id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  variant_name: string;
  image_url: string | null;
  current_stock: number;
  committed: number;
  available: number;
  backorders: number;
  is_tracked: boolean;
  updated_at: string;
}

interface SalesData {
  sku: string;
  product_id: string;
  variant_id: string;
  quantity_sold_7d: number;
  quantity_sold_30d: number;
  quantity_sold_90d: number;
  total_revenue_30d: number;
  order_count_30d: number;
}

interface RestockItem extends InventoryItem {
  // Calculated fields
  daily_sales_rate: number;
  weekly_sales_rate: number;
  monthly_sales_rate: number;
  days_of_inventory: number;
  velocity_trend: "increasing" | "stable" | "decreasing";
  urgency: "critical" | "warning" | "safe" | "overstocked";
  reorder_point: number;
  safety_stock: number;
  recommended_qty: number;
  recommendation_reason: string;
  // Sales data
  sold_7d: number;
  sold_30d: number;
  sold_90d: number;
  revenue_30d: number;
}

type SortField = "product_name" | "current_stock" | "daily_sales_rate" | "days_of_inventory" | "recommended_qty";
type SortDirection = "asc" | "desc";
type FilterTab = "all" | "critical" | "warning" | "safe" | "overstocked";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  LEAD_TIME_DAYS: 14,          // Default lead time for reordering
  SAFETY_STOCK_DAYS: 7,        // Safety buffer in days
  CRITICAL_DAYS: 7,            // Days threshold for critical status
  WARNING_DAYS: 14,            // Days threshold for warning status
  OVERSTOCK_DAYS: 90,          // Days threshold for overstocked
  MIN_VELOCITY_FOR_CALC: 0.01, // Minimum daily sales to calculate
};

// =============================================================================
// CALCULATION FUNCTIONS - Sophisticated Business Logic
// =============================================================================

/**
 * Calculate daily sales rate using weighted average
 * More recent sales have higher weight
 */
function calculateDailySalesRate(sold7d: number, sold30d: number, sold90d: number): number {
  // Weighted average: 7-day (50%), 30-day (35%), 90-day (15%)
  const rate7d = sold7d / 7;
  const rate30d = sold30d / 30;
  const rate90d = sold90d / 90;

  // If we have recent data, weight it more heavily
  if (sold7d > 0) {
    return (rate7d * 0.5) + (rate30d * 0.35) + (rate90d * 0.15);
  } else if (sold30d > 0) {
    return (rate30d * 0.7) + (rate90d * 0.3);
  }
  return rate90d;
}

/**
 * Determine velocity trend by comparing recent vs historical sales
 */
function calculateVelocityTrend(sold7d: number, sold30d: number, sold90d: number): "increasing" | "stable" | "decreasing" {
  const rate7d = sold7d / 7;
  const rate30d = sold30d / 30;

  if (rate30d === 0) return "stable";

  const ratio = rate7d / rate30d;

  if (ratio > 1.2) return "increasing";
  if (ratio < 0.8) return "decreasing";
  return "stable";
}

/**
 * Calculate days of inventory remaining
 * Never returns negative - returns 0 if out of stock
 */
function calculateDaysOfInventory(availableStock: number, dailySalesRate: number): number {
  if (availableStock <= 0) return 0;
  if (dailySalesRate < CONFIG.MIN_VELOCITY_FOR_CALC) return 999; // Infinite if no sales
  return Math.max(0, Math.floor(availableStock / dailySalesRate));
}

/**
 * Calculate safety stock based on sales variability
 */
function calculateSafetyStock(dailySalesRate: number, leadTimeDays: number = CONFIG.LEAD_TIME_DAYS): number {
  // Safety stock = Z-score * sqrt(lead time) * daily standard deviation
  // Simplified: safety_stock = daily_sales * safety_days
  return Math.ceil(dailySalesRate * CONFIG.SAFETY_STOCK_DAYS);
}

/**
 * Calculate reorder point (when to trigger a new order)
 */
function calculateReorderPoint(dailySalesRate: number, leadTimeDays: number = CONFIG.LEAD_TIME_DAYS): number {
  const leadTimeDemand = dailySalesRate * leadTimeDays;
  const safetyStock = calculateSafetyStock(dailySalesRate, leadTimeDays);
  return Math.ceil(leadTimeDemand + safetyStock);
}

/**
 * Calculate recommended order quantity using EOQ-inspired formula
 */
function calculateRecommendedQty(
  currentStock: number,
  dailySalesRate: number,
  backorders: number,
  leadTimeDays: number = CONFIG.LEAD_TIME_DAYS
): number {
  if (dailySalesRate < CONFIG.MIN_VELOCITY_FOR_CALC) return 0;

  // Calculate lead time demand
  const leadTimeDemand = Math.ceil(dailySalesRate * leadTimeDays);

  // Calculate safety stock
  const safetyStock = calculateSafetyStock(dailySalesRate, leadTimeDays);

  // Calculate target inventory level (enough for lead time + safety + buffer)
  const targetInventory = leadTimeDemand + safetyStock + Math.ceil(dailySalesRate * 7); // Extra week buffer

  // Calculate reorder quantity
  const availableStock = Math.max(0, currentStock - backorders);
  const neededQty = Math.max(0, targetInventory - availableStock);

  // Round up to reasonable order quantity (minimum 1 if needed)
  return neededQty > 0 ? Math.max(1, Math.ceil(neededQty)) : 0;
}

/**
 * Determine urgency level based on days of inventory
 */
function determineUrgency(daysOfInventory: number, currentStock: number, dailySalesRate: number): "critical" | "warning" | "safe" | "overstocked" {
  if (currentStock <= 0) return "critical";
  if (dailySalesRate < CONFIG.MIN_VELOCITY_FOR_CALC) return "safe"; // No sales = no urgency

  if (daysOfInventory <= CONFIG.CRITICAL_DAYS) return "critical";
  if (daysOfInventory <= CONFIG.WARNING_DAYS) return "warning";
  if (daysOfInventory >= CONFIG.OVERSTOCK_DAYS) return "overstocked";
  return "safe";
}

/**
 * Generate human-readable recommendation reason
 */
function generateRecommendationReason(
  urgency: "critical" | "warning" | "safe" | "overstocked",
  daysOfInventory: number,
  currentStock: number,
  dailySalesRate: number,
  backorders: number
): string {
  if (currentStock <= 0 && backorders > 0) {
    return `Out of stock with ${backorders} pending backorders - urgent reorder required`;
  }
  if (currentStock <= 0) {
    return "Out of stock - immediate reorder required";
  }
  if (dailySalesRate < CONFIG.MIN_VELOCITY_FOR_CALC) {
    return "No recent sales - monitor before reordering";
  }

  switch (urgency) {
    case "critical":
      return `Only ${daysOfInventory} days of stock remaining at current sales rate`;
    case "warning":
      return `${daysOfInventory} days of stock - consider reordering soon`;
    case "overstocked":
      return `${daysOfInventory}+ days of inventory - reduce future orders`;
    default:
      return `Healthy stock levels - ${daysOfInventory} days of inventory`;
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RestockPage() {
  const supabase = createClient();
  const { selectedStore } = useStoreContext();
  const storeUrl = selectedStore?.store_url || null;

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryData, setInventoryData] = useState<RestockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>("days_of_inventory");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [analysisMetadata, setAnalysisMetadata] = useState({
    totalSkus: 0,
    analyzedOrders: 0,
    dateRange: "",
  });

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchInventoryAndSales = useCallback(async () => {
    if (!storeUrl) {
      console.log("[Restock] No store URL selected");
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log(`[Restock] Fetching data for store: ${storeUrl}`);

    try {
      // Calculate date ranges
      const now = new Date();
      const date7dAgo = new Date(now);
      date7dAgo.setDate(date7dAgo.getDate() - 7);
      const date30dAgo = new Date(now);
      date30dAgo.setDate(date30dAgo.getDate() - 30);
      const date90dAgo = new Date(now);
      date90dAgo.setDate(date90dAgo.getDate() - 90);

      // Fetch inventory data
      const { data: rawInventory, error: invError } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_url", storeUrl);

      if (invError) {
        console.error("[Restock] Error fetching inventory:", invError);
        throw invError;
      }

      console.log(`[Restock] Fetched ${rawInventory?.length || 0} inventory items`);

      // Fetch orders for sales analysis
      const { data: ordersData, error: ordersError } = await supabase
        .from("order")
        .select("line_items, created_at, financial_status")
        .eq("store_url", storeUrl)
        .gte("created_at", date90dAgo.toISOString())
        .eq("financial_status", "paid");

      if (ordersError) {
        console.error("[Restock] Error fetching orders:", ordersError);
      }

      console.log(`[Restock] Fetched ${ordersData?.length || 0} orders for analysis`);

      // Aggregate sales data by SKU/variant
      const salesMap: Map<string, SalesData> = new Map();

      ordersData?.forEach((order) => {
        const orderDate = new Date(order.created_at);
        const lineItems = order.line_items as Array<{
          sku?: string;
          product_id?: string | number;
          variant_id?: string | number;
          quantity?: number;
          price?: string | number;
        }>;

        lineItems?.forEach((item) => {
          const key = item.sku || `${item.product_id}_${item.variant_id}`;
          const quantity = item.quantity || 0;
          const price = parseFloat(String(item.price || 0));

          const existing = salesMap.get(key) || {
            sku: item.sku || "",
            product_id: String(item.product_id || ""),
            variant_id: String(item.variant_id || ""),
            quantity_sold_7d: 0,
            quantity_sold_30d: 0,
            quantity_sold_90d: 0,
            total_revenue_30d: 0,
            order_count_30d: 0,
          };

          // Add to appropriate time buckets
          if (orderDate >= date7dAgo) {
            existing.quantity_sold_7d += quantity;
          }
          if (orderDate >= date30dAgo) {
            existing.quantity_sold_30d += quantity;
            existing.total_revenue_30d += price * quantity;
            existing.order_count_30d += 1;
          }
          existing.quantity_sold_90d += quantity;

          salesMap.set(key, existing);
        });
      });

      console.log(`[Restock] Aggregated sales for ${salesMap.size} unique SKUs`);

      // Transform inventory data with calculations
      const transformedData: RestockItem[] = (rawInventory || []).map((item) => {
        // Parse inventory levels
        const inventoryLevel = item.inventory_level as any;
        const quantities = inventoryLevel?.[0]?.node?.quantities || [];
        const isTracked = quantities.length > 0 && inventoryLevel?.[0]?.node?.id != null;

        const available = Math.max(0, quantities.find((q: any) => q.name === "available")?.quantity || 0);
        const committed = Math.max(0, quantities.find((q: any) => q.name === "committed")?.quantity || 0);
        const currentStock = available + committed;
        const backorders = Math.max(0, item.back_orders || 0);

        // Parse image
        let imageUrl: string | null = null;
        try {
          const imgObj = JSON.parse(item.product_image || "{}");
          imageUrl = imgObj.url || item.product_image;
        } catch {
          imageUrl = item.product_image || null;
        }

        // Get sales data
        const sku = item.sku || "";
        const salesKey = sku || `${item.product_id}_${item.variant_id}`;
        const sales = salesMap.get(salesKey) || salesMap.get(sku.toUpperCase()) || {
          quantity_sold_7d: 0,
          quantity_sold_30d: 0,
          quantity_sold_90d: 0,
          total_revenue_30d: 0,
          order_count_30d: 0,
        };

        // Calculate metrics
        const dailySalesRate = calculateDailySalesRate(
          sales.quantity_sold_7d,
          sales.quantity_sold_30d,
          sales.quantity_sold_90d
        );
        const weeklyRate = dailySalesRate * 7;
        const monthlyRate = dailySalesRate * 30;
        const velocityTrend = calculateVelocityTrend(
          sales.quantity_sold_7d,
          sales.quantity_sold_30d,
          sales.quantity_sold_90d
        );
        const daysOfInventory = calculateDaysOfInventory(available, dailySalesRate);
        const urgency = determineUrgency(daysOfInventory, currentStock, dailySalesRate);
        const reorderPoint = calculateReorderPoint(dailySalesRate);
        const safetyStock = calculateSafetyStock(dailySalesRate);
        const recommendedQty = calculateRecommendedQty(currentStock, dailySalesRate, backorders);
        const reason = generateRecommendationReason(urgency, daysOfInventory, currentStock, dailySalesRate, backorders);

        return {
          id: item.id || `${item.product_id}_${item.variant_id}`,
          product_id: item.product_id || "",
          variant_id: item.variant_id || "",
          sku: sku || "NO SKU",
          product_name: item.product_name || "Unknown Product",
          variant_name: item.variant_name || "",
          image_url: imageUrl,
          current_stock: Math.max(0, currentStock), // Never negative
          committed: Math.max(0, committed),
          available: Math.max(0, available),
          backorders: Math.max(0, backorders),
          is_tracked: isTracked,
          updated_at: item.updated_at || item.created_at || "",
          // Calculated fields
          daily_sales_rate: parseFloat(dailySalesRate.toFixed(2)),
          weekly_sales_rate: parseFloat(weeklyRate.toFixed(2)),
          monthly_sales_rate: parseFloat(monthlyRate.toFixed(2)),
          days_of_inventory: daysOfInventory,
          velocity_trend: velocityTrend,
          urgency,
          reorder_point: reorderPoint,
          safety_stock: safetyStock,
          recommended_qty: recommendedQty,
          recommendation_reason: reason,
          sold_7d: sales.quantity_sold_7d,
          sold_30d: sales.quantity_sold_30d,
          sold_90d: sales.quantity_sold_90d,
          revenue_30d: sales.total_revenue_30d,
        };
      });

      // Sort by urgency by default
      transformedData.sort((a, b) => {
        const urgencyOrder = { critical: 0, warning: 1, safe: 2, overstocked: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });

      setInventoryData(transformedData);
      setLastUpdated(new Date());
      setAnalysisMetadata({
        totalSkus: transformedData.length,
        analyzedOrders: ordersData?.length || 0,
        dateRange: `${date90dAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`,
      });

      console.log(`[Restock] Processed ${transformedData.length} items`);

    } catch (error) {
      console.error("[Restock] Error in fetchInventoryAndSales:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeUrl, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchInventoryAndSales();
  }, [fetchInventoryAndSales]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchInventoryAndSales();
  };

  // =============================================================================
  // FILTERING & SORTING
  // =============================================================================

  const filteredByTab = useMemo(() => {
    switch (activeTab) {
      case "critical":
        return inventoryData.filter((item) => item.urgency === "critical");
      case "warning":
        return inventoryData.filter((item) => item.urgency === "warning");
      case "safe":
        return inventoryData.filter((item) => item.urgency === "safe");
      case "overstocked":
        return inventoryData.filter((item) => item.urgency === "overstocked");
      default:
        return inventoryData;
    }
  }, [inventoryData, activeTab]);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab;
    const query = searchQuery.toLowerCase();
    return filteredByTab.filter(
      (item) =>
        item.product_name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.variant_name.toLowerCase().includes(query)
    );
  }, [filteredByTab, searchQuery]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredBySearch].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "product_name":
          comparison = a.product_name.localeCompare(b.product_name);
          break;
        case "current_stock":
          comparison = a.current_stock - b.current_stock;
          break;
        case "daily_sales_rate":
          comparison = a.daily_sales_rate - b.daily_sales_rate;
          break;
        case "days_of_inventory":
          comparison = a.days_of_inventory - b.days_of_inventory;
          break;
        case "recommended_qty":
          comparison = a.recommended_qty - b.recommended_qty;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredBySearch, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: inventoryData.length,
    critical: inventoryData.filter((item) => item.urgency === "critical").length,
    warning: inventoryData.filter((item) => item.urgency === "warning").length,
    safe: inventoryData.filter((item) => item.urgency === "safe").length,
    overstocked: inventoryData.filter((item) => item.urgency === "overstocked").length,
  }), [inventoryData]);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // =============================================================================
  // EXPORT
  // =============================================================================

  const handleExport = () => {
    const csvContent = [
      [
        "SKU",
        "Product Name",
        "Variant",
        "Current Stock",
        "Available",
        "Committed",
        "Backorders",
        "Daily Sales Rate",
        "Days of Inventory",
        "Status",
        "Sold (7d)",
        "Sold (30d)",
        "Sold (90d)",
        "Revenue (30d)",
        "Reorder Point",
        "Safety Stock",
        "Recommended Qty",
        "Recommendation",
        "Last Updated",
      ],
      ...sortedData.map((item) => [
        item.sku,
        item.product_name,
        item.variant_name,
        item.current_stock,
        item.available,
        item.committed,
        item.backorders,
        item.daily_sales_rate.toFixed(2),
        item.days_of_inventory === 999 ? "∞" : item.days_of_inventory,
        item.urgency.toUpperCase(),
        item.sold_7d,
        item.sold_30d,
        item.sold_90d,
        item.revenue_30d.toFixed(2),
        item.reorder_point,
        item.safety_stock,
        item.recommended_qty,
        item.recommendation_reason,
        item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "-",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `restock-report-${selectedStore?.store_name || "store"}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // =============================================================================
  // UI HELPERS
  // =============================================================================

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <HiOutlineChevronUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <HiOutlineChevronUp className="w-4 h-4 text-[#8e52f2]" />
    ) : (
      <HiOutlineChevronDown className="w-4 h-4 text-[#8e52f2]" />
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const styles: Record<string, string> = {
      critical: "bg-red-100 text-red-700 border-red-300",
      warning: "bg-amber-100 text-amber-700 border-amber-300",
      safe: "bg-emerald-100 text-emerald-700 border-emerald-300",
      overstocked: "bg-blue-100 text-blue-700 border-blue-300",
    };
    const labels: Record<string, string> = {
      critical: "Critical",
      warning: "Warning",
      safe: "Healthy",
      overstocked: "Overstocked",
    };
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[urgency] || styles.safe}`}>
        {labels[urgency] || "Unknown"}
      </span>
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <span className="text-emerald-500">↑</span>;
      case "decreasing":
        return <span className="text-red-500">↓</span>;
      default:
        return <span className="text-gray-400">→</span>;
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <main className="flex flex-col h-full max-h-full w-full gap-6 border-l-none md:border-l-2 border-t-2 border-[#F4F4F7] rounded-tl-0 md:rounded-tl-[24px] bg-[#FAFAFA] p-4 md:p-8 overflow-auto custom-scrollbar">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl">
            <div className="w-12 h-12 border-4 border-[#8e52f2] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 font-medium">Analyzing inventory...</p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #5B21B6 0%, #8e52f2 100%)" }}
          >
            <HiOutlineChartBar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Restock Analysis</h1>
            <p className="text-sm text-gray-500">
              {analysisMetadata.totalSkus} SKUs analyzed • {analysisMetadata.analyzedOrders} orders in 90 days
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost flex items-center gap-2 border border-gray-200"
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="btn btn-primary flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #5B21B6 0%, #8e52f2 100%)" }}
          >
            <HiOutlineArrowDownTray className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{tabCounts.critical}</p>
              <p className="text-xs text-gray-500">Critical Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <HiOutlineClock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{tabCounts.warning}</p>
              <p className="text-xs text-gray-500">Warning Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{tabCounts.safe}</p>
              <p className="text-xs text-gray-500">Healthy Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <HiOutlineCube className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{tabCounts.overstocked}</p>
              <p className="text-xs text-gray-500">Overstocked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8e52f2]/20 focus:border-[#8e52f2]"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-[#8e52f2] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("all")}
          >
            All ({tabCounts.all})
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "critical"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("critical")}
          >
            Critical ({tabCounts.critical})
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "warning"
                ? "bg-amber-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("warning")}
          >
            Warning ({tabCounts.warning})
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "safe"
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("safe")}
          >
            Healthy ({tabCounts.safe})
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "overstocked"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab("overstocked")}
          >
            Overstocked ({tabCounts.overstocked})
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase" style={{ width: "60px" }}>
                  Image
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort("product_name")}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                  >
                    Product & SKU
                    {getSortIcon("product_name")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                  <button
                    onClick={() => handleSort("current_stock")}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                  >
                    Stock
                    {getSortIcon("current_stock")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                  <button
                    onClick={() => handleSort("daily_sales_rate")}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                  >
                    Daily Sales
                    {getSortIcon("daily_sales_rate")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center" style={{ width: "120px" }}>
                  Sales (7d/30d)
                </th>
                <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                  <button
                    onClick={() => handleSort("days_of_inventory")}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                  >
                    Days Left
                    {getSortIcon("days_of_inventory")}
                  </button>
                </th>
                <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                  Status
                </th>
                <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                  <button
                    onClick={() => handleSort("recommended_qty")}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                  >
                    Reorder Qty
                    {getSortIcon("recommended_qty")}
                  </button>
                </th>
                <th className="px-4 py-3 text-left" style={{ width: "250px" }}>
                  Recommendation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Image */}
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.product_name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <HiOutlineCube className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Product Name & SKU */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 line-clamp-1">
                          {item.product_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          SKU: {item.sku}
                          {item.variant_name && ` • ${item.variant_name}`}
                        </span>
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-gray-900">{item.current_stock}</span>
                        {item.backorders > 0 && (
                          <span className="text-xs text-red-500">-{item.backorders} backorders</span>
                        )}
                      </div>
                    </td>

                    {/* Daily Sales Rate */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-medium text-gray-900">
                          {item.daily_sales_rate.toFixed(1)}
                        </span>
                        {getTrendIcon(item.velocity_trend)}
                      </div>
                    </td>

                    {/* Sales 7d/30d */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-600">
                        {item.sold_7d} / {item.sold_30d}
                      </span>
                    </td>

                    {/* Days of Inventory */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-semibold ${
                          item.days_of_inventory <= CONFIG.CRITICAL_DAYS
                            ? "text-red-600"
                            : item.days_of_inventory <= CONFIG.WARNING_DAYS
                            ? "text-amber-600"
                            : "text-gray-900"
                        }`}
                      >
                        {item.days_of_inventory === 999 ? "∞" : item.days_of_inventory}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {getUrgencyBadge(item.urgency)}
                    </td>

                    {/* Recommended Qty */}
                    <td className="px-4 py-3 text-center">
                      {item.recommended_qty > 0 ? (
                        <span className="inline-flex items-center justify-center w-12 h-8 bg-[#8e52f2]/10 text-[#8e52f2] font-semibold rounded-lg">
                          +{item.recommended_qty}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Recommendation */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {item.recommendation_reason}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <HiOutlineCube className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium mb-1">No inventory items found</p>
                      <p className="text-sm text-gray-500">
                        {searchQuery
                          ? "Try adjusting your search or filters"
                          : "Select a store to view inventory"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sortedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            {/* Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8e52f2]/20"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-500">per page</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sortedData.length)} of{" "}
              {sortedData.length} items
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiOutlineChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
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
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#8e52f2] text-white"
                          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiOutlineChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer with explanation */}
      <div className="bg-white rounded-xl p-5 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">How Restock Analysis Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
            <div>
              <p className="font-medium text-gray-700">Critical</p>
              <p className="text-gray-500">≤7 days of stock remaining</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
            <div>
              <p className="font-medium text-gray-700">Warning</p>
              <p className="text-gray-500">8-14 days of stock remaining</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
            <div>
              <p className="font-medium text-gray-700">Healthy</p>
              <p className="text-gray-500">15-90 days of stock remaining</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
            <div>
              <p className="font-medium text-gray-700">Overstocked</p>
              <p className="text-gray-500">&gt;90 days of stock remaining</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Calculations use weighted average of 7-day (50%), 30-day (35%), and 90-day (15%) sales data.
          Recommended quantities include {CONFIG.LEAD_TIME_DAYS}-day lead time and {CONFIG.SAFETY_STOCK_DAYS}-day safety stock buffer.
        </p>
      </div>
    </main>
  );
}
