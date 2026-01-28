module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo'],
      'nativewind/babel',
    ],
    plugins: [
      // NativeWind v4 / worklets
      require.resolve('react-native-worklets/plugin'),
    ],
  };
};

