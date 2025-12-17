/**
 * Type-safe message definitions for Chrome Extension messaging.
 * Uses discriminated unions to ensure type safety at compile time.
 */

/**
 * Response wrapper for all message handlers.
 * @template T - The type of data returned on success
 */
export interface Response<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Message types for communication between Popup and Background Service Worker.
 */
export type Message =
  | { type: 'GenerateWallet'; payload: { password: string } }
  | { type: 'GetWalletStatus' }
  | { type: 'UnlockWallet'; payload: { password: string } }
  | { type: 'LockWallet' };

/**
 * Response types for each message handler.
 */
export interface GenerateWalletResponse {
  success: true;
}

export interface GetWalletStatusResponse {
  initialized: boolean;
  locked: boolean;
}

export interface UnlockWalletResponse {
  success: true;
}

export interface LockWalletResponse {
  success: true;
}

