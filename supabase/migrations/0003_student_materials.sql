-- ============================================================================
-- 0003_student_materials.sql — Akses baca metadata materi untuk murid
--
-- Alasan: daftar modul murid dikelompokkan per mata pelajaran (§5.3), dan
-- nama pelajaran/materi hanya tersedia di tabel `materials`. Tanpa policy
-- ini murid tidak bisa melihat nama pelajaran dari modul yang ditugaskan.
--
-- Keamanan:
--  * Policy hanya membuka SELECT, dan hanya baris materi yang setidaknya
--    punya satu modul `published` yang ditugaskan ke murid tersebut —
--    sama dengan filter `student_can_access_module` (0002_rls.sql).
--  * Tabel `materials` TIDAK memuat kunci jawaban/pembahasan, jadi
--    membeberkannya tidak membocorkan jawaban ujian.
--  * Insert/Update/Delete tetap hanya untuk guru (materials_teacher_all).
--
-- Dijalankan SETELAH 0001_init.sql + 0002_rls.sql.
-- ============================================================================

create policy "materials_select_student_assigned"
  on public.materials for select to authenticated
  using (
    public.is_student()
    and exists (
      select 1
      from public.modules m
      join public.module_assignments a on a.module_id = m.id
      where m.material_id = materials.id
        and m.status = 'published'
        and a.student_id = auth.uid()
    )
  );
