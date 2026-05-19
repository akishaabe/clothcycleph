import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Recycle,
  Mail,
  Lock,
  Leaf,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  MailCheck,
  RefreshCw,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getDashboardPathForRole } from "../../utils/roleRoutes";
import {
  getGoogleClientId,
  loadGoogleIdentityScript,
} from "../../services/googleIdentity";

import "./LoginPage.css";
import { isStrongPassword, PasswordChecklist } from "../../utils/passwordPolicy";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, continueWithGoogle, verifyTwoFactor, resendTwoFactorCode, forgotPassword, verifyResetCode, resetPassword } = useAuth();

  const googleButtonRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState("email");
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [resetStep, setResetStep] = useState("code");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const googleClientId = getGoogleClientId();
  const twoFactorStorageKey = "clothcycle_pending_2fa";

  const maskEmail = (value) => {
    if (!value || !value.includes("@")) {
      return "your registered email";
    }

    const [name, domain] = value.split("@");
    const safeName =
      name.length <= 2 ? `${name[0] || ""}***` : `${name.slice(0, 2)}***${name.slice(-1)}`;
    return `${safeName}@${domain}`;
  };

  const storeTwoFactorChallenge = (challenge, fallbackEmail = email) => {
    const method = challenge.two_factor_method || "email";
    setTwoFactorToken(challenge.two_factor_token);
    setTwoFactorMethod(method);
    setTwoFactorEmail(fallbackEmail);
    setTwoFactorCode("");
    sessionStorage.setItem(
      twoFactorStorageKey,
      JSON.stringify({
        token: challenge.two_factor_token,
        method,
        email: fallbackEmail,
      }),
    );
  };

  const clearTwoFactorChallenge = () => {
    setTwoFactorToken("");
    setTwoFactorMethod("email");
    setTwoFactorEmail("");
    setTwoFactorCode("");
    sessionStorage.removeItem(twoFactorStorageKey);
  };

  useEffect(() => {
    try {
      const storedChallenge = JSON.parse(sessionStorage.getItem(twoFactorStorageKey) || "null");
      if (storedChallenge?.token) {
        setTwoFactorToken(storedChallenge.token);
        setTwoFactorMethod(storedChallenge.method || "email");
        setTwoFactorEmail(storedChallenge.email || "");
      }
    } catch {
      sessionStorage.removeItem(twoFactorStorageKey);
    }
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setResendCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [resendCountdown]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current || twoFactorToken || authMode !== "login") {
      return;
    }

    let isMounted = true;

    loadGoogleIdentityScript()
      .then(() => {
        if (!isMounted || !window.google || !googleButtonRef.current) {
          return;
        }

        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              setError("");
              setSuccessMessage("");
              setIsGoogleSubmitting(true);

              if (!response?.credential) {
                throw new Error("Google did not return a sign-in credential. Please try again.");
              }

              const authResponse = await continueWithGoogle(response.credential);

              if ("requiresTwoFactor" in authResponse) {
                storeTwoFactorChallenge(authResponse, email);
                setSuccessMessage(
                  authResponse.two_factor_method === "totp"
                    ? "Enter your authenticator code to continue."
                    : "Check your email for the 6-digit verification code."
                );
                setResendCountdown(authResponse.two_factor_method === "email" ? 15 : 0);
                return;
              }

              navigate(
                authResponse.user.password_setup_required
                  ? "/settings?setupPassword=1"
                  : getDashboardPathForRole(authResponse.user.role)
              );
            } catch (googleError) {
              console.error("Google sign-in callback failed", googleError);
              setError(googleError.message || "Google login failed");
            } finally {
              setIsGoogleSubmitting(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 360,
          text: "continue_with",
        });
      })
      .catch((googleError) => {
        if (isMounted) {
          setError(googleError.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authMode, continueWithGoogle, googleClientId, navigate, twoFactorToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (twoFactorToken) {
        if (!/^\d{6}$/.test(twoFactorCode)) {
          throw new Error("Enter the 6-digit verification code.");
        }

        const user = await verifyTwoFactor(twoFactorToken, twoFactorCode);
        clearTwoFactorChallenge();
        setSuccessMessage("Verification successful. Redirecting...");
        window.setTimeout(() => {
          navigate(getDashboardPathForRole(user.role));
        }, 500);
        return;
      }

      if (authMode === "forgot") {
        const response = await forgotPassword(email);
        setSuccessMessage(response.message);
        if (response.reset_token) {
          setResetToken(response.reset_token);
        }
        setAuthMode("reset");
        setResetStep("code");
        setResendCountdown(15);
        return;
      }

      if (authMode === "reset") {
        if (resetStep === "code") {
          if (!/^\d{6}$/.test(resetToken)) {
            throw new Error("Enter the 6-digit reset code first.");
          }

          await verifyResetCode(resetToken);
          setResetStep("password");
          setSuccessMessage("Code verified. Choose a new password.");
          return;
        }

        if (newPassword !== confirmNewPassword) {
          throw new Error("New passwords do not match");
        }

        if (!isStrongPassword(newPassword)) {
          throw new Error("New password does not meet the strength requirements.");
        }

        const response = await resetPassword(resetToken, newPassword);
        setSuccessMessage(response.message);
        setPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setResetToken("");
        setAuthMode("login");
        return;
      }

      const response = await login(email, password);

      if ("requiresTwoFactor" in response) {
        storeTwoFactorChallenge(response, email);
        setPassword("");
        setSuccessMessage(
          response.two_factor_method === "totp"
            ? "Enter your authenticator code to continue."
            : "Check your email for the 6-digit verification code."
        );
        setResendCountdown(response.two_factor_method === "email" ? 15 : 0);
        return;
      }

      navigate(getDashboardPathForRole(response.user.role));
    } catch (loginError) {
      setError(loginError.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnToLogin = () => {
    setAuthMode("login");
    clearTwoFactorChallenge();
    setResetToken("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetStep("code");
    setError("");
    setSuccessMessage("");
    setResendCountdown(0);
  };

  const handleResend = async () => {
    if (resendCountdown > 0) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (twoFactorToken && twoFactorMethod === "email") {
        const response = await resendTwoFactorCode(twoFactorToken);
        storeTwoFactorChallenge(response, twoFactorEmail || email);
        setSuccessMessage(
          response.dev_code ? `${response.message} Dev code: ${response.dev_code}` : response.message
        );
        setResendCountdown(15);
        return;
      }

      if (authMode === "reset") {
        const response = await forgotPassword(email);
        setSuccessMessage(response.message);
        if (response.reset_token) {
          setResetToken(response.reset_token);
        }
        setResendCountdown(30);
      }
    } catch (resendError) {
      setError(resendError.message || "Resend failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="
        login-page
        min-h-screen
        bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_30%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)]
        dark:bg-[radial-gradient(circle_at_top_left,_#1d2330,_transparent_30%),linear-gradient(135deg,#0f1115,#12161f,#0d1016)]
        flex
        items-center
        justify-center
        p-6
        text-[#19221d]
        dark:text-white
      "
    >
      <div
        className="
          login-page__card
          w-full
          max-w-6xl
          grid
          md:grid-cols-2
          bg-white/95
          dark:bg-[#161a22]/90
          backdrop-blur-2xl
          border
          border-[#e7ebe6]
          dark:border-white/10
          rounded-[36px]
          shadow-[0_20px_70px_rgba(25,34,29,0.14)]
          dark:shadow-[0_10px_60px_rgba(0,0,0,0.45)]
          overflow-hidden
        "
      >
        {/* Left Side */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="
            hidden
            md:flex
            relative
            bg-gradient-to-br
            from-[#f3f5f2]
            via-[#e7ebe6]
            to-[#cfd9d1]
            dark:from-[#1d2330]
            dark:to-[#336158]
            items-center
            justify-center
            p-14
            overflow-hidden
          "
        >
          {/* Decorative Glow */}
          <div className="absolute inset-0 bg-white/10 dark:bg-black/10"></div>

          {/* Floating Leaves */}
          <div className="absolute inset-0 opacity-10 dark:opacity-10">
            <Leaf className="absolute top-10 left-10 w-36 h-36" />

            <Leaf className="absolute bottom-10 right-10 w-28 h-28" />
          </div>

          <div className="relative z-10 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear",
              }}
              className="mx-auto mb-8"
            >
              <Recycle className="w-28 h-28 text-[#336158] dark:text-white" />
            </motion.div>

            <h3 className="text-5xl font-light leading-tight mb-6 text-[#19221d] dark:text-white">
              Welcome
              <span className="block font-gloock">
                Back
              </span>
            </h3>

            <p className="text-[#5f6f67] dark:text-white/80 text-lg leading-relaxed max-w-md mx-auto">
              Continue your journey towards a more
              sustainable and responsible future through
              modern fashion recycling.
            </p>
          </div>
        </motion.div>

        {/* Right Side */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="
            flex
            items-center
            justify-center
            p-8
            md:p-14
          "
        >
          <div className="w-full max-w-md">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-3 mb-10"
            >
              <Recycle className="w-7 h-7 text-[#336158]" />

              <span className="text-2xl font-gloock tracking-wide">
                ClothCycle PH
              </span>
            </Link>

            {/* Heading */}
            <div className="mb-10">
              <h1 className="text-5xl font-light mb-3">
                {twoFactorToken
                  ? "Verifying Identity"
                  : authMode === "forgot"
                    ? "Reset Password"
                    : authMode === "reset"
                      ? "New Password"
                      : "Log In"}
              </h1>

            <p className="text-[#5f6f67] dark:text-zinc-400 text-lg">
              {twoFactorToken
                ? twoFactorMethod === "totp"
                  ? "Enter your authenticator code"
                  : "Enter the code sent to your email"
                : authMode === "forgot"
                  ? "Request a password reset code"
                  : authMode === "reset"
                    ? resetStep === "code"
                      ? "Enter your 6-digit reset code first"
                      : "Choose and confirm your new password"
                    : "Access your sustainable fashion account"}
            </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {successMessage}
                </div>
              ) : null}

              {/* Email */}
              {!twoFactorToken && authMode !== "reset" ? (
              <div>
                <label className="block text-sm mb-2 text-[#19221d] dark:text-zinc-300">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      w-5
                      h-5
                      text-[#5f6f67]
                      dark:text-zinc-500
                      pointer-events-none
                    "
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    required
                    className="
                      w-full
                      pl-12
                      pr-4
                      py-3
                      bg-white
                      dark:bg-white/5
                      border-2
                      border-[#e7ebe6]
                      dark:border-white/10
                      rounded-xl
                      text-[#19221d]
                      dark:text-white
                      placeholder:text-[#8a9a91]
                      dark:placeholder:text-zinc-500
                      focus:border-[#336158]
                      focus:outline-none
                      focus:ring-2
                      focus:ring-[#336158]/20
                      transition-all
                    "
                  />
                </div>
              </div>
              ) : null}

              {/* Password */}
              {!twoFactorToken && authMode === "login" ? (
              <div>
                <label className="block text-sm mb-2 text-[#19221d] dark:text-zinc-300">
                  Password
                </label>

                <div className="relative">
                  <Lock
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      w-5
                      h-5
                      text-[#5f6f67]
                      dark:text-zinc-500
                      pointer-events-none
                    "
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="••••••••"
                    required
                    className="
                      w-full
                      pl-12
                      pr-4
                      py-3
                      bg-white
                      dark:bg-white/5
                      border-2
                      border-[#e7ebe6]
                      dark:border-white/10
                      rounded-xl
                      text-[#19221d]
                      dark:text-white
                      placeholder:text-[#8a9a91]
                      dark:placeholder:text-zinc-500
                      focus:border-[#336158]
                      focus:outline-none
                      focus:ring-2
                      focus:ring-[#336158]/20
                      transition-all
                    "
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="
                      absolute
                      right-4
                      top-1/2
                      -translate-y-1/2
                      text-[#5f6f67]
                      transition-colors
                      hover:text-[#336158]
                      dark:text-zinc-500
                      dark:hover:text-white
                    "
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              ) : null}

              {twoFactorToken ? (
                <div className="rounded-3xl border border-[#dce4da] bg-[#f8faf6]/90 p-5 shadow-[0_12px_40px_rgba(25,34,29,0.08)] dark:border-white/10 dark:bg-white/5">
                  <div className="mb-5 flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e7f0ea] text-[#336158] dark:bg-[#336158]/20 dark:text-emerald-200">
                      {twoFactorMethod === "email" ? (
                        <MailCheck className="h-6 w-6" />
                      ) : (
                        <ShieldCheck className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[#19221d] dark:text-white">
                        {twoFactorMethod === "email"
                          ? "Email verification required"
                          : "Authenticator verification required"}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[#5f6f67] dark:text-zinc-400">
                        {twoFactorMethod === "email"
                          ? `We sent a 6-digit verification code to ${maskEmail(twoFactorEmail || email)}. Enter it below to finish signing in.`
                          : "Enter the 6-digit code from your authenticator app."}
                      </p>
                    </div>
                  </div>

                  <label className="block text-sm mb-2 text-[#19221d] dark:text-zinc-300">
                    Verification Code
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f6f67] dark:text-zinc-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      autoComplete="one-time-code"
                      autoFocus
                      required
                      className="w-full rounded-xl border-2 border-[#e7ebe6] bg-white py-3 pl-12 pr-4 text-center font-mono text-xl tracking-[0.25em] text-[#19221d] transition-all placeholder:text-[#8a9a91] focus:border-[#336158] focus:outline-none focus:ring-2 focus:ring-[#336158]/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500"
                    />
                  </div>

                  {twoFactorMethod === "email" ? (
                    <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[#5f6f67] dark:text-zinc-400">
                        {resendCountdown > 0
                          ? `You can resend a code in ${resendCountdown}s.`
                          : "Didn't receive the code?"}
                      </span>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isSubmitting || resendCountdown > 0}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce4da] bg-white px-4 py-2 text-[#336158] transition-colors hover:bg-[#f3f5f2] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-emerald-200 dark:hover:bg-white/10"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Resend code
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {authMode === "reset" ? (
                <>
                  <div>
                    <label className="block text-sm mb-2 text-[#19221d] dark:text-zinc-300">
                      Reset Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f6f67] dark:text-zinc-500" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="123456"
                        required
                        className="w-full rounded-xl border-2 border-[#e7ebe6] bg-white py-3 pl-12 pr-4 text-[#19221d] transition-all placeholder:text-[#8a9a91] focus:border-[#336158] focus:outline-none focus:ring-2 focus:ring-[#336158]/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500"
                      />
                  </div>
                </div>
                  {resetStep === "password" ? (
                    <>
                  <div>
                    <label className="block text-sm mb-2 text-[#19221d] dark:text-zinc-300">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f6f67] dark:text-zinc-500" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={() => setIsNewPasswordFocused(true)}
                        onBlur={() => setIsNewPasswordFocused(false)}
                        placeholder="New password"
                        required
                        className="w-full rounded-xl border-2 border-[#e7ebe6] bg-white py-3 pl-12 pr-12 text-[#19221d] transition-all placeholder:text-[#8a9a91] focus:border-[#336158] focus:outline-none focus:ring-2 focus:ring-[#336158]/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6f67] transition-colors hover:text-[#336158] dark:text-zinc-500 dark:hover:text-white"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {isNewPasswordFocused ? (
                      <PasswordChecklist
                        password={newPassword}
                        confirmPassword={confirmNewPassword}
                      />
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-[#19221d] dark:text-zinc-300">
                      Retype New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f6f67] dark:text-zinc-500" />
                      <input
                        type={showConfirmNewPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Retype new password"
                        required
                        className="w-full rounded-xl border-2 border-[#e7ebe6] bg-white py-3 pl-12 pr-12 text-[#19221d] transition-all placeholder:text-[#8a9a91] focus:border-[#336158] focus:outline-none focus:ring-2 focus:ring-[#336158]/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6f67] transition-colors hover:text-[#336158] dark:text-zinc-500 dark:hover:text-white"
                        aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                        title={showConfirmNewPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                    </>
                  ) : null}
                </>
              ) : null}

              {!twoFactorToken && authMode === "reset" ? (
                <div className="text-sm text-[#5f6f67] dark:text-zinc-400">
                  {resendCountdown > 0
                    ? `Didn't receive a code? You can request ${authMode === "reset" ? "a new reset code" : "another code"} again in ${resendCountdown}s.`
                    : `Didn't receive a code?`}
                  {resendCountdown === 0 ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={handleResend}
                        className="text-[#336158] transition-colors hover:text-[#2a4c48] dark:hover:text-white"
                      >
                        Request {authMode === "reset" ? "a new reset code" : "another code"}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}

              {/* Options */}
              {!twoFactorToken && authMode === "login" ? (
                <>
                  {googleClientId ? (
                    <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[#8a9a91]">
                      <div className="h-px flex-1 bg-[#e7ebe6]" />
                      or
                      <div className="h-px flex-1 bg-[#e7ebe6]" />
                    </div>
                  ) : null}

                  {googleClientId ? (
                    <div className="flex justify-center">
                      <div ref={googleButtonRef} />
                    </div>
                  ) : null}

                  {isGoogleSubmitting ? (
                    <div className="rounded-xl border border-[#dce4da] bg-[#f8faf6] px-4 py-3 text-sm text-[#5f6f67] dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                      Checking your Google account...
                    </div>
                  ) : null}
                </>
              ) : null}

              {!twoFactorToken && authMode === "login" ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("forgot");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="
                    text-sm
                    text-[#336158]
                    hover:text-[#2a4c48]
                    transition-colors
                  "
                >
                  Forgot Password?
                </button>
              </div>
              ) : null}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  w-full
                  py-4
                  bg-[#336158]
                  text-white
                  rounded-2xl
                  hover:bg-[#2a4c48]
                  transition-all
                  hover:shadow-2xl
                  hover:scale-[1.02]
                  font-medium
                  disabled:cursor-not-allowed
                  disabled:opacity-70
                "
              >
                {isSubmitting
                  ? "Please wait..."
                  : twoFactorToken
                    ? "Verify Code"
                    : authMode === "forgot"
                      ? "Send Reset Code"
                      : authMode === "reset"
                        ? resetStep === "code"
                          ? "Continue"
                          : "Reset Password"
                        : "Log In"}
              </button>

              {(twoFactorToken || authMode !== "login") ? (
                <button
                  type="button"
                  onClick={returnToLogin}
                  className="w-full text-sm text-[#5f6f67] transition-colors hover:text-[#336158] dark:text-zinc-400 dark:hover:text-white"
                >
                  Back to login
                </button>
              ) : null}
            </form>

            {/* Bottom */}
            <div className="mt-10 text-center text-[#5f6f67] dark:text-zinc-400">
              Don&apos;t have an account?{" "}

              <Link
                to="/signup"
                className="
                  text-[#336158]
                  hover:text-[#2a4c48]
                  transition-colors
                "
              >
                Sign Up
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
