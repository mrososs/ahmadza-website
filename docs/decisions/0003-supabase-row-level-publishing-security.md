---
status: accepted
date: 2026-10-31
decision-makers: client brief and implementation team
consulted: not recorded
informed: future CMS implementers
---

# Supabase row-level publishing security

## Context and Problem Statement

Public users need anonymous read access to published content. Future administrators need controlled writes. Client-side route guards and hidden UI do not protect PostgreSQL rows.

## Considered Options

- PostgreSQL RLS for published reads and verified admin writes.
- Server secret key for all reads and writes.
- Application-only authorization without database policies.

## Decision Outcome

We will enable RLS on every exposed table, grant anonymous selection only for published rows, deny anonymous writes, and authorize mutations through active admin profiles tied to `auth.uid()`.

### Consequences

- Good: policy remains effective even if a browser calls Supabase directly with the publishable key.
- Good: the public application never needs a bypass key.
- Bad: policies and their indexes require migration-level maintenance and testing.
- Bad: editorial preview needs a separate authenticated policy in the CMS phase.

### Confirmation

Local policy tests must prove anonymous draft reads and all anonymous writes fail. Revisit when preview workflows or multiple editorial roles are designed.
