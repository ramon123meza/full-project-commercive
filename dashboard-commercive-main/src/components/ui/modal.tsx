// components/ui/modal.tsx
import React, { ReactNode } from "react";
import { IoMdClose } from "react-icons/io";

interface CustomModalProps {
  onClose?: () => void;
  children: ReactNode;
  maxWidth?: any;
}

const CustomModal: React.FC<CustomModalProps> = ({
  onClose,
  children,
  maxWidth,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-10 flex justify-center items-center z-50 p-2 sm:p-4">
      <div
        className={`bg-white rounded-lg shadow-lg w-full ${
          maxWidth ? maxWidth : "max-w-[350px]"
        } p-4 sm:p-6 relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar mx-2 sm:mx-0`}
      >
        {onClose && (
          <button onClick={onClose} className="absolute top-2 right-2 z-10">
            <IoMdClose size={20} className="bg-slate-200 p-[2px] rounded" />
          </button>
        )}
        <div className="mt-2 sm:mt-0">{children}</div>
      </div>
    </div>
  );
};

export default CustomModal;
