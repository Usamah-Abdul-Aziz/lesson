import { StyleSheet, View } from 'react-native';
import { Button, Card, IconButton, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import type { FieldErrors } from 'react-hook-form';
import type { ContentBlockForm, ModuleFormValues, WorkedExampleForm } from '@/schemas/module';

/**
 * Editor-array terkontrol untuk form modul (§5.1.2: "editor teks sederhana:
 * heading, list, gambar opsional, rumus LaTeX"). Memakai Controller (bukan
 * useFieldArray) agar typing array bersarang (langkah contoh soal) tetap
 * sederhana dan aman secara tipe.
 */

type ArrayErrors = FieldErrors<ModuleFormValues>;

const KIND_OPTIONS = [
  { value: 'paragraph', label: 'Paragraf', icon: 'format-paragraph' },
  { value: 'list', label: 'Daftar', icon: 'format-list-bulleted' },
  { value: 'example', label: 'Contoh', icon: 'lightbulb-outline' },
  { value: 'tip', label: 'Tips', icon: 'information-outline' },
] as const;

// ---------------------------------------------------------------------------
// Tujuan belajar (objectives)
// ---------------------------------------------------------------------------
export function ObjectivesEditor({
  value,
  onChange,
  errors,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  errors?: ArrayErrors['objectives'];
}) {
  const theme = useTheme();

  const update = (index: number, text: string) => {
    const next = [...value];
    next[index] = text;
    onChange(next);
  };
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, '']);

  return (
    <View style={styles.section}>
      <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
        Tujuan Belajar *
      </Text>
      {errors?.message ? <Text style={{ color: theme.colors.error }}>{errors.message}</Text> : null}
      {value.map((item, index) => (
        <View key={`obj-${index}`} style={styles.row}>
          <View style={styles.flex}>
            <TextInput
              value={item}
              onChangeText={(text) => update(index, text)}
              mode="outlined"
              placeholder={`Tujuan ${index + 1}`}
              error={errors?.[index]?.message !== undefined}
            />
            <FieldErrorMessage message={errors?.[index]?.message} />
          </View>
          <IconButton
            icon="close"
            onPress={() => remove(index)}
            disabled={value.length <= 1}
            accessibilityLabel="Hapus tujuan"
          />
        </View>
      ))}
      <Button icon="plus" mode="text" onPress={add} disabled={value.length >= 10}>
        Tambah tujuan
      </Button>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Blok konten (content_blocks)
// ---------------------------------------------------------------------------
export function ContentBlocksEditor({
  value,
  onChange,
  errors,
}: {
  value: ContentBlockForm[];
  onChange: (next: ContentBlockForm[]) => void;
  errors?: ArrayErrors['content_blocks'];
}) {
  const theme = useTheme();

  const update = (index: number, patch: Partial<ContentBlockForm>) => {
    const next = value.map((block, i) => (i === index ? { ...block, ...patch } : block));
    onChange(next);
  };
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, { kind: 'paragraph', heading: '', body: '' }]);

  return (
    <View style={styles.section}>
      <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
        Konten *
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
        Rumus matematika ditulis dengan LaTeX, mis. $2x + 3$. Gunakan $$...$$ untuk rumus terpusat.
      </Text>
      {errors?.message ? <Text style={{ color: theme.colors.error }}>{errors.message}</Text> : null}

      {value.map((block, index) => (
        <View key={`block-${index}`} style={styles.block}>
          <Card mode="outlined" style={styles.card}>
            <Card.Content>
              <View style={styles.blockHeader}>
                <Text variant="labelLarge">Blok {index + 1}</Text>
                <IconButton
                  icon="delete-outline"
                  onPress={() => remove(index)}
                  disabled={value.length <= 1}
                  accessibilityLabel="Hapus blok"
                  iconColor={theme.colors.error}
                />
              </View>
              <SegmentedButtons
                value={block.kind}
                onValueChange={(kind) => update(index, { kind: kind as ContentBlockForm['kind'] })}
                buttons={KIND_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                  icon: option.icon,
                }))}
                density="small"
                style={styles.fullWidth}
              />
              <TextInput
                label="Judul blok (opsional)"
                value={block.heading ?? ''}
                onChangeText={(heading) => update(index, { heading })}
                mode="outlined"
                style={styles.input}
                placeholder="mis. Suku sejenis"
              />
              <TextInput
                label="Isi blok"
                value={block.body}
                onChangeText={(body) => update(index, { body })}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                error={errors?.[index]?.body?.message !== undefined}
                placeholder="Tuliskan penjelasan… rumus LaTeX didukung, mis. $\\frac{1}{2}$"
              />
              <FieldErrorMessage message={errors?.[index]?.body?.message} />
            </Card.Content>
          </Card>
        </View>
      ))}
      <Button icon="plus" mode="text" onPress={add} disabled={value.length >= 30}>
        Tambah blok konten
      </Button>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Contoh soal + pembahasan (worked_examples)
