# Architectural Audit: Lisztomania

**Date:** 2026-03-27
**Scope:** Full-stack codebase (Next.js frontend + FastAPI backend)

---

## Executive Summary

Lisztomania is a well-structured application that follows modern conventions for both its React/Next.js frontend and FastAPI backend. The codebase is readable, the type system is comprehensive, and real-time collaboration features are implemented cleanly. However, the audit reveals **structural weaknesses across all five evaluation pillars** that will compound as the application scales. The most critical issues are: business logic embedded in route handlers, God components on the frontend, scattered hard-coded values, and the absence of a service layer on the backend.

---

## Pillar 1: Separation of Concerns

**Rating: 5/10 -- Significant violations on both sides of the stack**

### Backend: Business Logic Lives in Routers

The most consequential SoC violation is that **routers contain business logic, data access, and orchestration** rather than delegating to services. The `services/` directory exists but is underused -- it holds LLM, weather, prompt, and chat services, while all CRUD operations and complex workflows execute directly in route handlers.

**Critical examples:**

| Router | Line Count | Violation |
|--------|-----------|-----------|
| `routers/generation.py` | 276 | `generate_trip_checklist()` is ~140 lines: fetches trip, loads profiles/bags/library, queries hindsight history (4 DB queries), refreshes weather, builds prompt, calls LLM, deletes old items, inserts new items, updates trip status |
| `routers/trips.py` | 235 | `copy_trip()` (~80 lines) creates a trip, copies profiles, copies bags with ID remapping, optionally copies checklist items with bag ID mapping |
| `routers/chat.py` | 150 | `_fetch_trip_context()` assembles full trip context (profiles, bags, checklist, accommodations) inside the router module |

**Why this matters:** These functions cannot be reused, composed, or tested in isolation. If a background job, webhook, or CLI tool needs to generate a checklist, it must duplicate the router logic or import from a router module (an anti-pattern).

**Recommended fix:** Introduce a proper service layer:
```
services/
  trip_service.py       # copy_trip, enrich_trip, check_access
  checklist_service.py  # generate, hindsight
  generation_service.py # orchestrate LLM generation pipeline
```

### Frontend: The Trip Page God Component

`app/(app)/trips/[tripId]/page.tsx` (385 LOC) is the single largest SoC violation on the frontend. It manages:

- Trip data fetching and mutation
- Bag CRUD orchestration
- Profile loading
- Chat sheet state
- Regeneration sheet state
- Weather refresh logic with polling
- Collaboration management (add/remove collaborators)
- Weather suggestion handling
- Presence tracking
- 6+ independent sheet/modal open states (~15 useState calls)

This page is simultaneously a **data coordinator, state machine, and UI renderer**. Any change to bags, weather, chat, or collaboration logic risks breaking the page.

**Other frontend violations:**
- `ProfileForm.tsx` (259 LOC) manages both profile data AND bag CRUD -- two distinct concerns
- `settings/page.tsx` (178 LOC) combines user profile settings and admin LLM configuration
- `useTripChat.ts` (147 LOC) contains SSE stream parsing logic that belongs in the service layer

---

## Pillar 2: Modularity & Coupling

**Rating: 6/10 -- Moderate coupling with specific pain points**

### Backend: Duplicated Access Control

The `_check_trip_access()` helper is **copy-pasted across 4 router files** (`trips.py`, `bags.py`, `checklist.py`, `chat.py`). Each copy performs the same Supabase query and authorization check. This is a textbook coupling smell -- a change to access control logic requires synchronized edits across 4 files.

```python
# Duplicated in bags.py, checklist.py, chat.py, generation.py
async def _check_trip_access(trip_id: str, user_id: str):
    result = db.table("trips").select("*").eq("id", trip_id).single().execute()
    trip = result.data
    if trip["user_id"] != user_id and user_id not in (trip.get("collaborator_ids") or []):
        raise HTTPException(403)
    return trip
```

### Backend: Supabase Client as Hidden Global

Every router imports `get_db()` from `supabase_client.py` and calls it inline. This creates **implicit coupling to Supabase throughout the entire codebase**. There is no repository abstraction or data access interface. Swapping the database (or even mocking it for tests) requires touching every router file.

### Backend: LLM Configuration Coupling

LLM settings are resolved in 3 different places with slightly different fallback logic:

