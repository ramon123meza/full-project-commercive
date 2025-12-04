"use client";

import dynamic from "next/dynamic";
import * as turf from "@turf/turf";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useStoreContext } from "@/context/StoreContext";
import "leaflet/dist/leaflet.css";
import { differenceInDays, differenceInHours, format } from "date-fns";
import { enGB } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-toastify";
import { createClient } from "@/app/utils/supabase/client";
import {
  FiArrowLeft,
  FiCopy,
  FiMessageSquare,
  FiDownload,
  FiExternalLink,
  FiMapPin,
  FiTruck,
  FiPackage,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronRight,
  FiCalendar,
  FiHash,
  FiBox,
} from "react-icons/fi";

// Dynamic imports for Leaflet components to fix SSR/hydration issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <MapSkeleton /> }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

// Map loading skeleton
const MapSkeleton = () => (
  <div className="w-full h-full bg-gradient-to-br from-[#D7E8FF] to-[#F4F5F7] flex items-center justify-center">
    <div className="text-center">
      <div className="loader mx-auto mb-4"></div>
      <p className="text-small text-[#4B5563]">Loading map...</p>
    </div>
  </div>
);

// Map styles
const mapStyles = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; <a href='https://carto.com/'>CartoDB</a>",
    markerColor: "#3A6EA5",
    lineColor: "#1B1F3B",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; <a href='https://carto.com/'>CartoDB</a>",
    markerColor: "#D7E8FF",
    lineColor: "#FFFFFF",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; <a href='https://www.esri.com/'>Esri</a>",
    markerColor: "#FFFFFF",
    lineColor: "#FFFFFF",
  },
};

// Generate arc path for animated route
const generateArcPath = (start: [number, number], end: [number, number]) => {
  const startLngLat: [number, number] = [start[1], start[0]];
  const endLngLat: [number, number] = [end[1], end[0]];
  const midpoint = turf.midpoint(startLngLat, endLngLat).geometry.coordinates;
  const arcHeightFactor = 0.15;
  const distance = turf.distance(startLngLat, endLngLat);
  const bearing = turf.bearing(startLngLat, endLngLat);
  const perpendicularBearing = bearing - 90;
  const arcMidpoint = turf.destination(
    midpoint,
    distance * arcHeightFactor,
    perpendicularBearing
  ).geometry.coordinates;

  const line = turf.lineString([startLngLat, arcMidpoint, endLngLat]);
  const curvedPath = turf.bezierSpline(line, {
    resolution: 10000,
    sharpness: 0.5,
  });

  return curvedPath.geometry.coordinates.map(
    (coord) => [coord[1], coord[0]] as [number, number]
  );
};

// Carrier info helper
const getCarrierInfo = (company: string | null) => {
  const carriers: Record<string, { logo: string; color: string }> = {
    "DHL Express": { logo: "/icons/dhl.png", color: "#FFCC00" },
    DHL: { logo: "/icons/dhl.png", color: "#FFCC00" },
    USPS: { logo: "/icons/usps.png", color: "#004B87" },
    UPS: { logo: "/svgs/ups-icon.svg", color: "#351C15" },
    FedEx: { logo: "/icons/fedex.png", color: "#4D148C" },
    SDH: { logo: "/icons/sdh.png", color: "#FF6B00" },
    YANWEN: { logo: "/svgs/yanwen.svg", color: "#E60012" },
    "Yun Express": { logo: "/svgs/yun-express.svg", color: "#FF6600" },
  };
  return carriers[company || ""] || { logo: "/icons/Layer.png", color: "#6B7280" };
};

// Status info helper
const getStatusInfo = (status: string | null) => {
  const normalizedStatus = status?.toUpperCase() || "";
  if (["SUCCESS", "DELIVERED", "COMPLETED"].includes(normalizedStatus)) {
    return { label: "Delivered", badge: "badge-success", icon: FiCheckCircle, color: "#10B981" };
  }
  if (["IN_TRANSIT", "SHIPPED", "TRANSIT"].includes(normalizedStatus)) {
    return { label: "In Transit", badge: "badge-info", icon: FiTruck, color: "#3B82F6" };
  }
  if (["PENDING", "OPEN", "PROCESSING"].includes(normalizedStatus)) {
    return { label: "Pending", badge: "badge-warning", icon: FiClock, color: "#F59E0B" };
  }
  if (["CANCELLED", "ERROR", "FAILURE", "FAILED"].includes(normalizedStatus)) {
    return { label: "Failed", badge: "badge-error", icon: FiAlertCircle, color: "#EF4444" };
  }
  return { label: "Unknown", badge: "badge-neutral", icon: FiPackage, color: "#6B7280" };
};

