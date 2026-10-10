// src/proxy.ts
// Vercel上では管理画面とAPIを404にする（確実に404状態を返すための前段。layoutと各routeの判定は残す）。
import { NextResponse } from 'next/server';

export function proxy(): NextResponse | undefined {
  if (process.env.VERCEL === '1') {
    return new NextResponse('Not Found', { status: 404 });
  }
  return undefined;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
