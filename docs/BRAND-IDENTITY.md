# CIVIC VISION — Brand identity

## Master mark
The canonical identity assets live in `public/brand/`:
- `civic-vision-mark.svg`: icon-only C mark.
- `civic-vision-horizontal.svg`: white wordmark for dark surfaces.
- `civic-vision-horizontal-dark.svg`: navy wordmark for light surfaces.

All in-app logo rendering should use `components/brand/BrandLogo.tsx`. Do not redraw the C mark in individual pages.

## Design tokens
Shared color, glass, radius, blur and shadow tokens are defined in `app/brand-tokens.css` and imported by `app/globals.css`.

## Guardrails
This brand-only change must not modify authentication, Supabase, database schema, API behavior, RLS, or learning/PBL flow. Keep approved page layouts and interaction behavior intact.
