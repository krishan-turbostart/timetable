# Timetable Project - Issues & Betterment Plan

## SECTION 1: BUGS & CRITICAL ISSUES

### Frontend Bugs

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | **All pages are `"use client"` with no server components** - Every page (courses, faculty, rooms, batches, schedules) is a client component. Defeats Next.js SSR/ISR benefits entirely. | `web/src/app/*/page.tsx` | High |
| 2 | **Homepage is an empty redirect** - `page.tsx` just redirects to `/schedules`, wasting a cold-start render. Should use `next.config.ts` redirect or a server component. | `web/src/app/page.tsx` | Low |
| 3 | **Missing loading/skeleton states** - SWR hooks have `isLoading` but pages show nothing while data loads (no spinners, no skeletons). | All pages | Medium |
| 4 | **No error boundaries** - If any component throws, the entire app crashes with a white screen. | App-wide | High |
| 5 | **Timetable grid doesn't handle empty/partial solver results** - If solver returns no assignments for a batch, the grid renders empty with no feedback. | `timetable-grid.tsx` | Medium |
| 6 | **Form dialogs don't disable submit during mutation** - Double-click can create duplicate records. | All `*-form-dialog.tsx` | Medium |

### API / Data Layer Bugs

| # | Issue | File | Severity |
|---|-------|------|----------|
| 7 | **Zero input validation on all API routes** - POST/PUT endpoints accept any JSON body without validation. Invalid data goes straight to Prisma, which throws unhandled errors. | All `route.ts` files | Critical |
| 8 | **No authentication or authorization** - Every API endpoint is publicly accessible. Anyone can CRUD all data. | All `route.ts` files | Critical |
| 9 | **Generic error responses leak internals** - Catch blocks return `error.message` directly, potentially exposing Prisma/DB details to clients. | All `route.ts` files | High |
| 10 | **Missing cascade delete logic** - Deleting a course doesn't clean up associated sessions/assignments. Deleting a faculty doesn't handle their course assignments. Orphaned records remain. | `[id]/route.ts` DELETE handlers | High |
| 11 | **No pagination on list endpoints** - `GET /api/courses`, `/faculty`, `/rooms` etc. return ALL records. Will break at scale. | All list `route.ts` | Medium |
| 12 | **Schedule delete doesn't verify state** - Can delete a schedule with active/solved timetable data without confirmation or cascading. | `schedules/[id]/route.ts` | Medium |
| 13 | **Solver endpoint has no timeout handling on the web side** - `solver-client.ts` calls the Python solver with no timeout. If solver hangs, the Next.js request hangs forever. | `solver-client.ts`, `solve/route.ts` | High |

### Solver Engine Bugs

| # | Issue | File | Severity |
|---|-------|------|----------|
| 14 | **No CORS configuration on FastAPI** - Cross-origin requests from the Next.js frontend will be blocked in production unless proxied. | `solver/app/main.py` | High |
| 15 | **Solver runs synchronously** - The `/solve` endpoint blocks the single worker. A second solve request queues behind the first. No async/background task support. | `solver/app/main.py` | High |
| 16 | **No request size limits** - Massive payloads (thousands of sessions) could crash the solver with OOM. | `solver/app/main.py` | Medium |
| 17 | **Feasibility check is incomplete** - `feasibility.py` checks room count vs timeslots but doesn't validate faculty availability against session count. | `feasibility.py` | Medium |
| 18 | **Hardcoded 60-second solver timeout** - Not configurable. Large institutions may need more; small ones waste time waiting. | `solver/app/engine/solver.py` | Low |

### Infrastructure Issues

| # | Issue | File | Severity |
|---|-------|------|----------|
| 19 | **Docker container runs as root** - No `USER` directive in Dockerfile. Security risk. | `solver/Dockerfile` | High |
| 20 | **No health check endpoints** - Docker compose has no `healthcheck` for solver or postgres. Start script uses naive `sleep 5`. | `docker-compose.yml`, `start.sh` | Medium |
| 21 | **Database credentials hardcoded** - `postgres:postgres` in docker-compose and connection strings. No `.env` file usage. | `docker-compose.yml` | High |
| 22 | **No volume for PostgreSQL data** - Database data is ephemeral. Container restart = data loss. | `docker-compose.yml` | Critical |
| 23 | **`start.sh` uses `npm run dev`** - Start script runs dev server, not a production build. | `start.sh` | Medium |

---

## SECTION 2: PRD COVERAGE GAPS

Comparing `prd.md` requirements against implementation:

