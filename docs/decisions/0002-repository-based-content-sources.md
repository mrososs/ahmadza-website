---
status: accepted
date: 2026-10-31
decision-makers: client brief and implementation team
consulted: not recorded
informed: future maintainers
---

# Repository-based content sources

## Context and Problem Statement

The public site must work before Supabase credentials or migrated content exist, while production content will ultimately live in Supabase.

## Considered Options

- A typed repository with local and Supabase adapters.
- Direct Supabase calls in every page.
- Local fixture imports that are replaced later.

## Decision Outcome

We will define one `ContentRepository` contract and select a Supabase or explicit demo implementation on the server.

### Consequences

- Good: routes, search, and SEO behave consistently across development and production.
- Good: demo provenance can be returned with every API response.
- Bad: adapter parity must be tested when fields evolve.
- Bad: repository mapping adds code between database rows and UI models.

### Confirmation

No route imports demo fixtures or the Supabase SDK. Revisit if multiple remote stores require query capabilities the contract cannot express without leaky abstractions.
