---
status: accepted
date: 2026-10-31
decision-makers: client brief and implementation team
consulted: not recorded
informed: future maintainers
---

# Nuxt feature-oriented monolith

## Context and Problem Statement

The product needs SSR, public routes, server operations, future authenticated administration, and one maintainable deployment. The team and traffic profile are not yet recorded, so operational complexity must remain low.

## Considered Options

- One Nuxt application with feature-oriented boundaries.
- Separate frontend and API services.
- A microfrontend or monorepo platform.

## Decision Outcome

We will build one Nuxt 4 application using routes, feature components, typed repositories, and Nitro server endpoints.

### Consequences

- Good: SSR, routing, API code, SEO, and deployment share one coherent framework.
- Good: future CMS work can reuse domain contracts without introducing another service prematurely.
- Bad: module boundaries rely on repository conventions and review rather than process isolation.
- Bad: a future independent editorial team may eventually justify extracting services.

### Confirmation

Routes depend on server APIs and repository interfaces; pages do not import data adapters directly. Revisit if teams require independent deployments or a separately scaled ingestion pipeline.
