import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Question } from '@/types/database';
import { composeCorrectAnswer, composeQuestionOptions, type QuestionFormValues } from '@/schemas/question';
import { supabase } from '@/lib/supabase';

/** Ambil soal sebuah modul, urut per order_index (§5.1). */
export function useQuestions(moduleId: string | undefined) {
  return useQuery<Question[]>({
    queryKey: ['modules', moduleId, 'questions'],
    enabled: moduleId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('module_id', moduleId as string)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useQuestion(moduleId: string | undefined, questionId: string | undefined) {
  return useQuery<Question | null>({
    queryKey: ['modules', moduleId, 'questions', questionId],
    enabled: moduleId !== undefined && questionId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

type SaveQuestionInput = {
  moduleId: string;
  questionId?: string;
  values: QuestionFormValues;
};

/**
 * Simpan soal (baru atau edit). Untuk mcq simpan juga `options` jsonb;
 * true_false memakai opsi tetap Benar/Salah (lihat composeQuestionOptions).
 */
export function useSaveQuestion() {
  const queryClient = useQueryClient();
  return useMutation<Question, Error, SaveQuestionInput>({
    mutationFn: async ({ moduleId, questionId, values }) => {
      const payload = {
        module_id: moduleId,
        phase: values.phase,
        type: values.type,
        stem: values.stem,
        options: composeQuestionOptions(values),
        correct_answer: composeCorrectAnswer(values),
        explanation: values.explanation,
        estimated_difficulty: values.estimated_difficulty,
        topic_tag: values.topic_tag || null,
        is_active: true,
      };

      if (questionId) {
        const { data, error } = await supabase
          .from('questions')
          .update(payload)
          .eq('id', questionId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data: existing, error: fetchError } = await supabase
        .from('questions')
        .select('order_index')
        .eq('module_id', moduleId);
      if (fetchError) throw fetchError;
      const nextIndex = (existing?.reduce((max, q) => Math.max(max, q.order_index), 0) ?? 0) + 1;

      const { data, error } = await supabase
        .from('questions')
        .insert({ ...payload, order_index: nextIndex })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (question) => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'modules' });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'materials' });
      if (question.module_id) {
        queryClient.invalidateQueries({ queryKey: ['modules', question.module_id, 'questions'] });
      }
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { moduleId: string; questionId: string }>({
    mutationFn: async ({ questionId }) => {
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: (__, variables) => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'modules' });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'materials' });
      queryClient.removeQueries({ queryKey: ['modules', variables.moduleId, 'questions', variables.questionId] });
    },
  });
}

/** Aktif/nonaktifkan soal tanpa menghapus (§10: soal yang sudah dijawab). */
export function useToggleQuestionActive() {
  const queryClient = useQueryClient();
  return useMutation<Question, Error, { moduleId: string; questionId: string; isActive: boolean }>({
    mutationFn: async ({ questionId, isActive }) => {
      const { data, error } = await supabase
        .from('questions')
        .update({ is_active: isActive })
        .eq('id', questionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (question) => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'modules' });
      if (question.module_id) {
        queryClient.invalidateQueries({ queryKey: ['modules', question.module_id, 'questions'] });
      }
    },
  });
}
