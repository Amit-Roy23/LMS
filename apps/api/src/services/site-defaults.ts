/**
 * Built-in wording for the editable website pages. Used when a page has never been
 * saved in the admin console, and by the seed to create version 1 of each page.
 * Format: simple Markdown (## headings, - lists, **bold**, [links](/path)).
 */
export const DEFAULT_PAGES: Record<string, { title: string; content: string }> = {
  terms: {
    title: 'Terms & Conditions',
    content: `These terms apply when you use the ADSIGN Skill Academy website and learning platform ("the platform"), create an account, or buy a course. By registering or paying you agree to them.

## 1. Your account
- One account per student. Your account is verified with your mobile number and is for your personal use only.
- Keep your password and one-time codes (OTPs) private. You are responsible for activity on your account.
- An account can stay signed in on one phone and one computer at a time, and play one video at a time.
- Your registered mobile number can be changed only through a request that the academy approves.

## 2. Courses and access
- After a successful payment you get access to the course you bought for the access period shown on the course page.
- Lessons unlock in order. A module's test must be passed (normally 70%) to unlock the next module.
- The mock test needs 80%, and assignments need at least 80% of the marks (or the pass mark shown for the course); below that you are asked to improve and resubmit.
- Live class schedules may change; we will tell you in advance and share recordings where available.
- Certificates are issued after you complete all requirements of the course and can be verified online.

## 3. Fees and payments
- Course fees are shown in Indian Rupees and include GST. A GST tax invoice is emailed after payment.
- Payments are processed by Razorpay. We never see or store your card or UPI details.
- Refunds follow our [Refund & Cancellation Policy](/refund-policy).

## 4. Content and fair use
- All videos, materials and assessments belong to ADSIGN Skill Academy or its instructors and are licensed to you for personal learning only.
- Recording, downloading, sharing or reselling course content, or sharing your account, is not allowed. Videos carry a personal watermark.
- We may suspend an account that breaks these rules, without refund, after giving you a chance to explain.

## 5. Your submissions
You keep ownership of the assignments and projects you submit. You allow us to store and review them, and, with your permission, to show them as student work.

## 6. Liability
We work hard to keep the platform available and the content accurate, but we cannot guarantee uninterrupted service or specific job outcomes. Our total liability for any claim is limited to the fee you paid for the course concerned.

## 7. Changes and governing law
We may update these terms; the date above shows the latest version. These terms are governed by the laws of India, and courts at the academy's registered location have jurisdiction.`,
  },
  privacy: {
    title: 'Privacy Policy',
    content: `This policy explains what personal data ADSIGN Skill Academy collects, why, and the choices you have. We process personal data in line with India's Digital Personal Data Protection Act, 2023.

## What we collect
- **Account details:** name, email, mobile number, and the profile details you add (city, education).
- **Learning records:** enrolments, lesson progress, quiz and exam results, assignments, certificates.
- **Payments:** order and transaction references and billing details for your GST invoice. Card and UPI details are handled by Razorpay, not by us.
- **Security data:** devices you sign in from, IP address and video viewing logs, used to protect your account and our content.
- **Enquiries:** the details you send through our enquiry forms.

## Why we use it
- To run your account, deliver courses, track progress and issue certificates.
- To verify sign-ins with one-time codes and prevent account sharing and piracy.
- To process payments, issue invoices and meet tax and accounting obligations.
- To answer enquiries and send course updates. Marketing messages only with your consent; you can opt out any time.
- To measure and improve our website using analytics (Google Analytics, Meta Pixel) when enabled.

## Who we share it with
Only with service providers that help us run the academy, under confidentiality: payment gateway (Razorpay), hosting and video delivery, SMS/WhatsApp/email providers, and analytics tools. Your instructors see the progress and submissions of their own students. We never sell your personal data.

## How long we keep it
Account and learning records for as long as your account is active and up to 3 years after, so certificates stay verifiable. Payment and invoice records for the period required by Indian tax law (currently 8 years).

## Your rights
- Access, correct or update your personal data.
- Ask us to delete your account (we keep records we must keep by law).
- Withdraw consent for marketing messages.
- Raise a grievance with our team; we respond within 30 days.

## Security
Passwords are stored encrypted, connections use HTTPS, sign-ins from new devices need an OTP, and sensitive admin actions need a PIN and OTP. Data is backed up daily.`,
  },
  'refund-policy': {
    title: 'Refund & Cancellation Policy',
    content: `We want you to be confident about your admission. This policy explains when a course fee can be refunded.

## Recorded (self-paced) courses
- Full refund if you ask within **7 days of payment** and have watched **less than 20%** of the course.
- No refund after 7 days, after 20% of the course has been watched, or once a certificate has been issued.

## Live batches
- Full refund if you cancel **before the batch starts**.
- After the first live class, you can move to a later batch once at no cost instead of a refund.
- If the academy cancels or reschedules a batch and the new date does not suit you, you get a full refund.

## How to request a refund
- Send your request through the [contact page](/contact) with your registered mobile number and invoice number.
- Approved refunds go back to the original payment method through Razorpay within 5–7 working days.
- Course access ends when a refund is processed. A credit note is issued against the GST invoice.

## Failed or duplicate payments
If money was deducted but your enrolment did not complete, it is confirmed automatically or refunded in full, usually within 5–7 working days. Contact us with the payment reference if it takes longer.`,
  },
  contact: {
    title: 'Talk to an advisor',
    content: `Questions about a course, batch timings, fees or EMI? Send us a message and we'll call or WhatsApp you back.

Every enquiry goes straight to our admissions team, who usually reply within one working day.`,
  },
};

export const PAGE_SLUGS = Object.keys(DEFAULT_PAGES);
