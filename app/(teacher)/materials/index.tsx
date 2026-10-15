import { useMemo, useState } from 'react';
import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Card, FAB, IconButton, Menu, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { ScreenContainer } from '@/components/ScreenContainer';
import { AsyncState } from '@/components/AsyncState';
import { StatusChip } from '@/components/StatusChip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useMaterials, useDeleteMaterial, useSetMaterialStatus } from '@/hooks/useMaterials';
import { useSubjects } from '@/hooks/useSubjects';
import type { Material, MaterialStatus } from '@/types/database';
import { formatDate } from '@/utils/date';

type FilterValue = 'all' | MaterialStatus;

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  action: () => void;
} | null;

/**
 * Daftar materi milik guru (§5.1). Dari sini guru membuat materi manual,
 * mengubah status, mengarsipkan, dan menghapus (soft delete).
 */
export default function TeacherMaterialsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const materialsQuery = useMaterials(filter);
  const subjectsQuery = useSubjects();
  const setStatus = useSetMaterialStatus();
  const remove = useDeleteMaterial();

  const subjectName = useMemo(() => {
    return new Map((subjectsQuery.data ?? []).map((subject) => [subject.id, subject.name]));
  }, [subjectsQuery.data]);

  const pendingId = setStatus.variables?.id ?? remove.variables?.id ?? null;

  const openDetail = (material: Material) =>
    router.push({ pathname: '/(teacher)/materials/[id]', params: { id: material.id } });

  const handleEdit = (material: Material) =>
    router.push({ pathname: '/(teacher)/materials/[id]/edit', params: { id: material.id } });

  const askPublish = (material: Material) => {
    setConfirm({
      title: 'Publikasikan materi?',
      message:
        'Materi berstatus "published" menandai kesiapan materi. Tiap modul tetap harus dipublikasikan sendiri agar murid dapat melihatnya.',
      confirmLabel: 'Publikasikan',
      destructive: false,
      action: () => setStatus.mutate({ id: material.id, status: 'published' }),
    });
  };

  const askUnpublish = (material: Material) => {
    setConfirm({
      title: 'Kembalikan ke draf?',
      message: 'Materi dikembalikan ke status draf. Modul yang sudah dipublikasikan tidak terpengaruh.',
      confirmLabel: 'Jadikan draf',
      destructive: false,
      action: () => setStatus.mutate({ id: material.id, status: 'draft' }),
    });
  };

  const askArchive = (material: Material) => {
    setConfirm({
      title: 'Arsipkan materi?',
      message: `Materi "${material.title}" disembunyikan dari daftar aktif. Modul di dalamnya tidak lagi terlihat murid.`,
      confirmLabel: 'Arsipkan',
      destructive: true,
      action: () => setStatus.mutate({ id: material.id, status: 'archived' }),
    });
  };

  const askDelete = (material: Material) => {
    setConfirm({
      title: 'Hapus materi?',
      message:
        `Materi "${material.title}" dan seluruh modul di dalamnya disembunyikan ` +
        '(soft delete — data tetap tersimpan untuk keperluan riwayat, §10).',
      confirmLabel: 'Hapus',
      destructive: true,
      action: () => remove.mutate({ id: material.id }),
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Materi' }} />
      <ScreenContainer>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as FilterValue)}
          style={styles.filter}
          density="small"
          buttons={[
            { value: 'all', label: 'Semua' },
            { value: 'draft', label: 'Draf' },
            { value: 'published', label: 'Terbit' },
            { value: 'archived', label: 'Arsip' },
          ]}
        />

        <AsyncState
          loading={materialsQuery.isPending}
          error={materialsQuery.error}
          empty={materialsQuery.data?.length === 0}
          emptyTitle="Belum ada materi"
          emptyMessage="Tekan tombol + di bawah untuk membuat materi pertama Anda."
          onRetry={() => materialsQuery.refetch()}
        >
          {materialsQuery.data?.map((material) => {
            const subject = subjectName.get(material.subject_id) ?? '-';
            return (
              <Card key={material.id} style={styles.card} elevation={1} onPress={() => openDetail(material)}>
                <Card.Content>
                  <View style={styles.header}>
                    <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
                      {material.title}
                    </Text>
                    <Menu
                      visible={menuFor === material.id}
                      onDismiss={() => setMenuFor(null)}
                      anchorPosition="bottom"
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          onPress={() => setMenuFor(material.id)}
                          disabled={pendingId === material.id}
                          accessibilityLabel="Opsi materi"
                        />
                      }>
                      <Menu.Item
                        leadingIcon="pencil-outline"
                        title="Edit"
                        onPress={() => {
                          setMenuFor(null);
                          handleEdit(material);
                        }}
                      />
                      {material.status === 'draft' ? (
                        <Menu.Item
                          leadingIcon="cloud-upload-outline"
                          title="Publikasikan"
                          onPress={() => {
                            setMenuFor(null);
                            askPublish(material);
                          }}
                        />
                      ) : null}
                      {material.status === 'published' ? (
                        <Menu.Item
                          leadingIcon="file-edit-outline"
                          title="Jadikan draf"
                          onPress={() => {
                            setMenuFor(null);
                            askUnpublish(material);
                          }}
                        />
                      ) : null}
                      <Menu.Item
                        leadingIcon="archive-outline"
                        title="Arsipkan"
                        onPress={() => {
                          setMenuFor(null);
                          askArchive(material);
                        }}
                      />
                      <Menu.Item
                        leadingIcon="trash-can-outline"
                        title="Hapus"
                        onPress={() => {
                          setMenuFor(null);
                          askDelete(material);
                        }}
                      />
                    </Menu>
                  </View>
                  <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
                    {subject}
                    {material.grade_level ? ` • ${material.grade_level}` : ''}
                  </Text>
                  {material.description ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                      {material.description}
                    </Text>
                  ) : null}
                  <View style={styles.footer}>
                    <StatusChip status={material.status} />
                    <Text variant="labelSmall" style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
                      Diperbarui {formatDate(material.updated_at)}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </AsyncState>
      </ScreenContainer>

      <FAB icon="plus" label="Materi baru" onPress={() => router.push('/(teacher)/materials/create')} style={styles.fab} />
    </>
  );
}

const styles = StyleSheet.create({
  filter: { marginBottom: 12 },
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { flexShrink:1, paddingRight: 4 },
  meta: { marginTop: 2, marginBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
