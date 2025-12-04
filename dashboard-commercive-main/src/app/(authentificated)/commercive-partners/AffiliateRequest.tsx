import { useState } from "react";
import CustomButton from "../../../components/ui/custom-button";
import { createClient } from "@/app/utils/supabase/client";
import { toast } from "react-toastify";
import { useStoreContext } from "@/context/StoreContext";
import { FiClock, FiXCircle, FiUsers, FiDollarSign, FiLink, FiCheckCircle } from "react-icons/fi";

// Generate a unique affiliate ID (format: AFF-XXXXXXXX)
const generateAffiliateId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'AFF-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const AffiliateRequest = ({ balance }: { balance: number }) => {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const { affiliate, userinfo, updateAffiliate, selectedStore } = useStoreContext();

  const handleSave = async () => {
    if (!userinfo?.id) {
      toast.error("User not authenticated");
      return;
    }

    setIsLoading(true);
    try {
      // Generate a unique affiliate ID
      const affiliateId = generateAffiliateId();

      const { error } = await supabase
        .from("affiliates")
        .insert({
          user_id: userinfo.id,
          status: "Pending",
          affiliate_id: affiliateId,
          store_url: selectedStore?.store_url || null,
        });

      if (error) {
        console.error("Error creating affiliate request:", error);
        toast.error("Failed to submit affiliate request");
      } else {
        toast.success("Affiliate request submitted successfully!");
        await updateAffiliate();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const isPending = affiliate?.status === "Pending";
  const isDeclined = affiliate?.status === "Declined";

  // Pending state UI
  if (isPending) {
    return (
      <div className="absolute w-full h-full bg-white/80 backdrop-blur-sm left-0 top-0 z-10">
        <div className="absolute w-[500px] max-w-[90%] left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#F59E0B] flex items-center justify-center">
                <FiClock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#92400E]">Application Pending</h2>
                <p className="text-sm text-[#B45309]">Your affiliate request is under review</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-xl p-4 mb-6">
              <p className="text-sm text-[#92400E]">
                <strong>Good news!</strong> Your affiliate application has been submitted successfully.
                Our team is reviewing your request and will approve it shortly.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-[#4B5563]">What to expect:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#4B5563]">Review typically takes 24-48 hours</span>
                </div>
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#4B5563]">You'll receive an email once approved</span>
                </div>
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#4B5563]">Your affiliate link will be ready immediately after approval</span>
                </div>
              </div>
            </div>

            <div className="bg-[#F4F5F7] rounded-xl p-4">
              <p className="text-xs text-[#4B5563] text-center">
                Your Affiliate ID: <span className="font-mono font-semibold">{affiliate?.affiliate_id || "Generating..."}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Declined state UI
  if (isDeclined) {
    return (
      <div className="absolute w-full h-full bg-white/80 backdrop-blur-sm left-0 top-0 z-10">
        <div className="absolute w-[500px] max-w-[90%] left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#FEE2E2] to-[#FECACA] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#EF4444] flex items-center justify-center">
                <FiXCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#991B1B]">Application Declined</h2>
                <p className="text-sm text-[#B91C1C]">Your affiliate request was not approved</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 mb-6">
              <p className="text-sm text-[#991B1B]">
                Unfortunately, your affiliate application was not approved at this time.
                Please contact our support team for more information.
              </p>
            </div>

            <button
              onClick={() => window.location.href = "mailto:support@commercive.co"}
              className="w-full py-3 rounded-lg font-medium bg-[#1B1F3B] text-white hover:bg-[#3A6EA5] transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  // New user - Join Now state
  return (
    <div className="absolute w-full h-full bg-white/80 backdrop-blur-sm left-0 top-0 z-10">
      <div className="absolute w-[500px] max-w-[90%] left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8e52f2] to-[#5B21B6] px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <FiUsers className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Join Our Affiliate Program</h2>
              <p className="text-sm text-white/80">Earn commission on every referral</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[#4B5563] mb-6">
            Turn your network into income! Share Commercive with businesses looking for reliable
            fulfillment services and earn <strong>1% commission</strong> on every order they place.
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-[#F5F3FF] rounded-lg">
              <FiLink className="w-5 h-5 text-[#8e52f2]" />
              <span className="text-sm font-medium text-[#5B21B6]">Unique Affiliate Link</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F5F3FF] rounded-lg">
              <FiDollarSign className="w-5 h-5 text-[#8e52f2]" />
              <span className="text-sm font-medium text-[#5B21B6]">1% Commission</span>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-[#F4F5F7] rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-[#1B1F3B] mb-3">How it works:</h3>
            <ol className="space-y-2 text-sm text-[#4B5563]">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#8e52f2] text-white text-xs flex items-center justify-center">1</span>
                <span>Click "Join Now" to submit your affiliate request</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#8e52f2] text-white text-xs flex items-center justify-center">2</span>
                <span>We'll review and approve your request (usually within 24-48 hours)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#8e52f2] text-white text-xs flex items-center justify-center">3</span>
                <span>Share your unique link and start earning!</span>
              </li>
            </ol>
          </div>

          <CustomButton
            label="Join Now"
            callback={handleSave}
            className="w-full py-3 bg-[#8e52f2] text-white hover:bg-[#5B21B6] font-semibold rounded-lg transition-colors"
            interactingAPI={isLoading}
          />
        </div>
      </div>
    </div>
  );
};
