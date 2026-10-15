import { useQuery } from '@tanstack/react-query';

import type { Subject } from '@/types/database';
import { supabase } from '@/lib/supabase';

/** Daftar mata pelajaran — murid & guru boleh membaca (RLS subjects_read_all). */
export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}
