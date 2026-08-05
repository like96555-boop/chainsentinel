import { z } from 'zod';

// TRON 主网地址：T 开头 + base58（去掉 0OIl），共 34 字符
export const tronAddressSchema = z
  .string()
  .regex(/^T[1-9A-HJ-NP-Za-km-z]{33}$/, '无效的 TRON 地址格式（应为 T 开头 34 位 base58）');

// 多链检测：此处只做类型与长度约束，具体链格式由 lib/chains.ts 识别后给出 400 提示
export const checkSchema = z.object({
  address: z.string().min(1, '地址不能为空').max(128, '地址过长'),
});

export const chatSchema = z.object({
  message: z.string().min(1, '消息不能为空').max(500, '消息过长'),
});

export const loginSchema = z.object({
  password: z.string().min(1).max(128),
});

export const leadSchema = z.object({
  name: z.string().min(1, '请填写姓名/称呼').max(64),
  contact: z.string().min(3, '请填写联系方式').max(128),
  company: z.string().max(128).optional().default(''),
  interest: z.enum(['rwa', 'stablecoin', 'api', 'license', 'other']).optional().default('other'),
  message: z.string().max(500).optional().default(''),
});

export const secretsPutSchema = z
  .object({
    KIMI_API_KEY: z.string().max(256).optional(),
    KIMI_BASE_URL: z.string().max(256).optional(),
    TRONGRID_API_KEY: z.string().max(256).optional(),
  })
  .refine((o) => Object.values(o).some((v) => typeof v === 'string'), {
    message: '至少提供一个密钥字段',
  });
