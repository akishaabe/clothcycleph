import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Recycle, Mail, Lock, Leaf } from "lucide-react";
import { useState } from "react";
import "./LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="login-page min-h-screen bg-gradient-to-br from-[#f5f5f0] to-[#e8ebe4] flex items-center justify-center p-6">
      <div className="login-page__card w-full max-w-5xl grid md:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Left side - Image */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex relative bg-gradient-to-br from-[#6b8e6b] to-[#5a7a5a] items-center justify-center p-12"
        >
          <div className="absolute inset-0 opacity-10">
            <Leaf className="absolute top-10 left-10 w-32 h-32" />
            <Leaf className="absolute bottom-10 right-10 w-24 h-24" />
          </div>
          <div className="relative z-10 text-center text-white">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-6"
            >
              <Recycle className="w-24 h-24" />
            </motion.div>
            <h2 className="text-3xl mb-4">Welcome Back!</h2>
            <p className="text-white/90">Continue your journey towards sustainable fashion</p>
          </div>
        </motion.div>

        {/* Right side - Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-12"
        >
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Recycle className="w-6 h-6 text-[#6b8e6b]" />
            <span className="text-xl text-[#2d4a2d]">ClothCycle PH</span>
          </Link>

          <h1 className="text-3xl mb-2 text-[#2d4a2d]">Log In</h1>
          <p className="text-[#5a6f5a] mb-8">Enter your credentials to access your account</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm mb-2 text-[#2d4a2d]">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a6f5a]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-[#2d4a2d]">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a6f5a]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#5a6f5a] cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-[#d4d8d0] text-[#6b8e6b]" />
                Remember me
              </label>
              <a href="#" className="text-sm text-[#6b8e6b] hover:underline">Forgot Password?</a>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg"
            >
              Log In
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-[#5a6f5a]">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#6b8e6b] hover:underline">
              Sign Up
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
