# Firebase Authentication and Role-Based Access

## Overview

Firebase Authentication provides Google sign-in. Appwrite remains the source of truth for agents, customers, products, and delivery records. New Firebase accounts do not receive application access automatically: the signed-in email must match an active Agent record or an Admin email allowlist.

The server creates an HttpOnly application session after verifying the Firebase ID token. Session activity is tracked in Appwrite and expires after 72 hours without an authenticated request.

## Roles

### Admin

- Admin emails come from `FIREBASE_ADMIN_EMAILS`, a comma-separated server environment variable.
- Admin can access existing management pages and APIs.
- Admin creates and updates Agents, including each Agent's approved Google email.
- Deactivating an Agent blocks future access. Delivery records remain unchanged.

### Agent

- Agent signs in with the Google account whose email Admin stored on that Agent record.
- Agent can access only the Agent delivery page and its dedicated API.
- Customer assignments are resolved from `customers.agent_id` on the server.
- Agent can submit today's deliveries only, for subscribed products assigned to their customers.
- A submitted delivery cannot be edited or resubmitted by an Agent. Admin retains correction access.
- The entire submission is validated before any row is written.

## Firebase Console setup

1. Enable Google under **Authentication → Sign-in method**.
2. Add development and production domains under **Authorized domains**.
3. Copy the Firebase Web app values into the `NEXT_PUBLIC_FIREBASE_*` variables in `.env.local`.
4. Create a Firebase service-account key for server-side ID-token verification. Store its project ID, client email, and private key in the server-only `FIREBASE_*` variables. Do not use `NEXT_PUBLIC_` for these values or commit the key file.
5. Add Admin Google emails to `FIREBASE_ADMIN_EMAILS`.
6. Generate a random secret of at least 32 characters for `AUTH_SESSION_SECRET`.

Never paste credentials into chat or source control. Rotate credentials previously shared in chat. `.env.local` is ignored by Git.

## Appwrite schema setup

In the configured Appwrite database:

1. Add a string attribute named `email` to `delivery_agents`. Add a unique index on `email`. Normalize existing values to lowercase and ensure no duplicates before creating the unique index.
2. Create collection `auth_sessions` with these required attributes:
   - `firebase_uid`: string, length 255
   - `email`: string, length 255
   - `agent_id`: string, length 36
   - `last_active_at`: datetime
3. Add an index on `auth_sessions.agent_id` so Agent deactivation can revoke all sessions promptly.
4. Keep `auth_sessions` private. Do not grant client-side Appwrite access; only the server API key should access it.
5. Ensure the server API key can read and write `delivery_agents`, `customers`, `products`, `daily_deliveries`, and `auth_sessions`.

Existing Agents must have their Google email added through **Delivery Agents → Edit Agent** before they can sign in. New Agent creation requires a Google email.

## Session and authorization behavior

- Firebase client signs in with Google and sends the ID token to `/api/auth/session`.
- Server verifies the token and checks the verified email against Admin configuration or an active Agent record.
- Server stores a random session ID and last-activity timestamp in Appwrite. Browser receives only a signed HttpOnly cookie.
- Proxy checks signed role claims for navigation only. Every API independently validates the signature, live session record, role, idle timeout, and current Agent status before data access.
- Authenticated API activity updates `last_active_at` and renews the 72-hour idle window.
- Agents are redirected to `/agent-deliveries`; other management pages and APIs reject Agent access.
- Agent delivery API derives Agent identity from the verified session. It does not trust a client-supplied Agent ID.
- Admin corrections continue through the existing Admin delivery APIs.
- Sign-out removes the current server session. Deactivation deletes all Agent sessions immediately.

## Validation before production

- Test Admin and Agent sign-in with approved Google accounts.
- Test that an unregistered Google account cannot access application pages or APIs.
- Test that Agent requests cannot access other management APIs or customer assignments.
- Test past/future delivery dates, duplicate submissions, invalid bulk rows, and post-submit edits.
- Test that a failed row validation writes no rows.
- Test idle expiry after 72 hours and access denial immediately after deactivation.
- Confirm Appwrite delivery history remains after Agent deactivation.
