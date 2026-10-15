import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Module } from '@/types/database';
import type { ModuleFormValues } from '@/schemas/module';
import { composeModuleContent } from '@/schemas/module';
import { supabase } from '@/lib/supabase';

/**
 * Query & CRUD modul (guru) — §5.1/§5.3. Modul adalah unit belajar murid;
 * pre/post-test (Fase 3) dan penilaian Menempel di modul ini.
 */

export function useModulesByMaterial(materialId: string | undefined) {
  return useQuery<Module[]>({
    queryKey: ['materials', materialId, 'modules'],
    enabled: materialId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('material_id', materialId as string)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useModule(moduleId: string | undefined) {
  return useQuery<Module | null>({
    queryKey: ['modules', 'detail', moduleId],
    enabled: moduleId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useQuestionCountsForMaterial(materialId: string | undefined) {
  return useQuery<Record<string, { pretest: number; posttest: number; example: number }>>({
    queryKey: ['materials', materialId, 'module-question-counts'],
    enabled: materialId !== undefined,
    queryFn: async () => {
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id')
        .eq('material_id', materialId as string);
      if (modulesError) throw modulesError;
      if (!modules || modules.length === 0) return {};

      const moduleIds = modules.map((m) => m.id);
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('module_id, phase')
        .in('module_id', moduleIds);
      if (questionsError) throw questionsError;

      const counts: Record<string, { pretest: number; posttest: number; example: number }> = {};
      for (const row of questions ?? []) {
        const bucket = counts[row.module_id] ?? { pretest: 0, posttest: 0, example: 0 };
        bucket[row.phase] += 1;
        counts[row.module_id] = bucket;
      }
      return counts;
    },
  });
}

type SaveModuleInput = ModuleFormValues & { materialId: string; moduleId?: string };

export function useSaveModule() {
  const queryClient = useQueryClient();
  return useMutation<Module, Error, SaveModuleInput>({
    mutationFn: async (values) => {
      const payload = {
        title: values.title,
        summary: values.summary || null,
        objectives: values.objectives,
        content: composeModuleContent(values),
      };

      if (values.moduleId) {
        const { data, error } = await supabase
          .from('modules')
          .update(payload)
          .eq('id', values.moduleId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      // Modul baru: order_index = urutan terbesar + 1.
      const { data: existing, error: fetchError } = await supabase
        .from('modules')
        .select('order_index')
        .eq('material_id', values.materialId);
      if (fetchError) throw fetchError;
      const nextIndex = (existing?.reduce((max, m) => Math.max(max, m.order_index), 0) ?? 0) + 1;

      const { data, error } = await supabase
        .from('modules')
        .insert({ ...payload, material_id: values.materialId, order_index: nextIndex, status: 'draft' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (module) => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'materials' });
      queryClient.invalidateQueries({ queryKey: ['modules', 'detail', module.id] });
    },
  });
}

/** Publikasikan modul — murid yang ditugaskan langsung bisa melihatnya. */
export function usePublishModule() {
  const queryClient = useQueryClient();
  return useMutation<Module, Error, { moduleId: string }>({
    mutationFn: async ({ moduleId }) => {
      const { data, error } = await supabase
        .from('modules')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', moduleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (module) => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'materials' });
      queryClient.invalidateQueries({ queryKey: ['modules', 'detail', module.id] });
      queryClient.invalidateQueries({ queryKey: ['student-modules'] });
    },
  });
}

/** Tarik kembali ke draf (hanya jika belum ada murid yang mengerjakan — Fase 3). */
export function useUnpublishModule() {
  const queryClient = useQueryClient();
  return useMutation<Module, Error, { moduleId: string }>({
    mutationFn: async ({ moduleId }) => {
      const { data, error } = await supabase
        .from('modules')
        .update({ status: 'draft', published_at: null })
        .eq('id', moduleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (module) => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'materials' });
      queryClient.invalidateQueries({ queryKey: ['modules', 'detail', module.id] });
      queryClient.invalidateQueries({ queryKey: ['student-modules'] });
    },
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { materialId: string; moduleId: string }>({
    mutationFn: async ({ moduleId }) => {
      const { error } = await supabase.from('modules').delete().eq('id', moduleId);
      if (error) throw error;
    },
    onSuccess: (__, variables) => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'materials' });
      queryClient.invalidateQueries({ queryKey: ['student-modules'] });
      queryClient.removeQueries({ queryKey: ['modules', 'detail', variables.moduleId] });
    },  });
}
