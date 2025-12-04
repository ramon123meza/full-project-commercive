"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import CustomButton from "@/components/ui/custom-button";
import CustomTable from "@/components/ui/custom-table";
import { toast } from "react-toastify";
import { PayoutInsert, PayoutRow, PayoutUserRow } from "@/app/utils/types";
import CustomModal from "../../ui/modal";
import InputField from "../../ui/custom-inputfild";
import { MenuItem, Select } from "@mui/material";
import { AFFILIATE_STATUS } from "@/app/utils/constants";
import { PayoutView } from "./PayoutView";
import { getStatusColor } from "@/app/utils/utils";

const initialError = {
  email: "",
  amount: "",
  paypal_address: "",
  status: "",
};

const initialFormData = {
  email: "",
  amount: 0,
  paypal_address: "",
  status: "Pending",
};

export default function Payout() {
  const supabase = createClient();
  const [payoutsData, setPayoutsData] = useState<PayoutUserRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutUserRow>();
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState(initialError);
  const [isSaving, setIsSaving] = useState(false);
  const [triggerKey, setTriggerKey] = useState(0);

  let limit = 5;

  const handleOnChange = (updatedField: Partial<typeof formData>) => {
    setFormData((prev) => ({
      ...prev,
      ...updatedField,
    }));
    setErrors((prev) => ({
      ...prev,
      ...Object.keys(updatedField).reduce((acc, key) => {
        acc[key as keyof typeof errors] = "";
        return acc;
      }, {} as typeof errors),
    }));
  };

  const handlePagination = (curPage: number) => {
    setPage(curPage);
  };

  // FIX 8: Add Approve and Complete action handlers
  const handleApprovePayout = async (row: PayoutUserRow) => {
    try {
      const { error } = await supabase
        .from("payouts")
        .update({ status: "Approved" })
        .eq("id", row.id);

      if (error) {
        toast.error("Failed to approve payout: " + error.message);
      } else {
        toast.success("Payout approved successfully!");
        await fetchPayoutsData(page);
      }
    } catch (error: any) {
      toast.error("Error approving payout: " + (error?.message || "Unknown error"));
      console.error("Approve payout error:", error);
    }
  };

  const handleCompletePayout = async (row: PayoutUserRow) => {
    try {
      const { error } = await supabase
        .from("payouts")
        .update({ status: "Completed" })
        .eq("id", row.id);

      if (error) {
        toast.error("Failed to complete payout: " + error.message);
      } else {
        toast.success("Payout completed successfully!");
        await fetchPayoutsData(page);
      }
    } catch (error: any) {
      toast.error("Error completing payout: " + (error?.message || "Unknown error"));
      console.error("Complete payout error:", error);
    }
  };

  const tableConfig = {
    handlePagination: handlePagination,
    notFoundData: "No Data found",
    actionPresent: true,
    actionList: ["checkbox"],
    columns: [
      {
        field: "created_at",
        headerName: "Requested At",
        customRender: (row: any) => <span>{row.created_at.split("T")[0]}</span>,
      },
      {
        field: "name",
        headerName: "User",
        customRender: (row: any) => <span>{row.user.email}</span>,
      },
      {
        field: "amount",
        headerName: "Amount",
        customRender: (row: any) => <span>${row.amount}</span>,
      },
      {
        field: "payment_method",
        headerName: "Payment Method",
        customRender: (row: any) => (
          <span className="capitalize">{row.payment_method || 'PayPal'}</span>
        ),
      },
      {
        field: "payment_details",
        headerName: "Payment Info",
        customRender: (row: any) => {
          const details = row.payment_details || {};
          const method = row.payment_method || 'paypal';
          if (method === 'paypal') {
            return <span className="text-sm">{details.email || row.paypal_address}</span>;
          } else if (method === 'zelle') {
            return <span className="text-sm">{details.zelle_email || details.zelle_phone}</span>;
          } else if (method === 'wise') {
            return <span className="text-sm">{details.email}</span>;
          }
          return <span className="text-sm">{row.paypal_address}</span>;
        },
      },
      {
        field: "status",
        headerName: "Status",
        customRender: (row: any) => {
          const statusMap: {[key: string]: string} = {
            'Pending': 'Requested',
            'Approved': 'Processing',
            'Completed': 'Completed'
          };
          const displayStatus = statusMap[row.status] || row.status;
          return (
            <span className={getStatusColor(row.status)}>{displayStatus}</span>
          );
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        customRender: (row: any) => (
          <div className="flex gap-2">
            {row.status === "Pending" && (
              <CustomButton
                label="Process"
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1"
                callback={() => handleApprovePayout(row)}
              />
            )}
            {row.status === "Approved" && (
              <CustomButton
                label="Complete"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1"
                callback={() => handleCompletePayout(row)}
              />
            )}
            {row.status === "Completed" && (
              <span className="text-sm text-green-600 font-semibold">✓ Done</span>
            )}
          </div>
        ),
      },
    ],
    rows: payoutsData || [],
  };

  const fetchPayoutsData = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const start = (currentPage - 1) * limit;
      const {
        data: payouts,
        count,
        error: payoutError,
      } = await supabase
        .from("payouts")
        .select("*, user(*)", { count: "exact" })
        .range(start, start + limit - 1)
        .order("created_at", { ascending: false });

      if (payoutError) {
        console.error("Error fetching payouts data:", payoutError);
        return;
      }

      if (!payouts || payouts.length === 0) {
        setPayoutsData([]);
        setTotalRecords(count || 0);
        return;
      }

      const updatedPayouts = payouts.map((payout) => ({
        ...payout,
        name: payout.user.user_name,
      }));
      setPayoutsData(updatedPayouts);
      setTotalRecords(count || 0);
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

  const handleCheckboxClick = async (row: PayoutUserRow) => {
    setSelectedPayout(row);
    setFormData({
      email: row.user.email!,
      paypal_address: row.paypal_address,
      amount: row.amount,
      status: row.status,
    });
    setAddModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data: user } = await supabase
      .from("user")
      .select()
      .eq("email", formData.email)
      .single();
    if (!user) {
      setErrors((prev) => ({ ...prev, email: "User not found" }));
      toast.error("User not found!");
      setIsSaving(false);
      return;
    }
    if (selectedPayout) {
      const { error } = await supabase
        .from("payouts")
        .update({
          user_id: user.id,
          amount: formData.amount,
          paypal_address: formData.paypal_address,
          status: formData.status as any,
        })
        .eq("id", selectedPayout.id);
      if (error) {
        toast.error(error.message);
      } else {
        setTriggerKey(triggerKey + 1);
        await fetchPayoutsData(page);
        toast.success("Update Row Success!");
      }
    }
    setIsSaving(false);
  };

  const handleDelete = (row: PayoutUserRow) => {
    setSelectedPayout(row);
    setDeleteModalOpen(true);
  };

  const deleteRow = async () => {
    if (selectedPayout) {
      const { error } = await supabase
        .from("payouts")
        .delete()
        .eq("id", selectedPayout.id);
      if (error) {
        toast.error("Failed to delete the row.");
      } else {
        await fetchPayoutsData(page);
        setDeleteModalOpen(false);
        toast.success("Row deleted successfully.");
      }
    }
  };

  useEffect(() => {
    fetchPayoutsData(page);
  }, [page]);

  return (
    <div className="flex flex-col w-full gap-5">
      <h1 className="text-2xl text-white">Payouts</h1>
      <div className="flex flex-col sm:flex-row w-full justify-end gap-3">
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

      {addModalOpen && (
        <CustomModal
          onClose={() => setAddModalOpen(false)}
          maxWidth={"max-w-[400px]"}
        >
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-semibold">
              {selectedPayout ? "Update" : "Add new"}
            </h2>
            <div className="flex flex-col gap-6 max-sm:h-full max-sm:max-h-[350px]">
              <div className="flex flex-col relative w-full">
                <InputField
                  name="user_email"
                  placeholder="Enter User Email"
                  type="email"
                  className="mt-[8px]"
                  label={`User Email`}
                  value={formData?.email || ""}
                  onChange={(e: any) =>
                    handleOnChange({ email: e.target.value })
                  }
                />
                {errors?.email && (
                  <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                    {errors?.email}
                  </p>
                )}
              </div>
              <div className="flex flex-col relative w-full">
                <InputField
                  name="amount"
                  placeholder="Enter amount"
                  type="number"
                  className="mt-[8px]"
                  label={`Amount($)`}
                  value={formData.amount.toString() || ""}
                  onChange={(e: any) =>
                    handleOnChange({ amount: e.target.value })
                  }
                />
                {errors?.amount && (
                  <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                    {errors?.amount}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col relative w-full gap-2">
                  <label>Status</label>
                  <Select
                    value={formData.status}
                    onChange={(e: any) =>
                      handleOnChange({ status: e.target.value })
                    }
                  >
                    {AFFILIATE_STATUS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors?.status && (
                    <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                      {errors?.status}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end w-full mt-4">
            <CustomButton
              label={selectedPayout ? "Update" : "Add"}
              callback={handleSave}
              className="bg-[#6B5FD1] text-[#E5E1FF]"
              interactingAPI={isSaving}
            />
          </div>
        </CustomModal>
      )}

      {deleteModalOpen && (
        <CustomModal
          onClose={() => {
            setDeleteModalOpen(false);
            // setFormData(initialFormData);
          }}
          maxWidth="max-w-[400px]"
        >
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-semibold">Delete the Row?</h2>
            <div className="flex justify-end w-full">
              <CustomButton
                className="bg-[#6B5FD1] text-[#E5E1FF]"
                label="OK"
                callback={deleteRow}
                interactingAPI={isLoading}
                disabled={isLoading}
              />
            </div>
          </div>
        </CustomModal>
      )}

      <CustomTable
        tableConfig={tableConfig}
        isLoading={isLoading}
        limit={limit}
        showCheckbox
        onCheckboxClick={handleCheckboxClick}
        onDelete={handleDelete}
      />
      <PayoutView triggerKey={triggerKey} />
    </div>
  );
}
