"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Paper,
  Typography,
  Box,
  Tooltip,
  CircularProgress,
  Chip,
  IconButton,
} from "@mui/material";
import { TbRefresh } from "react-icons/tb";
import { IoWarningOutline } from "react-icons/io5";
import { MdOutlineInventory2, MdTrendingDown, MdTrendingUp } from "react-icons/md";
import { FiPackage, FiAlertTriangle, FiCheckCircle, FiClock } from "react-icons/fi";
import { InventoryItem } from "@/app/(authentificated)/home/page";

// Type definitions matching the API response
interface ReorderSuggestion {
  quantity: number;
  reason: string;
}

interface ForecastItem {
  sku: string;
  product_name: string;
  current_stock: number;
  daily_sales_rate: number;
  days_until_stockout: number;
  urgency: "critical" | "warning" | "safe";
  reorder_suggestion: ReorderSuggestion;
}

interface ForecastMetadata {
  analyzed_orders: number;
  date_range: string;
}

interface ForecastResponse {
  forecasts: ForecastItem[];
  metadata: ForecastMetadata;
}

type InventoryProps = {
  inventoryData: InventoryItem[];
  storeUrl?: string | null;
};

// Urgency configuration with colors matching the design system
const urgencyConfig = {
  critical: {
    label: "Critical",
    bgColor: "#FEE2E2",
    textColor: "#EF4444",
    borderColor: "#FECACA",
    icon: FiAlertTriangle,
  },
  warning: {
    label: "Warning",
    bgColor: "#FEF3C7",
    textColor: "#F59E0B",
    borderColor: "#FDE68A",
    icon: IoWarningOutline,
  },
  safe: {
    label: "Safe",
    bgColor: "#D1FAE5",
    textColor: "#10B981",
    borderColor: "#A7F3D0",
    icon: FiCheckCircle,
  },
};

