# ClientFlow --- Skills & Engineering Standards

## Full-Stack

Required: - Next.js App Router - React - TypeScript - Server
Components - Client Components - Server Actions - API fundamentals

Use server-side execution where possible.

## TypeScript

Use: - strict types - domain types - typed database responses -
discriminated unions where useful

Avoid `any`.

## React

Understand: - component composition - controlled forms - server/client
boundaries - local state - appropriate memoization

Avoid unnecessary `useEffect` and global state.

## UI

Use: - Tailwind - shadcn/ui - semantic HTML - responsive design -
accessible forms - consistent spacing

Prioritize: - hierarchy - readability - feedback - usability

## Forms

Use:

``` text
React Hook Form + Zod
```

Every form needs: - label - validation - loading - success - error state

## PostgreSQL

Understand: - relations - foreign keys - indexes - constraints - query
performance - transactions when needed

Prefer normalized relational data.

## Supabase

Use: - Auth - PostgreSQL - RLS - generated database types

Never rely only on frontend permission checks.

## Security

Always verify: - authentication - workspace membership - role - record
access - input validation

Never expose: - service-role key - private API keys - credentials

## SaaS Concepts

Understand: - multi-tenancy - workspaces - roles - permissions -
activity logs - soft deletion - pagination - filtering - search

## Dashboard

Metrics must use real queries.

Do not hardcode: - revenue - client count - project count - deal count

Charts should answer a business question.

## UX States

Every major screen: - Loading - Empty - Error - Success - Confirmation

## Accessibility

Target WCAG AA where practical.

Check: - contrast - keyboard - focus - labels - semantic HTML -
screen-reader support

## Performance

Understand: - server rendering - client bundle - image optimization -
indexes - pagination - caching/revalidation

Optimize based on evidence.

## Testing

Critical flow:

``` text
Signup
→ Workspace
→ Create Client
→ Create Deal
→ Win Deal
→ Create Project
→ Create Task
→ Complete Task
```

Test auth, RLS, CRUD, validation, and critical flows.

## Git

Use meaningful commits:

``` text
feat: add workspace onboarding
feat: add client management
feat: add deal pipeline
feat: add project management
fix: enforce workspace authorization
refactor: extract client queries
```

Avoid `update`, `fix stuff`, or `final`.

## Portfolio Standard

ClientFlow should demonstrate:

``` text
UI
+
Frontend
+
Backend
+
Database
+
Authentication
+
Authorization
+
Business Logic
+
Deployment
```
