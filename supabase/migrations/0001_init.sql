-- ============================================================================
-- 0001_init.sql — Skema inti Les App
-- Dijalankan di Supabase SQL Editor ATAU `supabase db push`.
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid(), crypt() untuk seed auth

-- ============================================================================
-- Helper: update updated_at otomatis
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles — 1 baris per auth.users
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null check (role in ('teacher','student')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- subjects — mata pelajaran
-- ============================================================================
create table if not exists public.subjects (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

-- ============================================================================
-- materials — materi buatan guru (manual / PDF)
-- ============================================================================
create table if not exists public.materials (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.subjects(id) on delete restrict,
  title         text not null,
  description   text,
  grade_level   text,
  source_type   text not null check (source_type in ('manual','pdf')),
  pdf_path      text,
  status        text not null default 'draft'
                check (status in ('draft','ai_processing','needs_review','published','archived')),
  created_by    uuid not null references public.profiles(id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists idx_materials_created_by on public.materials(created_by);
create index if not exists idx_materials_status     on public.materials(status) where deleted_at is null;
create index if not exists idx_materials_subject    on public.materials(subject_id) where deleted_at is null;

-- ============================================================================
-- modules — modul belajar (1 materi -> N modul)
-- ============================================================================
create table if not exists public.modules (
  id            uuid primary key default gen_random_uuid(),
  material_id   uuid not null references public.materials(id) on delete cascade,
  title         text not null,
  summary       text,
  objectives    jsonb not null default '[]'::jsonb,
  content       jsonb not null default '{}'::jsonb,   -- content_blocks + worked_examples
  order_index   int  not null default 0,
  status        text not null default 'draft'
                check (status in ('draft','ai_processing','needs_review','published','archived')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_modules_material  on public.modules(material_id);
create index if not exists idx_modules_published on public.modules(status) where status = 'published';

-- ============================================================================
-- questions — soal per modul (pretest / posttest / example)
-- ============================================================================
create table if not exists public.questions (
  id                  uuid primary key default gen_random_uuid(),
  module_id           uuid not null references public.modules(id) on delete cascade,
  phase               text not null check (phase in ('pretest','posttest','example')),
  type                text not null check (type in ('mcq','true_false','short_answer')),
  stem                text not null,
  options             jsonb,                    -- [{id,text}]
  correct_answer      jsonb,                    -- string | boolean | [string,...]
  explanation         text,
  estimated_difficulty int not null check (estimated_difficulty between 1 and 5),
  topic_tag           text,
  is_active           boolean not null default true,
  order_index         int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_questions_module on public.questions(module_id, phase);

-- ============================================================================
-- module_assignments — modul yang ditugaskan ke murid
-- ============================================================================
create table if not exists public.module_assignments (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.modules(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  unique (module_id, student_id)
);

create index if not exists idx_assignments_student on public.module_assignments(student_id);

-- ============================================================================
-- attempts — pengerjaan pre/post-test per murid per modul
-- ============================================================================
create table if not exists public.attempts (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules(id) on delete cascade,
  student_id       uuid not null references public.profiles(id) on delete cascade,
  phase            text not null check (phase in ('pretest','posttest')),
  status           text not null default 'in_progress' check (status in ('in_progress','submitted')),
  started_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  raw_score        numeric(6,2),
  weighted_score   numeric(6,2),
  weights_snapshot jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_attempts_student on public.attempts(student_id);
create index if not exists idx_attempts_module  on public.attempts(module_id, phase);
create unique index if not exists uq_attempts_module_student_phase
  on public.attempts(module_id, student_id, phase);

-- ============================================================================
-- attempt_answers — jawaban murid per soal
-- ============================================================================
create table if not exists public.attempt_answers (
  id           uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references public.attempts(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete restrict,
  answer       jsonb,
  is_correct   boolean,
  answered_at  timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists idx_answers_attempt on public.attempt_answers(attempt_id);
create index if not exists idx_answers_question on public.attempt_answers(question_id);

-- ============================================================================
-- question_stats — statistik butir soal (input skoring IRT/katrol)
-- ============================================================================
create table if not exists public.question_stats (
  question_id       uuid primary key references public.questions(id) on delete cascade,
  n_responses      int  not null default 0,
  n_correct        int  not null default 0,
  p_smooth         numeric(6,4),
  difficulty_b     numeric(6,4),
  weight           numeric(6,4),
  calibration_level int not null default 1 check (calibration_level in (1,2)),
  updated_at       timestamptz not null default now()
);

-- ============================================================================
-- scoring_config — parameter skoring (bisa diubah guru, default sesuai §5.5)
-- ============================================================================
create table if not exists public.scoring_config (
  id             int primary key default 1 check (id = 1),
  alpha          numeric not null default 0.5,
  w_min          numeric not null default 0.5,
  w_max          numeric not null default 2.0,
  smoothing_k    int     not null default 3,
  rasch_enabled  boolean not null default false
);

insert into public.scoring_config (id) values (1) on conflict do nothing;

-- ============================================================================
-- reading_progress — progres membaca modul (mengunci post-test sampai selesai)
-- ============================================================================
create table if not exists public.reading_progress (
  module_id    uuid not null references public.modules(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  percent      int  not null default 0 check (percent between 0 and 100),
  completed    boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (module_id, student_id)
);

-- ============================================================================
-- Triggers updated_at
-- ============================================================================
create trigger trg_materials_updated_at before update on public.materials
  for each row execute function public.set_updated_at();

create trigger trg_modules_updated_at before update on public.modules
  for each row execute function public.set_updated_at();

create trigger trg_questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

create trigger trg_attempts_updated_at before update on public.attempts
  for each row execute function public.set_updated_at();

create trigger trg_question_stats_updated_at before update on public.question_stats
  for each row execute function public.set_updated_at();

create trigger trg_reading_progress_updated_at before update on public.reading_progress
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Auto-create profile saat user baru mendaftar (role dari user_metadata)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')::text
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
