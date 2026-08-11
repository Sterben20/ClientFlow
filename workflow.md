# ClientFlow --- Development Workflow

## Overall

``` text
Plan
→ Design System
→ Database
→ Authentication
→ Authorization
→ Core CRUD
→ Dashboard
→ UX States
→ Security
→ Testing
→ Performance
→ Deployment
→ Case Study
```

Do not build everything simultaneously.

## Phase 1 --- Plan

Define: - MVP - domains - routes - entities - permissions - dependencies

Output: - updated TODO - architecture decisions - database plan

## Phase 2 --- Design System

Build: - colors - typography - spacing - buttons - inputs - cards -
tables - dialogs - badges - sidebar - navigation

Establish this before creating many screens.

## Phase 3 --- Database

Implement:

``` text
profiles
workspaces
memberships
clients
projects
project_members
deals
tasks
notes
activities
```

Then: - foreign keys - indexes - constraints - RLS - seed data -
generated types

## Phase 4 --- Authentication

Implement:

``` text
Signup
→ Workspace Creation
→ Dashboard
```

Also: - login - logout - password reset - protected routes

Do not move to large feature development until auth is reliable.

## Phase 5 --- Authorization

Test workspace isolation.

Example:

``` text
User A → Workspace A → allowed
User B → Workspace A → denied
```

Test at database level through RLS.

## Phase 6 --- Clients

Build:

``` text
Client List
→ Create
→ Detail
→ Edit
→ Search
→ Filter
→ Archive
```

Then: - notes - activities - projects - deals

## Phase 7 --- Projects

Build:

``` text
Project List
→ Create
→ Detail
→ Edit
→ Status
→ Priority
→ Members
→ Tasks
```

## Phase 8 --- Deals

Build:

``` text
Deal List
→ Create
→ Pipeline
→ Change Stage
→ Detail
```

Pipeline:

``` text
Lead
→ Qualified
→ Proposal
→ Negotiation
→ Won / Lost
```

Drag-and-drop is optional. A stage selector is enough for MVP.

## Phase 9 --- Tasks

Build:

``` text
Task List
→ Create
→ Assign
→ Due Date
→ Status
→ Complete
```

## Phase 10 --- Dashboard

Build analytics only after real domain data exists.

Use:

``` text
Clients
Projects
Deals
Tasks
Activities
```

Never use fake chart data.

## Phase 11 --- UX States

For every major screen:

### Loading

Use skeletons.

### Empty

Explain the next action.

Example: "No clients yet" "Add your first client"

### Error

Explain and offer retry.

### Success

Use toast or confirmation.

### Destructive

Use confirmation dialog.

## Phase 12 --- Security Review

Check: - auth - RLS - workspace isolation - role permissions - server
validation - secret handling

Intentionally test unauthorized access.

## Phase 13 --- Responsive Review

Test: - 360px - 375px - 390px - 768px - 1024px - 1280px - 1440px

Focus on: - sidebar - tables - forms - dialogs - charts - detail pages

No horizontal overflow.

## Phase 14 --- Accessibility

Check: - keyboard navigation - focus - labels - contrast - headings -
buttons - dialogs - validation errors

## Phase 15 --- Performance

Check: - page load - image sizes - client JS - DB queries - unnecessary
requests - bundle size

## Phase 16 --- Production

Deploy:

Frontend: **Vercel**

Backend/Auth/Database: **Supabase**

Verify: - production auth - RLS - CRUD - forms - mobile - environment
variables

## Phase 17 --- Portfolio Case Study

Capture: 1. Dashboard 2. Client list 3. Client detail 4. Deal pipeline
5. Project detail 6. Task management 7. Mobile UI

Document:

``` text
Problem
→ Approach
→ Architecture
→ Features
→ Technical Decisions
→ Challenges
→ Solution
→ Outcome
```

## Definition of Done

-   [ ] Auth works
-   [ ] Workspace isolation works
-   [ ] RLS works
-   [ ] Clients work
-   [ ] Projects work
-   [ ] Deals work
-   [ ] Tasks work
-   [ ] Dashboard uses real data
-   [ ] Forms validate
-   [ ] Loading states exist
-   [ ] Empty states exist
-   [ ] Error states exist
-   [ ] Mobile works
-   [ ] Accessibility basics work
-   [ ] Production build succeeds
-   [ ] Deployment works
-   [ ] Case study is written

## Principle

Build ClientFlow as if a real client will use it.

A beautiful dashboard with fake functionality is not a successful
portfolio project.

The strongest result is:

``` text
Looks real
+
Works real
+
Uses real data
+
Has real authorization
+
Has thoughtful UX
+
Can be deployed
```
