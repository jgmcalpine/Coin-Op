/**
 * Test setup file for Vitest.
 * Provides Web Crypto API polyfill for happy-dom environment.
 */

import { webcrypto } from 'node:crypto';

// Polyfill Web Crypto API for happy-dom
if (!global.crypto) {
  Object.defineProperty(global, 'crypto', {
    value: webcrypto,
    writable: true,
  });
}

// Ensure window.crypto exists for browser-like environment
if (typeof window !== 'undefined' && !window.crypto) {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    writable: true,
  });
}

