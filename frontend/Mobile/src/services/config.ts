import { Platform } from 'react-native';

/**
 * Backend API Configuration.
 *
 * NOTE FOR PHYSICAL MOBILE DEVICES:
 * 'localhost' on a physical device refers to the device itself.
 * If testing on a physical iPhone or Android device, set `CUSTOM_LAN_HOST`
 * to your computer's local Wi-Fi IP address (e.g. '192.168.1.5').
 */

// If you are testing on a physical phone, uncomment & put your machine's LAN IP:
// const CUSTOM_LAN_HOST = '192.168.1.100';
const CUSTOM_LAN_HOST: string | null = null;

const DEFAULT_PORT = '3001';

function resolveBaseUrl(): string {
  if (CUSTOM_LAN_HOST) {
    return `http://${CUSTOM_LAN_HOST}:${DEFAULT_PORT}`;
  }

  // Android emulator aliases host machine to 10.0.2.2
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }

  // iOS simulator or default web/dev
  return `http://localhost:${DEFAULT_PORT}`;
}

export const API_CONFIG = {
  baseUrl: resolveBaseUrl(),
  timeoutMs: 45_000, // 45s for LLM tool-calling orchestrations
  testMode: true,
  testModeLabel: 'RAZORPAY TEST MODE',
};

export function setCustomHost(ipAddress: string | null): void {
  if (ipAddress) {
    API_CONFIG.baseUrl = `http://${ipAddress}:${DEFAULT_PORT}`;
  } else {
    API_CONFIG.baseUrl = resolveBaseUrl();
  }
}
