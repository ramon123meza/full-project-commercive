"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { createClient } from "../../utils/supabase/client";
import { useStoreContext } from "@/context/StoreContext";
import { PayoutViewRow, ReferralViewRow } from "@/app/utils/types";
import { AffiliateRequest } from "./AffiliateRequest";
import {
  FiDollarSign,
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
  FiCopy,
  FiUsers,
  FiPercent,
  FiShoppingCart,
  FiLink,
  FiMail,
  FiExternalLink,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { FaWhatsapp, FaTwitter } from "react-icons/fa";

const LAMBDA_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL || "";
const IS_LAMBDA_ENABLED = LAMBDA_URL && LAMBDA_URL.startsWith("https://");
const ITEMS_PER_PAGE = 10;

// Sortable header component
const SortableHeader = ({
  label,
  field,
  currentSortField,
  currentSortDirection,
  onSort,
  align = "left",
}: {
  label: string;
  field: string;
  currentSortField: string;
  currentSortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  align?: "left" | "right";
}) => (
  <th
    className={`px-4 py-3 text-xs font-semibold text-[#4B5563] uppercase cursor-pointer hover:bg-[#F4F5F7] transition-colors ${
      align === "right" ? "text-right" : "text-left"
    }`}
    onClick={() => onSort(field)}
  >
    <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
      <span>{label}</span>
      {currentSortField === field && (
        currentSortDirection === "asc" ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />
      )}
    </div>
  </th>
);

// Status badge component
const StatusBadge = ({ status }: { status: string | undefined }) => {
  const getStatusStyles = () => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "active":
      case "completed":
        return "bg-[#D1FAE5] text-[#10B981] border-[#10B981]";
      case "pending":
        return "bg-[#FEF3C7] text-[#F59E0B] border-[#F59E0B]";
      case "declined":
        return "bg-[#FEE2E2] text-[#EF4444] border-[#EF4444]";
      default:
        return "bg-[#E5E7EB] text-[#4B5563] border-[#4B5563]";
    }
  };
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusStyles()}`}>
      {status || "None"}
    </span>
  );
};

// Stat card component
const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
  bgColor,
  isLoading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  color: string;
  bgColor: string;
  isLoading?: boolean;
}) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-[#4B5563] text-sm font-medium">{title}</span>
        {isLoading ? (
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
        ) : (
          <span className="text-2xl font-bold text-[#1B1F3B]">{value}</span>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <FiTrendingUp className="w-3 h-3 text-[#10B981]" />
            <span className="text-xs text-[#10B981] font-medium">{trend}</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg`} style={{ backgroundColor: bgColor }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
  </div>
);

// Performance stat item
const PerformanceStat = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-3 p-4 bg-[#F5F3FF] rounded-lg">
    <Icon className="w-5 h-5 text-[#8e52f2]" />
    <div>
      <p className="text-xs text-[#4B5563]">{label}</p>
      <p className="text-lg font-semibold text-[#1F2937]">{value}</p>
    </div>
  </div>
);

// Lead type from new_leads table
interface Lead {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  webUrl: string | null;
  source: string | null;
  businessPlatform: string | null;
  orderUnits: string | null;
}

// Lambda order type - matches CSV import structure from admin
interface LambdaOrder {
  order_id?: string;
  order_date?: string;
  order_number?: string;
  order_number_range?: string;
  customer_code?: string;
  customer_number?: string;
  store_name?: string;
  business_type?: string;
  client_country?: string;
  client_niche?: string;
  client_group?: string;
  affiliate_id?: string;
  affiliate_name?: string;
  quantity_of_orders?: number;
  invoice_total?: number;
  commission_type?: string;
  commission_rate?: number;
  commission_per_order?: number;
  commission_earned?: number;
  status?: string;
}

