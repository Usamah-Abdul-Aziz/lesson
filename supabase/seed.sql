-- ============================================================================
-- seed.sql — data contoh Les App (§11)
-- 1 guru, 9 murid dummy, 2 mata pelajaran, 2 modul (Matematika & B. Inggris)
-- lengkap dengan soal pretest/posttest.
--
-- JALANKAN SETELAH 0001_init.sql + 0002_rls.sql.
-- Password default semua akun: "password123" (ubah di produksi!).
-- ============================================================================

begin;

-- Helper lokal seed: buat user auth + profile sekaligus
create or replace function _seed_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Hapus user lama bila seed dijalankan ulang
  delete from auth.users where email = p_email;

  insert into auth.users (
    instance_id, aud, role, email,
    encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', p_full_name, 'role', p_role)
  )
  returning id into v_id;

  -- Trigger handle_new_user akan membuat profile; pastikan tetap ada.
  insert into public.profiles (id, full_name, role, is_active)
  values (v_id, p_full_name, p_role, true)
  on conflict (id) do update
    set full_name = excluded.full_name, role = excluded.role, is_active = true;

  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. Mata pelajaran
-- ----------------------------------------------------------------------------
insert into public.subjects (name) values
  ('Matematika'),
  ('Bahasa Inggris')
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Guru
-- ----------------------------------------------------------------------------
select _seed_user('guru@lesapp.test', 'password123', 'Bu Rina (Guru)', 'teacher');

-- ----------------------------------------------------------------------------
-- 3. 9 Murid
-- ----------------------------------------------------------------------------
select _seed_user('murid1@lesapp.test', 'password123', 'Andi Pratama',  'student');
select _seed_user('murid2@lesapp.test', 'password123', 'Bunga Lestari', 'student');
select _seed_user('murid3@lesapp.test', 'password123', 'Citra Dewi',    'student');
select _seed_user('murid4@lesapp.test', 'password123', 'Dodi Saputra',  'student');
select _seed_user('murid5@lesapp.test', 'password123', 'Eka Putri',     'student');
select _seed_user('murid6@lesapp.test', 'password123', 'Fajar Nugroho', 'student');
select _seed_user('murid7@lesapp.test', 'password123', 'Gita Maharani', 'student');
select _seed_user('murid8@lesapp.test', 'password123', 'Hadi Kurniawan','student');
select _seed_user('murid9@lesapp.test', 'password123', 'Indah Permata', 'student');

-- ----------------------------------------------------------------------------
-- 4. Materi + Modul #1 — MATEMATIKA: Aljabar Dasar
-- ----------------------------------------------------------------------------
with new_material as (
  insert into public.materials (subject_id, title, description, grade_level, source_type, status, created_by)
  select s.id, 'Aljabar Dasar', 'Modul pengantar aljabar: menyederhanakan bentuk aljabar dan persamaan linear.',
         'Kelas 7', 'manual', 'published', p.id
  from public.subjects s, public.profiles p
  where s.name = 'Matematika' and p.role = 'teacher'
  returning id
),
new_module as (
  insert into public.modules (material_id, title, summary, objectives, content, order_index, status, published_at)
  select id,
    'Menyederhanakan Bentuk Aljabar',
    'Belajar menyederhanakan suku-suku sejenis dan menyelesaikan persamaan linear sederhana.',
    jsonb_build_array(
      'Menyebutkan bagian bentuk aljabar',
      'Menyederhanakan suku sejenis',
      'Menyelesaikan persamaan linear satu variabel'
    ),
    jsonb_build_object(
      'content_blocks', jsonb_build_array(
        jsonb_build_object('kind','paragraph','heading','Apa itu bentuk aljabar?',
          'body','Bentuk aljabar adalah susunan bilangan dan variabel (huruf) yang dihubungkan operasi. Contoh: 2x + 3.'),
        jsonb_build_object('kind','paragraph','heading','Suku sejenis',
          'body','Suku sejenis memiliki variabel dan pangkat yang sama. 2x dan 5x adalah suku sejenis; 2x dan 2x^2 bukan.'),
        jsonb_build_object('kind','tip','heading','Tips',
          'body','Gabungkan hanya suku sejenis. Kerjakan tanda di depan tiap suku, jangan hilangkan.')
      ),
      'worked_examples', jsonb_build_array(
        jsonb_build_object('question','Sederhanakan 3x + 2x - 4.',
          'steps', jsonb_build_array('Gabungkan suku sejenis: (3 + 2)x = 5x.', 'Hasil: 5x - 4.'),
          'answer','5x - 4')
      )
    ),
    1, 'published', now()
  from new_material
  returning id
)
insert into public.questions (module_id, phase, type, stem, options, correct_answer, explanation, estimated_difficulty, topic_tag, order_index)
select m.id, t.phase, t.type, t.stem, t.options, t.correct_answer, t.explanation,
       t.estimated_difficulty, t.topic_tag, t.order_index
