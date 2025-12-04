"use client";
import React from "react";
import { useFormStatus } from "react-dom";

interface ButtonProps {
  label: string | undefined;
  className?: string;
  type?: "button" | "submit" | "reset" | undefined;
  callback?: () => void | Promise<void> | undefined;
  interactingAPI?: boolean;
  disabled?: boolean;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

const CustomButton = ({
  label = "",
  type = "button",
  callback,
  className = "",
  interactingAPI = false,
  disabled = false,
  prefixIcon,
  suffixIcon,
}: ButtonProps) => {
  const { pending: formPending } = useFormStatus();

  const handleButtonClick = async () => {
    if (typeof callback === "function" && !disabled && !interactingAPI) {
      await callback();
    }
  };

  const showLoader = (formPending && type === "submit") || interactingAPI;

  return (
    <button
      disabled={formPending || disabled}
      type={type}
      className={`flex items-center justify-center gap-2 rounded-[8px] bg-[#4F11C9] px-4 py-2 font-semibold text-[#F4F4F4] ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${className}`}
      onClick={handleButtonClick}
    >
      {showLoader && (
        <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {prefixIcon}
      <span>{label}</span>
      {suffixIcon}
    </button>
  );
};

export default CustomButton;
