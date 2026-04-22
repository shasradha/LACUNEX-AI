/**
 * LACUNEX AI — E2EE Crypto Module
 * AES-256-GCM encryption via Web Crypto API.
 * Keys are deterministically derived from the user's session for cross-device sync.
 * Legacy random keys are kept as fallback for old messages.
 */

import { getUser } from './auth';

const DB_NAME = "lacunex_e2ee";
const STORE_NAME = "keys";

function openKeyDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getLegacyRandomKey() {
  const db = await openKeyDB();
  const stored = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get("master_key");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (stored) {
    return crypto.subtle.importKey("jwk", stored, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  }
  return null;
}

let cachedDerivedKey = null;

export async function getDerivedKey() {
  if (cachedDerivedKey) return cachedDerivedKey;
  
  const user = getUser();
  if (!user || !user.id) {
    // If no user context, fallback to legacy creation logic or throw
    // For now, throw because we need user context for cross-device keys.
    throw new Error("Cannot derive E2E key: No user session found.");
  }

  // Use a stable, high-entropy string derived from the user's immutable fields
  const seedString = `${user.id}::${user.email}::LACUNEX_E2EE_MASTER_SALT_V2`;
  
  const encoded = new TextEncoder().encode(seedString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  
  cachedDerivedKey = await crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  
  return cachedDerivedKey;
}

export async function encryptMessage(plaintext) {
  const key = await getDerivedKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    encrypted_content: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv),
  };
}

export async function decryptMessage(encryptedContent, ivBase64) {
  const cipherBuffer = base64ToBuffer(encryptedContent);
  const iv = base64ToBuffer(ivBase64);
  
  try {
    // 1. Try the cross-device derived key first
    const key = await getDerivedKey();
    const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBuffer);
    return new TextDecoder().decode(plainBuffer);
  } catch (e) {
    // 2. If it fails, fallback to the legacy local random key (for older messages)
    try {
      const legacyKey = await getLegacyRandomKey();
      if (legacyKey) {
        const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, legacyKey, cipherBuffer);
        return new TextDecoder().decode(plainBuffer);
      }
    } catch (legacyErr) {
      console.warn("E2EE: Failed to decrypt with legacy key as well.");
    }
    
    throw new Error("This message could not be decrypted in the current browser session. It was encrypted on a different device.");
  }
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
