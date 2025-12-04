drop view if exists referral_summary;

create view public.referral_summary
with
  (security_invoker = on) as
select
  affiliate_id,
  user_id,
  sum(total_commission) as total_amount,
  count(id) as count,
  sum(quantity_of_order) as order_count,
  coalesce(array_agg(distinct customer_number) filter (where customer_number is not null), '{}') as customer_ids
from
  referral_view r
group by
  affiliate_id,
  user_id  ;

grant
select
  on referral_summary to authenticated;