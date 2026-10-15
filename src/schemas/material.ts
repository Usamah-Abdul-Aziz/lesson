import { z } from 'zod';

/**
 * Form materi manual (§5.1.1). Bidang `tags` belum ada kolomnya di skema
 * (§6) — sengaja tak ditambahkan agar skema tetap sesuai spesifikasi.
 */
export const materialFormSchema = z.object({
  subject_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  title: z.string().trim().min(3, 'Judul minimal 3 karakter').max(120, 'Judul maksimal 120 karakter'),
  grade_level: z.string().trim().max(30, 'Maksimal 30 karakter').optional().or(z.literal('')),
  description: z.string().trim().max(500, 'Maksimal 500 karakter').optional().or(z.literal('')),
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;

/** Nilai awal form materi kosong (dipakai di layar create). */
export const emptyMaterialForm: MaterialFormValues = {
  subject_id: '',
  title: '',
  grade_level: '',
  description: '',
};
