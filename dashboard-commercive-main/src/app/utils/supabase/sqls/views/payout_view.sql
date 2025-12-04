drop view if exists payout_view;

create view public.payout_view with (security_invoker = on) as
select
  u.email,
  u.id,
  sum(payouts.amount) as total_amount,
  count(payouts.id) as total_count
from
  payouts
  JOIN user u on payouts.user_id = u.id
group by
  payouts.user_id,
  payouts.status