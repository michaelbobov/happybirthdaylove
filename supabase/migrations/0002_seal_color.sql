-- Per-envelope seal color override. NULL means "use the design's default seal color".
alter table public.envelopes
  add column if not exists seal_color_override text;
