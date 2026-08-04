import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

export interface EncryptedBlob {
  iv: string; // base64
  tag: string; // base64
  data: string; // base64
}

export function encrypt(plain: string, keyHex: string): EncryptedBlob {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) throw new Error('MASTER_KEY 必须是 32 字节 hex（64 字符）');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

export function decrypt(blob: EncryptedBlob, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(blob.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(blob.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
