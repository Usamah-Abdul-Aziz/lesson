import { Stack, useRouter } from 'expo-router';
import { Appbar } from 'react-native-paper';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

export default function TeacherLayout() {
  const router = useRouter();
  const signOutLocal = useAuthStore((s) => s.signOutLocal);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    signOutLocal();
    router.replace('/(auth)/login');
  };

  return (
    <Stack
      screenOptions={{
        header: ({ options, back }) => (
          <Appbar.Header mode="center-aligned">
            {back ? <Appbar.BackAction onPress={() => router.back()} /> : null}
            <Appbar.Content title={options.title ?? 'Les App'} />
            <Appbar.Action icon="logout" onPress={handleSignOut} />
          </Appbar.Header>
        ),
      }}
    />
  );
}