| Location | Pattern |
|----------|---------|
| `llm_service.py` | `settings.openai_api_key`, `settings.llm_base_url`, `settings.llm_model` |
| `chat_service.py` | `settings.chat_openai_api_key or settings.openai_api_key or "no-key"` |
| `admin_service.py` | DB config with env-var fallbacks |

Each consumer resolves its own configuration chain, so adding a new LLM provider or changing the resolution order requires edits in multiple locations.

### Frontend: Clean Service Boundary (Strength)

The frontend service layer is well-modularized. All API calls flow through `apiClient` which centralizes authentication headers. Hooks depend on services, components depend on hooks -- the dependency graph is acyclic and predictable:

```
Component --> Hook --> Service --> apiClient --> Backend
```

**One exception:** `checklist.service.ts` mixes weather operations (`searchLocations`, `getWeather`) with checklist CRUD. These should be in a dedicated `weather.service.ts`.

### Frontend: Hard Coupling to Supabase Realtime

`useTripChecklist.ts` and `useTripPresence.ts` directly import and subscribe to Supabase channels. If the realtime provider changes, both hooks and their channel-specific event handling (`POSTGRES_CHANGES`, presence) must be rewritten. An abstraction layer (e.g., `RealtimeProvider`) would isolate this.

---

## Pillar 3: Abstractions & Extensibility

**Rating: 5/10 -- Adding features requires modifying multiple existing files**

### Backend: No Repository Pattern

Every router directly constructs Supabase queries. Adding a new data source, implementing caching, or adding audit logging would require modifying every route handler. A repository layer would allow decoration:

```python
# Current: scattered in routers
db.table("trips").select("*").eq("id", trip_id).single().execute()

# Better: centralized, extensible
trip_repo.get_by_id(trip_id)  # can add caching, logging, metrics
```

### Backend: Prompt Builder is a Monolith

`prompt_builder.py:build_generation_prompt()` is 192 lines of string concatenation in a single function. Adding a new context source (e.g., transportation mode, dietary restrictions) requires modifying this function. The prompt should be composed from discrete, independently testable sections:

```python
# Better: composable prompt sections
sections = [
    TripDetailsSection(trip),
    TravelersSection(profiles),
    BagsSection(bags),
    WeatherSection(weather),
    HindsightSection(exclusions, inclusions),
    LibrarySection(library_items),
]
prompt = "\n".join(s.render() for s in sections)
```

### Backend: Hard-Coded Category List

Categories (`Clothing, Toiletries, Electronics, Documents, Health, Kids, Food & Snacks, Entertainment, Miscellaneous, Pre-Trip Task`) are embedded as a string literal in `prompt_builder.py` (line 179). The same categories appear in the frontend `AddItemSheet.tsx` as a hard-coded array. Adding a new category requires edits in both codebases with no validation that they stay in sync.

### Frontend: View Mode Extensibility

Adding a new checklist view mode (e.g., "by priority") would require:
1. Adding the mode to the Zustand store type union
2. Adding a grouping function in `ChecklistView.tsx`
3. Adding a button to `ViewToggle.tsx`

This is acceptable but could be improved with a registry pattern where view modes are self-describing objects.

### Frontend: Wizard Steps are Well-Abstracted (Strength)

The trip creation wizard uses a step-index state machine in `TripWizard.tsx` where each step is an independent component receiving `formData` and `onNext`. Adding a new wizard step is a matter of creating a component and inserting it into the steps array -- good extensibility.

---

## Pillar 4: Consistency & Patterns

**Rating: 6/10 -- Clear patterns exist but are broken in key places**

### Backend: Inconsistent Endpoint Conventions

The API has two competing resource-addressing patterns:

| Pattern | Example | Used By |
|---------|---------|---------|
| Nested under parent | `GET /trips/{id}/bags` | bags (list), checklist (list), chat |
| Top-level by ID | `PATCH /bags/{id}` | bags (update), checklist (update) |

This means creating a bag requires the trip ID, but updating it does not. The mental model of "bags belong to trips" is broken at the API level. This inconsistency forces the frontend to track both trip IDs and bag IDs independently.

### Backend: Inconsistent Error Handling

Some routers validate data existence explicitly:
```python
if not result.data:
    raise HTTPException(404, "Trip not found")
```

Others assume `result.data` exists and would throw an unhandled `AttributeError` on a missing record. There is no consistent pattern for handling Supabase query failures.

### Backend: Date Handling Inconsistency

