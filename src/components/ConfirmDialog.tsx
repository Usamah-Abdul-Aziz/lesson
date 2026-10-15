import { Dialog, Portal, Text } from 'react-native-paper';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  /** Label tombol konfirmasi; pewarnaan merah untuk aksi destruktif. */
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

/** Dialog konfirmasi standar untuk aksi destruktif (hapus, arsip). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  destructive = false,
  loading = false,
  onConfirm,
  onDismiss,
}: ConfirmDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Dialog.Button onPress={onDismiss} disabled={loading}>
            Batal
          </Dialog.Button>
          <Dialog.Button
            onPress={onConfirm}
            loading={loading}
            disabled={loading}
            {...(destructive ? { textColor: '#C62828' } : {})}>
            {confirmLabel}
          </Dialog.Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
