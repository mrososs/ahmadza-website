// What the access gate (server/middleware/site-access.ts) leaves on the request. Declared here, not next to the gate, so the
// app project can read `useRequestEvent()?.context.siteAccess` with the same types the server writes it with.
export {}

declare module 'h3' {
  interface H3EventContext {
    /** Set for this request only, and only after the database accepted the admin's preview token. */
    previewToken?: string
    siteAccess?: { mode: 'maintenance' | 'published'; preview: boolean }
  }
}
