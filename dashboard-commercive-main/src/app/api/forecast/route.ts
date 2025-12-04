import { NextResponse } from "next/server";
import { createServerSideClient } from "@/app/utils/supabase/server";

/**
 * Forecast API - Stock Replenishment Calculator
 *
 * Calculates inventory forecasts based on real sales velocity data:
 * 1. Fetches 30-day order history to calculate daily sales rate per SKU
 * 2. Projects days until stockout: current_stock / daily_sales_rate
 * 3. Calculates safety stock buffer (7 days)
 * 4. Suggests reorder quantity based on lead time (14 days default)
 *
 * Response Structure:
 * {
 *   forecasts: [{
 *     sku: string,
 *     product_name: string,
 *     current_stock: number,
 *     daily_sales_rate: number,
 *     days_until_stockout: number,
 *     urgency: 'critical' | 'warning' | 'safe',
 *     reorder_suggestion: {
 *       quantity: number,
 *       reason: string
 *     }
 *   }],
 *   metadata: {
 *     analyzed_orders: number,
 *     date_range: string
 *   }
 * }
 */

// Configuration constants
const ANALYSIS_PERIOD_DAYS = 30;
const SAFETY_STOCK_DAYS = 7;
const DEFAULT_LEAD_TIME_DAYS = 14;
const CRITICAL_THRESHOLD_DAYS = 7;
const WARNING_THRESHOLD_DAYS = 14;

interface InventoryInput {
  sku?: string;
  name?: string;
  color?: string;
  product_id?: string;
  stockMeter?: number | string | null;
  stockStatus?: string;
  backorders?: number;
}

interface SalesByIdentifier {
  [key: string]: number;
}

interface ForecastItem {
  sku: string;
  product_name: string;
  current_stock: number;
  daily_sales_rate: number;
  days_until_stockout: number;
  urgency: "critical" | "warning" | "safe";
  reorder_suggestion: {
    quantity: number;
    reason: string;
  };
}

interface ForecastResponse {
  forecasts: ForecastItem[];
  metadata: {
    analyzed_orders: number;
    date_range: string;
  };
}

function calculateUrgency(
  daysUntilStockout: number,
  currentStock: number
): "critical" | "warning" | "safe" {
  if (currentStock === 0 || daysUntilStockout <= CRITICAL_THRESHOLD_DAYS) {
    return "critical";
  }
  if (daysUntilStockout <= WARNING_THRESHOLD_DAYS) {
    return "warning";
  }
  return "safe";
}

function generateReorderReason(
  urgency: "critical" | "warning" | "safe",
  daysUntilStockout: number,
  currentStock: number,
  backorders: number
): string {
  if (currentStock === 0 && backorders > 0) {
    return `Out of stock with ${backorders} pending backorders - immediate reorder required`;
  }
  if (currentStock === 0) {
    return "Out of stock - immediate reorder required";
  }
  if (daysUntilStockout <= CRITICAL_THRESHOLD_DAYS) {
    return `Only ${Math.ceil(daysUntilStockout)} days of stock remaining - urgent reorder needed`;
  }
  if (urgency === "warning") {
    return `${Math.ceil(daysUntilStockout)} days of stock remaining - consider reordering soon`;
  }
  return "Stock levels are healthy";
}

function calculateReorderQuantity(
  dailySalesRate: number,
  currentStock: number,
  backorders: number,
  leadTimeDays: number = DEFAULT_LEAD_TIME_DAYS
): number {
  if (dailySalesRate === 0) {
    return 0;
  }

  // Formula: (Lead time demand + Safety stock) - (Current stock - Backorders)
  const leadTimeDemand = Math.ceil(dailySalesRate * leadTimeDays);
  const safetyStock = Math.ceil(dailySalesRate * SAFETY_STOCK_DAYS);
  const availableStock = Math.max(0, currentStock - backorders);
  const reorderQuantity = Math.max(
    0,
    leadTimeDemand + safetyStock - availableStock
  );

  return reorderQuantity;
}

