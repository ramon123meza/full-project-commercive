"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { DateRangePicker, Range } from "react-date-range";
import { redirect } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import {
  HiOutlineShoppingCart,
  HiOutlineTruck,
  HiOutlineCube,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCalendar,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineClipboardDocumentList,
  HiOutlineChartBar,
} from "react-icons/hi2";
import { useStoreContext } from "@/context/StoreContext";
import { createClient } from "../../utils/supabase/client";
import Inventory from "@/components/inventory";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./home.css";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface InventoryItem {
  image: string | null;
  color: string;
  name: string;
  stockMeter: number | string | null;
  stockStatus: string;
  backorders: number;
}

interface OrderData {
  order_id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  sub_total_price: string;
  financial_status: string;
  fulfillment_status: string | null;
}

interface KPIData {
  totalSales: { count: number; revenue: number; trend: number; series: number[] };
  fulfilled: { count: number; percentage: number; trend: number; series: number[] };
  unfulfilled: { count: number; trend: number; series: number[] };
  inventoryHealth: { percentage: number; inStock: number; total: number };
}

// Sparkline Chart Component
const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => (
  <ReactApexChart
    options={{ chart: { type: "area", sparkline: { enabled: true } }, stroke: { curve: "smooth", width: 2, colors: [color] }, fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } }, colors: [color], tooltip: { enabled: false } }}
    series={[{ data }]} type="area" height={40} width={100}
  />
);

// KPI Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon: Icon,
  color,
  series,
  delay,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend: number;
  trendLabel: string;
  icon: React.ElementType;
  color: string;
  series: number[];
  delay: number;
}) {
  const isPositive = trend >= 0;
  const TrendIcon = isPositive ? HiOutlineArrowTrendingUp : HiOutlineArrowTrendingDown;

  return (
    <div className="stat-card animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="w-[100px]">
          <MiniSparkline data={series.length > 0 ? series : [0, 0, 0, 0, 0]} color={color} />
        </div>
      </div>
      <div className="mb-2">
        <p className="stat-value" style={{ color: "var(--primary-indigo)" }}>{value}</p>
        {subtitle && <p className="text-tiny text-slate mt-1">{subtitle}</p>}
      </div>
      <p className="stat-label">{title}</p>
      <div className={`stat-change ${isPositive ? "positive" : "negative"}`}>
        <TrendIcon className="w-4 h-4" />
        <span>{Math.abs(trend).toFixed(1)}% {trendLabel}</span>
      </div>
    </div>
  );
}

// Recent Orders Table Component
function RecentOrdersTable({ orders }: { orders: OrderData[] }) {
  const getStatusBadge = (status: string | null) => {
    if (!status || status.toLowerCase() !== "fulfilled") {
      return <span className="badge badge-warning">Pending</span>;
    }
    return <span className="badge badge-success">Fulfilled</span>;
  };

  return (
    <div className="card animate-fade-in-up" style={{ animationDelay: "400ms" }}>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <HiOutlineClipboardDocumentList className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-h4 text-primary">Recent Orders</h3>
          </div>
          <Link href="/shipments" className="btn btn-ghost btn-sm">View All</Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        {orders.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order, idx) => (
                <tr key={order.order_id || idx}>
                  <td className="font-medium">#{order.order_number}</td>
                  <td className="text-slate">{order.customer_name || "Guest"}</td>
                  <td className="font-semibold">${parseFloat(order.sub_total_price).toFixed(2)}</td>
                  <td>{getStatusBadge(order.fulfillment_status)}</td>
                  <td className="text-slate text-small">
                    {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><HiOutlineShoppingCart className="w-8 h-8" /></div>
            <p className="empty-state-title">No recent orders</p>
            <p className="empty-state-description">Orders will appear here once placed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Sales Chart Component
function SalesChart({ data, labels }: { data: number[]; labels: string[] }) {
  const options: ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, animations: { enabled: true, speed: 500 } },
    stroke: { curve: "smooth", width: 3 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 100] } },
    colors: ["#8e52f2"],
    xaxis: { categories: labels, labels: { style: { colors: "#4B5563", fontSize: "12px" } } },
    yaxis: { labels: { style: { colors: "#4B5563", fontSize: "12px" }, formatter: (val) => `$${val.toFixed(0)}` } },
    grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (val) => `$${val.toFixed(2)}` } },
  };

  return (
    <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <HiOutlineChartBar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-h4 text-primary">Sales Overview</h3>
          <p className="text-tiny text-slate">Revenue over selected period</p>
        </div>
      </div>
      <ReactApexChart options={options} series={[{ name: "Revenue", data }]} type="area" height={280} />
    </div>
  );
}

