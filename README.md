# ahmadza-web

Arabic-first personal publishing website and digital knowledge library built with Nuxt 4, Vue 3, strict TypeScript, Tailwind CSS 4, and a Supabase-ready data layer. The application runs without external credentials using clearly labeled local demo content.

## Requirements

- Node.js 22.22.3 or newer
- npm 10 or newer
- Docker only if you want to run the local Supabase stack

## Install and run

```bash
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:3000`. Without Supabase values, server responses include `source: "demo"` and use bundled fixtures. With Supabase values the site starts in maintenance (it shows «قريبًا بإذن الله») until the owner publishes it from `/admin/branding`; sign in at `/admin/login` and use «معاينة الموقع» to browse it first.

## Verification

```bash
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:e2e:maintenance   # coming-soon page (demo data, no Docker)
```

The real-Supabase suites (`test:e2e:publication`, `test:e2e:branding`) need a local stack; see `docs/LAUNCH.md`.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `NUXT_PUBLIC_SITE_URL` | Production | Canonical public origin, for example `https://prof-ahmadza.com` |
| `NUXT_SUPABASE_URL` | No | Server-side Supabase project URL; omit to use demo content |
| `NUXT_SUPABASE_PUBLISHABLE_KEY` | No | Publishable key governed by RLS; omit to use demo content |

Never add `sb_secret_*` or legacy `service_role` keys to public configuration.

## Supabase setup

```bash
npm install -D supabase
npx supabase start
npx supabase db reset
```

The migration disables public sign-up in local config, creates the content foundation, enables RLS everywhere, and allows anonymous reads only for published material. Add the first owner through a controlled server/admin operation after creating the Auth user; there is no open admin registration.

## Documentation

- [Product context](./PRODUCT.md)
- [Design system](./DESIGN.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Reference analysis](./docs/REFERENCE_ANALYSIS.md)
- [Implementation specification](./docs/IMPLEMENTATION_PLAN.md)
- [Private launch, settings and rollback](./docs/LAUNCH.md)
- [Architecture decisions](./docs/decisions/README.md)
- [Changelog](./CHANGELOG.md)

## Current limitations

The client biography, portrait, final wordmark, production content, PDFs, audio files, YouTube IDs, social links, and Supabase project are not yet supplied. The UI represents each absence honestly and does not invent client claims or media availability.
