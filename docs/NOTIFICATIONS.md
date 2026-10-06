# Notification System & Template Approval Guide

This document catalogs all notification templates across channels (`EMAIL`, `WHATSAPP`, `SMS`) and specifies the exact pre-approval requirements for production WhatsApp Business (Meta Cloud API / Gupshup / Twilio) and SMS DLT registration (India regulations).

---

## 1. Multi-Channel Overview

The notification subsystem is pluggable and queue-driven (`BullMQ` with Redis or in-memory fallback).
Delivery channels are controlled by:
* `NOTIFY_CHANNELS_REGISTRATION` = `email,whatsapp,sms` (comma-separated active channels)
* `CREDENTIAL_DELIVERY` = `setup_link` (default, 72h single-use token) or `password` (direct temporary password)
* `NOTIFY_FALLBACK` = `true` (if WhatsApp fails, automatically falls back to SMS/Email)

---

## 2. Notification Templates Catalog

### Template 1: `registration_confirmation`
* **Trigger:** Dispatched immediately upon successful course payment.
* **Supported Locales:** `en` (English), `bn` (Bengali - client review pending).
* **Variables:** `studentName`, `courseTitle`, `deliveryMode`, `amount`, `currency`, `receiptUrl`, `batchName`, `paymentRef`.

#### WhatsApp Cloud API Template (Category: `UTILITY`)
* **Template Name in Meta Business Manager:** `oca_registration_confirmation`
* **Body Structure:**
  ```text
  🎉 *Admission Confirmed: {{1}}*

  Hello {{2}},
  Your payment of *{{3}} {{4}}* for *{{1}}* ({{5}} Mode) was successful!

  *Details:*
  • Batch: {{6}}
  • Payment Ref: {{7}}
  • Receipt: {{8}}

  Your login credentials have been sent. Welcome to Online Creative & IT Academy!
  ```
* **Parameter Mapping:**
  * `{{1}}` -> `courseTitle`
  * `{{2}}` -> `studentName`
  * `{{3}}` -> `amount`
  * `{{4}}` -> `currency`
  * `{{5}}` -> `deliveryMode`
  * `{{6}}` -> `batchName`
  * `{{7}}` -> `paymentRef`
  * `{{8}}` -> `receiptUrl`

#### SMS / DLT India Template
* **DLT Template ID:** `1107168294719283741`
* **DLT Header / Sender ID:** `OCACAD`
* **Content:**
  `Creative & IT Academy: Hi {#var#}, admission confirmed for {#var#} ({#var#}). Fee: {#var#} {#var#}. Receipt: {#var#}`

---

### Template 2: `account_credentials`
* **Trigger:** Dispatched when a student account is created.
* **Supported Locales:** `en`, `bn`.
* **Variables:** `studentName`, `studentId`, `loginUrl`, `tempPassword`, `setupUrl`, `supportEmail`.

#### WhatsApp Cloud API Template (Category: `AUTHENTICATION` / `UTILITY`)
* **Template Name in Meta Business Manager:** `oca_account_credentials`
* **Body Structure (Setup Link Mode):**
  ```text
  🔐 *Your Academy Student Credentials*

  Hello {{1}},
  Your Student LMS account has been created:

  • *Student ID:* {{2}}
  • *Login URL:* {{3}}
  • *Set Password Link:* {{4}}
  _(Link is valid for 72 hours)_

  Please set your password and log in to start learning. Welcome aboard!
  ```
* **Body Structure (Direct Password Mode):**
  ```text
  🔐 *Your Academy Student Credentials*

  Hello {{1}},
  Your Student LMS account has been created:

  • *Student ID:* {{2}}
  • *Login URL:* {{3}}
  • *Password:* {{4}}
  _(Please change password upon initial login)_

  Please log in and begin your enrolled course. Welcome aboard!
  ```
* **Parameter Mapping:**
  * `{{1}}` -> `studentName`
  * `{{2}}` -> `studentId`
  * `{{3}}` -> `loginUrl`
  * `{{4}}` -> `setupUrl` or `tempPassword`

#### SMS / DLT India Template
* **DLT Template ID:** `1107168294719283742`
* **DLT Header / Sender ID:** `OCACAD`
* **Content:**
  `Creative & IT Academy: Hello {#var#}, your Student ID is {#var#}. Login at {#var#} to set up password and access courses.`

---

### Template 3: `course_added`
* **Trigger:** Dispatched when an existing/returning student enrolls in an additional course.
* **Variables:** `studentName`, `studentId`, `courseTitle`, `deliveryMode`, `loginUrl`.

#### WhatsApp Cloud API Template (Category: `UTILITY`)
* **Template Name in Meta Business Manager:** `oca_course_added`
* **Body Structure:**
  ```text
  📚 *New Course Added to Your Account*

  Hello {{1}},
  *{{2}}* ({{3}} Mode) has been successfully activated on your student account (Student ID: {{4}}).

  Log in to access your new curriculum: {{5}}
  ```
* **Parameter Mapping:**
  * `{{1}}` -> `studentName`
  * `{{2}}` -> `courseTitle`
  * `{{3}}` -> `deliveryMode`
  * `{{4}}` -> `studentId`
  * `{{5}}` -> `loginUrl`

---

### Template 4: `password_reset`
* **Trigger:** Dispatched when a user submits a password reset request.
* **Variables:** `studentName`, `resetUrl`, `expiryHours`.

#### WhatsApp Cloud API Template (Category: `AUTHENTICATION`)
* **Template Name in Meta Business Manager:** `oca_password_reset`
* **Body Structure:**
  ```text
  🔑 *Password Reset Request*

  Hello {{1}},
  We received a request to reset your Creative & IT Academy password.

  Reset Link: {{2}}
  (This single-use link expires in {{3}} hours)

  If you did not request this, please disregard this message.
  ```

---

## 3. Client Action Checklist for WhatsApp & SMS Go-Live

1. **Meta WhatsApp Business Account (WABA):**
   - Register phone number on Meta Business Manager.
   - Submit the 4 utility templates above (`oca_registration_confirmation`, `oca_account_credentials`, `oca_course_added`, `oca_password_reset`).
   - Store `META_WA_PHONE_NUMBER_ID`, `META_WA_ACCESS_TOKEN`, and `META_WA_BUSINESS_ACCOUNT_ID` in production `.env`.

2. **India DLT Registration (for SMS):**
   - Register Entity and Header `OCACAD` on Vilpower / Jio / Airtel DLT portal.
   - Register Content Templates with matching sample variables.
   - Configure DLT Template IDs in `SmsChannel`.

3. **Bengali Localization Review:**
   - Review Bengali translations seeded in `apps/api/src/services/notification/template.engine.ts` for natural phrasing and cultural suitability.
