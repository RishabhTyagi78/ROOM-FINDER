# KHATTA-MEETHA — Product Requirements Document

## Original Problem Statement
Modern, full-stack rental platform connecting property owners (KHATTA) directly with tenants (MEETHA) — broker-free, with location search, dashboards, chat, rent management, document verification, reviews, admin.

## Tech Stack
- Frontend: React (CRA) + Tailwind + shadcn — professional minimalist (Inter font, slate/indigo, soft shadows).
- Backend: FastAPI + Motor (MongoDB).
- Auth: JWT email/password + Emergent Google OAuth.
- Maps: Leaflet + OpenStreetMap + Nominatim (no API key).
- Storage: Emergent Object Storage (via EMERGENT_LLM_KEY).
- Chat & Typing: 4 s polling.

## Personas
1. Dual-role user — anyone can list AND rent on the same account (roles=['khatta','meetha']).
2. Admin — moderates platform.
3. Guest — browses without auth.

## Implemented — Feb 2026
### Backend (`/api`)
- Auth: register/login/logout/me/forgot-reset/google-oauth, **dual-role** by default.
- Properties: CRUD + filters + nearby (haversine) + status toggle + view tracking.
- Appointments: create/list/update; **owner cannot book own property**; auto-notify.
- Messages: send/list + typing indicator endpoint + read receipts + delivered flag + per-conversation unread count.
- Favorites & Reviews (with aggregate rating + owner reply).
- Notifications: `/notifications` (list/unread-count/mark-read/read-all). Auto-created on appointment events, messages, reviews, rent reminders.
- Documents upload + admin verify.
- Geo: `/geo/reverse` + `/geo/search` (Nominatim proxy).
- Object storage upload + file serve.
- Dashboards (khatta, meetha, admin), `properties-viewed`, admin user/property mgmt.

### Frontend
- Landing — clean hero, search bento, featured grid, why-us bento, testimonial, FAQ, dark CTA.
- Login / Register (single role chooser, default to dual roles internally) + Google + Forgot/Reset.
- Explore — grid/list/map views + advanced filter panel + skeletons.
- Map search — Leaflet + radius + landmark presets.
- Property detail — gallery + amenities + map + reviews + **owner-aware** (owner sees Edit/Manage; tenant sees Visit + Message).
- Unified Dashboard — role switcher (Tenant ↔ Owner), stats, properties grid, appointments, rent, saved, recently viewed, documents.
- Property form — searchable + draggable map pin with reverse-geocode autofill, multi-image upload.
- Chat — sidebar with search & unread badge, multi-line textarea (Shift+Enter), typing indicator, read receipts (check/double-check), online dot.
- Notifications page + bell with dropdown.
- Compare (4-way) + Admin panel.
- **Light + Dark mode** toggle (CSS variables).

## Tested
- Backend: 30/30 pytest pass.
- Frontend: All critical flows verified by testing agent (role switcher, notif bell, list-property, chat shift-enter, owner-self-block).

## Backlog (P1/P2)
- P1: shadcn DatePicker for visit-booking; split server.py into routers; httpx.AsyncClient for non-blocking geo; defense-in-depth message-self-block; notifications pagination/aging; strip 'admin' role from public user shape.
- P2: WebSocket chat & typing (replace polling); calendar widget; email-driven password reset; online rent payments (Stripe/Razorpay); AI recommendations; broker-free verified badge; digital rental agreements.

## Test Credentials
See `/app/memory/test_credentials.md`.
