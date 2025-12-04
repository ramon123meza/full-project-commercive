"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/utils/supabase/client";
import { useStoreContext } from "@/context/StoreContext";

// Icons
import {
  HiOutlineBell,
  HiOutlineSearch,
  HiOutlineMenu,
  HiOutlineX,
  HiChevronRight,
  HiOutlineUser,
  HiOutlineCog,
  HiOutlineQuestionMarkCircle,
  HiOutlineLogout,
  HiHome,
} from "react-icons/hi";

// Portal component for dropdowns
const DropdownPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 99999 }}>
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>,
    document.body
  );
};

export interface HeaderProps {
  toggleSidebar?: () => void;
}

// Route configuration for titles and breadcrumbs
const routeConfig: Record<string, { title: string; parent?: string }> = {
  "/home": { title: "Dashboard" },
  "/inventory": { title: "Inventory" },
  "/shipments": { title: "Shipments" },
  "/support": { title: "Support" },
  "/commercive-partners": { title: "Partners" },
  "/profile": { title: "Profile" },
  "/reset-password": { title: "Change Password", parent: "/profile" },
  "/admin/home": { title: "Admin Dashboard" },
  "/admin/stores": { title: "Stores Management" },
  "/admin/roles": { title: "Users & Roles" },
  "/admin/leads": { title: "Leads" },
  "/admin/payouts": { title: "Payouts" },
  "/admin/support": { title: "Support Tickets" },
  "/admin/tickets": { title: "Tickets" },
  "/admin/partners": { title: "Partners" },
  "/admin/inventory": { title: "Inventory" },
};

// Breadcrumb component
const Breadcrumbs: React.FC<{ pathname: string }> = ({ pathname }) => {
  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; href: string }[] = [];
    const currentRoute = routeConfig[pathname];

    if (!currentRoute) return crumbs;

    // Add home
    const isAdmin = pathname.startsWith("/admin");
    crumbs.push({
      label: isAdmin ? "Admin" : "Home",
      href: isAdmin ? "/admin/home" : "/home",
    });

    // Add parent if exists
    if (currentRoute.parent) {
      const parentRoute = routeConfig[currentRoute.parent];
      if (parentRoute) {
        crumbs.push({
          label: parentRoute.title,
          href: currentRoute.parent,
        });
      }
    }

    // Add current page (not clickable)
    if (pathname !== "/home" && pathname !== "/admin/home") {
      crumbs.push({
        label: currentRoute.title,
        href: pathname,
      });
    }

    return crumbs;
  }, [pathname]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.href}>
          {index > 0 && (
            <HiChevronRight className="w-4 h-4 text-[var(--secondary-slate)] opacity-50" />
          )}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-[var(--primary-indigo)] font-medium">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-[var(--secondary-slate)] hover:text-[var(--primary-blue)] transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Search Input component
