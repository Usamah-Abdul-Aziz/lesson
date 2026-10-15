import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Profile } from '@/types/database';
import { supabase } from '@/lib/supabase';

export type StudentAssignmentState = {
  student: Profile;
  assigned: boolean;
};

/**
 * Pengelolaan penugasan modul ke murid (§4.1: "mengelola murid, atur akses
 * modul"). Hanya guru yang memanggil hook ini (RLS membatasi tulis ke guru).
 */
export function useModuleAssignments(moduleId: string | undefined) {
  return useQuery<StudentAssignmentState[]>({
    queryKey: ['modules', moduleId, 'assignments'],
    enabled: moduleId !== undefined,
    queryFn: async () => {
      const [studentsResult, assignmentsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'student').order('full_name', { ascending: true }),
        supabase.from('module_assignments').select('student_id').eq('module_id', moduleId as string),
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      const assignedIds = new Set((assignmentsResult.data ?? []).map((row) => row.student_id));
      return (studentsResult.data ?? []).map((student) => ({
        student,
        assigned: assignedIds.has(student.id),
      }));
    },
  });
}

export function useToggleAssignment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { moduleId: string; studentId: string; assign: boolean }>({
    mutationFn: async ({ moduleId, studentId, assign }) => {
      if (assign) {
        const { error } = await supabase
          .from('module_assignments')
          .insert({ module_id: moduleId, student_id: studentId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('module_assignments')
          .delete()
          .eq('module_id', moduleId)
          .eq('student_id', studentId);
        if (error) throw error;
      }
    },
    onSuccess: (__, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modules', variables.moduleId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['student-modules'] });
    },
  });
}
