"use client";

import { FC } from "react";
import { FiLock, FiMail, FiShoppingBag } from "react-icons/fi";

interface LockedScreenProps {
  type?: "pending_approval" | "no_permission" | "install_shopify_app";
  resource?: string;
}

const LockedScreen: FC<LockedScreenProps> = ({
  type = "no_permission",
  resource = "this section",
}) => {
  if (type === "install_shopify_app") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#5B21B6] to-[#8e52f2] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center">
              <FiShoppingBag className="w-12 h-12 text-[#8e52f2]" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-[#1B1F3B] mb-4 text-center">
            Connect Your Shopify Store
          </h1>

          {/* Message */}
          <p className="text-[#4B5563] mb-6 leading-relaxed text-center">
            To access your Commercive dashboard, you need to install the Commercive app on your Shopify store.
          </p>

          {/* Benefits Section */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#1B1F3B] mb-4">
              Why connect your store?
            </h2>
            <ul className="space-y-3 text-[#4B5563]">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Track inventory in real-time across all your products</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Manage orders and fulfillment seamlessly</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Access powerful analytics and insights</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Sync customer data automatically</span>
              </li>
            </ul>
          </div>

          {/* Installation Steps */}
          <div className="bg-[#F9FAFB] rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#1B1F3B] mb-4">
              How to install:
            </h2>
            <ol className="space-y-3 text-[#4B5563]">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#8e52f2] text-white flex items-center justify-center text-sm font-bold mr-3">1</span>
                <span>Click the button below to visit the Shopify App Store</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#8e52f2] text-white flex items-center justify-center text-sm font-bold mr-3">2</span>
                <span>Install the Commercive app on your Shopify store</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#8e52f2] text-white flex items-center justify-center text-sm font-bold mr-3">3</span>
                <span>Complete the authentication process to connect your store</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#8e52f2] text-white flex items-center justify-center text-sm font-bold mr-3">4</span>
                <span>Return to this page and you'll have full access to your dashboard</span>
              </li>
            </ol>
          </div>

          {/* CTA Button */}
          <div className="text-center mb-6">
            <a
              href="https://apps.shopify.com/commercive"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#5B21B6] to-[#8e52f2] text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <FiShoppingBag className="mr-2" />
              Install Commercive App
            </a>
          </div>

          {/* Support link */}
          <p className="text-sm text-[#4B5563] text-center">
            Need assistance?{" "}
            <a
              href="/support"
              className="text-[#8e52f2] hover:underline font-semibold"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (type === "pending_approval") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#5B21B6] to-[#8e52f2] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
              <FiMail className="w-10 h-10 text-yellow-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-[#1B1F3B] mb-4">
            Account Pending Approval
          </h1>

          {/* Message */}
          <p className="text-[#4B5563] mb-6 leading-relaxed">
            Thank you for creating an account with Commercive! Your account is currently pending admin approval.
          </p>

          <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-xl p-4 mb-6">
            <p className="text-sm text-[#92400E]">
              <strong>What happens next?</strong>
              <br />
              Our admin team will review your account and you'll receive an email notification once your account has been approved. This typically takes 24-48 hours.
            </p>
          </div>

          {/* Support link */}
          <p className="text-sm text-[#4B5563]">
            Need help?{" "}
            <a
              href="/support"
              className="text-[#8e52f2] hover:underline font-semibold"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-gray-200">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <FiLock className="w-10 h-10 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[#1B1F3B] mb-4">
          Access Restricted
        </h1>

        {/* Message */}
        <p className="text-[#4B5563] mb-6 leading-relaxed">
          You don't have permission to access {resource}. Please contact your administrator to request access.
        </p>

        <div className="bg-[#F3F4F6] rounded-xl p-4 mb-6">
          <p className="text-sm text-[#4B5563]">
            <strong>Need access?</strong>
            <br />
            Contact your account administrator to request the necessary permissions for this resource.
          </p>
        </div>

        {/* Support link */}
        <p className="text-sm text-[#4B5563]">
          Questions?{" "}
          <a
            href="/support"
            className="text-[#8e52f2] hover:underline font-semibold"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default LockedScreen;
