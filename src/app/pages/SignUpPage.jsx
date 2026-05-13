import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Recycle, Mail, Lock, User, Leaf, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getDashboardPathForRole } from "../../utils/roleRoutes";
import {
  getGoogleClientId,
  loadGoogleIdentityScript,
} from "../../services/googleIdentity";
import "./SignUpPage.css";
import { isStrongPassword, PasswordChecklist } from "../../utils/passwordPolicy";

export function SignUpPage() {
  const navigate = useNavigate();
  const { signup, continueWithGoogle, verifyTwoFactor } = useAuth();
  const googleButtonRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false
  });
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState("email");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const googleClientId = getGoogleClientId();

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current || twoFactorToken) {
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
                    : "Check your email for the 6-digit verification code."
                );
                return;
              }

              navigate(getDashboardPathForRole(authResponse.user.role));
            } catch (googleError) {
              setError(googleError.message || "Google signup failed");
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
  }, [continueWithGoogle, googleClientId, navigate, twoFactorToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (twoFactorToken) {
      setError("");
      setIsSubmitting(true);

      try {
        const user = await verifyTwoFactor(twoFactorToken, twoFactorCode);
        navigate(getDashboardPathForRole(user.role), { state: { entry: "signup" } });
      } catch (verifyError) {
        setError(verifyError.message || "Verification failed");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isStrongPassword(formData.password)) {
      setError("Password does not meet the required strength rules.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await signup(formData.email, formData.name, formData.password);

      if ("requiresTwoFactor" in response) {
        setTwoFactorToken(response.two_factor_token);
        setTwoFactorMethod(response.two_factor_method || "email");
        setSuccessMessage(
          response.two_factor_method === "totp"
            ? "Enter your authenticator code to continue."
            : "Check your email for the 6-digit verification code."
        );
        return;
      }

      navigate(getDashboardPathForRole(response.user.role), { state: { entry: "signup" } });
    } catch (signupError) {
      setError(signupError.message || "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="signup-page app-darkable-page min-h-screen bg-gradient-to-br from-[#f3f5f2] to-[#e7ebe6] flex items-center justify-center p-6">
      <div className="signup-page__card w-full max-w-5xl grid md:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Left side - Image */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex relative bg-gradient-to-br from-[#7d9283] to-[#336158] items-center justify-center p-12"
        >
          <div className="absolute inset-0 opacity-10">
            <Leaf className="absolute top-10 left-10 w-32 h-32" />
            <Leaf className="absolute bottom-20 right-10 w-40 h-40" />
          </div>
          <div className="relative z-10 text-center text-white">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-6"
            >
              <Recycle className="w-24 h-24" />
            </motion.div>
            <h2 className="text-3xl mb-4 font-gloock">Join ClothCycle PH</h2>
            <p className="text-white/90">Start making a difference today with sustainable textile solutions</p>
          </div>
        </motion.div>

        {/* Right side - Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-12 overflow-y-auto max-h-screen"
        >
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Recycle className="w-6 h-6 text-[#336158]" />
            <span className="text-xl text-[#19221d] font-gloock">ClothCycle PH</span>
          </Link>

          <h1 className="text-3xl mb-2 text-[#19221d]">
            {twoFactorToken ? "Two-Factor Check" : "Sign Up"}
          </h1>
          <p className="text-[#5f6f67] mb-8">
            {twoFactorToken
              ? twoFactorMethod === "totp"
                ? "Enter your authenticator code before opening your dashboard"
                : "Enter the code sent to your email before opening your dashboard"
              : "Create your account to get started"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            {twoFactorToken ? (
              <div>
                <label className="block text-sm mb-2 text-[#19221d]">Verification Code</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6f67]" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-[#e7ebe6] rounded-xl focus:border-[#336158] focus:outline-none transition-colors bg-white"
                    placeholder="123456"
                    required
                  />
                </div>
              </div>
            ) : (
              <>
            {googleClientId ? (
              <div className="flex justify-center">
                <div ref={googleButtonRef} />
              </div>
            ) : null}

            {googleClientId ? (
              <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[#8a9a91]">
                <div className="h-px flex-1 bg-[#e7ebe6]" />
                or
                <div className="h-px flex-1 bg-[#e7ebe6]" />
              </div>
            ) : null}

            <div>
              <label className="block text-sm mb-2 text-[#19221d]">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6f67]" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#e7ebe6] rounded-xl focus:border-[#336158] focus:outline-none transition-colors bg-white"
                  placeholder="Juan Dela Cruz"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#19221d]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6f67]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#e7ebe6] rounded-xl focus:border-[#336158] focus:outline-none transition-colors bg-white"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#19221d]">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6f67]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="w-full pl-12 pr-12 py-3 border-2 border-[#e7ebe6] rounded-xl focus:border-[#336158] focus:outline-none transition-colors bg-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6f67] transition-colors hover:text-[#336158]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {isPasswordFocused ? (
                <PasswordChecklist
                  password={formData.password}
                  confirmPassword={formData.confirmPassword}
                />
              ) : null}
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#19221d]">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6f67]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border-2 border-[#e7ebe6] rounded-xl focus:border-[#336158] focus:outline-none transition-colors bg-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6f67] transition-colors hover:text-[#336158]"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm text-[#5f6f67] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.terms}
                onChange={(e) => updateField("terms", e.target.checked)}
                className="w-4 h-4 mt-1 rounded border-[#e7ebe6] text-[#336158]"
                required
              />
              <span>
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="text-[#336158] hover:underline"
                >
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-[#336158] hover:underline"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#336158] text-white rounded-xl hover:bg-[#2a4c48] transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Please wait..."
                : twoFactorToken
                  ? "Verify Code"
                  : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#5f6f67]">
            Already have an account?{" "}
            <Link to="/login" className="text-[#336158] hover:underline">
              Log In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
