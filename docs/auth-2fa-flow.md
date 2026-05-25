# Authentication and 2FA Flow

## Login

- The login form does not expose a "Remember me" option. Successful auth is persisted with the existing default app session behavior.
- 2FA is always part of email/password login. Users choose their preferred method: Email or Authenticator App.
- Email/password login always triggers the selected 2FA method after the password is validated.
- Google Sign-In bypasses the email 2FA challenge. After Google validates the account, the backend creates the ClothCycle session directly.
- The login page shows a dedicated email verification panel with a code input, Verify button, Resend code button, Back to login action, loading state, and invalid/expired-code error handling.
- If a user has Authenticator App 2FA enabled, login requires a valid TOTP code from the authenticator app.
- Email login codes expire after 10 minutes. Resend issues a new code and replaces the previous pending code.
- Pre-authentication 2FA responses do not include a dashboard token. Existing stored auth state is cleared when a login attempt returns a 2FA challenge, so dashboard access remains blocked until code verification succeeds.
- The signed pre-authentication challenge token is kept in `sessionStorage` as `clothcycle_pending_2fa` so refresh/reload returns to the verification panel instead of bypassing 2FA.

## Forgot Password

- Forgot Password uses its own password reset token table and does not use the login 2FA challenge fields.
- The user first requests an email verification code. The code is stored hashed and expires after 15 minutes.
- Verifying the email code issues a separate short-lived reset token. The password reset endpoint accepts only that verified reset token, not the raw email code.
- The verified reset token expires after 10 minutes and is marked used after a successful password reset.
- Resend requests create a fresh email verification code.

## Profile Photo

- Profile photo uploads are stored through the configured upload endpoint and the resulting URL is saved on the user profile.
- Removing a profile photo clears `users.avatar_url` and `users.profile_photo`, so the UI falls back to the default avatar for users, partners, and admins.

## 2FA Method Preferences

- Security Settings no longer exposes a 2FA on/off toggle. It lets users choose or change the preferred method.
- Email requires the current password to select and does not require additional setup.
- Authenticator App setup requires the current password, then displays a QR/TOTP setup code. The user must confirm with a valid authenticator OTP before Authenticator App becomes the preferred method.
- 2FA preference state is stored in `users.two_factor_enabled`, `users.two_factor_method`, and `users.two_factor_confirmed_at`.

## Database Notes

- Migration `018_email_2fa_method.sql` allows `users.two_factor_method` to store `email`, `totp`, or `sms` for compatibility with older deployments.
- Migration `019_always_on_2fa_defaults.sql` makes 2FA enabled by default and defaults the preferred method to `email`.
- Migration `020_remove_sms_2fa_method.sql` removes SMS as an allowed 2FA method and converts existing SMS preferences back to Email.
- D1 schema allows only `email` and `totp` for 2FA methods.
