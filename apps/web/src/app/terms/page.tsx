import { EditablePolicy, policyMetadata } from '../../components/legal/editable-policy';

export const revalidate = 60;

export function generateMetadata() {
  return policyMetadata('terms', '/terms', 'Terms & Conditions');
}

export default function TermsPage() {
  return <EditablePolicy slug="terms" path="/terms" fallbackTitle="Terms & Conditions" />;
}
