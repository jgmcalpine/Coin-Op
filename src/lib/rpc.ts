/**
 * Type-safe RPC client for Chrome Extension messaging.
 * Wraps chrome.runtime.sendMessage with proper error handling and TypeScript types.
 */

import type { Message, Response } from '../types/messages';

/**
 * Sends a message to the background service worker and returns a typed response.
 * @param msg - The message to send (discriminated union from Message type)
 * @returns Promise that resolves with a Response<T> or rejects on error
 * @template T - The expected response data type
 */
export async function sendMessage<T>(msg: Message): Promise<Response<T>> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response: Response<T> | undefined) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response) {
        reject(new Error('No response received from background service worker'));
        return;
      }

      resolve(response);
    });
  });
}

