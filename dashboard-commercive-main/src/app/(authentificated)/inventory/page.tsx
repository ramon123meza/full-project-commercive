"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect page for /inventory route
 * This page has been merged into the Inventory Management page
 * Redirects users to /inventory-management
 */
export default function InventoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new combined Inventory Management page
    router.replace("/inventory-management");
  }, [router]);

  return (
    <main className="flex flex-col h-full items-center justify-center bg-[#FAFAFA] p-8">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate">Redirecting to Inventory Management...</p>
      </div>
    </main>
  );
}
