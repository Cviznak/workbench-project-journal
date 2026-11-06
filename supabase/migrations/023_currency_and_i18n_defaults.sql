-- ============================================================================
-- Migration 023: Global Currency Defaults & Expanded Supported Currencies
-- 1. Default currency to USD ($) on public.inventory_items
-- 2. Expand currency check constraint to ('USD', 'EUR', 'ILS', 'GBP')
-- ============================================================================

-- 1. Alter default to 'USD'
ALTER TABLE public.inventory_items ALTER COLUMN currency SET DEFAULT 'USD';

-- 2. Dynamically drop any existing check constraints on currency
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.inventory_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%currency%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.inventory_items DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 3. Add updated check constraint supporting USD, EUR, ILS, GBP
ALTER TABLE public.inventory_items
  ADD CONSTRAINT chk_inventory_items_currency
  CHECK (currency IN ('USD', 'EUR', 'ILS', 'GBP'));
