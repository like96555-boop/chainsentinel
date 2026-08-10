'use client';

import { useEffect, useState } from 'react';

/** 导航栏登录入口：未登录显示「登录 / 注册」，已登录显示账号 + 我的订阅 */
export default function LoginButton() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setEmail(j?.email || null))
        .catch(() => setEmail(null));
    };
    check();
    const timer = setInterval(check, 8000); // 轮询兜底（跨标签页登出/登录同步）
    window.addEventListener('cs-auth-changed', check);
    return () => { clearInterval(timer); window.removeEventListener('cs-auth-changed', check); };
  }, []);

  if (email) {
    const short = email.length > 22 ? email.slice(0, 20) + '…' : email;
    return (
      <a
        href="/dashboard"
        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/20"
        title="我的订阅"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {short}
      </a>
    );
  }
  return (
    <a
      href="/dashboard"
      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7170ff] to-[#9d8cff] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
    >
      登录 / 注册
    </a>
  );
}
