import { EditablePolicy, policyMetadata } from '../../components/legal/editable-policy';

export const revalidate = 60;

export function generateMetadata() {
  return policyMetadata('refund-policy', '/refund-policy', 'Refund & Cancellation Policy');
}

export default function RefundPolicyPage() {
  return <EditablePolicy slug="refund-policy" path="/refund-policy" fallbackTitle="Refund & Cancellation Policy" />;
}
