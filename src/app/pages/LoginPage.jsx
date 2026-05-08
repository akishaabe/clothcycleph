import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Recycle,
  Mail,
  Lock,
  Leaf,
  Sparkles,
} from "lucide-react";

import { useState } from "react";

import "./LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    navigate("/dashboard", { state: { entry: "login" } });
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

            <div
              className="
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                bg-white/70
                dark:bg-white/10
                backdrop-blur-xl
                border
                border-[#d7ddd5]
                dark:border-white/20
                mb-8
              "
            >
              <Sparkles className="w-4 h-4 text-[#336158] dark:text-white" />

              <span className="text-sm text-[#19221d] dark:text-white">
                Sustainable Fashion Platform
              </span>
            </div>

            <h2 className="text-5xl font-light leading-tight mb-6 text-[#19221d] dark:text-white">
              Welcome
              <span className="block font-gloock">
                Back
              </span>
            </h2>

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
                Log In
              </h1>

            <p className="text-[#5f6f67] dark:text-zinc-400 text-lg">
              Access your sustainable fashion account
            </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Email */}
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

              {/* Password */}
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
                    type="password"
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
                </div>
              </div>

              {/* Options */}
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

                <a
                  href="#"
                  className="
                    text-sm
                    text-[#336158]
                    hover:text-[#2a4c48]
                    transition-colors
                  "
                >
                  Forgot Password?
                </a>
              </div>

              {/* Login Button */}
              <button
                type="submit"
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
                "
              >
                Log In
              </button>
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
