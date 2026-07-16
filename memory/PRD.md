# ListingCraft — Product Requirements Document

## Original Problem Statement
AI-powered Etsy listing optimizer SaaS. Etsy sellers (solo artists, print sellers, handmade shops) struggle to write listings that rank in Etsy search. Users paste in a rough product description (+ optional photo), the AI generates a fully Etsy-optimized listing: title (140 chars, keyword front-loaded), 13 tags (≤20 chars each), description (SEO snippet + benefits + specs), attributes, alt text for photos. Copy-paste workflow (no Etsy API). Monetized with Stripe (Free / Starter $9 / Pro $19).

## User Personas
- **Sarah (Solo Etsy artist)** — sells paintings and prints, 20-50 listings, hates writing SEO copy.
- **Jamie (Craft shop owner)** — sells handmade crochet, 100-500 listings, wants bulk mode.
- **Alex (Print-on-demand seller)** — 500+ listings, needs Pro tier for unlimited generations + CSV export.

## Core Static Requirements
- Landing → Auth → Dashboard → Listing Generator (star screen) → Library → Pricing → Account.
- LLM: Claude Sonnet 4.5 (Emergent LLM key) for text + vision.
- Auth: Emergent Google Auth + email/password JWT.
- Payments: Stripe test key (one-time monthly/annual with plan_expires_at extension).
- DB: MongoDB.

## What's been implemented (v1 — Feb 2026)
- Backend FastAPI: auth (email/pw + Google), listing generation, per-field regenerate, library CRUD, keyword ideas, listing score, quota enforcement, Stripe checkout + webhook, analytics events.
- Frontend React: Landing page (hero, before/after, features, pricing, FAQ), Login/Register, Dashboard, Listing Generator (2-column, all controls, copy buttons, score ring), Library, Pricing, Account, Terms, Privacy, Checkout success.
- Seeded demo account with 3 example listings.

## Prioritized Backlog
- **P0** — CSV export for Pro plan (endpoint stubbed, needs implementation).
- **P0** — Bulk mode UI (backend endpoint exists).
- **P1** — Stripe recurring subscriptions (currently one-time monthly renewals).
- **P1** — Stripe Customer Portal integration for cancel/refund.
- **P2** — "Publish to Etsy" guided checklist mode.
- **P2** — Team seats for multi-shop owners.
- **P2** — Analytics dashboard for the seller (listing views once Etsy API is available).

## Next Tasks
- Wire testing agent, fix any critical bugs from report.
- Add polish once user reviews first cut.
