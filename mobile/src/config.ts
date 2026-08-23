// Configuration for the mobile app
// Change this to your backend URL

// For local development:
// - If using iOS Simulator: use 'localhost'
// - If using Android Emulator: use '10.0.2.2'
// - If using Expo Go on physical device: use your computer's local IP (e.g., '192.168.1.10')

// Get your local IP with: ipconfig (Windows) or ifconfig/ip addr (Mac/Linux)

export const API_BASE_URL = __DEV__
  ? 'http://localhost:8080/api'  // Change localhost to your IP for physical devices
  : 'https://clement-silvestre.com/api'  // Production URL