import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { StyleSheet } from 'react-native';

import { materialFormSchema, type MaterialFormValues } from '@/schemas/material';
import { SubjectSelect } from '@/components/SubjectSelect';

type MaterialFormProps = {
  initial: MaterialFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: MaterialFormValues) => void;
  /** Jika disediakan, tombol batal memanggilnya; jika tidak disembunyikan. */
  onCancel?: () => void;
};

/**
 * Form materi manual (§5.1.1): judul, mata pelajaran, jenjang, deskripsi.
 * Dipakai bersama oleh layar "materi baru" dan "edit materi" agar perilaku
 * validasinya identik (§13.2: tidak ada logika yang menyimpang).
 */
export function MaterialForm({ initial, submitting, submitLabel, onSubmit, onCancel }: MaterialFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: initial,
    mode: 'onBlur',
  });

  return (
    <>
      <Controller
        control={control}
        name="subject_id"
        render={({ field }) => (
          <SubjectSelect value={field.value} onChange={field.onChange} error={errors.subject_id?.message} />
        )}
      />

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextInput
            label="Judul materi *"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.title !== undefined}
            mode="outlined"
            style={styles.field}
            placeholder="mis. Aljabar Dasar"
          />
        )}
      />
      <FieldError message={errors.title?.message} />

      <Controller
        control={control}
        name="grade_level"
        render={({ field }) => (
          <TextInput
            label="Jenjang / Kelas"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            mode="outlined"
            style={styles.field}
            placeholder="mis. Kelas 7"
          />
        )}
      />
      <FieldError message={errors.grade_level?.message} />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextInput
            label="Deskripsi singkat"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            mode="outlined"
            style={styles.field}
            multiline
            numberOfLines={3}
            placeholder="Ringkasan materi untuk murid"
          />
        )}
      />
      <FieldError message={errors.description?.message} />

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
        disabled={submitting}
        style={styles.submit}>
        {submitLabel ?? 'Simpan materi'}
      </Button>
      {onCancel ? (
        <Button mode="text" onPress={onCancel} disabled={submitting} style={styles.cancel}>
          Batal
        </Button>
      ) : null}
    </>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <HelperText type="error">{message}</HelperText> : null;
}

const styles = StyleSheet.create({
  field: { marginBottom: 4 },
  submit: { marginTop: 8 },
  cancel: { marginTop: 4 },
});
