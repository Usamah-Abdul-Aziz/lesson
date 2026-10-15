import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Material, MaterialStatus } from '@/types/database';
import type { MaterialFormValues } from '@/schemas/material';
import { supabase } from '@/lib/supabase';

/**
 * Query & CRUD materi (guru) — §5.1. Soft delete: `deleted_at` diisi, baris
 * tidak benar-benar dihapus agar riwayat tetap utuh (§10).
 */

function notDeleted() {
  return supabase.from('materials').select('*').is('deleted_at', null);
}

export function useMaterials(statusFilter: MaterialStatus | 'all' = 'all') {
  return useQuery<Material[]>({
    queryKey: ['materials', 'list', statusFilter],
    queryFn: async () => {
      let query = notDeleted().order('updated_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useMaterial(id: string | undefined) {
  return useQuery<Material | null>({
    queryKey: ['materials', 'detail', id],
    enabled: id !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id as string)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Invalidasi semua query turunan 'materials' (daftar & detail). */
function invalidateMaterials(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'materials' });
}

type CreateMaterialInput = MaterialFormValues & { created_by: string };

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation<Material, Error, CreateMaterialInput>({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('materials')
        .insert({
          subject_id: values.subject_id,
          title: values.title,
          description: values.description || null,
          grade_level: values.grade_level || null,
          source_type: 'manual', // input PDF baru di Fase 5
          status: 'draft',
          created_by: values.created_by,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateMaterials(queryClient),
  });
}

type UpdateMaterialInput = MaterialFormValues & { id: string };

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation<Material, Error, UpdateMaterialInput>({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('materials')
        .update({
          subject_id: values.subject_id,
          title: values.title,
          description: values.description || null,
          grade_level: values.grade_level || null,
        })
        .eq('id', values.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (material) => {
      invalidateMaterials(queryClient);
      queryClient.invalidateQueries({ queryKey: ['materials', 'detail', material.id] });
    },
  });
}

/** Ubah status materi (§5.1.4: draft → published → archived). */
export function useSetMaterialStatus() {
  const queryClient = useQueryClient();
  return useMutation<Material, Error, { id: string; status: MaterialStatus }>({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('materials')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (material) => {
      invalidateMaterials(queryClient);
      queryClient.invalidateQueries({ queryKey: ['materials', 'detail', material.id] });
      queryClient.invalidateQueries({ queryKey: ['student-modules'] });
    },
  });
}

/** Soft delete (isi deleted_at) + arsip. */
export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation<Material, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('materials')
        .update({ deleted_at: now, status: 'archived' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateMaterials(queryClient),
  });
}
