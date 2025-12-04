import { Geist, Geist_Mono } from "next/font/google";
import { StoreProvider } from "@/context/StoreContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import ErrorBoundary from "@/components/ErrorBoundary";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import { createServerSideClient } from "./utils/supabase/server";
import { AffiliateRequestRow, StoreRow, UserRow } from "./utils/types";
import NextTopLoader from "nextjs-toploader";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Commercive - Full-Service eCommerce Fulfillment & 3PL Logistics",
  description:
    "Professional eCommerce fulfillment and third-party logistics (3PL) services. Dropshipping, Amazon FBA prep, TikTok Shop fulfillment with 99.9% SLA performance. Global shipping to 65+ countries.",
  keywords: [
    "eCommerce fulfillment",
    "3PL logistics",
    "dropshipping",
    "Amazon FBA prep",
    "TikTok Shop fulfillment",
    "order management",
    "inventory management",
    "global shipping",
    "warehouse fulfillment",
  ],
  authors: [{ name: "Commercive" }],
  openGraph: {
    title: "Commercive - Full-Service eCommerce Fulfillment & 3PL Logistics",
    description:
      "Professional eCommerce fulfillment with 99.9% SLA performance. Fast global shipping to 65+ countries.",
    type: "website",
    images: [
      {
        url: "https://prompt-images-nerd.s3.us-east-1.amazonaws.com/converted.png",
        width: 1200,
        height: 630,
        alt: "Commercive Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Commercive - eCommerce Fulfillment & 3PL Logistics",
    description:
      "Professional eCommerce fulfillment with 99.9% SLA performance",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSideClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userinfo: UserRow | undefined = undefined;
  let affiliateRow: AffiliateRequestRow | null = null;
  let initialAllStore: StoreRow[] = [];

  if (user) {
    const { data } = await supabase
      .from("user")
      .select()
      .eq("id", user.id)
      .single();
    userinfo = data!;
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select()
      .eq("user_id", user.id)
      .single();
    affiliateRow = affiliate;
    const { data: allStoreData } = await supabase.from("stores").select();
    initialAllStore = allStoreData || [];
  }

  return (
    <html lang="en" suppressHydrationWarning className="overflow-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased max-h-screen overflow-auto relative`}
        cz-shortcut-listen="true"
      >
        <NextTopLoader />
        <ErrorBoundary>
          <StoreProvider
            initialUserinfo={userinfo}
            initialAffiliateRow={affiliateRow}
            initialAllStore={initialAllStore}
          >
            <OnboardingProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
              <ErrorBoundary>
                <OnboardingWizard />
              </ErrorBoundary>
            </OnboardingProvider>
          </StoreProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
