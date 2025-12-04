"use server";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { createSuperAdminClient } from "./utils/supabase/server";

const mailerAPIKEY = process.env.MAILERSEND_APIKEY!;

export const sendEmail = async ({
  email,
  password,
  request,
}: {
  email: string;
  password: string;
  request: any;
}) => {
  const supabase = await createSuperAdminClient();
  const mailerSend = new MailerSend({
    apiKey: mailerAPIKEY,
  });
  const sentFrom = new Sender("noreply@commercive.co", "Commercive");
  const recipients = [new Recipient(email)];
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "signup",
    email: email,
    password: password,
    options: {
      data: { ...request, role: "user" },
    },
  });

  const html = getHtml(data.properties?.action_link!);

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("Confirm your email")
    .setHtml(html)
    .setText("");
  const res = await mailerSend.email.send(emailParams);
  return res;
};

const getHtml = (url: string) => {
  return `
  <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Confirm your email</title>
</head>
<body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f9f9f9;">
  <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;">
    <tr>
      <td style="padding:40px 20px; text-align:center; background-color:#ffffff; border-radius:12px;">
        
        <h1 style="color:#333333; font-size:24px; margin-bottom:20px;">
          Welcome to Commercive 🎉
        </h1>
        
        <p style="color:#555555; font-size:16px; line-height:1.5; margin-bottom:30px;">
          Thanks for signing up! Please confirm your email address so we can keep you updated with the latest news, offers, and updates.  
        </p>
        
        <a href="${url}" 
           style="display:inline-block; padding:14px 28px; font-size:16px; 
                  color:#ffffff; background-color:#007bff; text-decoration:none; 
                  border-radius:8px; font-weight:bold;">
          Confirm Email
        </a>
        
        <p style="color:#888888; font-size:12px; margin-top:30px;">
          If you didn’t sign up for this account, you can safely ignore this email.
        </p>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
};
