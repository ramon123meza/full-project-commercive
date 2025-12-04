import { createClient } from "@/app/utils/supabase/client";
import { ReferralSummaryRow, PayoutViewRow } from "@/app/utils/types";
import { getStatusColor } from "@/app/utils/utils";
import CustomButton from "@/components/ui/custom-button";
import CustomTable from "@/components/ui/custom-table";
import { useEffect, useState } from "react";

let limit = 5;

const affiliateMap = new Map<string, ReferralSummaryRow>();

export const PayoutView = ({ triggerKey }: { triggerKey: number }) => {
  const supabase = createClient();
  const [referralsData, setReferralsData] = useState<PayoutViewRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handlePagination = (curPage: number) => {
    setPage(curPage);
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

  const tableConfig = {
    handlePagination: handlePagination,
    notFoundData: "No Data found",
    actionPresent: true,
    actionList: ["edit", "delete"],
    columns: [
      {
        field: "customer_number",
        headerName: "Customer",
        customRender: (row: PayoutViewRow) => <p>{row.user?.email}</p>,
      },
      {
        filed: "user",
        headerName: "User",
        customRender: (row: PayoutViewRow) => (
          <p className={getStatusColor(row.status!)}>{row.status}</p>
        ),
      },
      {
        field: "order_qty",
        headerName: "Payout Count",
        customRender: (row: PayoutViewRow) => <p>{row.total_count || 0}</p>,
      },
      {
        field: "total",
        headerName: "Total Payout",
        customRender: (row: PayoutViewRow) => {
          return (
            <p className={getStatusColor(row.status!)}>
              ${(row.total_amount || 0).toFixed(2)}
            </p>
          );
        },
      },
    ],
    rows: referralsData || [],
  };

  const fetchReferralsData = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const start = (currentPage - 1) * limit;
      const { data, count, error } = await supabase
        .from("payout_view")
        .select("*, user(*)", { count: "exact" }) // Fetch data with exact count
        .range(start, start + limit - 1)
        .order("user(email)", { ascending: false });
      if (error) {
        console.error("Error fetching referrals data:", error);
      } else {
        setReferralsData(data || []);
        setTotalRecords(count || 0); // Update total records
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralsData(page);
  }, [page, triggerKey]);

  return (
    <div>
      <div className="flex mb-4 justify-between">
        <h1 className="text-2xl text-white">Payout Summary</h1>
        <div className="flex items-center gap-3">
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
      />
    </div>
  );
};
