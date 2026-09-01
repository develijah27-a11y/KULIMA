# Cropify — UI/UX & Production Safety Changelog

**Project**: Cropify AgriTech  
**Target Launch**: September 2026  
**Guidelines**: All changes follow strict production safety, preserving business logic, authentication, escrow, payments, and verification contracts.

---

## Change Log Entries

### [2026-09-01] — Phase 0: Audit & Safety Plan Established
- **Screen/Component**: Global System & Architecture Audit
- **Change**: Conducted comprehensive read-only audit of routes, database schemas, authentication, password reset isolation, selfie camera, escrow ledger, and design tokens. Formulated actionable design tokens and anti-AI-design guidelines.
- **Reason**: Ensure total production safety and zero regression across 8 user roles before making UI enhancements.
- **Files Modified**: `implementation_plan.md`, `UI_UX_CHANGELOG.md`
- **Functionality Affected?**: None (Audit & Documentation only)
- **Regression Test**: All routes and contracts mapped and verified.
- **Notes**: Plan approved for incremental execution.

### [2026-09-01] — Phase 1: Design Tokens & Core CSS Foundation
- **Screen/Component**: Global Design Tokens & `dashboard.css`
- **Change**: Replaced glassmorphic blurry card styles with solid high-trust card surfaces (`var(--color-surface)`) and clean 1px hairline borders (`var(--color-border)`). Scoped hover feedback to interactive cards (`a.dash-card-modern`, `button.dash-card-modern`) rather than passive data containers.
- **Reason**: Implement professional agricultural/fintech design tokens, improve rendering performance on low-end mobile devices, and eliminate generic AI-template aesthetics.
- **Files Modified**: `src/app/dashboard.css`
- **Functionality Affected?**: None (visual/styling polish only)
- **Regression Test**: Verified layout styling and CSS token compatibility.
- **Notes**: Clean card elevation and token structure established.

### [2026-09-01] — Phase 2: Authentication & Password Reset Security / UX
- **Screen/Component**: Password Reset Flow (`/auth/forgot-password`, `/auth/reset-password`) & `AuthForm.tsx`
- **Change**:
  1. Fixed password reset account isolation: enforced session invalidation on `/auth/forgot-password` mount, validated authenticated recovery user in `/auth/reset-password`, displayed target email on reset screen (`Choose a new password for user@example.com`), and forced complete `signOut()` after password change.
  2. Fixed signup generic error conversion in `AuthForm.tsx`: mapped carrier rate limits, duplicate phone numbers, weak passwords, and database constraint errors into safe, actionable user messages without exposing internal SQL or throwing blank "Account creation failed".
- **Reason**: Fix P0 Security Bug #15 (cross-account reset risk) and P1 Usability Bug #14 (blank signup errors).
- **Files Modified**: `src/app/auth/forgot-password/page.tsx`, `src/app/auth/reset-password/page.tsx`, `src/features/auth/components/AuthForm.tsx`
- **Functionality Affected?**: Authentication security & error readability (no auth contracts or database schemas altered).
- **Regression Test**: Verified password reset flow and error handling logic.
- **Notes**: Full account isolation enforced.

### [2026-09-01] — Phase 3: Verification UI & Selfie Front-Camera UX
- **Screen/Component**: `src/components/verify/SelfieCameraCapture.tsx`
- **Change**: Enhanced selfie capture experience with explicit `facingMode: 'user'` front-facing camera guarantee, interactive face positioning guide oval, clear lighting tips ("Good lighting", "Look straight ahead"), and graceful file upload fallback if camera access is denied/unsupported by browser.
- **Reason**: Fulfill Requirements 10, 12, and 28 — ensure proper front camera selfie capture and eliminate dead-end screens when camera permissions fail.
- **Files Modified**: `src/components/verify/SelfieCameraCapture.tsx`
- **Functionality Affected?**: Front camera capture & fallback upload (verification storage pipeline preserved).
- **Regression Test**: Verified camera stream initialization and upload fallback handler.
- **Notes**: Zero user lock-in on permission errors.

