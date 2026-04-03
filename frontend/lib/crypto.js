/**
 * LACUNEX AI — E2EE Crypto Module
 * AES-256-GCM encryption via Web Crypto API.
 * Keys generated per-user, stored in IndexedDB — NEVER sent to server.
 */

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

export async function getOrCreateKey() {
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

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const jwk = await crypto.subtle.exportKey("jwk", key);

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(jwk, "master_key");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return key;
}

export async function encryptMessage(plaintext) {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    encrypted_content: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv),
  };
}

export async function decryptMessage(encryptedContent, ivBase64) {
  const key = await getOrCreateKey();
  const cipherBuffer = base64ToBuffer(encryptedContent);
  const iv = base64ToBuffer(ivBase64);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBuffer);
  return new TextDecoder().decode(plainBuffer);
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