from new_module m
cross join (values
  -- PRETEST
  ('pretest','mcq','Manakah yang merupakan bentuk aljabar?',
    '[{"id":"a","text":"2x + 5"},{"id":"b","text":"7"},{"id":"c","text":"3 * 4"},{"id":"d","text":"12 - 5"}]'::jsonb,
    '"a"'::jsonb,'Bentuk aljabar memuat variabel (huruf). Hanya 2x + 5 memuat variabel x.',2,'bentuk-aljabar',1),
  ('pretest','mcq','Hasil dari 4x + 3x adalah ...',
    '[{"id":"a","text":"7x"},{"id":"b","text":"12x"},{"id":"c","text":"7"},{"id":"d","text":"x^7"}]'::jsonb,
    '"a"'::jsonb,'Suku seikat dijumlahkan koefisiennya: 4 + 3 = 7, variabel x tetap.',1,'suku-sejenis',2),
  ('pretest','short_answer','Jika x = 2, berapakah nilai 3x + 1?',
    null::jsonb, '["7"]'::jsonb,'3(2) + 1 = 6 + 1 = 7.',2,'persamaan',3),
  ('pretest','true_false','2x dan 2y adalah suku sejenis.',
    '[{"id":"t","text":"Benar"},{"id":"f","text":"Salah"}]'::jsonb,
    'false'::jsonb,'Variabelnya berbeda (x vs y), sehingga bukan suku sejenis.',3,'suku-sejenis',4),
  ('pretest','mcq','Solusi dari x + 5 = 12 adalah ...',
    '[{"id":"a","text":"x = 7"},{"id":"b","text":"x = 17"},{"id":"c","text":"x = 5"},{"id":"d","text":"x = 60"}]'::jsonb,
    '"a"'::jsonb,'x = 12 - 5 = 7.',2,'persamaan-linear',5),
  -- POSTTEST (setara, tidak identik)
  ('posttest','mcq','Manakah yang BUKAN bentuk aljabar?',
    '[{"id":"a","text":"5y - 2"},{"id":"b","text":"3a + 4"},{"id":"c","text":"8 + 2"},{"id":"d","text":"7z"}]'::jsonb,
    '"c"'::jsonb,'8 + 2 tidak memuat variabel, jadi bukan bentuk aljabar.',2,'bentuk-aljabar',1),
  ('posttest','mcq','Hasil dari 6x - 2x adalah ...',
    '[{"id":"a","text":"4x"},{"id":"b","text":"8x"},{"id":"c","text":"4"},{"id":"d","text":"x^4"}]'::jsonb,
    '"a"'::jsonb,'Koefisien dikurangi: 6 - 2 = 4, variabel x tetap.',1,'suku-sejenis',2),
  ('posttest','short_answer','Jika x = 3, berapakah nilai 2x + 5?',
    null::jsonb, '["11"]'::jsonb,'2(3) + 5 = 6 + 5 = 11.',2,'persamaan',3),
  ('posttest','true_false','3x^2 dan 5x adalah suku sejenis.',
    '[{"id":"t","text":"Benar"},{"id":"f","text":"Salah"}]'::jsonb,
    'false'::jsonb,'Pangkat x berbeda (2 vs 1), jadi bukan suku sejenis.',3,'suku-sejenis',4),
  ('posttest','mcq','Solusi dari x - 4 = 9 adalah ...',
    '[{"id":"a","text":"x = 5"},{"id":"b","text":"x = 13"},{"id":"c","text":"x = 9"},{"id":"d","text":"x = 36"}]'::jsonb,
    '"b"'::jsonb,'x = 9 + 4 = 13.',2,'persamaan-linear',5)
) as t(phase, type, stem, options, correct_answer, explanation, estimated_difficulty, topic_tag, order_index);

