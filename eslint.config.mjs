// https://docs.expo.dev/guides/using-eslint/
//
// Catatan: pada eslint-config-expo@57, `eslint-config-expo/flat.js` adalah
// modul CommonJS yang mengekspor *array* config langsung (tanpa helper
// `defineConfig`). Ekstensi `.js` wajib ditulis karena package ini tidak
// mendefinisikan field `exports`, sehingga resolver ESM Node menolak import
// direktori.
//
// Override rule disisipkan ke objek config yang SUDAH mendaftarkan plugin
// `@typescript-eslint` (entri ke-8, untuk **/*.ts|*.tsx). Dalam flat config,
// sebuah `rules` yang merujuk plugin hanya berlaku jika plugin tersebut
// didaftarkan di objek config yang sama.
import expoFlatConfig from 'eslint-config-expo/flat.js';

const TS_CONFIG_INDEX = 7;

export default [
  ...expoFlatConfig.slice(0, TS_CONFIG_INDEX),
  {
    ...expoFlatConfig[TS_CONFIG_INDEX],
    rules: {
      ...expoFlatConfig[TS_CONFIG_INDEX].rules,
      // `any` tidak dilarang keras, tapi ditandai untuk direiviu.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  ...expoFlatConfig.slice(TS_CONFIG_INDEX + 1),
  {
    ignores: ['dist/*', 'node_modules/*', 'supabase/functions/*'],
  },
];
