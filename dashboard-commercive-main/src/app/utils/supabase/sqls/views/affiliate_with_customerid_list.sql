drop view if exists affiliate_with_customerid_list;

create view affiliate_with_customerid_list with (security_invoker = on) as
select
  a.id,
  a.affiliate_id,
  a.form_url,
  a.status,
  a.user_id,
      coalesce(array_agg(ac.customer_id) filter (where ac.customer_id is not null), '{}') as customer_ids
from
  "affiliates" a
  left join affiliate_to_customer ac on ac.affiliate_id = a.affiliate_id
group by
  a.id,
  a.affiliate_id,
  a.form_url,
  a.status,
  a.user_id
order by
  a.affiliate_id;

GRANT SELECT ON affiliate_with_customerid_list to authenticated;
