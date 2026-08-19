# Comprehensive Deployment & Email Configuration Guide

This guide covers everything needed to configure live transactional emails (password resets, purchase receipts, delivery confirmations), commit and push your code to Git, and deploy the application to Vercel.

---

## 1. Transactional Email Setup (Resend)

Cropify uses [Resend](https://resend.com) for fast, reliable transactional email delivery (purchase receipts, password reset links, and delivery notifications).

### Step 1: Create a Resend API Key
1. Sign up or log in at [resend.com](https://resend.com).
2. Navigate to **API Keys** -> click **Create API Key**.
3. Name it (e.g. `Cropify-Production`) with **Full Access** permissions.
4. Copy the API key (starts with `re_...`).

### Step 2: Configure Sender Domain
Set your sender in your environment variables using your verified domain:
```env
EMAIL_FROM=Cropify <noreply@cropifyapp.com>
```
*(Or `receipts@cropifyapp.com` / `support@cropifyapp.com`)*

### Step 3: Test Email Delivery
You can test and verify your email setup at any time by sending a POST request to `/api/email/test`:
```bash
# Example: Send a test purchase receipt
curl -X POST https://your-domain.vercel.app/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com", "type": "receipt"}'

# Example: Send a test password reset template
curl -X POST https://your-domain.vercel.app/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com", "type": "reset"}'
```

---

## 2. Supabase Auth Configuration for Password Reset

For password reset recovery links to redirect properly:

1. Open your **Supabase Dashboard** -> Project -> **Authentication** -> **URL Configuration**.
2. Set **Site URL** to your production URL (e.g., `https://www.cropifyapp.com` or `https://your-project.vercel.app`).
3. Under **Redirect URLs**, add:
   * `https://www.cropifyapp.com/**`
   * `https://your-project.vercel.app/**`
   * `http://localhost:3000/**` (for local development)
4. Under **Email Templates** -> **Reset Password**, ensure the action URL directs to your app's confirmation endpoint.

---

## 3. Pushing Code to Git

Make sure your local changes are committed and pushed to GitHub / GitLab:

```bash
# 1. Check current status
git status

# 2. Stage all changed files
git add .

# 3. Commit your changes
git commit -m "fix(email): resolve password reset and receipt delivery, modernize jest & cleanup repo"

# 4. Push to remote repository (main or your branch)
git push origin main
```

---

## 4. Deploying to Vercel

### Step 1: Import Repository to Vercel
1. Go to [vercel.com/new](https://vercel.com/new).
2. Connect your GitHub/GitLab repository.
3. Select **Framework Preset**: `Next.js`.
4. Leave **Build Command** default (`next build && node scripts/build-sw.mjs` is handled by `vercel.json`).

### Step 2: Add Environment Variables in Vercel
In Vercel -> Project Settings -> **Environment Variables**, add the following required keys:

| Variable Name | Required | Description / Example |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Supabase Project Settings -> API -> `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase Project Settings -> API -> `service_role` secret key |
| `NEXTAUTH_SECRET` | **Yes** | Random 32+ character string (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://www.cropifyapp.com` (or your Vercel deployment URL) |
| `RESEND_API_KEY` | **Yes** | `re_123456789...` from [resend.com/api-keys](https://resend.com/api-keys) |
| `EMAIL_FROM` | **Yes** | `Cropify <noreply@cropifyapp.com>` |
| `NODE_ENV` | **Yes** | `production` |
| `NYLON_PAY_PUBLIC_KEY` | Optional | Nylon Pay public key for escrow payments |
| `NYLON_PAY_SECRET_KEY` | Optional | Nylon Pay secret key |
| `NYLON_PAY_WEBHOOK_SECRET` | Optional | Nylon Pay webhook secret |
| `OPENWEATHER_API_KEY` | Optional | OpenWeatherMap API key |
| `AFRICASTALKING_USERNAME` | Optional | Africa's Talking SMS username |
| `AFRICASTALKING_API_KEY` | Optional | Africa's Talking SMS API key |
| `GOOGLE_CLOUD_API_KEY` | Optional | Google Vision / Cloud API key |

### Step 3: Trigger Deployment
* After saving the environment variables, trigger a deploy from Vercel by clicking **Redeploy** or simply pushing a new commit to your Git repository.
* Vercel will automatically build the Next.js app, bundle the service worker, and deploy your live site.
