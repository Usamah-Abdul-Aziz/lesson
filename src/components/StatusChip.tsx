import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import type { MaterialStatus, ModuleStatus } from '@/types/database';

type StatusStyle = { label: string; color: string };

const STATUS_MAP: Record<MaterialStatus, StatusStyle> = {
  draft: { label: 'Draf', color: '#8D93A0' },
  ai_processing: { label: 'Diproses AI', color: '#B26A00' },
  needs_review: { label: 'Perlu ditinjau', color: '#B26A00' },
  published: { label: 'Dipublikasikan', color: '#1E8E5A' },
  archived: { label: 'Diarsipkan', color: '#6E7688' },
};

type StatusChipProps = {
  status: ModuleStatus | MaterialStatus;
};

/** Label berwarna untuk status materi/modul (§5.1.4). */
export function StatusChip({ status }: StatusChipProps) {
  const theme = useTheme();
  const meta = STATUS_MAP[status];

  return (
    <View
      style={[
        styles.chip,
        { borderColor: meta.color, backgroundColor: hexWithAlpha(meta.color, theme.dark ? 0.22 : 0.1) },
      ]}>
      <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontWeight: '600' },
});

/** hex → rgba dengan alpha, untuk latar chip yang lembut di dua tema. */
function hexWithAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
