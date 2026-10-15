import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Menu, useTheme } from 'react-native-paper';

import { useSubjects } from '@/hooks/useSubjects';

type SubjectSelectProps = {
  value: string;
  onChange: (subjectId: string) => void;
  error?: string;
  label?: string;
};

/**
 * Dropdown mata pelajaran. React Native Paper tidak punya komponen Select,
 * jadi dirakit dari Menu + Button (§3: konsisten memakai Paper).
 */
export function SubjectSelect({ value, onChange, error, label = 'Mata Pelajaran' }: SubjectSelectProps) {
  const theme = useTheme();
  const { data: subjects, isPending } = useSubjects();
  const [visible, setVisible] = useState(false);

  const selected = subjects?.find((subject) => subject.id === value);

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchorPosition="bottom"
        anchor={
          <Button
            mode="outlined"
            icon="chevron-down"
            onPress={() => setVisible(true)}
            loading={isPending}
            disabled={isPending}
            style={styles.anchor}
            labelStyle={{ color: selected ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
            {selected ? selected.name : label}
          </Button>
        }>
        {subjects?.map((subject) => (
          <Menu.Item
            key={subject.id}
            title={subject.name}
            leadingIcon={subject.id === value ? 'check' : undefined}
            onPress={() => {
              onChange(subject.id);
              setVisible(false);
            }}
          />
        ))}
        {subjects && subjects.length === 0 ? <Menu.Item title="Belum ada mata pelajaran" disabled /> : null}
      </Menu>
      {error ? <HelperText type="error" visible={error !== undefined}>{error}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  anchor: { alignSelf: 'stretch' },
});
