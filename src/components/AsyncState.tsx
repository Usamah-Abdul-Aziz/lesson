import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

type AsyncStateProps = {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  children?: ReactNode;
};

/**
 * State standar untuk semua layar daftar (§9 UX: loading/empty/error di semua
 * layar). Pola: tampilkan anaknya hanya jika data sudah ada dan tidak error.
 */
export function AsyncState({
  loading,
  error,
  empty,
  emptyTitle = 'Belum ada data',
  emptyMessage,
  onRetry,
  children,
}: AsyncStateProps) {
  const theme = useTheme();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>Memuat…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={{ color: theme.colors.error }}>
          Gagal memuat
        </Text>
        <Text style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
          {error.message || 'Terjadi kesalahan tak terduga.'}
        </Text>
        {onRetry ? <Button mode="text" onPress={onRetry}>Coba lagi</Button> : null}
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {emptyTitle}
        </Text>
        {emptyMessage ? (
          <Text style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
            {emptyMessage}
          </Text>
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { paddingVertical: 32, alignItems: 'center', gap: 8 },
  text: { textAlign: 'center', paddingHorizontal: 24 },
});
