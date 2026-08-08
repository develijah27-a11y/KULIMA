// Next.js middleware entry point.
// All logic lives in src/proxy.ts — this file just re-exports it so
// Next.js can pick it up at the project root. `config` must be a locally
// defined export (not a re-export passthrough) or Turbopack can't
// statically parse it: "Next.js can't recognize the exported `config`
// field in route. It mustn't be reexported."
import { proxy, config as proxyConfig } from '@/proxy';

export const middleware = proxy;
export const config = proxyConfig;