const SearchInput: React.FC<{ isExpanded: boolean; onToggle: () => void }> = ({
  isExpanded,
  onToggle,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  return (
    <div className="relative">
      {/* Desktop Search */}
      <div className="hidden md:flex items-center">
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-10 pr-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#8e52f2] focus:ring-2 focus:ring-[#8e52f2]/20 transition-all placeholder-gray-500 shadow-sm"
          />
        </div>
      </div>

      {/* Mobile Search Toggle */}
      <button
        onClick={onToggle}
        className="md:hidden p-2 rounded-lg hover:bg-[var(--neutral-gray)] transition-colors"
        aria-label="Toggle search"
      >
        {isExpanded ? (
          <HiOutlineX className="w-5 h-5 text-[var(--secondary-slate)]" />
        ) : (
          <HiOutlineSearch className="w-5 h-5 text-[var(--secondary-slate)]" />
        )}
      </button>

      {/* Mobile Search Expanded */}
      {isExpanded && (
        <div className="md:hidden absolute top-full right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm animate-fade-in-down">
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--secondary-slate)]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none focus:border-[var(--primary-blue)] transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Notification Bell component
const NotificationBell: React.FC<{ count?: number }> = ({ count = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[var(--neutral-gray)] transition-colors"
        aria-label="Notifications"
      >
        <HiOutlineBell className="w-5 h-5 text-[var(--secondary-slate)]" />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white bg-[var(--error)] rounded-full">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Notification Dropdown - Using Portal */}
      {isOpen && (
        <DropdownPortal>
          <div
            ref={dropdownRef}
            className="fixed w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-down"
            style={{
              top: dropdownPosition.top,
              right: dropdownPosition.right,
              maxHeight: 'calc(100vh - 100px)'
            }}
          >
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--primary-indigo)]">Notifications</h3>
                {count > 0 && (
                  <span className="badge badge-info">{count} new</span>
                )}
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {count === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--neutral-gray)] flex items-center justify-center">
                    <HiOutlineBell className="w-6 h-6 text-[var(--secondary-slate)]" />
                  </div>
                  <p className="text-sm text-[var(--secondary-slate)]">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Sample notification items */}
                  <div className="p-4 hover:bg-[var(--neutral-gray)] transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-[var(--primary-indigo)]">New shipment arrived</p>
                    <p className="text-xs text-[var(--secondary-slate)] mt-1">2 minutes ago</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-gray-100 bg-[var(--neutral-gray)]">
              <button className="w-full text-center text-sm font-medium text-[var(--primary-blue)] hover:underline">
                View all notifications
              </button>
            </div>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
};

// User Dropdown Menu component
const UserDropdown: React.FC<{
  userEmail: string | null;
  userName: string | null;
  onLogout: () => void;
  onOpenHelp: () => void;
}> = ({ userEmail, userName, onLogout, onOpenHelp }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  const getInitials = (name: string | null, email: string | null): string => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const displayName = userName || userEmail?.split("@")[0] || "User";
  const initials = getInitials(userName, userEmail);

  const menuItems = [
    {
      icon: <HiOutlineUser className="w-4 h-4" />,
      label: "Profile",
      action: () => {
        router.push("/profile");
        setIsOpen(false);
      },
    },
    {
      icon: <HiOutlineCog className="w-4 h-4" />,
      label: "Settings",
      action: () => {
        router.push("/reset-password");
        setIsOpen(false);
      },
    },
    {
      icon: <HiOutlineQuestionMarkCircle className="w-4 h-4" />,
      label: "Help & Support",
      action: () => {
        onOpenHelp();
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-[var(--neutral-gray)] transition-colors"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-indigo)] to-[var(--primary-blue)] flex items-center justify-center">
          <span className="text-xs font-semibold text-white">{initials}</span>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--secondary-slate)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* User Dropdown Menu - Using Portal */}
      {isOpen && (
        <DropdownPortal>
          <div
            ref={dropdownRef}
            className="fixed w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-down"
            style={{
              top: dropdownPosition.top,
              right: dropdownPosition.right,
              maxHeight: 'calc(100vh - 100px)'
            }}
          >
            {/* User Info Header */}
            <div className="p-4 bg-gradient-to-r from-[var(--primary-indigo)] to-[var(--primary-blue)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-lg font-semibold text-white">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{displayName}</p>
                  <p className="text-sm text-white/70 truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--secondary-slate)] hover:text-[var(--primary-indigo)] hover:bg-[var(--secondary-sky)] rounded-lg transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Sign Out */}
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--error)] hover:bg-[var(--error-light)] rounded-lg transition-colors"
              >
                <HiOutlineLogout className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
};

// Main Header Component
const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const supabase = createClient();
  const pathname = usePathname();
  const { setChatOpen, userinfo } = useStoreContext();

  // Get page title from route config
  const pageTitle = useMemo(() => {
    if (!pathname) return "Dashboard";
    return routeConfig[pathname]?.title || "Dashboard";
  }, [pathname]);

  // Fetch user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching current user:", error.message);
      } else {
        setUserEmail(data.user?.email || null);
      }
    };

    fetchCurrentUser();
  }, [supabase]);

  // Update user info from context
  useEffect(() => {
    if (userinfo) {
      setUserName(userinfo.full_name || null);
      if (userinfo.email) {
        setUserEmail(userinfo.email);
      }
    }
  }, [userinfo]);

  // Handle logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = "/login";
    }
  };

  // Handle help/support
  const handleOpenHelp = () => {
    setChatOpen(true);
  };

  return (
    <header className="w-full header-glass border-b border-gray-100 sticky top-0 z-[150]">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--neutral-gray)] transition-colors"
            aria-label="Toggle menu"
          >
            <HiOutlineMenu className="w-5 h-5 text-[var(--secondary-slate)]" />
          </button>

          {/* Page Title and Breadcrumbs */}
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-[var(--primary-indigo)]">
              {pageTitle}
            </h1>
            <Breadcrumbs pathname={pathname || ""} />
          </div>

          {/* Mobile Title Only */}
          <h1 className="sm:hidden text-base font-semibold text-[var(--primary-indigo)]">
            {pageTitle}
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Search */}
          <SearchInput
            isExpanded={isSearchExpanded}
            onToggle={() => setIsSearchExpanded(!isSearchExpanded)}
          />

          {/* Notifications */}
          <NotificationBell count={0} />

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-gray-200 mx-2" />

          {/* User Dropdown */}
          <UserDropdown
            userEmail={userEmail}
            userName={userName}
            onLogout={handleLogout}
            onOpenHelp={handleOpenHelp}
          />
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {isSearchExpanded && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-20"
          onClick={() => setIsSearchExpanded(false)}
        />
      )}
    </header>
  );
};

export default Header;
