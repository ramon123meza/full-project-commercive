"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import CustomButton from "@/components/ui/custom-button";
import CustomTable from "@/components/ui/custom-table";
import { toast } from "react-toastify";
import { Button } from "@mui/material";
import { IssueRow, RequestRow } from "@/app/utils/types";

export function Request() {
  const supabase = createClient();
  const [ticketsData, setTicketsData] = useState<RequestRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  let limit = 5;

  const handlePagination = (curPage: number) => {
    setPage(curPage);
  };

  const tableConfig = {
    handlePagination: handlePagination,
    notFoundData: "No Data found",
    actionPresent: true,
    actionList: ["checkbox"],
    columns: [
      {
        field: "created_at",
        headerName: "Time Created",
        customRender: (row: any) => {
          const formatDate = (dateString: string) => {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = date.getMonth() + 1; // Months are zero-based
            const day = date.getDate();
            return `${year}/${month}/${day}`;
          };

          return <div>{formatDate(row.created_at)}</div>;
        },
      },
      {
        field: "email",
        headerName: "Email",
      },
      {
        field: "first_name",
        headerName: "First Name",
      },
      {
        field: "last_name",
        headerName: "Last Name",
      },
      {
        field: "phone_number",
        headerName: "Phone Number",
        customRender: (row: any) => (
          <a
            href={`https://wa.me/${row.phone_number}`}
            style={{ textDecoration: "underline" }}
            target="_blank"
          >
            {row.phone_number}
          </a>
        ),
      },
      {
        field: "confirmed",
        headerName: "Confirmed",
        customRender: (row: RequestRow) => (
          <span
            className={`${row.status ? "text-green-500" : "text-yellow-400"}`}
          >
            {row.status ? "Approved" : "Pending"}
          </span>
        ),
      },
    ],
    rows: ticketsData || [],
  };

  const fetchTicketsData = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const start = (currentPage - 1) * limit;
      const { data, count, error } = await supabase
        .from("signup_request")
        .select("*", { count: "exact" }) // Fetch data with exact count
        .range(start, start + limit - 1)
        .order("status")
        .order("id", { ascending: false });
      if (error) {
        console.error("Error fetching issues data:", error);
      } else {
        setTicketsData(data || []);
        setTotalRecords(count || 0); // Update total records
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (page < Math.ceil(totalRecords / limit)) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage((prevPage) => prevPage - 1);
    }
  };

  useEffect(() => {
    fetchTicketsData(page);
  }, [page]);

  const handleCheckboxClick = async (row: RequestRow) => {
    // Update Supabase
    const { data, error } = await supabase
      .from("signup_request")
      .update({ status: !row.status })
      .eq("id", row.id)
      .select()
      .single();

    if (data?.status) {
      toast("Confirm successfully.");
    } else {
      toast("Disapprove successfully.");
    }
    fetchTicketsData(page);
    if (error) {
      console.error("Error updating Supabase:", error.message);
      toast.error("Failed to update Supabase.");
    }
  };

  return (
    <>
      <div className="flex flex-col w-full gap-5 mt-3">
        <div className="flex flex-col sm:flex-row w-full gap-3 justify-between">
          <h1 className="text-2xl text-white">SignUp Requests</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-[#E5E1FF]">
              Showing {(page - 1) * limit + 1}-
              {Math.min(page * limit, totalRecords)} of {totalRecords}
            </p>
            <div className="flex items-center gap-3">
              <CustomButton
                label={"Previous"}
                className="bg-[#6B5FD1] text-[#E5E1FF]"
                callback={handlePrevious}
                disabled={page === 1}
              />
              <CustomButton
                label={"Next"}
                className="bg-[#6B5FD1] text-[#E5E1FF]"
                callback={handleNext}
                disabled={page >= Math.ceil(totalRecords / limit)}
              />
            </div>
          </div>
        </div>

        <CustomTable
          tableConfig={tableConfig}
          isLoading={isLoading}
          limit={limit}
          showCheckbox
          onCheckboxClick={handleCheckboxClick}
        />
      </div>
    </>
  );
}
