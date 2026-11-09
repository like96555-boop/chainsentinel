'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, Eye, Save } from 'lucide-react';
import { getJson } from './adminData';
import { Badge, Button, Card, ErrorNote, PageHeader, inputCls } from './ui';

interface AiConfig {
  enabled: boolean;
  model: string;
  temperature: number;
  greeting: string;
  systemPrompt: string;
  faqItems: string[];
  quickQuestions: string[];
}

function linesToText(arr: string[]) {
  return (arr || []).join('\n');
}
function textToLines(s: string) {
  return s.split('\n').map((l) => l.trim()).filter(Boolean);
}

export default function AiAssistant({ refreshToken }: { refreshToken: number }) {
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [quick, setQuick] = useState('');
  const [faq, setFaq] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const j = await getJson<{ config: AiConfig }>('/api/admin/ai-config');
      setCfg(j.config);
      setQuick(linesToText(j.config.quickQuestions));
      setFaq(linesToText(j.config.faqItems));
      setError('');
    } catch {
      setError('配置读取失败，请确认已登录且服务端已部署最新代码。');
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshToken]);

  function patch(p: Partial<AiConfig>) {
    setCfg((c) => (c ? { ...c, ...p } : c));
    setMsg('');
  }

  async function save() {
    if (!cfg) return;
    const payload: AiConfig = {
      ...cfg,
      model: cfg.model.trim(),
      systemPrompt: cfg.systemPrompt,
      quickQuestions: textToLines(quick),
      faqItems: textToLines(faq),
    };
    if (!payload.model) { setError('模型名不能为空。'); return; }
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) setError(j?.error || `保存失败（HTTP ${res.status}）`);
      else { setCfg(j.config || payload); setMsg('已保存并立即生效，本次修改已记入操作日志。'); }
    } catch {
      setError('网络异常，配置未保存。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI 客服配置"
        subtitle="独立 AI 管理台撤除后，这里是编辑 data/ai-config.json 的唯一入口；主站客服窗口与后台共用同一份配置。"
        action={<Badge tone={cfg?.enabled ? 'green' : 'amber'}>{cfg ? (cfg.enabled ? '客服已启用' : '客服已关闭') : '读取中'}</Badge>}
      />
      {error && <ErrorNote text={error} />}
      {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">{msg}</div>}

      {!cfg ? (
        <Card className="p-10 text-center text-[13px] text-zinc-500">正在读取配置…</Card>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-zinc-900">基础设置</h2>
                <button
                  onClick={() => patch({ enabled: !cfg.enabled })}
                  className={`relative h-6 w-11 rounded-full transition ${cfg.enabled ? 'bg-blue-600' : 'bg-zinc-300'}`}
                  aria-label="切换客服开关"
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${cfg.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">关闭后公开侧客服窗口不再展示 AI 问答，筛查服务不受影响。</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-medium text-zinc-600">模型</span>
                  <input value={cfg.model} onChange={(e) => patch({ model: e.target.value })} className={`mt-1.5 ${inputCls} font-mono`} placeholder="kimi-for-coding" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-zinc-600">温度 · {cfg.temperature.toFixed(1)}</span>
                  <input
                    type="range" min={0} max={2} step={0.1}
                    value={cfg.temperature}
                    onChange={(e) => patch({ temperature: Number(e.target.value) })}
                    className="mt-3 w-full accent-blue-600"
                  />
                  <span className="mt-1 block text-[10px] text-zinc-400">0 更确定 · 2 更发散；客服场景建议 0.3–0.7</span>
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-[11px] font-medium text-zinc-600">问候语</span>
                <input value={cfg.greeting} onChange={(e) => patch({ greeting: e.target.value })} className={`mt-1.5 ${inputCls}`} maxLength={300} />
              </label>

              <label className="mt-4 block">
                <span className="text-[11px] font-medium text-zinc-600">系统提示词</span>
                <textarea
                  value={cfg.systemPrompt}
                  onChange={(e) => patch({ systemPrompt: e.target.value })}
                  rows={5}
                  maxLength={8000}
                  className={`mt-1.5 resize-y ${inputCls} font-mono text-[12px] leading-relaxed`}
                />
                <span className="mt-1 block text-[10px] text-zinc-400">仅服务端使用，公开的 /api/ai-config 不会下发提示词全文。</span>
              </label>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Eye size={15} className="text-zinc-400" />
                <h2 className="text-[14px] font-semibold text-zinc-900">公开侧预览</h2>
              </div>
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600"><Bot size={14} className="text-white" /></div>
                  <span className="text-[12px] font-medium text-zinc-800">链哨 AI 客服</span>
                  <Badge tone={cfg.enabled ? 'green' : 'neutral'}>{cfg.enabled ? '在线' : '已关闭'}</Badge>
                </div>
                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[12px] text-zinc-700 shadow-sm">{cfg.greeting || '（未设置问候语）'}</p>
                <div className="mt-3 space-y-1.5">
                  {textToLines(quick).length === 0 && <p className="text-[11px] text-zinc-400">未设置快捷问题</p>}
                  {textToLines(quick).slice(0, 5).map((q) => (
                    <div key={q} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-blue-700">{q}</div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
                预览直接取自当前表单，未保存的改动也会显示；保存后服务端缓存会即时刷新，公开端点最多 30 秒内生效。
              </p>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-[14px] font-semibold text-zinc-900">快捷问题</h2>
              <p className="mt-1 text-[11px] text-zinc-500">每行一条，展示在客服窗口首屏，最多 20 条。</p>
              <textarea value={quick} onChange={(e) => { setQuick(e.target.value); setMsg(''); }} rows={5} className={`mt-3 resize-y ${inputCls}`} placeholder={'这是什么产品\n多少钱\n怎么接入'} />
            </Card>
            <Card className="p-5">
              <h2 className="text-[14px] font-semibold text-zinc-900">FAQ 知识库</h2>
              <p className="mt-1 text-[11px] text-zinc-500">每行一条，会拼进 system 消息；不确定时要求模型如实回答并引导人工。</p>
              <textarea value={faq} onChange={(e) => { setFaq(e.target.value); setMsg(''); }} rows={5} className={`mt-3 resize-y ${inputCls}`} placeholder={'支持 TRON / BTC / ETH 地址\n免费层无需注册，30 次/分钟/IP'} />
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={saving}><Save size={14} /> 保存配置</Button>
            <Button variant="secondary" onClick={load}>放弃改动并重载</Button>
            <span className="text-[11px] text-zinc-400">保存会原子写入 data/ai-config.json，并记入操作日志。</span>
          </div>
        </>
      )}
    </div>
  );
}
