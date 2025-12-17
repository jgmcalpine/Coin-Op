/**
 * Cryptographic utilities for secure key generation and storage.
 * Uses native Web Crypto API for AES-GCM encryption and PBKDF2 key derivation.
 */

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = 'SHA-256';
const AES_KEY_LENGTH = 256;
const AES_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits

interface EncryptedData {
  cipherText: string;
  salt: string;
  iv: string;
}

/**
 * Converts a Uint8Array to a base64 string.
 * Handles large arrays by processing in chunks.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Converts a base64 string to a Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a cryptographic key from a password using PBKDF2.
 * @param password - The user-provided password
 * @param salt - Random salt for key derivation
 * @returns A CryptoKey suitable for AES-GCM encryption
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passwordKey,
    {
      name: AES_ALGORITHM,
      length: AES_KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using AES-GCM with a password-derived key.
 * @param data - The plaintext data to encrypt
 * @param password - The user-provided password
 * @returns JSON string containing cipherText, salt, and iv (all base64-encoded)
 */
export async function encryptData(data: string, password: string): Promise<string> {
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encode plaintext
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(data);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv: new Uint8Array(iv),
    },
    key,
    plaintext
  );

  // Convert to base64 for storage
  const cipherTextBase64 = uint8ArrayToBase64(new Uint8Array(ciphertext));
  const saltBase64 = uint8ArrayToBase64(salt);
  const ivBase64 = uint8ArrayToBase64(iv);

  const encryptedData: EncryptedData = {
    cipherText: cipherTextBase64,
    salt: saltBase64,
    iv: ivBase64,
  };

  return JSON.stringify(encryptedData);
}

/**
 * Decrypts data that was encrypted with encryptData.
 * @param encryptedJson - JSON string containing cipherText, salt, and iv
 * @param password - The user-provided password
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails (e.g., wrong password)
 */
export async function decryptData(encryptedJson: string, password: string): Promise<string> {
  let encryptedData: EncryptedData;
  try {
    encryptedData = JSON.parse(encryptedJson);
  } catch (error) {
    throw new Error('Invalid encrypted data format');
  }

  // Decode base64 strings
  const ciphertextArray = base64ToUint8Array(encryptedData.cipherText);
  const salt = base64ToUint8Array(encryptedData.salt);
  const iv = base64ToUint8Array(encryptedData.iv);

  // Derive key from password using stored salt
  const key = await deriveKey(password, salt);

  // Decrypt - create a new ArrayBuffer to ensure proper type
  let plaintext: ArrayBuffer;
  try {
    const ciphertextBuffer = new Uint8Array(ciphertextArray).buffer;
    plaintext = await crypto.subtle.decrypt(
      {
        name: AES_ALGORITHM,
        iv: new Uint8Array(iv),
      },
      key,
      ciphertextBuffer
    );
  } catch (error) {
    throw new Error('Decryption failed: incorrect password or corrupted data');
  }

  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

