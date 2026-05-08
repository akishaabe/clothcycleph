import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Recycle, Mail, Lock, User, Leaf } from "lucide-react";
import { useState } from "react";
import "./SignUpPage.css";

export function SignUpPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    terms: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="signup-page min-h-screen bg-gradient-to-br from-[#f3f5f2] to-[#e7ebe6] flex items-center justify-center p-6">
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

          <h1 className="text-3xl mb-2 text-[#19221d]">Sign Up</h1>
          <p className="text-[#5f6f67] mb-8">Create your account to get started</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#e7ebe6] rounded-xl focus:border-[#336158] focus:outline-none transition-colors bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#19221d]">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6f67]" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#e7ebe6] rounded-xl focus:border-[#336158] focus:outline-none transition-colors bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#19221d]">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField("role", "user")}
                  className={`py-3 px-4 rounded-xl border-2 transition-all ${
                    formData.role === "user"
                      ? "border-[#336158] bg-[#336158]/10 text-[#19221d]"
                      : "border-[#e7ebe6] text-[#5f6f67] hover:border-[#336158]"
                  }`}
                >
                  User
                </button>
                <button
                  type="button"
                  onClick={() => updateField("role", "partner")}
                  className={`py-3 px-4 rounded-xl border-2 transition-all ${
                    formData.role === "partner"
                      ? "border-[#336158] bg-[#336158]/10 text-[#19221d]"
                      : "border-[#e7ebe6] text-[#5f6f67] hover:border-[#336158]"
                  }`}
                >
                  Partner
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
                I agree to the <a href="#" className="text-[#336158] hover:underline">Terms & Conditions</a> and{" "}
                <a href="#" className="text-[#336158] hover:underline">Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3 bg-[#336158] text-white rounded-xl hover:bg-[#2a4c48] transition-all hover:shadow-lg"
            >
              Create Account
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
