-- =============================================================================
-- Checkout Concierge - seed data
--
-- Demo catalogue. Run after 001_initial_schema.sql.
--
-- Idempotent: ON CONFLICT (slug) DO UPDATE, so re-running refreshes prices and
-- stock rather than erroring or duplicating rows.
--
-- REMINDER: price is in minor units (paise). Rs 1,799.00 -> 179900.
--
-- The catalogue is shaped to exercise the agent's search paths:
--   * Two black hoodies under Rs 2,000, so "find me a black hoodie under
--     Rs 2,000" returns a real choice rather than a single obvious answer -
--     which is what forces the agent to ask a clarifying question.
--   * One out-of-stock item, to exercise the availability filter.
--   * One inactive item, to prove `active = true` filtering and the
--     products_select_active_public RLS policy actually hide it.
-- =============================================================================

INSERT INTO public.products
  (name, slug, description, category, price, currency, stock, image_url, active, metadata)
VALUES
  -- --- clothing --------------------------------------------------------------
  (
    'Essential Black Hoodie',
    'essential-black-hoodie',
    'Heavyweight 400 GSM black hoodie in brushed cotton fleece. Regular fit, ribbed cuffs, kangaroo pocket. The default everyday layer.',
    'clothing',
    179900, 'INR', 42,
    'https://placehold.co/800x800/111111/ffffff?text=Essential+Black+Hoodie',
    true,
    '{"color":"black","colors":["black"],"sizes":["S","M","L","XL","XXL"],"material":"cotton fleece","gsm":400,"fit":"regular"}'::jsonb
  ),
  (
    'Midnight Zip Hoodie',
    'midnight-zip-hoodie',
    'Full-zip black hoodie in a lighter 320 GSM loopback cotton. Slim fit with a low-profile hood. Good under a jacket.',
    'clothing',
    149900, 'INR', 27,
    'https://placehold.co/800x800/0b0b0f/ffffff?text=Midnight+Zip+Hoodie',
    true,
    '{"color":"black","colors":["black","charcoal"],"sizes":["S","M","L","XL"],"material":"loopback cotton","gsm":320,"fit":"slim","closure":"full zip"}'::jsonb
  ),
  (
    'Oversized Grey Hoodie',
    'oversized-grey-hoodie',
    'Drop-shoulder oversized hoodie in heather grey. Boxy cut, extended body, 420 GSM fleece.',
    'clothing',
    219900, 'INR', 18,
    'https://placehold.co/800x800/8a8f98/ffffff?text=Oversized+Grey+Hoodie',
    true,
    '{"color":"grey","colors":["heather grey","off white"],"sizes":["M","L","XL","XXL"],"material":"cotton fleece","gsm":420,"fit":"oversized"}'::jsonb
  ),
  (
    'Cotton T-Shirt',
    'cotton-t-shirt',
    'Combed cotton crew neck tee, 180 GSM, pre-shrunk. Available in black, white and navy.',
    'clothing',
    69900, 'INR', 130,
    'https://placehold.co/800x800/1f2933/ffffff?text=Cotton+T-Shirt',
    true,
    '{"color":"black","colors":["black","white","navy"],"sizes":["XS","S","M","L","XL"],"material":"combed cotton","gsm":180,"fit":"regular"}'::jsonb
  ),

  -- --- shoes -----------------------------------------------------------------
  (
    'Everyday Runner',
    'everyday-runner',
    'Neutral daily trainer with a 8 mm drop foam midsole and engineered mesh upper. Built for easy miles, not race day.',
    'shoes',
    349900, 'INR', 24,
    'https://placehold.co/800x800/2d3f5c/ffffff?text=Everyday+Runner',
    true,
    '{"color":"navy","colors":["navy","black"],"sizes":["UK6","UK7","UK8","UK9","UK10","UK11"],"drop_mm":8,"use":"daily training"}'::jsonb
  ),
  (
    'Minimal White Sneakers',
    'minimal-white-sneakers',
    'Full-grain white leather sneakers on a vulcanised rubber sole. Unlined, no visible branding.',
    'shoes',
    299900, 'INR', 31,
    'https://placehold.co/800x800/f5f5f0/111111?text=Minimal+White+Sneakers',
    true,
    '{"color":"white","colors":["white","off white"],"sizes":["UK6","UK7","UK8","UK9","UK10"],"material":"full grain leather","sole":"vulcanised rubber"}'::jsonb
  ),
  (
    'Trail Hiker Boots',
    'trail-hiker-boots',
    'Mid-cut waterproof hiking boots with a lugged outsole and nubuck upper. Rated for multi-day trails.',
    'shoes',
    499900, 'INR', 0,   -- deliberately out of stock: exercises the availability filter
    'https://placehold.co/800x800/4a3b2a/ffffff?text=Trail+Hiker+Boots',
    true,
    '{"color":"brown","colors":["brown","olive"],"sizes":["UK7","UK8","UK9","UK10","UK11"],"waterproof":true,"cut":"mid"}'::jsonb
  ),

  -- --- electronics -----------------------------------------------------------
  (
    'Wireless Earbuds',
    'wireless-earbuds',
    'True wireless earbuds with active noise cancellation, 8 hours on a charge and 32 hours with the case. USB-C, IPX4.',
    'electronics',
    449900, 'INR', 56,
    'https://placehold.co/800x800/16181d/ffffff?text=Wireless+Earbuds',
    true,
    '{"color":"black","colors":["black","white"],"anc":true,"battery_hours":8,"case_battery_hours":32,"water_resistance":"IPX4","connector":"USB-C"}'::jsonb
  ),
  (
    'Over-Ear Studio Headphones',
    'over-ear-studio-headphones',
    'Closed-back over-ear headphones with 40 mm drivers, adaptive noise cancellation and 40 hour battery. Wired 3.5 mm fallback.',
    'electronics',
    899900, 'INR', 12,
    'https://placehold.co/800x800/22252b/ffffff?text=Studio+Headphones',
    true,
    '{"color":"black","colors":["black","sand"],"anc":true,"driver_mm":40,"battery_hours":40,"wired_fallback":true}'::jsonb
  ),
  (
    'Desk Charging Dock',
    'desk-charging-dock',
    '65 W three-port GaN charging dock. Charges a laptop, phone and earbuds at once from a single wall socket.',
    'electronics',
    259900, 'INR', 40,
    'https://placehold.co/800x800/3a3f47/ffffff?text=Desk+Charging+Dock',
    true,
    '{"color":"space grey","wattage":65,"ports":3,"technology":"GaN"}'::jsonb
  ),

  -- --- accessories -----------------------------------------------------------
  (
    'Classic Backpack',
    'classic-backpack',
    '22 litre backpack in water-resistant recycled polyester. Padded 15 inch laptop sleeve, luggage passthrough.',
    'accessories',
    199900, 'INR', 35,
    'https://placehold.co/800x800/24303f/ffffff?text=Classic+Backpack',
    true,
    '{"color":"navy","colors":["navy","black"],"capacity_litres":22,"laptop_inches":15,"material":"recycled polyester"}'::jsonb
  ),
  (
    'Travel Bottle',
    'travel-bottle',
    '750 ml double-walled vacuum insulated stainless steel bottle. Keeps cold 24 hours, hot 12.',
    'accessories',
    89900, 'INR', 88,
    'https://placehold.co/800x800/5b6b7c/ffffff?text=Travel+Bottle',
    true,
    '{"color":"steel","colors":["steel","black","sage"],"capacity_ml":750,"insulated":true,"cold_hours":24,"hot_hours":12}'::jsonb
  ),
  (
    'Leather Card Holder',
    'leather-card-holder',
    'Slim four-pocket card holder in vegetable-tanned full grain leather. Unlined, ages well.',
    'accessories',
    129900, 'INR', 64,
    'https://placehold.co/800x800/6b4a32/ffffff?text=Leather+Card+Holder',
    true,
    '{"color":"tan","colors":["tan","black"],"pockets":4,"material":"vegetable tanned leather"}'::jsonb
  ),

  -- --- inactive: must never appear in public reads or agent search -----------
  (
    'Retired Canvas Tote',
    'retired-canvas-tote',
    'Discontinued line. Present only to verify that inactive products are excluded from public reads and agent search.',
    'accessories',
    79900, 'INR', 5,
    'https://placehold.co/800x800/9aa0a6/ffffff?text=Retired+Canvas+Tote',
    false,
    '{"color":"natural","discontinued":true}'::jsonb
  )

ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  price       = EXCLUDED.price,
  currency    = EXCLUDED.currency,
  stock       = EXCLUDED.stock,
  image_url   = EXCLUDED.image_url,
  active      = EXCLUDED.active,
  metadata    = EXCLUDED.metadata,
  updated_at  = now();

-- Sanity check, visible in the SQL editor output.
--   expected: 14 total, 13 active, 2 black hoodies at or under Rs 2,000
SELECT
  count(*)                                                        AS total_products,
  count(*) FILTER (WHERE active)                                  AS active_products,
  count(*) FILTER (WHERE active AND stock > 0)                    AS purchasable_products,
  count(*) FILTER (
    WHERE active
      AND price <= 200000
      AND category = 'clothing'
      AND (name ILIKE '%hoodie%' OR description ILIKE '%hoodie%')
      AND (metadata->>'color') = 'black'
  )                                                               AS black_hoodies_under_2000
FROM public.products;
