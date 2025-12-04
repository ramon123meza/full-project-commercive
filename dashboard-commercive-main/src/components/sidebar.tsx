"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStoreContext } from "@/context/StoreContext";
import { StoreRow } from "@/app/utils/types";
import LogoIcon from "./images/full-logo";

// Icons
import {
  HiHome,
  HiUsers,
  HiTicket,
  HiCurrencyDollar,
  HiCog,
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiX,
  HiMenu,
} from "react-icons/hi";
import {
  HiCube,
  HiTruck,
  HiChatBubbleLeftRight,
  HiUserGroup,
  HiUserCircle,
  HiBuildingStorefront,
  HiClipboardDocumentList,
} from "react-icons/hi2";

// Types
export interface SidebarProps {
  isOpen?: boolean;
  handleToggleSidebar?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

// Navigation configurations
const userNavItems: NavItem[] = [
  { title: "Dashboard", href: "/home", icon: <HiHome size={20} /> },
  { title: "Inventory", href: "/inventory", icon: <HiCube size={20} /> },
  { title: "Restock Analysis", href: "/restock", icon: <HiClipboardDocumentList size={20} /> },
  { title: "Shipments", href: "/shipments", icon: <HiTruck size={20} /> },
  { title: "Support", href: "/support", icon: <HiChatBubbleLeftRight size={20} /> },
  { title: "Partners", href: "/commercive-partners", icon: <HiUserGroup size={20} /> },
  { title: "Profile", href: "/profile", icon: <HiUserCircle size={20} /> },
];

const adminNavItems: NavItem[] = [
  { title: "Admin Dashboard", href: "/admin/home", icon: <HiHome size={20} /> },
  { title: "Stores Management", href: "/admin/stores", icon: <HiBuildingStorefront size={20} /> },
  { title: "Users & Roles", href: "/admin/roles", icon: <HiUsers size={20} /> },
  { title: "Leads", href: "/admin/leads", icon: <HiClipboardDocumentList size={20} /> },
  { title: "Payouts", href: "/admin/payouts", icon: <HiCurrencyDollar size={20} /> },
  { title: "Support Tickets", href: "/admin/support", icon: <HiTicket size={20} /> },
];

// Store Selector Component
const StoreSelector: React.FC<{
  isCollapsed: boolean;
  selectedStore: StoreRow | null;
  stores: StoreRow[] | null;
  onStoreSelect: (store: StoreRow) => void;
}> = ({ isCollapsed, selectedStore, stores, onStoreSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name?.slice(0, 2).toUpperCase() || "ST";
  };

  if (isCollapsed) {
    return (
      <div className="relative group px-2">
        <div className="w-10 h-10 rounded-lg bg-[var(--secondary-sky)] flex items-center justify-center cursor-pointer mx-auto">
          <span className="text-sm font-semibold text-[var(--primary-indigo)]">
            {getInitials(selectedStore?.store_name || "")}
          </span>
        </div>
        {/* Tooltip */}
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-[var(--primary-indigo)] text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {selectedStore?.store_name || "Select Store"}
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-3" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--neutral-gray)] hover:bg-[var(--secondary-sky)] transition-all"
      >
        <div className="w-10 h-10 rounded-lg bg-[var(--secondary-sky)] flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-[var(--primary-indigo)]">
            {getInitials(selectedStore?.store_name || "")}
          </span>
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-[var(--primary-indigo)] truncate">
            {selectedStore?.store_name || "Select Store"}
          </p>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${selectedStore?.is_store_listed ? "bg-[var(--success)]" : "bg-[var(--error)]"}`} />
            <span className="text-xs text-[var(--secondary-slate)]">
              {selectedStore?.is_store_listed ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        <HiChevronDown className={`w-5 h-5 text-[var(--secondary-slate)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-3 right-3 mt-2 bg-white rounded-xl shadow-[var(--shadow-xl)] border border-gray-100 z-50 overflow-hidden animate-fade-in-down">
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {stores && stores.length > 0 ? (
              stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => { onStoreSelect(store); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-[var(--secondary-sky)] transition-colors ${
                    store.id === selectedStore?.id ? "bg-[var(--secondary-sky)]" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--neutral-gray)] flex items-center justify-center">
                    <span className="text-xs font-semibold text-[var(--primary-indigo)]">
                      {getInitials(store.store_name || "")}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--primary-indigo)]">{store.store_name}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${store.is_store_listed ? "bg-[var(--success)]" : "bg-[var(--error)]"}`} />
                </button>
              ))
            ) : (
              <p className="p-4 text-sm text-[var(--secondary-slate)] text-center">No stores available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Navigation Item Component
const NavItemComponent: React.FC<{
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  isAdmin: boolean;
}> = ({ item, isActive, isCollapsed, isAdmin }) => {
  // Admin sidebar styles - white text on purple background
  const adminStyles = isAdmin
    ? isActive
      ? "bg-white/20 text-white"
      : "text-white/90 hover:text-white hover:bg-white/10"
    : "";

  return (
    <div className="relative group">
      <Link
        href={item.href}
        prefetch={false}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isCollapsed ? "justify-center px-3" : ""} ${
          isAdmin
            ? adminStyles
            : isActive
            ? "bg-[var(--secondary-sky)] text-[var(--primary-indigo)]"
            : "text-[var(--secondary-slate)] hover:bg-[var(--neutral-gray)] hover:text-[var(--primary-indigo)]"
        }`}
      >
        <span className={isAdmin ? "text-inherit" : isActive ? "text-[var(--primary-indigo)]" : "text-[var(--secondary-slate)]"}>
          {item.icon}
        </span>
        {!isCollapsed && <span className="text-sm font-medium">{item.title}</span>}
      </Link>

      {/* Tooltip when collapsed */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-[var(--primary-indigo)] text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {item.title}
        </div>
      )}
    </div>
  );
};

// User Profile Component
const UserProfile: React.FC<{
  isCollapsed: boolean;
  userinfo: { full_name?: string; email?: string } | undefined;
}> = ({ isCollapsed, userinfo }) => {
  const router = useRouter();

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return "U";
  };

  const displayName = userinfo?.full_name || userinfo?.email?.split("@")[0] || "User";

  if (isCollapsed) {
    return (
      <div className="relative group px-2">
        <button
          onClick={() => router.push("/profile")}
          className="w-10 h-10 rounded-full bg-[var(--gradient-primary)] flex items-center justify-center mx-auto hover:opacity-90 transition-opacity"
        >
          <span className="text-sm font-semibold text-white">
            {getInitials(userinfo?.full_name, userinfo?.email)}
          </span>
        </button>
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-[var(--primary-indigo)] text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {displayName}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push("/profile")}
      className="w-full flex items-center gap-3 p-3 mx-3 rounded-xl hover:bg-[var(--secondary-sky)] transition-colors"
      style={{ width: "calc(100% - 24px)" }}
    >
      <div className="w-10 h-10 rounded-full bg-[var(--gradient-primary)] flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-white">
          {getInitials(userinfo?.full_name, userinfo?.email)}
        </span>
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium text-[var(--primary-indigo)] truncate">{displayName}</p>
        <p className="text-xs text-[var(--secondary-slate)] truncate">{userinfo?.email}</p>
      </div>
      <HiCog className="w-5 h-5 text-[var(--secondary-slate)]" />
    </button>
  );
};

// Main Sidebar Component
export default function Sidebar({ isOpen, handleToggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const { selectedStore, setSelectedStore, stores, allStores, userinfo } = useStoreContext();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAdmin = pathname?.includes("/admin");
  const availableStores = userinfo?.role === "user" ? stores : allStores;

  // Get navigation items based on role
  const navItems = isAdmin ? adminNavItems : userNavItems;

  // Handle responsive collapse
  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleStoreSelect = (store: StoreRow) => {
    setSelectedStore(store);
  };

  // Desktop Sidebar
  const DesktopSidebar = () => (
    <aside
      className={`hidden md:flex flex-col h-full transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-72"
      } ${isAdmin ? "bg-gradient-to-b from-[#5B21B6] to-[#8e52f2]" : "bg-white border-r border-gray-100"}`}
    >
      {/* Header */}
      <div className={`flex items-center ${isCollapsed ? "justify-center p-4" : "justify-between p-5"} border-b ${isAdmin ? "border-white/20" : "border-gray-100"}`}>
        {!isCollapsed && (
          <div className="flex-1">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-white font-semibold text-lg">Commercive</span>
              </div>
            ) : (
              <LogoIcon width={140} height={32} color="#5B21B6" />
            )}
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 rounded-lg transition-colors ${
            isAdmin ? "hover:bg-white/10 text-white" : "hover:bg-[var(--neutral-gray)] text-[var(--secondary-slate)]"
          }`}
        >
          {isCollapsed ? <HiChevronRight size={20} /> : <HiChevronLeft size={20} />}
        </button>
      </div>

      {/* Store Selector (User only) */}
      {!isAdmin && (
        <div className="py-4">
          <StoreSelector
            isCollapsed={isCollapsed}
            selectedStore={selectedStore}
            stores={availableStores}
            onStoreSelect={handleStoreSelect}
          />
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto custom-scrollbar py-2 ${isCollapsed ? "px-2" : "px-3"}`}>
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavItemComponent
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              isCollapsed={isCollapsed}
              isAdmin={isAdmin || false}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      {!isAdmin && (
        <div className={`py-4 border-t border-gray-100 ${isCollapsed ? "" : ""}`}>
          <UserProfile isCollapsed={isCollapsed} userinfo={userinfo} />
        </div>
      )}
    </aside>
  );

  // Mobile Sidebar
  const MobileSidebar = () => (
    <>
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleToggleSidebar} />

          {/* Sidebar */}
          <aside className="relative w-72 h-full bg-white flex flex-col animate-slide-in-left">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <LogoIcon width={140} height={32} color="#1B1F3B" />
              <button
                onClick={handleToggleSidebar}
                className="p-2 rounded-lg hover:bg-[var(--neutral-gray)] text-[var(--secondary-slate)]"
              >
                <HiX size={20} />
              </button>
            </div>

            {/* Store Selector */}
            {!isAdmin && (
              <div className="py-4">
                <StoreSelector
                  isCollapsed={false}
                  selectedStore={selectedStore}
                  stores={availableStores}
                  onStoreSelect={handleStoreSelect}
                />
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 px-3">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={handleToggleSidebar}
                    className={`nav-link ${pathname === item.href ? "active" : ""}`}
                  >
                    <span className={pathname === item.href ? "" : "text-[var(--secondary-slate)]"}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* Footer */}
            {!isAdmin && (
              <div className="py-4 border-t border-gray-100">
                <UserProfile isCollapsed={false} userinfo={userinfo} />
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );

  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
