/**
 * Utilitas pemisahan teks ↔ LaTeX untuk render KaTeX (§3: "render matematika").
 *
 * KaTeX dirender lewat WebView (lihat components/KatexText). Karena WebView
 * merimut tiap string, teks dipisah dulu menjadi segmen; bagian yang berisi
 * rumus di-render terpisah agar font/tinggi baris konsisten.
 */

export type MathSegmentKind = 'text' | 'inline' | 'block';

export type TextSegment = {
  kind: MathSegmentKind;
  value: string;
};

/**
 * Memisahkan `$...$` (inline) dan `$$...$$` (blok) dari teks biasa.
 * `\$` diperlakukan sebagai tanda dolar literal, bukan pembuka rumus.
 * Pembuka tanpa penutup dibiarkan sebagai teks biasa.
 */
export function splitMathSegments(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let buffer = '';
  let i = 0;

  const flushText = () => {
    if (buffer !== '') {
      segments.push({ kind: 'text', value: buffer });
      buffer = '';
    }
  };

  while (i < input.length) {
    const char = input[i];

    if (char === '\\') {
      // Karakter escape: pasangan (mis. `\$`, `\\`) ikut utuh ke buffer.
      buffer += input.slice(i, i + 2);
      i += 2;
      continue;
    }

    if (char === '$') {
      if (input[i + 1] === '$') {
        const end = input.indexOf('$$', i + 2);
        if (end !== -1) {
          flushText();
          segments.push({ kind: 'block', value: input.slice(i + 2, end) });
          i = end + 2;
          continue;
        }
      } else {
        const end = findInlineEnd(input, i + 1);
        if (end !== -1) {
          flushText();
          segments.push({ kind: 'inline', value: input.slice(i + 1, end) });
          i = end + 1;
          continue;
        }
      }
    }

    buffer += char;
    i += 1;
  }

  flushText();
  return segments;
}

/** Indeks penutup `$` berikutnya; -1 bila tidak ada (sebelum baris baru). */
function findInlineEnd(input: string, start: number): number {
  for (let i = start; i < input.length; i += 1) {
    if (input[i] === '$') return i;
    if (input[i] === '\n') return -1;
  }
  return -1;
}

/** Escaping HTML untuk injeksi teks aman ke dokumen WebView. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** true bila teks mengandung penanda rumus `$` yang akan dirimu KaTeX. */
export function containsMath(input: string): boolean {
  return /\$/.test(input);
}
