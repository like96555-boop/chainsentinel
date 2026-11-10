'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  /** 静态资源（llms.txt / JSON / 外部站点）：走原生链接，避免 Next 路由误匹配 */
  external?: boolean;
  children: ReactNode;
};

/**
 * 站内统一链接。
 *
 * 两个目的：
 * 1) 跨页用 Next 的客户端路由，不整页刷新（原生 <a> 会白屏一闪，观感像闪退）；
 * 2) 当前页面的 /#anchor 规整成 #anchor，交给浏览器原地平滑滚动，不重新请求文档。
 *    静态资源与外部链接仍用原生 <a>，可配 target/rel。
 */
export default function SmartLink({ href, external = false, children, ...rest }: Props) {
  const pathname = usePathname() || '/';

  if (external || /^(https?:|mailto:|tel:)/i.test(href)) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }

  const hashIndex = href.indexOf('#');
  const rawPath = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex + 1);
  const samePage = rawPath === '' || rawPath === pathname;
  const target = hash && samePage ? `#${hash}` : href;

  return (
    <Link href={target} {...rest}>
      {children}
    </Link>
  );
}
