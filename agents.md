# ClientFlow --- Agent Instructions

## Mission

Build ClientFlow as a real production-quality SaaS and a strong
portfolio case study.

## Priority Order

1.  Security
2.  Correctness
3.  Data integrity
4.  Accessibility
5.  UX
6.  Performance
7.  Maintainability
8.  Visual polish

## Before Coding

Always inspect: - repository structure - package.json - current routes -
existing components - Supabase configuration - database/migrations -
design tokens

Reuse existing patterns.

## Feature Workflow

### 1. Understand

Identify: - user goal - affected domain - required data - permissions -
edge cases

### 2. Plan

Define: - UI - database changes - validation - server/client boundary -
authorization - loading/error states

### 3. Implement

Build the smallest complete solution.

### 4. Verify

Check: - functionality - permissions - mobile - accessibility - edge
cases - types

### 5. Refactor

Remove: - duplication - dead code - unnecessary state - unused imports

## Suggested Agent Responsibilities

### Product

Owns requirements, acceptance criteria, and scope.

### UI

Owns components, responsive behavior, accessibility, and visual
consistency.

### Backend

Owns database, server actions/API, validation, and business logic.

### Security

Owns authentication, authorization, RLS, secrets, and input validation.

### QA

Owns regression, edge cases, responsive testing, accessibility, and
build verification.

## Definition of Done

A feature is complete only when: - UI works - database works -
authorization works - validation works - loading state exists - empty
state exists - error state exists - mobile works - TypeScript passes -
lint passes - build passes

A beautiful but fake feature is not done.

## Scope Control

Do not silently add: - unrelated features - speculative integrations -
unnecessary dependencies - future roadmap features

Put out-of-scope ideas into TODO/backlog.

## Reporting

After work, report: - Implemented - Technical details - Verification -
Remaining limitations

Never hide incomplete work.
