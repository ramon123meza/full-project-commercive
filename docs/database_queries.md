-- ================================================================
-- PART 1: LIST ALL TABLES WITH ROW COUNTS
-- ================================================================
SELECT
    schemaname,
    tablename,
    n_live_tup AS estimated_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

Output: 
Error: Failed to run sql query: ERROR: 42703: column "tablename" does not exist LINE 6: tablename
-- ================================================================
-- PART 2: DETAILED TABLE STRUCTURE (ALL COLUMNS)
-- ================================================================
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    c.udt_name AS detailed_type,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length,
    c.numeric_precision
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
Output:
[
  {
    "table_name": "_prisma_migrations",
    "column_name": "id",
    "data_type": "character varying",
    "detailed_type": "varchar",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": 36,
    "numeric_precision": null
  },
  {
    "table_name": "_prisma_migrations",
    "column_name": "checksum",
    "data_type": "character varying",
    "detailed_type": "varchar",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": 64,
    "numeric_precision": null
  },
  {
    "table_name": "_prisma_migrations",
    "column_name": "finished_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "_prisma_migrations",
    "column_name": "migration_name",
    "data_type": "character varying",
    "detailed_type": "varchar",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": 255,
    "numeric_precision": null
  },
  {
    "table_name": "_prisma_migrations",
    "column_name": "logs",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "_prisma_migrations",
    "column_name": "rolled_back_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "_prisma_migrations",
    "column_name": "started_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "_prisma_migrations",
    "column_name": "applied_steps_count",
    "data_type": "integer",
    "detailed_type": "int4",
    "is_nullable": "NO",
    "column_default": "0",
    "character_maximum_length": null,
    "numeric_precision": 32
  },
  {
    "table_name": "admin",
    "column_name": "id",
    "data_type": "bigint",
    "detailed_type": "int8",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 64
  },
  {
    "table_name": "admin",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "admin",
    "column_name": "user_id",
    "data_type": "uuid",
    "detailed_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "admin",
    "column_name": "email",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliate_customer_setting",
    "column_name": "uid",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliate_customer_setting",
    "column_name": "commission_method",
    "data_type": "smallint",
    "detailed_type": "int2",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 16
  },
  {
    "table_name": "affiliate_customer_setting",
    "column_name": "commission_rate",
    "data_type": "numeric",
    "detailed_type": "numeric",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliate_customer_setting",
    "column_name": "affiliate",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliate_customer_setting",
    "column_name": "customer_id",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliates",
    "column_name": "id",
    "data_type": "bigint",
    "detailed_type": "int8",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 64
  },
  {
    "table_name": "affiliates",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliates",
    "column_name": "user_id",
    "data_type": "uuid",
    "detailed_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliates",
    "column_name": "status",
    "data_type": "USER-DEFINED",
    "detailed_type": "AFFILIATE_STATUS",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliates",
    "column_name": "store_url",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliates",
    "column_name": "affiliate_id",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliates",
    "column_name": "form_url",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliates",
    "column_name": "auto_payout_enabled",
    "data_type": "boolean",
    "detailed_type": "bool",
    "is_nullable": "YES",
    "column_default": "false",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "affiliates",
    "column_name": "preferred_payment_method",
    "data_type": "character varying",
    "detailed_type": "varchar",
    "is_nullable": "YES",
    "column_default": "'paypal'::character varying",
    "character_maximum_length": 20,
    "numeric_precision": null
  },
  {
    "table_name": "affiliates",
    "column_name": "payment_method_details",
    "data_type": "jsonb",
    "detailed_type": "jsonb",
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "inventory_id",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "sku",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "product_id",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "inventory_level",
    "data_type": "json",
    "detailed_type": "json",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "store_url",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "back_orders",
    "data_type": "integer",
    "detailed_type": "int4",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 32
  },
  {
    "table_name": "inventory",
    "column_name": "product_image",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "variant_name",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "product_name",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "inventory",
    "column_name": "variant_id",
    "data_type": "bigint",
    "detailed_type": "int8",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 64
  },
  {
    "table_name": "issues",
    "column_name": "id",
    "data_type": "bigint",
    "detailed_type": "int8",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 64
  },
  {
    "table_name": "issues",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "issues",
    "column_name": "name",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "issues",
    "column_name": "email",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "issues",
    "column_name": "store_url",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "issues",
    "column_name": "issue",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "issues",
    "column_name": "confirmed",
    "data_type": "boolean",
    "detailed_type": "bool",
    "is_nullable": "NO",
    "column_default": "false",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "issues",
    "column_name": "phone_number",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "issues",
    "column_name": "user_id",
    "data_type": "uuid",
    "detailed_type": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "new_leads",
    "column_name": "id",
    "data_type": "uuid",
    "detailed_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "new_leads",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "new_leads",
    "column_name": "name",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "new_leads",
    "column_name": "email",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "new_leads",
    "column_name": "phone",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "new_leads",
    "column_name": "webUrl",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "new_leads",
    "column_name": "businessPlatform",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "new_leads",
    "column_name": "orderUnits",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "new_leads",
    "column_name": "source",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "id",
    "data_type": "uuid",
    "detailed_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "order_number",
    "data_type": "numeric",
    "detailed_type": "numeric",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "processed_at",
    "data_type": "timestamp without time zone",
    "detailed_type": "timestamp",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "order_status_url",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "customer_id",
    "data_type": "numeric",
    "detailed_type": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "customer_email",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "shipping_address",
    "data_type": "jsonb",
    "detailed_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "currency",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "total_order_value",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "sub_total_price",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "current_total_tax",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "tax_rate",
    "data_type": "numeric",
    "detailed_type": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 65
  },
  {
    "table_name": "order",
    "column_name": "shipping_costs",
    "data_type": "numeric",
    "detailed_type": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 65
  },
  {
    "table_name": "order",
    "column_name": "fulfillment_status",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "total_discounts",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "line_items",
    "data_type": "ARRAY",
    "detailed_type": "_json",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "order_tags",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "detailed_type": "timestamp",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "detailed_type": "timestamp",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "financial_status",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "order_id",
    "data_type": "bigint",
    "detailed_type": "int8",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 64
  },
  {
    "table_name": "order",
    "column_name": "total_discounts_set",
    "data_type": "json",
    "detailed_type": "json",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "current_total_tax_set",
    "data_type": "json",
    "detailed_type": "json",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "fulfillments",
    "data_type": "json",
    "detailed_type": "json",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "sub_total_price_usd",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "shipping_costs_usd",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order",
    "column_name": "store_url",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "order_id",
    "data_type": "bigint",
    "detailed_type": "int8",
    "is_nullable": "NO",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 64
  },
  {
    "table_name": "order_items",
    "column_name": "grams",
    "data_type": "numeric",
    "detailed_type": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "quantity",
    "data_type": "bigint",
    "detailed_type": "int8",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 64
  },
  {
    "table_name": "order_items",
    "column_name": "sku",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "product_id",
    "data_type": "bigint",
    "detailed_type": "int8",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 64
  },
  {
    "table_name": "order_items",
    "column_name": "total_discount",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "vendor_name",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "discount_allocations",
    "data_type": "json",
    "detailed_type": "json",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "lineItem_id",
    "data_type": "bigint",
    "detailed_type": "int8",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": 64
  },
  {
    "table_name": "order_items",
    "column_name": "id",
    "data_type": "uuid",
    "detailed_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "price",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "currency",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "store_url",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "order_items",
    "column_name": "image_url",
    "data_type": "text",
    "detailed_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "payouts",
    "column_name": "id",
    "data_type": "uuid",
    "detailed_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "character_maximum_length": null,
    "numeric_precision": null
  },
  {
    "table_name": "payouts",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "detailed_type": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()",
    "character_maximum_length": null,
    "numeric_precision": null
  }
]

