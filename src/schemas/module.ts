import { z } from 'zod';

/** Bentuk blok konten (§5.1.2 / §5.3). Dipakai editor guru & pembaca murid. */
export const contentBlockSchema = z.object({
  kind: z.enum(['paragraph', 'list', 'example', 'tip']),
  heading: z.string().trim().max(120).optional().or(z.literal('')),
  body: z.string().trim().min(1, 'Isi blok tidak boleh kosong').max(4000, 'Maksimal 4000 karakter'),
});

export const workedExampleSchema = z.object({
  question: z.string().trim().min(1, 'Pertanyaan wajib diisi').max(1000),
  steps: z
    .array(z.string().trim().min(1, 'Langkah tidak boleh kosong').max(1000))
    .min(1, 'Minimal satu langkah pembahasan')
    .max(12, 'Maksimal 12 langkah'),
  answer: z.string().trim().min(1, 'Jawaban akhir wajib diisi').max(300),
});

/**
 * Form modul (§5.1). Konten disimpan sebagai satu jsonb `content`
 * (lihat types/database.ts Module.content), tapi form meratakan fieldnya
 * agar editor tetap sederhana untuk guru.
 */
export const moduleFormSchema = z.object({
  title: z.string().trim().min(3, 'Judul minimal 3 karakter').max(120, 'Judul maksimal 120 karakter'),
  summary: z.string().trim().max(500, 'Maksimal 500 karakter').optional().or(z.literal('')),
  objectives: z
    .array(z.string().trim().min(3, 'Tujuan minimal 3 karakter').max(200))
    .min(1, 'Minimal satu tujuan belajar')
    .max(10, 'Maksimal 10 tujuan'),
  content_blocks: z
    .array(contentBlockSchema)
    .min(1, 'Minimal satu blok konten')
    .max(30, 'Maksimal 30 blok'),
  worked_examples: z.array(workedExampleSchema).max(10, 'Maksimal 10 contoh soal'),
});

export type ModuleFormValues = z.infer<typeof moduleFormSchema>;
export type ContentBlockForm = z.infer<typeof contentBlockSchema>;
export type WorkedExampleForm = z.infer<typeof workedExampleSchema>;

export const emptyContentBlock: ContentBlockForm = { kind: 'paragraph', heading: '', body: '' };

export const emptyWorkedExample: WorkedExampleForm = {
  question: '',
  steps: [''],
  answer: '',
};

export function emptyModuleForm(): ModuleFormValues {
  return {
    title: '',
    summary: '',
    objectives: [''],
    content_blocks: [{ ...emptyContentBlock }],
    worked_examples: [],
  };
}

/** Susun jsonb `content` dari nilai form (untuk disimpan ke tabel modules). */
export function composeModuleContent(values: ModuleFormValues): {
  content_blocks: ContentBlockForm[];
  worked_examples: WorkedExampleForm[];
} {
  return {
    content_blocks: values.content_blocks.map((block) => ({
      kind: block.kind,
      heading: block.heading?.trim() || undefined,
      body: block.body,
    })),
    worked_examples: values.worked_examples,
  };
}

/** Ubah baris modul dari DB menjadi nilai awal form editor. */
export function moduleRowToFormValues(row: {
  title: string;
  summary: string | null;
  objectives: string[] | null;
  content: { content_blocks?: ContentBlockForm[]; worked_examples?: WorkedExampleForm[] } | null;
}): ModuleFormValues {
  return {
    title: row.title,
    summary: row.summary ?? '',
    objectives: row.objectives?.length ? row.objectives : [''],
    content_blocks:
      row.content?.content_blocks?.length ?
        row.content.content_blocks.map((b) => ({
          kind: b.kind ?? 'paragraph',
          heading: b.heading ?? '',
          body: b.body ?? '',
        }))
      : [{ ...emptyContentBlock }],
    worked_examples: row.content?.worked_examples ?? [],
  };
}
