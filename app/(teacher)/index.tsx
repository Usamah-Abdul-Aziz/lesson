import { Card, Text, useTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuthStore } from '@/stores/auth';

/**
 * Fase 1: kerangka dashboard guru. Ringkasan progres & nilai menyusul di Fase 6.
 */
export default function TeacherDashboard() {
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);

  return (
    <ScreenContainer>
      <Card style={styles.card} elevation={1}>
        <Card.Title title={`Selamat datang, ${profile?.full_name ?? 'Guru'}!`} />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Fase 1 selesai: autentikasi & role aktif. Manajemen materi, modul, soal,
            serta dashboard analisis akan menyusul di fase berikutnya.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card} elevation={1}>
        <Card.Title title="Status Fase" subtitle="Progress implementasi" />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            ✓ Fase 1 — Fondasi (auth, role, DB + RLS, seed){'\n'}
            ○ Fase 2 — Materi & modul manual{'\n'}
            ○ Fase 3 — Pre/post-test{'\n'}
            ○ Fase 4 — Skoring IRT/katrol{'\n'}
            ○ Fase 5 — AI dari PDF{'\n'}
            ○ Fase 6 — Dashboard & build APK
          </Text>
        </Card.Content>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
});
