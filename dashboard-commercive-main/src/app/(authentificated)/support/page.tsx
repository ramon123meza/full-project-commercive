"use client";

import { useState } from "react";
import { Typography } from "@mui/material";
import ChatInterface from "@/components/chat/ChatInterface";
import {
  IoSearchOutline,
  IoChevronDown,
  IoChevronUp,
  IoMailOutline,
  IoChatbubblesOutline,
  IoDocumentTextOutline,
  IoStorefrontOutline,
  IoLocationOutline,
  IoBarChartOutline,
  IoWalletOutline,
  IoPersonOutline,
  IoHelpCircleOutline,
} from "react-icons/io5";
import { BiSupport } from "react-icons/bi";

/**
 * Support Center Page
 *
 * A comprehensive support hub featuring:
 * - FAQ accordion with common questions
 * - Search functionality for help articles
 * - Contact options (Live Chat, Email, Documentation)
 * - Integrated ChatInterface component for live support
 */

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const faqItems: FAQItem[] = [
  {
    id: "shopify-connect",
    question: "How do I connect my Shopify store?",
    answer:
      "To connect your Shopify store, navigate to Settings > Integrations and click 'Add Store'. Enter your Shopify store URL (e.g., yourstore.myshopify.com) and follow the OAuth authorization process. Once authorized, your store data will begin syncing automatically within a few minutes.",
    icon: <IoStorefrontOutline size={20} />,
  },
  {
    id: "track-shipments",
    question: "How do I track my shipments?",
    answer:
      "You can track all shipments from the Orders dashboard. Each order displays its current shipping status, tracking number, and carrier information. Click on any order to view detailed tracking history, estimated delivery dates, and real-time location updates when available.",
    icon: <IoLocationOutline size={20} />,
  },
  {
    id: "inventory-forecasts",
    question: "How do I understand inventory forecasts?",
    answer:
      "Our inventory forecasting system analyzes your historical sales data, seasonal trends, and current stock levels to predict future inventory needs. The forecast dashboard shows projected stockouts, recommended reorder quantities, and optimal restock dates. Green indicators mean healthy stock, yellow suggests reordering soon, and red indicates urgent attention needed.",
    icon: <IoBarChartOutline size={20} />,
  },
  {
    id: "commission-payouts",
    question: "How do commissions and payouts work?",
    answer:
      "Commissions are calculated based on your plan tier and monthly sales volume. You can view your current commission rate and pending payouts in the Billing section. Payouts are processed on the 1st and 15th of each month, with a minimum threshold of $50. Payment methods include direct bank transfer and PayPal.",
    icon: <IoWalletOutline size={20} />,
  },
  {
    id: "account-issues",
    question: "How do I resolve account issues?",
    answer:
      "For account-related issues such as login problems, password resets, or account verification, visit your Account Settings page. If you're locked out, use the 'Forgot Password' link on the login page. For security concerns or unauthorized access, contact our support team immediately through the live chat for priority assistance.",
    icon: <IoPersonOutline size={20} />,
  },
];