-- ----------------------------------------------------------------------------
-- 5. Materi + Modul #2 — BAHASA INGGRIS: Simple Present Tense
-- ----------------------------------------------------------------------------
with new_material as (
  insert into public.materials (subject_id, title, description, grade_level, source_type, status, created_by)
  select s.id, 'Simple Present Tense', 'Penggunaan simple present untuk kebiasaan dan fakta.',
         'Kelas 8', 'manual', 'published', p.id
  from public.subjects s, public.profiles p
  where s.name = 'Bahasa Inggris' and p.role = 'teacher'
  returning id
),
new_module as (
  insert into public.modules (material_id, title, summary, objectives, content, order_index, status, published_at)
  select id,
    'Simple Present: Habit & Fact',
    'Using the simple present tense to describe habits, routines, and general facts.',
    jsonb_build_array(
      'Form affirmative, negative, and interrogative sentences',
      'Add -s/-es for third person singular',
      'Use frequency adverbs correctly'
    ),
    jsonb_build_object(
      'content_blocks', jsonb_build_array(
        jsonb_build_object('kind','paragraph','heading','When do we use it?',
          'body','We use the simple present for habits, routines, and general truths, e.g. "She walks to school every day."'),
        jsonb_build_object('kind','paragraph','heading','Third person singular',
          'body','For he/she/it, add -s or -es to the verb: works, goes, watches.'),
        jsonb_build_object('kind','tip','heading','Tips',
          'body','Common frequency adverbs: always, usually, often, sometimes, never.')
      ),
      'worked_examples', jsonb_build_array(
        jsonb_build_object('question','Change to negative: "They play football."',
          'steps', jsonb_build_array('Use do/does + not.', 'They do not play football.'),
          'answer','They do not play football.')
      )
    ),
    1, 'published', now()
  from new_material
  returning id
)
insert into public.questions (module_id, phase, type, stem, options, correct_answer, explanation, estimated_difficulty, topic_tag, order_index)
select m.id, t.phase, t.type, t.stem, t.options, t.correct_answer, t.explanation,
       t.estimated_difficulty, t.topic_tag, t.order_index
from new_module m
cross join (values
  ('pretest','mcq','Choose the correct sentence:',
    '[{"id":"a","text":"She go to school by bus."},{"id":"b","text":"She goes to school by bus."},{"id":"c","text":"She going to school by bus."},{"id":"d","text":"She gone to school by bus."}]'::jsonb,
    '"b"'::jsonb,'Third person singular needs -es: she goes.',2,'grammar',1),
  ('pretest','mcq','The negative of "He likes coffee" is ...',
    '[{"id":"a","text":"He not likes coffee."},{"id":"b","text":"He does not like coffee."},{"id":"c","text":"He do not likes coffee."},{"id":"d","text":"He is not like coffee."}]'::jsonb,
    '"b"'::jsonb,'Use does + not + base verb: does not like.',2,'grammar',2),
  ('pretest','true_false','"Water boil at 100 degrees Celsius" is grammatically correct.',
    '[{"id":"t","text":"True"},{"id":"f","text":"False"}]'::jsonb,
    'false'::jsonb,'It should be "boils" — third person singular for facts.',3,'grammar',3),
  ('pretest','short_answer','Complete: "I usually ___ (wake) up at 6." (verb in correct form)',
    null::jsonb, '["wake"]'::jsonb,'Subject "I" uses the base form: wake.',1,'grammar',4),
  ('posttest','mcq','Choose the correct sentence:',
    '[{"id":"a","text":"My father work in a hospital."},{"id":"b","text":"My father works in a hospital."},{"id":"c","text":"My father working in a hospital."},{"id":"d","text":"My father worked in a hospital every day."}]'::jsonb,
    '"b"'::jsonb,'Third person singular adds -s: works.',2,'grammar',1),
  ('posttest','mcq','The negative of "They speak English" is ...',
    '[{"id":"a","text":"They does not speak English."},{"id":"b","text":"They do not speak English."},{"id":"c","text":"They not speak English."},{"id":"d","text":"They are not speak English."}]'::jsonb,
    '"b"'::jsonb,'Plural subject uses do + not + base verb.',2,'grammar',2),
  ('posttest','true_false','"The sun rises in the east" uses the simple present correctly.',
    '[{"id":"t","text":"True"},{"id":"f","text":"False"}]'::jsonb,
    'true'::jsonb,'General facts use the simple present: rises.',1,'grammar',3),
  ('posttest','short_answer','Complete: "She always ___ (read) before bed." (verb in correct form)',
    null::jsonb, '["reads"]'::jsonb,'Third person singular: reads.',2,'grammar',4)
) as t(phase, type, stem, options, correct_answer, explanation, estimated_difficulty, topic_tag, order_index)
where true;

-- ----------------------------------------------------------------------------
-- 6. Tugaskan kedua modul ke SEMUA murid
-- ----------------------------------------------------------------------------
insert into public.module_assignments (module_id, student_id)
select m.id, p.id
from public.modules m
cross join public.profiles p
where p.role = 'student' and p.is_active
on conflict (module_id, student_id) do nothing;

-- Bersihkan helper lokal
drop function _seed_user(text, text, text, text);

commit;

-- ============================================================================
-- Akun login (password: password123):
--   guru@lesapp.test          -> guru
--   murid1@lesapp.test .. murid9@lesapp.test -> murid
-- ============================================================================
