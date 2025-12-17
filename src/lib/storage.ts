/**
 * Type-safe wrapper for chrome.storage.local.
 * Handles encrypted wallet storage and retrieval.
 */

const WALLET_STORAGE_KEY = 'encrypted_wallet';

/**
 * Saves encrypted wallet data to chrome.storage.local.
 * @param data - The encrypted wallet data (JSON string from encryptData)
 * @returns Promise that resolves when data is saved
 */
export async function saveEncryptedWallet(data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [WALLET_STORAGE_KEY]: data }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Loads encrypted wallet data from chrome.storage.local.
 * @returns Promise that resolves with the encrypted wallet data, or null if not found
 */
export async function loadEncryptedWallet(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([WALLET_STORAGE_KEY], (result: { [key: string]: unknown }) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        const wallet = result[WALLET_STORAGE_KEY];
        resolve((typeof wallet === 'string' ? wallet : null));
      }
    });
  });
}

/**
 * Checks if a wallet exists in storage.
 * @returns Promise that resolves to true if wallet exists, false otherwise
 */
export async function hasWallet(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([WALLET_STORAGE_KEY], (result: { [key: string]: unknown }) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result[WALLET_STORAGE_KEY] !== undefined);
      }
    });
  });
}

const NETWORK_STORAGE_KEY = 'network';

/**
 * Saves the selected network to chrome.storage.local.
 * @param network - The network to save ('signet' or 'mainnet')
 * @returns Promise that resolves when data is saved
 */
export async function saveNetwork(network: 'signet' | 'mainnet'): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [NETWORK_STORAGE_KEY]: network }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Loads the selected network from chrome.storage.local.
 * @returns Promise that resolves with the network ('signet' or 'mainnet'), defaults to 'signet'
 */
export async function loadNetwork(): Promise<'signet' | 'mainnet'> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([NETWORK_STORAGE_KEY], (result: { [key: string]: unknown }) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        const network = result[NETWORK_STORAGE_KEY];
        if (network === 'signet' || network === 'mainnet') {
          resolve(network);
        } else {
          resolve('signet'); // Default to signet
        }
      }
    });
  });
}

