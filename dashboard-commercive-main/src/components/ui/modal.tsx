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
    <div className="fixed inset-0 bg-black bg-opacity-10 flex justify-center items-center z-50">
      <div
        className={`bg-white rounded-lg shadow-lg w-full ${
          maxWidth ? maxWidth : "max-w-[350px]"
        } p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar`}
      >
        {onClose && (
          <button onClick={onClose} className="absolute top-2 right-2 ">
            <IoMdClose size={20} className="bg-slate-200 p-[2px] rounded" />
          </button>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default CustomModal;
