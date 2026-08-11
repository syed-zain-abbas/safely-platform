import { DEFAULT_SETTINGS, type PinVerifier, type Settings } from "./types";

const SETTINGS_KEY = "settings";

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined), customCategories: { ...DEFAULT_SETTINGS.customCategories, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined)?.customCategories } };
}

export async function saveSettings(next: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
}

export async function updateSettings(change: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...change, customCategories: { ...current.customCategories, ...change.customCategories } };
  await saveSettings(next);
  return next;
}

const encoder = new TextEncoder();
const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function derivePin(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations, hash: "SHA-256" }, material, 256);
  return bytesToBase64(new Uint8Array(bits));
}

export async function createPinVerifier(pin: string): Promise<PinVerifier> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 310_000;
  return { salt: bytesToBase64(salt), hash: await derivePin(pin, salt, iterations), iterations };
}

export async function verifyPin(pin: string, verifier: PinVerifier): Promise<boolean> {
  const candidate = await derivePin(pin, base64ToBytes(verifier.salt), verifier.iterations);
  if (candidate.length !== verifier.hash.length) return false;
  let mismatch = 0;
  for (let index = 0; index < candidate.length; index += 1) mismatch |= candidate.charCodeAt(index) ^ verifier.hash.charCodeAt(index);
  return mismatch === 0;
}
