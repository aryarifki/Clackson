import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto';

const ALG = 'aes-256-gcm';
const KEYLEN = 32;

function deriveKey(secret: string, salt: Buffer) {
  return scryptSync(secret, salt, KEYLEN);
}

export function encrypt(plain: string, secret = process.env.ENCRYPTION_SECRET || 'dev-secret'): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(secret, salt);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [salt.toString('base64'), iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decrypt(payload: string, secret = process.env.ENCRYPTION_SECRET || 'dev-secret'): string {
  const [saltB64, ivB64, tagB64, dataB64] = payload.split('.');
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const key = deriveKey(secret, salt);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}
