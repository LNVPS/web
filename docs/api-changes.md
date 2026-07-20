# Implementing API changes

**Always start with the API changelog.** The backend is the source of truth for
what endpoints, request params and response fields exist. Do not guess shapes
from `src/api.ts` alone — it is a hand-maintained client and can lag behind the
server.

## Source of truth

- **Changelog:** [`../lnvps-api/API_CHANGELOG.md`](../../lnvps-api/API_CHANGELOG.md)
  (sibling checkout of the `lnvps-api` repo). Read the `[Unreleased]` section
  first, then work back through dated entries to find anything not yet reflected
  in the UI.
- **Reference docs:** `../lnvps-api/API_DOCUMENTATION.md` for full request/response
  detail on a given endpoint.
- The web app only consumes the **public/user API** (`/api/v1/...`). Ignore
  `/api/admin/v1/...` entries — those belong to `lnvps-admin`, not this repo.

## Workflow for an "implement the new API changes" task

1. **Read the changelog** (`API_CHANGELOG.md`), collecting every `/api/v1/...`
   change since the UI was last updated.
2. **Diff against the client** (`src/api.ts`): for each change, check whether the
   method / request param / response field already exists.
3. **Update `src/api.ts` first** — add or adjust the TypeScript
   interfaces and methods so the types match the server.
4. **Then wire the UI**, following `docs/code-style.md` and (for anything
   billing/lease/payment) `docs/billing-design-system.md`.
5. Add `<FormattedMessage>` copy for all new user-facing strings, then run
   `bun run locale:extract` and translate the new keys.
6. Verify with `docs/build-and-test.md`.

## Notes

- Fields are frequently added as read-only (`subscription_id`, `deleting_on`,
  `company_id`, `account_type`, `tax[]`, ...). Adding them to the interface and
  surfacing them is usually low-risk.
- Watch for **breaking** entries (e.g. `nwc_connection_string` removed from
  `/account`, `use_nwc` → `mode` on referral) — these require changing existing
  call sites, not just adding new ones.
