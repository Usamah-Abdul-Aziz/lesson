import { AuthGate } from '@/providers/AuthGate';

/**
 * Layar pertama. AuthGate memutuskan tujuan routing berdasarkan sesi & role:
 * belum login -> /(auth)/login, teacher -> /(teacher), student -> /(student).
 */
export default function Index() {
  return <AuthGate />;
}
