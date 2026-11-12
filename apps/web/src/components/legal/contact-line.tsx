import Link from 'next/link';

/** "Contact us" sentence used across the policies. Details come from the console's website settings. */
export function ContactLine({ email, phone }: { email?: string; phone?: string }) {
  return (
    <p>
      Questions? Write to us through the <Link href="/contact">contact page</Link>
      {email ? <> or at <a href={`mailto:${email}`}>{email}</a></> : null}
      {phone ? <>, or call {phone}</> : null}. We reply within 2 working days.
    </p>
  );
}
