import type { Metadata } from 'next';
import { PolicyPage } from '../../components/legal/policy-page';
import { ContactLine } from '../../components/legal/contact-line';

export const metadata: Metadata = { title: 'Privacy Policy', alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy" updated="November 2026" current="/privacy">
      <p>
        This policy explains what personal data ADSIGN Skill Academy collects, why, and the choices you have. We process personal
        data in line with India's Digital Personal Data Protection Act, 2023.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> name, email, mobile number, and the profile details you add (city, education).</li>
        <li><strong>Learning records:</strong> enrolments, lesson progress, quiz and exam results, assignments, certificates.</li>
        <li><strong>Payments:</strong> order and transaction references and billing details for your GST invoice. Card and UPI details are handled by Razorpay, not by us.</li>
        <li><strong>Security data:</strong> devices you sign in from, IP address and video viewing logs, used to protect your account and our content.</li>
        <li><strong>Enquiries:</strong> the details you send through our enquiry forms.</li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To run your account, deliver courses, track progress and issue certificates.</li>
        <li>To verify sign-ins with one-time codes and prevent account sharing and piracy.</li>
        <li>To process payments, issue invoices and meet tax and accounting obligations.</li>
        <li>To answer enquiries and send course updates. Marketing messages only with your consent; you can opt out any time.</li>
        <li>To measure and improve our website using analytics (Google Analytics, Meta Pixel) when enabled.</li>
      </ul>
      <h2>Who we share it with</h2>
      <p>
        Only with service providers that help us run the academy, under confidentiality: payment gateway (Razorpay), hosting and
        video delivery, SMS/WhatsApp/email providers, and analytics tools. Your instructors see the progress and submissions of
        their own students. We never sell your personal data.
      </p>
      <h2>How long we keep it</h2>
      <p>
        Account and learning records for as long as your account is active and up to 3 years after, so certificates stay verifiable.
        Payment and invoice records for the period required by Indian tax law (currently 8 years).
      </p>
      <h2>Your rights</h2>
      <ul>
        <li>Access, correct or update your personal data.</li>
        <li>Ask us to delete your account (we keep records we must keep by law).</li>
        <li>Withdraw consent for marketing messages.</li>
        <li>Raise a grievance with our team; we respond within 30 days.</li>
      </ul>
      <h2>Security</h2>
      <p>
        Passwords are stored encrypted, connections use HTTPS, sign-ins from new devices need an OTP, and sensitive admin actions
        need a PIN and OTP. Data is backed up daily.
      </p>
      <ContactLine />
    </PolicyPage>
  );
}
