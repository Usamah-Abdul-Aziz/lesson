import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

/**
 * Wrapper layar standar: SafeArea + ScrollView dengan background theme.
 * Menjaga jarak tepi konsisten di semua layar (§9 UX).
 */
export function ScreenContainer({
  children,
  contentContainerStyle,
  scrollEnabled = true,
}: ScreenContainerProps) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, contentContainerStyle]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 16 },
});

interface ScreenContainerProps {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
}
