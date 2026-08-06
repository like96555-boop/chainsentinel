import fs from 'fs';
import path from 'path';

// AI 客服配置读取（供主站 /api/chat 与公开配置端点使用）
// 配置由独立部署的「AI 管理台」（ai-admin/，端口 3001）写入 data/ai-config.json
export type AiConfig = {
  enabled: boolean;
  model: string;
  temperature: number;
  greeting: string;
  systemPrompt: string;
  faqItems: string[];
  quickQuestions: string[];
};

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-config.json');

const DEFAULTS: AiConfig = {
  enabled: true,
  model: 'kimi-for-coding',
  temperature: 0.5,
  greeting: '你好，我是链哨 AI 客服助手 👋',
  systemPrompt: '你是「链哨 ChainSentinel」的官方 AI 客服，用简洁专业的中文回答。',
  faqItems: [],
  quickQuestions: ['这是什么产品', '多少钱', '怎么接入'],
};

let cache: { at: number; cfg: AiConfig } | null = null;
const TTL = 30_000;

export function readAiConfig(): AiConfig {
  if (cache && Date.now() - cache.at < TTL) return cache.cfg;
  let cfg = { ...DEFAULTS };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      cfg = { ...DEFAULTS, ...raw };
      cfg.faqItems = Array.isArray(raw.faqItems) ? raw.faqItems : DEFAULTS.faqItems;
      cfg.quickQuestions = Array.isArray(raw.quickQuestions) ? raw.quickQuestions : DEFAULTS.quickQuestions;
    }
  } catch (e) {
    console.error('[ChainSentinel] ai-config.json 读取失败，使用默认配置。', e);
  }
  cache = { at: Date.now(), cfg };
  return cfg;
}

export function writeAiConfig(cfg: AiConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = CONFIG_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_PATH); // 原子写，防半截文件
  cache = { at: Date.now(), cfg };
}

/** 公开给前端的配置子集（不含 prompt 全文，避免泄露话术；含问候语/快捷问题/开关） */
export function publicAiConfig(cfg: AiConfig) {
  return {
    enabled: cfg.enabled,
    greeting: cfg.greeting,
    quickQuestions: cfg.quickQuestions,
  };
}

/** 由 systemPrompt + FAQ 知识库拼装最终 system 消息 */
export function buildSystemMessage(cfg: AiConfig): string {
  const faqBlock = cfg.faqItems.length
    ? '\n\n知识库（回答产品问题优先引用，不确定就说不知道并建议咨询客服）：\n' + cfg.faqItems.map((f) => '- ' + f).join('\n')
    : '';
  return cfg.systemPrompt + faqBlock;
}
