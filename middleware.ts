// Next.js middleware entry point.
// All logic lives in src/proxy.ts — this file just re-exports the function
// so Next.js can pick it up at the project root. `config` must be a static
// object literal declared right here, or Turbopack can't statically parse
// it: "Next.js can't recognize the exported `config` field in route. It
// needs to be a static object." Keep this in sync with src/proxy.ts's own
// `config` export if that matcher ever changes.
import { proxy } from '@/proxy';

export const middleware = proxy;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
