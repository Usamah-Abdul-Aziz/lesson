/** Utilitas tanggal Bahasa Indonesia (Hermes sudah menyertakan ICU penuh). */

const DAY_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Format ISO timestamp → "12 Okt 2026, 14.30". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    const date = new Date(iso);
    const time = `${pad(date.getHours())}.${pad(date.getMinutes())}`;
    return `${date.getDate()} ${DAY_NAMES[date.getMonth()]} ${date.getFullYear()}, ${time}`;
  } catch {
    return iso;
  }
}

/** Format ISO timestamp → "12 Okt 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    const date = new Date(iso);
    return `${date.getDate()} ${DAY_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return iso;
  }
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}
