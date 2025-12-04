import { ReactNode } from "react";
import { createServerSideClient } from "../utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Layout({ children }: { children: ReactNode }) {
  const supabase = await createServerSideClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return <>{children}</>;
}
