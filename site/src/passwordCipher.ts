export const PASSWORD_CIPHER_PREFIX = 'enc-v1:';

const CIPHER_SEED = [0x25, 0x5b, 0x11, 0xcb, 0x3d, 0x0b, 0x95] as const;

function toUtf8Bytes(input: string): number[] {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(input));
  }

  const encoded = encodeURIComponent(input);
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    if (char === '%') {
      const byte = Number.parseInt(encoded.slice(i + 1, i + 3), 16);
      if (Number.isNaN(byte)) return [];
      bytes.push(byte);
      i += 2;
      continue;
    }
    bytes.push(char.charCodeAt(0));
  }
  return bytes;
}

function fromUtf8Bytes(bytes: number[]): string {
  if (typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder().decode(new Uint8Array(bytes));
    } catch {
      return '';
    }
  }

  const encoded = bytes.map((byte) => `%${byte.toString(16).padStart(2, '0')}`).join('');
  try {
    return decodeURIComponent(encoded);
  } catch {
    return '';
  }
}

function toBase64(bytes: number[]): string {
  const bufferLike = (globalThis as unknown as {
    Buffer?: { from: (input: number[]) => { toString: (encoding: string) => string } };
  }).Buffer;

  if (bufferLike?.from) {
    return bufferLike.from(bytes).toString('base64');
  }

  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  throw new Error('Base64 encoder is unavailable');
}

function fromBase64(input: string): number[] {
  const bufferLike = (globalThis as unknown as {
    Buffer?: { from: (input: string, encoding: string) => { values: () => Iterable<number> } };
  }).Buffer;

  if (bufferLike?.from) {
    return Array.from(bufferLike.from(input, 'base64').values());
  }

  if (typeof atob === 'function') {
    const binary = atob(input);
    return Array.from(binary, (char) => char.charCodeAt(0) & 0xff);
  }

  throw new Error('Base64 decoder is unavailable');
}

function byteMask(index: number): number {
  const seed = CIPHER_SEED[index % CIPHER_SEED.length];
  return (seed + ((index * 29 + 113) & 0xff)) & 0xff;
}

function checksum(payload: number[]): number {
  let value = 0;
  for (let i = 0; i < payload.length; i++) {
    value = (value + ((payload[i] + ((i + 1) * 17)) & 0xff)) & 0xffff;
  }
  return value;
}

export function isEncryptedPassword(value: string): boolean {
  return typeof value === 'string' && value.startsWith(PASSWORD_CIPHER_PREFIX);
}

export function encryptPassword(password: string): string {
  if (!password) return '';
  if (isEncryptedPassword(password)) return password;

  const source = toUtf8Bytes(password);
  const encrypted = source.map((byte, index) => (byte ^ byteMask(index)) & 0xff);
  const digest = checksum(encrypted);
  const payload = [...encrypted, (digest >> 8) & 0xff, digest & 0xff];

  return `${PASSWORD_CIPHER_PREFIX}${toBase64(payload)}`;
}

export function decryptPassword(ciphertext: string): string {
  if (!ciphertext) return '';
  if (!isEncryptedPassword(ciphertext)) return ciphertext;

  try {
    const payload = fromBase64(ciphertext.slice(PASSWORD_CIPHER_PREFIX.length));
    if (payload.length < 2) return '';

    const body = payload.slice(0, -2);
    const digest = ((payload[payload.length - 2] ?? 0) << 8) | (payload[payload.length - 1] ?? 0);
    if (checksum(body) !== digest) return '';

    const source = body.map((byte, index) => (byte ^ byteMask(index)) & 0xff);
    return fromUtf8Bytes(source);
  } catch {
    return '';
  }
}