// Stats card component
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 2,
        borderRadius: "12px",
        backgroundColor: "#F4F5F7",
        minWidth: "140px",
      }}
    >
      <Box
        sx={{
          p: 1,
          borderRadius: "8px",
          backgroundColor: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={20} color={color} />
      </Box>
      <Box>
        <Typography
          variant="body2"
          sx={{ color: "#4B5563", fontSize: "0.75rem" }}
        >
          {label}
        </Typography>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: "#1B1F3B", fontSize: "1.1rem" }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

// Forecast item row component
function ForecastRow({ item }: { item: ForecastItem }) {
  const config = urgencyConfig[item.urgency];
  const UrgencyIcon = config.icon;

  // Format days until stockout display
  const formatDaysUntilStockout = (days: number) => {
    if (days === 0) return "Out of Stock";
    if (days >= 999) return "No sales data";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: { xs: "stretch", md: "center" },
        gap: 2,
        p: 2,
        borderRadius: "12px",
        border: `1px solid ${config.borderColor}`,
        backgroundColor: config.bgColor,
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(27, 31, 59, 0.1)",
          transform: "translateY(-1px)",
        },
      }}
    >
      {/* Product info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Chip
            icon={<UrgencyIcon size={14} />}
            label={config.label}
            size="small"
            sx={{
              backgroundColor: "white",
              color: config.textColor,
              fontWeight: 600,
              fontSize: "0.7rem",
              height: "24px",
              "& .MuiChip-icon": {
                color: config.textColor,
              },
            }}
          />
          {item.sku !== "N/A" && (
            <Typography
              variant="caption"
              sx={{
                color: "#4B5563",
                backgroundColor: "rgba(255,255,255,0.8)",
                px: 1,
                py: 0.25,
                borderRadius: "4px",
                fontFamily: "monospace",
              }}
            >
              {item.sku}
            </Typography>
          )}
        </Box>
        <Tooltip title={item.product_name} placement="top">
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: "#1B1F3B",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: { xs: "100%", md: "300px" },
            }}
          >
            {item.product_name}
          </Typography>
        </Tooltip>
      </Box>

      {/* Metrics */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
        }}
      >
        {/* Current Stock */}
        <Box sx={{ textAlign: "center", minWidth: "80px" }}>
          <Typography variant="caption" sx={{ color: "#4B5563", display: "block" }}>
            In Stock
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: item.current_stock === 0 ? "#EF4444" : "#1B1F3B",
            }}
          >
            {item.current_stock.toLocaleString()}
          </Typography>
        </Box>

        {/* Daily Sales */}
        <Box sx={{ textAlign: "center", minWidth: "80px" }}>
          <Typography variant="caption" sx={{ color: "#4B5563", display: "block" }}>
            Daily Sales
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
            {item.daily_sales_rate > 0 ? (
              <MdTrendingUp color="#10B981" size={16} />
            ) : (
              <MdTrendingDown color="#9CA3AF" size={16} />
            )}
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1B1F3B" }}>
              {item.daily_sales_rate.toFixed(1)}
            </Typography>
          </Box>
        </Box>

        {/* Days Until Stockout */}
        <Box sx={{ textAlign: "center", minWidth: "100px" }}>
          <Typography variant="caption" sx={{ color: "#4B5563", display: "block" }}>
            Days to Stockout
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
            <FiClock size={14} color={config.textColor} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: config.textColor,
              }}
            >
              {formatDaysUntilStockout(item.days_until_stockout)}
            </Typography>
          </Box>
        </Box>

        {/* Reorder Suggestion */}
        {item.reorder_suggestion.quantity > 0 && (
          <Box
            sx={{
              backgroundColor: "white",
              borderRadius: "8px",
              p: 1.5,
              minWidth: "160px",
              border: `1px solid ${config.borderColor}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#4B5563", display: "block", mb: 0.5 }}
            >
              Recommended Reorder
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "#3A6EA5" }}
            >
              {item.reorder_suggestion.quantity.toLocaleString()} units
            </Typography>
            <Tooltip title={item.reorder_suggestion.reason} placement="bottom">
              <Typography
                variant="caption"
                sx={{
                  color: "#6B7280",
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "180px",
                  cursor: "help",
                }}
              >
                {item.reorder_suggestion.reason}
              </Typography>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// Empty state component
function EmptyState() {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 6,
        px: 3,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          margin: "0 auto 24px",
          backgroundColor: "#D7E8FF",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MdOutlineInventory2 size={36} color="#3A6EA5" />
      </Box>
      <Typography
        variant="h6"
        sx={{ fontWeight: 600, color: "#1B1F3B", mb: 1 }}
      >
        No Forecast Data Available
      </Typography>
      <Typography variant="body2" sx={{ color: "#4B5563" }}>
        Add inventory items to see stock forecasts and reorder recommendations.
      </Typography>
    </Box>
  );
}

// Loading state component
function LoadingState() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
        gap: 2,
      }}
    >
      <CircularProgress
        size={40}
        sx={{ color: "#3A6EA5" }}
      />
      <Typography variant="body2" sx={{ color: "#4B5563" }}>
        Analyzing sales data and generating forecasts...
      </Typography>
    </Box>
  );
}

// Main Forecast component
export default function Forecast({ inventoryData, storeUrl }: InventoryProps) {
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
  const [metadata, setMetadata] = useState<ForecastMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "critical" | "warning" | "safe">("all");

  const fetchForecast = useCallback(async () => {
    if (!storeUrl) {
      setError("No store URL provided");
      return;
    }

    if (!inventoryData?.length) {
      setError("No inventory data available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/forecast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventoryData: inventoryData.map((item) => ({
            ...item,
            sku: item.name,
            product_id: (item as any).product_id,
          })),
          storeUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ForecastResponse = await response.json();

      if (result.forecasts && Array.isArray(result.forecasts)) {
        setForecastData(result.forecasts);
        setMetadata(result.metadata);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching forecast:", err);
      setError(err instanceof Error ? err.message : "Failed to load forecast");
      setForecastData([]);
    } finally {
      setLoading(false);
    }
  }, [inventoryData, storeUrl]);

  useEffect(() => {
    if (inventoryData?.length && storeUrl) {
      fetchForecast();
    }
  }, [inventoryData, storeUrl, fetchForecast]);

  // Count items by urgency
  const urgencyCounts = forecastData.reduce(
    (acc, item) => {
      acc[item.urgency]++;
      acc.total++;
      return acc;
    },
    { critical: 0, warning: 0, safe: 0, total: 0 }
  );

  // Filter forecasts based on selected filter
  const filteredForecasts =
    selectedFilter === "all"
      ? forecastData
      : forecastData.filter((item) => item.urgency === selectedFilter);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 4,
        p: { xs: 2, sm: 3 },
        borderRadius: "16px",
        backgroundColor: "#FFFFFF",
        boxShadow:
          "0 4px 6px -1px rgba(27, 31, 59, 0.1), 0 2px 4px -2px rgba(27, 31, 59, 0.1)",
        border: "1px solid rgba(27, 31, 59, 0.05)",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          mb: 3,
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: "12px",
              background: "linear-gradient(135deg, #1B1F3B 0%, #3A6EA5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              src="/svgs/Forecast.svg"
              width={24}
              height={24}
              alt="forecast"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#1B1F3B",
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
              }}
            >
              Stock Forecast
            </Typography>
            {metadata && (
              <Typography variant="caption" sx={{ color: "#4B5563" }}>
                Based on {metadata.analyzed_orders} orders ({metadata.date_range})
              </Typography>
            )}
          </Box>
        </Box>

        <Tooltip title="Refresh forecast data">
          <IconButton
            onClick={fetchForecast}
            disabled={loading}
            sx={{
              backgroundColor: "#F4F5F7",
              "&:hover": {
                backgroundColor: "#E5E7EB",
              },
              "&:disabled": {
                backgroundColor: "#F4F5F7",
              },
            }}
          >
            <TbRefresh
              size={20}
              className={loading ? "animate-spin" : ""}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Overview */}
      {!loading && forecastData.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
          }}
        >
          <StatCard
            icon={FiPackage}
            label="Total Items"
            value={urgencyCounts.total}
            color="#3A6EA5"
          />
          <StatCard
            icon={FiAlertTriangle}
            label="Critical"
            value={urgencyCounts.critical}
            color="#EF4444"
          />
          <StatCard
            icon={IoWarningOutline}
            label="Warning"
            value={urgencyCounts.warning}
            color="#F59E0B"
          />
          <StatCard
            icon={FiCheckCircle}
            label="Safe"
            value={urgencyCounts.safe}
            color="#10B981"
          />
        </Box>
      )}

      {/* Filter Tabs */}
      {!loading && forecastData.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 3,
            flexWrap: "wrap",
          }}
        >
          {[
            { key: "all", label: "All", count: urgencyCounts.total },
            { key: "critical", label: "Critical", count: urgencyCounts.critical },
            { key: "warning", label: "Warning", count: urgencyCounts.warning },
            { key: "safe", label: "Safe", count: urgencyCounts.safe },
          ].map((filter) => (
            <Chip
              key={filter.key}
              label={`${filter.label} (${filter.count})`}
              onClick={() => setSelectedFilter(filter.key as typeof selectedFilter)}
              sx={{
                backgroundColor:
                  selectedFilter === filter.key
                    ? filter.key === "all"
                      ? "#1B1F3B"
                      : urgencyConfig[filter.key as keyof typeof urgencyConfig]?.textColor || "#1B1F3B"
                    : "#F4F5F7",
                color:
                  selectedFilter === filter.key
                    ? "#FFFFFF"
                    : "#4B5563",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor:
                    selectedFilter === filter.key
                      ? filter.key === "all"
                        ? "#1B1F3B"
                        : urgencyConfig[filter.key as keyof typeof urgencyConfig]?.textColor || "#1B1F3B"
                      : "#E5E7EB",
                },
              }}
            />
          ))}
        </Box>
      )}

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <Box
          sx={{
            textAlign: "center",
            py: 4,
            px: 3,
            backgroundColor: "#FEE2E2",
            borderRadius: "12px",
            border: "1px solid #FECACA",
          }}
        >
          <FiAlertTriangle size={32} color="#EF4444" />
          <Typography
            variant="body1"
            sx={{ color: "#991B1B", mt: 1, fontWeight: 500 }}
          >
            {error}
          </Typography>
        </Box>
      ) : filteredForecasts.length > 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: "500px",
            overflowY: "auto",
          }}
          className="custom-scrollbar"
        >
          {filteredForecasts.map((item, index) => (
            <ForecastRow key={`${item.sku}-${index}`} item={item} />
          ))}
        </Box>
      ) : (
        <EmptyState />
      )}
    </Paper>
  );
}
