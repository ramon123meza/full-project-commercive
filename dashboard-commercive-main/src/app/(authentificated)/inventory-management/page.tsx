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

type InventoryItem = {
  image: string | null;
  sku: string;
  name: string;
  stockMeter: number | string | null;
  stockStatus: string;
  backorders: number;
  lastUpdated: string;
  variantName: string;
};

interface RestockItem {
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
  sold_7d: number;
  sold_30d: number;
  sold_90d: number;
  revenue_30d: number;
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

type InventorySortField = "name" | "stockMeter" | "backorders" | "lastUpdated";
type RestockSortField = "product_name" | "current_stock" | "daily_sales_rate" | "days_of_inventory" | "recommended_qty";
type SortDirection = "asc" | "desc";
type InventoryFilterTab = "all" | "inStock" | "lowStock" | "outOfStock";
type RestockFilterTab = "all" | "critical" | "warning" | "safe" | "overstocked";
type ViewTab = "inventory" | "restock";

// =============================================================================
// RESTOCK CONFIGURATION
// =============================================================================

const CONFIG = {
  LEAD_TIME_DAYS: 14,
  SAFETY_STOCK_DAYS: 7,
  CRITICAL_DAYS: 7,
  WARNING_DAYS: 14,
  OVERSTOCK_DAYS: 90,
  MIN_VELOCITY_FOR_CALC: 0.01,
};

// =============================================================================
// RESTOCK CALCULATION FUNCTIONS
// =============================================================================

function calculateDailySalesRate(sold7d: number, sold30d: number, sold90d: number): number {
  const rate7d = sold7d / 7;
  const rate30d = sold30d / 30;
  const rate90d = sold90d / 90;

  if (sold7d > 0) {
    return (rate7d * 0.5) + (rate30d * 0.35) + (rate90d * 0.15);
  } else if (sold30d > 0) {
    return (rate30d * 0.7) + (rate90d * 0.3);
  }
  return rate90d;
}

function calculateVelocityTrend(sold7d: number, sold30d: number, sold90d: number): "increasing" | "stable" | "decreasing" {
  const rate7d = sold7d / 7;
  const rate30d = sold30d / 30;

  if (rate30d === 0) return "stable";

  const ratio = rate7d / rate30d;

  if (ratio > 1.2) return "increasing";
  if (ratio < 0.8) return "decreasing";
  return "stable";
}

function calculateDaysOfInventory(availableStock: number, dailySalesRate: number): number {
  if (availableStock <= 0) return 0;
  if (dailySalesRate < CONFIG.MIN_VELOCITY_FOR_CALC) return 999;
  return Math.max(0, Math.floor(availableStock / dailySalesRate));
}

function calculateSafetyStock(dailySalesRate: number, leadTimeDays: number = CONFIG.LEAD_TIME_DAYS): number {
  return Math.ceil(dailySalesRate * CONFIG.SAFETY_STOCK_DAYS);
}

function calculateReorderPoint(dailySalesRate: number, leadTimeDays: number = CONFIG.LEAD_TIME_DAYS): number {
  const leadTimeDemand = dailySalesRate * leadTimeDays;
  const safetyStock = calculateSafetyStock(dailySalesRate, leadTimeDays);
  return Math.ceil(leadTimeDemand + safetyStock);
}

function calculateRecommendedQty(
  currentStock: number,
  dailySalesRate: number,
  backorders: number,
  leadTimeDays: number = CONFIG.LEAD_TIME_DAYS
): number {
  if (dailySalesRate < CONFIG.MIN_VELOCITY_FOR_CALC) return 0;

  const leadTimeDemand = Math.ceil(dailySalesRate * leadTimeDays);
  const safetyStock = calculateSafetyStock(dailySalesRate, leadTimeDays);
  const targetInventory = leadTimeDemand + safetyStock + Math.ceil(dailySalesRate * 7);

  const availableStock = Math.max(0, currentStock - backorders);
  const neededQty = Math.max(0, targetInventory - availableStock);

  return neededQty > 0 ? Math.max(1, Math.ceil(neededQty)) : 0;
}

function determineUrgency(daysOfInventory: number, currentStock: number, dailySalesRate: number): "critical" | "warning" | "safe" | "overstocked" {
  if (currentStock <= 0) return "critical";
  if (dailySalesRate < CONFIG.MIN_VELOCITY_FOR_CALC) return "safe";

  if (daysOfInventory <= CONFIG.CRITICAL_DAYS) return "critical";
  if (daysOfInventory <= CONFIG.WARNING_DAYS) return "warning";
  if (daysOfInventory >= CONFIG.OVERSTOCK_DAYS) return "overstocked";
  return "safe";
}

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

export default function InventoryManagementPage() {
  const supabase = createClient();
  const { selectedStore } = useStoreContext();
  const storeUrl = selectedStore ? selectedStore.store_url : null;

  // View state
  const [activeView, setActiveView] = useState<ViewTab>("inventory");

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Inventory data
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [inventoryActiveTab, setInventoryActiveTab] = useState<InventoryFilterTab>("all");
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
  const [inventoryItemsPerPage, setInventoryItemsPerPage] = useState(10);
  const [inventorySortField, setInventorySortField] = useState<InventorySortField>("name");
  const [inventorySortDirection, setInventorySortDirection] = useState<SortDirection>("asc");

  // Restock data
  const [restockData, setRestockData] = useState<RestockItem[]>([]);
  const [restockSearchQuery, setRestockSearchQuery] = useState("");
  const [restockActiveTab, setRestockActiveTab] = useState<RestockFilterTab>("all");
  const [restockCurrentPage, setRestockCurrentPage] = useState(1);
  const [restockItemsPerPage, setRestockItemsPerPage] = useState(25);
  const [restockSortField, setRestockSortField] = useState<RestockSortField>("days_of_inventory");
  const [restockSortDirection, setRestockSortDirection] = useState<SortDirection>("asc");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [analysisMetadata, setAnalysisMetadata] = useState({
    totalSkus: 0,
    analyzedOrders: 0,
    dateRange: "",
  });

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchInventoryData = async () => {
    if (!storeUrl) return;

    setLoading(true);
    try {
      const { data: fetchedData, error: inventoryError } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_url", storeUrl);

      if (inventoryError) {
        console.error("Error fetching inventory data:", inventoryError);
      } else {
        const transformedData: InventoryItem[] = fetchedData.map((item) => {
          const inventory_level = item.inventory_level as any;
          const inventoryQuantities =
            inventory_level?.[0]?.node?.quantities || [];

          const isTracked =
            inventoryQuantities.length > 0 &&
            inventory_level?.[0]?.node?.id != null;

          const available =
            inventoryQuantities.find((q: any) => q.name === "available")
              ?.quantity || 0;
          const committed =
            inventoryQuantities.find((q: any) => q.name === "committed")
              ?.quantity || 0;

          const backOrders = item.back_orders || 0;

          let stockStatus = "Enough Stock";
          let stockMeter: number | string = available + committed;

          if (!isTracked) {
            stockStatus = "Not Tracked";
            stockMeter = "Not tracked";
          } else if (available === 0) {
            stockStatus = "No Stock";
          } else if (available < 50) {
            stockStatus = "Low Stock";
          }

          let urlObj: any = {};
          try {
            urlObj = JSON.parse(item.product_image || "{}");
          } catch (e) {
            urlObj = {};
          }

          return {
            image: urlObj.url || item?.product_image,
            sku: item.sku || "NOSKU",
            name: item.product_name || "",
            variantName: item.variant_name || "",
            stockMeter,
            stockStatus,
            backorders: backOrders,
            lastUpdated: item.updated_at || item.created_at || "",
          };
        });

        setInventoryData(transformedData);
      }
    } catch (error) {
      console.error("Error in fetchInventoryData:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestockData = useCallback(async () => {
    if (!storeUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const date7dAgo = new Date(now);
      date7dAgo.setDate(date7dAgo.getDate() - 7);
      const date30dAgo = new Date(now);
      date30dAgo.setDate(date30dAgo.getDate() - 30);
      const date90dAgo = new Date(now);
      date90dAgo.setDate(date90dAgo.getDate() - 90);

      const { data: rawInventory, error: invError } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_url", storeUrl);

      if (invError) {
        console.error("Error fetching inventory:", invError);
        throw invError;
      }

      const { data: ordersData, error: ordersError } = await supabase
        .from("order")
        .select("line_items, created_at, financial_status")
        .eq("store_url", storeUrl)
        .gte("created_at", date90dAgo.toISOString())
        .eq("financial_status", "paid");

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
      }

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

      const transformedData: RestockItem[] = (rawInventory || []).map((item) => {
        const inventoryLevel = item.inventory_level as any;
        const quantities = inventoryLevel?.[0]?.node?.quantities || [];
        const isTracked = quantities.length > 0 && inventoryLevel?.[0]?.node?.id != null;

        const available = Math.max(0, quantities.find((q: any) => q.name === "available")?.quantity || 0);
        const committed = Math.max(0, quantities.find((q: any) => q.name === "committed")?.quantity || 0);
        const currentStock = available + committed;
        const backorders = Math.max(0, item.back_orders || 0);

        let imageUrl: string | null = null;
        try {
          const imgObj = JSON.parse(item.product_image || "{}");
          imageUrl = imgObj.url || item.product_image;
        } catch {
          imageUrl = item.product_image || null;
        }

        const sku = item.sku || "";
        const salesKey = sku || `${item.product_id}_${item.variant_id}`;
        const sales = salesMap.get(salesKey) || salesMap.get(sku.toUpperCase()) || {
          quantity_sold_7d: 0,
          quantity_sold_30d: 0,
          quantity_sold_90d: 0,
          total_revenue_30d: 0,
          order_count_30d: 0,
        };

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
          current_stock: Math.max(0, currentStock),
          committed: Math.max(0, committed),
          available: Math.max(0, available),
          backorders: Math.max(0, backorders),
          is_tracked: isTracked,
          updated_at: item.updated_at || item.created_at || "",
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

      transformedData.sort((a, b) => {
        const urgencyOrder = { critical: 0, warning: 1, safe: 2, overstocked: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });

      setRestockData(transformedData);
      setLastUpdated(new Date());
      setAnalysisMetadata({
        totalSkus: transformedData.length,
        analyzedOrders: ordersData?.length || 0,
        dateRange: `${date90dAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`,
      });

    } catch (error) {
      console.error("Error in fetchRestockData:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeUrl, supabase]);

  useEffect(() => {
    if (activeView === "inventory") {
      fetchInventoryData();
    } else {
      fetchRestockData();
    }
  }, [selectedStore, activeView]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeView === "inventory") {
      fetchInventoryData();
    } else {
      fetchRestockData();
    }
  };

  // =============================================================================
  // INVENTORY FILTERING & SORTING
  // =============================================================================

  const inventoryFilteredByTab = useMemo(() => {
    switch (inventoryActiveTab) {
      case "inStock":
        return inventoryData.filter((item) => item.stockStatus === "Enough Stock");
      case "lowStock":
        return inventoryData.filter((item) => item.stockStatus === "Low Stock");
      case "outOfStock":
        return inventoryData.filter((item) => item.stockStatus === "No Stock");
      default:
        return inventoryData;
    }
  }, [inventoryData, inventoryActiveTab]);

  const inventoryFilteredBySearch = useMemo(() => {
    if (!inventorySearchQuery.trim()) return inventoryFilteredByTab;
    const query = inventorySearchQuery.toLowerCase();
    return inventoryFilteredByTab.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.variantName.toLowerCase().includes(query)
    );
  }, [inventoryFilteredByTab, inventorySearchQuery]);

  const inventorySortedData = useMemo(() => {
    const sorted = [...inventoryFilteredBySearch].sort((a, b) => {
      let comparison = 0;

      switch (inventorySortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "stockMeter":
          const aStock = typeof a.stockMeter === "number" ? a.stockMeter : -1;
          const bStock = typeof b.stockMeter === "number" ? b.stockMeter : -1;
          comparison = aStock - bStock;
          break;
        case "backorders":
          comparison = a.backorders - b.backorders;
          break;
        case "lastUpdated":
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
      }

      return inventorySortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [inventoryFilteredBySearch, inventorySortField, inventorySortDirection]);

  const inventoryTotalPages = Math.ceil(inventorySortedData.length / inventoryItemsPerPage);
  const inventoryPaginatedData = useMemo(() => {
    const start = (inventoryCurrentPage - 1) * inventoryItemsPerPage;
    return inventorySortedData.slice(start, start + inventoryItemsPerPage);
  }, [inventorySortedData, inventoryCurrentPage, inventoryItemsPerPage]);

  const inventoryTabCounts = useMemo(() => ({
    all: inventoryData.length,
    inStock: inventoryData.filter((item) => item.stockStatus === "Enough Stock").length,
    lowStock: inventoryData.filter((item) => item.stockStatus === "Low Stock").length,
    outOfStock: inventoryData.filter((item) => item.stockStatus === "No Stock").length,
  }), [inventoryData]);

  // =============================================================================
  // RESTOCK FILTERING & SORTING
  // =============================================================================

  const restockFilteredByTab = useMemo(() => {
    switch (restockActiveTab) {
      case "critical":
        return restockData.filter((item) => item.urgency === "critical");
      case "warning":
        return restockData.filter((item) => item.urgency === "warning");
      case "safe":
        return restockData.filter((item) => item.urgency === "safe");
      case "overstocked":
        return restockData.filter((item) => item.urgency === "overstocked");
      default:
        return restockData;
    }
  }, [restockData, restockActiveTab]);

  const restockFilteredBySearch = useMemo(() => {
    if (!restockSearchQuery.trim()) return restockFilteredByTab;
    const query = restockSearchQuery.toLowerCase();
    return restockFilteredByTab.filter(
      (item) =>
        item.product_name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.variant_name.toLowerCase().includes(query)
    );
  }, [restockFilteredByTab, restockSearchQuery]);

  const restockSortedData = useMemo(() => {
    const sorted = [...restockFilteredBySearch].sort((a, b) => {
      let comparison = 0;

      switch (restockSortField) {
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

      return restockSortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [restockFilteredBySearch, restockSortField, restockSortDirection]);

  const restockTotalPages = Math.ceil(restockSortedData.length / restockItemsPerPage);
  const restockPaginatedData = useMemo(() => {
    const start = (restockCurrentPage - 1) * restockItemsPerPage;
    return restockSortedData.slice(start, start + restockItemsPerPage);
  }, [restockSortedData, restockCurrentPage, restockItemsPerPage]);

  const restockTabCounts = useMemo(() => ({
    all: restockData.length,
    critical: restockData.filter((item) => item.urgency === "critical").length,
    warning: restockData.filter((item) => item.urgency === "warning").length,
    safe: restockData.filter((item) => item.urgency === "safe").length,
    overstocked: restockData.filter((item) => item.urgency === "overstocked").length,
  }), [restockData]);

  // Reset page when filters change
  useEffect(() => {
    setInventoryCurrentPage(1);
  }, [inventoryActiveTab, inventorySearchQuery, inventoryItemsPerPage]);

  useEffect(() => {
    setRestockCurrentPage(1);
  }, [restockActiveTab, restockSearchQuery, restockItemsPerPage]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleInventorySort = (field: InventorySortField) => {
    if (inventorySortField === field) {
      setInventorySortDirection(inventorySortDirection === "asc" ? "desc" : "asc");
    } else {
      setInventorySortField(field);
      setInventorySortDirection("asc");
    }
  };

  const handleRestockSort = (field: RestockSortField) => {
    if (restockSortField === field) {
      setRestockSortDirection(restockSortDirection === "asc" ? "desc" : "asc");
    } else {
      setRestockSortField(field);
      setRestockSortDirection("asc");
    }
  };

  const getInventorySortIcon = (field: InventorySortField) => {
    if (inventorySortField !== field) {
      return <HiOutlineChevronUpDown className="w-4 h-4 text-slate" />;
    }
    return inventorySortDirection === "asc" ? (
      <HiOutlineChevronUp className="w-4 h-4 text-primary" />
    ) : (
      <HiOutlineChevronDown className="w-4 h-4 text-primary" />
    );
  };

  const getRestockSortIcon = (field: RestockSortField) => {
    if (restockSortField !== field) {
      return <HiOutlineChevronUpDown className="w-4 h-4 text-gray-400" />;
    }
    return restockSortDirection === "asc" ? (
      <HiOutlineChevronUp className="w-4 h-4 text-[#8e52f2]" />
    ) : (
      <HiOutlineChevronDown className="w-4 h-4 text-[#8e52f2]" />
    );
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "Enough Stock":
        return "badge-success";
      case "Low Stock":
        return "badge-warning";
      case "No Stock":
        return "badge-error";
      default:
        return "badge-neutral";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "Enough Stock":
        return "In Stock";
      case "Low Stock":
        return "Low Stock";
      case "No Stock":
        return "Out of Stock";
      default:
        return "Not Tracked";
    }
  };

  const getStockMeterClass = (status: string): string => {
    switch (status) {
      case "Enough Stock":
        return "high";
      case "Low Stock":
        return "medium";
      case "No Stock":
        return "low";
      default:
        return "";
    }
  };

  const getStockPercentage = (stockMeter: number | string | null): number => {
    if (stockMeter === null || typeof stockMeter === "string") return 0;
    return Math.min(100, Math.max(0, (stockMeter / 100) * 100));
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
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const handleExport = () => {
    if (activeView === "inventory") {
      const csvContent = [
        ["Product Name", "SKU", "Variant", "Available Stock", "Status", "Backorders", "Last Updated"],
        ...inventorySortedData.map((item) => [
          item.name,
          item.sku,
          item.variantName,
          typeof item.stockMeter === "number" ? item.stockMeter : "N/A",
          getStatusLabel(item.stockStatus),
          item.backorders,
          formatDate(item.lastUpdated),
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
    } else {
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
        ...restockSortedData.map((item) => [
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
            <p className="text-gray-600 font-medium">
              {activeView === "inventory" ? "Loading inventory..." : "Analyzing inventory..."}
            </p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <HiOutlineCube className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-h2 text-primary">Inventory Management</h1>
            <p className="text-small text-slate">
              {activeView === "inventory"
                ? `${inventoryData.length} products in stock`
                : `${analysisMetadata.totalSkus} SKUs analyzed • ${analysisMetadata.analyzedOrders} orders in 90 days`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeView === "restock" && lastUpdated && (
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost flex items-center gap-2"
          >
            <HiOutlineArrowPath className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="btn btn-secondary flex items-center gap-2"
          >
            <HiOutlineArrowDownTray className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveView("inventory")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap ${
            activeView === "inventory"
              ? "bg-white text-primary border-b-2 border-primary"
              : "text-slate hover:bg-gray-100"
          }`}
        >
          <HiOutlineCube className="w-5 h-5" />
          Inventory Overview
        </button>
        <button
          onClick={() => setActiveView("restock")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-all whitespace-nowrap ${
            activeView === "restock"
              ? "bg-white text-primary border-b-2 border-primary"
              : "text-slate hover:bg-gray-100"
          }`}
        >
          <HiOutlineChartBar className="w-5 h-5" />
          Restock Analysis
        </button>
      </div>

      {/* Inventory View */}
      {activeView === "inventory" && (
        <>
          {/* Summary Cards for Inventory */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <HiOutlineCube className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{inventoryTabCounts.all}</p>
                  <p className="text-xs text-gray-500">Total Products</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{inventoryTabCounts.inStock}</p>
                  <p className="text-xs text-gray-500">In Stock</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <HiOutlineClock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{inventoryTabCounts.lowStock}</p>
                  <p className="text-xs text-gray-500">Low Stock</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{inventoryTabCounts.outOfStock}</p>
                  <p className="text-xs text-gray-500">Out of Stock</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate" />
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={inventorySearchQuery}
                onChange={(e) => setInventorySearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>

            <div className="tabs overflow-x-auto">
              <button
                className={`tab ${inventoryActiveTab === "all" ? "active" : ""}`}
                onClick={() => setInventoryActiveTab("all")}
              >
                All ({inventoryTabCounts.all})
              </button>
              <button
                className={`tab ${inventoryActiveTab === "inStock" ? "active" : ""}`}
                onClick={() => setInventoryActiveTab("inStock")}
              >
                In Stock ({inventoryTabCounts.inStock})
              </button>
              <button
                className={`tab ${inventoryActiveTab === "lowStock" ? "active" : ""}`}
                onClick={() => setInventoryActiveTab("lowStock")}
              >
                Low Stock ({inventoryTabCounts.lowStock})
              </button>
              <button
                className={`tab ${inventoryActiveTab === "outOfStock" ? "active" : ""}`}
                onClick={() => setInventoryActiveTab("outOfStock")}
              >
                Out of Stock ({inventoryTabCounts.outOfStock})
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="table-container flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "70px" }}>Image</th>
                    <th>
                      <button
                        onClick={() => handleInventorySort("name")}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Product Name & SKU
                        {getInventorySortIcon("name")}
                      </button>
                    </th>
                    <th style={{ width: "200px" }}>
                      <button
                        onClick={() => handleInventorySort("stockMeter")}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Available Stock
                        {getInventorySortIcon("stockMeter")}
                      </button>
                    </th>
                    <th style={{ width: "130px" }}>Status</th>
                    <th style={{ width: "100px" }}>
                      <button
                        onClick={() => handleInventorySort("backorders")}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Backorders
                        {getInventorySortIcon("backorders")}
                      </button>
                    </th>
                    <th style={{ width: "120px" }}>
                      <button
                        onClick={() => handleInventorySort("lastUpdated")}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Last Updated
                        {getInventorySortIcon("lastUpdated")}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryPaginatedData.length > 0 ? (
                    inventoryPaginatedData.map((item, index) => (
                      <tr key={`${item.sku}-${index}`}>
                        <td>
                          <div
                            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                            style={{ background: "var(--neutral-gray)" }}
                          >
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <HiOutlineCube className="w-6 h-6 text-slate" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-medium text-primary line-clamp-2">
                              {item.name}
                            </span>
                            <span className="text-tiny text-slate">
                              SKU: {item.sku}
                              {item.variantName && ` | ${item.variantName}`}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="stock-meter">
                            <span className="text-small font-medium text-primary min-w-[40px]">
                              {typeof item.stockMeter === "number"
                                ? item.stockMeter
                                : "N/A"}
                            </span>
                            <div className="stock-meter-bar flex-1">
                              <div
                                className={`stock-meter-fill ${getStockMeterClass(item.stockStatus)}`}
                                style={{ width: `${getStockPercentage(item.stockMeter)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(item.stockStatus)}`}>
                            {getStatusLabel(item.stockStatus)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`font-medium ${
                              item.backorders > 0 ? "text-error" : "text-slate"
                            }`}
                          >
                            {item.backorders}
                          </span>
                        </td>
                        <td>
                          <span className="text-small text-slate">
                            {formatDate(item.lastUpdated)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state py-12">
                          <div className="empty-state-icon">
                            <HiOutlineCube className="w-10 h-10" />
                          </div>
                          <p className="empty-state-title">No inventory items found</p>
                          <p className="empty-state-description">
                            {inventorySearchQuery
                              ? "Try adjusting your search or filters"
                              : "Start by adding products to your inventory"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {inventorySortedData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-small text-slate">Show</span>
                  <select
                    value={inventoryItemsPerPage}
                    onChange={(e) => setInventoryItemsPerPage(Number(e.target.value))}
                    className="input py-1 px-2 w-auto text-small"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-small text-slate">per page</span>
                </div>

                <div className="text-small text-slate">
                  Showing {((inventoryCurrentPage - 1) * inventoryItemsPerPage) + 1} to{" "}
                  {Math.min(inventoryCurrentPage * inventoryItemsPerPage, inventorySortedData.length)} of{" "}
                  {inventorySortedData.length} items
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInventoryCurrentPage(1)}
                    disabled={inventoryCurrentPage === 1}
                    className="btn btn-ghost btn-sm disabled:opacity-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setInventoryCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={inventoryCurrentPage === 1}
                    className="btn btn-ghost btn-sm disabled:opacity-50"
                  >
                    <HiOutlineChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, inventoryTotalPages) }, (_, i) => {
                      let pageNum: number;
                      if (inventoryTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (inventoryCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (inventoryCurrentPage >= inventoryTotalPages - 2) {
                        pageNum = inventoryTotalPages - 4 + i;
                      } else {
                        pageNum = inventoryCurrentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setInventoryCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-small font-medium transition-colors ${
                            inventoryCurrentPage === pageNum
                              ? "bg-primary text-white"
                              : "hover:bg-sky text-slate"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setInventoryCurrentPage((prev) => Math.min(inventoryTotalPages, prev + 1))}
                    disabled={inventoryCurrentPage === inventoryTotalPages}
                    className="btn btn-ghost btn-sm disabled:opacity-50"
                  >
                    <HiOutlineChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setInventoryCurrentPage(inventoryTotalPages)}
                    disabled={inventoryCurrentPage === inventoryTotalPages}
                    className="btn btn-ghost btn-sm disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Restock View */}
      {activeView === "restock" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <HiOutlineExclamationTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{restockTabCounts.critical}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{restockTabCounts.warning}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{restockTabCounts.safe}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{restockTabCounts.overstocked}</p>
                  <p className="text-xs text-gray-500">Overstocked</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={restockSearchQuery}
                onChange={(e) => setRestockSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8e52f2]/20 focus:border-[#8e52f2]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  restockActiveTab === "all"
                    ? "bg-[#8e52f2] text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setRestockActiveTab("all")}
              >
                All ({restockTabCounts.all})
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  restockActiveTab === "critical"
                    ? "bg-red-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setRestockActiveTab("critical")}
              >
                Critical ({restockTabCounts.critical})
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  restockActiveTab === "warning"
                    ? "bg-amber-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setRestockActiveTab("warning")}
              >
                Warning ({restockTabCounts.warning})
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  restockActiveTab === "safe"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setRestockActiveTab("safe")}
              >
                Healthy ({restockTabCounts.safe})
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  restockActiveTab === "overstocked"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setRestockActiveTab("overstocked")}
              >
                Overstocked ({restockTabCounts.overstocked})
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
                        onClick={() => handleRestockSort("product_name")}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                      >
                        Product & SKU
                        {getRestockSortIcon("product_name")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                      <button
                        onClick={() => handleRestockSort("current_stock")}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                      >
                        Stock
                        {getRestockSortIcon("current_stock")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                      <button
                        onClick={() => handleRestockSort("daily_sales_rate")}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                      >
                        Daily Sales
                        {getRestockSortIcon("daily_sales_rate")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center" style={{ width: "120px" }}>
                      Sales (7d/30d)
                    </th>
                    <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                      <button
                        onClick={() => handleRestockSort("days_of_inventory")}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                      >
                        Days Left
                        {getRestockSortIcon("days_of_inventory")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                      Status
                    </th>
                    <th className="px-4 py-3 text-center" style={{ width: "100px" }}>
                      <button
                        onClick={() => handleRestockSort("recommended_qty")}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-[#8e52f2] transition-colors"
                      >
                        Reorder Qty
                        {getRestockSortIcon("recommended_qty")}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left" style={{ width: "250px" }}>
                      Recommendation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {restockPaginatedData.length > 0 ? (
                    restockPaginatedData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
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
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-gray-900">{item.current_stock}</span>
                            {item.backorders > 0 && (
                              <span className="text-xs text-red-500">-{item.backorders} backorders</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-medium text-gray-900">
                              {item.daily_sales_rate.toFixed(1)}
                            </span>
                            {getTrendIcon(item.velocity_trend)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-600">
                            {item.sold_7d} / {item.sold_30d}
                          </span>
                        </td>
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
                        <td className="px-4 py-3 text-center">
                          {getUrgencyBadge(item.urgency)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.recommended_qty > 0 ? (
                            <span className="inline-flex items-center justify-center w-12 h-8 bg-[#8e52f2]/10 text-[#8e52f2] font-semibold rounded-lg">
                              +{item.recommended_qty}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
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
                            {restockSearchQuery
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
            {restockSortedData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Show</span>
                  <select
                    value={restockItemsPerPage}
                    onChange={(e) => setRestockItemsPerPage(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8e52f2]/20"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-500">per page</span>
                </div>

                <div className="text-sm text-gray-500">
                  Showing {((restockCurrentPage - 1) * restockItemsPerPage) + 1} to{" "}
                  {Math.min(restockCurrentPage * restockItemsPerPage, restockSortedData.length)} of{" "}
                  {restockSortedData.length} items
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRestockCurrentPage(1)}
                    disabled={restockCurrentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setRestockCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={restockCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <HiOutlineChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, restockTotalPages) }, (_, i) => {
                      let pageNum: number;
                      if (restockTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (restockCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (restockCurrentPage >= restockTotalPages - 2) {
                        pageNum = restockTotalPages - 4 + i;
                      } else {
                        pageNum = restockCurrentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setRestockCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            restockCurrentPage === pageNum
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
                    onClick={() => setRestockCurrentPage((prev) => Math.min(restockTotalPages, prev + 1))}
                    disabled={restockCurrentPage === restockTotalPages}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <HiOutlineChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRestockCurrentPage(restockTotalPages)}
                    disabled={restockCurrentPage === restockTotalPages}
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
        </>
      )}
    </main>
  );
}
