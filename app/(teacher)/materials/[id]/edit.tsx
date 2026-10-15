import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Snackbar, useTheme } from 'react-native-paper';

import { ScreenContainer } from '@/components/ScreenContainer';
import { MaterialForm } from '@/components/MaterialForm';
import { AsyncState } from '@/components/AsyncState';
import type { MaterialFormValues } from '@/schemas/material';
import { useMaterial, useUpdateMaterial } from '@/hooks/useMaterials';

export default function EditMaterialScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const materialQuery = useMaterial(id);
  const updateMaterial = useUpdateMaterial();
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleSubmit = (values: MaterialFormValues) => {
    updateMaterial.mutate(
      { ...values, id },
      {
        onSuccess: (material) => {
          setSnackbar('Perubahan disimpan.');
          router.replace({ pathname: '/(teacher)/materials/[id]', params: { id: material.id } });
        },
        onError: (error) => setSnackbar(error.message || 'Gagal menyimpan perubahan.'),
      },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Materi' }} />
      <ScreenContainer>
        <AsyncState
          loading={materialQuery.isPending}
          error={materialQuery.error}
          empty={!materialQuery.data}
          emptyTitle="Materi tidak ditemukan"
          onRetry={() => materialQuery.refetch()}
        >
          {materialQuery.data ? (
            <MaterialForm
              initial={{
                subject_id: materialQuery.data.subject_id,
                title: materialQuery.data.title,
                grade_level: materialQuery.data.grade_level ?? '',
                description: materialQuery.data.description ?? '',
              }}
              submitting={updateMaterial.isPending}
              submitLabel="Simpan perubahan"
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          ) : null}
        </AsyncState>
      </ScreenContainer>
      <Snackbar
        visible={snackbar !== null}
        onDismiss={() => setSnackbar(null)}
        duration={3000}
        theme={theme}>
        {snackbar ?? ''}
      </Snackbar>
    </>
  );
}
