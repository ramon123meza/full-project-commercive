-- Migration: Add additional columns to referrals table for CSV data
-- Date: 2025-12-04
-- Description: Adds business_type, client_country, client_niche, client_group columns to support full CSV data

-- Add new columns to referrals table
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS client_country text,
ADD COLUMN IF NOT EXISTS client_niche text,
ADD COLUMN IF NOT EXISTS client_group text;

-- Add comments for documentation
COMMENT ON COLUMN public.referrals.business_type IS 'Type of business (e.g., E-commerce, Retail, etc.)';
COMMENT ON COLUMN public.referrals.client_country IS 'Country of the client';
COMMENT ON COLUMN public.referrals.client_niche IS 'Business niche or category';
COMMENT ON COLUMN public.referrals.client_group IS 'Client group classification';
