// Next.js middleware entry point.
// All logic lives in src/proxy.ts — this file just re-exports it so
// Next.js can pick it up at the project root.
export { proxy as middleware, config } from '@/proxy';
