-- Per-envelope stamp/sticker decorations applied to the envelope front.
-- Array of { id, kind: 'emoji'|'asset', value, x, y, size, rotation }.
-- Coordinates are percentages (0-100) of envelope width/height; size is
-- percentage of the shorter envelope dimension so stamps scale with the SVG.
alter table public.envelopes
  add column if not exists stamps jsonb not null default '[]'::jsonb;
