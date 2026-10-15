import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Card, IconButton, Menu, Text, useTheme } from 'react-native-paper';

import { ScreenContainer } from '@/components/ScreenContainer';
import { AsyncState } from '@/components/AsyncState';
import { StatusChip } from '@/components/StatusChip';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useMaterial, useSetMaterialStatus, useDeleteMaterial } from '@/hooks/useMaterials';
import {
  useModulesByMaterial,
  useQuestionCountsForMaterial,
  usePublishModule,
  useUnpublishModule,
  useDeleteModule,
} from '@/hooks/useModules';
import { useSubjects } from '@/hooks/useSubjects';
import { formatDate } from '@/utils/date';

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  action: () => void;
} | null;

/**
 * Detail materi (guru): info materi + daftar modul di dalamnya (§5.1).
 * Modul adalah unit yang ditugaskan ke murid; soal hidup di dalam modul.
 */
export default function MaterialDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const materialQuery = useMaterial(id);
  const subjectsQuery = useSubjects();
  const modulesQuery = useModulesByMaterial(id);
  const countsQuery = useQuestionCountsForMaterial(id);
  const setMaterialStatus = useSetMaterialStatus();
  const publishModule = usePublishModule();
  const unpublishModule = useUnpublishModule();
  const deleteMaterial = useDeleteMaterial();
  const deleteModule = useDeleteModule();

  const subjectName =
    subjectsQuery.data?.find((subject) => subject.id === materialQuery.data?.subject_id)?.name ?? '-';

  const moduleRoute = (moduleId: string) =>
    router.push({
      pathname: '/(teacher)/materials/[id]/module/[moduleId]',
      params: { id, moduleId },
    });

  const handleEditMaterial = () =>
    router.push({ pathname: '/(teacher)/materials/[id]/edit', params: { id } });

  const askDeleteMaterial = () => {
    if (!materialQuery.data) return;
    setConfirm({
      title: 'Hapus materi?',
      message:
        `Materi "${materialQuery.data.title}" beserta seluruh modul & soal di dalamnya ` +
        'disembunyikan (soft delete). Riwayat murid tetap tersimpan (§10).',
      confirmLabel: 'Hapus materi',
      destructive: true,
      action: () => deleteMaterial.mutate({ id }),
    });
  };

  const askPublishModule = (moduleId: string, title: string) => {
    setConfirm({
      title: 'Publikasikan modul?',
      message:
        `Modul "${title}" langsung terlihat murid yang sudah ditugaskan. ` +
        'Pastikan soal pre-test & post-test sudah lengkap (alur tes ada di Fase 3).',
      confirmLabel: 'Publikasikan',
      destructive: false,
      action: () => publishModule.mutate({ moduleId }),
    });
  };

  const askUnpublishModule = (moduleId: string, title: string) => {
    setConfirm({
      title: 'Tarik kembali modul?',
      message:
        `Modul "${title}" kembali menjadi draf dan tidak terlihat murid. ` +
        'Penarikan aman selama belum ada murid yang menyelesaikan tes (Fase 3).',
      confirmLabel: 'Tarik kembali',
      destructive: true,
      action: () => unpublishModule.mutate({ moduleId }),
    });
  };

  const askDeleteModule = (moduleId: string, title: string) => {
    setConfirm({
      title: 'Hapus modul?',
      message:
        `Modul "${title}" beserta soal & penugasannya dihapus permanen. ` +
        'Nilai murid untuk modul ini juga terhapus (modul belum dikerjakan di Fase 2).',
      confirmLabel: 'Hapus modul',
      destructive: true,
      action: () => deleteModule.mutate({ materialId: id, moduleId }),
    });
  };

  const moduleCounts = countsQuery.data ?? {};

  return (
    <>
      <Stack.Screen options={{ title: materialQuery.data?.title ?? 'Detail Materi' }} />
      <ScreenContainer>
        <AsyncState
          loading={materialQuery.isPending}
          error={materialQuery.error}
          empty={!materialQuery.data}
          emptyTitle="Materi tidak ditemukan"
          onRetry={() => materialQuery.refetch()}
        >
          {materialQuery.data ? (
            <Card style={styles.card} elevation={1}>
              <Card.Content>
                <View style={styles.header}>
                  <View style={styles.headerText}>
                    <Text variant="headlineSmall">{materialQuery.data.title}</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {subjectName}
                      {materialQuery.data.grade_level ? ` • ${materialQuery.data.grade_level}` : ''}
                    </Text>
                  </View>
                  <StatusChip status={materialQuery.data.status} />
                </View>
                {materialQuery.data.description ? (
                  <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                    {materialQuery.data.description}
                  </Text>
                ) : null}
                <Text variant="labelSmall" style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
                  Dibuat {formatDate(materialQuery.data.created_at)} • Diperbarui{' '}
                  {formatDate(materialQuery.data.updated_at)}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button icon="pencil-outline" onPress={handleEditMaterial} mode="tonal">
                  Edit materi
                </Button>
                <Button
                  icon="trash-can-outline"
                  onPress={askDeleteMaterial}
                  textColor={theme.colors.error}
                >
                  Hapus
                </Button>
              </Card.Actions>
            </Card>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text variant="titleLarge">Modul</Text>
            <Button
              icon="plus"
              mode="contained"
              onPress={() =>
                router.push({
                  pathname: '/(teacher)/materials/[id]/module/[moduleId]',
                  params: { id, moduleId: 'new' },
                })
              }
            >
              Modul baru
            </Button>
          </View>

          <AsyncState
            loading={modulesQuery.isPending}
            error={modulesQuery.error}
            empty={modulesQuery.data?.length === 0}
            emptyTitle="Belum ada modul"
            emptyMessage="Buat modul pertama — modul memuat tujuan belajar, konten, contoh soal, dan pre/post-test."
            onRetry={() => modulesQuery.refetch()}
          >
            {modulesQuery.data?.map((moduleRow) => {
              const counts = moduleCounts[moduleRow.id] ?? { pretest: 0, posttest: 0, example: 0 };
              return (
                <Card key={moduleRow.id} style={styles.card} elevation={1} onPress={() => moduleRoute(moduleRow.id)}>
                  <Card.Content>
                    <View style={styles.header}>
                      <View style={styles.headerText}>
                        <Text variant="titleMedium" style={styles.title}>{moduleRow.title}</Text>
                        <StatusChip status={moduleRow.status} />
                      </View>
                      <Menu
                        visible={menuFor === moduleRow.id}
                        onDismiss={() => setMenuFor(null)}
                        anchorPosition="bottom"
                        anchor={
                          <IconButton
                            icon="dots-vertical"
                            onPress={() => setMenuFor(moduleRow.id)}
                            accessibilityLabel="Opsi modul"
                          />
                        }>
                        <Menu.Item
                          leadingIcon="format-list-bulleted"
                          title="Kelola soal"
                          onPress={() => {
                            setMenuFor(null);
                            router.push({
                              pathname: '/(teacher)/materials/[id]/module/[moduleId]/questions',
                              params: { id, moduleId: moduleRow.id },
                            });
                          }}
                        />
                        <Menu.Item
                          leadingIcon="account-multiple-outline"
                          title="Tugaskan ke murid"
                          onPress={() => {
                            setMenuFor(null);
                            router.push({
                              pathname: '/(teacher)/materials/[id]/module/[moduleId]/assign',
                              params: { id, moduleId: moduleRow.id },
                            });
                          }}
                        />
                        {moduleRow.status === 'draft' ? (
                          <Menu.Item
                            leadingIcon="cloud-upload-outline"
                            title="Publikasikan"
                            onPress={() => {
                              setMenuFor(null);
                              askPublishModule(moduleRow.id, moduleRow.title);
                            }}
                          />
                        ) : null}
                        {moduleRow.status === 'published' ? (
                          <Menu.Item
                            leadingIcon="file-edit-outline"
                            title="Tarik kembali"
                            onPress={() => {
                              setMenuFor(null);
                              askUnpublishModule(moduleRow.id, moduleRow.title);
                            }}
                          />
                        ) : null}
                        <Menu.Item
                          leadingIcon="trash-can-outline"
                          title="Hapus modul"
                          onPress={() => {
                            setMenuFor(null);
                            askDeleteModule(moduleRow.id, moduleRow.title);
                          }}
                        />
                      </Menu>
                    </View>
                    {moduleRow.summary ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                        {moduleRow.summary}
                      </Text>
                    ) : null}
                    <View style={styles.chipRow}>
                      <Counter label="Pre-test" count={counts.pretest} />
                      <Counter label="Post-test" count={counts.posttest} />
                      <Counter label="Contoh" count={counts.example} />
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </AsyncState>
        </AsyncState>
      </ScreenContainer>

      <ConfirmDialog
        visible={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel ?? 'Ya'}
        destructive={confirm?.destructive ?? false}
        loading={
          setMaterialStatus.isPending ||
          deleteMaterial.isPending ||
          publishModule.isPending ||
          unpublishModule.isPending ||
          deleteModule.isPending
        }
        onConfirm={() => {
          confirm?.action();
          setConfirm(null);
        }}
        onDismiss={() => setConfirm(null)}
      />
    </>
  );
}

function Counter({ label, count }: { label: string; count: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.counter,
        {
          borderColor: theme.colors.outline,
          backgroundColor: count === 0 ? 'transparent' : theme.colors.primaryContainer,
        },
      ]}>
      <Text style={[styles.counterText, { color: count === 0 ? theme.colors.onSurfaceVariant : theme.colors.onPrimaryContainer }]}>
        {label}: {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerText: { flexShrink: 1, gap: 4 },
  title: { flexShrink: 1 },
  meta: { marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  counter: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  counterText: { fontSize: 12, fontWeight: '600' },
});