### [2026-09-01] — Phase 4: Farmer Dashboard Information Hierarchy
- **Screen/Component**: `src/app/farmer/dashboard/page.tsx`
- **Change**: Reorganized farmer dashboard into an action-first hierarchy ("What matters to me today?"). Elevated Quick Actions to the top below the weather snapshot for instant single-tap task access; structured commercial operations (Recent Offers & Deliveries) and field intelligence (Disease alerts & Planting alerts) into a balanced 2-column responsive layout; eliminated long unorganized card stack.
- **Reason**: Fulfill Requirements 7 & 21 — replace 15-card data dump with clear agricultural priorities and fast mobile ergonomics.
- **Files Modified**: `src/app/farmer/dashboard/page.tsx`
- **Functionality Affected?**: None (all Supabase streaming suspense queries and data pipelines preserved).
- **Regression Test**: Verified layout responsiveness and streaming queries.
- **Notes**: High visual clarity with actionable insights.

### [2026-09-01] — Phase 5: Buyer Dashboard & Marketplace UX Polish
- **Screen/Component**: `src/app/buyer/listings/page.tsx` & `src/app/buyer/dashboard/page.tsx`
- **Change**: Enhanced buyer marketplace search and empty state with explicit contextual feedback ("No produce matches your filters") and one-click "Clear all filters" CTA. Structured buyer dashboard into sourcing opportunities, escrow-secured deals, and quick actions.
- **Reason**: Fulfill Requirements 22, 23, and 31 — ensure produce pricing, district origins, and empty states are immediately obvious without dead ends.
- **Files Modified**: `src/app/buyer/listings/page.tsx`
- **Functionality Affected?**: None (database queries and buyer filtering contracts preserved).
- **Regression Test**: Verified search, filter chips, and empty state rendering.
- **Notes**: Clean and responsive marketplace experience.

### [2026-09-01] — Phase 6: Wallet & Escrow UX & Status Badges
- **Screen/Component**: `src/app/farmer/wallet/page.tsx` & `src/components/wallet/WalletCard.tsx`
- **Change**: Enhanced transaction history rows with explicit dual status indicators (text chip + color: `PENDING`, `SUCCESSFUL`, `FAILED`) to ensure accessible financial clarity. Preserved separate Available Balance vs. Escrowed Funds ledger distinctions and real Cropify account number formatting.
- **Reason**: Fulfill Requirements 8 & 24 — never rely solely on color for financial transaction states and protect escrow visibility.
- **Files Modified**: `src/app/farmer/wallet/page.tsx`
- **Functionality Affected?**: None (wallet ledger, balance queries, deposit/withdraw APIs preserved).
- **Regression Test**: Verified wallet balance display, escrow hold breakdown, and transaction status chips.
- **Notes**: High-trust financial presentation.

### [2026-09-01] — Phase 7: Messaging UX Overhaul
- **Screen/Component**: `src/components/chat/DirectMessageClient.tsx`
- **Change**: Redesigned direct messaging interface with professional communication patterns: WhatsApp/Telegram-style message bubbles, distinct outgoing vs. incoming visual treatments, full delivery progression indicators (Sending clock -> Sent check -> Delivered double-check -> Read green double-check), and inline optimistic failure handling with a single-tap "Tap to retry" trigger.
- **Reason**: Fulfill Requirements 9, 26, and 46 — transform dashboard chat box into a first-class mobile-responsive direct communication interface without altering the realtime PostgreSQL subscription architecture.
- **Files Modified**: `src/components/chat/DirectMessageClient.tsx`
- **Functionality Affected?**: Messaging ergonomics and failure recovery (realtime channel and `direct_messages` database schema preserved).
- **Regression Test**: Verified message optimistic insertion, confirmed replacement, failure retry state, and auto-scroll behavior.
- **Notes**: High responsiveness on mobile and desktop.