export default function CommercivePartners() {
  const supabase = createClient();
  const { affiliate, userinfo, selectedStore, updateAffiliate } = useStoreContext();

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [referrals, setReferrals] = useState<ReferralViewRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutViewRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [lambdaOrders, setLambdaOrders] = useState<LambdaOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [sortField, setSortField] = useState<string>("order_time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Stats state
  const [stats, setStats] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    pendingPayouts: 0,
    availableBalance: 0,
    totalReferrals: 0,
    conversionRate: 0,
    avgOrderValue: 0,
    totalLeads: 0,
    convertedLeads: 0,
  });

  const [lambdaLink, setLambdaLink] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Payment preferences state
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'zelle' | 'wise'>('paypal');
  const [paymentDetails, setPaymentDetails] = useState({
    paypal_email: '',
    zelle_email: '',
    zelle_phone: '',
    wise_email: '',
  });
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
  const [savingPaymentPrefs, setSavingPaymentPrefs] = useState(false);
  const [showPaymentPrefsModal, setShowPaymentPrefsModal] = useState(false);

  // Always have a fallback link based on affiliate_id
  const getFallbackLink = (affId: string | undefined) => {
    if (!affId) return "";
    return `https://dashboard.commercive.co/affiliate-form?ref=${encodeURIComponent(affId)}`;
  };

  // Use affiliate link from Lambda, then from affiliate record, or generate fallback
  const affiliateLink = lambdaLink || affiliate?.form_url || getFallbackLink(affiliate?.affiliate_id);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Format currency
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Fetch referrals data from referral_view
  const fetchReferrals = useCallback(async () => {
    if (!affiliate?.affiliate_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, count, error } = await supabase
        .from("referral_view")
        .select("*", { count: "exact" })
        .eq("affiliate_id", affiliate.affiliate_id)
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)
        .order(sortField, { ascending: sortDirection === "asc" });

      if (error) {
        console.error("Error fetching referrals:", error);
        toast.error("Failed to load referral history");
      } else {
        setReferrals(data || []);
        setTotalItems(count || 0);
      }
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoading(false);
    }
  }, [affiliate?.affiliate_id, currentPage, sortField, sortDirection, supabase]);

  // Fetch leads that came through affiliate's link
  const fetchLeads = useCallback(async () => {
    if (!affiliate?.affiliate_id) return;

    try {
      // Fetch leads where source matches the affiliate_id
      const { data: leadsData, error } = await supabase
        .from("new_leads")
        .select("*")
        .eq("source", affiliate.affiliate_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching leads:", error);
      } else {
        setLeads(leadsData || []);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  }, [affiliate?.affiliate_id, supabase]);

  // Fetch stats and payouts - combines Lambda (DynamoDB) and Supabase data
  const fetchStats = useCallback(async () => {
    if (!affiliate?.affiliate_id || !userinfo?.id) {
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    try {
      let lambdaStats = null;
      let fetchedLambdaOrders: LambdaOrder[] = [];

      // First, try to fetch from Lambda/DynamoDB (this is where admin imports CSV data)
      if (IS_LAMBDA_ENABLED) {
        try {
          // Fetch summary from Lambda (crm/summary endpoint)
          const summaryResponse = await fetch(
            `${LAMBDA_URL}?action=crm/summary&affiliate_id=${encodeURIComponent(affiliate.affiliate_id)}&period=all`
          );
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            if (summaryData.summary) {
              lambdaStats = summaryData.summary;
              console.log("[Partners] Lambda stats fetched:", lambdaStats);
            }
          }

          // Fetch orders from Lambda for detailed breakdown
          const ordersResponse = await fetch(
            `${LAMBDA_URL}?action=crm/orders&affiliate_id=${encodeURIComponent(affiliate.affiliate_id)}&limit=500`
          );
          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            if (ordersData.orders) {
              fetchedLambdaOrders = ordersData.orders;
              console.log("[Partners] Lambda orders fetched:", fetchedLambdaOrders.length);
              // Store in state for display in table
              setLambdaOrders(fetchedLambdaOrders);
            }
          }
        } catch (lambdaError) {
          console.log("[Partners] Lambda not available, falling back to Supabase:", lambdaError);
        }
      }

      // Also fetch from Supabase referral_view as fallback/supplement
      const { data: allReferrals, error: refError } = await supabase
        .from("referral_view")
        .select("*")
        .eq("affiliate_id", affiliate.affiliate_id);

      if (refError) {
        console.error("Error fetching referral data:", refError);
      }

      // Fetch payouts from payout_view (aggregated by status)
      const { data: payoutData, error: payoutError } = await supabase
        .from("payout_view")
        .select("*")
        .eq("user_id", userinfo.id);

      if (payoutError) {
        console.error("Error fetching payout data:", payoutError);
      }

      // Also fetch individual payouts for the recent list
      const { data: individualPayouts } = await supabase
        .from("payouts")
        .select("*")
        .eq("user_id", userinfo.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setPayouts(payoutData || []);

      // Calculate stats - prefer Lambda data if available, otherwise use Supabase
      let totalEarnings = 0;
      let thisMonthEarnings = 0;
      let totalReferrals = 0;
      let avgOrderValue = 0;

      if (lambdaStats) {
        // Use Lambda/DynamoDB data (from CSV imports)
        totalEarnings = parseFloat(lambdaStats.total_commission || 0);
        totalReferrals = parseInt(lambdaStats.total_orders || 0);
        avgOrderValue = parseFloat(lambdaStats.average_order_value || 0);

        // Calculate this month's earnings from Lambda orders
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        thisMonthEarnings = fetchedLambdaOrders
          .filter((o) => {
            if (!o.order_date) return false;
            const orderDate = new Date(o.order_date);
            return orderDate >= thisMonthStart;
          })
          .reduce((sum, o) => sum + parseFloat(String(o.commission_earned || 0)), 0);
      } else {
        // Fall back to Supabase data
        totalEarnings = allReferrals?.reduce((sum, r) => sum + (r.total_commission || 0), 0) || 0;

        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        thisMonthEarnings = allReferrals?.filter((r) => {
          if (!r.order_time) return false;
          const orderDate = new Date(r.order_time);
          return orderDate >= thisMonthStart;
        }).reduce((sum, r) => sum + (r.total_commission || 0), 0) || 0;

        const totalInvoice = allReferrals?.reduce((sum, r) => sum + (r.invoice_total || 0), 0) || 0;
        avgOrderValue = allReferrals && allReferrals.length > 0 ? totalInvoice / allReferrals.length : 0;

        const uniqueCustomers = new Set(allReferrals?.map((r) => r.customer_number).filter(Boolean));
        totalReferrals = uniqueCustomers.size || allReferrals?.length || 0;
      }

      // Calculate payout-related stats from Supabase payouts
      const approvedPayoutsTotal = payoutData?.reduce((sum, p) => {
        if (p.status === "Approved" || p.status === "Completed") {
          return sum + (p.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

      const pendingPayouts = payoutData?.reduce((sum, p) => {
        if (p.status === "Pending") {
          return sum + (p.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

      // Calculate conversion rate from leads
      const totalLeads = leads.length;
      const convertedLeads = lambdaStats ? parseInt(lambdaStats.total_orders || 0) : (allReferrals?.length || 0);
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Available balance = total earned - approved payouts - pending payouts
      const availableBalance = Math.max(0, totalEarnings - approvedPayoutsTotal - pendingPayouts);

      setStats({
        totalEarnings,
        thisMonth: thisMonthEarnings,
        pendingPayouts,
        availableBalance,
        totalReferrals,
        conversionRate,
        avgOrderValue,
        totalLeads,
        convertedLeads,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [affiliate?.affiliate_id, userinfo?.id, leads.length, supabase]);

  // Fetch payment history from Lambda
  const fetchPaymentHistory = useCallback(async () => {
    if (!affiliate?.affiliate_id || !IS_LAMBDA_ENABLED) {
      setPaymentHistoryLoading(false);
      return;
    }

    setPaymentHistoryLoading(true);
    try {
      const response = await fetch(
        `${LAMBDA_URL}?action=crm/payments/history&affiliate_id=${encodeURIComponent(affiliate.affiliate_id)}`
      );

      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.payments || []);
      } else {
        console.error("Failed to fetch payment history from Lambda");
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      setPaymentHistory([]);
    } finally {
      setPaymentHistoryLoading(false);
    }
  }, [affiliate?.affiliate_id]);

  // Generate affiliate link - with multiple fallback strategies
  const generateLambdaLink = useCallback(async (forceCreate: boolean = false) => {
    if (!affiliate?.affiliate_id) {
      return;
    }

    // Generate a static fallback link that always works
    const generateFallbackLink = (affId: string) => {
      // Use the affiliate ID as the reference parameter
      return `https://dashboard.commercive.co/affiliate-form?ref=${encodeURIComponent(affId)}`;
    };

    setGeneratingLink(true);
    try {
      // If Lambda is not enabled, use static fallback immediately
      if (!IS_LAMBDA_ENABLED || !userinfo?.email) {
        const fallbackLink = generateFallbackLink(affiliate.affiliate_id);
        setLambdaLink(fallbackLink);

        // Save to Supabase for persistence
        await supabase
          .from("affiliates")
          .update({ form_url: fallbackLink })
          .eq("affiliate_id", affiliate.affiliate_id);

        return;
      }

      // First try to get existing link from Lambda
      const response = await fetch(
        `${LAMBDA_URL}?action=affiliate/get-link&affiliate_id=${encodeURIComponent(affiliate.affiliate_id)}`
      );

      // If link exists in Lambda, use it
      if (response.ok) {
        const data = await response.json();
        if (data.affiliate_link && !forceCreate) {
          const linkUrl = data.affiliate_link.affiliate_url || data.affiliate_link;
          if (typeof linkUrl === "string" && linkUrl.startsWith("http")) {
            setLambdaLink(linkUrl);
            return;
          }
        }
      }

      // Try to create in Lambda
      console.log("Creating affiliate link...");

      try {
        const createResponse = await fetch(LAMBDA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "affiliate/create-link",
            affiliate_id: affiliate.affiliate_id,
            affiliate_email: userinfo.email,
            store_url: selectedStore?.store_url || "",
          }),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          if (createData.affiliate_url && typeof createData.affiliate_url === "string") {
            setLambdaLink(createData.affiliate_url);

            // Update Supabase with the Lambda link
            await supabase
              .from("affiliates")
              .update({ form_url: createData.affiliate_url })
              .eq("affiliate_id", affiliate.affiliate_id);

            await updateAffiliate();
            toast.success("Affiliate link generated!");
            return;
          }
        }
      } catch (lambdaError) {
        console.error("Lambda create failed:", lambdaError);
      }

      // Fallback: Generate static link if Lambda fails
      console.log("Using fallback link generation...");
      const fallbackLink = generateFallbackLink(affiliate.affiliate_id);
      setLambdaLink(fallbackLink);

      // Save fallback to Supabase
      await supabase
        .from("affiliates")
        .update({ form_url: fallbackLink })
        .eq("affiliate_id", affiliate.affiliate_id);

      await updateAffiliate();
      toast.info("Affiliate link ready!");

    } catch (error) {
      console.error("Error generating affiliate link:", error);

      // Ultimate fallback - always generate a link
      const fallbackLink = generateFallbackLink(affiliate.affiliate_id);
      setLambdaLink(fallbackLink);

      // Try to save to Supabase silently
      try {
        await supabase
          .from("affiliates")
          .update({ form_url: fallbackLink })
          .eq("affiliate_id", affiliate.affiliate_id);
      } catch {
        // Ignore save errors, at least we have a link
      }
    } finally {
      setGeneratingLink(false);
    }
  }, [affiliate?.affiliate_id, userinfo?.email, selectedStore?.store_url, supabase, updateAffiliate]);

  // Copy link handler
  const handleCopyLink = async () => {
    if (!affiliateLink) {
      toast.error("No affiliate link available. Generate one first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopySuccess(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Share handlers
  const shareViaWhatsApp = () => {
    if (!affiliateLink) {
      toast.error("No affiliate link available");
      return;
    }
    const text = `Looking for reliable 3PL/fulfillment for your Shopify store? Check out Commercive! ${affiliateLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareViaEmail = () => {
    if (!affiliateLink) {
      toast.error("No affiliate link available");
      return;
    }
    const subject = "Check out Commercive - Great 3PL/Fulfillment Service!";
    const body = `Hey!\n\nI've been working with Commercive - they offer great 3PL and fulfillment services for Shopify stores. If you're looking for reliable fulfillment, check them out using my referral link:\n\n${affiliateLink}\n\nBest regards`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareViaTwitter = () => {
    if (!affiliateLink) {
      toast.error("No affiliate link available");
      return;
    }
    const text = `Looking for reliable 3PL/fulfillment for your Shopify store? Check out @Commercive! ${affiliateLink}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Load payment preferences
  const loadPaymentPreferences = useCallback(async () => {
    if (!affiliate?.user_id) return;

    try {
      const { data, error } = await supabase
        .from("affiliates")
        .select("auto_payout_enabled, preferred_payment_method, payment_method_details")
        .eq("user_id", affiliate.user_id)
        .single();

      if (error) {
        console.error("Error loading payment preferences:", error);
        return;
      }

      if (data) {
        setAutoPayoutEnabled(data.auto_payout_enabled || false);
        setPaymentMethod((data.preferred_payment_method as any) || 'paypal');

        const details = data.payment_method_details as any || {};
        setPaymentDetails({
          paypal_email: details.paypal_email || details.email || '',
          zelle_email: details.zelle_email || '',
          zelle_phone: details.zelle_phone || '',
          wise_email: details.wise_email || details.email || '',
        });
      }
    } catch (error) {
      console.error("Error loading payment preferences:", error);
    }
  }, [affiliate?.user_id, supabase]);

  // Save payment preferences
  const handleSavePaymentPreferences = async () => {
    if (!affiliate?.user_id) {
      toast.error("Affiliate not found");
      return;
    }

    // Validate payment details based on selected method
    if (paymentMethod === 'paypal' && !paymentDetails.paypal_email) {
      toast.error("Please enter your PayPal email");
      return;
    }
    if (paymentMethod === 'zelle' && !paymentDetails.zelle_email && !paymentDetails.zelle_phone) {
      toast.error("Please enter your Zelle email or phone");
      return;
    }
    if (paymentMethod === 'wise' && !paymentDetails.wise_email) {
      toast.error("Please enter your Wise email");
      return;
    }

    setSavingPaymentPrefs(true);
    try {
      const methodDetails: any = {};

      if (paymentMethod === 'paypal') {
        methodDetails.email = paymentDetails.paypal_email;
      } else if (paymentMethod === 'zelle') {
        methodDetails.zelle_email = paymentDetails.zelle_email;
        methodDetails.zelle_phone = paymentDetails.zelle_phone;
      } else if (paymentMethod === 'wise') {
        methodDetails.email = paymentDetails.wise_email;
        methodDetails.account_type = 'personal';
      }

      const { error } = await supabase
        .from("affiliates")
        .update({
          auto_payout_enabled: autoPayoutEnabled,
          preferred_payment_method: paymentMethod,
          payment_method_details: methodDetails,
        })
        .eq("user_id", affiliate.user_id);

      if (error) {
        console.error("Error saving payment preferences:", error);
        toast.error("Failed to save payment preferences: " + error.message);
        return;
      }

      toast.success("Payment preferences saved successfully!");
      setShowPaymentPrefsModal(false);
      await updateAffiliate();
    } catch (error) {
      console.error("Error saving payment preferences:", error);
      toast.error("Failed to save payment preferences");
    } finally {
      setSavingPaymentPrefs(false);
    }
  };

  // Request payout handler
  const handleRequestPayout = async () => {
    if (!userinfo?.id) {
      toast.error("User not authenticated");
      return;
    }

    if (stats.availableBalance < 50) {
      toast.warning("Minimum payout amount is $50");
      return;
    }

    // Check if payment preferences are set
    let paymentEmail = '';
    let methodDetails: any = {};

    if (paymentMethod === 'paypal' && paymentDetails.paypal_email) {
      paymentEmail = paymentDetails.paypal_email;
      methodDetails = { email: paymentDetails.paypal_email };
    } else if (paymentMethod === 'zelle' && (paymentDetails.zelle_email || paymentDetails.zelle_phone)) {
      paymentEmail = paymentDetails.zelle_email || paymentDetails.zelle_phone;
      methodDetails = {
        zelle_email: paymentDetails.zelle_email,
        zelle_phone: paymentDetails.zelle_phone
      };
    } else if (paymentMethod === 'wise' && paymentDetails.wise_email) {
      paymentEmail = paymentDetails.wise_email;
      methodDetails = { email: paymentDetails.wise_email, account_type: 'personal' };
    } else {
      // No payment preferences set, prompt to set them
      toast.warning("Please set up your payment preferences first");
      setShowPaymentPrefsModal(true);
      return;
    }

    try {
      const { error } = await supabase.from("payouts").insert({
        user_id: userinfo.id,
        amount: stats.availableBalance,
        status: "Pending",
        paypal_address: paymentEmail, // Legacy field
        payment_method: paymentMethod,
        payment_details: methodDetails,
        requested_at: new Date().toISOString(),
        store_url: selectedStore?.store_url || null,
      });

      if (error) {
        console.error("Error creating payout request:", error);
        toast.error("Failed to request payout: " + error.message);
        return;
      }

      toast.success("Payout request submitted successfully! We will process it within 3-5 business days.");
      fetchStats();
    } catch (error) {
      console.error("Error requesting payout:", error);
      toast.error("Failed to request payout");
    }
  };

  // Effects
  useEffect(() => {
    if (affiliate?.affiliate_id) {
      fetchReferrals();
    }
  }, [currentPage, affiliate?.affiliate_id, fetchReferrals]);

  useEffect(() => {
    if (affiliate?.affiliate_id && userinfo?.id) {
      fetchLeads();
    }
  }, [affiliate?.affiliate_id, userinfo?.id, fetchLeads]);

  useEffect(() => {
    if (affiliate?.affiliate_id && userinfo?.id) {
      fetchStats();
    }
  }, [affiliate?.affiliate_id, userinfo?.id, leads, fetchStats]);

  useEffect(() => {
    if (affiliate?.affiliate_id && IS_LAMBDA_ENABLED) {
      fetchPaymentHistory();
    }
  }, [affiliate?.affiliate_id, fetchPaymentHistory]);

  // Load payment preferences when affiliate data is available
  useEffect(() => {
    if (affiliate?.user_id) {
      loadPaymentPreferences();
    }
  }, [affiliate?.user_id, loadPaymentPreferences]);

  // Fix invalid affiliate IDs (legacy records that don't have proper AFF-XXXXXXXX format)
  const fixInvalidAffiliateId = useCallback(async () => {
    if (!affiliate?.affiliate_id || !userinfo?.id) return;

    // Check if affiliate_id is valid (should start with "AFF-" and have 12 characters total)
    const isValidId = affiliate.affiliate_id.startsWith("AFF-") && affiliate.affiliate_id.length === 12;

    if (!isValidId) {
      console.log("Invalid affiliate_id detected, generating new one...");

      // Generate a new proper affiliate ID
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let newAffiliateId = "AFF-";
      for (let i = 0; i < 8; i++) {
        newAffiliateId += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Update the affiliate record with the new ID
      const { error } = await supabase
        .from("affiliates")
        .update({ affiliate_id: newAffiliateId })
        .eq("user_id", userinfo.id);

      if (error) {
        console.error("Error updating affiliate_id:", error);
        toast.error("Failed to update affiliate ID");
      } else {
        console.log("Updated affiliate_id to:", newAffiliateId);
        toast.success("Affiliate ID updated successfully");
        // Refresh affiliate data in context
        await updateAffiliate();
      }
    }
  }, [affiliate?.affiliate_id, userinfo?.id, supabase, updateAffiliate]);

  // Run fix for invalid affiliate IDs when affiliate loads
  useEffect(() => {
    if (affiliate?.status === "Approved" && affiliate?.affiliate_id) {
      fixInvalidAffiliateId();
    }
  }, [affiliate?.status, affiliate?.affiliate_id, fixInvalidAffiliateId]);

  useEffect(() => {
    // Auto-generate affiliate link when affiliate is approved
    // Works with or without Lambda - has fallback built-in
    if (affiliate?.status === "Approved" && affiliate?.affiliate_id) {
      // Only generate if the ID is valid (starts with AFF-)
      if (affiliate.affiliate_id.startsWith("AFF-") && !lambdaLink) {
        generateLambdaLink();
      }
    }
  }, [affiliate?.status, affiliate?.affiliate_id, lambdaLink, generateLambdaLink]);

  // Render loading state
  if (loading && referrals.length === 0 && !affiliate) {
    return (
      <main className="flex-1 bg-[#F4F5F7] p-6 overflow-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#F4F5F7] p-4 md:p-6 lg:p-8 overflow-auto relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1B1F3B]">Partner Dashboard</h1>
          <p className="text-[#4B5563] mt-1">Track your affiliate performance and earnings</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={affiliate?.status} />
          {affiliate?.status === "Approved" && (
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#8e52f2] text-white rounded-lg font-medium hover:bg-[#5B21B6] transition-colors"
            >
              <FiLink className="w-4 h-4" />
              <span>Share Link</span>
            </button>
          )}
        </div>
      </div>

      {/* Balance Overview Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1B1F3B]">Balance Overview</h2>
          <button
            onClick={() => setShowPaymentHistory(!showPaymentHistory)}
            className="flex items-center gap-2 text-sm text-[#8e52f2] hover:text-[#5B21B6] font-medium"
          >
            <FiClock className="w-4 h-4" />
            <span>{showPaymentHistory ? "Hide" : "View"} Payment History</span>
          </button>
        </div>

        {/* Balance Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Earnings"
            value={formatCurrency(stats.totalEarnings)}
            icon={FiDollarSign}
            color="#10B981"
            bgColor="#D1FAE5"
            isLoading={statsLoading}
          />
          <StatCard
            title="This Month"
            value={formatCurrency(stats.thisMonth)}
            icon={FiTrendingUp}
            trend={stats.thisMonth > 0 ? "+Active" : undefined}
            color="#8e52f2"
            bgColor="#EDE9FE"
            isLoading={statsLoading}
          />
          <StatCard
            title="Total Paid Out"
            value={formatCurrency(stats.totalEarnings - stats.availableBalance - stats.pendingPayouts)}
            icon={FiCheckCircle}
            color="#3A6EA5"
            bgColor="#D7E8FF"
            isLoading={statsLoading}
          />
          <StatCard
            title="Pending Payouts"
            value={formatCurrency(stats.pendingPayouts)}
            icon={FiClock}
            color="#F59E0B"
            bgColor="#FEF3C7"
            isLoading={statsLoading}
          />
          <StatCard
            title="Available Balance"
            value={formatCurrency(stats.availableBalance)}
            icon={FiDollarSign}
            color="#10B981"
            bgColor="#D1FAE5"
            isLoading={statsLoading}
          />
        </div>

        {/* Balance Breakdown */}
        <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <FiTrendingUp className="w-5 h-5" />
                <span className="text-sm opacity-90">Lifetime Earnings</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
              <p className="text-xs opacity-80 mt-1">All-time commission earned</p>
            </div>

            <div className="bg-gradient-to-br from-[#8e52f2] to-[#5B21B6] rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <FiCheckCircle className="w-5 h-5" />
                <span className="text-sm opacity-90">Already Paid</span>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.totalEarnings - stats.availableBalance - stats.pendingPayouts)}
              </p>
              <p className="text-xs opacity-80 mt-1">Total payouts received</p>
            </div>

            <div className="bg-gradient-to-br from-[#1B1F3B] to-[#3A6EA5] rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <FiDollarSign className="w-5 h-5" />
                <span className="text-sm opacity-90">Current Balance</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(stats.availableBalance)}</p>
              <p className="text-xs opacity-80 mt-1">Available for withdrawal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      {showPaymentHistory && affiliate?.status === "Approved" && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] bg-gradient-to-r from-[#8e52f2] to-[#5B21B6]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Payment History</h2>
                <p className="text-sm text-white/80 mt-1">Track all your payout transactions</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchPaymentHistory}
                  disabled={paymentHistoryLoading}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white disabled:opacity-50"
                  title="Refresh payment history"
                >
                  <FiRefreshCw className={`w-5 h-5 ${paymentHistoryLoading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#4B5563] uppercase">Payment Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#4B5563] uppercase">Payment ID</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-[#4B5563] uppercase">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#4B5563] uppercase">Payment Method</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#4B5563] uppercase">Reference ID</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#4B5563] uppercase">Orders</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#4B5563] uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {paymentHistoryLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center">
                      <div className="flex justify-center">
                        <FiRefreshCw className="w-6 h-6 animate-spin text-[#8e52f2]" />
                      </div>
                    </td>
                  </tr>
                ) : paymentHistory.length > 0 ? (
                  paymentHistory.map((payment, index) => {
                    const paymentDate = payment.created_at
                      ? new Date(parseInt(payment.created_at)).toLocaleDateString()
                      : "-";
                    const paymentMethod = payment.payment_method || "PayPal";
                    const paymentRef = payment.payment_reference || payment.payment_id;
                    const amount = parseFloat(payment.amount || 0);
                    const ordersCount = payment.orders_count || 0;
                    const status = payment.status || "completed";

                    return (
                      <tr key={payment.payment_id || index} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-5 py-4 text-sm text-[#1B1F3B]">{paymentDate}</td>
                        <td className="px-5 py-4 text-sm text-[#4B5563] font-mono text-xs">
                          {payment.payment_id || "-"}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#10B981] text-right">
                          {formatCurrency(amount)}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#1B1F3B] capitalize">{paymentMethod}</td>
                        <td className="px-5 py-4 text-sm text-[#4B5563] font-mono text-xs">
                          {paymentRef}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#4B5563] text-center">{ordersCount}</td>
                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[#4B5563]">
                      <div className="flex flex-col items-center gap-2">
                        <FiClock className="w-8 h-8 text-[#E5E7EB]" />
                        <p>No payment history available yet.</p>
                        <p className="text-sm">Payments will appear here once processed.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Payment History Summary */}
          {paymentHistory.length > 0 && (
            <div className="px-5 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4B5563]">
                  Total Payments: <span className="font-semibold">{paymentHistory.length}</span>
                </span>
                <span className="text-sm text-[#4B5563]">
                  Total Amount Paid:{" "}
                  <span className="font-semibold text-[#10B981]">
                    {formatCurrency(
                      paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
                    )}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Affiliate Link Section */}
      {affiliate?.status === "Approved" && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1B1F3B]">Your Affiliate Link</h2>
            {IS_LAMBDA_ENABLED && (
              <button
                onClick={() => generateLambdaLink(true)}
                disabled={generatingLink}
                className="flex items-center gap-2 text-sm text-[#8e52f2] hover:text-[#5B21B6] disabled:opacity-50"
              >
                <FiRefreshCw className={`w-4 h-4 ${generatingLink ? "animate-spin" : ""}`} />
                <span>{generatingLink ? "Generating..." : "Regenerate"}</span>
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center bg-[#F4F5F7] rounded-lg px-4 py-3 border border-[#E5E7EB]">
              <FiLink className="w-4 h-4 text-[#4B5563] mr-3 flex-shrink-0" />
              {generatingLink ? (
                <span className="text-[#4B5563] text-sm">Generating link...</span>
              ) : affiliateLink ? (
                <span className="text-[#1B1F3B] truncate text-sm">{affiliateLink}</span>
              ) : (
                <span className="text-[#4B5563] text-sm">No link generated yet. Click "Regenerate" to create one.</span>
              )}
            </div>
            <button
              onClick={handleCopyLink}
              disabled={!affiliateLink || generatingLink}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed ${
                copySuccess ? "bg-[#10B981] text-white" : "bg-[#1B1F3B] text-white hover:bg-[#3A6EA5]"
              }`}
            >
              <FiCopy className="w-4 h-4" />
              <span>{copySuccess ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          {affiliateLink && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-[#4B5563] mr-2">Share via:</span>
              <button
                onClick={shareViaWhatsApp}
                className="p-2.5 rounded-lg bg-[#25D366] text-white hover:opacity-90 transition-opacity"
                title="Share on WhatsApp"
              >
                <FaWhatsapp className="w-5 h-5" />
              </button>
              <button
                onClick={shareViaEmail}
                className="p-2.5 rounded-lg bg-[#4B5563] text-white hover:opacity-90 transition-opacity"
                title="Share via Email"
              >
                <FiMail className="w-5 h-5" />
              </button>
              <button
                onClick={shareViaTwitter}
                className="p-2.5 rounded-lg bg-[#1DA1F2] text-white hover:opacity-90 transition-opacity"
                title="Share on Twitter"
              >
                <FaTwitter className="w-5 h-5" />
              </button>
              <a
                href={affiliateLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-[#3A6EA5] text-white hover:opacity-90 transition-opacity ml-auto"
                title="Preview Link"
              >
                <FiExternalLink className="w-5 h-5" />
              </a>
            </div>
          )}
          <p className="text-xs text-[#4B5563] mt-4">
            Share this link with potential Commercive clients. When they sign up and become customers, you earn commission on their orders.
          </p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Referrals Table - Shows Lambda orders if available, falls back to Supabase */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1B1F3B]">Commission History</h2>
                <p className="text-sm text-[#4B5563]">
                  Your affiliate ID: <span className="font-mono bg-[#F4F5F7] px-2 py-0.5 rounded">{affiliate?.affiliate_id || "N/A"}</span>
                </p>
              </div>
              {lambdaOrders.length > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-[#D1FAE5] text-[#10B981] rounded">
                  {lambdaOrders.length} orders from CRM
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1800px]">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <SortableHeader label="Date" field="order_date" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Order #" field="order_number" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Order Range" field="order_number_range" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Client ID" field="customer_code" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Store Name" field="store_name" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Business Type" field="business_type" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Country" field="client_country" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Niche" field="client_niche" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Group" field="client_group" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Qty" field="quantity_of_orders" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Invoice Total" field="invoice_total" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Comm. Type" field="commission_type" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Rate" field="commission_rate" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Commission" field="commission_earned" currentSortField={sortField} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {loading || statsLoading ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center">
                      <div className="flex justify-center">
                        <FiRefreshCw className="w-6 h-6 animate-spin text-[#3A6EA5]" />
                      </div>
                    </td>
                  </tr>
                ) : lambdaOrders.length > 0 ? (
                  // Display Lambda orders (from CSV imports via admin)
                  lambdaOrders.map((order, index) => (
                    <tr key={order.order_id || index} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 text-sm text-[#1B1F3B] whitespace-nowrap">
                        {order.order_date ? new Date(order.order_date).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563] font-mono">
                        {order.order_number || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563] font-mono text-xs">
                        {order.order_number_range || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {order.customer_code || order.customer_number || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1B1F3B]">
                        {order.store_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {order.business_type || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {order.client_country || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {order.client_niche || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {order.client_group || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1B1F3B] text-right">
                        {order.quantity_of_orders || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1B1F3B] text-right font-medium">
                        {formatCurrency(order.invoice_total || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {order.commission_type || "percentage"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563] text-right">
                        {order.commission_type === "fixed" || order.commission_type === "per_order"
                          ? `$${(order.commission_per_order || order.commission_rate || 0).toFixed(2)}`
                          : `${((order.commission_rate || 0.01) * 100).toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#10B981] text-right">
                        {formatCurrency(order.commission_earned || 0)}
                      </td>
                    </tr>
                  ))
                ) : referrals.length > 0 ? (
                  // Fallback to Supabase referral_view data
                  referrals.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 text-sm text-[#1B1F3B] whitespace-nowrap">
                        {item.order_time ? new Date(item.order_time).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563] font-mono">
                        {item.order_number || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563] font-mono text-xs">
                        -
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {item.customer_number || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1B1F3B]">
                        {item.store_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {item.business_type || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {item.client_country || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {item.client_niche || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {item.client_group || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1B1F3B] text-right">
                        {item.quantity_of_order || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1B1F3B] text-right font-medium">
                        {formatCurrency(item.invoice_total || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563]">
                        {item.commission_method === 1 ? "fixed" : "percentage"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4B5563] text-right">
                        {item.commission_method === 1
                          ? `$${item.commission_rate?.toFixed(2) || "0.00"}`
                          : item.commission_method === 2
                          ? `${((item.commission_rate || 0) * 100).toFixed(1)}%`
                          : "1%"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#10B981] text-right">
                        {formatCurrency(item.total_commission || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-[#4B5563]">
                      <div className="flex flex-col items-center gap-2">
                        <FiUsers className="w-8 h-8 text-[#E5E7EB]" />
                        <p>No commissions yet.</p>
                        <p className="text-sm">Share your affiliate link to start earning!</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination - only show for Supabase data */}
          {lambdaOrders.length === 0 && totalItems > ITEMS_PER_PAGE && (
            <div className="px-5 py-4 border-t border-[#E5E7EB] flex items-center justify-between">
              <span className="text-sm text-[#4B5563]">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-[#F4F5F7] text-[#1B1F3B] hover:bg-[#E5E7EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-[#F4F5F7] text-[#1B1F3B] hover:bg-[#E5E7EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {/* Lambda orders count */}
          {lambdaOrders.length > 0 && (
            <div className="px-5 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4B5563]">
                  Total Orders: <span className="font-semibold">{lambdaOrders.length}</span>
                </span>
                <span className="text-sm text-[#4B5563]">
                  Total Commission:{" "}
                  <span className="font-semibold text-[#10B981]">
                    {formatCurrency(lambdaOrders.reduce((sum, o) => sum + (o.commission_earned || 0), 0))}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Payout & Performance */}
        <div className="space-y-6">
          {/* Payment Preferences */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB]">
            <h2 className="text-lg font-semibold text-[#1B1F3B] mb-4">Payment Preferences</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#F4F5F7] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#1B1F3B]">Payment Method</p>
                  <p className="text-xs text-[#4B5563] capitalize">{paymentMethod || 'Not set'}</p>
                </div>
                <FiDollarSign className="w-5 h-5 text-[#8e52f2]" />
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F4F5F7] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#1B1F3B]">Auto Payouts</p>
                  <p className="text-xs text-[#4B5563]">{autoPayoutEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <FiCheckCircle className={`w-5 h-5 ${autoPayoutEnabled ? 'text-[#10B981]' : 'text-[#E5E7EB]'}`} />
              </div>
              {autoPayoutEnabled && (
                <div className="p-3 bg-[#EDE9FE] rounded-lg border border-[#8e52f2]">
                  <p className="text-xs text-[#5B21B6]">
                    We pay monthly (3-5 business days at beginning of month)
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowPaymentPrefsModal(true)}
              className="w-full mt-4 py-2.5 rounded-lg font-medium bg-[#F4F5F7] text-[#1B1F3B] hover:bg-[#E5E7EB] transition-colors"
            >
              Update Payment Preferences
            </button>
          </div>

          {/* Payout Request */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB]">
            <h2 className="text-lg font-semibold text-[#1B1F3B] mb-4">Request Payout</h2>
            <div className="bg-gradient-to-br from-[#1B1F3B] to-[#3A6EA5] rounded-lg p-4 text-white mb-4">
              <p className="text-sm opacity-80">Available Balance</p>
              {statsLoading ? (
                <div className="h-9 w-32 bg-white/20 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-3xl font-bold">{formatCurrency(stats.availableBalance)}</p>
              )}
            </div>
            <button
              onClick={handleRequestPayout}
              disabled={stats.availableBalance < 50 || statsLoading}
              className="w-full py-3 rounded-lg font-medium bg-[#10B981] text-white hover:bg-[#059669] disabled:bg-[#E5E7EB] disabled:text-[#4B5563] disabled:cursor-not-allowed transition-colors"
            >
              {stats.availableBalance < 50 ? "Min. $50 Required" : "Request Payout"}
            </button>
            <p className="text-xs text-[#4B5563] mt-2 text-center">
              Payouts are processed within 3-5 business days using your preferred payment method.
            </p>
            {payouts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[#4B5563]">Recent Payouts</h3>
                  {IS_LAMBDA_ENABLED && (
                    <button
                      onClick={() => setShowPaymentHistory(true)}
                      className="text-xs text-[#8e52f2] hover:text-[#5B21B6] font-medium"
                    >
                      View All
                    </button>
                  )}
                </div>
                {payouts.slice(0, 3).map((payout, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 text-sm">
                    <span className="text-[#4B5563]">{formatCurrency(payout.total_amount || 0)}</span>
                    <StatusBadge status={payout.status || "Pending"} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Stats */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB]">
            <h2 className="text-lg font-semibold text-[#1B1F3B] mb-4">Performance Stats</h2>
            <div className="space-y-3">
              <PerformanceStat
                label="Total Referrals"
                value={statsLoading ? "-" : stats.totalReferrals.toString()}
                icon={FiUsers}
              />
              <PerformanceStat
                label="Avg. Order Value"
                value={statsLoading ? "-" : formatCurrency(stats.avgOrderValue)}
                icon={FiShoppingCart}
              />
              <PerformanceStat
                label="Commission Rate"
                value="1%"
                icon={FiPercent}
              />
              {stats.totalLeads > 0 && (
                <PerformanceStat
                  label="Conversion Rate"
                  value={statsLoading ? "-" : `${stats.conversionRate.toFixed(1)}%`}
                  icon={FiTrendingUp}
                />
              )}
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB]">
            <h2 className="text-lg font-semibold text-[#1B1F3B] mb-4">How It Works</h2>
            <ol className="space-y-3 text-sm text-[#4B5563]">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D7E8FF] text-[#3A6EA5] flex items-center justify-center font-semibold text-xs">1</span>
                <span>Share your unique affiliate link with potential clients</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D7E8FF] text-[#3A6EA5] flex items-center justify-center font-semibold text-xs">2</span>
                <span>They fill out the inquiry form via your link</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D7E8FF] text-[#3A6EA5] flex items-center justify-center font-semibold text-xs">3</span>
                <span>When they become a customer, you earn 1% commission</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D7E8FF] text-[#3A6EA5] flex items-center justify-center font-semibold text-xs">4</span>
                <span>Request payout when balance reaches $50+</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#1B1F3B]">Share Your Link</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-[#F4F5F7] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-[#3A6EA5] mb-4">
              Your Affiliate ID: <span className="font-mono bg-[#F4F5F7] px-2 py-0.5 rounded">{affiliate?.affiliate_id || "N/A"}</span>
            </p>
            <div className="flex items-center bg-[#F4F5F7] rounded-lg px-4 py-3 mb-4">
              <span className="text-sm text-[#1B1F3B] truncate flex-1">{affiliateLink || "No link yet"}</span>
              <button onClick={handleCopyLink} className="ml-2 p-2 hover:bg-white rounded-lg transition-colors">
                <FiCopy className="w-4 h-4 text-[#3A6EA5]" />
              </button>
            </div>
            <div className="bg-[#F9FAFB] rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#1B1F3B]">Message Preview</span>
                <button
                  onClick={() => {
                    const text = `Looking for reliable 3PL/fulfillment for your Shopify store? Check out Commercive! ${affiliateLink}`;
                    navigator.clipboard.writeText(text);
                    toast.success("Message copied!");
                  }}
                  className="flex items-center gap-1 text-sm text-[#3A6EA5] hover:underline"
                >
                  <FiCopy className="w-3 h-3" /> Copy
                </button>
              </div>
              <p className="text-sm text-[#4B5563]">
                Looking for reliable 3PL/fulfillment for your Shopify store? Check out Commercive! {affiliateLink}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={shareViaWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-[#25D366] text-white font-medium hover:opacity-90"
              >
                <FaWhatsapp className="w-5 h-5" /> WhatsApp
              </button>
              <button
                onClick={shareViaEmail}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-[#4B5563] text-white font-medium hover:opacity-90"
              >
                <FiMail className="w-5 h-5" /> Email
              </button>
              <button
                onClick={shareViaTwitter}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-[#1DA1F2] text-white font-medium hover:opacity-90"
              >
                <FaTwitter className="w-5 h-5" /> Twitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Preferences Modal */}
      {showPaymentPrefsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#1B1F3B]">Payment Preferences</h2>
              <button
                onClick={() => setShowPaymentPrefsModal(false)}
                className="p-2 hover:bg-[#F4F5F7] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#1B1F3B] mb-3">Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                {(['paypal', 'zelle', 'wise'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === method
                        ? 'border-[#8e52f2] bg-[#F5F3FF]'
                        : 'border-[#E5E7EB] hover:border-[#8e52f2]/50'
                    }`}
                  >
                    <div className="text-center">
                      <FiDollarSign className={`w-6 h-6 mx-auto mb-2 ${paymentMethod === method ? 'text-[#8e52f2]' : 'text-[#4B5563]'}`} />
                      <p className={`text-sm font-medium capitalize ${paymentMethod === method ? 'text-[#8e52f2]' : 'text-[#4B5563]'}`}>
                        {method}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              {paymentMethod === 'paypal' && (
                <div>
                  <label className="block text-sm font-medium text-[#1B1F3B] mb-2">PayPal Email</label>
                  <input
                    type="email"
                    value={paymentDetails.paypal_email}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, paypal_email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8e52f2] focus:border-transparent"
                  />
                </div>
              )}

              {paymentMethod === 'zelle' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1B1F3B] mb-2">Zelle Email</label>
                    <input
                      type="email"
                      value={paymentDetails.zelle_email}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, zelle_email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8e52f2] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1B1F3B] mb-2">Zelle Phone (Optional)</label>
                    <input
                      type="tel"
                      value={paymentDetails.zelle_phone}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, zelle_phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                      className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8e52f2] focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'wise' && (
                <div>
                  <label className="block text-sm font-medium text-[#1B1F3B] mb-2">Wise Email</label>
                  <input
                    type="email"
                    value={paymentDetails.wise_email}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, wise_email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8e52f2] focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <div className="mb-6 p-4 bg-[#F4F5F7] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-[#1B1F3B]">Enable Automatic Monthly Payouts</p>
                  <p className="text-xs text-[#4B5563] mt-1">
                    We pay monthly (3-5 business days at beginning of month)
                  </p>
                </div>
                <button
                  onClick={() => setAutoPayoutEnabled(!autoPayoutEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    autoPayoutEnabled ? 'bg-[#8e52f2]' : 'bg-[#E5E7EB]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      autoPayoutEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleSavePaymentPreferences}
              disabled={savingPaymentPrefs}
              className="w-full py-3 rounded-lg font-medium bg-[#8e52f2] text-white hover:bg-[#5B21B6] disabled:bg-[#E5E7EB] disabled:text-[#4B5563] disabled:cursor-not-allowed transition-colors"
            >
              {savingPaymentPrefs ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* Affiliate Request Overlay */}
      {(!affiliate || affiliate.status === "Pending" || affiliate.status === "Declined") && (
        <AffiliateRequest balance={stats.availableBalance} />
      )}
    </main>
  );
}
