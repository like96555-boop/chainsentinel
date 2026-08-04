import fs from 'fs';
import path from 'path';
import { encrypt, decrypt, EncryptedBlob } from './crypto';
import { getMasterKey } from './master-key';

export const SECRET_KEYS = ['KIMI_API_KEY', 'KIMI_BASE_URL', 'TRONGRID_API_KEY'] as const;
export type SecretKey = (typeof SECRET_KEYS)[number];

const STORE_PATH = path.join(process.cwd(), 'data', 'secrets.enc.json');

type Store = Partial<Record<SecretKey, EncryptedBlob>>;

let cache: Store | null = null;

function loadStore(): Store {
  if (cache) return cache;
  try {
    if (fs.existsSync(STORE_PATH)) {
      cache = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as Store;
      return cache!;
    }
  } catch (e) {
    console.error('[ChainSentinel] secrets.enc.json 读取失败，按空存储处理。', e);
  }
  cache = {};
  return cache;
}

function saveStore(store: Store) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  cache = store;
}

/** 服务端读取明文密钥：加密存储优先，其次环境变量。绝不返回给客户端。 */
export function getSecret(key: SecretKey): string {
  const store = loadStore();
  const blob = store[key];
  if (blob) {
    try {
      return decrypt(blob, getMasterKey());
    } catch (e) {
      console.error(`[ChainSentinel] 密钥 ${key} 解密失败（MASTER_KEY 是否变更？），回退环境变量。`, e);
    }
  }
  return process.env[key]?.trim() || '';
}

export function secretSource(key: SecretKey): 'store' | 'env' | 'none' {
  const store = loadStore();
  if (store[key]) return 'store';
  if (process.env[key]?.trim()) return 'env';
  return 'none';
}

/** 写入（覆盖）一个或多个密钥，AES-256-GCM 加密落盘。空字符串表示删除存储值。 */
export function setSecrets(input: Partial<Record<SecretKey, string>>) {
  const store = { ...loadStore() };
  const mk = getMasterKey();
  for (const k of Object.keys(input) as SecretKey[]) {
    const v = input[k];
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (trimmed === '') {
      delete store[k];
    } else {
      store[k] = encrypt(trimmed, mk);
    }
  }
  saveStore(store);
}

export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

/** 仅返回掩码，绝不包含明文。 */
export function getMaskedSecrets() {
  return SECRET_KEYS.map((key) => {
    const source = secretSource(key);
    const value = source === 'none' ? '' : getSecret(key);
    return {
      key,
      configured: value.length > 0,
      source,
      masked: value ? maskSecret(value) : '',
    };
  });
}
