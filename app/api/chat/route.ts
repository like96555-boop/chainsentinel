import { NextResponse } from 'next/server';
import { chatSchema } from '@/lib/validation';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { getSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `你是「链哨 ChainSentinel」的官方 AI 客服，用简洁专业的中文回答。
产品 FAQ：
- 产品是什么：链哨 ChainSentinel 是面向商户与机构的链上风控 SaaS，专注 TRON 网络 USDT 收款前的地址风险识别——3 秒内判断对手方地址是否疑似黑钱/诈骗/混币资金，帮助商户避免收到"脏 U"导致账户被冻结。
- 核心能力：地址监控、收款前拦截（Payment Firewall）、税务合规报表、聪明钱追踪（Pro）。
- 定价：社区版免费（每日 100 次查询）；专业版 ¥9,800/年（无限查询、API 接入、Webhook 告警、聪明钱追踪）；商业授权 ¥50,000 起（私有化部署、源码授权、定制标签库）。
- 如何接入：专业版开放 REST API 与 Webhook，10 行代码即可嵌入收银台；官网底部预约表单可申请试用，或直接联系销售。
- 合规定位：ChainSentinel Limited 注册于香港，提供 RWA 与稳定币合规咨询；风控结果仅为风险提示，不构成法律意见。
回答时语气专业克制，不夸大，不做投资/法律建议。回答控制在 200 字以内。`;

function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // 模拟逐段输出，保持客户端流式体验一致
      const chunks = text.match(/.{1,12}/gs) || [text];
      let i = 0;
      const push = () => {
        if (i < chunks.length) {
          controller.enqueue(encoder.encode(chunks[i++]));
          setTimeout(push, 30);
        } else {
          controller.close();
        }
      };
      push();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`chat:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试（每 IP 每分钟 10 次）' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体必须是 JSON' }, { status: 400 });
  }
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || '参数校验失败' },
      { status: 400 }
    );
  }

  const apiKey = getSecret('KIMI_API_KEY');
  const baseUrl = (getSecret('KIMI_BASE_URL') || 'https://api.kimi.com/coding/v1').replace(/\/+$/, '');

  if (!apiKey) {
    return streamText(
      'AI 客服暂未配置模型密钥，暂时无法提供智能问答。请站点管理员前往 /admin 管理后台配置 KIMI_API_KEY 后重试。您也可以直接查看页面上的产品介绍、定价与预约入口。'
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(60_000),
      cache: 'no-store',
      body: JSON.stringify({
        model: 'kimi-for-coding',
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: parsed.data.message },
        ],
      }),
    });
  } catch (e) {
    console.error('[ChainSentinel] Kimi 上游连接失败', e);
    return streamText('AI 客服暂时无法连接模型服务，请稍后再试，或通过页面底部预约表单联系我们。');
  }

  if (!upstream.ok || !upstream.body) {
    return streamText(`AI 客服上游服务返回异常（HTTP ${upstream.status}），请稍后再试。`);
  }

  // 解析 OpenAI 兼容 SSE，转为纯文本流输出给前端
  // 注意：kimi 推理模型会先流式输出 delta.reasoning_content（思考过程），
  // 若干秒后才开始输出 delta.content（正文）。因此：
  // 1) 上游连接后立即发心跳字节，让客户端立刻有响应（避免"卡死"感）；
  // 2) 思考期间有字节活动但不下发；30 秒无任何字节则判定异常，友好收尾。
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      let closed = false;
      let gotContent = false;
      let lastActivity = Date.now();

      const close = () => {
        if (!closed) { closed = true; try { controller.close(); } catch { /* noop */ } }
      };

      // 心跳：立即下发，客户端即刻有反馈
      controller.enqueue(encoder.encode(''));

      // 空闲看门狗
      const watchdog = setInterval(() => {
        if (Date.now() - lastActivity > 30_000) {
          clearInterval(watchdog);
          if (!gotContent) {
            try { controller.enqueue(encoder.encode('\n（模型响应超时，请稍后再试，或通过页面底部预约表单联系我们。）')); } catch { /* noop */ }
          }
          reader.cancel().catch(() => undefined);
          close();
        }
      }, 5_000);

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          lastActivity = Date.now();
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const payload = t.slice(5).trim();
            if (payload === '[DONE]') { clearInterval(watchdog); close(); return; }
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === 'string' && delta) {
                gotContent = true;
                controller.enqueue(encoder.encode(delta));
              }
              // delta.reasoning_content（思考过程）仅视为活动信号，不下发
            } catch {
              // 忽略不完整分片
            }
          }
        }
      } catch {
        if (!gotContent) {
          try { controller.enqueue(encoder.encode('（连接中断，请稍后再试。）')); } catch { /* noop */ }
        }
      } finally {
        clearInterval(watchdog);
        close();
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
