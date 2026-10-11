-- ============================================================================
-- 0002_rls.sql — Row Level Security
-- Aturan (§6):
--   * Murid: hanya modul published yang DITUGASKAN padanya; hanya boleh
--     INSERT/UPDATE attempts & attempt_answers miliknya sendiri; TIDAK boleh
--     membaca correct_answer/explanation sebelum attempt submitted.
--   * Guru: akses penuh ke data miliknya.
-- ============================================================================

-- Aktifkan RLS di semua tabel
alter table public.profiles          enable row level security;
alter table public.subjects          enable row level security;
alter table public.materials         enable row level security;
alter table public.modules           enable row level security;
alter table public.questions         enable row level security;
alter table public.module_assignments enable row level security;
alter table public.attempts          enable row level security;
alter table public.attempt_answers   enable row level security;
alter table public.question_stats    enable row level security;
alter table public.scoring_config    enable row level security;
alter table public.reading_progress  enable row level security;

-- ============================================================================
-- Helper functions
-- ============================================================================
create or replace function public.is_teacher()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher' and p.is_active
  );
$$;

create or replace function public.is_student()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student' and p.is_active
  );
$$;

-- "Modul published DAN ditugaskan ke murid yang sedang login"
create or replace function public.student_can_access_module(p_module_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.modules m
    join public.module_assignments a on a.module_id = m.id
    where m.id = p_module_id
      and m.status = 'published'
      and a.student_id = auth.uid()
  );
$$;

-- ============================================================================
-- profiles
-- ============================================================================
create policy "profiles_select_own_or_teacher"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_teacher());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- Admin (guru) mengelola murid lewat Edge Function create-student (service role),
-- sehingga tidak perlu policy INSERT untuk client.

-- ============================================================================
-- subjects
-- ============================================================================
create policy "subjects_read_all"
  on public.subjects for select to authenticated
  using (true);

-- ============================================================================
-- materials — guru CRUD, murid tidak perlu akses
-- ============================================================================
create policy "materials_teacher_all"
  on public.materials for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ============================================================================
-- modules — guru semua akses; murid hanya published + ditugaskan
-- ============================================================================
create policy "modules_select_teacher"
  on public.modules for select to authenticated
  using (public.is_teacher());

create policy "modules_select_student_assigned"
  on public.modules for select to authenticated
  using (public.is_student() and public.student_can_access_module(id));

create policy "modules_write_teacher"
  on public.modules for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ============================================================================
-- questions
--   * Guru: akses penuh.
--   * Murid: TIDAK BOLEH mengakses tabel ini secara langsung. RLS Postgres
--     hanya membatasi BARIS, bukan KOLOM — jika murid punya policy SELECT di
--     tabel, mereka bisa membaca `correct_answer` & `explanation` langsung.
--     Murid hanya membaca melalui VIEW `student_questions` di bawah.
-- ============================================================================
create policy "questions_all_teacher"
  on public.questions for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ============================================================================
-- VIEW student_questions — soal TANPA kunci jawaban (untuk murid)
--   * Hanya kolom aman: stem, options, type, topic_tag (TANPA correct_answer
--     dan explanation).
--   * Dijalankan sebagai pemilik (security invoker = false) sehingga baris
--     sudah terfilter modul published + ditugaskan, terlepas dari RLS tabel.
--   * GRANT eksplisit dibutuhkan agar PostgREST mengekspos view ini.
-- ============================================================================
create or replace view public.student_questions as
select
  q.id,
  q.module_id,
  q.phase,
  q.type,
  q.stem,
  q.options,
  q.topic_tag,
  q.order_index
from public.questions q
where q.is_active
  and q.phase in ('pretest','posttest')
  and public.student_can_access_module(q.module_id);

grant select on public.student_questions to anon, authenticated;

-- ============================================================================
-- module_assignments
--   * Guru: full.
--   * Murid: boleh lihat assignment miliknya (agar tahu modul yang ditugaskan).
-- ============================================================================
create policy "assignments_all_teacher"
  on public.module_assignments for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

create policy "assignments_select_student_own"
  on public.module_assignments for select to authenticated
  using (public.is_student() and student_id = auth.uid());

-- ============================================================================
-- attempts — murid hanya miliknya, guru lihat semua
-- ============================================================================
create policy "attempts_select_student_own"
  on public.attempts for select to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy "attempts_select_teacher"
  on public.attempts for select to authenticated
  using (public.is_teacher());

create policy "attempts_insert_student_own"
  on public.attempts for insert to authenticated
  with check (public.is_student() and student_id = auth.uid());

create policy "attempts_update_student_own"
  on public.attempts for update to authenticated
  using (public.is_student() and student_id = auth.uid())
  with check (public.is_student() and student_id = auth.uid());

-- ============================================================================
-- attempt_answers — murid hanya jawaban miliknya
-- ============================================================================
create policy "answers_select_student_own"
  on public.attempt_answers for select to authenticated
  using (
    public.is_student()
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and a.student_id = auth.uid()
    )
  );

create policy "answers_select_teacher"
  on public.attempt_answers for select to authenticated
  using (public.is_teacher());

create policy "answers_insert_student_own"
  on public.attempt_answers for insert to authenticated
  with check (
    public.is_student()
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and a.student_id = auth.uid()
    )
  );

create policy "answers_update_student_own"
  on public.attempt_answers for update to authenticated
  using (
    public.is_student()
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_answers.attempt_id
        and a.student_id = auth.uid()
    )
  );

-- ============================================================================
-- question_stats — hanya guru (analisis butir soal)
-- ============================================================================
create policy "question_stats_teacher_all"
  on public.question_stats for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ============================================================================
-- scoring_config — guru baca/tulis, murid baca (transparansi bobot)
-- ============================================================================
create policy "scoring_config_select"
  on public.scoring_config for select to authenticated
  using (true);

create policy "scoring_config_write_teacher"
  on public.scoring_config for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ============================================================================
-- reading_progress — murid miliknya, guru semua
-- ============================================================================
create policy "progress_select_student_own"
  on public.reading_progress for select to authenticated
  using (public.is_student() and student_id = auth.uid());

create policy "progress_select_teacher"
  on public.reading_progress for select to authenticated
  using (public.is_teacher());

create policy "progress_upsert_student_own"
  on public.reading_progress for insert to authenticated
  with check (public.is_student() and student_id = auth.uid());

create policy "progress_update_student_own"
  on public.reading_progress for update to authenticated
  using (public.is_student() and student_id = auth.uid())
  with check (public.is_student() and student_id = auth.uid());