-- ================================================================
-- PART 3: PRIMARY KEYS
-- ================================================================
SELECT
    tc.table_name,
    kcu.column_name AS primary_key_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name;

Output: 
[
  {
    "table_name": "_prisma_migrations",
    "primary_key_column": "id"
  },
  {
    "table_name": "admin",
    "primary_key_column": "id"
  },
  {
    "table_name": "affiliate_customer_setting",
    "primary_key_column": "uid"
  },
  {
    "table_name": "affiliates",
    "primary_key_column": "id"
  },
  {
    "table_name": "inventory",
    "primary_key_column": "inventory_id"
  },
  {
    "table_name": "issues",
    "primary_key_column": "id"
  },
  {
    "table_name": "new_leads",
    "primary_key_column": "id"
  },
  {
    "table_name": "order",
    "primary_key_column": "id"
  },
  {
    "table_name": "order_items",
    "primary_key_column": "id"
  },
  {
    "table_name": "payouts",
    "primary_key_column": "id"
  },
  {
    "table_name": "referrals",
    "primary_key_column": "id"
  },
  {
    "table_name": "session",
    "primary_key_column": "id"
  },
  {
    "table_name": "signup_request",
    "primary_key_column": "id"
  },
  {
    "table_name": "stores",
    "primary_key_column": "id"
  },
  {
    "table_name": "trackings",
    "primary_key_column": "id"
  },
  {
    "table_name": "user",
    "primary_key_column": "id"
  },
  {
    "table_name": "webhooks",
    "primary_key_column": "id"
  }
]

-- ================================================================
-- PART 4: FOREIGN KEY RELATIONSHIPS
-- ================================================================
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

Output: 
[
  {
    "source_table": "admin",
    "source_column": "user_id",
    "target_table": "user",
    "target_column": "id",
    "constraint_name": "admin_user_id_fkey"
  },
  {
    "source_table": "affiliates",
    "source_column": "store_url",
    "target_table": "stores",
    "target_column": "store_url",
    "constraint_name": "affiliates_store_url_fkey"
  },
  {
    "source_table": "affiliates",
    "source_column": "user_id",
    "target_table": "user",
    "target_column": "id",
    "constraint_name": "affiliates_user_id_fkey"
  },
  {
    "source_table": "issues",
    "source_column": "user_id",
    "target_table": "user",
    "target_column": "id",
    "constraint_name": "issues_user_id_fkey"
  },
  {
    "source_table": "payouts",
    "source_column": "store_url",
    "target_table": "stores",
    "target_column": "store_url",
    "constraint_name": "payouts_store_url_fkey"
  },
  {
    "source_table": "payouts",
    "source_column": "user_id",
    "target_table": "user",
    "target_column": "id",
    "constraint_name": "payouts_user_id_fkey"
  },
  {
    "source_table": "store_to_user",
    "source_column": "user_id",
    "target_table": "user",
    "target_column": "id",
    "constraint_name": "store_to_user_user_id_fkey"
  },
  {
    "source_table": "store_to_user",
    "source_column": "store_id",
    "target_table": "stores",
    "target_column": "id",
    "constraint_name": "store_to_user_store_id_fkey"
  },
  {
    "source_table": "trackings",
    "source_column": "order_id",
    "target_table": "order",
    "target_column": "order_id",
    "constraint_name": "trackings_order_id_fkey"
  }
]

-- PART 5: UNIQUE CONSTRAINTS
-- ================================================================
SELECT
    tc.table_name,
    kcu.column_name AS unique_column,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name;
Output:
[
  {
    "table_name": "affiliate_customer_setting",
    "unique_column": "uid",
    "constraint_name": "affiliate_customer_setting_id_key"
  },
  {
    "table_name": "affiliates",
    "unique_column": "user_id",
    "constraint_name": "affiliates_user_id_key"
  },
  {
    "table_name": "affiliates",
    "unique_column": "affiliate_id",
    "constraint_name": "affiliates_customer_id_key"
  },
  {
    "table_name": "inventory",
    "unique_column": "inventory_id",
    "constraint_name": "inventory_inventory_id_key"
  },
  {
    "table_name": "inventory",
    "unique_column": "variant_id",
    "constraint_name": "inventory_variant_id_key"
  },
  {
    "table_name": "order",
    "unique_column": "order_id",
    "constraint_name": "unique_order_product"
  },
  {
    "table_name": "order_items",
    "unique_column": "order_id",
    "constraint_name": "unique_line_items_product"
  },
  {
    "table_name": "order_items",
    "unique_column": "product_id",
    "constraint_name": "unique_line_items_product"
  },
  {
    "table_name": "referrals",
    "unique_column": "uuid",
    "constraint_name": "referrals_uuid_key"
  },
  {
    "table_name": "store_to_user",
    "unique_column": "uuid",
    "constraint_name": "store_to_user_uuid_key"
  },
  {
    "table_name": "stores",
    "unique_column": "store_url",
    "constraint_name": "stores_store_url_key"
  },
  {
    "table_name": "trackings",
    "unique_column": "order_id",
    "constraint_name": "trackings_order_id_key"
  },
  {
    "table_name": "user",
    "unique_column": "email",
    "constraint_name": "user_email_key"
  },
  {
    "table_name": "user",
    "unique_column": "id",
    "constraint_name": "user_id_key"
  }
]

-- ================================================================
-- PART 6: INDEXES
-- ================================================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