// ---------------------------------------------------------------------------
export function WorkedExamplesEditor({
  value,
  onChange,
  errors,
}: {
  value: WorkedExampleForm[];
  onChange: (next: WorkedExampleForm[]) => void;
  errors?: ArrayErrors['worked_examples'];
}) {
  const theme = useTheme();

  const update = (index: number, patch: Partial<WorkedExampleForm>) => {
    const next = value.map((example, i) => (i === index ? { ...example, ...patch } : example));
    onChange(next);
  };
  const updateStep = (exampleIndex: number, stepIndex: number, text: string) => {
    const steps = [...value[exampleIndex].steps];
    steps[stepIndex] = text;
    update(exampleIndex, { steps });
  };
  const addStep = (exampleIndex: number) => {
    update(exampleIndex, { steps: [...value[exampleIndex].steps, ''] });
  };
  const removeStep = (exampleIndex: number, stepIndex: number) => {
    update(exampleIndex, {
      steps: value[exampleIndex].steps.filter((_, i) => i !== stepIndex),
    });
  };
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, { question: '', steps: [''], answer: '' }]);

  return (
    <View style={styles.section}>
      <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
        Contoh Soal + Pembahasan
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
        Opsional. Pembahasan langkah demi langkah akan ditampilkan kepada murid.
      </Text>
      {errors?.message ? <Text style={{ color: theme.colors.error }}>{errors.message}</Text> : null}

      {value.map((example, index) => {
        const exampleErrors = errors?.[index];
        return (
          <Card key={`example-${index}`} mode="outlined" style={styles.card}>
            <Card.Content>
              <View style={styles.blockHeader}>
                <Text variant="labelLarge">Contoh {index + 1}</Text>
                <IconButton
                  icon="delete-outline"
                  onPress={() => remove(index)}
                  accessibilityLabel="Hapus contoh"
                  iconColor={theme.colors.error}
                />
              </View>
              <TextInput
                label="Soal"
                value={example.question}
                onChangeText={(question) => update(index, { question })}
                mode="outlined"
                style={styles.input}
                multiline
                placeholder="mis. Sederhanakan $3x + 2x - 4$"
              />
              <FieldErrorMessage message={exampleErrors?.question?.message} />

              <Text variant="labelMedium" style={[styles.stepsLabel, { color: theme.colors.onSurfaceVariant }]}>
                Langkah pembahasan
              </Text>
              {example.steps.map((step, stepIndex) => (
                <View key={`step-${stepIndex}`} style={styles.row}>
                  <Text style={styles.stepNumber}>{stepIndex + 1}.</Text>
                  <TextInput
                    value={step}
                    onChangeText={(text) => updateStep(index, stepIndex, text)}
                    mode="outlined"
                    style={styles.flex}
                    placeholder={`Langkah ${stepIndex + 1}`}
                  />
                  <IconButton
                    icon="close"
                    onPress={() => removeStep(index, stepIndex)}
                    disabled={example.steps.length <= 1}
                    accessibilityLabel="Hapus langkah"
                  />
                </View>
              ))}
              <FieldErrorMessage message={exampleErrors?.steps?.message} />

              <Button icon="plus" mode="text" onPress={() => addStep(index)} disabled={example.steps.length >= 12}>
                Tambah langkah
              </Button>

              <TextInput
                label="Jawaban akhir"
                value={example.answer}
                onChangeText={(answer) => update(index, { answer })}
                mode="outlined"
                style={styles.input}
                placeholder="mis. $5x - 4$"
              />
              <FieldErrorMessage message={exampleErrors?.answer?.message} />
            </Card.Content>
          </Card>
        );
      })}
      <Button icon="plus" mode="text" onPress={add} disabled={value.length >= 10}>
        Tambah contoh soal
      </Button>
    </View>
  );
}

function FieldErrorMessage({ message }: { message?: string }) {
  const theme = useTheme();
  return message ? (
    <Text style={[styles.errorText, { color: theme.colors.error }]}>{message}</Text>
  ) : null;
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  card: { marginBottom: 12, backgroundColor: 'transparent' },
  block: { marginBottom: 8 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  fullWidth: { marginVertical: 8 },
  input: { marginTop: 8 },
  stepsLabel: { marginTop: 8, color: '#555' },
  stepNumber: { width: 24, textAlign: 'right', marginRight: 8 },
  errorText: { fontSize: 12, marginTop: 2, marginBottom: 2 },
});
