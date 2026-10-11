import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { ScreenContainer } from '@/components/ScreenContainer';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { Button, Card, HelperText, TextInput, useTheme } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z
    .string()
    .min(6, 'Password minimal 6 karakter'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const theme = useTheme();
  const setError = useAuthStore((s) => s.setError);
  const storeError = useAuthStore((s) => s.error);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setError('Email atau password salah. Periksa kembali kredensial Anda.');
    }
    // Jika sukses, listener onAuthStateChange akan memuat profil & meroute.
  };

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <Card style={styles.card} elevation={2}>
        <Card.Title
          title="Les App"
          subtitle="Masuk untuk mulai belajar atau mengajar"
          titleVariant="headlineSmall"
        />
        <Card.Content style={styles.content}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email"
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={!!errors.email}
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.email ? (
              <HelperText type="error">{errors.email.message}</HelperText>
            ) : null}

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Password"
                  mode="outlined"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={!!errors.password}
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.password ? (
              <HelperText type="error">{errors.password.message}</HelperText>
            ) : null}

            {storeError ? <HelperText type="error">{storeError}</HelperText> : null}
        </Card.Content>
        <Card.Actions style={styles.actions}>
          <Button
            mode="contained"
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={() => void handleSubmit(onSubmit)()}
            style={styles.button}>
            Masuk
          </Button>
        </Card.Actions>
      </Card>

      <View style={[styles.hint, { borderColor: theme.colors.outline }]}>
        <HelperText type="info">
          Akun dibuat oleh guru. Belum punya akun? Minta guru menambahkan Anda.
        </HelperText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    gap: 4,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 6,
  },
  hint: {
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
});
