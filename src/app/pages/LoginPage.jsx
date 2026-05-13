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
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getDashboardPathForRole } from "../../utils/roleRoutes";
import {
  getGoogleClientId,
  loadGoogleIdentityScript,
} from "../../services/googleIdentity";

import "./LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, continueWithGoogle, verifyTwoFactor, resendTwoFactorCode, forgotPassword, resetPassword } = useAuth();

  const googleButtonRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState("email");
  const [authMode, setAuthMode] = useState("login");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const googleClientId = getGoogleClientId();

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
              const authResponse = await continueWithGoogle(response.credential);

              if ("requiresTwoFactor" in authResponse) {
                setTwoFactorToken(authResponse.two_factor_token);
                setTwoFactorMethod(authResponse.two_factor_method || "email");
                setSuccessMessage(
                  authResponse.two_factor_method === "totp"
                    ? "Enter your authenticator code to continue."
                    : authResponse.two_factor_method === "sms"
                      ? `Check your phone for the 6-digit verification code.${authResponse.dev_code ? ` Dev code: ${authResponse.dev_code}` : ""}`
                      : "Check your email for the 6-digit verification code."
                );
                setResendCountdown(["email", "sms"].includes(authResponse.two_factor_method || "") ? 15 : 0);
                return;
              }

              navigate(getDashboardPathForRole(authResponse.user.role));
            } catch (googleError) {
              setError(googleError.message || "Google login failed");
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
        const user = await verifyTwoFactor(twoFactorToken, twoFactorCode, rememberMe);
        navigate(getDashboardPathForRole(user.role));
        return;
      }

      if (authMode === "forgot") {
        const response = await forgotPassword(email);
        setSuccessMessage(response.message);
        if (response.reset_token) {
          setResetToken(response.reset_token);
        }
        setAuthMode("reset");
        setResendCountdown(15);
        return;
      }

      if (authMode === "reset") {
        if (newPassword !== confirmNewPassword) {
          throw new Error("New passwords do not match");
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

      const response = await login(email, password, rememberMe);

      if ("requiresTwoFactor" in response) {
        setTwoFactorToken(response.two_factor_token);
        setTwoFactorMethod(response.two_factor_method || "email");
        setPassword("");
        setSuccessMessage(
          response.two_factor_method === "totp"
            ? "Enter your authenticator code to continue."
            : response.two_factor_method === "sms"
              ? `Check your phone for the 6-digit verification code.${response.dev_code ? ` Dev code: ${response.dev_code}` : ""}`
              : "Check your email for the 6-digit verification code."
        );
        setResendCountdown(["email", "sms"].includes(response.two_factor_method || "") ? 15 : 0);
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
    setTwoFactorToken("");
    setTwoFactorMethod("email");
    setTwoFactorCode("");
    setResetToken("");
    setNewPassword("");
    setConfirmNewPassword("");
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
      if (twoFactorToken && ["email", "sms"].includes(twoFactorMethod)) {
        const response = await resendTwoFactorCode(twoFactorToken);
        setTwoFactorToken(response.two_factor_token);
        setTwoFactorMethod(response.two_factor_method || twoFactorMethod);
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
                  : twoFactorMethod === "sms"
                    ? "Enter the code sent to your phone"
                    : "Enter the code sent to your email"
                : authMode === "forgot"
                  ? "Request a password reset token"
                  : authMode === "reset"
                    ? "Enter your 6-digit reset code and choose a new password"
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
                <div>
                  <label className="block text-sm mb-2 text-[#19221d] dark:text-zinc-300">
                    Verification Code
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f6f67] dark:text-zinc-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      required
                      className="w-full rounded-xl border-2 border-[#e7ebe6] bg-white py-3 pl-12 pr-4 text-[#19221d] transition-all placeholder:text-[#8a9a91] focus:border-[#336158] focus:outline-none focus:ring-2 focus:ring-[#336158]/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              ) : null}

              {authMode === "reset" ? (
                <>
                  <div>
                    <label className="block text-sm mb-2 text-[#19221d] dark:text-zinc-300">
                      Reset Token
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

              {(twoFactorToken && ["email", "sms"].includes(twoFactorMethod)) || authMode === "reset" ? (
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
                </>
              ) : null}

              {!twoFactorToken && authMode === "login" ? (
              <div className="flex items-center justify-between">
                <label
                  className="
                    flex
                    items-center
                    gap-3
                    text-sm
                    text-[#5f6f67]
                    dark:text-zinc-400
                    cursor-pointer
                  "
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="
                      w-4
                      h-4
                      rounded
                      border-[#d7ddd5]
                      bg-white
                      dark:border-white/20
                      dark:bg-white/5
                    "
                  />

                  Remember me
                </label>

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
                        ? "Reset Password"
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
