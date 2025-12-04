import { createClient } from "@/app/utils/supabase/client";
import { ReferralSummaryRow, WalletRow } from "@/app/utils/types";
import CustomButton from "@/components/ui/custom-button";
import CustomTable from "@/components/ui/custom-table";
import { useEffect, useState } from "react";
import { AffiliateSettingModal } from "./AffiliateSettingModal";

let limit = 5;

const affiliateMap = new Map<string, ReferralSummaryRow>();

export const WalletTable = ({
  triggerKey,
  updateTables,
}: {
  triggerKey: number;
  updateTables: () => void;
}) => {
  const supabase = createClient();
  const [referralsData, setReferralsData] = useState<ReferralSummaryRow[]>([]);
  const [affiliate, setAffiliate] = useState<ReferralSummaryRow>();
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
        customRender: (row: ReferralSummaryRow) => <p>{row.affiliate_id}</p>,
      },
      {
        field: "user",
        headerName: "User",
        customRender: (row: ReferralSummaryRow) => (
          <p>{row.user?.email || "---"}</p>
        ),
      },
      {
        filed: "customer_ids",
        headerName: "Customer Ids",
        customRender: (row: ReferralSummaryRow) => (
          <p>{row.customer_ids?.join(", ") || "---"}</p>
        ),
      },
      {
        field: "commission_count",
        headerName: "Commission Count",
        customRender: (row: ReferralSummaryRow) => <p>{row.count || 0}</p>,
      },
      {
        field: "order_qty",
        headerName: "Order QTY",
        customRender: (row: ReferralSummaryRow) => (
          <p>{row.order_count || 0}</p>
        ),
      },
      {
        field: "total",
        headerName: "Total Commission",
        customRender: (row: ReferralSummaryRow) => {
          return (
            <p className="text-[#4aaa40]">
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
        .from("referral_summary")
        .select("*, user(*)", { count: "exact" }) // Fetch data with exact count
        .range(start, start + limit - 1)
        .order("total_amount", { ascending: false });
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

  const onSelectRow = (row: ReferralSummaryRow) => {
    setAffiliate(row);
  };

  useEffect(() => {
    // const fetchAffiliates = async () => {
    //   const { data } = await supabase
    //     .from("affiliate_with_customerid_list")
    //     .select("*, user(*)");
    //   (data || []).forEach((affiliate) => {
    //     if (affiliate.affiliate_id) {
    //       affiliateMap.set(affiliate.affiliate_id, affiliate);
    //     }
    //   });
    //   setAffiliates(data || []);
    // };
    // fetchAffiliates();
  }, []);

  useEffect(() => {
    fetchReferralsData(page);
  }, [page, triggerKey]);

  return (
    <div className="mt-4">
      <div className="flex mb-4 justify-between">
        <h1 className="text-2xl text-white">Partner Summary</h1>
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
        showCheckbox
        onCheckboxClick={onSelectRow}
      />
      {affiliate && (
        <AffiliateSettingModal
          affiliate={affiliate}
          onClose={() => {
            setAffiliate(undefined);
          }}
          updateTables={updateTables}
        />
      )}
    </div>
  );
};
