# ClientFlow --- Architecture

## 1. Overview

ClientFlow uses:

**Browser → Next.js → Server Components / Server Actions → Supabase
Auth + PostgreSQL**

Target deployment: - Vercel - Supabase

## 2. Project Structure

``` text
clientflow/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── projects/
│   │   ├── deals/
│   │   ├── tasks/
│   │   └── settings/
│   ├── api/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── clients/
│   ├── projects/
│   ├── deals/
│   ├── tasks/
│   └── shared/
├── lib/
│   ├── supabase/
│   ├── actions/
│   ├── queries/
│   ├── permissions/
│   ├── validations/
│   └── utils/
├── types/
│   ├── database.ts
│   └── domain.ts
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── tests/
```

## 3. Database

### profiles

-   id
-   user_id
-   full_name
-   avatar_url
-   created_at
-   updated_at

### workspaces

-   id
-   name
-   slug
-   created_by
-   created_at
-   updated_at

### memberships

-   id
-   workspace_id
-   user_id
-   role
-   created_at

Roles: - owner - admin - member

### clients

-   id
-   workspace_id
-   name
-   company
-   email
-   phone
-   website
-   status
-   source
-   notes
-   created_by
-   created_at
-   updated_at

### projects

-   id
-   workspace_id
-   client_id
-   name
-   description
-   status
-   priority
-   start_date
-   due_date
-   created_by
-   created_at
-   updated_at

### project_members

-   project_id
-   user_id

### deals

-   id
-   workspace_id
-   client_id
-   title
-   stage
-   value
-   expected_close_date
-   owner_id
-   created_at
-   updated_at

### tasks

-   id
-   workspace_id
-   project_id
-   client_id
-   title
-   description
-   status
-   priority
-   assignee_id
-   due_date
-   created_by
-   created_at
-   updated_at

### notes

-   id
-   workspace_id
-   client_id
-   project_id
-   deal_id
-   author_id
-   content
-   created_at
-   updated_at

### activities

-   id
-   workspace_id
-   actor_id
-   entity_type
-   entity_id
-   action
-   metadata
-   created_at

## 4. Relationships

``` text
User
 ├── Profile
 └── Membership
      └── Workspace
           ├── Clients
           │    ├── Projects
           │    ├── Deals
           │    └── Notes
           ├── Tasks
           ├── Activities
           └── Members
```

## 5. Multi-Tenancy

Every workspace-owned record must contain `workspace_id` where
appropriate.

Access flow:

``` text
Authenticated User
       ↓
Membership
       ↓
Workspace
       ↓
Workspace Data
```

Users must never access another workspace.

## 6. Authorization

### Owner

-   full workspace access
-   manage members
-   workspace settings

### Admin

-   manage clients
-   projects
-   deals
-   tasks
-   most workspace data

### Member

-   access permitted workspace data
-   manage assigned/allowed records
-   cannot manage membership

Enforce permissions server-side and through RLS.

## 7. Server/Client Boundary

Use Server Components for: - protected page data - dashboard - lists -
detail pages

Use Client Components for: - interactive forms - dialogs - dropdowns -
drag/drop if used - charts - local filters

Do not make entire pages client components without reason.

## 8. Mutations

Prefer Server Actions.

Example: - `createClient` - `updateClient` - `archiveClient` -
`createProject` - `updateProject` - `createDeal` - `moveDeal` -
`createTask` - `completeTask`

Every mutation: 1. authenticate 2. validate 3. determine workspace 4.
authorize 5. mutate 6. return safe result 7. revalidate affected UI

## 9. Dashboard

Metrics must be real: - total clients - active projects - open deals -
pending tasks - expected deal value

Do not hardcode numbers.

## 10. Validation

Use Zod for: - client - project - deal - task - workspace - profile
forms

Validate both at UI and server boundaries.

## 11. Error Handling

Use: - field validation errors - inline page errors - toast for action
feedback - not-found states - permission-denied states

Never expose raw database errors.

## 12. Performance

-   Server Components by default
-   pagination for large lists
-   indexed queries
-   optimized images
-   debounced search
-   avoid unnecessary refetching
-   selective client-side JavaScript

## 13. Deployment

Vercel: - Next.js application

Supabase: - PostgreSQL - Auth - RLS

Environment variables:

``` text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Never expose a service-role key in the browser.
