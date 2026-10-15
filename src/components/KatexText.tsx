import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import WebView from 'react-native-webview';
import { useTheme } from 'react-native-paper';

import { escapeHtml } from '@/utils/math';

/**
 * Versi KaTeX yang diverifikasi ada di CDN (15 Sep 2026). Dipin dari jsDelivr,
 * BUKAN dari npm bundle, agar ukuran app tetap kecil (§9: hemat kuota/free tier).
 */
const KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.19.0/dist';

const WEBVIEW_MESSAGE_HEIGHT = 'katex-height';

type KatexTextProps = {
  text: string;
  /** Ukuran font dasar (px). Default 16 (§9 aksesibilitas: font cukup besar). */
  textSize?: number;
  style?: StyleProp<TextStyle>;
  /** Jumlah baris default sebelum tinggi asli terukur (mencegah "lompatan"). */
  estimatedLines?: number;
};

/**
 * Merender teks campuran (prosa + rumus `$...$` / `$$...$$`) dengan KaTeX di
 * WebView. Ini pilihan sesuai §3 ("WebView KaTeX") karena react-native-katex
 * sudah tak dirawat.
 *
 * Catatan keterbatasan (jujur sesuai §13.4):
 *  - Butuh internet untuk memuat KaTeX dari CDN. Jika gagal, otomatis jatuh
 *    ke teks biasa (rumus tampilkan dalam notasi LaTeX aslinya).
 *  - Pada platform web ( Expo web) sengaja dipakai teks biasa, karena WebView
 *    bukan target produksi (Android prioritas utama, §2).
 */
export function KatexText({ text, textSize = 16, style, estimatedLines = 1 }: KatexTextProps) {
  const theme = useTheme();
  const [height, setHeight] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const html = useMemo(
    () => buildHtml(text, theme.colors.onSurface, textSize),
    [text, theme.colors.onSurface, textSize],
  );

  const handleMessage = useCallback((event: { nativeEvent: { data?: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data ?? '{}') as {
        type?: string;
        height?: number;
      };
      if (data.type === WEBVIEW_MESSAGE_HEIGHT && typeof data.height === 'number') {
        setHeight(Math.ceil(data.height));
      }
    } catch {
      // Pesan bukan JSON kustom — abaikan.
    }
  }, []);

  const handleRenderError = useCallback(() => setFailed(true), []);
  const handleLoad = useCallback(() => setFailed(false), []);

  // Platform web: tidak ada WebView produksi → teks biasa.
  if (Platform.OS === 'web' || failed) {
    return (
      <Text style={[styles.fallback, { color: theme.colors.onSurface, fontSize: textSize }, style]}>
        {text}
      </Text>
    );
  }

  const fallbackHeight = estimatedLines * Math.round(textSize * 1.6) + 8;

  return (
    <View style={[styles.container, { height: height ?? fallbackHeight }, style]}>
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        scalesPageToFit={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={handleMessage}
        onError={handleRenderError}
        onHttpError={handleRenderError}
        onLoad={handleLoad}
        renderError={() => <FallbackText text={text} />}
      />
    </View>
  );
}

function FallbackText({ text }: { text: string }) {
  const theme = useTheme();
  return <Text style={{ color: theme.colors.onSurface }}>{text}</Text>;
}

function buildHtml(text: string, color: string, textSize: number): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="${KATEX_CDN}/katex.min.css" />
<script src="${KATEX_CDN}/katex.min.js" defer></script>
<script src="${KATEX_CDN}/contrib/auto-render.min.js" defer></script>
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body {
    color: ${color};
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    font-size: ${textSize}px;
    line-height: 1.5;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .katex { font-size: 1.06em; }
  .katex-display { margin: 0.35em 0; overflow-x: auto; overflow-y: hidden; }
</style>
</head>
<body>
<div id="root">${escapeHtml(text)}</div>
<script>
  function reportHeight() {
    var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: '${WEBVIEW_MESSAGE_HEIGHT}', height: h })
      );
    }
  }
  window.addEventListener('load', function () {
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(document.getElementById('root'), {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
        strict: false,
      });
    }
    // Beri waktu layout KaTeX sebelum mengukur (font & ukuran berubah).
    setTimeout(reportHeight, 60);
    setTimeout(reportHeight, 400);
  });
  window.addEventListener('resize', reportHeight);
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  fallback: { flexShrink: 1 },
});
