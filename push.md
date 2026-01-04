# Implementation Plan: Push Notifications for Feeding Plan

This document outlines the strategy for implementing push notifications to remind users about sourdough feeding schedules.

## Goal
Allow users to set reminders in the Feeding Plan and receive browser push notifications even when the application is closed.

## Architecture Overview
1.  **Frontend**: User opts-in to notifications. Browser generates a `PushSubscription`.
2.  **API**: Subscription is sent to `/api/notifications/subscribe` and stored in SQLite.
3.  **Database**: A new table `push_subscriptions` stores the endpoint and keys.
4.  **Backend Dispatcher**: A scheduled task checks for due reminders and uses the `web-push` library to send notifications.
5.  **Service Worker**: Receives the `push` event and displays a system notification.

## Implementation Steps

### 1. Infrastructure & Security [COMPLETED]
- Install `web-push` library: `npm install web-push`.
- Generate VAPID (Voluntary Application Server Identification) keys: `npx web-push generate-vapid-keys`.
- Store `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in environment variables.
- **Railway Setup**: Add these keys in the **Variables** tab of your service in the Railway dashboard.
- **Testing & Validation**: Verify that `web-push` is in `package.json` and that VAPID keys are correctly loaded (e.g., by logging `process.env.VAPID_PUBLIC_KEY` on server start).

### 2. Database Schema Update [COMPLETED]
Update `lib/db.ts` to include:
- `push_subscriptions` table: `id`, `endpoint`, `p256dh`, `auth`, `created_at`.
- `reminders` table: `id`, `subscription_id`, `scheduled_time`, `last_notified_at`. (Added `last_notified_at` to support the **Cooldown/Throttling** decision).
- **Testing & Validation**: Verify the tables exist and have the correct columns using a SQLite browser or by running a `SELECT` query in a temporary API route.

### 3. API Routes [COMPLETED]
- `POST /api/notifications/subscribe`: Save a new subscription.
- `POST /api/notifications/unsubscribe`: Remove a subscription.
- `POST /api/notifications/test`: (For development) Trigger a test notification.
- **Testing & Validation**: Use `fetch` in the browser console to POST a mock subscription to `/api/notifications/subscribe` and verify the row is inserted in the database.

### 4. Service Worker Enhancement [COMPLETED]
Update `public/sw.js` to handle:
- `push` event: Show `self.registration.showNotification()` with static messages (as per **Static Messages** decision).
- `notificationclick` event: Open the app or focus an existing tab.
- **Testing & Validation**: Use Chrome DevTools (Application > Service Workers) to trigger a mock "Push" event and verify the system notification appears.

### 5. Feeding Plan UI & Logic [COMPLETED]
- Implement the actual feeding plan calculator/scheduler in `pages/feedingplan.tsx`.
- Add a "Remind Me" toggle that requests browser permissions.
- Handle `Notification.requestPermission()` and subscription logic (strictly local to the browser as per **Browser-Only** decision).
- **Testing & Validation**: Click the toggle and verify the browser permission prompt appears. After allowing, check the Network tab to ensure the subscription was sent to the API.

### 6. Notification Dispatcher [IN PROGRESS]
- Implement a `setInterval` (e.g., every 5 minutes) in the server initialization logic (as per **Polling** decision).
- The dispatcher will:
    1. Query `reminders` due for notification.
    2. Check `last_notified_at` to enforce the **15-minute cooldown**.
    3. Send notifications via `web-push`.
    4. Update `last_notified_at` in the database.
- **Testing & Validation**: Manually insert a reminder in the past, wait for the polling interval, and verify the notification is sent. Test the cooldown by trying to trigger another one immediately.

## Decisions & Open Questions

1.  **Triggering Mechanism**
    - **Decision**: **Option A (Polling)**. We will start with a `setInterval` (e.g., every 5 minutes) on the server for simplicity.
    - **Future Upgrade**: **Option B (Cron Job)**. Migrate to a dedicated cron job if higher precision or reliability is needed.
    - **Other Options Considered**:
        - *Option C (Dynamic Scheduling)*: Using `setTimeout` for exact precision (rejected for complexity/persistence issues).

2.  **User Context & Persistence**
    - **Decision**: **Option A (Browser-Only)**. Subscriptions are strictly local to the browser/device.
    - **Reasoning**: Keeps implementation simple and avoids the need for an authentication system.
    - **Other Options Considered**:
        - *Option B (Anonymous Sync Code)*: Using a code to link devices (rejected for initial MVP).
        - *Option C (LocalStorage Backup)*: Using `localStorage` to help re-subscribe (kept as a potential minor enhancement).

3.  **Notification Content**
    - **Decision**: **Option A (Static Messages)**. We'll use a few hardcoded, friendly messages like "Time to feed your starter!".
    - **Future Upgrade**: **Option C (Fully Custom Messages)**. Allow users to type their own reminder text.
    - **Other Options Considered**:
        - *Option B (Context-Aware)*: Messages based on a "type" (e.g., "Feeding" vs "Baking").

4.  **Frequency & Rate Limiting**
    - **Decision**: **Option B (Cooldown/Throttling)**. We will ensure a minimum time gap between notifications for the same subscription (e.g., at most one every 15 minutes) to prevent accidental spamming.
    - **Future Upgrade**: **Option C (Batching)**. Combine multiple due reminders into a single notification.
    - **Other Options Considered**:
        - *Option A (No Limit)*: Trusting the user entirely (rejected to ensure better UX).

## Next Steps
- [x] Install `web-push` dependency.
- [x] Generate VAPID keys and add to Railway/`.env.local`.
- [x] Create the database migration for subscriptions.
- [x] Implement API routes for subscription management.
- [x] Update Service Worker for push events.
- [x] Build Feeding Plan UI and reminder logic.
- [ ] Setup background notification dispatcher.

