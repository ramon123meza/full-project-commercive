"use client";
import { FaArrowDown, FaArrowUp } from "react-icons/fa6";
import SparklineChart from "./charts/spartLineChart";
import { useState } from "react";
import CustomModal from "@/components/ui/modal";
import CustomButton from "./ui/custom-button";
import InputField from "./ui/custom-inputfild";
import { toast } from "react-toastify";
import { createClient } from "@/app/utils/supabase/client";
import { useStoreContext } from "@/context/StoreContext";

export interface FeatureCardProps {
  data?: any;
  page: any;
  dateRange?: any;
  userId?: string;
  wallet?: number;
}
const amount = [100, 500, 1000];

export default function FeatureCard({
  data,
  page,
  dateRange,
  userId,
  wallet,
}: FeatureCardProps) {
  const supabase = createClient();
  const { selectedStore, userinfo } = useStoreContext();
  const [isModalOpen, setModalOpen] = useState(false);
  const [address, setAddress] = useState<string>(userinfo!.email || "");
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const handlePayoutChange = (e: any) => {
    const { name, value } = e.target;
    setAddress(value);
  };

  const handlePayoutSubmit = async () => {
    if (!address.trim()) {
      toast.error("Please enter your wallet address.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payouts")
        .insert({
          amount: Number(selectedAmount),
          paypal_address: address,
          user_id: userId,
          store_url: selectedStore?.store_url!,
          status: "Pending",
        })
        .select();

      if (error) {
        toast.error(error.message);
      } else {
        if (data) {
          toast.success("Request payout successfully!");
          window.location.reload();
          return;
        }
        setAddress("");
        setModalOpen(false);
      }
    } catch (err) {
      toast.error("Something went wrong! Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalClick = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedAmount(0);
    setAddress("");
  };
  return (
    <>
      {data?.map((data: any, index: any) => (
        <div className="flex flex-1" key={index}>
          <div
            className={`flex flex-col w-full bg-[#ffffff] ${
              index === 3 ? "mr-0" : "mr-0"
            } pl-6 py-5 pr-4 flex-0 overflow-hidden rounded-2xl relative`}
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
              boxShadow: '0 4px 6px -1px rgba(68, 34, 144, 0.1), 0 2px 4px -1px rgba(68, 34, 144, 0.06)',
              border: '1px solid rgba(68, 34, 144, 0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(68, 34, 144, 0.15), 0 4px 6px -2px rgba(68, 34, 144, 0.08)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(68, 34, 144, 0.1), 0 2px 4px -1px rgba(68, 34, 144, 0.06)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Subtle gradient overlay bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
              style={{
                background: `linear-gradient(90deg, ${data.color}99 0%, ${data.color}33 100%)`,
              }}
            />

            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full flex-wrap justify-between items-center">
                <h2
                  className={`text-[#454545] font-semibold text-[15px] ${
                    page === "home"
                      ? index === 3
                        ? "mt-1"
                        : "mt-1"
                      : page === "commercive" && index === 3
                      ? "mt-0"
                      : "mt-1"
                  }`}
                >
                  {data.name}
                </h2>
                {data.name === "Wallet" && (
                  <div
                    onClick={handleWithdrawalClick}
                    className="flex border-2 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 text-[#4F11C9] font-semibold rounded-lg px-3 py-1.5 cursor-pointer hover:from-purple-100 hover:to-purple-200 transition-all"
                  >
                    Withdraw
                  </div>
                )}
              </div>
              <div className="flex w-full gap-2 items-end">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <p className="font-bold text-[#1a1a1a] text-[28px] leading-none">
                      {page === "home"
                        ? index === 2
                          ? "$" + data.amount
                          : data.amount
                        : page === "commercive" && index === 0
                        ? data.amount
                        : "$" + data.amount}
                      <span className="text-[#9ca3af] text-[20px] font-normal ml-0.5">.00</span>
                    </p>
                    <div
                      className={`rounded-full w-[28px] h-[28px] flex justify-center items-center ${
                        parseFloat(data.percentage) === 0 ? "hidden" : ""
                      }`}
                      style={{
                        backgroundColor:
                          parseFloat(data.percentage) === 0
                            ? "transparent"
                            : data.bgColor,
                        border: `1.5px solid ${data.color}33`,
                      }}
                    >
                      {index === 3 || parseFloat(data.percentage) < 0 ? (
                        <FaArrowDown color={data.color} fontWeight="bold" size={12} />
                      ) : parseFloat(data.percentage) > 0 ? (
                        <FaArrowUp color={data.color} fontWeight="bold" size={12} />
                      ) : null}
                    </div>
                    <p
                      className="font-bold text-[14px] px-2 py-0.5 rounded-md"
                      style={{
                        color: data.color,
                        backgroundColor: `${data.bgColor}`,
                      }}
                    >
                      {data.percentage}
                    </p>
                  </div>
                  <p className="text-[13px] text-[#6b7280] font-medium">Compared to</p>
                  <p className="text-[#9ca3af] text-[12px] font-medium">
                    {dateRange[0]?.startDate && dateRange[0]?.endDate
                      ? `${dateRange[0].startDate.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })} - ${dateRange[0].endDate.toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                          }
                        )}`
                      : "Select a date range"}
                  </p>
                </div>
                <div className="flex">
                  <div className="block w-full h-full overflow-hidden max-w-[200px]">
                    <SparklineChart
                      data={data.series}
                      stokeColor={data.color}
                      fillColor={data.bgColor}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {isModalOpen && (
            <CustomModal onClose={closeModal}>
              <div className="">
                <h2 className="text-lg font-semibold">Withdrawal</h2>
                <div className="flex flex-col items-center gap-3 mt-2">
                  <p className="text-3xl font-bold">$ {wallet || 0}</p>
                  <div className="flex gap-3">
                    {amount.map((amt, index) => (
                      <p
                        key={index}
                        className="text-sm font bold bg-slate-200 rounded-full px-4 py-1 cursor-pointer"
                        style={{
                          backgroundColor:
                            amt == selectedAmount ? "#f7a46d" : "",
                        }}
                        onClick={() => {
                          if (amt < (wallet || 0)) setSelectedAmount(amt);
                        }}
                      >
                        {`$${amt}`}
                      </p>
                    ))}
                    <p
                      className="text-sm font bold bg-slate-200 rounded-full px-4 py-1 cursor-pointer"
                      onClick={() => setSelectedAmount(wallet || 0)}
                      style={{
                        backgroundColor:
                          wallet == selectedAmount ? "#f7a46d" : "",
                      }}
                    >
                      MAX
                    </p>
                  </div>
                  <div className="w-full">
                    <p>Paypal Address</p>
                    <InputField
                      name="address"
                      placeholder="Enter your paypal address"
                      type="text"
                      className="mt-[8px]"
                      label=""
                      value={address}
                      onChange={handlePayoutChange}
                      showPasswordSuffix={false}
                    />
                  </div>
                  <CustomButton
                    type="submit"
                    label={`REQUEST PAYOUT ($${selectedAmount})`}
                    className="w-full whitespace-nowrap px-6 text-sm lg:h-full"
                    callback={handlePayoutSubmit}
                    interactingAPI={loading}
                  />
                </div>
              </div>
            </CustomModal>
          )}
        </div>
      ))}
    </>
  );
}

export function FeatureCardSkeleton({ page }: { page: string }) {
  return (
    <div className="flex">
      {Array(4)
        .fill(null)
        .map((_, index) => (
          <div
            key={index}
            className={`flex flex-col w-full bg-[#ffffff] ${
              index === 3 ? "mr-0" : "mr-6"
            } 
            pl-6 py-4 pr-4 flex-0 overflow-hidden custom-box-shadow`}
          >
            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full flex-wrap justify-between items-center">
                <p className="h-[22px] w-[135px] mt-1 bg-gray-200 rounded-md animate-pulse"></p>
                {page === "commercive" && index === 3 && (
                  <div className="h-[30px] w-[100px] bg-gray-200 rounded-md animate-pulse"></div>
                )}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <p className="h-[22px] w-[80px] bg-gray-200 rounded-md animate-pulse"></p>
                    {page === "commercive" && (
                      <div className="w-[28px] h-[28px] bg-gray-200 rounded-full animate-pulse"></div>
                    )}
                    <p className="h-[20px] w-[30px] bg-gray-200 rounded-md animate-pulse"></p>
                  </div>
                  <p className="h-[18px] w-[100px] bg-gray-200 rounded-md animate-pulse"></p>
                  <p className="h-[18px] w-[110px] bg-gray-200 rounded-md animate-pulse"></p>
                </div>
                <div className="h-[50px] w-[181px] bg-gray-200 rounded-md animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
