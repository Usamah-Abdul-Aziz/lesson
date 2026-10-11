/**
 * Setup Jest global.
 * Supabase client tidak boleh ter-import saat unit test murni (butuh env);
 * modul util skoring dirancang tanpa dependency Supabase sehingga aman.
 */
