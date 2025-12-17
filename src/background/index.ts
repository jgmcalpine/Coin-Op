/**
 * Background Service Worker for CoinOp Chrome Extension.
 * Handles all message communication from the Popup UI.
 */

import { encryptData, decryptData } from '../lib/crypto';
import { saveEncryptedWallet, loadEncryptedWallet, hasWallet, saveNetwork, loadNetwork } from '../lib/storage';
import { generateMnemonic } from '../lib/wallet';
import type { Message, Response } from '../types/messages';
import { Wallet, InMemoryKey } from '@arklabs/wallet-sdk';
import { mnemonicToSeedSync } from 'bip39';

/**
 * Session state: stores the decrypted mnemonic in memory.
 * Cleared when the wallet is locked or the service worker restarts.
 */
let sessionMnemonic: string | null = null;

/**
 * Global wallet instance from Ark SDK.
 * Initialized when wallet is unlocked and cleared when locked.
 */
let walletInstance: Wallet | null = null;

/**
 * ASP URLs for different networks.
 * TODO: Find a live Ark ASP. 'master.mutinynet.arklabs.to' is down.
 */
const ASP_URLS = {
  signet: 'https://ark.signet.2nd.dev/api/v1', // Fallback - may fail protocol checks
  mainnet: 'https://asp.arklabs.to',
} as const;

/**
 * Maps our network names to SDK network names.
 * SDK uses 'mutinynet' for testing and 'bitcoin' for mainnet.
 */
const SDK_NETWORK_MAP: Record<'signet' | 'mainnet', 'mutinynet' | 'bitcoin'> = {
  signet: 'mutinynet', // Use 'mutinynet' for the SDK network
  mainnet: 'bitcoin',
} as const;

/**
 * Converts an ArrayBuffer to a hex string, ensuring leading zeros are preserved.
 * @param buffer - The ArrayBuffer to convert
 * @returns Hex string representation
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Initializes the Ark SDK with the provided mnemonic and network.
 * @param mnemonic - The mnemonic seed phrase
 * @param network - The network to connect to ('signet' or 'mainnet')
 */
async function initSdk(mnemonic: string, network: 'signet' | 'mainnet'): Promise<void> {
  try {
    const sdkNetwork = SDK_NETWORK_MAP[network];
    
    // Convert mnemonic to 64-byte seed buffer
    const seedBuffer = mnemonicToSeedSync(mnemonic);
    console.log(`Seed generated (Length: ${seedBuffer.length} bytes)`);
    
    // Hash the 64-byte seed to a 32-byte private key using SHA-256
    // Convert Buffer to Uint8Array for crypto.subtle.digest
    const seedUint8Array = new Uint8Array(seedBuffer);
    const privateKeyHash = await crypto.subtle.digest('SHA-256', seedUint8Array);
    const privateKeyHex = arrayBufferToHex(privateKeyHash);
    console.log(`Private Key derived (Length: ${privateKeyHash.byteLength} bytes)`);
    
    // Create identity from 32-byte private key hex
    const key = InMemoryKey.fromHex(privateKeyHex);
    console.log('Identity created successfully');
    
    console.log('[Network] SDK Network:', sdkNetwork);
    
    // Try creating wallet with SDK defaults first (no arkServerUrl)
    // The SDK may have built-in default providers for mutinynet
    try {
      console.log('[Network] Attempting wallet creation with SDK defaults (no arkServerUrl)...');
      walletInstance = await Wallet.create({
        network: sdkNetwork,
        identity: key,
        // Note: If esploraUrl is required, use: esploraUrl: 'https://mutinynet.com/api'
      });
      console.log("[Wallet] Onchain Address:", walletInstance.onchainAddress);
// console.log("[Wallet] Offchain Address:", walletInstance.offchainAddress);
      console.log('[Network] Wallet created successfully with SDK defaults');
    } catch (defaultError) {
      console.warn('[Network] SDK defaults failed, trying with explicit arkServerUrl:', defaultError);
      
      // Fallback: Use explicit ASP URL if SDK defaults don't work
      const aspUrl = ASP_URLS[network];
      console.log('[Network] Attempting connection to:', aspUrl);
      
      walletInstance = await Wallet.create({
        network: sdkNetwork,
        identity: key,
        arkServerUrl: aspUrl,
      });
      
      console.log(`[Network] Wallet created with explicit ASP URL: ${aspUrl}`);
    }
    
    console.log(`SDK initialized with network: ${network}`);
  } catch (error) {
    console.error('Failed to initialize SDK:', error);
    walletInstance = null;
    throw error;
  }
}

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
 * On success, stores the decrypted mnemonic in session memory and initializes the SDK.
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
      
      // Load network setting and initialize SDK
      const network = await loadNetwork();
      try {
        await initSdk(mnemonic, network);
      } catch (sdkError) {
        // Log error but don't fail unlock - wallet is still unlocked
        console.error('Failed to initialize SDK after unlock:', sdkError);
        // Continue without SDK initialization - user can retry later
      }
      
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
 * Clears the session mnemonic from memory and resets the wallet instance.
 */
async function handleLockWallet(): Promise<Response<{ success: true }>> {
  sessionMnemonic = null;
  walletInstance = null;
  return {
    success: true,
    data: { success: true },
  };
}

/**
 * Handles GetBalance message.
 * Returns the current balance from the Ark SDK wallet instance.
 */
async function handleGetBalance(): Promise<Response<{ onchain: number; offchain: number }>> {
  try {
    if (!walletInstance) {
      return {
        success: false,
        error: 'Wallet not initialized',
      };
    }

    const balance = await walletInstance.getBalance();
    
    // SDK returns WalletBalance with onchain.total and offchain.total
    return {
      success: true,
      data: {
        onchain: Number(balance.onchain.total),
        offchain: Number(balance.offchain.total),
      },
    };
  } catch (error) {
    // Handle ASP offline scenarios gracefully
    if (error instanceof Error && (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('connection') ||
      error.message.includes('Failed to fetch')
    )) {
      return {
        success: false,
        error: 'Unable to connect to Ark Service Provider. Please check your connection.',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get balance',
    };
  }
}

/**
 * Handles GetNetwork message.
 * Returns the currently saved network setting.
 */
async function handleGetNetwork(): Promise<Response<{ network: 'signet' | 'mainnet' }>> {
  try {
    const network = await loadNetwork();
    return {
      success: true,
      data: { network },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get network',
    };
  }
}

/**
 * Handles SetNetwork message.
 * Saves the new network setting and re-initializes the SDK if wallet is unlocked.
 */
async function handleSetNetwork(
  payload: { network: 'signet' | 'mainnet' }
): Promise<Response<{ success: true }>> {
  try {
    await saveNetwork(payload.network);
    
    // If wallet is unlocked, re-initialize SDK with new network
    if (sessionMnemonic) {
      try {
        await initSdk(sessionMnemonic, payload.network);
      } catch (sdkError) {
        // Log error but don't fail the network change
        console.error('Failed to re-initialize SDK with new network:', sdkError);
        // Continue - network is saved, SDK will retry on next unlock
      }
    }
    
    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set network',
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

        case 'LockWallet':
          response = await handleLockWallet();
          break;

        case 'GetBalance':
          response = await handleGetBalance();
          break;

        case 'GetNetwork':
          response = await handleGetNetwork();
          break;

        case 'SetNetwork':
          response = await handleSetNetwork(message.payload);
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

