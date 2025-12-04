"use client";

import { useEffect, useRef, useState } from "react";
import { DateRangePicker, Range } from "react-date-range";
import { CiCalendar } from "react-icons/ci";
import { Autocomplete, Button, TextField } from "@mui/material";
import { useStoreContext } from "@/context/StoreContext";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { createClient } from "@/app/utils/supabase/client";
import { StoreRow } from "@/app/utils/types";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import Link from "next/link";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

// Admin Light Purple Theme Colors
const colors = {
  background: "#F8F7FC",
  card: "#FFFFFF",
  cardHover: "#F5F3FF",
  accent: "#8e52f2",
  accentLight: "#A78BFA",
  textPrimary: "#1F2937",
  textMuted: "#6B7280",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#E5E7EB",
  chartLine: "#8e52f2",
  chartFill: "#8e52f220",
  purple: "#8e52f2",
  purpleLight: "#EDE9FE",
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color: string;
  loading?: boolean;
}

interface ActivityItem {
  id: string;
  type: "user" | "order" | "ticket" | "store";
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
}

// Stat Card Component
function StatCard({ title, value, icon, trend, trendUp, color, loading }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 4px 20px ${color}15`,
      }}
    >
      {/* Gradient accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${color} 0%, ${color}60 100%)`,
        }}
      />

      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at top right, ${color}10 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </div>
          {trend && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: trendUp ? `${colors.success}20` : `${colors.error}20`,
                color: trendUp ? colors.success : colors.error,
              }}
            >
              {trendUp ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trend}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 rounded animate-pulse" style={{ backgroundColor: colors.border }} />
            <div className="h-4 w-28 rounded animate-pulse" style={{ backgroundColor: colors.border }} />
          </div>
        ) : (
          <>
            <h3
              className="text-3xl font-bold mb-1"
              style={{ color: colors.textPrimary }}
            >
              {value}
            </h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              {title}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Quick Action Button Component
function QuickActionButton({
  title,
  description,
  icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <div
        className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className="font-semibold text-sm mb-0.5 truncate"
            style={{ color: colors.textPrimary }}
          >
            {title}
          </h4>
          <p className="text-xs truncate" style={{ color: colors.textMuted }}>
            {description}
          </p>
        </div>
        <svg
          className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1"
          style={{ color: colors.textMuted }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// Activity Item Component
function ActivityItemCard({ item }: { item: ActivityItem }) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "user":
        return colors.success;
      case "order":
        return colors.accent;
      case "ticket":
        return colors.warning;
      case "store":
        return "#8B5CF6";
      default:
        return colors.accent;
    }
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-opacity-50"
      style={{ backgroundColor: `${colors.background}50` }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${getTypeColor(item.type)}20` }}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: colors.textPrimary }}
        >
          {item.title}
        </p>
        <p className="text-xs truncate" style={{ color: colors.textMuted }}>
          {item.description}
        </p>
      </div>
      <span className="text-xs flex-shrink-0" style={{ color: colors.textMuted }}>
        {item.time}
      </span>
    </div>
  );
}

export default function Home() {
  const supabase = createClient();
  const currentPickerRef = useRef<HTMLDivElement | null>(null);
  const comparePickerRef = useRef<HTMLDivElement | null>(null);
  const { selectedStore, setSelectedStore, allStores, userinfo } = useStoreContext();
  const store_url = selectedStore ? selectedStore.store_url : null;
  const [storeFilter, setStoreFilter] = useState<StoreRow | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    totalStores: 0,
    totalUsers: 0,
    pendingLeads: 0,
    openTickets: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Chart data state
  const [chartData, setChartData] = useState<{ date: string; orders: number; revenue: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!selectedStore) {
      setSelectedStore(allStores[0]);
    }
  }, []);

  // Date range helper functions
  const getSundayOfWeek = (date: Date) => {
    const day = date.getDay();
    const diff = day === 0 ? 0 : -day;
    return new Date(date.setDate(date.getDate() + diff));
  };

  const getSaturdayOfWeek = (date: Date) => {
    const sunday = getSundayOfWeek(new Date(date));
    return new Date(sunday.setDate(sunday.getDate() + 6));
  };

  const getSundayOfLastWeek = (date: Date) => {
    const sunday = getSundayOfWeek(new Date(date));
    return new Date(sunday.setDate(sunday.getDate() - 7));
  };

  const getSaturdayOfLastWeek = (date: Date): Date => {
    const lastSunday = getSundayOfLastWeek(new Date(date));
    return new Date(lastSunday.setDate(lastSunday.getDate() + 6));
  };

  const [showCurrentDateRange, setShowCurrentDateRange] = useState<boolean>(false);
  const [tmpCurrentDateRange, setTmpCurrentDateRange] = useState<Range[]>([
    { startDate: new Date(), endDate: new Date(), key: "selection" },
  ]);
  const [currentDateRange, setCurrentDateRange] = useState<Range[]>([
    { startDate: new Date(), endDate: new Date(), key: "selection" },
  ]);

  const [showCompareDateRange, setShowCompareDateRange] = useState<boolean>(false);
  const [tmpCompareDateRange, setTmpCompareDateRange] = useState<Range[]>([
    { startDate: new Date(), endDate: new Date(), key: "selection" },
  ]);
  const [compareDateRange, setCompareDateRange] = useState<Range[]>([
    { startDate: new Date(), endDate: new Date(), key: "selection" },
  ]);

  const handleApplyCurrentDateRange = () => {
    setCurrentDateRange(tmpCurrentDateRange);
    setShowCurrentDateRange(false);
  };

  const handleCurrentDateSelect = (ranges: any) => {
    setTmpCurrentDateRange([ranges.selection]);
  };

  const handleApplyTmpDateRange = () => {
    setCompareDateRange(tmpCompareDateRange);
    setShowCompareDateRange(false);
  };

  const handleCompareDateSelect = (ranges: any) => {
    setTmpCompareDateRange([ranges.selection]);
  };

  // Initialize date ranges
  useEffect(() => {
    const thisSunday = getSundayOfWeek(new Date());
    const thisSaturday = getSaturdayOfWeek(new Date());
    const lastSunday = getSundayOfLastWeek(new Date());
    const lastSaturday = getSaturdayOfLastWeek(new Date());

    setCurrentDateRange([{ startDate: thisSunday, endDate: thisSaturday, key: "selection" }]);
    setCompareDateRange([{ startDate: lastSunday, endDate: lastSaturday, key: "selection" }]);
  }, []);

  // Handle click outside for date pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currentPickerRef.current && !currentPickerRef.current.contains(event.target as Node)) {
        setShowCurrentDateRange(false);
      }
    };
    if (showCurrentDateRange) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCurrentDateRange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comparePickerRef.current && !comparePickerRef.current.contains(event.target as Node)) {
        setShowCompareDateRange(false);
      }
    };
    if (showCompareDateRange) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCompareDateRange]);

  // Fetch admin stats
  const fetchAdminStats = async () => {
    setStatsLoading(true);
    try {
      // Fetch total stores
      const { count: storesCount } = await supabase
        .from("stores")
        .select("*", { count: "exact", head: true });

      // Fetch total users
      const { count: usersCount } = await supabase
        .from("user")
        .select("*", { count: "exact", head: true });

      // Fetch pending leads (affiliates with pending status)
      const { count: leadsCount } = await supabase
        .from("affiliates")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending");

      // Fetch open support tickets (pending issues)
      const { count: ticketsCount } = await supabase
        .from("issues")
        .select("*", { count: "exact", head: true })
        .eq("confirmed", false);

      setStats({
        totalStores: storesCount || 0,
        totalUsers: usersCount || 0,
        pendingLeads: leadsCount || 0,
        openTickets: ticketsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch chart data
  const fetchChartData = async () => {
    if (!currentDateRange[0]?.startDate || !currentDateRange[0]?.endDate) return;

    const formatDateForQuery = (date: Date) => date.toISOString().split("Z")[0];
    const formattedStartDate = formatDateForQuery(currentDateRange[0].startDate);
    const formattedEndDate = formatDateForQuery(currentDateRange[0].endDate);

    try {
      const { data: orderData } = await supabase
        .from("order")
        .select("created_at, sub_total_price")
        .gte("created_at", formattedStartDate)
        .lte("created_at", formattedEndDate);

      // Group by date
      const grouped: { [key: string]: { orders: number; revenue: number } } = {};
      orderData?.forEach((order) => {
        const date = new Date(order.created_at).toISOString().split("T")[0];
        if (!grouped[date]) {
          grouped[date] = { orders: 0, revenue: 0 };
        }
        grouped[date].orders += 1;
        grouped[date].revenue += parseFloat(order.sub_total_price || "0");
      });

      const chartDataArray = Object.entries(grouped).map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue,
      }));

      setChartData(chartDataArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      const activities: ActivityItem[] = [];

      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from("user")
        .select("id, email, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      recentUsers?.forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: "user",
          title: "New user signed up",
          description: user.email || "Unknown email",
          time: getRelativeTime(new Date(user.created_at)),
          icon: (
            <svg className="w-4 h-4" style={{ color: colors.success }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        });
      });

      // Fetch recent orders
      const { data: recentOrders } = await supabase
        .from("order")
        .select("id, order_id, sub_total_price, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      recentOrders?.forEach((order) => {
        activities.push({
          id: `order-${order.id}`,
          type: "order",
          title: `Order #${String(order.order_id || '').slice(-6) || "N/A"}`,
          description: `$${parseFloat(order.sub_total_price || "0").toFixed(2)}`,
          time: getRelativeTime(new Date(order.created_at)),
          icon: (
            <svg className="w-4 h-4" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          ),
        });
      });

      // Fetch recent issues (support tickets)
      const { data: recentTickets } = await supabase
        .from("issues")
        .select("id, issue, confirmed, created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      recentTickets?.forEach((ticket) => {
        activities.push({
          id: `ticket-${ticket.id}`,
          type: "ticket",
          title: ticket.issue || "Support ticket",
          description: `Status: ${ticket.confirmed ? "Confirmed" : "Pending"}`,
          time: getRelativeTime(new Date(ticket.created_at)),
          icon: (
            <svg className="w-4 h-4" style={{ color: colors.warning }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          ),
        });
      });

      // Sort by time and take most recent
      setRecentActivity(
        activities.sort((a, b) => {
          const aTime = parseRelativeTime(a.time);
          const bTime = parseRelativeTime(b.time);
          return aTime - bTime;
        }).slice(0, 8)
      );
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  // Helper function to get relative time
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Helper to parse relative time for sorting
  const parseRelativeTime = (time: string): number => {
    if (time === "Just now") return 0;
    const match = time.match(/(\d+)([mhd])/);
    if (!match) return Infinity;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === "m") return value;
    if (unit === "h") return value * 60;
    if (unit === "d") return value * 1440;
    return Infinity;
  };

  // Initial data fetch
  useEffect(() => {
    fetchAdminStats();
    fetchRecentActivity();
  }, []);

  // Fetch chart data when date range changes
  useEffect(() => {
    if (currentDateRange[0]?.startDate && currentDateRange[0]?.endDate) {
      fetchChartData();
    }
  }, [currentDateRange]);

  useEffect(() => {
    if (allStores.length > 0) {
      setStoreFilter(allStores[0]);
      setSelectedStore(allStores[0]);
    }
  }, [allStores]);

  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      background: "transparent",
      foreColor: colors.textMuted,
    },
    colors: [colors.accent, colors.success],
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartData.map((d) => {
        const date = new Date(d.date);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }),
      labels: { style: { colors: colors.textMuted } },
      axisBorder: { color: colors.border },
      axisTicks: { color: colors.border },
    },
    yaxis: {
      labels: { style: { colors: colors.textMuted } },
    },
    grid: {
      borderColor: colors.border,
      strokeDashArray: 4,
    },
    tooltip: {
      theme: "dark",
      x: { show: true },
    },
    legend: {
      labels: { colors: colors.textMuted },
    },
  };

  const chartSeries = [
    { name: "Orders", data: chartData.map((d) => d.orders) },
    { name: "Revenue ($)", data: chartData.map((d) => Math.round(d.revenue)) },
  ];

  // Get current date formatted
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get admin name
  const adminName = userinfo?.first_name || userinfo?.email?.split("@")[0] || "Admin";

  return (
    <main className="flex flex-col h-full max-h-full w-full gap-6 overflow-auto custom-scrollbar">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold mb-1"
            style={{ color: colors.textPrimary }}
          >
            Welcome back, {adminName}
          </h1>
          <p style={{ color: colors.textMuted }}>{currentDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Store Filter */}
          <Autocomplete
            options={allStores}
            getOptionLabel={(option) => option.store_name}
            value={storeFilter}
            onChange={(event, newValue) => {
              setStoreFilter(newValue);
              setSelectedStore(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by store"
                variant="outlined"
                size="small"
                sx={{
                  minWidth: 200,
                  "& .MuiOutlinedInput-root": {
                    color: colors.textPrimary,
                    "& fieldset": { borderColor: colors.border },
                    "&:hover fieldset": { borderColor: colors.accent },
                    "&.Mui-focused fieldset": { borderColor: colors.accent },
                  },
                  "& .MuiInputLabel-root": { color: colors.textMuted },
                  "& .MuiInputLabel-root.Mui-focused": { color: colors.accent },
                  "& .MuiSvgIcon-root": { color: colors.textMuted },
                }}
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            clearOnEscape
          />

          {/* Date Range Picker */}
          <div style={{ position: "relative" }}>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors"
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
              }}
              onClick={() => setShowCurrentDateRange(true)}
            >
              <CiCalendar style={{ color: colors.accent }} size={18} />
              <span className="text-sm" style={{ color: colors.textPrimary }}>
                {currentDateRange[0]?.startDate && currentDateRange[0]?.endDate
                  ? `${currentDateRange[0].startDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })} - ${currentDateRange[0].endDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}`
                  : "Select date range"}
              </span>
            </div>
            {showCurrentDateRange && (
              <div
                ref={currentPickerRef}
                className="absolute right-0 mt-2 rounded-lg overflow-hidden"
                style={{
                  boxShadow: `0 10px 40px rgba(142, 82, 242, 0.15)`,
                  zIndex: 9999,
                }}
              >
                <DateRangePicker
                  ranges={tmpCurrentDateRange}
                  onChange={handleCurrentDateSelect}
                  moveRangeOnFirstSelection={false}
                />
                <div className="flex justify-end gap-3 p-3 bg-white border-t">
                  <Button size="small" onClick={() => setShowCurrentDateRange(false)}>
                    Cancel
                  </Button>
                  <Button size="small" variant="contained" onClick={handleApplyCurrentDateRange}>
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Stores"
          value={stats.totalStores}
          icon={
            <svg className="w-6 h-6" style={{ color: "#8B5CF6" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="#8B5CF6"
          loading={statsLoading}
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={
            <svg className="w-6 h-6" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          color={colors.accent}
          loading={statsLoading}
        />
        <StatCard
          title="Pending Leads"
          value={stats.pendingLeads}
          icon={
            <svg className="w-6 h-6" style={{ color: colors.warning }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color={colors.warning}
          loading={statsLoading}
        />
        <StatCard
          title="Open Tickets"
          value={stats.openTickets}
          icon={
            <svg className="w-6 h-6" style={{ color: colors.error }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          }
          color={colors.error}
          loading={statsLoading}
        />
      </div>

      {/* Activity Overview - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Chart - Takes 2 columns */}
        <div
          className="lg:col-span-2 rounded-xl p-6"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                className="text-lg font-semibold mb-1"
                style={{ color: colors.textPrimary }}
              >
                Orders Overview
              </h2>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                Orders and revenue for the selected period
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.accent }} />
                <span className="text-xs" style={{ color: colors.textMuted }}>Orders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.success }} />
                <span className="text-xs" style={{ color: colors.textMuted }}>Revenue</span>
              </div>
            </div>
          </div>
          <div className="h-[280px]">
            {chartData.length > 0 ? (
              <ReactApexChart
                options={chartOptions}
                series={chartSeries}
                type="area"
                height="100%"
              />
            ) : (
              <div
                className="h-full flex items-center justify-center rounded-lg"
                style={{ backgroundColor: colors.background }}
              >
                <p style={{ color: colors.textMuted }}>No data available for selected period</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue Metrics */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: colors.textPrimary }}
          >
            Revenue Metrics
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: colors.textMuted }}>Total Revenue</span>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `${colors.success}20`, color: colors.success }}>
                  This Period
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                ${chartData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div
              className="h-px"
              style={{ backgroundColor: colors.border }}
            />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: colors.textMuted }}>Total Orders</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                {chartData.reduce((sum, d) => sum + d.orders, 0)}
              </p>
            </div>
            <div
              className="h-px"
              style={{ backgroundColor: colors.border }}
            />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: colors.textMuted }}>Avg Order Value</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                ${chartData.length > 0
                  ? (chartData.reduce((sum, d) => sum + d.revenue, 0) / chartData.reduce((sum, d) => sum + d.orders, 0) || 0).toFixed(2)
                  : "0.00"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: colors.textPrimary }}
          >
            Quick Actions
          </h2>
          <div className="space-y-3">
            <QuickActionButton
              title="Approve Pending Users"
              description={`${stats.pendingLeads} users awaiting approval`}
              href="/admin/roles"
              color={colors.success}
              icon={
                <svg className="w-5 h-5" style={{ color: colors.textPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <QuickActionButton
              title="Review Leads"
              description="Manage affiliate requests"
              href="/admin/partner"
              color={colors.warning}
              icon={
                <svg className="w-5 h-5" style={{ color: colors.textPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <QuickActionButton
              title="Manage Stores"
              description={`${stats.totalStores} stores connected`}
              href="/admin/stores"
              color="#8B5CF6"
              icon={
                <svg className="w-5 h-5" style={{ color: colors.textPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <QuickActionButton
              title="View Support Tickets"
              description={`${stats.openTickets} tickets need attention`}
              href="/admin/ticket"
              color={colors.error}
              icon={
                <svg className="w-5 h-5" style={{ color: colors.textPrimary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold"
              style={{ color: colors.textPrimary }}
            >
              Recent Activity
            </h2>
            <button
              className="text-sm transition-colors hover:underline"
              style={{ color: colors.accent }}
              onClick={() => fetchRecentActivity()}
            >
              Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-[350px] overflow-auto custom-scrollbar pr-2">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <ActivityItemCard key={item.id} item={item} />
              ))
            ) : (
              <div
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <svg
                  className="w-12 h-12 mb-3"
                  style={{ color: colors.textMuted }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p style={{ color: colors.textMuted }}>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
