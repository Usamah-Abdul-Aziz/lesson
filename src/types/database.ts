// =============================================================================
// Tipe ini mencerminkan skema PostgreSQL di supabase/migrations/.
// Setiap kali skema berubah, perbarui file ini (dan jalankan `supabase gen types`
// jika sudah punya project Supabase aktif untuk verifikasi otomatis).
// =============================================================================

// -----------------------------------------------------------------------------
// CATATAN PENTING: semua "bentuk baris" di bawah dideklarasikan dengan `type`
// (alias objek), BUKAN `interface`.
//
// TypeScript hanya mensintesis *implicit index signature* untuk alias objek,
// tidak pernah untuk `interface`. Supabase-js mengecek
// `Database['public'] extends GenericSchema`, dan `GenericTable`/`GenericView`
// mensyaratkan `Row: Record<string, unknown>`. Jika `Row` berupa `interface`,
// cek assignability-nya GAGAL, `Schema` resolve ke `never`, dan
// `supabase.from(...).select(...).data` jadi bertipe `never` di seluruh app.
// -----------------------------------------------------------------------------

export type Role = 'teacher' | 'student';

export type MaterialStatus = 'draft' | 'ai_processing' | 'needs_review' | 'published' | 'archived';
export type SourceType = 'manual' | 'pdf';
export type ModuleStatus = MaterialStatus;
export type QuestionPhase = 'pretest' | 'posttest' | 'example';
export type QuestionType = 'mcq' | 'true_false' | 'short_answer';
export type AttemptPhase = 'pretest' | 'posttest';
export type AttemptStatus = 'in_progress' | 'submitted';

export type ContentBlock = {
  heading?: string;
  body?: string;
  /** Tipe blok: paragraf, daftar poin, contoh, atau tips. */
  kind?: 'paragraph' | 'list' | 'example' | 'tip';
};

export type WorkedExample = {
  question: string;
  /** Pembahasan langkah demi langkah. */
  steps: string[];
  answer: string;
};

export type QuestionOption = {
  id: string;
  text: string;
};

/** Jawaban benar: id opsi (mcq), boolean (true_false), atau string (short_answer). */
export type CorrectAnswer = string | boolean | string[];

// -----------------------------------------------------------------------------
// Tabel
// -----------------------------------------------------------------------------

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
};

export type Subject = {
  id: string;
  name: string;
};

export type Material = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  grade_level: string | null;
  source_type: SourceType;
  pdf_path: string | null;
  status: MaterialStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Module = {
  id: string;
  material_id: string;
  title: string;
  summary: string | null;
  objectives: string[] | null;
  /** content_blocks + worked_examples disimpan sebagai satu objek jsonb. */
  content: {
    content_blocks?: ContentBlock[];
    worked_examples?: WorkedExample[];
  } | null;
  order_index: number;
  status: ModuleStatus;
  published_at: string | null;
};

export type Question = {
  id: string;
  module_id: string;
  phase: QuestionPhase;
  type: QuestionType;
  stem: string;
  options: QuestionOption[] | null;
  correct_answer: CorrectAnswer | null;
  explanation: string | null;
  estimated_difficulty: number;
  topic_tag: string | null;
  is_active: boolean;
};

/**
 * Versi soal yang aman untuk murid — tanpa `correct_answer` & `explanation`.
 * Dipetakan dari view `student_questions` (lihat 0002_rls.sql).
 */
export type StudentQuestion = {
  id: string;
  module_id: string;
  phase: QuestionPhase;
  type: QuestionType;
  stem: string;
  options: QuestionOption[] | null;
  topic_tag: string | null;
  order_index: number | null;
};

export type ModuleAssignment = {
  id: string;
  module_id: string;
  student_id: string;
  assigned_at: string;
};

export type Attempt = {
  id: string;
  module_id: string;
  student_id: string;
  phase: AttemptPhase;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  raw_score: number | null;
  weighted_score: number | null;
  weights_snapshot: Record<string, number> | null;
};

