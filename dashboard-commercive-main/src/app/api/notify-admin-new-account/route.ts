import { NextRequest, NextResponse } from "next/server";
import { createServerSideClient } from "@/app/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, affiliateId } = await request.json();

    const supabase = await createServerSideClient();

    // Get all admin users
    const { data: adminUsers } = await supabase
      .from("admin")
      .select("email");

    if (!adminUsers || adminUsers.length === 0) {
      console.warn("No admin users found to notify");
      return NextResponse.json({ success: true, message: "No admins to notify" });
    }

    // TODO: Send email notification to admins
    // For now, we'll just log it. In production, integrate with your email service (SES, MailerSend, etc.)
    console.log(`New account created: ${email} (${firstName} ${lastName}) - Affiliate ID: ${affiliateId}`);
    console.log(`Admins to notify:`, adminUsers.map(a => a.email));

    // You can integrate with your existing email service here
    // Example: Send email using the same MailerSend service from actions.ts

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error notifying admin:", error);
    return NextResponse.json(
      { success: false, error: "Failed to notify admin" },
      { status: 500 }
    );
  }
}
