"use client";

import CustomButton from "@/components/ui/custom-button";
import { useRouter } from "next/navigation";
import { FormEventHandler, useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { createClient } from "../utils/supabase/client";
import { IoIosEye } from "react-icons/io";
import { IoEyeOff, IoClose } from "react-icons/io5";
import {
  FiPackage,
  FiGlobe,
  FiTrendingUp,
  FiUsers,
  FiShield,
  FiCpu,
  FiArrowRight,
  FiCheck,
  FiZap,
  FiTruck
} from "react-icons/fi";
import { checkEmail } from "./actions";
import { sendEmail } from "../actions";

// Features data
const features = [
  {
    icon: FiPackage,
    title: "Real-Time Inventory Management",
    description: "Track stock levels across all warehouses with live updates and automated reorder alerts.",
    gradient: "from-[#5B21B6] to-[#8e52f2]"
  },
  {
    icon: FiCpu,
    title: "AI-Powered Demand Forecasting",
    description: "Predict inventory needs with machine learning algorithms that analyze sales patterns.",
    gradient: "from-[#8e52f2] to-[#5B21B6]"
  },
  {
    icon: FiGlobe,
    title: "Global Shipment Tracking",
    description: "Monitor shipments worldwide with real-time GPS tracking and delivery estimates.",
    gradient: "from-[#5B21B6] to-[#8e52f2]"
  },
  {
    icon: FiUsers,
    title: "Affiliate Partner Program",
    description: "Expand your reach with our network of trusted fulfillment partners globally.",
    gradient: "from-[#8e52f2] to-[#5B21B6]"
  },
  {
    icon: FiShield,
    title: "99.9% SLA Performance",
    description: "Industry-leading reliability with guaranteed uptime and order accuracy.",
    gradient: "from-[#5B21B6] to-[#8e52f2]"
  },
  {
    icon: FiTruck,
    title: "65+ Countries Shipping",
    description: "Deliver to customers worldwide with optimized shipping routes and rates.",
    gradient: "from-[#8e52f2] to-[#5B21B6]"
  }
];

// Stats data
const stats = [
  { value: 8000000, suffix: "+", label: "Orders Fulfilled", prefix: "" },
  { value: 99.9, suffix: "%", label: "SLA Performance", prefix: "" },
  { value: 65, suffix: "+", label: "Countries", prefix: "" },
  { value: 24, suffix: "/7", label: "Support", prefix: "" }
];

// Slideshow images
const slideshowImages = [
  {
    url: "https://commerciv-forms.s3.us-east-1.amazonaws.com/modern_computer_dashboards_business_ecommerce_analytics.jpg",
    caption: "Powerful Analytics Dashboard"
  },
  {
    url: "https://commerciv-forms.s3.us-east-1.amazonaws.com/warehouse_packages_automated_system.jpg",
    caption: "Automated Warehouse Systems"
  },
  {
    url: "https://commerciv-forms.s3.us-east-1.amazonaws.com/global_supply_chain_mapp_24-7_global_delivery_neural_logistic_network.jpg",
    caption: "Global Logistics Network"
  },
  {
    url: "https://commerciv-forms.s3.us-east-1.amazonaws.com/truck_with_container_and_airplane_transportation_port_busy_city.jpg",
    caption: "Multi-Modal Transportation"
  },
  {
    url: "https://commerciv-forms.s3.us-east-1.amazonaws.com/supply_chain_world_map_and_containers_in_a_port_logistics.jpg",
    caption: "Worldwide Port Operations"
  },
  {
    url: "https://commerciv-forms.s3.us-east-1.amazonaws.com/electronic_modern_screens_with_shopping_carts_ecommerce.jpg",
    caption: "E-Commerce Integration"
  },
  {
    url: "https://commerciv-forms.s3.us-east-1.amazonaws.com/boxes_piled_up_in_a_pallet_ecommerce_supply.jpg",
    caption: "Efficient Inventory Management"
  }
];

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
    }
  }, [startOnView]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  useEffect(() => {
    if (!startOnView || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  return { count, ref };
}

// Hero Slideshow Component
function HeroSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState<boolean[]>([]);

  useEffect(() => {
    // Initialize loaded state
    setIsLoaded(new Array(slideshowImages.length).fill(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideshowImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleImageLoad = (index: number) => {
    setIsLoaded((prev) => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  };

  return (
    <div className="relative w-full h-[500px] rounded-3xl overflow-hidden shadow-2xl">
      {/* Purple gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#5B21B6]/30 via-transparent to-[#8e52f2]/20 z-10" />

      {/* Elegant border frame */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="absolute inset-4 border-2 border-white/20 rounded-2xl" />
      </div>

      {/* Slides */}
      {slideshowImages.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            index === currentSlide
              ? "opacity-100 scale-100"
              : "opacity-0 scale-105"
          }`}
        >
          <img
            src={slide.url}
            alt={slide.caption}
            onLoad={() => handleImageLoad(index)}
            className={`w-full h-full object-cover transition-transform duration-[8000ms] ease-linear ${
              index === currentSlide ? "scale-110" : "scale-100"
            }`}
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      ))}

      {/* Caption */}
      <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
        <div className="overflow-hidden">
          {slideshowImages.map((slide, index) => (
            <div
              key={index}
              className={`transition-all duration-700 ${
                index === currentSlide
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8 absolute"
              }`}
            >
              <p className="text-white/90 text-sm font-medium tracking-wider uppercase mb-2">
                {String(index + 1).padStart(2, '0')} / {String(slideshowImages.length).padStart(2, '0')}
              </p>
              <h3 className="text-white text-2xl md:text-3xl font-bold">
                {slide.caption}
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* Progress indicators */}
      <div className="absolute bottom-8 right-8 z-20 flex gap-2">
        {slideshowImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-12 h-1 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? "bg-white"
                : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Decorative corner accents */}
      <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-white/40 rounded-tl-lg z-20" />
      <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-white/40 rounded-tr-lg z-20" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-white/40 rounded-bl-lg z-20" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-white/40 rounded-br-lg z-20" />
    </div>
  );
}

// Floating shapes component
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large gradient circle */}
      <div
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(142, 82, 242, 0.8) 0%, transparent 70%)",
          animation: "float 8s ease-in-out infinite"
        }}
      />

      {/* Medium circle */}
      <div
        className="absolute top-1/3 -left-20 w-64 h-64 rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(237, 233, 254, 0.6) 0%, transparent 70%)",
          animation: "float 6s ease-in-out infinite 1s"
        }}
      />

      {/* Small floating elements */}
      <div
        className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(142, 82, 242, 0.6) 0%, transparent 70%)",
          animation: "float 5s ease-in-out infinite 0.5s"
        }}
      />

      {/* Geometric shapes */}
      <svg className="absolute top-1/4 right-1/3 w-20 h-20 opacity-10" style={{ animation: "float 7s ease-in-out infinite 2s" }}>
        <polygon points="40,0 80,80 0,80" fill="#EDE9FE" />
      </svg>

      <svg className="absolute bottom-1/3 left-1/4 w-16 h-16 opacity-10" style={{ animation: "float 9s ease-in-out infinite 1.5s" }}>
        <rect width="64" height="64" fill="#8e52f2" rx="8" />
      </svg>

      {/* Dots pattern */}
      <div className="absolute top-20 left-20 grid grid-cols-5 gap-3 opacity-20">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
        ))}
      </div>

      <div className="absolute bottom-40 right-20 grid grid-cols-4 gap-2 opacity-15">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-[#EDE9FE]" />
        ))}
      </div>
    </div>
  );
}

// Feature card component
function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={`group relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Gradient accent on hover */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

      {/* Icon container */}
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-7 h-7 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-[#1B1F3B] mb-3 group-hover:text-[#8e52f2] transition-colors">
        {feature.title}
      </h3>
      <p className="text-[#4B5563] leading-relaxed">
        {feature.description}
      </p>

      {/* Learn more link */}
      <div className="mt-6 flex items-center text-[#8e52f2] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-sm">Learn more</span>
        <FiArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const { count, ref } = useCountUp(stat.value, 2500);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(0) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + "K";
    } else if (num % 1 !== 0) {
      return num.toFixed(1);
    }
    return num.toString();
  };

  return (
    <div
      ref={ref}
      className="text-center p-8 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="text-5xl md:text-6xl font-bold text-white mb-2">
        {stat.prefix}{formatNumber(count)}{stat.suffix}
      </div>
      <div className="text-[#EDE9FE] text-lg font-medium">{stat.label}</div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignIn: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (!showPass) {
      const res = await checkEmail(email);
      if (res.status) {
        setShowPass(true);
      } else {
        const request = res.request;
        if (request && request.status == false) {
          toast.error("Your account is not approved yet.");
        }
        if (request && request.status == true) {
          setIsSignup(true);
          toast.success("Your email is approved. Please set your password.");
        }
        if (!request) {
          toast.error("The account is not found.");
          setShowSignUp(true);
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.code == "email_not_confirmed") {
          toast.error("Your email is not confirmed. Please check your email.");
        } else {
          toast.error(error.message);
        }
      } else {
        window.location.href = "/";
      }
    }
    setIsLoading(false);
  };

  const handleSignUp: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (password != confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const res = await checkEmail(email);
    const request = res.request;

    if (request && request.status == true) {
      const res = await sendEmail({
        email: email,
        password: password,
        request,
      });
      const status = res.statusCode == 202;
      if (status) {
        toast.success("Confirmation email sent. Please check your email.");
        setIsSignup(false);
        setShowPass(true);
      } else {
        toast.error("Something went wrong!");
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return;
      } else {
        router.push("/home");
      }
    };

    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    setShowLoginModal(false);
    setShowPass(false);
    setShowSignUp(false);
    setIsSignup(false);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F4F5F7]">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#5B21B6] shadow-xl py-2"
            : "bg-gradient-to-b from-black/30 to-transparent py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className={`relative rounded-xl p-2 transition-all duration-300 ${
                scrolled ? "bg-white shadow-md" : "bg-white/90 backdrop-blur-sm shadow-lg"
              }`}>
                <img
                  src="https://prompt-images-nerd.s3.us-east-1.amazonaws.com/ChatGPT+Image+14+nov+2025%2C+08_24_12.png"
                  alt="Commercive Logo"
                  className="h-10 w-auto"
                />
              </div>
            </div>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white/80 hover:text-white transition-colors font-medium">
                Features
              </a>
              <a href="#stats" className="text-white/80 hover:text-white transition-colors font-medium">
                Performance
              </a>
              <a href="#cta" className="text-white/80 hover:text-white transition-colors font-medium">
                Get Started
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-5 py-2.5 text-white font-semibold hover:text-[#EDE9FE] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/signUp")}
                className="btn btn-lg bg-white text-[#5B21B6] hover:bg-[#EDE9FE] transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center pt-24">
        {/* Background Elements */}
        <div className="hero-pattern" />
        <div className="hero-grid" />
        <FloatingShapes />

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Text */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in-down">
                <FiZap className="w-4 h-4 text-[#EDE9FE]" />
                <span className="text-sm font-medium text-white">
                  Trusted by 10,000+ Shopify Stores
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-display text-white mb-6 animate-fade-in-up">
                <span className="block">Professional</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#EDE9FE] to-[#A78BFA]">
                  eCommerce Fulfillment
                </span>
                <span className="block">Made Simple</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-[#EDE9FE]/90 mb-10 max-w-xl mx-auto lg:mx-0 animate-fade-in-up stagger-2">
                Scale your Shopify store with enterprise-grade 3PL logistics.
                Real-time inventory, global shipping, and AI-powered forecasting - all in one dashboard.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up stagger-3">
                <button
                  onClick={() => router.push("/signUp")}
                  className="btn btn-lg bg-white text-[#5B21B6] hover:bg-[#EDE9FE] shadow-xl hover:shadow-2xl transition-all group"
                >
                  Start Free Trial
                  <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="btn btn-lg bg-transparent text-white border-2 border-white/30 hover:bg-white/10 hover:border-white/50 transition-all"
                >
                  Sign In to Dashboard
                </button>
              </div>

              {/* Trust indicators */}
              <div className="mt-12 flex flex-wrap items-center gap-6 justify-center lg:justify-start animate-fade-in-up stagger-4">
                <div className="flex items-center gap-2 text-white/80">
                  <FiCheck className="w-5 h-5 text-green-400" />
                  <span className="text-sm">No credit card required</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <FiCheck className="w-5 h-5 text-green-400" />
                  <span className="text-sm">14-day free trial</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <FiCheck className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Right Column - Dashboard Preview */}
            <div className="hidden lg:block relative animate-fade-in-up stagger-3">
              <div className="relative">
                {/* Main dashboard card */}
                <div className="card-glass p-6 rounded-2xl shadow-2xl">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="ml-4 text-sm text-[#4B5563] font-medium">Dashboard Overview</span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-[#5B21B6] to-[#8e52f2] rounded-xl p-4 text-white">
                      <div className="text-2xl font-bold">2,847</div>
                      <div className="text-xs text-white/70">Orders Today</div>
                    </div>
                    <div className="bg-[#F4F5F7] rounded-xl p-4">
                      <div className="text-2xl font-bold text-[#1B1F3B]">99.8%</div>
                      <div className="text-xs text-[#4B5563]">Fulfillment Rate</div>
                    </div>
                    <div className="bg-[#F4F5F7] rounded-xl p-4">
                      <div className="text-2xl font-bold text-[#10B981]">+24%</div>
                      <div className="text-xs text-[#4B5563]">Growth</div>
                    </div>
                  </div>

                  {/* Chart placeholder */}
                  <div className="bg-[#F4F5F7] rounded-xl p-4 h-40 flex items-end gap-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-[#8e52f2] to-[#5B21B6] rounded-t-sm transition-all duration-500"
                        style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Floating notification card */}
                <div className="absolute -right-8 top-1/4 bg-white rounded-xl shadow-xl p-4 animate-float" style={{ animationDelay: "0.5s" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <FiCheck className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#5B21B6]">Order Shipped!</div>
                      <div className="text-xs text-[#4B5563]">ORD-2847 to Germany</div>
                    </div>
                  </div>
                </div>

                {/* Floating stats card */}
                <div className="absolute -left-8 bottom-1/4 bg-white rounded-xl shadow-xl p-4 animate-float" style={{ animationDelay: "1s" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <FiTrendingUp className="w-5 h-5 text-[#8e52f2]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#5B21B6]">Revenue Up</div>
                      <div className="text-xs text-green-500 font-medium">+18.2% this month</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Gallery Slideshow Section */}
      <section id="gallery" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EDE9FE] mb-6">
              <FiGlobe className="w-4 h-4 text-[#8e52f2]" />
              <span className="text-sm font-semibold text-[#5B21B6]">Global Operations</span>
            </div>
            <p className="text-xl text-[#4B5563] max-w-2xl mx-auto">
              From automated warehouses to global logistics networks,
              explore how we power e-commerce fulfillment worldwide.
            </p>
          </div>

          {/* Slideshow */}
          <HeroSlideshow />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#F4F5F7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EDE9FE] mb-6">
              <FiZap className="w-4 h-4 text-[#8e52f2]" />
              <span className="text-sm font-semibold text-[#5B21B6]">Powerful Features</span>
            </div>
            <h2 className="text-h1 text-[#1B1F3B] mb-4">
              Everything You Need to
              <span className="block gradient-text">Scale Your Business</span>
            </h2>
            <p className="text-xl text-[#4B5563] max-w-2xl mx-auto">
              Our comprehensive fulfillment platform gives you complete control
              over your inventory, orders, and shipments.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-24 bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#8e52f2] relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px"
          }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-h1 text-white mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-[#EDE9FE]/80 max-w-2xl mx-auto">
              Our numbers speak for themselves. Join thousands of businesses
              that trust Commercive for their fulfillment needs.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <StatCard key={index} stat={stat} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-24 bg-[#F4F5F7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-gray-100">
            <h2 className="text-h1 text-[#1B1F3B] mb-4">
              Ready to Transform Your
              <span className="block gradient-text">Fulfillment Operations?</span>
            </h2>
            <p className="text-xl text-[#4B5563] mb-10 max-w-2xl mx-auto">
              Join thousands of Shopify store owners who have streamlined their
              logistics with Commercive. Start your free trial today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/signUp")}
                className="btn btn-lg btn-primary shadow-lg hover:shadow-xl transition-all group"
              >
                Start Free Trial
                <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setShowLoginModal(true)}
                className="btn btn-lg btn-secondary"
              >
                Sign In
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-sm text-[#4B5563] mb-4">Integrates seamlessly with</p>
              <div className="flex items-center justify-center gap-8 opacity-60">
                <div className="text-2xl font-bold text-[#1B1F3B]">Shopify</div>
                <div className="text-2xl font-bold text-[#1B1F3B]">WooCommerce</div>
                <div className="text-2xl font-bold text-[#1B1F3B]">Amazon</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#5B21B6] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="https://prompt-images-nerd.s3.us-east-1.amazonaws.com/ChatGPT+Image+14+nov+2025%2C+08_24_12.png"
                alt="Commercive Logo"
                className="h-10 w-auto"
              />
            </div>
            <p className="text-[#EDE9FE]/60 text-sm">
              2025 Commercive. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div
          className="modal-overlay"
          onClick={closeModal}
        >
          <div
            className="modal-content animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative p-8 pb-0">
              <button
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[#4B5563] hover:bg-[#D7E8FF] hover:text-[#1B1F3B] transition-all"
                onClick={closeModal}
              >
                <IoClose className="text-xl" />
              </button>

              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5B21B6] to-[#8e52f2] flex items-center justify-center shadow-lg">
                  <img
                    src="https://prompt-images-nerd.s3.us-east-1.amazonaws.com/ChatGPT+Image+14+nov+2025%2C+08_24_12.png"
                    alt="Commercive Logo"
                    className="h-10 w-auto"
                  />
                </div>
              </div>

              <h2 className="text-h2 text-[#1B1F3B] text-center mb-2">
                {isSignup ? "Complete Your Account" : "Welcome Back"}
              </h2>
              <p className="text-[#4B5563] text-center mb-8">
                {isSignup
                  ? "Set your password to access your dashboard"
                  : "Sign in to access your fulfillment dashboard"}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-8 pt-0">
              {showSignUp && (
                <div className="mb-6 p-4 rounded-xl bg-[#EDE9FE] border border-[#8e52f2]/20">
                  <p className="text-sm text-[#5B21B6] text-center">
                    Don&apos;t have an account?{" "}
                    <span
                      className="text-[#8e52f2] cursor-pointer hover:underline font-semibold"
                      onClick={() => {
                        closeModal();
                        router.push("/signUp");
                      }}
                    >
                      Sign up here
                    </span>
                  </p>
                </div>
              )}

              <form onSubmit={isSignup ? handleSignUp : handleSignIn} className="space-y-5">
                <div>
                  <label className="input-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={email}
                    className="input"
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={showPass || isSignup}
                  />
                </div>

                {(showPass || isSignup) && (
                  <div className="relative">
                    <label className="input-label">
                      Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      required
                      className="input pr-12"
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-9 text-[#4B5563] hover:text-[#1B1F3B] transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <IoEyeOff size={20} /> : <IoIosEye size={20} />}
                    </button>
                  </div>
                )}

                {isSignup && (
                  <div className="relative">
                    <label className="input-label">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      required
                      className="input pr-12"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}

                <CustomButton
                  type="submit"
                  label={isSignup ? "Set Password" : showPass ? "Sign In" : "Continue"}
                  className="w-full btn btn-lg btn-primary mt-6"
                  interactingAPI={isLoading}
                />
              </form>

              {!isSignup && !showPass && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-[#4B5563]">
                    Don&apos;t have an account?{" "}
                    <span
                      className="text-[#8e52f2] cursor-pointer hover:underline font-semibold"
                      onClick={() => {
                        closeModal();
                        router.push("/signUp");
                      }}
                    >
                      Get started for free
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
