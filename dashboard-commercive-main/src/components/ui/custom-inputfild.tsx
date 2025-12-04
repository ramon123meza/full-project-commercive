"use client";
import React, { useState } from "react";
import { AiOutlineEye } from "react-icons/ai";
import { GoEye, GoEyeClosed } from "react-icons/go";
interface InputFieldProps {
  placeholder: string;
  type: string;
  name: string;
  className?: string;
  bgColor?: string;
  showPasswordSuffix?: boolean;
  errorMessage?: string;
  onChange?: any;
  value?: string;
  label?: string | any;
  maxlength?: any;
  active?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: string;
  boxBorder?: string;
}

const InputField = (props: InputFieldProps) => {
  const {
    placeholder,
    name,
    type,
    bgColor,
    className,
    errorMessage,
    showPasswordSuffix,
    onChange,
    value,
    label,
    active,
    maxlength,
    readOnly,
    min,
    max,
    step,
    boxBorder,
  } = props;
  const [viewPassword, setViewPassword] = useState<boolean>(
    !showPasswordSuffix
  );
  const passwordEyeClick = () => {
    setViewPassword((pre) => !pre);
  };
  const borderColor = boxBorder ? boxBorder : "border-[#D4D7DD]";
  return (
    <div className="flex flex-col w-full">
      <label className="font-medium text-[16px] leading-[24px] text-[#3E4654]">
        {label}
      </label>
      <div className={`relative flex items-center ${className}`}>
        <input
          disabled={active}
          maxLength={maxlength}
          min={min ?? 0}
          name={name}
          max={max}
          value={value}
          step={step}
          type={
            type === "password" ? (viewPassword ? "text" : "password") : type
          }
          placeholder={placeholder}
          onChange={(event) => onChange(event, name)}
          className={`h-[40px] w-full rounded-[8px] border ${borderColor} pl-3 pr-3 focus:outline-none
        bg-[${bgColor}]`}
          readOnly={readOnly}
        />
        {showPasswordSuffix && (
          <div className="absolute right-[2%] cursor-pointer text-[#000000]">
            {viewPassword ? (
              <AiOutlineEye
                className="h-[23px] w-[23px] text-[#2F2B4399]"
                onClick={passwordEyeClick}
              />
            ) : (
              <GoEyeClosed
                className="h-[20px] w-[20px] text-[#2F2B4399]"
                onClick={passwordEyeClick}
              />
            )}
          </div>
        )}
        <p
          aria-live="polite"
          className="absolute left-2 top-12 font-normal text-[#FF0000]"
        >
          {errorMessage}
        </p>
      </div>
    </div>
  );
};

export default InputField;