function FAQAccordion() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-3">
      {faqItems.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-xl border border-[#D7E8FF] overflow-hidden transition-all duration-200 hover:border-[#3A6EA5]"
        >
          <button
            onClick={() => toggleItem(item.id)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#F4F5F7] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-[#3A6EA5]">{item.icon}</span>
              <span className="font-medium text-[#1B1F3B] text-sm md:text-base">
                {item.question}
              </span>
            </div>
            <span className="text-[#4B5563] flex-shrink-0 ml-2">
              {openItems.has(item.id) ? (
                <IoChevronUp size={20} />
              ) : (
                <IoChevronDown size={20} />
              )}
            </span>
          </button>
          {openItems.has(item.id) && (
            <div className="px-5 pb-4 pt-2 border-t border-[#D7E8FF] bg-[#F4F5F7]">
              <p className="text-[#4B5563] text-sm leading-relaxed">
                {item.answer}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="relative">
      <IoSearchOutline
        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#4B5563]"
        size={20}
      />
      <input
        type="text"
        placeholder="Search help articles..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-12 pr-4 py-3 bg-white border border-[#D7E8FF] rounded-xl text-[#1B1F3B] placeholder-[#4B5563] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 transition-all"
      />
    </div>
  );
}

function ContactOptions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl border border-[#D7E8FF] p-5 hover:border-[#3A6EA5] hover:shadow-md transition-all cursor-pointer group">
        <div className="w-12 h-12 bg-[#D7E8FF] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#3A6EA5] transition-colors">
          <IoChatbubblesOutline
            size={24}
            className="text-[#3A6EA5] group-hover:text-white transition-colors"
          />
        </div>
        <h4 className="font-semibold text-[#1B1F3B] mb-1">Live Chat</h4>
        <p className="text-sm text-[#4B5563]">
          Chat with our support team in real-time
        </p>
      </div>

      <a
        href="mailto:support@commercive.com"
        className="bg-white rounded-xl border border-[#D7E8FF] p-5 hover:border-[#3A6EA5] hover:shadow-md transition-all group"
      >
        <div className="w-12 h-12 bg-[#D7E8FF] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#3A6EA5] transition-colors">
          <IoMailOutline
            size={24}
            className="text-[#3A6EA5] group-hover:text-white transition-colors"
          />
        </div>
        <h4 className="font-semibold text-[#1B1F3B] mb-1">Email Support</h4>
        <p className="text-sm text-[#4B5563]">
          support@commercive.com
        </p>
      </a>

      <a
        href="https://docs.commercive.com"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-white rounded-xl border border-[#D7E8FF] p-5 hover:border-[#3A6EA5] hover:shadow-md transition-all group"
      >
        <div className="w-12 h-12 bg-[#D7E8FF] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#3A6EA5] transition-colors">
          <IoDocumentTextOutline
            size={24}
            className="text-[#3A6EA5] group-hover:text-white transition-colors"
          />
        </div>
        <h4 className="font-semibold text-[#1B1F3B] mb-1">Documentation</h4>
        <p className="text-sm text-[#4B5563]">
          Browse guides and tutorials
        </p>
      </a>
    </div>
  );
}

export default function Page() {
  const [showChat, setShowChat] = useState(false);

  return (
    <main className="flex flex-col h-full max-h-full w-full gap-6 border-l-none md:border-l-2 border-t-2 border-[#F4F4F7] rounded-tl-0 md:rounded-tl-[24px] bg-[#F4F5F7] p-4 md:p-8 overflow-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Typography
            variant="h5"
            fontWeight="bold"
            className="flex items-center gap-3"
            sx={{
              fontSize: {
                xs: "1.25rem",
                sm: "1.5rem",
                md: "1.75rem",
              },
              color: "#1B1F3B",
            }}
          >
            <BiSupport
              style={{
                width: "28px",
                height: "28px",
              }}
              color="#3A6EA5"
            />
            Support Center
          </Typography>
          <p className="text-[#4B5563] mt-1 text-sm md:text-base">
            Find answers to your questions or get in touch with our team
          </p>
        </div>
        <button
          onClick={() => setShowChat(!showChat)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#3A6EA5] text-white rounded-xl hover:bg-[#1B1F3B] transition-colors font-medium text-sm md:text-base"
        >
          <IoChatbubblesOutline size={20} />
          {showChat ? "Hide Chat" : "Open Live Chat"}
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left Column - Help Sections */}
        <div className="flex flex-col gap-6 overflow-auto custom-scrollbar">
          {/* Search Section */}
          <div className="bg-white rounded-2xl border border-[#D7E8FF] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#D7E8FF] rounded-xl flex items-center justify-center">
                <IoSearchOutline size={20} className="text-[#3A6EA5]" />
              </div>
              <h3 className="font-semibold text-[#1B1F3B] text-lg">
                Search Help Articles
              </h3>
            </div>
            <SearchBar />
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-2xl border border-[#D7E8FF] p-6 flex-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#D7E8FF] rounded-xl flex items-center justify-center">
                <IoHelpCircleOutline size={20} className="text-[#3A6EA5]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1B1F3B] text-lg">
                  Frequently Asked Questions
                </h3>
                <p className="text-sm text-[#4B5563]">
                  Quick answers to common questions
                </p>
              </div>
            </div>
            <FAQAccordion />
          </div>

          {/* Contact Options Section */}
          <div className="bg-white rounded-2xl border border-[#D7E8FF] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#D7E8FF] rounded-xl flex items-center justify-center">
                <BiSupport size={20} className="text-[#3A6EA5]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1B1F3B] text-lg">
                  Contact Options
                </h3>
                <p className="text-sm text-[#4B5563]">
                  Choose how you'd like to reach us
                </p>
              </div>
            </div>
            <ContactOptions />
          </div>
        </div>

        {/* Right Column - Live Chat Widget */}
        <div
          className={`bg-white rounded-2xl border border-[#D7E8FF] flex flex-col transition-all duration-300 ${
            showChat ? "opacity-100" : "lg:opacity-100 opacity-0 lg:flex hidden"
          }`}
          style={{ minHeight: "500px", height: "calc(100vh - 250px)" }}
        >
          <div className="bg-gradient-to-r from-[#1B1F3B] to-[#3A6EA5] px-6 py-4 flex items-center gap-3 flex-shrink-0 rounded-t-2xl">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <IoChatbubblesOutline size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Live Chat</h3>
              <p className="text-white/70 text-sm">
                We typically reply within minutes
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatInterface />
          </div>
        </div>
      </div>

      {/* Mobile Chat Modal */}
      {showChat && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full h-[85vh] rounded-t-2xl flex flex-col animate-slide-up">
            <div className="bg-gradient-to-r from-[#1B1F3B] to-[#3A6EA5] px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <IoChatbubblesOutline size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">Live Chat</h3>
                  <p className="text-white/70 text-sm">
                    We typically reply within minutes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <IoChevronDown size={24} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatInterface />
            </div>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
