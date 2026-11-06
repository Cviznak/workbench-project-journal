-- ==============================================================================
-- Migration 024: Visual Workshop WebP Images for Inventory & Recipes
-- Version: v2.7.0 Production
-- Description: Adds optional image_url column to public.inventory_items and
--              public.maker_recipes for visual workshop thumbnails.
-- ==============================================================================

-- 1. Add image_url to public.inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''
  CONSTRAINT chk_inventory_items_image_url CHECK (image_url = '' OR image_url ~ '^https://');

-- 2. Add image_url to public.maker_recipes
ALTER TABLE public.maker_recipes
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''
  CONSTRAINT chk_maker_recipes_image_url CHECK (image_url = '' OR image_url ~ '^https://');
