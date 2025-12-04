drop view if exists referral_view;

create view public.referral_view with (security_invoker = on) as
select
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
  acs.commission_method,
  acs.commission_rate,
  acs.affiliate,
  acs.customer_id,
  afs.user_id,
  case
    when acs.commission_method = 1 then acs.commission_rate * r.quantity_of_order::numeric
    when acs.commission_method = 2 then acs.commission_rate * r.invoice_total
    else 0::numeric
  end as total_commission
from
  referrals r
  left join affiliate_customer_setting acs on acs.affiliate = r.affiliate_id
  and acs.customer_id = r.customer_number
  left join affiliates afs on afs.affiliate_id = r.affiliate_id
  ;
GRANT SELECT ON referral_view to authenticated;
