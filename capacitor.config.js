/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.lifepulse.app',
  appName: 'LifePulse',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  }
};

module.exports = config;