// Quick Actions Component
const quickActions = [
  { label: "Restock Analysis", href: "/restock", icon: HiOutlineChartBar, color: "#8e52f2" },
  { label: "Check Inventory", href: "/inventory", icon: HiOutlineCube, color: "#10B981" },
  { label: "Track Shipments", href: "/shipments", icon: HiOutlineTruck, color: "#F59E0B" },
  { label: "Contact Support", href: "/support", icon: HiOutlineChatBubbleLeftRight, color: "#EF4444" },
];

const QuickActions = () => (
  <div className="card p-6 animate-fade-in-up" style={{ animationDelay: "500ms" }}>
    <h3 className="text-h4 text-primary mb-4">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-3">
      {quickActions.map((a) => (
        <Link key={a.href} href={a.href} className="flex items-center gap-3 p-4 rounded-xl bg-gray hover:bg-sky transition-colors">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${a.color}15` }}>
            <a.icon className="w-5 h-5" style={{ color: a.color }} />
          </div>
          <span className="text-small font-medium text-primary">{a.label}</span>
        </Link>
      ))}
    </div>
  </div>
);

export default function Home() {
  const supabase = createClient();
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const { selectedStore, stores, userinfo, allStores } = useStoreContext();
  const storeUrl = selectedStore?.store_url || null;
  const userStores = userinfo?.role === "user" ? stores : allStores;

  if (userStores && userStores.length === 0) redirect("/support");

  // Date range helpers
  const getWeekRange = (offset: number = 0) => {
    const today = new Date();
    const day = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - day + (offset * 7));
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    return { start: sunday, end: saturday };
  };

  const [showPicker, setShowPicker] = useState(false);
  const [tempRange, setTempRange] = useState<Range[]>([{ startDate: new Date(), endDate: new Date(), key: "selection" }]);
  const [dateRange, setDateRange] = useState<Range[]>([{ startDate: new Date(), endDate: new Date(), key: "selection" }]);
  const [compareRange, setCompareRange] = useState<Range[]>([{ startDate: new Date(), endDate: new Date(), key: "selection" }]);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [pastOrders, setPastOrders] = useState<OrderData[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });

  // Initialize date ranges
  useEffect(() => {
    const current = getWeekRange(0);
    const compare = getWeekRange(-1);
    setDateRange([{ startDate: current.start, endDate: current.end, key: "selection" }]);
    setTempRange([{ startDate: current.start, endDate: current.end, key: "selection" }]);
    setCompareRange([{ startDate: compare.start, endDate: compare.end, key: "selection" }]);
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    if (showPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!storeUrl || !dateRange[0].startDate || !dateRange[0].endDate) return;
      setLoading(true);

      const formatDate = (d: Date) => d.toISOString().split("Z")[0];
      const start = formatDate(dateRange[0].startDate);
      const end = formatDate(dateRange[0].endDate);
      const pastStart = formatDate(compareRange[0].startDate!);
      const pastEnd = formatDate(compareRange[0].endDate!);

      try {
        const [ordersRes, pastOrdersRes, inventoryRes] = await Promise.all([
          supabase.from("order").select("*").gte("created_at", start).lte("created_at", end).eq("store_url", storeUrl),
          supabase.from("order").select("*").gte("created_at", pastStart).lte("created_at", pastEnd).eq("store_url", storeUrl),
          supabase.from("inventory").select("*").eq("store_url", storeUrl),
        ]);

        if (ordersRes.data) {
          const unique = Array.from(new Map(ordersRes.data.map((o) => [o.order_id, o])).values());
          setOrders(unique as OrderData[]);

          // Build chart data
          const grouped: Record<string, number> = {};
          unique.forEach((o: any) => {
            if (o.financial_status?.toLowerCase() === "paid") {
              const date = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              grouped[date] = (grouped[date] || 0) + parseFloat(o.sub_total_price || "0");
            }
          });
          setChartData({ labels: Object.keys(grouped), data: Object.values(grouped) });
        }

        if (pastOrdersRes.data) {
          const unique = Array.from(new Map(pastOrdersRes.data.map((o) => [o.order_id, o])).values());
          setPastOrders(unique as OrderData[]);
        }

        if (inventoryRes.data) {
          const transformed = inventoryRes.data.map((item) => {
            const level = item.inventory_level as any;
            const quantities = level?.[0]?.node?.quantities || [];
            const isTracked = level?.[0]?.node?.item?.inventoryManagement !== null;
            const available = quantities.find((q: any) => q.name === "available")?.quantity || 0;
            const committed = quantities.find((q: any) => q.name === "committed")?.quantity || 0;
            let stockStatus = "Enough Stock";
            if (!isTracked) stockStatus = "Not Tracked";
            else if (available === 0) stockStatus = "No Stock";
            else if (available < 50) stockStatus = "Low Stock";

            let urlObj: any = {};
            try { urlObj = JSON.parse(item.product_image || "{}"); } catch { urlObj = {}; }

            return {
              image: urlObj.url || item?.product_image,
              color: item.product_name || "",
              name: item.sku || "NO SKU",
              product_id: item.product_id,
              stockMeter: isTracked ? available + committed : null,
              stockStatus,
              backorders: item.back_orders || 0,
            };
          });
          setInventoryData(transformed);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange, compareRange, storeUrl, supabase]);

  // Calculate KPIs
  const kpi: KPIData = useMemo(() => {
    const paidOrders = orders.filter((o) => o.financial_status?.toLowerCase() === "paid");
    const fulfilledOrders = orders.filter((o) => o.fulfillment_status?.toLowerCase() === "fulfilled");
    const unfulfilledOrders = orders.filter((o) => !o.fulfillment_status || o.fulfillment_status.toLowerCase() !== "fulfilled");

    const pastPaid = pastOrders.filter((o) => o.financial_status?.toLowerCase() === "paid");
    const pastFulfilled = pastOrders.filter((o) => o.fulfillment_status?.toLowerCase() === "fulfilled");
    const pastUnfulfilled = pastOrders.filter((o) => !o.fulfillment_status || o.fulfillment_status.toLowerCase() !== "fulfilled");

    const revenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.sub_total_price || "0"), 0);
    const pastRevenue = pastPaid.reduce((sum, o) => sum + parseFloat(o.sub_total_price || "0"), 0);

    const calcTrend = (curr: number, prev: number) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);
    const groupByDate = (arr: OrderData[]) => {
      const grouped: Record<string, number> = {};
      arr.forEach((o) => { const d = o.created_at.split("T")[0]; grouped[d] = (grouped[d] || 0) + 1; });
      return Object.values(grouped);
    };

    const inStock = inventoryData.filter((i) => i.stockStatus === "Enough Stock").length;
    const totalTracked = inventoryData.filter((i) => i.stockStatus !== "Not Tracked").length;

    return {
      totalSales: { count: paidOrders.length, revenue, trend: calcTrend(paidOrders.length, pastPaid.length), series: groupByDate(paidOrders) },
      fulfilled: { count: fulfilledOrders.length, percentage: orders.length > 0 ? (fulfilledOrders.length / orders.length) * 100 : 0, trend: calcTrend(fulfilledOrders.length, pastFulfilled.length), series: groupByDate(fulfilledOrders) },
      unfulfilled: { count: unfulfilledOrders.length, trend: calcTrend(unfulfilledOrders.length, pastUnfulfilled.length), series: groupByDate(unfulfilledOrders) },
      inventoryHealth: { percentage: totalTracked > 0 ? (inStock / totalTracked) * 100 : 0, inStock, total: totalTracked },
    };
  }, [orders, pastOrders, inventoryData]);

  const formatDateDisplay = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <main className="flex flex-col h-full w-full gap-6 border-l-none md:border-l-2 border-t-2 border-[#F4F4F7] rounded-tl-0 md:rounded-tl-[24px] bg-gray p-4 md:p-8 overflow-auto custom-scrollbar">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="loader-lg" />
        </div>
      )}

      {/* Welcome Header - with high z-index for date picker dropdown */}
      <header className="animate-fade-in relative z-[60]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-h1 text-primary">Welcome back, {selectedStore?.store_name || "Store"}</h1>
            <p className="text-body text-slate mt-1">{today}</p>
          </div>
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="input flex items-center gap-2 w-auto cursor-pointer"
              style={{ maxWidth: "280px" }}
            >
              <HiOutlineCalendar className="w-5 h-5 text-slate" />
              <span className="text-small">
                {dateRange[0].startDate && dateRange[0].endDate
                  ? `${formatDateDisplay(dateRange[0].startDate)} - ${formatDateDisplay(dateRange[0].endDate)}`
                  : "Select date range"}
              </span>
            </button>
            {showPicker && (
              <div
                className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 animate-fade-in-down"
                style={{ zIndex: 9999 }}
              >
                <DateRangePicker ranges={tempRange} onChange={(r: any) => setTempRange([r.selection])} moveRangeOnFirstSelection={false} />
                <div className="flex justify-end gap-2 p-3 border-t border-gray-100">
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowPicker(false)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setDateRange(tempRange); setShowPicker(false); }}>Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* KPI Stats Row - lower z-index than header */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 relative z-[10]">
        <StatCard
          title="Total Sales"
          value={kpi.totalSales.count.toString()}
          subtitle={`$${kpi.totalSales.revenue.toFixed(2)} revenue`}
          trend={kpi.totalSales.trend}
          trendLabel="vs last period"
          icon={HiOutlineShoppingCart}
          color="#8e52f2"
          series={kpi.totalSales.series}
          delay={100}
        />
        <StatCard
          title="Fulfilled Orders"
          value={kpi.fulfilled.count.toString()}
          subtitle={`${kpi.fulfilled.percentage.toFixed(1)}% fulfillment rate`}
          trend={kpi.fulfilled.trend}
          trendLabel="vs last period"
          icon={HiOutlineTruck}
          color="#10B981"
          series={kpi.fulfilled.series}
          delay={150}
        />
        <StatCard
          title="Unfulfilled Orders"
          value={kpi.unfulfilled.count.toString()}
          subtitle="Awaiting fulfillment"
          trend={-kpi.unfulfilled.trend}
          trendLabel="vs last period"
          icon={HiOutlineClipboardDocumentList}
          color="#F59E0B"
          series={kpi.unfulfilled.series}
          delay={200}
        />
        <StatCard
          title="Inventory Health"
          value={`${kpi.inventoryHealth.percentage.toFixed(0)}%`}
          subtitle={`${kpi.inventoryHealth.inStock} of ${kpi.inventoryHealth.total} in stock`}
          trend={kpi.inventoryHealth.percentage >= 70 ? 5 : kpi.inventoryHealth.percentage >= 40 ? 0 : -5}
          trendLabel="stock level"
          icon={HiOutlineCube}
          color={kpi.inventoryHealth.percentage >= 70 ? "#10B981" : kpi.inventoryHealth.percentage >= 40 ? "#F59E0B" : "#EF4444"}
          series={[kpi.inventoryHealth.percentage, 100 - kpi.inventoryHealth.percentage]}
          delay={250}
        />
      </section>

      {/* Main Content Grid - lower z-index than header */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-[10]">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <SalesChart data={chartData.data.length > 0 ? chartData.data : [0]} labels={chartData.labels.length > 0 ? chartData.labels : ["No Data"]} />
          <RecentOrdersTable orders={orders} />
        </div>

        {/* Right Column - 1/3 */}
        <div className="flex flex-col gap-6">
          <div className="animate-fade-in-up" style={{ animationDelay: "350ms" }}>
            <Inventory data={inventoryData} />
          </div>
          <QuickActions />
        </div>
      </section>
    </main>
  );
}
