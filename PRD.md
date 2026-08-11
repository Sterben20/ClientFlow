# ClientFlow --- Product Requirements Document

## 1. Product

**ClientFlow** is a modern CRM and client-management SaaS for
freelancers, small agencies, and small service businesses.

Core journey:

**Lead → Client → Project → Task → Completed Work**

The product should feel like a real lightweight SaaS, not a portfolio
mockup.

## 2. Goals

-   Centralize client information.
-   Track projects and deals.
-   Manage tasks and deadlines.
-   Give users a useful business overview.
-   Demonstrate real full-stack engineering capability.

## 3. Target Users

### Primary

-   Freelancers
-   Small agencies
-   Consultants
-   Small service businesses

### Secondary

-   Small startup teams
-   Independent sales representatives

## 4. MVP Features

### Authentication

-   Sign up
-   Sign in
-   Sign out
-   Password reset
-   Protected routes

### Workspace

-   Create workspace
-   Workspace settings
-   Members
-   Roles: Owner, Admin, Member

### Dashboard

Display real database metrics: - Total clients - Active projects - Open
deals - Pending tasks - Expected deal value - Recent activity

### Clients

CRUD +: - Search - Filter - Archive - Detail page - Notes - Related
projects - Related deals - Activity timeline

Fields: - Name - Company - Email - Phone - Website - Status - Source -
Notes

Statuses: - Lead - Prospect - Active - Inactive

### Projects

CRUD +: - Client relation - Members - Status - Priority - Start date -
Due date - Description - Tasks - Activity

Statuses: - Planning - Active - On Hold - Completed - Cancelled

Priorities: - Low - Medium - High

### Deals

CRUD +: - Client relation - Owner - Value - Expected close date -
Pipeline stage

Stages: - Lead - Qualified - Proposal - Negotiation - Won - Lost

### Tasks

CRUD +: - Assignment - Due date - Priority - Status - Project/client
relation

Statuses: - Todo - In Progress - Done

### Notes & Activity

Notes can belong to clients, projects, or deals.

Track meaningful activity: - created - updated - status changed - task
completed - deal stage changed

## 5. Main Routes

Public: - `/` - `/login` - `/signup` - `/forgot-password` -
`/reset-password`

App: - `/dashboard` - `/clients` - `/clients/[id]` - `/projects` -
`/projects/[id]` - `/deals` - `/tasks` - `/settings/profile` -
`/settings/workspace` - `/settings/members`

## 6. UX Requirements

Every important screen must support: - loading state - empty state -
error state - success feedback - validation - responsive layout -
keyboard accessibility

No fake dashboard numbers.

## 7. Non-Goals for MVP

Do not build initially: - billing/subscriptions - invoicing - email
marketing - accounting - WhatsApp integration - calendar sync -
enterprise SSO - native mobile app - AI assistant

These belong in the future roadmap.

## 8. Success Criteria

A user can:

1.  Create an account.
2.  Create a workspace.
3.  Add clients.
4.  Create projects linked to clients.
5.  Manage a deal pipeline.
6.  Create and complete tasks.
7.  See real dashboard metrics.
8.  Search/filter records.
9.  Use the app on mobile.
10. Deploy the app successfully.

## 9. Portfolio Success

The project must visibly demonstrate: - authentication - authorization -
PostgreSQL relations - CRUD - dashboard analytics - responsive UI -
validation - production deployment - maintainable architecture
