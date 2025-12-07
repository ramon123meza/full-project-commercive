-- Migration: Add affiliate user name and email to referral_view
-- Run this in Supabase SQL Editor to update the view

DROP VIEW IF EXISTS referral_view;

CREATE VIEW public.referral_view WITH (security_invoker = ON) AS
SELECT
  r.id,
  r.created_at,
  r.store_name,
  r.quantity_of_order,
  r.order_number,
  r.order_time,
  r.customer_number,
  r.uuid,
  r.affiliate_id,
  r.agent_name,
  r.invoice_total,
  r.business_type,
  r.client_country,
  r.client_niche,
  r.client_group,
  acs.uid,
  COALESCE(acs.commission_method, 2) AS commission_method,
  COALESCE(acs.commission_rate, 0.01) AS commission_rate,
  acs.affiliate,
  acs.customer_id,
  afs.user_id,
  -- NEW: Include affiliate user info
  u.user_name AS affiliate_name,
  u.email AS affiliate_email,
  CASE
    WHEN acs.commission_method = 1 THEN acs.commission_rate * r.quantity_of_order::NUMERIC
    WHEN acs.commission_method = 2 THEN acs.commission_rate * r.invoice_total
    -- Default: 1% of invoice_total when no commission setting exists
    ELSE 0.01 * r.invoice_total
  END AS total_commission
FROM
  referrals r
  LEFT JOIN affiliate_customer_setting acs ON acs.affiliate = r.affiliate_id
    AND acs.customer_id = r.customer_number
  LEFT JOIN affiliates afs ON afs.affiliate_id = r.affiliate_id
  LEFT JOIN "user" u ON u.id = afs.user_id;

GRANT SELECT ON referral_view TO authenticated;
