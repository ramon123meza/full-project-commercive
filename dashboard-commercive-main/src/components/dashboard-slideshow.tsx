"use client";

import { useState, useEffect } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const slides = [
  {
    image: "https://prompt-images-nerd.s3.us-east-1.amazonaws.com/AdobeStock_1768494780.jpeg",
    title: "Scale Your Business in 2026",
    description: "Advanced logistics solutions powered by cutting-edge technology",
    gradient: "from-purple-600/90 to-blue-600/90",
  },
  {
    image: "https://prompt-images-nerd.s3.us-east-1.amazonaws.com/AdobeStock_1618978684.jpeg",
    title: "Global eCommerce Fulfillment",
    description: "Fast delivery to 65+ countries with real-time tracking",
    gradient: "from-blue-600/90 to-indigo-600/90",
  },
  {
    image: "https://prompt-images-nerd.s3.us-east-1.amazonaws.com/AdobeStock_214539382.jpeg",
    title: "Seamless Online Shopping Experience",
    description: "Integrated order management across all your sales channels",
    gradient: "from-indigo-600/90 to-purple-600/90",
  },
];

export default function DashboardSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000); // Resume auto-play after 10 seconds
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="relative w-full h-[280px] md:h-[350px] rounded-2xl overflow-hidden shadow-2xl group">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Background Image */}
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />

          {/* Gradient Overlay */}
          <div
            className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}
          />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-center items-start px-8 md:px-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
              {slide.title}
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl drop-shadow-md">
              {slide.description}
            </p>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <FiChevronLeft className="text-white text-2xl" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
        <FiChevronRight className="text-white text-2xl" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 ${
              index === currentSlide
                ? "w-8 h-2 bg-white"
                : "w-2 h-2 bg-white/50 hover:bg-white/75"
            } rounded-full`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