// Force map update component
const ForceMapUpdate = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const Component = () => {
        const map = mod.useMap();
        useEffect(() => {
          const timer = setTimeout(() => {
            map.invalidateSize();
          }, 300);
          return () => clearTimeout(timer);
        }, [map]);
        return null;
      };
      return Component;
    }),
  { ssr: false }
);

export default function ShipmentDetails() {
  const supabase = createClient();
  const router = useRouter();
  const { selectedStore, setChatOpen } = useStoreContext();
  const { order_id } = useParams();

  const [destination, setDestination] = useState<[number, number]>([40.7128, -74.006]);
  const [storeLocation, setStoreLocation] = useState<[number, number]>([51.5074, -0.1278]);
  const [loading, setLoading] = useState<boolean>(true);
  const [trackingData, setTrackingData] = useState<any>({});
  const [orderData, setOrderData] = useState<any>({});
  const [formattedStoreLocation, setFormattedStoreLocation] = useState<string>("");
  const [formattedShippingLocation, setFormattedShippingLocation] = useState<string>("");
  const [productDetails, setProductDetails] = useState<any[]>([]);
  const [mapStyle, setMapStyle] = useState<keyof typeof mapStyles>("light");
  const [isMapReady, setIsMapReady] = useState(false);

  // Fetch order and tracking data
  const fetchOrderData = async () => {
    setLoading(true);
    try {
      // Fetch tracking data
      const { data: trackingData, error: trackingError } = await supabase
        .from("trackings")
        .select("*")
        .eq("order_id", Number(order_id))
        .single();

      if (trackingError) throw trackingError;

      if (trackingData) {
        const dest = trackingData.destination as any;
        if (dest?.latitude && dest?.longitude) {
          setDestination([dest.latitude, dest.longitude]);
        }

        // Parse store location
        if (trackingData.store_location) {
          try {
            const storeLoc = JSON.parse(trackingData.store_location);
            if (storeLoc?.latitude && storeLoc?.longitude) {
              setStoreLocation([storeLoc.latitude, storeLoc.longitude]);
            }
            const formatted = [
              storeLoc?.address1,
              storeLoc?.city,
              storeLoc?.country,
              storeLoc?.zip,
            ]
              .filter(Boolean)
              .join(", ");
            setFormattedStoreLocation(formatted || "Origin location");
          } catch {
            setFormattedStoreLocation("Origin location");
          }
        }

        setTrackingData(trackingData);
      }

      // Fetch order data
      const { data: orderData, error: orderError } = await supabase
        .from("order")
        .select("*")
        .eq("order_id", Number(order_id))
        .single();

      if (orderError) throw orderError;

      if (orderData) {
        setOrderData(orderData);

        // Parse shipping address
        if (orderData.shipping_address) {
          try {
            const shippingAddr = orderData.shipping_address as any;
            const formatted = [
              shippingAddr?.address1,
              shippingAddr?.city,
              shippingAddr?.country_code,
              shippingAddr?.zip,
            ]
              .filter(Boolean)
              .join(", ");
            setFormattedShippingLocation(formatted || "Destination");
          } catch {
            setFormattedShippingLocation("Destination");
          }
        }

        // Parse line items
        if (orderData.line_items) {
          try {
            const lineItems =
              typeof orderData.line_items === "string"
                ? JSON.parse(orderData.line_items)
                : orderData.line_items;

            if (Array.isArray(lineItems)) {
              const products = lineItems.map((item: any) => ({
                quantity: (item.node || item)?.quantity || 1,
                sku: (item.node || item)?.sku || "NO SKU",
                title: (item.node || item)?.title || "Unknown Product",
                price: (item.node || item)?.price,
                image: (item.node || item)?.image,
              }));
              setProductDetails(products);
            }
          } catch {
            setProductDetails([]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching order data:", error);
    } finally {
      setLoading(false);
      setTimeout(() => setIsMapReady(true), 500);
    }
  };

  useEffect(() => {
    if (order_id) {
      fetchOrderData();
    }
  }, [selectedStore, order_id]);

  // Generate arc path for the route
  const polylinePositions = useMemo(
    () => generateArcPath(storeLocation, destination),
    [storeLocation, destination]
  );

  // Calculate time difference
  const calculateTimeDifference = (createdAt: string) => {
    if (!createdAt) return "N/A";
    const createdAtDate = new Date(createdAt);
    const now = new Date();
    const days = differenceInDays(now, createdAtDate);
    const hours = differenceInHours(now, createdAtDate) % 24;

    if (days === 0 && hours === 0) return "Less than an hour";

    const daysText = days > 0 ? `${days} day${days > 1 ? "s" : ""}` : "";
    const hoursText = hours > 0 ? `${hours} hour${hours > 1 ? "s" : ""}` : "";
    const separator = daysText && hoursText ? ", " : "";

    return `${daysText}${separator}${hoursText}`;
  };

  // Copy handlers
  const handleCopyTracking = () => {
    if (trackingData?.tracking_number) {
      navigator.clipboard.writeText(trackingData.tracking_number).then(() => {
        toast.success("Tracking number copied!", { position: "top-right", autoClose: 2000 });
      });
    } else {
      toast.warning("No tracking number available", { position: "top-right", autoClose: 2000 });
    }
  };

  const handleCopyTrackingUrl = () => {
    if (trackingData?.tracking_url) {
      navigator.clipboard.writeText(trackingData.tracking_url).then(() => {
        toast.success("Tracking URL copied!", { position: "top-right", autoClose: 2000 });
      });
    } else {
      toast.warning("No tracking URL available", { position: "top-right", autoClose: 2000 });
    }
  };

  const statusInfo = getStatusInfo(trackingData?.status);
  const carrierInfo = getCarrierInfo(trackingData?.tracking_company);
  const StatusIcon = statusInfo.icon;

  // Timeline events
  const timelineEvents = [
    {
      title: "Order Created",
      date: orderData?.created_at
        ? format(new Date(orderData.created_at), "MMM dd, yyyy HH:mm")
        : "-",
      status: "completed",
      icon: FiPackage,
    },
    {
      title: "Shipped",
      date: trackingData?.created_at
        ? format(new Date(trackingData.created_at), "MMM dd, yyyy HH:mm")
        : "-",
      status: trackingData?.created_at ? "completed" : "pending",
      icon: FiTruck,
    },
    {
      title: "In Transit",
      date: trackingData?.updated_at
        ? format(new Date(trackingData.updated_at), "MMM dd, yyyy HH:mm")
        : "-",
      status: ["IN_TRANSIT", "SHIPPED", "TRANSIT"].includes(trackingData?.status?.toUpperCase() || "")
        ? "current"
        : trackingData?.status
        ? "completed"
        : "pending",
      icon: FiMapPin,
    },
    {
      title: "Delivered",
      date: ["SUCCESS", "DELIVERED", "COMPLETED"].includes(trackingData?.status?.toUpperCase() || "")
        ? format(new Date(trackingData.updated_at), "MMM dd, yyyy HH:mm")
        : "-",
      status: ["SUCCESS", "DELIVERED", "COMPLETED"].includes(trackingData?.status?.toUpperCase() || "")
        ? "completed"
        : "pending",
      icon: FiCheckCircle,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full w-full border-l-none md:border-l-2 border-t-2 border-[#F4F4F7] rounded-tl-0 md:rounded-tl-[24px] overflow-hidden bg-[#F4F5F7]">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center">
            <div className="loader-lg mb-4"></div>
            <p className="text-body text-[#4B5563]">Loading shipment details...</p>
          </div>
        </div>
      )}

      {/* Map Section */}
      <div className="relative flex-1 min-h-[300px] lg:min-h-full">
        {isMapReady && (
          <MapContainer
            center={[
              (storeLocation[0] + destination[0]) / 2,
              (storeLocation[1] + destination[1]) / 2,
            ]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
            dragging={true}
            doubleClickZoom={true}
            zoomControl={true}
          >
            <ForceMapUpdate />
            <TileLayer
              url={mapStyles[mapStyle].url}
              attribution={mapStyles[mapStyle].attribution}
            />

            {/* Origin Marker */}
            <CircleMarker
              center={storeLocation}
              pathOptions={{
                color: mapStyles[mapStyle].markerColor,
                fillColor: mapStyles[mapStyle].markerColor,
                fillOpacity: 1,
              }}
              radius={12}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-semibold text-[#1B1F3B]">Origin</p>
                  <p className="text-small text-[#4B5563]">{formattedStoreLocation}</p>
                </div>
              </Popup>
            </CircleMarker>

            {/* Destination Marker */}
            <CircleMarker
              center={destination}
              pathOptions={{
                color: "#10B981",
                fillColor: "#10B981",
                fillOpacity: 1,
              }}
              radius={12}
            >
              <Popup>
                <div className="p-2">
                  <p className="font-semibold text-[#1B1F3B]">Destination</p>
                  <p className="text-small text-[#4B5563]">{formattedShippingLocation}</p>
                </div>
              </Popup>
            </CircleMarker>

            {/* Route Line */}
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: mapStyles[mapStyle].lineColor,
                weight: 2,
                opacity: 0.8,
                dashArray: "10, 10",
              }}
            />
          </MapContainer>
        )}

        {!isMapReady && <MapSkeleton />}

        {/* Map Style Selector */}
        <div className="absolute top-4 right-4 z-[1000]">
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value as keyof typeof mapStyles)}
            className="input !w-auto !py-2 !px-3 text-small shadow-lg"
          >
            <option value="light">Light Map</option>
            <option value="dark">Dark Map</option>
            <option value="satellite">Satellite</option>
          </select>
        </div>

        {/* Back Button & Header */}
        <div className="absolute top-4 left-4 z-[1000]">
          <Link
            href="/shipments"
            className="btn btn-ghost bg-white shadow-lg hover:shadow-xl !py-2 !px-3 mb-4"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span className="text-small">Back to Shipments</span>
          </Link>
        </div>

        {/* Order Info Card */}
        <div className="absolute bottom-4 left-4 z-[1000] card p-4 shadow-xl max-w-sm">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: statusInfo.color + "20" }}
            >
              <StatusIcon className="w-5 h-5" style={{ color: statusInfo.color }} />
            </div>
            <div>
              <h2 className="text-h4 text-[#1B1F3B]">Shipment #{order_id}</h2>
              <span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-small text-[#4B5563]">
            <FiCalendar className="w-4 h-4" />
            <span>
              Started{" "}
              {orderData?.created_at
                ? format(new Date(orderData.created_at), "MMM dd, yyyy")
                : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-[480px] bg-white border-l border-[#E5E7EB] overflow-y-auto custom-scrollbar">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-h3 text-[#1B1F3B] mb-1">Shipment Details</h1>
            <p className="text-small text-[#4B5563]">
              Track your package journey and view order information
            </p>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="card p-4 bg-[#F4F5F7]">
              <p className="text-tiny text-[#4B5563] mb-1">Transit Time</p>
              <p className="text-h4 text-[#1B1F3B]">
                {calculateTimeDifference(orderData?.created_at)}
              </p>
            </div>
            <div className="card p-4 bg-[#F4F5F7]">
              <p className="text-tiny text-[#4B5563] mb-1">Carrier</p>
              <div className="flex items-center gap-2">
                <Image
                  src={carrierInfo.logo}
                  alt={trackingData?.tracking_company || "Carrier"}
                  width={24}
                  height={24}
                  className="object-contain"
                />
                <span className="text-small font-semibold text-[#1B1F3B]">
                  {trackingData?.tracking_company || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* Tracking Number */}
          <div className="card p-4 mb-6 border border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tiny text-[#4B5563] mb-1">Tracking Number</p>
                <p className="text-body font-semibold text-[#1B1F3B] font-mono">
                  {trackingData?.tracking_number || "N/A"}
                </p>
              </div>
              <button
                onClick={handleCopyTracking}
                className="btn btn-ghost !p-2"
                title="Copy tracking number"
              >
                <FiCopy className="w-5 h-5 text-[#4B5563]" />
              </button>
            </div>
          </div>

          {/* Route Info */}
          <div className="mb-6">
            <h3 className="text-small font-semibold text-[#1B1F3B] mb-3">Route</h3>
            <div className="relative">
              {/* Origin */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#D7E8FF] flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="w-4 h-4 text-[#3A6EA5]" />
                </div>
                <div className="flex-1">
                  <p className="text-tiny text-[#4B5563]">Origin</p>
                  <p className="text-small font-medium text-[#1B1F3B]">
                    {formattedStoreLocation || "Loading..."}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              <div className="absolute left-4 top-8 w-0.5 h-8 bg-[#E5E7EB]"></div>

              {/* Destination */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                  <FiCheckCircle className="w-4 h-4 text-[#10B981]" />
                </div>
                <div className="flex-1">
                  <p className="text-tiny text-[#4B5563]">Destination</p>
                  <p className="text-small font-medium text-[#1B1F3B]">
                    {formattedShippingLocation || "Loading..."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-6">
            <h3 className="text-small font-semibold text-[#1B1F3B] mb-3">Status Timeline</h3>
            <div className="space-y-0">
              {timelineEvents.map((event, index) => {
                const EventIcon = event.icon;
                const isLast = index === timelineEvents.length - 1;

                return (
                  <div key={index} className="relative flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        event.status === "completed"
                          ? "bg-[#D1FAE5]"
                          : event.status === "current"
                          ? "bg-[#DBEAFE]"
                          : "bg-[#F4F5F7]"
                      }`}
                    >
                      <EventIcon
                        className={`w-4 h-4 ${
                          event.status === "completed"
                            ? "text-[#10B981]"
                            : event.status === "current"
                            ? "text-[#3B82F6]"
                            : "text-[#9CA3AF]"
                        }`}
                      />
                    </div>

                    {/* Connector Line */}
                    {!isLast && (
                      <div
                        className={`absolute left-4 top-8 w-0.5 h-8 ${
                          event.status === "completed" ? "bg-[#10B981]" : "bg-[#E5E7EB]"
                        }`}
                      ></div>
                    )}

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <p
                        className={`text-small font-medium ${
                          event.status === "pending" ? "text-[#9CA3AF]" : "text-[#1B1F3B]"
                        }`}
                      >
                        {event.title}
                      </p>
                      <p className="text-tiny text-[#4B5563]">{event.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Products */}
          <div className="mb-6">
            <h3 className="text-small font-semibold text-[#1B1F3B] mb-3">
              Products ({productDetails.length})
            </h3>
            <div className="space-y-3">
              {productDetails.length > 0 ? (
                productDetails.map((product, index) => (
                  <div
                    key={index}
                    className="card p-3 border border-[#E5E7EB] flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-lg bg-[#F4F5F7] flex items-center justify-center flex-shrink-0">
                      <FiBox className="w-5 h-5 text-[#4B5563]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-small font-medium text-[#1B1F3B] truncate">
                        {product.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-tiny text-[#4B5563]">
                          <FiHash className="w-3 h-3 inline mr-0.5" />
                          {product.sku}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-small font-semibold text-[#1B1F3B]">
                        x{product.quantity}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card p-4 bg-[#F4F5F7] text-center">
                  <p className="text-small text-[#4B5563]">No products found</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={handleCopyTrackingUrl}
              className="btn btn-secondary w-full justify-center"
            >
              <FiCopy className="w-4 h-4" />
              Copy Tracking URL
            </button>

            {trackingData?.tracking_url && (
              <a
                href={trackingData.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost w-full justify-center border-2 border-[#E5E7EB]"
              >
                <FiExternalLink className="w-4 h-4" />
                Track on Carrier Website
              </a>
            )}

            <button
              onClick={() => setChatOpen(true)}
              className="btn btn-primary w-full justify-center"
            >
              <FiMessageSquare className="w-4 h-4" />
              Contact Support
            </button>

            <button
              className="btn btn-ghost w-full justify-center border-2 border-[#E5E7EB] opacity-50 cursor-not-allowed"
              disabled
              title="Label download not available"
            >
              <FiDownload className="w-4 h-4" />
              Download Label
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
