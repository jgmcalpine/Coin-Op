/**
 * Background Service Worker - CoinOp
 * Current Status: Debugging ASP Connectivity on Mutinynet
 */

import { encryptData, decryptData } from '../lib/crypto';
import { saveEncryptedWallet, loadEncryptedWallet, hasWallet } from '../lib/storage';
import { generateMnemonic } from '../lib/wallet';
import type { Message, Response as ExtensionResponse } from '../types/messages';
import { Wallet, InMemoryKey } from '@arklabs/wallet-sdk';
import { mnemonicToSeedSync } from 'bip39';

// --- CONFIGURATION ---
const ARKADE_PUBKEY = "03fa73c6e4876ffb2dfc961d763cca9abc73d4b88efcb8f5e7ff92dc55e9aa553d";
const ASP_URL = "https://mutinynet.arkade.sh"; 

// --- STATE ---
let sessionMnemonic: string | null = null;
let walletInstance: Wallet | null = null;

// --- NETWORK INTERCEPTOR (THE SPY & PATCH) ---
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = input.toString();
  console.log(`[Spy] ➡️ ${url}`);

  // Passthrough non-ASP requests
  if (!url.includes('mutinynet.arkade.sh')) {
    return originalFetch(input, init);
  }

  try {
    const response = await originalFetch(input, init);
    console.log(`[Spy] ⬅️ [${response.status}] ${url}`);

    // PATCH: Fix /v1/info Bad Data
    if (url.endsWith('/v1/info')) {
      const clone = response.clone();
      const data = await clone.json();

      let modified = false;
      if (!data.version) {
        data.version = "v0.3.0";
        modified = true;
      }
      if (data.fees?.intentFee) {
        if (data.fees.intentFee.offchainInput === "") { data.fees.intentFee.offchainInput = "0"; modified = true; }
        if (data.fees.intentFee.offchainOutput === "") { data.fees.intentFee.offchainOutput = "0"; modified = true; }
      }

      if (modified) {
        console.log(`[Patch] Fixed malformed JSON for ${url}`);
        const newHeaders = new Headers(response.headers);
        newHeaders.delete('content-length');
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }
    }

    // GLOBAL SAFETY NET: Handle any ASP 404
    if (url.includes('mutinynet.arkade.sh') && response.status === 404) {
      console.warn(`[Patch] 🛡️ Caught 404 for ${url} - Returning Empty Success`);
      
      // Heuristic: If URL implies a list (plural) or ends in 's', return [], else {}
      // VTXOs endpoint returns a list.
      const isList = url.includes('/vtxos') || url.includes('/rounds') || url.includes('/events');
      const body = isList ? "[]" : "{}";
      
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return response;
  } catch (error) {
    console.error(`[Spy] ❌ Network Fail: ${url}`, error);
    throw error;
  }
};


// --- SDK LOGIC ---

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function initSdk(mnemonic: string): Promise<void> {
  console.log("[SDK] Initializing...");
  try {
    // 1. Derive Key
    const seedBuffer = mnemonicToSeedSync(mnemonic);
    const privateKeyHash = await crypto.subtle.digest('SHA-256', new Uint8Array(seedBuffer));
    const key = InMemoryKey.fromHex(arrayBufferToHex(privateKeyHash));

    // 2. Initialize Wallet
    walletInstance = await Wallet.create({
      network: 'mutinynet',
      identity: key,
      arkServerUrl: ASP_URL,
      arkServerPublicKey: ARKADE_PUBKEY,
      boardingTimelock: { type: "blocks", value: BigInt(144) },
      exitTimelock: { type: "blocks", value: BigInt(144) },
    });

    console.log("[SDK] Wallet Created!");
    console.log("[SDK] Onchain Addr:", walletInstance.onchainAddress);
    
    try {
        console.log("[SDK] Boarding Addr:", walletInstance.boardingOnchainAddress);
    } catch (error) { 
        const message = error instanceof Error ? error.message : "Unknown error";
        console.warn("[SDK] Boarding Addr not ready:", message);
    }

  } catch (error) {
    console.error("[SDK] Init Failed:", error);
    throw error;
  }
}

// --- MESSAGE HANDLERS ---

async function handleGenerateWallet(payload: { password: string }) {
  const seed = generateMnemonic();
  const encrypted = await encryptData(seed, payload.password);
  await saveEncryptedWallet(encrypted);
  return { success: true };
}

