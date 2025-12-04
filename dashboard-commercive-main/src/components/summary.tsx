import { Box, Typography, Chip, Paper, Button, Tooltip } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { GoArrowUpRight } from "react-icons/go";
import OrderIcon from "./images/order";
import Image from "next/image";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useStoreContext } from "@/context/StoreContext";
import { createClient } from "@/app/utils/supabase/client";
import Link from "next/link";
import { CiCalendar } from "react-icons/ci";
import { Database } from "@/app/utils/supabase/database.types";

type TransactionItem = {
  id: string;
  tracking_company: string;
  tracking_number: string;
  status: string;
  tracking_url: string;
  created_at: string;
  updated_at: string;
  store_location: string;
};

export default function Summary({ selectedRange }: any) {
  const supabase = createClient();
  const { selectedStore } = useStoreContext();
  const [trackingData, setTrackingData] = useState<
    Database["public"]["Tables"]["trackings"]["Row"][]
  >([]);
  const storeUrl = selectedStore ? selectedStore.store_url : null;
  const datePickerRef = useRef<HTMLDivElement>(null);
  const dateLabelsRef = useRef<HTMLDivElement>(null);
  const shipmentItemsRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleScroll = () => {
    if (dateLabelsRef.current) {
      const newScrollLeft = dateLabelsRef.current.scrollLeft;
      setScrollLeft(newScrollLeft);
    }
  };

  useEffect(() => {
    if (dateLabelsRef.current) {
      dateLabelsRef.current.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (dateLabelsRef.current) {
        dateLabelsRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const getStartOfWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  };

  const getEndOfWeek = (startOfWeek: Date) => {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return endOfWeek;
  };

  const formatDateForLabels = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "2-digit",
      timeZone: "UTC",
    };
    return new Date(date).toLocaleDateString("en-US", options);
  };

  const generateDateLabels = (
    startDate: string | number | Date,
    endDate: number | Date
  ) => {
    const dateLabels = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const day = currentDate.getDate().toString().padStart(2, "0");
      const weekday = currentDate.toLocaleDateString("en-US", {
        weekday: "short",
      });
      dateLabels.push(`${day} ${weekday}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateLabels;
  };

  const formatDateForQuery = (date: Date) => date.toISOString().split("Z")[0];

  const fetchTrackings = async () => {
    const formattedStartDate = formatDateForQuery(selectedRange[0].startDate);
    const formattedEndDate = formatDateForQuery(selectedRange[0].endDate);

    // FIX Issues 1,3: Use .lte() to include the end date
    const { data: trackingsData, error: trackingsError } = await supabase
      .from("trackings")
      .select("*")
      .gte("created_at", formattedStartDate)
      .lte("created_at", formattedEndDate)
      .eq("store_url", storeUrl!);

    if (trackingsError) {
      console.error("Error fetching trackings:", trackingsError.message);
    } else {
      setTrackingData(trackingsData);
    }
  };

  useEffect(() => {
    fetchTrackings();
  }, [selectedRange, storeUrl]);

  const dateLabels = generateDateLabels(
    selectedRange[0].startDate,
    selectedRange[0].endDate
  );
  const trackingsByDate: { [key: string]: any[] } = {};
  trackingData.forEach((tracking) => {
    const createdDate = formatDateForLabels(new Date(tracking.created_at));
    const updatedDate = formatDateForLabels(new Date(tracking.updated_at));

    if (!trackingsByDate[createdDate]) trackingsByDate[createdDate] = [];
    trackingsByDate[createdDate].push({
      ...tracking,
      createdDate,
      updatedDate,
    });
  });

  const calculateDaysGap = (data: {
    created_at: string;
    updated_at: string;
    status: string;
  }) => {
    const createdDateStr = data.created_at.split("T")[0];
    const updatedDateStr = data.updated_at.split("T")[0];

    const createdDate = new Date(createdDateStr);
    const updatedDate = new Date(updatedDateStr);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    let daysGap = 0;

    if (createdDate.getTime() === updatedDate.getTime()) {
      daysGap = 0;
    } else {
      daysGap = Math.floor(
        (updatedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)
      );
    }

    return `${Math.max(0, daysGap)} days`;
  };
  const chunkSize = 7;

  const initialChunk = dateLabels.slice(0, chunkSize);
  return (
    <Paper
      elevation={3}
      className="w-full h-full px-4 py-6 sm:px-6 sm:py-8"
      sx={{
        borderRadius: "20px",
        boxShadow:
          "inset 0px 2px 4px 0px rgba(60, 60, 60, 0.11),inset 0px -4px 3px 0px rgba(62, 62, 62, 0.1)",
      }}
    >
      <div className="w-full flex flex-col gap-2 md:gap-2 sm:flex-row justify-between sm:items-center mb-4">
        <Typography
          variant="h5"
          fontWeight="bold"
          className="flex items-center gap-3"
          sx={{
            fontSize: {
              xs: "1rem",
              sm: "1.2rem",
              md: "1.5rem",
            },
          }}
        >
          <OrderIcon width={24} height={24} color={"#4f11c9"} />
          Order Statistics
        </Typography>
        {/* <div
          style={{ position: "relative" }}
          className="flex flex-col md:flex-row gap-2"
        >
          <input
            type="text"
            value={
              dateRange[0]?.startDate && dateRange[0]?.endDate
                ? `${dateRange[0].startDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })} - ${dateRange[0].endDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}`
                : "Select a date range"
            }
            onFocus={() => setShowDatePicker(true)}
            readOnly
            className="border p-2 pl-8 w-full text-sm cursor-pointer focus-within:outline-none"
          />
          <CiCalendar
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1,
            }}
          />
          {showDatePicker && (
            <div
              ref={datePickerRef}
              style={{
                position: "absolute",
                zIndex: 1000,
                background: "white",
                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                top: "100%",
                left: 0,
              }}
            >
              <DateRange
                ranges={dateRange}
                onChange={handleSelect}
                moveRangeOnFirstSelection={false}
                maxDate={new Date()}
              />
            </div>
          )}
        </div> */}
        <Link href={"/shipments"}>
          <Button
            variant="outlined"
            endIcon={<GoArrowUpRight size={24} />}
            className="!rounded-full"
            sx={{
              borderColor: "#f0edf5",
              borderWidth: 2,
              color: "#9A88BE",
              textTransform: "initial",
            }}
          >
            View Full Summary
          </Button>
        </Link>
      </div>
      <Box
        ref={dateLabelsRef}
        className="flex gap-7 text-center justify-between py-3 border-b-2 border-[#F4F4F7] overflow-x-auto custom-scrollbar"
        style={{
          display: "flex",
          whiteSpace: "nowrap",
        }}
      >
        {initialChunk.map((day, index) => (
          <Typography
            key={index}
            className="text-sm font-medium text-[#B1B0B2]"
            style={{ minWidth: "80px" }} // Fixed minWidth
          >
            {day}
          </Typography>
        ))}
        {dateLabels.length > chunkSize &&
          dateLabels.slice(chunkSize).map((day, index) => (
            <Typography
              key={index + chunkSize}
              className="text-sm font-medium text-[#B1B0B2]"
              style={{ minWidth: "80px" }}
            >
              {day}
            </Typography>
          ))}
      </Box>
      {trackingData.length > 0 ? (
        <Box
          ref={shipmentItemsRef}
          className="grid grid-cols-6 gap-0 p-3 text-center relative h-80 bg-white bg-[linear-gradient(to_right,#F4F4F7_2px,transparent_1px)] bg-[size:18%_100%] overflow-hidden"
        >
          {/* Shipment Items */}
          {trackingData.map((data, i) => {
            const createdDateStr = data.created_at.split("T")[0];
            const updatedDateStr = data.updated_at.split("T")[0];
            const createdIndex = dateLabels.indexOf(
              formatDateForLabels(new Date(createdDateStr))
            );
            const updatedIndex = dateLabels.indexOf(
              formatDateForLabels(new Date(updatedDateStr))
            );
            let colSpan = updatedIndex - createdIndex + 1;
            // colSpan = colSpan <= 0 ? 1 : colSpan;
            const daysGap = calculateDaysGap(data);

            const tooltipContent = (
              <div className="text-left">
                <p>
                  <strong>SKU #:</strong> {data.tracking_number}
                </p>
                <p>
                  <strong>Company:</strong> {data.tracking_company}
                </p>
                <p>
                  <strong>Status:</strong> {data.status}
                </p>
                <p>
                  <strong>Days:</strong> {daysGap}
                </p>
              </div>
            );
            const dateLabelWidth = 80;
            const initialLeft = createdIndex * dateLabelWidth;
            const adjustedLeft = initialLeft - scrollLeft;
            return (
              <React.Fragment key={data.id}>
                <Tooltip title={tooltipContent} placement="top" arrow>
                  <Box
                    key={i}
                    className={`px-3 pt-1 ${
                      data.status === "PENDING"
                        ? "bg-[#FFECD6]"
                        : "bg-[#E8ECFE]"
                    } rounded-lg flex items-center absolute overflow-x-auto custom-scrollbar whitespace-nowrap mt-3 h-12`}
                    style={{
                      top: `${i * 55}px`,
                      left: `${adjustedLeft}px`,
                      width: `${colSpan * dateLabelWidth}px`,
                      gap: "2rem",
                    }}
                  >
                    <Typography className="text-sm text-gray-800">
                      #{data.tracking_number}
                    </Typography>
                    <Typography className="text-sm text-gray-500">•</Typography>
                    <Box className={"flex w-max gap-2"}>
                      {data.tracking_company === "DHL Express" && (
                        <Image
                          src="/icons/dhl.png"
                          alt="dhl"
                          width={24}
                          height={24}
                          className="w-[24px] h-[24px]"
                        />
                      )}
                      {data.tracking_company === "USPS" && (
                        <Image
                          src="/icons/usps.png"
                          alt="usps"
                          width={24}
                          height={22}
                          className="w-[24px] h-[24px]"
                        />
                      )}
                      {data.tracking_company === "SDH" && (
                        <Image
                          src="/icons/sdh.png"
                          alt="sdh"
                          width={24}
                          height={22}
                          className="w-[24px] h-[24px]"
                        />
                      )}
                      {data.tracking_company === "UPS" && (
                        <Image
                          src="/svgs/ups-icon.svg"
                          alt="ups"
                          width={24}
                          height={22}
                          className="w-[24px] h-[24px]"
                        />
                      )}
                      {data.tracking_company === "YANWEN" && (
                        <Image
                          src="/svgs/yanwen.svg"
                          alt="yanwen"
                          width={24}
                          height={22}
                          className="w-[24px] h-[24px]"
                        />
                      )}
                      {data.tracking_company === "Yun Express" && (
                        <Image
                          src="/svgs/yun-express.svg"
                          alt="yun-express"
                          width={24}
                          height={22}
                          className="w-[24px] h-[24px]"
                        />
                      )}
                      {![
                        "DHL Express",
                        "USPS",
                        "SDH",
                        "UPS",
                        "YANWEN",
                        "Yun Express",
                      ].includes(data.tracking_company || "") && (
                        <Image
                          src="/icons/Layer.png"
                          alt="default-logo"
                          width={24}
                          height={22}
                          className="w-[24px] h-[24px]"
                        />
                      )}
                      <Chip
                        label={data.tracking_company}
                        size="small"
                        className="text-sm !bg-transparent text-yellow-600"
                      />
                    </Box>
                    <Typography className="text-sm text-gray-500">•</Typography>
                    <Typography>{calculateDaysGap(data)}</Typography>
                    <Typography className="text-sm text-gray-500">•</Typography>
                    <Typography
                      className={`text-sm ml-2 ${
                        data.status === "SUCCESS"
                          ? "text-green-600"
                          : data.status === "PENDING" || data.status === "OPEN"
                          ? "text-yellow-600"
                          : data.status === "CANCELLED" ||
                            data.status === "ERROR" ||
                            data.status === "FAILURE"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {data.status === "SUCCESS"
                        ? "On-Time"
                        : data.status === "PENDING" || data.status === "OPEN"
                        ? "Pending"
                        : data.status === "CANCELLED"
                        ? "Cancelled"
                        : data.status === "ERROR"
                        ? "Error"
                        : data.status === "FAILURE"
                        ? "Failed"
                        : "Unknown"}
                    </Typography>
                  </Box>
                </Tooltip>
              </React.Fragment>
            );
          })}
        </Box>
      ) : (
        <Box className="flex items-center justify-center h-80 bg-white text-gray-500">
          No Data Available
        </Box>
      )}
    </Paper>
  );
}
