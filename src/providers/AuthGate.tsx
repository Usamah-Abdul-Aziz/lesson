import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

/**
 * Mendaftarkan listener sesi Supabase & memuat profil saat sesi berubah.
 * - Belum login         -> `(auth)/login`
 * - role teacher        -> `(teacher)`
 * - role student        -> `(student)`
 *
 * Catatan: penilaian & data kunci tidak pernah dibaca di client (§6 RLS).
 */
export function AuthGate() {
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setError = useAuthStore((s) => s.setError);
  const signOutLocal = useAuthStore((s) => s.signOutLocal);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!mounted) return;

      if (error || !data) {
        setError('Profil pengguna tidak ditemukan. Hubungi admin.');
        return;
      }

      if (!data.is_active) {
        await supabase.auth.signOut();
        setError('Akun Anda dinonaktifkan. Hubungi guru Anda.');
        return;
      }

      setProfile(data);
    };

    loadProfile();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        signOutLocal();
      } else {
        loadProfile();
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [setProfile, setError, signOutLocal]);

  if (loading && !profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return <Redirect href="/(auth)/login" />;
  }

  // Pemindahan sementara tanpa history agar tombol "back" tidak kembali ke login.
  if (profile.role === 'teacher') {
    return <Redirect href="/(teacher)" />;
  }

  return <Redirect href="/(student)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
