import type { Metadata } from 'next';
import { PolicyPage } from '../../components/legal/policy-page';
import { ContactLine } from '../../components/legal/contact-line';

export const metadata: Metadata = { title: 'Refund & Cancellation Policy', alternates: { canonical: '/refund-policy' } };

export default function RefundPolicyPage() {
  return (
    <PolicyPage title="Refund & Cancellation Policy" updated="November 2026" current="/refund-policy">
      <p>We want you to be confident about your admission. This policy explains when a course fee can be refunded.</p>
      <h2>Recorded (self-paced) courses</h2>
      <ul>
        <li>Full refund if you ask within <strong>7 days of payment</strong> and have watched <strong>less than 20%</strong> of the course.</li>
        <li>No refund after 7 days, after 20% of the course has been watched, or once a certificate has been issued.</li>
      </ul>
      <h2>Live batches</h2>
      <ul>
        <li>Full refund if you cancel <strong>before the batch starts</strong>.</li>
        <li>After the first live class, you can move to a later batch once at no cost instead of a refund.</li>
        <li>If the academy cancels or reschedules a batch and the new date does not suit you, you get a full refund.</li>
      </ul>
      <h2>How to request a refund</h2>
      <ul>
        <li>Send your request through the contact page with your registered mobile number and invoice number.</li>
        <li>Approved refunds go back to the original payment method through Razorpay within 5–7 working days.</li>
        <li>Course access ends when a refund is processed. A credit note is issued against the GST invoice.</li>
      </ul>
      <h2>Failed or duplicate payments</h2>
      <p>
        If money was deducted but your enrolment did not complete, it is confirmed automatically or refunded in full, usually
        within 5–7 working days. Contact us with the payment reference if it takes longer.
      </p>
      <ContactLine />
    </PolicyPage>
  );
}
