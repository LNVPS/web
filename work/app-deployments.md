# Managed Apps — customer ordering & lifecycle

Branch: `feat/app-deployments`. Backend: LNVPS/api PR #223 (ordering) shipped.

The read-only catalog + deployments UI is already committed (`58d5644`). This
file tracks the remaining ordering/lifecycle work as increments.

## API surface (customer)

- `POST /api/v1/app-deployments` `{ app_id, name, region_id, config }` → `AppDeployment` (pending) + a billing subscription. Pay the subscription to activate.
- `PATCH /api/v1/app-deployments/{id}/stop` | `/start` → `AppDeployment`
- `DELETE /api/v1/app-deployments/{id}` → `true` (stops billing + teardown)
- Deploy form is driven by the compose top-level `config:` list:
  `{ name, label?, type: string|int|bool|file, default?, required }`. Values submitted as `{ [name]: string }`.

## Open dependency

- **Region discovery**: `App` exposes no regions/clusters, so the client can't
  know valid `region_id`s. Filed backend issue — until resolved, the order form
  is blocked on a real region source (do NOT guess with VM regions).

## Increments

- [x] 1. Client methods: `createAppDeployment`, `startAppDeployment`, `stopAppDeployment`, `deleteAppDeployment` + `CreateAppDeploymentRequest` type.
- [x] 2. Lifecycle actions: Start/Stop (status-gated) + Delete with inline confirm.
- [x] 3. Deployment detail page (`/account/apps/deployments/:id`) with status, hostname, subscription link, 'Pay to activate' for pending, lifecycle actions. Deployment rows link to it.
- [x] 4. Deploy form: parse compose `config:` (js-yaml), typed inputs + DNS-safe `name` + region picker (`/apps/{id}/regions`, full regions shown-disabled). #225 shipped.
- [x] 5. Activation: order → navigate to deployment detail, which prompts 'Pay to activate' (subscription flow).
- [ ] 6. Translations (all 10 locales) + build/lint pass; update this file.

## Follow-up

- [x] Public catalog: catalog moved to the homepage (`AppsSection`, fetched in `homeLoader`), app detail is public at `/apps/:id` (deploy form guarded on login), deployments/manage stay under `/account`. **Depends on LNVPS/api#227** to drop auth on `GET /api/v1/apps` + `/apps/{id}` — until merged the homepage section stays empty (loader 401 → undefined, graceful).

Status: increments 1-5 done on `feat/app-deployments`.