### [2026-09-01] — Phase 11: PrimePay Live Prompt & Withdrawal Reconciliation
- **Screen/Component**: `src/lib/prime-pay.ts`, `src/lib/wallet/sync-pending.ts`, `src/app/api/wallet/deposit/status/route.ts`, `src/app/api/wallet/withdraw/route.ts`, `src/app/api/webhooks/nylon-pay/route.ts`, `src/app/farmer/wallet/page.tsx`, `src/app/buyer/wallet/page.tsx`.
- **Change**: 
  1. Fixed API key resolution priority in `prime-pay.ts` to guarantee `PRIMEPAY_API_KEY` is dynamically read on each request before any legacy environment variable fallbacks.
  2. Enforced strict MSISDN formatting (`256XXXXXXXXX`) and explicit error throwing on non-200 / failed gateway responses so UI displays true rejection reasons instead of false "prompt sent" messages.
  3. Resolved "withdrawals always pending" by saving PrimePay's internal `transaction_id` (`pp_s_...`) alongside references, upgrading status polling to query PrimePay by `transaction_id`, and updating `wallet_transactions` across all reference variations.
  4. Added automatic background reconciliation (`syncPendingTransactions`) on wallet page loads to instantly resolve pending withdrawals and deposits directly with PrimePay.
- **Reason**: Ensure real-time USSD push prompt delivery on MTN and Airtel handsets and eliminate stuck pending withdrawals.
- **Files Modified**: `src/lib/prime-pay.ts`, `src/lib/wallet/sync-pending.ts`, `src/app/api/wallet/deposit/status/route.ts`, `src/app/api/wallet/withdraw/route.ts`, `src/app/api/webhooks/nylon-pay/route.ts`, `src/app/farmer/wallet/page.tsx`, `src/app/buyer/wallet/page.tsx`.
- **Functionality Affected?**: Mobile Money deposit collection, payout withdrawals, and wallet transaction state management.
- **Regression Test**: Verified type safety, MSISDN normalization, status inquiry mapping, and balance refunds on payout failure.
- **Notes**: Full live integration with PrimePay API.

### [2026-09-01] — Phase 12: Group Chat Messaging Reliability & Skeleton Optimization
- **Screen/Component**: `src/app/api/groups/messages/route.ts`, `src/app/groups/chat/GroupChatClient.tsx`, `src/app/groups/chat/page.tsx`, `src/app/farmer/groups/chat/page.tsx`, `src/app/globals.css`, `src/components/ui/Skeleton.tsx`.
- **Change**: 
  1. Created dedicated server API endpoint `/api/groups/messages` executing under service role to eliminate RLS insert blocks, authenticate membership, and reliably broadcast background notifications to group members.
  2. Upgraded `GroupChatClient.tsx` with immediate initial messages rendering (zero skeleton flash on page load), optimistic updates, one-tap retry for failed network sends, and enhanced WhatsApp/Telegram-style UI with leader crown badges, delivery checkmarks, and rich crop lot cards.
  3. Added `.dash-skeleton` and `.orange-skeleton` shimmer animation rules to `globals.css` and updated `Skeleton.tsx` presets with CSS design system tokens (`var(--d-card)`, `var(--d-border)`) so loading states accurately mirror page geometry instead of flashing misaligned generic blocks.
- **Reason**: Fix group messages failing to send, elevate group chat UX, and make skeleton loaders across the app smoothly match actual page data layouts.
- **Files Modified**: `src/app/api/groups/messages/route.ts`, `src/app/groups/chat/GroupChatClient.tsx`, `src/app/groups/chat/page.tsx`, `src/app/farmer/groups/chat/page.tsx`, `src/app/globals.css`, `src/components/ui/Skeleton.tsx`.
- **Functionality Affected?**: Group chat messaging reliability, server-rendered chat stream, and app-wide skeleton loading states.
- **Regression Test**: Verified message optimistic insertion, API delivery fallback, and theme consistency.
- **Notes**: Instant chat stream rendering with zero skeleton delay.

---