Dates are serialized differently across the codebase:
- `trips.py` line 50-51: Manual `str()` conversion for `start_date`/`end_date`
- `trips.py` line 100-103: `date.isoformat()` for trip copy
- `prompt_builder.py` line 16: `date.fromisoformat(str(trip["start_date"]))` -- defensive double-conversion

No single utility function handles date serialization, leading to fragile ad-hoc conversions.

### Frontend: Consistent Hook Pattern (Strength)

All data-fetching hooks follow the same SWR pattern:
```typescript
export function useProfiles() {
  const { data, error, isLoading, mutate } = useSWR("profiles", profilesService.list);
  return { profiles: data ?? [], isLoading, error, mutate };
}
```

This is applied consistently for profiles, trips, library, and accommodations. The pattern is predictable and easy to onboard new developers.

### Frontend: Inconsistent Form Patterns

Some forms use controlled components with `useState` per field, others use a single `formData` object. `ProfileForm.tsx` uses individual state variables, while `AccommodationForm.tsx` uses a unified state object. Neither approach is wrong, but the inconsistency adds cognitive load.

### Frontend: Auth Form Duplication

`LoginForm.tsx` (120 LOC) and `SignupForm.tsx` (137 LOC) share ~70% identical code (Google OAuth button, error display, form layout). These should share a common `AuthForm` base component.

---

## Pillar 5: Complexity & Spaghetti Code

**Rating: 5/10 -- Several high-complexity hotspots**

### Backend: `generation.py:generate_trip_checklist()` -- Cyclomatic Complexity: High

This single function (~140 lines) has the highest complexity in the codebase:

```
1. Fetch trip and validate access
2. Set status to "generating"
3. Fetch profiles (via join table)
4. Fetch bags
5. Fetch library items
6. Query past trips for hindsight
7. Query unused items from past trips
8. Query wished-for items from past trips
9. Conditionally refresh weather
10. Conditionally fetch weather if missing
11. Build prompt
12. Call LLM
13. Build name-to-ID mappings
14. Delete old LLM-generated items
15. Transform and insert new items
16. Update trip status to "complete"
17. Catch all exceptions, set status to "error"
```

This is a **17-step orchestration with 7+ database calls, conditional branching, and no transaction safety**. If step 15 fails (inserting new items), step 14 has already deleted the old ones -- the user loses their checklist with no recovery path.

### Backend: `trips.py:copy_trip()` -- Hidden Complexity

The trip copy operation performs 4-5 database operations with ID remapping logic:
```python
bag_id_map = {}
for old_bag in old_bags:
    new_bag_data = {k: v for k, v in old_bag.items() if k not in ("id", "created_at", ...)}
    new_bag_data["trip_id"] = new_trip_id
    new_bag = db.table("bags").insert(new_bag_data).execute()
    bag_id_map[old_bag["id"]] = new_bag.data[0]["id"]
```
If any intermediate step fails, partial data is left in the database with no cleanup.

### Backend: Weather Service Duplicate Processing

`weather_service.py` processes weather data in two nearly identical blocks (lines 114-142 and 145-163). The second block is a fallback when trip dates don't overlap with forecast data. Both blocks compute min/max temp, precipitation chance, and weather summaries with the same logic. This is ~30 lines of duplicated code.

### Frontend: `[tripId]/page.tsx` State Explosion

The trip detail page manages at least 15 pieces of state:
```typescript
const [showRegenerateSheet, setShowRegenerateSheet] = useState(false);
const [showBagsSheet, setShowBagsSheet] = useState(false);
const [showCollaborateSheet, setShowCollaborateSheet] = useState(false);
const [showWishedForSheet, setShowWishedForSheet] = useState(false);
const [showChat, setShowChat] = useState(false);
const [showWeatherSuggestions, setShowWeatherSuggestions] = useState(false);
const [weatherSuggestions, setWeatherSuggestions] = useState(null);
const [isRefreshingWeather, setIsRefreshingWeather] = useState(false);
// ... plus trip, bags, profiles, error states
```

This state is interconnected: opening the regenerate sheet depends on bags being loaded; weather suggestions depend on refresh completion; collaboration changes require trip refetch. A `useReducer` or state machine would make transitions explicit and prevent impossible states (e.g., two sheets open simultaneously).

### Frontend: ChecklistItem Touch Handling

`ChecklistItem.tsx` (211 LOC) implements custom swipe-to-reveal gestures with manual touch event handling, threshold calculations, and snap physics. While functional, this is the kind of interaction logic that should use a library (e.g., `react-swipeable`) or be extracted to a `useSwipeGesture` hook to avoid reimplementing touch mechanics.

