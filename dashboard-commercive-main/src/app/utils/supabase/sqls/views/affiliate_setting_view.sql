drop view if exists affiliate_setting_view;

create view public.affiliate_setting_view
with
  (security_invoker = on) as
select
  affiliate_id,
  user_id,
  sum(total_commission) as total_amount,
  count(id) as count,
  sum(quantity_of_order) as order_count,
  commission_method,
  commission_rate,
  customer_number
from
  referral_view r
group by
  affiliate_id,
  customer_number,
  commission_method,
  commission_rate,
  user_id  ;

grant
select
  on affiliate_setting_view to authenticated;