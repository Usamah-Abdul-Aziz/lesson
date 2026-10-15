import { z } from 'zod';

/**
 * Form soal (§5.1 & §5.4). Validasi berbeda per tipe soal, dipisah lewat
 * discriminated union berdasarkan `type`:
 *  - mcq: wajib opsi (minimal 2) + id opsi yang benar
 *  - true_false: opsi dirakit otomatis, jawaban boolean
 *  - short_answer: daftar jawaban yang diterima (dipisah koma)
 */
const baseQuestionFields = z.object({
  phase: z.enum(['pretest', 'posttest', 'example']),
  stem: z.string().trim().min(3, 'Tulis pertanyaan minimal 3 karakter').max(1000),
  explanation: z.string().trim().min(1, 'Pembahasan wajib diisi').max(2000),
  /** 1 (paling mudah) s.d. 5 (paling sulit) — input skoring IRT (§5.5). */
  estimated_difficulty: z.coerce.number().int().min(1).max(5),
  topic_tag: z.string().trim().max(60).optional().or(z.literal('')),
});

export const mcqQuestionSchema = baseQuestionFields.extend({
  type: z.literal('mcq'),
  options: z
    .array(z.object({ id: z.string(), text: z.string().trim().min(1, 'Opsi tidak boleh kosong').max(300) }))
    .min(2, 'Minimal 2 opsi')
    .max(6, 'Maksimal 6 opsi'),
  correct_answer: z.string().min(1, 'Pilih opsi yang benar'),
});

export const trueFalseQuestionSchema = baseQuestionFields.extend({
  type: z.literal('true_false'),
  correct_answer: z.boolean(),
});

export const shortAnswerQuestionSchema = baseQuestionFields.extend({
  type: z.literal('short_answer'),
  correct_answer: z
    .array(z.string().trim().min(1))
    .min(1, 'Isi minimal satu jawaban yang diterima')
    .max(8, 'Maksimal 8 bentuk jawaban'),
});

export const questionFormSchema = z.discriminatedUnion('type', [
  mcqQuestionSchema,
  trueFalseQuestionSchema,
  shortAnswerQuestionSchema,
]);

export type QuestionFormValues = z.infer<typeof questionFormSchema>;

const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

/** Susun `options` jsonb. true_false selalu diberi opsi tetap Benar/Salah. */
export function composeQuestionOptions(values: QuestionFormValues):
  | { id: string; text: string }[]
  | null
{
  if (values.type === 'mcq') return values.options;
  if (values.type === 'true_false') {
    return [
      { id: 't', text: 'Benar' },
      { id: 'f', text: 'Salah' },
    ];
  }
  return null;
}

/** ID opsi untuk mcq baru — panjangnya disesuaikan dengan jumlah opsi. */
export function newOptionIds(count: number): { id: string; text: string }[] {
  return Array.from({ length: Math.min(Math.max(count, 2), 6) }, (_, i) => ({
    id: OPTION_IDS[i] ?? `opt${i}`,
    text: '',
  }));
}

/** Susun `correct_answer` jsonb dari nilai form. */
export function composeCorrectAnswer(values: QuestionFormValues): unknown {
  if (values.type === 'mcq') return values.correct_answer;
  if (values.type === 'true_false') return values.correct_answer;
  return values.correct_answer;
}

export function emptyQuestionForm(phase: 'pretest' | 'posttest' = 'pretest'): QuestionFormValues {
  return {
    phase,
    type: 'mcq',
    stem: '',
    options: newOptionIds(4),
    correct_answer: '',
    explanation: '',
    estimated_difficulty: 2,
    topic_tag: '',
  };
}

/** Ubah baris soal dari DB menjadi nilai awal form. */
export function questionRowToFormValues(row: {
  phase: 'pretest' | 'posttest' | 'example';
  type: 'mcq' | 'true_false' | 'short_answer';
  stem: string;
  options: { id: string; text: string }[] | null;
  correct_answer: string | boolean | string[] | null;
  explanation: string | null;
  estimated_difficulty: number;
  topic_tag: string | null;
}): QuestionFormValues {
  const base = {
    phase: row.phase,
    stem: row.stem,
    explanation: row.explanation ?? '',
    estimated_difficulty: row.estimated_difficulty,
    topic_tag: row.topic_tag ?? '',
  };

  if (row.type === 'true_false') {
    return { ...base, type: 'true_false', correct_answer: row.correct_answer === true };
  }

  if (row.type === 'short_answer') {
    const answers = Array.isArray(row.correct_answer) ? row.correct_answer : [];
    return {
      ...base,
      type: 'short_answer',
      correct_answer: answers.length ? answers : [''],
    };
  }

  const options = row.options ?? newOptionIds(4);
  return {
    ...base,
    type: 'mcq',
    options,
    correct_answer: typeof row.correct_answer === 'string' ? row.correct_answer : '',
  };
}