export type AttemptAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: unknown;
  is_correct: boolean | null;
  answered_at: string;
};

export type QuestionStat = {
  question_id: string;
  n_responses: number;
  n_correct: number;
  p_smooth: number | null;
  difficulty_b: number | null;
  weight: number | null;
  calibration_level: number;
  updated_at: string;
};

export type ScoringConfig = {
  id: number;
  alpha: number;
  w_min: number;
  w_max: number;
  smoothing_k: number;
  rasch_enabled: boolean;
};

export type ReadingProgress = {
  module_id: string;
  student_id: string;
  percent: number;
  completed: boolean;
  updated_at: string;
};

// -----------------------------------------------------------------------------
// Database (untuk typing client Supabase)
// -----------------------------------------------------------------------------

/**
 * Tipe relationship standar Supabase. WAJIB dideklarasikan eksplisit seperti
 * ini (bukan `[]` literal): pada Views, literal array kosong `[]` di-infer
 * sebagai `never[]` yang membuat seluruh schema resolve ke `never` di
 * postgrest-js (gejala: `data` selalu bertipe `never`).
 *
 * `interface` aman di sini karena tipe ini hanya perlu assignable secara
 * struktural ke `GenericRelationship` — tidak butuh implicit index signature.
 */
export type SupabaseRelationship = {
  foreignKeyName: string;
  columns: string[];
  referencedRelation: string;
  referencedColumns: string[];
  isOneToOne?: boolean;
};

export type SupabaseRelationships = SupabaseRelationship[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: SupabaseRelationships;
      };
      subjects: {
        Row: Subject;
        Insert: Partial<Subject>;
        Update: Partial<Subject>;
        Relationships: SupabaseRelationships;
      };
      materials: {
        Row: Material;
        Insert: Partial<Material>;
        Update: Partial<Material>;
        Relationships: SupabaseRelationships;
      };
      modules: {
        Row: Module;
        Insert: Partial<Module>;
        Update: Partial<Module>;
        Relationships: SupabaseRelationships;
      };
      questions: {
        Row: Question;
        Insert: Partial<Question>;
        Update: Partial<Question>;
        Relationships: SupabaseRelationships;
      };
      module_assignments: {
        Row: ModuleAssignment;
        Insert: Partial<ModuleAssignment>;
        Update: Partial<ModuleAssignment>;
        Relationships: SupabaseRelationships;
      };
      attempts: {
        Row: Attempt;
        Insert: Partial<Attempt>;
        Update: Partial<Attempt>;
        Relationships: SupabaseRelationships;
      };
      attempt_answers: {
        Row: AttemptAnswer;
        Insert: Partial<AttemptAnswer>;
        Update: Partial<AttemptAnswer>;
        Relationships: SupabaseRelationships;
      };
      question_stats: {
        Row: QuestionStat;
        Insert: Partial<QuestionStat>;
        Update: Partial<QuestionStat>;
        Relationships: SupabaseRelationships;
      };
      scoring_config: {
        Row: ScoringConfig;
        Insert: Partial<ScoringConfig>;
        Update: Partial<ScoringConfig>;
        Relationships: SupabaseRelationships;
      };
      reading_progress: {
        Row: ReadingProgress;
        Insert: Partial<ReadingProgress>;
        Update: Partial<ReadingProgress>;
        Relationships: SupabaseRelationships;
      };
    };
    Views: {
      // View read-only: bentuk GenericNonUpdatableView (Row + Relationships,
      // tanpa Insert/Update). Menambah Insert/Update justru membuat tipe
      // resolve ke `never` (lihat GenericView di postgrest-js).
      student_questions: {
        Row: StudentQuestion;
        Relationships: SupabaseRelationships;
      };
    };
    // GenericFunction memerlukan Args & Returns.
    Functions: Record<string, { Args: Record<string, never>; Returns: unknown }>;
    Enums: Record<string, never>;
  };
};
