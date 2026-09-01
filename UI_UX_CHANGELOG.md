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

### [2026-09-01] — Phase 9: Native Biometric Sign-in Experience
- **Screen/Component**: `src/features/auth/components/AuthForm.tsx` & `src/components/settings/PasskeySettings.tsx`
- **Change**: Eliminated intermediate instruction strings ("Follow prompt on your device…"). Implemented immediate WebAuthn native biometric invocation with seamless status handling: non-error user cancellation banner (`Biometric sign-in was cancelled.`), clear failure handling (`Biometric verification failed.`), non-enrolled device guidance, and direct action buttons (`[ Try again ]` and `[ Use password ]`).
- **Reason**: Fulfill Requirement 53 — native biometric authentication experience with zero artificial friction and robust fallback handling.
- **Files Modified**: `src/features/auth/components/AuthForm.tsx`, `src/components/settings/PasskeySettings.tsx`
- **Functionality Affected?**: Biometric sign-in UX (WebAuthn/Passkey cryptography and session security preserved).
- **Regression Test**: Verified native WebAuthn invocation, cancellation dismissal, password focus fallback, and TypeScript compilation.
- **Notes**: Native mobile-first authentication flow.

---