async function handleUnlockWallet(payload: { password: string }) {
  const encrypted = await loadEncryptedWallet();
  if (!encrypted) return { success: false, error: 'No wallet found' };

  try {
    const mnemonic = await decryptData(encrypted, payload.password);
    sessionMnemonic = mnemonic;
    await initSdk(mnemonic);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[UnlockWallet] Error:", message);
    return { success: false, error: 'Incorrect password or Init failed' };
  }
}

async function handleGetBalance() {
  if (!walletInstance) return { success: false, error: 'Locked' };
  
  let onchain = 0;
  let offchain = 0;

  // 1. Fetch L1 (Coins) - Independent fetch, don't fail if this errors
  try {
    const coins = await walletInstance.getCoins(); // Returns Coin[]
    onchain = coins.reduce((sum, coin) => {
      // Access amount property (may be 'value', 'amount', or 'amount_sat' depending on SDK version)
      const coinAny = coin as { value?: bigint | number; amount?: bigint | number; amount_sat?: bigint | number };
      const coinValue = coinAny.value ?? coinAny.amount ?? coinAny.amount_sat ?? 0;
      const amount = typeof coinValue === 'bigint' ? Number(coinValue) : coinValue;
      return sum + Number(amount);
    }, 0);
    console.log(`[Balance] L1 Coins found: ${coins.length}, Total: ${onchain}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Balance] Failed to fetch L1 coins:", message);
    // Don't throw, just keep 0
  }

  // 2. Fetch L2 (VTXOs) - Independent fetch, expected 404 for new wallets
  try {
    const vtxos = await walletInstance.getVtxos(); // Returns VirtualCoin[]
    offchain = vtxos.reduce((sum, vtxo) => {
      // Access amount property (may be 'value', 'amount', or 'amount_sat' depending on SDK version)
      const vtxoAny = vtxo as { value?: bigint | number; amount?: bigint | number; amount_sat?: bigint | number };
      const vtxoValue = vtxoAny.value ?? vtxoAny.amount ?? vtxoAny.amount_sat ?? 0;
      const amount = typeof vtxoValue === 'bigint' ? Number(vtxoValue) : vtxoValue;
      return sum + Number(amount);
    }, 0);
    console.log(`[Balance] L2 VTXOs found: ${vtxos.length}, Total: ${offchain}`);
  } catch (error) {
    // Expected 404 for new wallets
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn("[Balance] Failed to fetch L2 VTXOs (likely empty):", message);
  }

  return { success: true, data: { onchain, offchain } };
}

// TODO: Security Best Practice: Update this to generate a fresh address on every request to avoid reuse.
async function handleGetAddresses() {
    if (!walletInstance) return { success: false, error: 'Locked' };
    
    let onchain = "";
    let offchain = "";
    
    try { 
      onchain = walletInstance.onchainAddress; 
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn("[GetAddresses] Onchain address error:", message);
    }
    try { 
      offchain = walletInstance.offchainAddress?.toString() || ""; 
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn("[GetAddresses] Offchain address error:", message);
    }

    return { success: true, data: { onchain, offchain } };
}

async function handleOnboard(payload: { amount: number }) {
    if (!walletInstance) return { success: false, error: 'Locked' };
    try {
        // Sanitize amount to integer before passing to SDK
        const sanitizedAmount = Math.floor(payload.amount);
        const txid = await walletInstance.sendBitcoin({
            address: walletInstance.boardingOnchainAddress,
            amount: sanitizedAmount,
        });
        console.log("[SDK] Lift TX:", txid);
        return { success: true, data: { success: true, txid: String(txid) } };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: message || "Lift Failed" };
    }
}


// --- LISTENER ---

chrome.runtime.onMessage.addListener((
  msg: Message,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionResponse<unknown>) => void
) => {
  (async () => {
    let res: ExtensionResponse<unknown> = { success: false, error: "Unknown" };
    
    try {
        switch (msg.type) {
        case 'GenerateWallet': res = await handleGenerateWallet(msg.payload); break;
        case 'GetWalletStatus': res = { success: true, data: { initialized: await hasWallet(), locked: !sessionMnemonic } }; break;
        case 'UnlockWallet': res = await handleUnlockWallet(msg.payload); break;
        case 'LockWallet': sessionMnemonic = null; walletInstance = null; res = { success: true }; break;
        case 'GetBalance': res = await handleGetBalance(); break;
        case 'GetAddresses': res = await handleGetAddresses(); break;
        case 'Onboard': res = await handleOnboard(msg.payload); break;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res = { success: false, error: message };
    }
    sendResponse(res);
  })();
  return true;
});