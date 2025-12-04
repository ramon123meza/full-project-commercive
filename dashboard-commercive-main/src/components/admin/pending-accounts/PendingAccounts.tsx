"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import CustomTable from "@/components/ui/custom-table";
import CustomButton from "../../ui/custom-button";
import { createClient } from "@/app/utils/supabase/client";
import { AffiliateRow } from "@/app/utils/types";
import { getStatusColor } from "@/app/utils/utils";
import { ApprovalModal } from "./ApprovalModal";

export default function PendingAccounts() {
  const supabase = createClient();
  const [pendingUsers, setPendingUsers] = useState<AffiliateRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AffiliateRow>();
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  const limit = 10;

  const handlePagination = (curPage: number) => {
    setPage(curPage);
  };

  const handleApprove = (user: AffiliateRow) => {
    setSelectedUser(user);
    setApprovalModalOpen(true);
  };

  const closeApprovalModal = () => {
    setApprovalModalOpen(false);
    setSelectedUser(undefined);
  };

  const tableConfig = {
    handlePagination: handlePagination,
    notFoundData: "No pending accounts found",
    actionPresent: true,
    actionList: ["approve"],
    columns: [
      {
        field: "email",
        headerName: "Email",
        customRender: (row: AffiliateRow) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row.user?.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "name",
        headerName: "Name",
        customRender: (row: AffiliateRow) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">
                  {row.user?.first_name} {row.user?.last_name}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        field: "user_name",
        headerName: "User Name",
        customRender: (row: AffiliateRow) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row.user?.user_name}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "phone_number",
        headerName: "Phone",
        customRender: (row: AffiliateRow) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row.user?.phone_number || "N/A"}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "affiliate_id",
        headerName: "Affiliate ID",
        customRender: (row: AffiliateRow) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row.affiliate_id}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "created_at",
        headerName: "Signup Date",
        customRender: (row: AffiliateRow) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">
                  {new Date(row.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        customRender: (row: AffiliateRow) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className={`${getStatusColor(row.status!)}`}>{row.status}</p>
              </div>
            </div>
          );
        },
      },
    ],
    rows: pendingUsers || [],
  };

  const fetchPendingUsers = async () => {
    setIsLoading(true);
    try {
      const start = (page - 1) * limit;
      const { data, count, error } = await supabase
        .from("affiliates")
        .select("*, user(*)", { count: "exact" })
        .eq("status", "Pending")
        .order("created_at", { ascending: false })
        .range(start, start + limit - 1);

      if (error) {
        console.error("Error fetching pending accounts:", error);
        toast.error("Failed to load pending accounts");
      } else {
        setPendingUsers(data || []);
        setTotalRecords(count || 0);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
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
    fetchPendingUsers();
  }, [page]);

  return (
    <div className="flex flex-col w-full gap-5">
      {approvalModalOpen && selectedUser && (
        <ApprovalModal
          selectedUser={selectedUser}
          onClose={closeApprovalModal}
          fetchUsers={fetchPendingUsers}
        />
      )}

      <div className="flex flex-col sm:flex-row w-full justify-between gap-3 mt-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl text-white font-bold">Pending Account Approvals</h1>
          {totalRecords > 0 && (
            <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold">
              {totalRecords} Pending
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-[#E5E1FF]">
            Showing {totalRecords > 0 ? (page - 1) * limit + 1 : 0}-
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

      {totalRecords === 0 && !isLoading && (
        <div className="bg-[#2D2657] rounded-xl p-8 text-center">
          <p className="text-white text-lg">No pending accounts to review</p>
          <p className="text-[#E5E1FF] mt-2">
            All accounts have been processed. New signups will appear here for approval.
          </p>
        </div>
      )}

      <CustomTable
        tableConfig={tableConfig}
        isLoading={isLoading}
        limit={limit}
        showApproveButton
        onApprove={handleApprove}
      />
    </div>
  );
}