---

## Cross-Cutting Concerns

### No Transaction Safety

Neither the frontend nor backend implement transactional operations. Multi-step database operations (trip copy, checklist generation, hindsight submission) can leave partial state on failure. Supabase supports PostgreSQL transactions via RPC -- these critical flows should use them.

### No Logging or Observability

The backend has **zero logging statements**. There is no request tracing, no error logging beyond HTTP status codes, and no performance metrics. In production, diagnosing issues would require reading Supabase logs directly.

### Missing Test Infrastructure

No test files were found in either the frontend or backend. The tight coupling between routers and Supabase makes the backend particularly difficult to test without integration infrastructure. The frontend hooks and services are well-structured for testing but have no tests.

### Hard-Coded Configuration Scattered Across Codebase

| Value | Location(s) | Risk |
|-------|------------|------|
| Temperature thresholds (50/75 F) | `weather_service.py`, `prompt_builder.py` | Duplicated, not configurable |
| Category list | `prompt_builder.py`, `AddItemSheet.tsx` | Duplicated across stack |
| Item count formula | `prompt_builder.py` line 186 | Magic numbers: `20 + 10*(n-1)` to `60 + 15*(n-1)` |
| LLM temperature | `llm_service.py` (0.7), `chat_service.py` (0.5) | Hard-coded, not configurable |
| CORS origin | `main.py` | Hard-coded `localhost:3000` |
| Hindsight limits | `generation.py` lines 97, 105 | `[:20]` silently truncates |
| Weather icon mapping | `weather_service.py`, `WeatherForecast.tsx` | Duplicated across stack |
| Auth redirect URL | `LoginForm.tsx`, `SignupForm.tsx` | Hard-coded `/api/auth/callback` |

---

## Priority Recommendations

### P0 -- Correctness & Data Safety
1. **Add transaction safety** to `generate_trip_checklist()` and `copy_trip()` via Supabase RPC or batch operations. The current delete-then-insert pattern in generation risks data loss.
2. **Centralize `_check_trip_access()`** into a shared dependency or middleware to eliminate 4-way duplication and ensure consistent authorization.

### P1 -- Architectural
3. **Extract a backend service layer** for trips, checklist, and generation. Route handlers should validate input, call a service, and return the response. All database access and business logic moves to services.
4. **Break up `[tripId]/page.tsx`** into a composition of feature-specific hooks (`useTripSheets`, `useWeatherRefresh`, `useCollaboration`) or use `useReducer` to consolidate the 15+ state variables.
5. **Introduce a repository/data-access layer** on the backend to abstract Supabase queries. This enables testing, caching, and future database changes.

### P2 -- Maintainability
6. **Consolidate hard-coded constants** into a shared configuration module (`constants.py` backend, `constants.ts` frontend). Categories, temperature thresholds, and LLM parameters should be defined once.
7. **Decompose `prompt_builder.build_generation_prompt()`** into composable section builders that can be tested independently.
8. **Remove dead code**: `CHAT_TOOLS` and `execute_tool_call()` in `chat_service.py` are stubs that add confusion.
9. **Unify LLM configuration resolution** into a single function called by both generation and chat services.

### P3 -- Developer Velocity
10. **Add structured logging** (Python `logging` module with JSON formatter) to all backend services and route handlers.
11. **Add test infrastructure** with a Supabase mock/fixture layer for backend unit tests and React Testing Library for frontend hooks.
12. **Extract auth forms** into a shared `AuthForm` component to eliminate duplication between login and signup.

---

## Architecture Scorecard

| Pillar | Score | Key Issue |
|--------|-------|-----------|
| Separation of Concerns | 5/10 | Business logic in routers; God component on trip page |
| Modularity & Coupling | 6/10 | Duplicated access control; direct Supabase coupling |
| Abstractions & Extensibility | 5/10 | No repository pattern; monolithic prompt builder |
| Consistency & Patterns | 6/10 | Clean hook patterns, but inconsistent API conventions and date handling |
| Complexity | 5/10 | `generate_trip_checklist()` is 17-step non-atomic orchestration |
| **Overall** | **5.4/10** | Solid foundation with clear structural debt |

The codebase is at a **critical inflection point**: small enough to refactor efficiently, but accumulating the kind of structural debt that becomes exponentially harder to address as features are added. The recommended P0 and P1 changes would bring the architecture to a 7-8/10 and significantly improve developer velocity for future enhancements.
