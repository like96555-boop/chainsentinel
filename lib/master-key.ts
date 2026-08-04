import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * MASTER_KEY 从环境变量读取；缺失时自动生成 32 字节随机 hex 并写入项目根 .env。
 * 仅在服务端执行（lib 下所有模块均只被 API 路由引用）。
 */
let cached: string | null = null;
let warned = false;

export function getMasterKey(): string {
  if (cached) return cached;
  let key = process.env.MASTER_KEY?.trim();
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    key = crypto.randomBytes(32).toString('hex');
    const envPath = path.join(process.cwd(), '.env');
    try {
      let content = '';
      if (fs.existsSync(envPath)) content = fs.readFileSync(envPath, 'utf8');
      if (/^MASTER_KEY=.*$/m.test(content)) {
        content = content.replace(/^MASTER_KEY=.*$/m, `MASTER_KEY=${key}`);
      } else {
        content += `${content.endsWith('\n') || content === '' ? '' : '\n'}MASTER_KEY=${key}\n`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
      process.env.MASTER_KEY = key;
      if (!warned) {
        warned = true;
        console.warn(
          '[ChainSentinel][安全提示] 未检测到 MASTER_KEY，已自动生成 32 字节随机密钥并写入 .env。请妥善备份 .env，丢失 MASTER_KEY 将无法解密已存密钥。'
        );
      }
    } catch (e) {
      // 无法落盘时仅驻留内存（例如只读文件系统）
      if (!warned) {
        warned = true;
        console.warn('[ChainSentinel][安全提示] MASTER_KEY 生成成功但无法写入 .env，密钥仅驻留内存，重启后加密数据将不可解密。', e);
      }
      process.env.MASTER_KEY = key;
    }
  }
  cached = key.toLowerCase();
  return cached;
}
