import { NextResponse } from 'next/server';
import { logSystemEvent } from '@/lib/system-log';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-client';
    // Limit to 20 client error reports per minute per IP to avoid flood
    if (!(await rateLimit(`client-error:${ip}`, 20, 60))) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    logSystemEvent({
      category: 'error',
      level: 'error',
      route: body.url ? String(body.url).slice(0, 150) : '/client/unhandled',
      method: 'CLIENT',
      message: `[Client Error] ${body.message.slice(0, 450)}`,
      metadata: {
        stack: body.stack ? String(body.stack).slice(0, 1000) : undefined,
        userAgent: req.headers.get('user-agent')?.slice(0, 200),
        component: body.component || undefined,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
