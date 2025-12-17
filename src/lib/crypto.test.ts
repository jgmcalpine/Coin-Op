/**
 * Tests for cryptographic functions.
 * Verifies encryption/decryption loop and error handling.
 */

import { describe, it, expect } from 'vitest';
import { encryptData, decryptData } from './crypto';

describe('Crypto Functions', () => {
  it('should encrypt and decrypt data with correct password', async () => {
    const plaintext = 'This is a test mnemonic phrase with twelve words';
    const password = 'test-password-123';

    const encrypted = await encryptData(plaintext, password);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');

    const decrypted = await decryptData(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it('should throw error when decrypting with wrong password', async () => {
    const plaintext = 'Another test mnemonic phrase';
    const correctPassword = 'correct-password';
    const wrongPassword = 'wrong-password';

    const encrypted = await encryptData(plaintext, correctPassword);

    await expect(decryptData(encrypted, wrongPassword)).rejects.toThrow(
      'Decryption failed: incorrect password or corrupted data'
    );
  });

  it('should throw error for invalid encrypted data format', async () => {
    await expect(decryptData('invalid json', 'password')).rejects.toThrow(
      'Invalid encrypted data format'
    );
  });

  it('should generate different ciphertext for same plaintext', async () => {
    const plaintext = 'Same plaintext';
    const password = 'password';

    const encrypted1 = await encryptData(plaintext, password);
    const encrypted2 = await encryptData(plaintext, password);

    // Should be different due to random salt and IV
    expect(encrypted1).not.toBe(encrypted2);

    // But both should decrypt to the same plaintext
    const decrypted1 = await decryptData(encrypted1, password);
    const decrypted2 = await decryptData(encrypted2, password);
    expect(decrypted1).toBe(plaintext);
    expect(decrypted2).toBe(plaintext);
  });
});