Output:
[
  {
    "schemaname": "public",
    "tablename": "_prisma_migrations",
    "indexname": "_prisma_migrations_pkey",
    "indexdef": "CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "admin",
    "indexname": "admin_pkey",
    "indexdef": "CREATE UNIQUE INDEX admin_pkey ON public.admin USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "affiliate_customer_setting",
    "indexname": "affiliate_customer_setting_id_key",
    "indexdef": "CREATE UNIQUE INDEX affiliate_customer_setting_id_key ON public.affiliate_customer_setting USING btree (uid)"
  },
  {
    "schemaname": "public",
    "tablename": "affiliate_customer_setting",
    "indexname": "affiliate_customer_setting_pkey",
    "indexdef": "CREATE UNIQUE INDEX affiliate_customer_setting_pkey ON public.affiliate_customer_setting USING btree (uid)"
  },
  {
    "schemaname": "public",
    "tablename": "affiliates",
    "indexname": "affiliates_customer_id_key",
    "indexdef": "CREATE UNIQUE INDEX affiliates_customer_id_key ON public.affiliates USING btree (affiliate_id)"
  },
  {
    "schemaname": "public",
    "tablename": "affiliates",
    "indexname": "affiliates_pkey",
    "indexdef": "CREATE UNIQUE INDEX affiliates_pkey ON public.affiliates USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "affiliates",
    "indexname": "affiliates_user_id_key",
    "indexdef": "CREATE UNIQUE INDEX affiliates_user_id_key ON public.affiliates USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "inventory",
    "indexname": "inventory_inventory_id_key",
    "indexdef": "CREATE UNIQUE INDEX inventory_inventory_id_key ON public.inventory USING btree (inventory_id)"
  },
  {
    "schemaname": "public",
    "tablename": "inventory",
    "indexname": "inventory_pkey",
    "indexdef": "CREATE UNIQUE INDEX inventory_pkey ON public.inventory USING btree (inventory_id)"
  },
  {
    "schemaname": "public",
    "tablename": "inventory",
    "indexname": "inventory_variant_id_key",
    "indexdef": "CREATE UNIQUE INDEX inventory_variant_id_key ON public.inventory USING btree (variant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "issues",
    "indexname": "issues_pkey",
    "indexdef": "CREATE UNIQUE INDEX issues_pkey ON public.issues USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "new_leads",
    "indexname": "new_leads_pkey",
    "indexdef": "CREATE UNIQUE INDEX new_leads_pkey ON public.new_leads USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "order",
    "indexname": "order_pkey",
    "indexdef": "CREATE UNIQUE INDEX order_pkey ON public.\"order\" USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "order",
    "indexname": "unique_order_product",
    "indexdef": "CREATE UNIQUE INDEX unique_order_product ON public.\"order\" USING btree (order_id)"
  },
  {
    "schemaname": "public",
    "tablename": "order_items",
    "indexname": "order_items_pkey",
    "indexdef": "CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "order_items",
    "indexname": "unique_line_items_product",
    "indexdef": "CREATE UNIQUE INDEX unique_line_items_product ON public.order_items USING btree (order_id, product_id)"
  },
  {
    "schemaname": "public",
    "tablename": "payouts",
    "indexname": "idx_payouts_status",
    "indexdef": "CREATE INDEX idx_payouts_status ON public.payouts USING btree (status)"
  },
  {
    "schemaname": "public",
    "tablename": "payouts",
    "indexname": "idx_payouts_user_status",
    "indexdef": "CREATE INDEX idx_payouts_user_status ON public.payouts USING btree (user_id, status)"
  },
  {
    "schemaname": "public",
    "tablename": "payouts",
    "indexname": "payouts_pkey",
    "indexdef": "CREATE UNIQUE INDEX payouts_pkey ON public.payouts USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "referrals",
    "indexname": "referrals_pkey",
    "indexdef": "CREATE UNIQUE INDEX referrals_pkey ON public.referrals USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "referrals",
    "indexname": "referrals_uuid_key",
    "indexdef": "CREATE UNIQUE INDEX referrals_uuid_key ON public.referrals USING btree (uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "session",
    "indexname": "session_pkey",
    "indexdef": "CREATE UNIQUE INDEX session_pkey ON public.session USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "signup_request",
    "indexname": "signup_request_pkey",
    "indexdef": "CREATE UNIQUE INDEX signup_request_pkey ON public.signup_request USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "store_to_user",
    "indexname": "store_to_user_uuid_key",
    "indexdef": "CREATE UNIQUE INDEX store_to_user_uuid_key ON public.store_to_user USING btree (uuid)"
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "indexname": "stores_pkey",
    "indexdef": "CREATE UNIQUE INDEX stores_pkey ON public.stores USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "indexname": "stores_store_url_key",
    "indexdef": "CREATE UNIQUE INDEX stores_store_url_key ON public.stores USING btree (store_url)"
  },
  {
    "schemaname": "public",
    "tablename": "trackings",
    "indexname": "trackings_order_id_key",
    "indexdef": "CREATE UNIQUE INDEX trackings_order_id_key ON public.trackings USING btree (order_id)"
  },
  {
    "schemaname": "public",
    "tablename": "trackings",
    "indexname": "trackings_pkey",
    "indexdef": "CREATE UNIQUE INDEX trackings_pkey ON public.trackings USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "user",
    "indexname": "user_email_key",
    "indexdef": "CREATE UNIQUE INDEX user_email_key ON public.\"user\" USING btree (email)"
  },
  {
    "schemaname": "public",
    "tablename": "user",
    "indexname": "user_id_key",
    "indexdef": "CREATE UNIQUE INDEX user_id_key ON public.\"user\" USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "user",
    "indexname": "user_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_pkey ON public.\"user\" USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "webhooks",
    "indexname": "webhooks_pkey",
    "indexdef": "CREATE UNIQUE INDEX webhooks_pkey ON public.webhooks USING btree (id)"
  }
]

-- PART 7: VIEWS
-- ================================================================
SELECT
    table_name AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
Output:
[
  {
    "view_name": "affiliate_setting_view",
    "view_definition": " SELECT r.affiliate_id,\n    r.user_id,\n    sum(r.total_commission) AS total_amount,\n    count(r.id) AS count,\n    sum(r.quantity_of_order) AS order_count,\n    r.commission_method,\n    r.commission_rate,\n    r.customer_number\n   FROM referral_view r\n  GROUP BY r.affiliate_id, r.customer_number, r.commission_method, r.commission_rate, r.user_id;"
  },
  {
    "view_name": "customer_ids_view",
    "view_definition": " SELECT referrals.customer_number\n   FROM referrals\n  GROUP BY referrals.customer_number;"
  },
  {
    "view_name": "payout_view",
    "view_definition": " SELECT c.user_id,\n    c.status,\n    c.total_amount,\n    c.total_count\n   FROM ( SELECT payouts.user_id,\n            payouts.status,\n            sum(payouts.amount) AS total_amount,\n            count(payouts.id) AS total_count\n           FROM payouts\n          GROUP BY payouts.user_id, payouts.status) c;"
  },
  {
    "view_name": "referral_summary",
    "view_definition": " SELECT r.affiliate_id,\n    r.user_id,\n    sum(r.total_commission) AS total_amount,\n    count(r.id) AS count,\n    sum(r.quantity_of_order) AS order_count,\n    COALESCE(array_agg(DISTINCT r.customer_number) FILTER (WHERE (r.customer_number IS NOT NULL)), '{}'::text[]) AS customer_ids\n   FROM referral_view r\n  GROUP BY r.affiliate_id, r.user_id;"
  },
  {
    "view_name": "referral_view",
    "view_definition": " SELECT r.id,\n    r.created_at,\n    r.store_name,\n    r.quantity_of_order,\n    r.order_number,\n    r.order_time,\n    r.customer_number,\n    r.uuid,\n    r.affiliate_id,\n    r.agent_name,\n    r.invoice_total,\n    acs.uid,\n    acs.commission_method,\n    acs.commission_rate,\n    acs.affiliate,\n    acs.customer_id,\n    afs.user_id,\n        CASE\n            WHEN (acs.commission_method = 1) THEN (acs.commission_rate * (r.quantity_of_order)::numeric)\n            WHEN (acs.commission_method = 2) THEN (acs.commission_rate * r.invoice_total)\n            ELSE (0)::numeric\n        END AS total_commission\n   FROM ((referrals r\n     LEFT JOIN affiliate_customer_setting acs ON (((acs.affiliate = r.affiliate_id) AND (acs.customer_id = r.customer_number))))\n     LEFT JOIN affiliates afs ON ((afs.affiliate_id = r.affiliate_id)));"
  },
  {
    "view_name": "user_role_view",
    "view_definition": " SELECT \"user\".id,\n    \"user\".role\n   FROM \"user\";"
  }
]

