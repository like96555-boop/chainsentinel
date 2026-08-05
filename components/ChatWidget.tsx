'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Tag } from 'lucide-react';

interface Msg {
  role: 'user' | 'bot';
  text: string;
}

const QUICK = ['这是什么产品', '多少钱', '怎么接入'];

// 回答涉及价格时，底部常驻「查看定价」锚点
const PRICE_RE = /价格|定价|多少钱|费用|¥|年费|收费/;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: '您好，我是链哨 AI 客服。可以问我产品、定价或接入方式。' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 外部联动（如 RWA 表单提交成功后自动打开并预填）
  useEffect(() => {
    function onOpen(e: Event) {
      const prefill = (e as CustomEvent<{ prefill?: string }>).detail?.prefill;
      setOpen(true);
      if (prefill) setInput(prefill);
    }
    window.addEventListener('cs:open-chat', onOpen);
    return () => window.removeEventListener('cs:open-chat', onOpen);
  }, []);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: 'user', text: q }, { role: 'bot', text: '' }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const errText = j?.error || `服务异常（HTTP ${res.status}）`;
        setMsgs((m) => {
          const next = [...m];
          next[next.length - 1] = { role: 'bot', text: errText };
          return next;
        });
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMsgs((m) => {
          const next = [...m];
          next[next.length - 1] = { role: 'bot', text: next[next.length - 1].text + chunk };
          return next;
        });
      }
    } catch {
      setMsgs((m) => {
        const next = [...m];
        next[next.length - 1] = { role: 'bot', text: '网络异常，请稍后再试。' };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        aria-label="打开 AI 客服"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-neon-cyan/90 text-cyber-950 shadow-lg shadow-neon-cyan/30 transition hover:scale-105"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 right-5 z-50 flex h-[460px] w-[340px] flex-col overflow-hidden rounded-2xl border border-cyber-700 bg-cyber-900/95 shadow-2xl backdrop-blur"
          >
            <div className="border-b border-cyber-700 bg-cyber-800/70 px-4 py-3">
              <p className="text-sm font-semibold text-neon-cyan">链哨 AI 客服</p>
              <p className="text-xs text-slate-400">7×24 在线 · 流式应答</p>
            </div>

            <div ref={boxRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[80%] rounded-xl rounded-br-sm bg-neon-cyan/20 px-3 py-2 text-sm text-slate-100'
                        : 'max-w-[85%] rounded-xl rounded-bl-sm bg-cyber-800 px-3 py-2 text-sm text-slate-200'
                    }
                  >
                    {m.text ||
                      (busy && i === msgs.length - 1 ? (
                        <Loader2 size={14} className="animate-spin text-slate-400" />
                      ) : null)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 px-3 pb-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={busy}
                  className="rounded-full border border-cyber-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-neon-cyan/60 hover:text-neon-cyan disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* 涉及价格的回答 → 常驻「查看定价」转化锚点 */}
            {msgs.some((m) => m.role === 'bot' && PRICE_RE.test(m.text)) && (
              <div className="border-t border-cyber-700/60 px-3 py-1.5">
                <a
                  href="#pricing"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 text-xs text-neon-yellow transition hover:text-neon-cyan"
                >
                  <Tag size={12} /> 查看定价，锁定专业版优惠 →
                </a>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-cyber-700 p-2.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                placeholder="输入您的问题…"
                className="flex-1 rounded-lg border border-cyber-700 bg-cyber-950 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-neon-cyan/60"
              />
              <button
                onClick={() => send(input)}
                disabled={busy}
                className="rounded-lg bg-neon-cyan/90 p-2 text-cyber-950 transition hover:bg-neon-cyan disabled:opacity-40"
                aria-label="发送"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
