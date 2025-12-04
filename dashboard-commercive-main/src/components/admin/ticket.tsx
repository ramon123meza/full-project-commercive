"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import CustomButton from "@/components/ui/custom-button";
import CustomTable from "@/components/ui/custom-table";
import { toast } from "react-toastify";
import { Button } from "@mui/material";
import { IssueRow } from "@/app/utils/types";
import { Request } from "./ticket/request";

export default function Ticket() {
  const supabase = createClient();
  const [ticketsData, setTicketsData] = useState<IssueRow[]>([]);
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
        field: "name",
        headerName: "User Name",
        customRender: (row: any) => <span>{row.name}</span>,
      },
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
        customRender: (row: any) => <span>{row.email}</span>,
      },
      {
        field: "store_url",
        headerName: "Store URL",
        customRender: (row: any) => <span>{row.store_url}</span>,
      },
      {
        field: "issue",
        headerName: "Issue",
        customRender: (row: any) => <span>{row.issue}</span>,
      },
      {
        field: "reply",
        headerName: "Reply",
        customRender: (row: any) => (
          <a
            className="bg-transparent text-[#FFFFFF] border py-1 px-2 rounded-md"
            href={`https://wa.me/${row.phone_number}`}
            target="_blank"
          >
            Reply
          </a>
        ),
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
        customRender: (row: any) => (
          <span
            className={`${
              row.confirmed ? "text-green-500" : "text-yellow-400"
            }`}
          >
            {row.confirmed ? "Solved" : "Pending"}
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
        .from("issues")
        .select("*", { count: "exact" }) // Fetch data with exact count
        .range(start, start + limit - 1)
        .order("created_at", { ascending: false });
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

  const handleCheckboxClick = async (row: IssueRow) => {
    // Update Supabase
    const { data, error }: any = await supabase
      .from("issues")
      .update({ confirmed: !row.confirmed })
      .eq("id", row.id)
      .select()
      .single();

    if (data?.confirmed) {
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
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-col sm:flex-row w-full justify-end gap-3 justify-between">
          <h1 className="text-2xl text-white">Tickets</h1>
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
      <Request />
    </>
  );
}
