import type { Metadata } from 'next';
import Link from 'next/link';
import { PolicyPage } from '../../components/legal/policy-page';
import { ContactLine } from '../../components/legal/contact-line';

export const metadata: Metadata = { title: 'Terms & Conditions', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return (
    <PolicyPage title="Terms & Conditions" updated="November 2026" current="/terms">
      <p>
        These terms apply when you use the ADSIGN Skill Academy website and learning platform ("the platform"), create an account,
        or buy a course. By registering or paying you agree to them.
      </p>
      <h2>1. Your account</h2>
      <ul>
        <li>One account per student. Your account is verified with your mobile number and is for your personal use only.</li>
        <li>Keep your password and one-time codes (OTPs) private. You are responsible for activity on your account.</li>
        <li>An account can stay signed in on one phone and one computer at a time, and play one video at a time.</li>
        <li>Your registered mobile number can be changed only through a request that the academy approves.</li>
      </ul>
      <h2>2. Courses and access</h2>
      <ul>
        <li>After a successful payment you get access to the course you bought for the access period shown on the course page.</li>
        <li>Lessons unlock in order. A module's test must be passed (normally 70%) to unlock the next module.</li>
        <li>Live class schedules may change; we will tell you in advance and share recordings where available.</li>
        <li>Certificates are issued after you complete all requirements of the course and can be verified online.</li>
      </ul>
      <h2>3. Fees and payments</h2>
      <ul>
        <li>Course fees are shown in Indian Rupees and include GST. A GST tax invoice is emailed after payment.</li>
        <li>Payments are processed by Razorpay. We never see or store your card or UPI details.</li>
        <li>Refunds follow our <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.</li>
      </ul>
      <h2>4. Content and fair use</h2>
      <ul>
        <li>All videos, materials and assessments belong to ADSIGN Skill Academy or its instructors and are licensed to you for personal learning only.</li>
        <li>Recording, downloading, sharing or reselling course content, or sharing your account, is not allowed. Videos carry a personal watermark.</li>
        <li>We may suspend an account that breaks these rules, without refund, after giving you a chance to explain.</li>
      </ul>
      <h2>5. Your submissions</h2>
      <p>
        You keep ownership of the assignments and projects you submit. You allow us to store and review them, and, with your
        permission, to show them as student work.
      </p>
      <h2>6. Liability</h2>
      <p>
        We work hard to keep the platform available and the content accurate, but we cannot guarantee uninterrupted service or
        specific job outcomes. Our total liability for any claim is limited to the fee you paid for the course concerned.
      </p>
      <h2>7. Changes and governing law</h2>
      <p>
        We may update these terms; the date above shows the latest version. These terms are governed by the laws of India, and
        courts at the academy's registered location have jurisdiction.
      </p>
      <ContactLine />
    </PolicyPage>
  );
}
