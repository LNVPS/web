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
- [ ] 4. Deploy form: parse compose `config:` (js-yaml), render typed inputs + DNS-safe `name` + region picker. **BLOCKED on region discovery (LNVPS/api#225).**
- [ ] 5. Activation: after order, route into the subscription payment flow to pay & activate.
- [ ] 6. Translations (all 10 locales) + build/lint pass; update this file.

Status: increments 1-3 done on `feat/app-deployments`. 4-5 blocked on #225.
