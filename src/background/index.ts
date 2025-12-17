/**
 * Background Service Worker for CoinOp Chrome Extension.
 * Handles all message communication from the Popup UI.
 */

import { encryptData } from '../lib/crypto';
import { saveEncryptedWallet, hasWallet } from '../lib/storage';
import { generateMnemonic } from '../lib/wallet';
import type { Message, Response } from '../types/messages';

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
        locked: initialized, // For now, wallet is locked if it exists (no unlock state tracking yet)
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
 * Stub implementation for now.
 */
async function handleUnlockWallet(
  payload: { password: string }
): Promise<Response<{ success: true }>> {
  try {
    // TODO: Implement actual unlock logic
    // This should decrypt the wallet and verify the password
    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlock wallet',
    };
  }
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

