/**
 * Background Service Worker for CoinOp Chrome Extension.
 * Handles all message communication from the Popup UI.
 */

import { encryptData, decryptData } from '../lib/crypto';
import { saveEncryptedWallet, loadEncryptedWallet, hasWallet } from '../lib/storage';
import { generateMnemonic } from '../lib/wallet';
import type { Message, Response } from '../types/messages';

/**
 * Session state: stores the decrypted mnemonic in memory.
 * Cleared when the wallet is locked or the service worker restarts.
 */
let sessionMnemonic: string | null = null;

/**
 * Handles GenerateWallet message.
 * Generates a new mnemonic seed phrase, encrypts it, and saves it to storage.
 */
async function handleGenerateWallet(
  payload: { password: string }
): Promise<Response<{ success: true }>> {
  try {
    // Generate dummy seed for now (will be replaced with actual wallet generation)
    const seed = generateMnemonic();

    // Encrypt the seed with the provided password
    const encryptedData = await encryptData(seed, payload.password);

    // Save encrypted wallet to storage
    await saveEncryptedWallet(encryptedData);

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate wallet',
    };
  }
}

/**
 * Handles GetWalletStatus message.
 * Checks if a wallet exists and returns its status.
 */
async function handleGetWalletStatus(): Promise<
  Response<{ initialized: boolean; locked: boolean }>
> {
  try {
    const initialized = await hasWallet();

    return {
      success: true,
      data: {
        initialized,
        locked: sessionMnemonic === null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get wallet status',
    };
  }
}

/**
 * Handles UnlockWallet message.
 * Attempts to decrypt the wallet using the provided password.
 * On success, stores the decrypted mnemonic in session memory.
 */
async function handleUnlockWallet(
  payload: { password: string }
): Promise<Response<{ success: true }>> {
  try {
    const encrypted = await loadEncryptedWallet();

    if (!encrypted) {
      return {
        success: false,
        error: 'No wallet found',
      };
    }

    try {
      const mnemonic = await decryptData(encrypted, payload.password);
      sessionMnemonic = mnemonic;
      return {
        success: true,
        data: { success: true },
      };
    } catch {
      return {
        success: false,
        error: 'Incorrect password',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlock wallet',
    };
  }
}

/**
 * Handles LockWallet message.
 * Clears the session mnemonic from memory.
 */
async function handleLockWallet(): Promise<Response<{ success: true }>> {
  sessionMnemonic = null;
  return {
    success: true,
    data: { success: true },
  };
}

/**
 * Main message listener for the background service worker.
 * Routes messages based on their type and returns typed responses.
 * 
 * IMPORTANT: Returns 'true' to indicate we will respond asynchronously.
 * This is required by Chrome's messaging API when using async handlers.
 */
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: Response<unknown>) => void
  ): boolean => {
    // Handle messages asynchronously
    (async () => {
      let response: Response<unknown>;

      switch (message.type) {
        case 'GenerateWallet':
          response = await handleGenerateWallet(message.payload);
          break;

        case 'GetWalletStatus':
          response = await handleGetWalletStatus();
          break;

        case 'UnlockWallet':
          response = await handleUnlockWallet(message.payload);
          break;

        case 'LockWallet':
          response = await handleLockWallet();
          break;

        default: {
          // TypeScript exhaustiveness check
          const _exhaustive: never = message;
          response = {
            success: false,
            error: `Unknown message type: ${(_exhaustive as Message).type}`,
          };
        }
      }

      sendResponse(response);
    })();

    // Return true to indicate we will respond asynchronously
    return true;
  }
);

