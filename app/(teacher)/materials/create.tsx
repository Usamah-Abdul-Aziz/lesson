import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Snackbar, useTheme } from 'react-native-paper';

import { ScreenContainer } from '@/components/ScreenContainer';
import { MaterialForm } from '@/components/MaterialForm';
import { emptyMaterialForm, type MaterialFormValues } from '@/schemas/material';
import { useCreateMaterial } from '@/hooks/useMaterials';
import { useAuthStore } from '@/stores/auth';

/**
 * Buat materi baru secara manual (§5.1.1). Materi PDF menyusul di Fase 5
 * (Edge Function process-material) — di fase 2 hanya input manual.
 */
export default function CreateMaterialScreen() {
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const createMaterial = useCreateMaterial();
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleSubmit = (values: MaterialFormValues) => {
    if (!profile) {
      setSnackbar('Sesi login habis. Silakan masuk lagi.');
      return;
    }
    createMaterial.mutate(
      { ...values, created_by: profile.id },
      {
        onSuccess: (material) => {
          setSnackbar('Materi dibuat.');
          router.replace({ pathname: '/(teacher)/materials/[id]', params: { id: material.id } });
        },
        onError: (error) => setSnackbar(error.message || 'Gagal menyimpan materi.'),
      },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Materi Baru' }} />
      <ScreenContainer>
        <MaterialForm
          initial={emptyMaterialForm}
          submitting={createMaterial.isPending}
          submitLabel="Buat materi"
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
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
