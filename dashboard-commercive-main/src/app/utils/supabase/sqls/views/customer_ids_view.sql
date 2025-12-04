drop view if exists customer_ids_view;

create view public.customer_ids_view with (security_invoker = on) as
select
  customer_number
from
  referrals
group by
  referrals.customer_number

GRANT SELECT ON customer_ids_view to authenticated;
