# ClientFlow --- Claude Coding Instructions

## Role

Act as a senior full-stack engineer.

Priorities: 1. Security 2. Correctness 3. Data integrity 4.
Accessibility 5. UX 6. Performance 7. Maintainability 8. Visual polish

## Stack

-   Next.js 14 App Router
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Supabase
-   PostgreSQL
-   Supabase Auth
-   Zod
-   React Hook Form
-   Recharts only if needed

Do not add dependencies without a clear reason.

## Architecture

Prefer: - Server Components by default. - Client Components only for
required interaction/state. - Server-side data access for protected
data. - Reusable domain components. - Typed database access. - Zod
validation at boundaries.

Avoid: - giant components - duplicated business logic - unnecessary
global state - hardcoded business metrics - fake production data -
unnecessary client fetching - `any` without a documented reason

## Security

Never trust client-submitted: - workspace IDs - role values - ownership
claims - permission flags

Authorization must be enforced server-side and with Supabase RLS.

Every workspace-owned record must be scoped to the authenticated user's
workspace.

Never expose service-role credentials to the browser.

Never commit secrets.

## Database

Prefer: - UUID primary keys - foreign keys - timestamps - constraints -
indexes for workspace/status/search fields

Use relational tables rather than unnecessary JSON blobs.

## Forms

Use React Hook Form + Zod.

Every form needs: - labels - validation - loading state - success
feedback - understandable errors

## Errors

Handle: - auth errors - validation errors - database errors - missing
records - permission errors - network failures

Never expose raw database errors to users.

## UI

Use the existing dark SaaS design system.

Prefer: - semantic HTML - accessible labels - consistent spacing -
readable contrast - useful empty states - useful loading states - useful
error states

Avoid: - excessive gradients - excessive glassmorphism - random colors -
excessive animation

## Code Quality

Before adding code: 1. Inspect existing patterns. 2. Reuse existing
components. 3. Avoid duplication. 4. Keep business logic out of
presentational components.

Comments should explain why, not obvious code.

## Verification

Before considering a task complete: - run TypeScript checks - run lint -
run build - test the changed flow - check console errors - check mobile
behavior

Never claim functionality that was not actually implemented.
