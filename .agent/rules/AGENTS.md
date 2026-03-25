---
trigger: always_on
---

# Lisztomania - Project Reference

AI-powered packing list app that generates personalized checklists based on traveler profiles, weather, and trip history.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Framer Motion |
| State | Zustand (UI), React Hooks + SWR, Supabase real-time |
| Backend | FastAPI (Python), Pydantic |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT |
| LLM | OpenAI-compatible API (configurable — supports Groq, Ollama, OpenRouter) |
| Weather | OpenWeatherMap |
| Deployment | Docker Compose (local), Vercel (frontend), cloud container (backend) |

## Directory Structure

```
lisztomania/
├── frontend/               # Next.js app
│   ├── app/
│   │   ├── (app)/          # Authenticated routes (layout with auth guard + nav)
│   │   │   ├── dashboard/  # Trip list
│   │   │   ├── profiles/   # Traveler profiles CRUD
│   │   │   ├── library/    # Custom item library CRUD
│   │   │   ├── settings/   # User settings
│   │   │   └── trips/
│   │   │       ├── new/            # 5-step trip creation wizard
│   │   │       └── [tripId]/       # Trip checklist view
│   │   │           └── hindsight/  # Post-trip feedback
│   │   └── (auth)/         # Login, signup
│   ├── components/
│   │   ├── auth/           # LoginForm, SignupForm
│   │   ├── checklist/      # ChecklistView, ChecklistItem, ViewToggle, ProgressDashboard
│   │   ├── dashboard/      # TripCard
│   │   ├── hindsight/      # HindsightReview
│   │   ├── layout/         # AuthGuard, BottomNav, PageHeader
│   │   ├── library/        # LibraryItemForm
│   │   ├── profiles/       # ProfileForm
│   │   ├── trips/wizard/   # 5 wizard step components
│   │   └── ui/             # ProgressRing
│   ├── hooks/              # useAuth, useTrips, useProfiles, useLibrary, useTripChecklist, useOptimisticChecklist, useChecklistProgress
│   ├── lib/
│   │   ├── api/client.ts   # HTTP client (auto-injects auth header)
│   │   └── supabase/       # browser + server clients
│   ├── services/           # API call layer — checklist, trips, profiles, library
│   ├── store/uiStore.ts    # Zustand: checklist view mode, sheet open states
│   └── types/index.ts      # All TypeScript interfaces
├── backend/app/
│   ├── main.py             # FastAPI app, router registration, CORS
│   ├── config.py           # Pydantic settings (env vars)
│   ├── dependencies.py     # JWT auth dependency (get_current_user)
│   ├── routers/            # users, profiles, library, trips, bags, checklist, generation
│   ├── schemas/            # Pydantic request/response models per domain
│   ├── services/
│   │   ├── supabase_client.py   # DB client singleton (service role key)
│   │   ├── llm_service.py       # Structured LLM call
│   │   ├── weather_service.py   # OpenWeatherMap integration
│   │   └── prompt_builder.py    # Assembles LLM prompt from trip context
│   └── utils/              # auth.py (JWT decode), exceptions.py
└── supabase/               # DB migrations & config
```

## Core Data Models (`frontend/types/index.ts`)

- **User** — account with `default_origin` (home city)
- **Profile** — traveler (name, birthday/age, gender, relationship, notes for packing needs)
- **LibraryItem** — custom item with `weather_tag`, `trip_type_tag`, `always_pack`, optional `assigned_profile_id`
- **Trip** — origin, destination, dates, trip_type, trip_events, weather_data, profile_ids, collaborator_ids, `generation_status` (pending→generating→complete|error), `hindsight_completed`
- **Bag** — luggage with type (checked/carry_on/personal_item), optional `owner_profile_id`
- **ChecklistItem** — item_name, category, timing_attribute, assigned_profile_id, bag_id, is_checked, was_unused, source (llm|manual), quantity

## API Endpoints (base: `/api/v1`, all require Bearer JWT)

```
GET/POST        /users/me, /users
GET/POST/PATCH/DELETE  /profiles, /profiles/{id}
GET/POST/PATCH/DELETE  /library, /library/{id}
GET/POST/PATCH/DELETE  /trips, /trips/{id}
POST            /trips/{id}/invite
GET/POST/PATCH/DELETE  /trips/{id}/bags, /bags/{id}
GET/POST/PATCH/DELETE  /trips/{id}/checklist, /checklist/{id}
POST            /trips/{id}/hindsight
GET             /weather?destination=&start_date=&end_date=
POST            /trips/{id}/generate?refresh_weather=false
```

## Key Patterns

**Frontend data flow:** component → hook → service → `apiClient` (auto-auth) → backend

**Real-time:** `useTripChecklist()` subscribes to Supabase PostgreSQL Changes on `checklist_items` (filters by `trip_id`). Handles INSERT/UPDATE/DELETE for collaborative editing.

**Optimistic UI:** `useOptimisticChecklist()` updates local state immediately on checkbox toggle; reverts on API failure.

**LLM generation flow:**
1. POST `/trips/{id}/generate` → sets `generation_status = generating`
2. `prompt_builder.py` assembles prompt: trip details + travelers + bags + library items (filtered by tags) + hindsight exclusions
3. LLM returns structured JSON (`LLMGenerationResponse`) — strict Pydantic schema
4. Items inserted to DB, `generation_status = complete`
5. Frontend (`StepGenerating`) polls/subscribes until complete, then redirects to checklist

**Checklist views:** 4 modes — by bag, by person, by category, by timing. View state in Zustand.

**Access control:** All trip endpoints call `_check_trip_access()` — verifies `user_id == trip.user_id OR user_id in trip.collaborator_ids`.

**Hindsight loop:** Post-trip, user marks items as `was_unused`. Next generation query passes these to LLM as soft exclusions.

## Adding a New Feature

1. Types → `frontend/types/index.ts`
2. Backend schema → `backend/app/schemas/`
3. Backend router → `backend/app/routers/`
4. Frontend service → `frontend/services/`
5. Frontend hook → `frontend/hooks/` (if stateful)
6. Component → `frontend/components/`
7. Page → `frontend/app/(app)/`
