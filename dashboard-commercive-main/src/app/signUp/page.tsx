"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import LogoIcon from "@/components/images/full-logo";
import { createClient } from "../utils/supabase/client";

// Password requirement checker
interface PasswordRequirement {
  label: string;
  met: boolean;
}

function checkPasswordStrength(password: string): {
  requirements: PasswordRequirement[];
  strength: "weak" | "medium" | "strong";
  percentage: number;
} {
  const requirements: PasswordRequirement[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const percentage = (metCount / requirements.length) * 100;

  let strength: "weak" | "medium" | "strong" = "weak";
  if (metCount >= 4) strength = "strong";
  else if (metCount >= 3) strength = "medium";

  return { requirements, strength, percentage };
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone number formatting and validation
function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
}

function isValidPhone(phone: string): boolean {
  const numbers = phone.replace(/\D/g, "");
  return numbers.length === 10;
}

// Check icon component
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      width="20"
      height="20"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Hero section features
const features = [
  {
    title: "Real-time Analytics",
    description: "Track your store performance with live dashboards",
  },
  {
    title: "AI-Powered Insights",
    description: "Get smart recommendations to boost your sales",
  },
  {
    title: "Seamless Integration",
    description: "Connect your Shopify store in minutes",
  },
  {
    title: "24/7 Support",
    description: "Expert help whenever you need it",
  },
];

function SignupForm() {
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Touched state for validation display
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phoneNumber: false,
    password: false,
    confirmPassword: false,
  });

  // Password strength calculation
  const passwordCheck = useMemo(() => checkPasswordStrength(password), [password]);

  // Validation
  const validations = {
    firstName: firstName.trim().length > 0,
    lastName: lastName.trim().length > 0,
    email: isValidEmail(email),
    phoneNumber: isValidPhone(phoneNumber),
    password: passwordCheck.strength !== "weak",
    confirmPassword: confirmPassword === password && confirmPassword.length > 0,
    terms: agreedToTerms,
  };

  const isFormValid = Object.values(validations).every(Boolean);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Generate a unique affiliate ID (format: AFF-XXXXXXXX)
  const generateAffiliateId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'AFF-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error("Please fill in all fields correctly");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
            userName: `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
            phoneNumber: phoneNumber.replace(/\D/g, ""),
            referralCode: "",
            visible_store: [],
            role: "user",
          },
        },
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes("rate limit") || error.status === 429) {
          toast.error("Too many signup attempts. Please wait a few minutes and try again.");
        } else if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
      } else {
        // Auto-create affiliate request for new users with Pending status
        if (data?.user?.id) {
          const affiliateId = generateAffiliateId();
          try {
            // Create affiliate record with Pending status - user must be approved by admin
            const { error: affiliateError } = await supabase.from("affiliates").insert({
              user_id: data.user.id,
              status: "Pending", // User account is locked until admin approves
              affiliate_id: affiliateId,
            });

            if (affiliateError) {
              console.error("Failed to create affiliate record:", affiliateError);
            } else {
              // Send notification to admin about new account
              try {
                await fetch("/api/notify-admin-new-account", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email,
                    firstName,
                    lastName,
                    affiliateId,
                  }),
                });
              } catch (notifyError) {
                console.error("Failed to notify admin:", notifyError);
              }
            }
          } catch (affiliateError) {
            // Don't block signup if affiliate creation fails
            console.error("Failed to create affiliate record:", affiliateError);
          }
        }
        // Show success modal instead of toast
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      // Handle network or rate limit errors
      if (error?.status === 429 || error?.message?.includes("429")) {
        toast.error("Too many requests. Please wait a few minutes before trying again.");
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    switch (passwordCheck.strength) {
      case "strong":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-red-500";
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Section */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #5B21B6 0%, #8e52f2 100%)",
        }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          {/* Logo */}
          <div className="mb-12">
            <LogoIcon width={180} height={50} color="#ffffff" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-bold mb-4 leading-tight">
            Join thousands of
            <br />
            <span className="text-[#EDE9FE]">Shopify store owners</span>
          </h1>

          <p className="text-lg text-gray-300 mb-10 max-w-md">
            Take control of your e-commerce business with powerful analytics and
            insights that drive growth.
          </p>

          {/* Features */}
          <div className="space-y-5 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#EDE9FE] flex items-center justify-center mt-0.5">
                  <CheckIcon className="w-4 h-4 text-[#5B21B6]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-gray-300">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats/Testimonial */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#8e52f2] border-2 border-white/20 flex items-center justify-center text-xs font-bold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-300">4.9/5 from 2,000+ reviews</p>
              </div>
            </div>
            <p className="text-sm italic text-gray-200">
              &ldquo;Commercive transformed how I understand my store&apos;s performance.
              The insights helped me increase revenue by 40% in just 3 months.&rdquo;
            </p>
            <p className="text-sm font-semibold mt-2 text-[#EDE9FE]">
              - Sarah M., Fashion Boutique Owner
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <LogoIcon width={150} height={40} color="#1B1F3B" />
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#1B1F3B]">Create your account</h2>
              <p className="text-[#4B5563] mt-2">Start your free trial today</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-[#4B5563] mb-1.5"
                  >
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onBlur={() => handleBlur("firstName")}
                    placeholder="John"
                    required
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      touched.firstName && !validations.firstName
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-[#8e52f2]/30 focus:border-[#8e52f2]"
                    }`}
                  />
                  {touched.firstName && !validations.firstName && (
                    <p className="text-red-500 text-xs mt-1">First name is required</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-[#4B5563] mb-1.5"
                  >
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onBlur={() => handleBlur("lastName")}
                    placeholder="Doe"
                    required
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      touched.lastName && !validations.lastName
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-[#8e52f2]/30 focus:border-[#8e52f2]"
                    }`}
                  />
                  {touched.lastName && !validations.lastName && (
                    <p className="text-red-500 text-xs mt-1">Last name is required</p>
                  )}
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#4B5563] mb-1.5"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="john@example.com"
                  required
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    touched.email && !validations.email
                      ? "border-red-400 focus:ring-red-200"
                      : "border-gray-300 focus:ring-[#8e52f2]/30 focus:border-[#8e52f2]"
                  }`}
                />
                {touched.email && !validations.email && email.length > 0 && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid email</p>
                )}
              </div>

              {/* Phone Number Field */}
              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-medium text-[#4B5563] mb-1.5"
                >
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onBlur={() => handleBlur("phoneNumber")}
                  placeholder="(555) 123-4567"
                  required
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    touched.phoneNumber && !validations.phoneNumber
                      ? "border-red-400 focus:ring-red-200"
                      : "border-gray-300 focus:ring-[#8e52f2]/30 focus:border-[#8e52f2]"
                  }`}
                />
                {touched.phoneNumber && !validations.phoneNumber && phoneNumber.length > 0 && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid 10-digit phone number</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#4B5563] mb-1.5"
                >
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur("password")}
                    placeholder="Create a strong password"
                    required
                    className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      touched.password && !validations.password
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-[#8e52f2]/30 focus:border-[#8e52f2]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#1B1F3B]"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                          style={{ width: `${passwordCheck.percentage}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          passwordCheck.strength === "strong"
                            ? "text-green-600"
                            : passwordCheck.strength === "medium"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {passwordCheck.strength.charAt(0).toUpperCase() + passwordCheck.strength.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {passwordCheck.requirements.map((req, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-1 text-xs ${
                            req.met ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {req.met ? (
                            <CheckIcon className="w-3 h-3" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-gray-300" />
                          )}
                          {req.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-[#4B5563] mb-1.5"
                >
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    placeholder="Confirm your password"
                    required
                    className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      touched.confirmPassword && !validations.confirmPassword
                        ? "border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:ring-[#8e52f2]/30 focus:border-[#8e52f2]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#1B1F3B]"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {touched.confirmPassword && !validations.confirmPassword && confirmPassword.length > 0 && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#8e52f2] border-gray-300 rounded focus:ring-[#8e52f2]/30 cursor-pointer accent-[#8e52f2]"
                />
                <label htmlFor="terms" className="text-sm text-[#4B5563] cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms" className="text-[#8e52f2] hover:underline font-medium">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-[#8e52f2] hover:underline font-medium">
                    Privacy Policy
                  </a>
                  <span className="text-red-500"> *</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                  isFormValid && !isLoading
                    ? "bg-[#5B21B6] hover:bg-[#8e52f2] cursor-pointer shadow-lg hover:shadow-xl"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-[#4B5563]">
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-[#8e52f2] hover:text-[#5B21B6] font-semibold hover:underline transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[#4B5563] mt-6">
            Protected by industry-leading security standards
          </p>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl animate-in fade-in zoom-in duration-300">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-[#1B1F3B] text-center mb-2">
              Account Created Successfully!
            </h2>

            {/* Email Icon & Instructions */}
            <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#0EA5E9] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[#0C4A6E] mb-1">Check Your Email</h3>
                  <p className="text-sm text-[#0369A1]">
                    We've sent a confirmation link to <span className="font-medium">{email}</span>.
                    Click the link in the email to verify your account before signing in.
                  </p>
                </div>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-[#92400E]">
                  <strong>Important:</strong> You must click the verification link before you can sign in.
                  Check your spam folder if you don't see the email within a few minutes.
                </p>
              </div>
            </div>

            {/* What's Next */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-[#4B5563] mb-3">What happens next?</h4>
              <ol className="space-y-2 text-sm text-[#4B5563]">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#8e52f2] text-white text-xs flex items-center justify-center">1</span>
                  <span>Verify your email by clicking the confirmation link</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#8e52f2] text-white text-xs flex items-center justify-center">2</span>
                  <span>Sign in to your new account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#8e52f2] text-white text-xs flex items-center justify-center">3</span>
                  <span>Visit the Partners section to get your affiliate link</span>
                </li>
              </ol>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/login");
              }}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-[#5B21B6] hover:bg-[#8e52f2] transition-colors"
            >
              Go to Sign In
            </button>

            <p className="text-center text-xs text-[#4B5563] mt-4">
              Didn't receive the email? Check your spam folder or contact support.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#8e52f2]/30" />
            <p className="text-[#4B5563]">Loading...</p>
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
