import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Skala kecil: retry standar cukup, tidak perlu caching kompleks (§2).
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Kunci query terpusat agar tidak ada typo di seluruh aplikasi. */
export const queryKeys = {
  profile: ['profile'] as const,
  subjects: ['subjects'] as const,
  materials: ['materials'] as const,
  material: (id: string) => ['materials', id] as const,
  modules: ['modules'] as const,
  teacherModules: ['modules', 'teacher'] as const,
  studentModules: ['modules', 'student'] as const,
  module: (id: string) => ['modules', id] as const,
  questions: (moduleId: string) => ['questions', moduleId] as const,
  students: ['students'] as const,
  attempts: ['attempts'] as const,
  studentAttempts: ['attempts', 'student'] as const,
  attempt: (id: string) => ['attempts', id] as const,
  questionStats: ['question-stats'] as const,
  scoringConfig: ['scoring-config'] as const,
} satisfies Record<string, unknown>;
