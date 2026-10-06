# Domain Events Specification

This document details the event-driven architecture and domain event contracts for the Online Creative & IT Academy system.

---

## Architecture Overview

All asynchronous side effects (account provisioning, notification dispatch, seat reconciliation, analytics) are decoupled from primary HTTP write transactions using typed domain events.

```
Primary HTTP Request 
      │
      ▼
DB Transaction (e.g. Payment / Admission) ──[ Committed ]──► Event Bus (`eventBus.emit()`)
                                                                     │
                                    ┌────────────────────────────────┼──────────────────────────────┐
                                    ▼                                ▼                              ▼
                         Provisioning Subscriber          Notification Subscriber        Analytics Subscriber
                                    │                                │                              │
                        Idempotent Account Creation          BullMQ / Memory Queue             Metrics Log
```

---

## Domain Event Catalog

### 1. `payment.succeeded`
Emitted immediately after a payment record enters the `PAID` state and commits to the database.

* **Trigger:** Payment Gateway Webhook (`POST /api/v1/public/admissions/payment-webhook`), Verification Callback (`POST /api/v1/public/admissions/verify-payment`), or Admin Manual Verification.
* **Subscribers:**
  * `provisioning.service.ts`: Provisions student user account, generates race-safe `studentId`, creates `StudentProfile`, initializes `Enrollment` + `ModuleProgress`.
  * `notification.service.ts`: Enqueues `registration_confirmation` and `account_credentials` notifications.
* **Payload:**
```typescript
interface PaymentSucceededEvent {
  paymentId: string;
  registrationId: string;
  amount: number;
  currency: string;
  provider: PaymentProviderType;
  providerTransactionId: string;
  courseId: string;
  batchId?: string;
  deliveryMode: 'RECORDED' | 'LIVE';
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  whatsappNumber?: string;
  metadata?: Record<string, any>;
  occurredAt: Date;
}
```

---

### 2. `account.created`
Emitted after a new student `User` record and `StudentProfile` have committed to the database.

* **Trigger:** `provisioning.service.ts` during initial student onboarding.
* **Subscribers:**
  * `notification.service.ts`: Dispatches `account_credentials` notification containing either the single-use 72h password setup link or the temporary password (governed by `CREDENTIAL_DELIVERY`).
* **Payload:**
```typescript
interface AccountCreatedEvent {
  userId: string;
  studentId: string; // e.g. "OCA-2026-000024"
  email: string;
  phone: string;
  fullName: string;
  whatsappNumber?: string;
  isNewUser: true;
  temporaryPassword?: string; // In-memory only, NEVER logged or stored in plain text
  setupToken?: string;        // 72h single-use token (plain token in-memory only)
  setupUrl?: string;          // e.g. "http://localhost:3000/reset-password?token=..."
  deliveryModePreference?: 'password' | 'setup_link';
  occurredAt: Date;
}
```

---

### 3. `enrollment.created`
Emitted whenever an `Enrollment` is created for a user (both for brand-new students and returning students purchasing an additional course).

* **Trigger:** `provisioning.service.ts`
* **Subscribers:**
  * `notification.service.ts`: For returning students (`isNewUser: false`), dispatches the `course_added` notification so they know their existing login credentials grant access to the newly unlocked course.
* **Payload:**
```typescript
interface EnrollmentCreatedEvent {
  enrollmentId: string;
  userId: string;
  studentId: string;
  courseId: string;
  courseTitle: string;
  batchId?: string;
  batchName?: string;
  deliveryMode: 'RECORDED' | 'LIVE';
  isNewUser: boolean;
  studentEmail: string;
  studentPhone: string;
  whatsappNumber?: string;
  occurredAt: Date;
}
```

---

### 4. `password.reset_requested`
Emitted when a user requests a password reset link from `/forgot-password`.

* **Trigger:** `auth.service.ts` -> `forgotPassword()`
* **Subscribers:**
  * `notification.service.ts`: Queues `password_reset` email / SMS / WhatsApp with the single-use reset URL.
* **Payload:**
```typescript
interface PasswordResetRequestedEvent {
  userId: string;
  studentId?: string;
  email: string;
  phone?: string;
  whatsappNumber?: string;
  fullName: string;
  resetToken: string;
  resetUrl: string;
  occurredAt: Date;
}
```

---

## Idempotency Guarantees

1. **Transactional Boundaries:**
   Domain events are emitted strictly AFTER the parent database transaction commits.
2. **Deduplication:**
   Every event subscriber performs an initial state check (e.g. `Registration.status === 'ACCOUNT_CREATED'`) before executing side-effects.
3. **Queue Deduplication:**
   Notification queue jobs compute an `idempotencyKey = sha256(event + templateKey + channel + recipient)` and reject duplicate payloads within the sliding time window.
