const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch {
  // Expo also loads public env vars; this keeps config usable if dotenv is unavailable.
}

const DUMMY_GOOGLE_MAPS_API_KEY = 'DUMMY_GOOGLE_MAPS_API_KEY';

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  DUMMY_GOOGLE_MAPS_API_KEY;

const googleMapsApiKeyConfigured = googleMapsApiKey !== DUMMY_GOOGLE_MAPS_API_KEY;

module.exports = ({ config }) => ({
  ...config,
  scheme: 'lokali',

  updates: {
    enabled: false,
  },
  android: {
    ...config.android,
    usesCleartextTraffic: true,
    config: {
      ...(config.android?.config || {}),
      googleMaps: {
        ...(config.android?.config?.googleMaps || {}),
        apiKey: googleMapsApiKey,
      },
    },
  },
  extra: {
    ...config.extra,
    googleMapsApiKeyConfigured,
  },
});