function extractSku(item: InventoryInput): string {
  // Direct SKU field
  if (item.sku && item.sku !== "NO SKU" && item.sku !== "NOSKU") {
    return item.sku;
  }

  // Try to extract SKU from name field (format: "SKU123")
  if (item.name && item.name !== "NO SKU") {
    return item.name;
  }

  // Try to extract from color field if it contains bracketed SKU
  if (item.color) {
    const skuMatch = item.color.match(/\[(.*?)\]/);
    if (skuMatch && skuMatch[1]) {
      return skuMatch[1];
    }
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const { inventoryData, storeUrl } = await req.json();

    // Validation
    if (!inventoryData || !Array.isArray(inventoryData)) {
      return NextResponse.json(
        { error: "Invalid inventory data provided" },
        { status: 400 }
      );
    }

    if (!storeUrl) {
      return NextResponse.json(
        { error: "Store URL is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSideClient();

    // Calculate date range for analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - ANALYSIS_PERIOD_DAYS);

    // Fetch paid orders from the analysis period
    const { data: orders, error: ordersError } = await supabase
      .from("order")
      .select("line_items, created_at, financial_status")
      .eq("store_url", storeUrl)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .eq("financial_status", "paid");

    if (ordersError) {
      console.error("[Forecast API] Error fetching orders:", ordersError);
    }

    // Aggregate sales by SKU, product_id, and variant_id
    const salesBySku: SalesByIdentifier = {};
    const salesByProductId: SalesByIdentifier = {};
    const salesByVariantId: SalesByIdentifier = {};

    orders?.forEach((order) => {
      const lineItems = order.line_items as Array<{
        sku?: string;
        product_id?: string | number;
        variant_id?: string | number;
        quantity?: number;
      }>;

      lineItems?.forEach((item) => {
        const quantity = item.quantity || 0;

        // Track by SKU (most reliable identifier)
        if (item.sku) {
          const normalizedSku = item.sku.trim().toUpperCase();
          salesBySku[normalizedSku] = (salesBySku[normalizedSku] || 0) + quantity;
        }

        // Track by product_id as fallback
        if (item.product_id) {
          const productIdKey = String(item.product_id);
          salesByProductId[productIdKey] =
            (salesByProductId[productIdKey] || 0) + quantity;
        }

        // Track by variant_id as another fallback
        if (item.variant_id) {
          const variantIdKey = String(item.variant_id);
          salesByVariantId[variantIdKey] =
            (salesByVariantId[variantIdKey] || 0) + quantity;
        }
      });
    });

    const totalOrdersAnalyzed = orders?.length || 0;

    console.log(
      `[Forecast API] Analyzed ${totalOrdersAnalyzed} orders, found ${Object.keys(salesBySku).length} unique SKUs`
    );

    // Process each inventory item and generate forecast
    const forecasts: ForecastItem[] = inventoryData.map(
      (item: InventoryInput) => {
        // Parse current stock (handle various input formats)
        let currentStock = 0;
        if (typeof item.stockMeter === "number") {
          currentStock = item.stockMeter;
        } else if (
          typeof item.stockMeter === "string" &&
          !isNaN(parseInt(item.stockMeter))
        ) {
          currentStock = parseInt(item.stockMeter);
        }

        const backorders = item.backorders || 0;
        const sku = extractSku(item);
        const normalizedSku = sku.trim().toUpperCase();

        // Determine product name
        const productName =
          item.color ||
          item.name ||
          (sku ? `SKU: ${sku}` : "Unknown Product");

        // Get sales data - try multiple identifiers
        let totalSold30Days = 0;

        // Priority 1: Match by SKU
        if (normalizedSku && salesBySku[normalizedSku]) {
          totalSold30Days = salesBySku[normalizedSku];
        }
        // Priority 2: Match by product_id
        else if (item.product_id && salesByProductId[String(item.product_id)]) {
          totalSold30Days = salesByProductId[String(item.product_id)];
        }

        // Calculate daily sales rate
        const dailySalesRate = totalSold30Days / ANALYSIS_PERIOD_DAYS;

        // Calculate days until stockout
        let daysUntilStockout: number;
        if (currentStock <= 0) {
          daysUntilStockout = 0;
        } else if (dailySalesRate <= 0) {
          daysUntilStockout = Infinity;
        } else {
          const availableForSale = Math.max(0, currentStock - backorders);
          daysUntilStockout = availableForSale / dailySalesRate;
        }

        // Determine urgency level
        const urgency = calculateUrgency(daysUntilStockout, currentStock);

        // Calculate reorder quantity
        const reorderQuantity = calculateReorderQuantity(
          dailySalesRate,
          currentStock,
          backorders
        );

        // Generate reorder reason
        const reason = generateReorderReason(
          urgency,
          daysUntilStockout,
          currentStock,
          backorders
        );

        return {
          sku: sku || "N/A",
          product_name: productName,
          current_stock: currentStock,
          daily_sales_rate: parseFloat(dailySalesRate.toFixed(2)),
          days_until_stockout:
            daysUntilStockout === Infinity
              ? 999
              : Math.round(daysUntilStockout),
          urgency,
          reorder_suggestion: {
            quantity: reorderQuantity,
            reason,
          },
        };
      }
    );

    // Sort forecasts by urgency (critical first, then warning, then safe)
    const urgencyOrder = { critical: 0, warning: 1, safe: 2 };
    forecasts.sort((a, b) => {
      // First sort by urgency
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;

      // Then by days until stockout (ascending)
      return a.days_until_stockout - b.days_until_stockout;
    });

    const response: ForecastResponse = {
      forecasts,
      metadata: {
        analyzed_orders: totalOrdersAnalyzed,
        date_range: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Forecast API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate forecast",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
