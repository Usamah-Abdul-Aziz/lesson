import { Card, Text, useTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useAuthStore } from '@/stores/auth';

/**
 * Fase 1: kerangka beranda murid. Daftar modul & tes menyusul di Fase 2-3.
 */
export default function StudentHome() {
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);

  return (
    <ScreenContainer>
      <Card style={styles.card} elevation={1}>
        <Card.Title title={`Halo, ${profile?.full_name ?? 'Murid'}!`} />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Fase 1 selesai: login & role aktif. Modul belajar, pre-test, dan post-test
            akan tersedia setelah guru mempublikasikannya (Fase 2-3).
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card} elevation={1}>
        <Card.Title title="Cara Belajar" />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            1. Kerjakan pre-test untuk mengukur kemampuan awal.{'\n'}
            2. Pelajari modul hingga selesai.{'\n'}
            3. Kerjakan post-test.{'\n'}
            4. Lihat peningkatan skor kamu (post − pre).
          </Text>
        </Card.Content>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
});