| PRD Feature | Status | Gap |
|-------------|--------|-----|
| CRUD for Courses, Faculty, Rooms, Batches | Implemented | Minor validation issues |
| Schedule creation & management | Implemented | Missing status workflow (draft/published) |
| Timetable solver integration | Implemented | Missing progress feedback, retry logic |
| **Timetable view per batch** | Partial | No per-faculty view, no per-room view |
| **Export to PDF/Excel** | Not built | PRD mentions export capability |
| **Conflict highlighting** | Not built | No visual conflict indicators |
| **Faculty preference/availability** | Not built | PRD mentions faculty time preferences |
| **Manual override / drag-and-drop editing** | Not built | PRD mentions manual adjustment after solve |
| **Multi-department support** | Not built | Schema has no department model |
| **User roles (admin, faculty, viewer)** | Not built | No auth at all |
| **Audit log / change history** | Not built | No tracking of changes |
| **Notification system** | Not built | No alerts for timetable changes |

---

## SECTION 3: ARCHITECTURAL CONCERNS

1. **No testing at all** - Zero test files exist. No unit tests, integration tests, or E2E tests. No test configuration in `package.json`.

2. **No CI/CD pipeline** - No GitHub Actions, no deployment config, no linting in pipeline.

3. **No ESLint/Prettier config** - No code quality enforcement beyond TypeScript compiler.

4. **Tight coupling between web and solver** - `payload-builder.ts` manually transforms Prisma models to solver format. Any schema change requires updating both sides. No shared contract/schema.

5. **No environment management** - No `.env.example`, no environment-specific configs, no staging/production setup.

6. **No rate limiting** - API endpoints can be hammered without throttling.

7. **No caching strategy** - SWR provides client-side caching but no server-side caching (Redis, etc.) for expensive solver results.

8. **No logging infrastructure** - No structured logging, no request tracing, no error monitoring (Sentry, etc.).

---

## SECTION 4: PRIORITIZED BETTERMENT PLAN

### Phase 1 - Critical Fixes (Week 1-2)

| Priority | Task | Impact |
|----------|------|--------|
| P0 | Add PostgreSQL volume mount in docker-compose | Prevents data loss |
| P0 | Add input validation (Zod) to all API routes | Prevents crashes & injection |
| P0 | Add CORS to FastAPI solver | Unblocks production deployment |
| P0 | Move credentials to `.env` files | Security baseline |
| P1 | Add error boundaries to React app | Prevents white-screen crashes |
| P1 | Add cascade delete logic for related entities | Prevents orphaned data |
| P1 | Add non-root user to solver Dockerfile | Container security |
| P1 | Add loading states / skeletons to all pages | UX baseline |

### Phase 2 - Production Readiness (Week 3-4)

| Priority | Task | Impact |
|----------|------|--------|
| P1 | Add authentication (NextAuth.js) with role-based access | Security |
| P1 | Add pagination to all list API endpoints | Scalability |
| P1 | Add health checks to docker-compose | Reliability |
| P1 | Add request timeout to solver client | Prevents hung requests |
| P2 | Add Zod schema validation shared between frontend forms and API | Data integrity |
| P2 | Add structured logging (pino for Next.js, structlog for Python) | Observability |
| P2 | Add basic CI pipeline (lint + type check + build) | Code quality |

### Phase 3 - Feature Completeness (Week 5-8)

| Priority | Task | Impact |
|----------|------|--------|
| P2 | Add faculty-view and room-view for timetable | PRD requirement |
| P2 | Add timetable export (PDF/Excel) | PRD requirement |
| P2 | Add conflict highlighting in timetable grid | PRD requirement |
| P2 | Add async solver with progress/status polling | UX for large solves |
| P3 | Add faculty availability/preferences | PRD requirement |
| P3 | Add manual drag-and-drop timetable editing | PRD requirement |
| P3 | Add E2E tests (Playwright) | Quality assurance |

### Phase 4 - Scale & Polish (Week 9+)

| Priority | Task | Impact |
|----------|------|--------|
| P3 | Add multi-department support | Enterprise readiness |
| P3 | Add audit log / change history | Compliance |
| P3 | Add Redis caching for solved timetables | Performance |
| P3 | Add rate limiting (middleware) | Security |
| P3 | Server components for data-fetching pages | Performance |
| P4 | Add notification system for timetable changes | PRD requirement |
| P4 | Production deployment config (Vercel + Cloud Run) | Deployment |

---

**Summary**: The app has a solid foundation - the core CRUD, solver integration, and timetable visualization work. But it's currently a prototype-quality build with critical gaps in security (no auth, no validation, no CORS), reliability (no error handling, no volumes, no health checks), and completeness (~50% of PRD features missing). The Phase 1 fixes above are the minimum needed before any real usage.
