import Link from 'next/link';
import { ACADEMY } from './policy-page';

/** "Contact us" sentence used across the policies. */
export function ContactLine() {
  return (
    <p>
      Questions? Write to us through the <Link href="/contact">contact page</Link>
      {ACADEMY.email ? <> or at <a href={`mailto:${ACADEMY.email}`}>{ACADEMY.email}</a></> : null}
      {ACADEMY.phone ? <>, or call {ACADEMY.phone}</> : null}. We reply within 2 working days.
    </p>
  );
}
