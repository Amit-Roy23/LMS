import { EditablePolicy, policyMetadata } from '../../components/legal/editable-policy';

export const revalidate = 60;

export function generateMetadata() {
  return policyMetadata('privacy', '/privacy', 'Privacy Policy');
}

export default function PrivacyPage() {
  return <EditablePolicy slug="privacy" path="/privacy" fallbackTitle="Privacy Policy" />;
}
