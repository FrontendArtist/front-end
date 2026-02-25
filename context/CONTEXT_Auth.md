#CONTEXT_Auth.md

## 🎯 Purpose
Implementation of the Authentication system using **NextAuth.js** with a custom **OTP (SMS) Provider**.
The strategy follows a **Lazy Registration** flow: Users can browse as guests, but must authenticate at Checkout.

---

## 📂 Architecture & File Structure
- **Config:** `src/lib/auth.js` (NextAuth Configuration).
- **API:** `src/app/api/auth/[...nextauth]/route.js` (Route Handler).
- **State:** `src/store/authStore.js` (Zustand store for Modal visibility).
- **UI:** - `src/components/auth/AuthModal.jsx` (Main Modal).
  - `src/components/auth/PhoneInput.jsx` (Step 1).
  - `src/components/auth/OTPInput.jsx` (Step 2).

---

## 🌐 Data Source (Strapi Custom API)
We have validated these endpoints in Strapi:
1. **Send OTP:** `POST /api/auth/otp/send` | Body: `{ "phoneNumber": "09..." }`
2. **Verify OTP:** `POST /api/auth/otp/verify` | Body: `{ "phoneNumber": "...", "otpCode": "..." }` | Response: `{ "jwt": "...", "user": { ... } }`

---

## 🧠 Auth Flow Logic
1. **Trigger:** `openAuthModal()` is called from Navbar or Checkout.
2. **Step 1 (Phone):** User enters phone -> API `/send` -> Next Step.
3. **Step 2 (OTP):** User enters code -> NextAuth `signIn('otp-login', { phoneNumber, otpCode })`.
4. **Success:** Modal closes, user is logged in.

---

## 🎨 Design Rules (from styles.md)
- Use `styles/modules/AuthModal.module.scss` for styling.
- **Glassmorphism:** Use `backdrop-filter: blur` for modal overlay.
- **Inputs:** High contrast text (`--color-text-primary`), styled borders.
- **Animation:** Smooth fade-in for modal and step transitions.