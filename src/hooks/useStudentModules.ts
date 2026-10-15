import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Module, Subject } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

/**
 * Sisi MURID (§5.3): modul published + ditugaskan, dikelompokkan per mata
 * pelajaran. RLS tabel modules & materials memfilter otomatis — murid tidak
 * bisa melihat modul yang tidak ditugaskan (lihat 0002_rls.sql & 0003).
 */
export type StudentModuleRow = Module & {
  assigned_at: string;
  material_title: string;
  subject_id: string;
  subject_name: string;
};

export function useStudentModules() {
  const profile = useAuthStore((s) => s.profile);

  return useQuery<StudentModuleRow[]>({
    queryKey: ['student-modules', profile?.id],
    enabled: profile !== null,
    queryFn: async () => {
      const studentId = profile!.id;

      // 1. Daftar penugasan milik murid (RLS: hanya miliknya sendiri).
      const { data: assignments, error: assignmentError } = await supabase
        .from('module_assignments')
        .select('module_id, assigned_at')
        .eq('student_id', studentId);
      if (assignmentError) throw assignmentError;
      if (!assignments || assignments.length === 0) return [];

      const moduleIds = assignments.map((row) => row.module_id);

      // 2. Modul — RLS hanya mengembalikan yang published + ditugaskan.
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .in('id', moduleIds)
        .order('order_index', { ascending: true });
      if (modulesError) throw modulesError;
      if (!modules || modules.length === 0) return [];

      const materialIds = [...new Set(modules.map((m) => m.material_id))];

      // 3. Metadata materi (RLS 0003: hanya materi yang modulnya ditugaskan).
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select('id, subject_id, title')
        .in('id', materialIds);
      if (materialsError) throw materialsError;

      const subjects = await fetchSubjects();
      const subjectById = new Map(subjects.map((subject) => [subject.id, subject.name]));
      const materialById = new Map<MaterialSnippet['id'], MaterialSnippet>(
        (materials ?? []).map((materialRow) => [materialRow.id, materialRow] as const),
      );

      // 4. Gabungkan: modul + info materi + mata pelajaran.
      return modules
        .map((moduleRow) => {
          const assignment = assignments.find((row) => row.module_id === moduleRow.id);
          const materialRow = materialById.get(moduleRow.material_id);
          return {
            ...moduleRow,
            assigned_at: assignment?.assigned_at ?? '',
            material_title: materialRow?.title ?? 'Materi',
            subject_id: materialRow?.subject_id ?? '',
            subject_name: subjectById.get(materialRow?.subject_id ?? '') ?? 'Lainnya',
          };
        })
        .sort(sortBySubjectThenOrder);
    },
  });
}

async function fetchSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from('subjects').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

function sortBySubjectThenOrder(a: StudentModuleRow, b: StudentModuleRow): number {
  if (a.subject_name !== b.subject_name) return a.subject_name.localeCompare(b.subject_name);
  return a.order_index - b.order_index;
}

/** Tipe bentuk ringkas materi yang dibaca murid (RLS 0003). */
type MaterialSnippet = { id: string; subject_id: string; title: string };

/** Progres baca murid untuk daftar modul yang dimilikinya. */
export function useStudentReadingProgress() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery<Map<string, { percent: number; completed: boolean }>>({
    queryKey: ['student-reading-progress', profile?.id],
    enabled: profile !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('student_id', profile!.id);
      if (error) throw error;
      const map = new Map<string, { percent: number; completed: boolean }>();
      for (const row of data ?? []) {
        map.set(row.module_id, { percent: row.percent, completed: row.completed });
      }
      return map;
    },
  });
}

export function useMarkReadingComplete() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation<void, Error, { moduleId: string }>({
    mutationFn: async ({ moduleId }) => {
      if (!profile) throw new Error('Belum login.');
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          module_id: moduleId,
          student_id: profile.id,
          percent: 100,
          completed: true,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'student-reading-progress' });
    },
  });
}