-- PART 8: ENUMS (Custom Types)
-- ================================================================
SELECT
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

Output:
[
  {
    "enum_name": "AFFILIATE_STATUS",
    "enum_value": "Pending"
  },
  {
    "enum_name": "AFFILIATE_STATUS",
    "enum_value": "Approved"
  },
  {
    "enum_name": "AFFILIATE_STATUS",
    "enum_value": "Declined"
  },
  {
    "enum_name": "AFFILIATE_STATUS",
    "enum_value": "None"
  }
]

-- ================================================================
-- PART 9: ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

Output:
[
  {
    "schemaname": "public",
    "tablename": "admin",
    "policyname": "for all",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "affiliate_customer_setting",
    "policyname": "admin",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(auth.uid() IN ( SELECT get_admin_ids() AS get_admin_ids))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "affiliates",
    "policyname": "Enable Selete for users based on user_id",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(( SELECT auth.uid() AS uid) = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "affiliates",
    "policyname": "Enable delete for users based on user_id",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(( SELECT auth.uid() AS uid) = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "affiliates",
    "policyname": "admin",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(auth.uid() IN ( SELECT get_admin_ids() AS get_admin_ids))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "inventory",
    "policyname": "Allow All",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "issues",
    "policyname": "Enable Selete for users based on user_id",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(( SELECT auth.uid() AS uid) = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "issues",
    "policyname": "policy for issues",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "new_leads",
    "policyname": "Allow for leads",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "order",
    "policyname": "Allow All",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "order_items",
    "policyname": "Allow all for order_items",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "payouts",
    "policyname": "Enable Selete for users based on user_id",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(( SELECT auth.uid() AS uid) = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payouts",
    "policyname": "admin",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(auth.uid() IN ( SELECT get_admin_ids() AS get_admin_ids))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "referrals",
    "policyname": "admin",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(auth.uid() IN ( SELECT get_admin_ids() AS get_admin_ids))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "session",
    "policyname": "all",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "signup_request",
    "policyname": "only admin",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(auth.uid() IN ( SELECT get_admin_ids() AS get_admin_ids))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "store_to_user",
    "policyname": "Enable Select for users based on user_id",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(( SELECT auth.uid() AS uid) = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "store_to_user",
    "policyname": "only admin",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "ALL",
    "qual": "(auth.uid() IN ( SELECT get_admin_ids() AS get_admin_ids))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "policyname": "only admin",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(auth.uid() IN ( SELECT get_admin_ids() AS get_admin_ids))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "stores",
    "policyname": "select by authid",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM store_to_user\n  WHERE ((store_to_user.store_id = stores.id) AND (store_to_user.user_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "trackings",
    "policyname": "Allow all for trackings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "true",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "user",
    "policyname": "Enable Select for users based on user_id",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(( SELECT auth.uid() AS uid) = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user",
    "policyname": "only admin",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(auth.uid() IN ( SELECT get_admin_ids() AS get_admin_ids))",
    "with_check": null
  }
]

-- ================================================================
-- PART 10: TRIGGERS
-- ================================================================
SELECT
    trigger_name,
    event_object_table AS table_name,
    event_manipulation AS trigger_event,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

Output:
Success. No rows returned

-- ================================================================
-- PART 11: FUNCTIONS (Stored Procedures)
-- ================================================================
SELECT
    routine_name,
    routine_type,
    data_type AS return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;

Output:
[
  {
    "routine_name": "get_admin_ids",
    "routine_type": "FUNCTION",
    "return_type": "uuid",
    "routine_definition": "\r\nSELECT\r\n  id\r\nFROM\r\n  user_role_view\r\nWHERE\r\n  role = 'admin';\r\n"
  },
  {
    "routine_name": "handle_new_user",
    "routine_type": "FUNCTION",
    "return_type": "trigger",
    "routine_definition": "BEGIN\r\n  -- Insert data into the User table\r\n  INSERT INTO public.\"user\" (\"id\", \"email\", \"referral_code\", \"first_name\",\"last_name\",\"user_name\",\"phone_number\", \"role\", \"visible_store\", \"visible_pages\")\r\n  VALUES (\r\n    NEW.id,\r\n    New.email,\r\n    NEW.raw_user_meta_data->>'referral_code',\r\n    NEW.raw_user_meta_data->>'first_name',\r\n    NEW.raw_user_meta_data->>'last_name',\r\n    NEW.raw_user_meta_data->>'user_name',\r\n    NEW.raw_user_meta_data->>'phone_number',\r\n    NEW.raw_user_meta_data->>'role',\r\n    ARRAY[NEW.raw_user_meta_data->>'visible_store'],\r\n    ARRAY[NEW.raw_user_meta_data->>'visible_pages']\r\n  );\r\n  RETURN NEW;\r\nEND;"
  }
]

-- ================================================================
-- PART 12: SAMPLE DATA COUNTS FOR KEY TABLES
-- ================================================================
-- This helps understand which tables are actively used

-- User counts
SELECT 'user' AS table_name, COUNT(*) AS row_count FROM "user"
UNION ALL
SELECT 'admin' AS table_name, COUNT(*) AS row_count FROM "admin"
UNION ALL
SELECT 'affiliates' AS table_name, COUNT(*) AS row_count FROM "affiliates"
UNION ALL
SELECT 'stores' AS table_name, COUNT(*) AS row_count FROM "stores"
UNION ALL
SELECT 'store_to_user' AS table_name, COUNT(*) AS row_count FROM "store_to_user"
UNION ALL
SELECT 'order' AS table_name, COUNT(*) AS row_count FROM "order"
UNION ALL
SELECT 'order_items' AS table_name, COUNT(*) AS row_count FROM "order_items"
UNION ALL
SELECT 'inventory' AS table_name, COUNT(*) AS row_count FROM "inventory"
UNION ALL
SELECT 'trackings' AS table_name, COUNT(*) AS row_count FROM "trackings"
UNION ALL
SELECT 'referrals' AS table_name, COUNT(*) AS row_count FROM "referrals"
UNION ALL
SELECT 'payouts' AS table_name, COUNT(*) AS row_count FROM "payouts"
UNION ALL
SELECT 'session' AS table_name, COUNT(*) AS row_count FROM "session"
UNION ALL
SELECT 'webhooks' AS table_name, COUNT(*) AS row_count FROM "webhooks";
Output:
[
  {
    "table_name": "user",
    "row_count": 49
  },
  {
    "table_name": "admin",
    "row_count": 0
  },
  {
    "table_name": "affiliates",
    "row_count": 11
  },
  {
    "table_name": "stores",
    "row_count": 72
  },
  {
    "table_name": "store_to_user",
    "row_count": 0
  },
  {
    "table_name": "order",
    "row_count": 1691
  },
  {
    "table_name": "order_items",
    "row_count": 2281
  },
  {
    "table_name": "inventory",
    "row_count": 3553
  },
  {
    "table_name": "trackings",
    "row_count": 1018
  },
  {
    "table_name": "referrals",
    "row_count": 257
  },
  {
    "table_name": "payouts",
    "row_count": 0
  },
  {
    "table_name": "session",
    "row_count": 103
  },
  {
    "table_name": "webhooks",
    "row_count": 8181
  }
]

-- ================================================================
-- PART 13: ORDERS BY STORE (to see which stores have data)
-- ================================================================
SELECT
    store_url,
    COUNT(*) AS order_count,
    MIN(created_at) AS first_order,
    MAX(created_at) AS last_order
FROM "order"
GROUP BY store_url
ORDER BY order_count DESC;
Output:
[
  {
    "store_url": "kbfpan-fw.myshopify.com",
    "order_count": 369,
    "first_order": "2025-09-28 19:02:57.43",
    "last_order": "2025-10-28 01:51:12.543"
  },
  {
    "store_url": "xjnyz0-2x.myshopify.com",
    "order_count": 250,
    "first_order": "2025-09-02 22:34:57.794",
    "last_order": "2025-09-12 20:51:09.834"
  },
  {
    "store_url": "simple-guy-development-store.myshopify.com",
    "order_count": 225,
    "first_order": "2025-11-25 20:13:14.003",
    "last_order": "2025-12-07 14:44:41.982"
  },
  {
    "store_url": "n06t1a-m8.myshopify.com",
    "order_count": 221,
    "first_order": "2025-09-13 01:58:53.517",
    "last_order": "2025-12-07 12:46:42.271"
  },
  {
    "store_url": "wctwuq-hs.myshopify.com",
    "order_count": 201,
    "first_order": "2025-11-26 18:36:39.306",
    "last_order": "2025-12-06 14:06:24.977"
  },
  {
    "store_url": "pehc6p-8c.myshopify.com",
    "order_count": 116,
    "first_order": "2025-09-17 16:26:40.894",
    "last_order": "2025-12-07 14:48:47.641"
  },
  {
    "store_url": "6dd1xd-28.myshopify.com",
    "order_count": 46,
    "first_order": "2025-09-20 09:06:26.187",
    "last_order": "2025-11-17 21:10:02.904"
  },
  {
    "store_url": "huz0kz-t0.myshopify.com",
    "order_count": 40,
    "first_order": "2025-08-18 12:23:43.041",
    "last_order": "2025-08-18 13:57:06.436"
  },
  {
    "store_url": "greebie.myshopify.com",
    "order_count": 34,
    "first_order": "2025-08-20 05:20:00.047",
    "last_order": "2025-11-25 19:54:05.016"
  },
  {
    "store_url": "for-commercive.myshopify.com",
    "order_count": 32,
    "first_order": "2025-07-31 02:24:11.447",
    "last_order": "2025-10-15 07:59:19.574"
  },
  {
    "store_url": "qibafu-xm.myshopify.com",
    "order_count": 22,
    "first_order": "2025-11-23 23:37:51.587",
    "last_order": "2025-12-07 00:10:32.293"
  },
  {
    "store_url": "e1a0tf-ui.myshopify.com",
    "order_count": 17,
    "first_order": "2025-10-14 06:31:34.139",
    "last_order": "2025-10-15 20:57:44.593"
  },
  {
    "store_url": "crb4gg-bt.myshopify.com",
    "order_count": 14,
    "first_order": "2025-10-17 06:48:00.841",
    "last_order": "2025-10-22 01:40:38"
  },
  {
    "store_url": "csgqua-bf.myshopify.com",
    "order_count": 13,
    "first_order": "2025-10-28 18:28:05.364",
    "last_order": "2025-10-28 18:28:05.364"
  },
  {
    "store_url": "0ekh07-jq.myshopify.com",
    "order_count": 11,
    "first_order": "2025-09-08 22:44:05.868",
    "last_order": "2025-10-17 22:07:20.837"
  },
  {
    "store_url": "p4wpnb-bt.myshopify.com",
    "order_count": 11,
    "first_order": "2025-10-14 10:56:59.926",
    "last_order": "2025-12-07 10:37:58.999"
  },
  {
    "store_url": "nmz0m0-gc.myshopify.com",
    "order_count": 10,
    "first_order": "2025-10-20 04:47:55.486",
    "last_order": "2025-10-24 12:47:49.994"
  },
  {
    "store_url": "0m6uj2-mc.myshopify.com",
    "order_count": 9,
    "first_order": "2025-10-07 12:59:02.836",
    "last_order": "2025-10-07 12:59:02.836"
  },
  {
    "store_url": "9jsxqh-qw.myshopify.com",
    "order_count": 8,
    "first_order": "2025-11-25 11:00:10.213",
    "last_order": "2025-11-27 04:15:30.349"
  },
  {
    "store_url": "rmtxgx-1p.myshopify.com",
    "order_count": 5,
    "first_order": "2025-10-18 06:40:20.569",
    "last_order": "2025-10-18 06:40:20.569"
  },
  {
    "store_url": "k2c0xz-4u.myshopify.com",
    "order_count": 5,
    "first_order": "2025-09-21 09:39:14.544",
    "last_order": "2025-12-03 13:20:36.173"
  },
  {
    "store_url": "vek0ru-yc.myshopify.com",
    "order_count": 5,
    "first_order": "2025-09-02 16:42:47.051",
    "last_order": "2025-11-19 17:21:40.584"
  },
  {
    "store_url": "ud0k86-dn.myshopify.com",
    "order_count": 3,
    "first_order": "2025-11-30 10:52:11.485",
    "last_order": "2025-11-30 10:52:11.485"
  },
  {
    "store_url": "abayat-muna.myshopify.com",
    "order_count": 3,
    "first_order": "2025-09-06 18:43:27.146",
    "last_order": "2025-09-06 18:50:44.602"
  },
  {
    "store_url": "syiw2w-ya.myshopify.com",
    "order_count": 3,
    "first_order": "2025-11-28 15:58:09.004",
    "last_order": "2025-11-28 15:58:09.004"
  },
  {
    "store_url": "xcwnn1-t1.myshopify.com",
    "order_count": 3,
    "first_order": "2025-10-31 20:59:05.423",
    "last_order": "2025-11-24 14:28:36.999"
  },
  {
    "store_url": "yiucet-ew.myshopify.com",
    "order_count": 2,
    "first_order": "2025-12-05 05:07:13.16",
    "last_order": "2025-12-06 03:59:57.704"
  },
  {
    "store_url": "wqgyvf-tt.myshopify.com",
    "order_count": 2,
    "first_order": "2025-09-25 13:53:13.129",
    "last_order": "2025-10-10 22:48:44.746"
  },
  {
    "store_url": "7gxs3c-jn.myshopify.com",
    "order_count": 2,
    "first_order": "2025-12-03 02:37:43.046",
    "last_order": "2025-12-05 15:36:18.937"
  },
  {
    "store_url": "stdaed-gu.myshopify.com",
    "order_count": 2,
    "first_order": "2025-11-17 05:42:44.953",
    "last_order": "2025-11-21 06:43:09.568"
  },
  {
    "store_url": "6k0s9t-9y.myshopify.com",
    "order_count": 1,
    "first_order": "2025-09-18 19:46:09.478",
    "last_order": "2025-09-18 19:46:09.478"
  },
  {
    "store_url": "yi91n0-cg.myshopify.com",
    "order_count": 1,
    "first_order": "2025-10-28 07:47:49.113",
    "last_order": "2025-10-28 07:47:49.113"
  },
  {
    "store_url": "qgzhiw-jf.myshopify.com",
    "order_count": 1,
    "first_order": "2025-08-31 21:26:37.632",
    "last_order": "2025-08-31 21:26:37.632"
  },
  {
    "store_url": "fqqfas-v0.myshopify.com",
    "order_count": 1,
    "first_order": "2025-09-20 05:39:51.51",
    "last_order": "2025-09-20 05:39:51.51"
  },
  {
    "store_url": "pebz2p-qq.myshopify.com",
    "order_count": 1,
    "first_order": "2025-11-22 03:24:48.051",
    "last_order": "2025-11-22 03:24:48.051"
  },
  {
    "store_url": "dsv9iq-3s.myshopify.com",
    "order_count": 1,
    "first_order": "2025-11-29 14:51:10.917",
    "last_order": "2025-11-29 14:51:10.917"
  },
  {
    "store_url": "commercive-dev.myshopify.com",
    "order_count": 1,
    "first_order": "2025-08-05 18:46:47.12",
    "last_order": "2025-08-05 18:46:47.12"
  }
]

-- ================================================================
-- PART 14: INVENTORY BY STORE
-- ================================================================
SELECT
    store_url,
    COUNT(*) AS inventory_items,
    COUNT(DISTINCT sku) AS unique_skus
FROM "inventory"
GROUP BY store_url
ORDER BY inventory_items DESC;

Output:
[
  {
    "store_url": "kbfpan-fw.myshopify.com",
    "inventory_items": 587,
    "unique_skus": 343
  },
  {
    "store_url": "fqqfas-v0.myshopify.com",
    "inventory_items": 535,
    "unique_skus": 533
  },
  {
    "store_url": "mtw7hu-s3.myshopify.com",
    "inventory_items": 288,
    "unique_skus": 286
  },
  {
    "store_url": "frjr1z-z1.myshopify.com",
    "inventory_items": 271,
    "unique_skus": 259
  },
  {
    "store_url": "pehc6p-8c.myshopify.com",
    "inventory_items": 230,
    "unique_skus": 204
  },
  {
    "store_url": "moissanitekingdevelopment.myshopify.com",
    "inventory_items": 200,
    "unique_skus": 0
  },
  {
    "store_url": "n06t1a-m8.myshopify.com",
    "inventory_items": 159,
    "unique_skus": 8
  },
  {
    "store_url": "xcwnn1-t1.myshopify.com",
    "inventory_items": 134,
    "unique_skus": 110
  },
  {
    "store_url": "xjnyz0-2x.myshopify.com",
    "inventory_items": 131,
    "unique_skus": 0
  },
  {
    "store_url": "rkbwv5-zc.myshopify.com",
    "inventory_items": 98,
    "unique_skus": 98
  },
  {
    "store_url": "yi91n0-cg.myshopify.com",
    "inventory_items": 84,
    "unique_skus": 83
  },
  {
    "store_url": "0ekh07-jq.myshopify.com",
    "inventory_items": 81,
    "unique_skus": 72
  },
  {
    "store_url": "pebz2p-qq.myshopify.com",
    "inventory_items": 81,
    "unique_skus": 56
  },
  {
    "store_url": "vek0ru-yc.myshopify.com",
    "inventory_items": 48,
    "unique_skus": 44
  },
  {
    "store_url": "9wwpgu-2h.myshopify.com",
    "inventory_items": 43,
    "unique_skus": 43
  },
  {
    "store_url": "x8h1va-89.myshopify.com",
    "inventory_items": 37,
    "unique_skus": 0
  },
  {
    "store_url": "sifgpr-aa.myshopify.com",
    "inventory_items": 35,
    "unique_skus": 0
  },
  {
    "store_url": "wctwuq-hs.myshopify.com",
    "inventory_items": 34,
    "unique_skus": 1
  },
  {
    "store_url": "k2c0xz-4u.myshopify.com",
    "inventory_items": 30,
    "unique_skus": 0
  },
  {
    "store_url": "crb4gg-bt.myshopify.com",
    "inventory_items": 29,
    "unique_skus": 0
  },
  {
    "store_url": "qkfz5y-1x.myshopify.com",
    "inventory_items": 26,
    "unique_skus": 19
  },
  {
    "store_url": "for-commercive.myshopify.com",
    "inventory_items": 26,
    "unique_skus": 5
  },
  {
    "store_url": "ybfj0m-ct.myshopify.com",
    "inventory_items": 25,
    "unique_skus": 0
  },
  {
    "store_url": "ihs7qd-se.myshopify.com",
    "inventory_items": 25,
    "unique_skus": 2
  },
  {
    "store_url": "yiucet-ew.myshopify.com",
    "inventory_items": 18,
    "unique_skus": 0
  },
  {
    "store_url": "huz0kz-t0.myshopify.com",
    "inventory_items": 17,
    "unique_skus": 3
  },
  {
    "store_url": "dsv9iq-3s.myshopify.com",
    "inventory_items": 16,
    "unique_skus": 12
  },
  {
    "store_url": "yt5w97-tm.myshopify.com",
    "inventory_items": 15,
    "unique_skus": 15
  },
  {
    "store_url": "q11v8d-43.myshopify.com",
    "inventory_items": 15,
    "unique_skus": 0
  },
  {
    "store_url": "7gxs3c-jn.myshopify.com",
    "inventory_items": 14,
    "unique_skus": 5
  },
  {
    "store_url": "k10tx9-cc.myshopify.com",
    "inventory_items": 13,
    "unique_skus": 7
  },
  {
    "store_url": "greebie.myshopify.com",
    "inventory_items": 12,
    "unique_skus": 1
  },
  {
    "store_url": "e1a0tf-ui.myshopify.com",
    "inventory_items": 11,
    "unique_skus": 0
  },
  {
    "store_url": "ud0k86-dn.myshopify.com",
    "inventory_items": 10,
    "unique_skus": 0
  },
  {
    "store_url": "qfmgy0-nu.myshopify.com",
    "inventory_items": 10,
    "unique_skus": 0
  },
  {
    "store_url": "nmz0m0-gc.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 0
  },
  {
    "store_url": "azk8dz-pm.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 0
  },
  {
    "store_url": "b0ne30-d5.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 3
  },
  {
    "store_url": "rmtxgx-1p.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 0
  },
  {
    "store_url": "fgfc1t-u6.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 9
  },
  {
    "store_url": "6k0s9t-9y.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 8
  },
  {
    "store_url": "zytjjy-8s.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 8
  },
  {
    "store_url": "z1e8qb-ej.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 0
  },
  {
    "store_url": "fzxv5e-zd.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 5
  },
  {
    "store_url": "p4wpnb-bt.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 3
  },
  {
    "store_url": "syiw2w-ya.myshopify.com",
    "inventory_items": 7,
    "unique_skus": 0
  },
  {
    "store_url": "ria6d3-1y.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 0
  },
  {
    "store_url": "yjw8xj-8h.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 6
  },
  {
    "store_url": "qgzhiw-jf.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 0
  },
  {
    "store_url": "9jsxqh-qw.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 0
  },
  {
    "store_url": "wqgyvf-tt.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 0
  },
  {
    "store_url": "iruwsb-bq.myshopify.com",
    "inventory_items": 4,
    "unique_skus": 4
  },
  {
    "store_url": "nb1fm2-uj.myshopify.com",
    "inventory_items": 4,
    "unique_skus": 0
  },
  {
    "store_url": "6dd1xd-28.myshopify.com",
    "inventory_items": 4,
    "unique_skus": 0
  },
  {
    "store_url": "csgqua-bf.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "15gk40-vu.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "8ppxtg-xc.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "01xhje-jc.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "zepqwa-f0.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "s0dte5-ym.myshopify.com",
    "inventory_items": 2,
    "unique_skus": 2
  },
  {
    "store_url": "d6u1u7-1w.myshopify.com",
    "inventory_items": 2,
    "unique_skus": 1
  },
  {
    "store_url": "0m6uj2-mc.myshopify.com",
    "inventory_items": 2,
    "unique_skus": 2
  },
  {
    "store_url": "ixc6wy-tf.myshopify.com",
    "inventory_items": 2,
    "unique_skus": 0
  },
  {
    "store_url": "c31znd-7i.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "agyp4a-x6.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "0zyv6d-t7.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "stdaed-gu.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 1
  },
  {
    "store_url": "tm2000-35.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "m6uzib-su.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "xkuzbc-3d.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "hchnb3-eb.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  }
]

-- ================================================================
-- PART 15: STORE SYNC STATUS
-- ================================================================
SELECT
    id,
    store_name,
    store_url,
    is_inventory_fetched,
    is_store_listed,
    created_at
FROM "stores"
ORDER BY created_at DESC;

[
  {
    "store_url": "kbfpan-fw.myshopify.com",
    "inventory_items": 587,
    "unique_skus": 343
  },
  {
    "store_url": "fqqfas-v0.myshopify.com",
    "inventory_items": 535,
    "unique_skus": 533
  },
  {
    "store_url": "mtw7hu-s3.myshopify.com",
    "inventory_items": 288,
    "unique_skus": 286
  },
  {
    "store_url": "frjr1z-z1.myshopify.com",
    "inventory_items": 271,
    "unique_skus": 259
  },
  {
    "store_url": "pehc6p-8c.myshopify.com",
    "inventory_items": 230,
    "unique_skus": 204
  },
  {
    "store_url": "moissanitekingdevelopment.myshopify.com",
    "inventory_items": 200,
    "unique_skus": 0
  },
  {
    "store_url": "n06t1a-m8.myshopify.com",
    "inventory_items": 159,
    "unique_skus": 8
  },
  {
    "store_url": "xcwnn1-t1.myshopify.com",
    "inventory_items": 134,
    "unique_skus": 110
  },
  {
    "store_url": "xjnyz0-2x.myshopify.com",
    "inventory_items": 131,
    "unique_skus": 0
  },
  {
    "store_url": "rkbwv5-zc.myshopify.com",
    "inventory_items": 98,
    "unique_skus": 98
  },
  {
    "store_url": "yi91n0-cg.myshopify.com",
    "inventory_items": 84,
    "unique_skus": 83
  },
  {
    "store_url": "0ekh07-jq.myshopify.com",
    "inventory_items": 81,
    "unique_skus": 72
  },
  {
    "store_url": "pebz2p-qq.myshopify.com",
    "inventory_items": 81,
    "unique_skus": 56
  },
  {
    "store_url": "vek0ru-yc.myshopify.com",
    "inventory_items": 48,
    "unique_skus": 44
  },
  {
    "store_url": "9wwpgu-2h.myshopify.com",
    "inventory_items": 43,
    "unique_skus": 43
  },
  {
    "store_url": "x8h1va-89.myshopify.com",
    "inventory_items": 37,
    "unique_skus": 0
  },
  {
    "store_url": "sifgpr-aa.myshopify.com",
    "inventory_items": 35,
    "unique_skus": 0
  },
  {
    "store_url": "wctwuq-hs.myshopify.com",
    "inventory_items": 34,
    "unique_skus": 1
  },
  {
    "store_url": "k2c0xz-4u.myshopify.com",
    "inventory_items": 30,
    "unique_skus": 0
  },
  {
    "store_url": "crb4gg-bt.myshopify.com",
    "inventory_items": 29,
    "unique_skus": 0
  },
  {
    "store_url": "qkfz5y-1x.myshopify.com",
    "inventory_items": 26,
    "unique_skus": 19
  },
  {
    "store_url": "for-commercive.myshopify.com",
    "inventory_items": 26,
    "unique_skus": 5
  },
  {
    "store_url": "ybfj0m-ct.myshopify.com",
    "inventory_items": 25,
    "unique_skus": 0
  },
  {
    "store_url": "ihs7qd-se.myshopify.com",
    "inventory_items": 25,
    "unique_skus": 2
  },
  {
    "store_url": "yiucet-ew.myshopify.com",
    "inventory_items": 18,
    "unique_skus": 0
  },
  {
    "store_url": "huz0kz-t0.myshopify.com",
    "inventory_items": 17,
    "unique_skus": 3
  },
  {
    "store_url": "dsv9iq-3s.myshopify.com",
    "inventory_items": 16,
    "unique_skus": 12
  },
  {
    "store_url": "yt5w97-tm.myshopify.com",
    "inventory_items": 15,
    "unique_skus": 15
  },
  {
    "store_url": "q11v8d-43.myshopify.com",
    "inventory_items": 15,
    "unique_skus": 0
  },
  {
    "store_url": "7gxs3c-jn.myshopify.com",
    "inventory_items": 14,
    "unique_skus": 5
  },
  {
    "store_url": "k10tx9-cc.myshopify.com",
    "inventory_items": 13,
    "unique_skus": 7
  },
  {
    "store_url": "greebie.myshopify.com",
    "inventory_items": 12,
    "unique_skus": 1
  },
  {
    "store_url": "e1a0tf-ui.myshopify.com",
    "inventory_items": 11,
    "unique_skus": 0
  },
  {
    "store_url": "ud0k86-dn.myshopify.com",
    "inventory_items": 10,
    "unique_skus": 0
  },
  {
    "store_url": "qfmgy0-nu.myshopify.com",
    "inventory_items": 10,
    "unique_skus": 0
  },
  {
    "store_url": "nmz0m0-gc.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 0
  },
  {
    "store_url": "azk8dz-pm.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 0
  },
  {
    "store_url": "b0ne30-d5.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 3
  },
  {
    "store_url": "rmtxgx-1p.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 0
  },
  {
    "store_url": "fgfc1t-u6.myshopify.com",
    "inventory_items": 9,
    "unique_skus": 9
  },
  {
    "store_url": "6k0s9t-9y.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 8
  },
  {
    "store_url": "zytjjy-8s.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 8
  },
  {
    "store_url": "z1e8qb-ej.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 0
  },
  {
    "store_url": "fzxv5e-zd.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 5
  },
  {
    "store_url": "p4wpnb-bt.myshopify.com",
    "inventory_items": 8,
    "unique_skus": 3
  },
  {
    "store_url": "syiw2w-ya.myshopify.com",
    "inventory_items": 7,
    "unique_skus": 0
  },
  {
    "store_url": "ria6d3-1y.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 0
  },
  {
    "store_url": "yjw8xj-8h.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 6
  },
  {
    "store_url": "qgzhiw-jf.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 0
  },
  {
    "store_url": "9jsxqh-qw.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 0
  },
  {
    "store_url": "wqgyvf-tt.myshopify.com",
    "inventory_items": 6,
    "unique_skus": 0
  },
  {
    "store_url": "iruwsb-bq.myshopify.com",
    "inventory_items": 4,
    "unique_skus": 4
  },
  {
    "store_url": "nb1fm2-uj.myshopify.com",
    "inventory_items": 4,
    "unique_skus": 0
  },
  {
    "store_url": "6dd1xd-28.myshopify.com",
    "inventory_items": 4,
    "unique_skus": 0
  },
  {
    "store_url": "csgqua-bf.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "15gk40-vu.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "8ppxtg-xc.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "01xhje-jc.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "zepqwa-f0.myshopify.com",
    "inventory_items": 3,
    "unique_skus": 0
  },
  {
    "store_url": "s0dte5-ym.myshopify.com",
    "inventory_items": 2,
    "unique_skus": 2
  },
  {
    "store_url": "d6u1u7-1w.myshopify.com",
    "inventory_items": 2,
    "unique_skus": 1
  },
  {
    "store_url": "0m6uj2-mc.myshopify.com",
    "inventory_items": 2,
    "unique_skus": 2
  },
  {
    "store_url": "ixc6wy-tf.myshopify.com",
    "inventory_items": 2,
    "unique_skus": 0
  },
  {
    "store_url": "c31znd-7i.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "agyp4a-x6.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "0zyv6d-t7.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "stdaed-gu.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 1
  },
  {
    "store_url": "tm2000-35.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "m6uzib-su.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "xkuzbc-3d.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  },
  {
    "store_url": "hchnb3-eb.myshopify.com",
    "inventory_items": 1,
    "unique_skus": 0
  }
]

-- ================================================================
-- PART 16: USER-STORE RELATIONSHIPS
-- ================================================================
SELECT
    u.email,
    u.role,
    s.store_name,
    s.store_url,
    stu.created_at AS linked_at
FROM "store_to_user" stu
LEFT JOIN "user" u ON stu.user_id = u.id
LEFT JOIN "stores" s ON stu.store_id = s.id
ORDER BY stu.created_at DESC
LIMIT 50;
Output:
Success. No rows returned

-- ================================================================
-- PART 17: CHECK FOR ORPHANED DATA
-- ================================================================

-- Orders without matching stores
SELECT
    'Orders without stores' AS issue,
    COUNT(*) AS count
FROM "order" o
WHERE NOT EXISTS (
    SELECT 1 FROM "stores" s
    WHERE s.store_url = o.store_url
);

-- Inventory without matching stores
SELECT
    'Inventory without stores' AS issue,
    COUNT(*) AS count
FROM "inventory" i
WHERE NOT EXISTS (
    SELECT 1 FROM "stores" s
    WHERE s.store_url = i.store_url
);

-- Trackings without matching orders
SELECT
    'Trackings without orders' AS issue,
    COUNT(*) AS count
FROM "trackings" t
WHERE NOT EXISTS (
    SELECT 1 FROM "order" o
    WHERE o.order_id = t.order_id
);

-- Store_to_user with missing users
SELECT
    'store_to_user without users' AS issue,
    COUNT(*) AS count
FROM "store_to_user" stu
WHERE NOT EXISTS (
    SELECT 1 FROM "user" u
    WHERE u.id = stu.user_id
);

-- Store_to_user with missing stores
SELECT
    'store_to_user without stores' AS issue,
    COUNT(*) AS count
FROM "store_to_user" stu
WHERE NOT EXISTS (
    SELECT 1 FROM "stores" s
    WHERE s.id = stu.store_id
);
Output:
[
  {
    "issue": "store_to_user without stores",
    "count": 0
  }
]

-- ================================================================
-- PART 18: DATA FRESHNESS CHECK
-- ================================================================
SELECT
    'Last order created' AS metric,
    MAX(created_at)::text AS value
FROM "order"
UNION ALL
SELECT
    'Last inventory update' AS metric,
    MAX(updated_at)::text AS value
FROM "inventory"
UNION ALL
SELECT
    'Last tracking update' AS metric,
    MAX(updated_at)::text AS value
FROM "trackings"
UNION ALL
SELECT
    'Last webhook received' AS metric,
    MAX(created_at)::text AS value
FROM "webhooks";

Output:
Error: Failed to run sql query: ERROR: 42703: column "updated_at" does not exist LINE 11: MAX(updated_at)::text AS value ^ HINT: Perhaps you meant to reference the column "inventory.created_at".




