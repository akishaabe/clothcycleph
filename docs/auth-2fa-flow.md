# Authentication and 2FA Flow

## Login

- The login form does not expose a "Remember me" option. Successful auth is persisted with the existing default app session behavior.
- Email/password login always requires a pre-authentication 6-digit email code unless a stronger configured 2FA method, such as Authenticator App or SMS, takes over the challenge.
- Google Sign-In bypasses the email 2FA challenge. After Google validates the account, the backend creates the ClothCycle session directly.
- The login page shows a dedicated email verification panel with a code input, Verify button, Resend code button, Back to login action, loading state, and invalid/expired-code error handling.
- If a user has SMS 2FA enabled, login prepares/sends a 6-digit SMS code and requires the code before issuing an auth token.
- If a user has Authenticator App 2FA enabled, login requires a valid TOTP code from the authenticator app.
- Email and SMS login codes expire after 10 minutes. Resend issues a new code and replaces the previous pending code.
- Pre-authentication 2FA responses do not include a dashboard token. Existing stored auth state is cleared when a login attempt returns a 2FA challenge, so dashboard access remains blocked until code verification succeeds.
- The signed pre-authentication challenge token is kept in `sessionStorage` as `clothcycle_pending_2fa` so refresh/reload returns to the verification panel instead of bypassing 2FA.

## Profile Photo

- Profile photo uploads are stored through the configured upload endpoint and the resulting URL is saved on the user profile.
- Removing a profile photo clears `users.avatar_url` and `users.profile_photo`, so the UI falls back to the default avatar for users, partners, and admins.

## 2FA Setup

- A saved profile phone number is required before setting up any 2FA method.
- Authenticator App setup requires the current password, then displays a QR/TOTP setup code. The user must confirm with a valid authenticator OTP before 2FA is activated.
- SMS Code setup requires the current password and a saved phone number. SMS 2FA is activated without showing the Authenticator App QR flow.
- 2FA state is stored in `users.two_factor_enabled`, `users.two_factor_method`, and `users.two_factor_confirmed_at`.

## Database Notes

- Migration `018_email_2fa_method.sql` allows `users.two_factor_method` to store `email`, `totp`, or `sms`.
- D1 schema mirrors the same allowed 2FA method values.
