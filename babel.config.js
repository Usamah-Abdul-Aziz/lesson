module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Harus diletakkan terakhir (syarat react-native-reanimated).
      'react-native-reanimated/plugin',
    ],
  };
};
