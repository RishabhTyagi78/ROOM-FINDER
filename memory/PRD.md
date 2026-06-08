# KHATTA-MEETHA — Product Requirements Document

## Original Problem Statement
Build KHATTA-MEETHA: a modern, full-stack rental platform that directly connects property owners (KHATTA) with students, families, and working professionals (MEETHA). Eliminates brokers, location-based search, dashboards, chat, rent management, document verification, reviews, admin panel.

## Tech Stack (decided)
- Frontend: React (CRA + Tailwind + shadcn ui components) — Brutalist design.
- Backend: FastAPI + Motor (MongoDB).
- Auth: JWT email/password + Emergent Google OAuth.
- Maps: Leaflet + OpenStreetMap (no API key).
- Storage: Emergent Object Storage (via EMERGENT_LLM_KEY).
- Chat: Polling (4s).

## Personas
1. KHATTA — Property Owner (lists, manages, talks to tenants).
2. MEETHA — Tenant (searches, books visits, saves, chats, reviews).
3. Guest — browses without auth.
4. Admin — moderates.

## Done — Feb 2026 (MVP)
### Backend (all under /api)
- Auth: register, login, logout, me, forgot-password, reset-password, google/session, set-role.
- Properties: full CRUD + filters + nearby (haversine).
- Appointments: create, list, update status.
- Favorites: add/remove/list.
- Messages + Conversations (polling).
- Reviews with aggregate rating + owner reply.
- Rent records & reminders.
- Documents upload + admin verify.
- Object storage upload + file serve (`/api/upload`, `/api/files/{path}`).
- Dashboards: khatta, meetha, admin stats; admin user mgmt.
- Seeded admin + 2 test users + 6 sample Bangalore properties.

### Frontend
- Landing (Brutalist hero, marquee, search, bento features, how-it-works, FAQ, CTA).
- Login / Register (with role chooser) + Google login + Forgot/Reset.
- Explore (grid/list/map views + filters + chips).
- Map search (radius + nearby landmarks via Nominatim).
- Property detail (gallery, amenities, mini-map, reviews, book a visit, quick chat).
- Khatta dashboard (stats, properties, appointments, rent).
- Meetha dashboard (saved, visits, documents w/ upload).
- Property add/edit form (multi-image upload).
- Chat (sidebar + conversation + polling).
- Compare (up to 4 side-by-side).
- Admin panel (stats, users, doc verify).

## Backlog (P1/P2)
- P1: Replace polling with WebSocket chat; Email verification (currently flag only); Email-driven password reset; Real GPS landmark library; Calendar widget for visit booking; Rate-limit / brute-force on /auth/login.
- P1: Tighten admin auth flows (document verify ownership check, rent-records ownership check, CORS allowlist).
- P2: AI property recommendations; Online rent payments (Stripe/Razorpay); Digital rental agreements; Roommate matching; Fraud detection.
- P2: Split server.py into routers; use httpx.AsyncClient for non-blocking IO.

## Test Credentials
See `/app/memory/test_credentials.md`.
