"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HiArrowRight } from "react-icons/hi";
import { HiOutlineCube, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { InventoryItem } from "@/app/(authentificated)/home/page";

type InventoryProps = {
  data: InventoryItem[];
};

export default function Inventory({ data }: InventoryProps) {
  // Calculate inventory statistics
  const stats = useMemo(() => {
    const totalSKUs = data.length;
    const lowStockItems = data.filter(
      (item) => item.stockStatus === "Low Stock"
    ).length;
    const outOfStockItems = data.filter(
      (item) => item.stockStatus === "No Stock"
    ).length;
    const inStockItems = data.filter(
      (item) => item.stockStatus === "Enough Stock"
    ).length;
    const notTrackedItems = data.filter(
      (item) => item.stockStatus === "Not Tracked"
    ).length;

    return { totalSKUs, lowStockItems, outOfStockItems, inStockItems, notTrackedItems };
  }, [data]);

  // Get top 5 critical items (out of stock first, then low stock)
  const criticalItems = useMemo(() => {
    const outOfStock = data
      .filter((item) => item.stockStatus === "No Stock")
      .slice(0, 5);
    const lowStock = data
      .filter((item) => item.stockStatus === "Low Stock")
      .slice(0, 5 - outOfStock.length);
    return [...outOfStock, ...lowStock].slice(0, 5);
  }, [data]);

  const getStockPercentage = (stockMeter: number | string | null): number => {
    if (stockMeter === null || stockMeter === "Not tracked" || typeof stockMeter === "string") {
      return 0;
    }
    return Math.min(100, Math.max(0, (stockMeter / 100) * 100));
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
        return "Low";
      case "No Stock":
        return "Out";
      default:
        return "N/A";
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

  // Calculate overall health percentage
  const healthPercentage = useMemo(() => {
    if (stats.totalSKUs === 0) return 0;
    return Math.round((stats.inStockItems / stats.totalSKUs) * 100);
  }, [stats]);

  return (
    <div className="card p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <HiOutlineCube className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-h4 text-primary">Inventory</h3>
            <p className="text-tiny text-slate">Stock overview</p>
          </div>
        </div>
        <Link
          href="/inventory"
          className="btn btn-ghost btn-sm flex items-center gap-2"
        >
          View All
          <HiArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Total SKUs */}
        <div className="bg-sky rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{stats.totalSKUs}</p>
          <p className="text-tiny text-slate">Total SKUs</p>
        </div>

        {/* In Stock */}
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--success-light)" }}>
          <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>
            {stats.inStockItems}
          </p>
          <p className="text-tiny text-slate">In Stock</p>
        </div>

        {/* Low Stock */}
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--warning-light)" }}>
          <div className="flex items-center justify-center gap-1">
            <p className="text-2xl font-bold" style={{ color: "#D97706" }}>
              {stats.lowStockItems}
            </p>
            {stats.lowStockItems > 0 && (
              <HiOutlineExclamationTriangle className="w-4 h-4" style={{ color: "#D97706" }} />
            )}
          </div>
          <p className="text-tiny text-slate">Low Stock</p>
        </div>

        {/* Out of Stock */}
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--error-light)" }}>
          <div className="flex items-center justify-center gap-1">
            <p className="text-2xl font-bold" style={{ color: "var(--error)" }}>
              {stats.outOfStockItems}
            </p>
          </div>
          <p className="text-tiny text-slate">Out of Stock</p>
        </div>
      </div>

      {/* Overall Health Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-small font-medium text-slate">Stock Health</span>
          <span className="text-small font-bold text-primary">{healthPercentage}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${healthPercentage}%`,
              background:
                healthPercentage >= 70
                  ? "var(--success)"
                  : healthPercentage >= 40
                  ? "var(--warning)"
                  : "var(--error)",
            }}
          />
        </div>
      </div>

      {/* Critical Items Section */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-small font-semibold text-primary">Critical Items</h4>
          <span className="badge badge-error">{criticalItems.length} items</span>
        </div>

        {criticalItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ background: "var(--success-light)" }}
            >
              <HiOutlineCube className="w-6 h-6" style={{ color: "var(--success)" }} />
            </div>
            <p className="text-small font-medium text-primary">All items stocked</p>
            <p className="text-tiny text-slate">No critical inventory issues</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[200px] custom-scrollbar pr-1">
            {criticalItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                style={{ background: "var(--neutral-gray)" }}
              >
                {/* Product Image */}
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
                  style={{ background: "#E5E7EB" }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <HiOutlineCube className="w-5 h-5 text-slate" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium text-primary truncate">
                    {item.name}
                  </p>
                  <p className="text-tiny text-slate truncate">{item.color}</p>
                </div>

                {/* Stock Meter */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16">
                    <div className="stock-meter-bar">
                      <div
                        className={`stock-meter-fill ${getStockMeterClass(item.stockStatus)}`}
                        style={{ width: `${getStockPercentage(item.stockMeter)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`badge ${getStatusBadgeClass(item.stockStatus)}`}>
                    {getStatusLabel(item.stockStatus)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
