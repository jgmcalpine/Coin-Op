/**
 * Wallet utilities for BIP-39 mnemonic generation.
 */

import * as bip39 from 'bip39';

/**
 * Generates a 12-word BIP-39 mnemonic seed phrase.
 * @returns A 12-word mnemonic string
 */
export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}

