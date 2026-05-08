import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Recycle,
  Heart,
  Sparkles,
  Users,
  Package,
  TrendingUp,
  Leaf,
  Facebook,
  Twitter,
  Instagram,
} from "lucide-react";

import "./LandingPage.css";

export function LandingPage() {
  return (
    <div
      className="
        landing-page
        min-h-screen
        bg-white
        dark:bg-[radial-gradient(circle_at_top_left,_#1d2330,_transparent_30%),linear-gradient(135deg,#0f1115,#12161f,#0d1016)]
        text-[#19221d]
        dark:text-white
      "
    >
      {/* Glow Effects */}
      <div className="hero-glow"></div>

      {/* Navigation */}
      <nav
        className="
          fixed
          top-0
          left-0
          right-0
          z-50
          bg-white/80
          dark:bg-black/20
          backdrop-blur-xl
          border-b
          border-[#e7ebe6]
          dark:border-white/10
        "
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Recycle className="w-8 h-8 text-[#336158]" />
            </motion.div>

            <span className="text-2xl font-gloock tracking-wide text-[#19221d] dark:text-white">
              ClothCycle PH
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#about"
              className="text-[#5f6f67] dark:text-zinc-300 hover:text-[#336158] dark:hover:text-[#336158] transition-colors"
            >
              About
            </a>

            <a
              href="#partner"
              className="text-[#5f6f67] dark:text-zinc-300 hover:text-[#336158] dark:hover:text-[#336158] transition-colors"
            >
              Partner
            </a>

            <Link
              to="/login"
              className="text-[#5f6f67] dark:text-zinc-300 hover:text-[#336158] dark:hover:text-[#336158] transition-colors"
            >
              Log In
            </Link>

            <Link
              to="/signup"
              className="
                px-6
                py-2.5
                bg-[#336158]
                text-white
                rounded-full
                hover:bg-[#2a4c48]
                transition-all
                hover:shadow-2xl
                hover:scale-105
                font-medium
              "
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#e7ebe6] dark:border-white/10 bg-[#f3f5f2] dark:bg-white/5 backdrop-blur-xl mb-8">
                <Sparkles className="w-4 h-4 text-[#336158]" />
                <span className="text-sm text-[#5f6f67] dark:text-zinc-300">
                  Sustainable Fashion Platform
                </span>
              </div>

              <h1 className="text-6xl md:text-8xl font-light leading-[0.95] tracking-tight mb-8 text-[#19221d] dark:text-white">
                Give Your Clothes
                <span className="block text-[#336158]">
                  A Second Life
                </span>
              </h1>

              <p className="text-xl text-[#5f6f67] dark:text-zinc-400 mb-10 max-w-2xl leading-relaxed">
                Join the modern movement towards sustainable fashion.
                Recycle, donate, and upcycle unused garments while
                creating meaningful environmental impact.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/submit"
                  className="
                    px-8
                    py-4
                    bg-[#336158]
                    text-white
                    rounded-full
                    hover:bg-[#2a4c48]
                    transition-all
                    hover:shadow-2xl
                    hover:scale-105
                    font-medium
                  "
                >
                  Recycle Now
                </Link>

                <a
                  href="#how-it-works"
                  className="
                    px-8
                    py-4
                    bg-[#f3f5f2]
                    dark:bg-white/5
                    backdrop-blur-xl
                    text-[#19221d]
                    dark:text-white
                    rounded-full
                    border
                    border-[#e7ebe6]
                    dark:border-white/10
                    hover:bg-[#e7ebe6]
                    dark:hover:bg-white/10
                    transition-all
                  "
                >
                  Learn More
                </a>
              </div>
            </motion.div>

            {/* Right */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div
                className="
                  w-full
                  h-[500px]
                  rounded-[40px]
                  bg-gradient-to-br
                  from-[#f3f5f2]
                  dark:from-[#1d2330]
                  to-[#336158]
                  shadow-[0_20px_80px_rgba(51,97,88,0.15)]
                  dark:shadow-[0_20px_80px_rgba(0,0,0,0.45)]
                  flex
                  items-center
                  justify-center
                  overflow-hidden
                "
              >
                <div className="absolute inset-0 bg-black/5 dark:bg-black/10"></div>

                <Leaf className="w-64 h-64 text-[#e7ebe6] dark:text-white/20 relative z-10" />
              </div>

              {/* Floating Stats */}
              <div
                className="
                  absolute
                  -bottom-8
                  -left-8
                  bg-white
                  dark:bg-[#161a22]/90
                  backdrop-blur-xl
                  border
                  border-[#e7ebe6]
                  dark:border-white/10
                  p-6
                  rounded-3xl
                  shadow-lg
                  dark:shadow-2xl
                "
              >
                <div className="flex items-center gap-4">
                  <div
                    className="
                      w-14
                      h-14
                      rounded-2xl
                      bg-[#336158]
                      flex
                      items-center
                      justify-center
                    "
                  >
                    <Recycle className="w-7 h-7 text-white" />
                  </div>

                  <div>
                    <div className="text-3xl font-light text-[#19221d] dark:text-white">
                      50K+
                    </div>

                    <div className="text-sm text-[#5f6f67] dark:text-zinc-400">
                      Items Recycled
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-24 px-6 bg-transparent"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-light mb-4 text-[#19221d] dark:text-white">
              How It Works
            </h2>

            <p className="text-lg text-[#5f6f67] dark:text-zinc-400">
              Three modern ways to contribute sustainably
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Recycle,
                title: "Recycle",
                description:
                  "Transform unused textiles into new sustainable materials.",
              },
              {
                icon: Heart,
                title: "Donate",
                description:
                  "Support communities by giving garments a meaningful second purpose.",
              },
              {
                icon: Sparkles,
                title: "Upcycle",
                description:
                  "Turn unwanted pieces into unique creations through innovation.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{
                  y: -10,
                }}
                className="
                  bg-white
                  dark:bg-[#161a22]/80
                  backdrop-blur-xl
                  border
                  border-[#e7ebe6]
                  dark:border-white/10
                  p-10
                  rounded-[32px]
                  shadow-md
                  dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]
                "
              >
                <div
                  className="
                    w-16
                    h-16
                    rounded-2xl
                    bg-[#336158]
                    flex
                    items-center
                    justify-center
                    mb-8
                  "
                >
                  <item.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-3xl font-light mb-4 text-[#19221d] dark:text-white">
                  {item.title}
                </h3>

                <p className="text-[#5f6f67] dark:text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div
            className="
              rounded-[40px]
              bg-gradient-to-br
              from-[#f3f5f2]
              dark:from-[#161a22]
              to-white
              dark:to-[#0f1115]
              border
              border-[#e7ebe6]
              dark:border-white/10
              p-12
            "
          >
            <div className="grid md:grid-cols-3 gap-10 text-center">
              {[
                {
                  icon: Package,
                  value: "50,000+",
                  label: "Items Diverted",
                },
                {
                  icon: Users,
                  value: "10,000+",
                  label: "Active Users",
                },
                {
                  icon: TrendingUp,
                  value: "150+",
                  label: "Partners",
                },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="
                    bg-[#f3f5f2]
                    dark:bg-white/5
                    backdrop-blur-xl
                    border
                    border-[#e7ebe6]
                    dark:border-white/10
                    p-10
                    rounded-3xl
                  "
                >
                  <stat.icon className="w-12 h-12 mx-auto mb-6 text-[#336158]" />

                  <div className="text-5xl font-light text-[#19221d] dark:text-white mb-3">
                    {stat.value}
                  </div>

                  <div className="text-[#5f6f67] dark:text-zinc-400">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="partner" className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-light mb-4 text-[#19221d] dark:text-white">
              Featured Partners
            </h2>

            <p className="text-lg text-[#5f6f67] dark:text-zinc-400 mb-16">
              Organizations helping create a sustainable future
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="
                    h-28
                    bg-white
                    dark:bg-white/5
                    backdrop-blur-xl
                    border
                    border-[#e7ebe6]
                    dark:border-white/10
                    rounded-3xl
                    flex
                    items-center
                    justify-center
                    hover:bg-[#f3f5f2]
                    dark:hover:bg-white/10
                    transition-all
                  "
                >
                  <span className="text-[#5f6f67] dark:text-zinc-300">
                    Partner {i}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f3f5f2] dark:bg-[#0b0d12] border-t border-[#e7ebe6] dark:border-white/10 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Recycle className="w-7 h-7 text-[#336158]" />

                <span className="text-2xl font-gloock">
                  ClothCycle PH
                </span>
              </div>

              <p className="text-[#5f6f67] dark:text-zinc-500 leading-relaxed">
                Empowering sustainable fashion through innovation,
                recycling, and community collaboration.
              </p>
            </div>

            <div>
              <h4 className="text-lg mb-5 text-[#19221d] dark:text-white">
                Quick Links
              </h4>

              <div className="space-y-3 text-[#5f6f67] dark:text-zinc-500">
                <div>
                  <a
                    href="#about"
                    className="hover:text-[#336158] dark:hover:text-white transition-colors"
                  >
                    About Us
                  </a>
                </div>

                <div>
                  <a
                    href="#how-it-works"
                    className="hover:text-[#336158] dark:hover:text-white transition-colors"
                  >
                    How It Works
                  </a>
                </div>

                <div>
                  <a
                    href="#partner"
                    className="hover:text-[#336158] dark:hover:text-white transition-colors"
                  >
                    Partners
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg mb-5 text-[#19221d] dark:text-white">
                Contact
              </h4>

              <div className="space-y-3 text-[#5f6f67] dark:text-zinc-500">
                <div>info@clothcycle.ph</div>
                <div>+63 912 345 6789</div>
                <div>Manila, Philippines</div>
              </div>
            </div>

            <div>
              <h4 className="text-lg mb-5 text-[#19221d] dark:text-white">
                Follow Us
              </h4>

              <div className="flex gap-4">
                {[Facebook, Twitter, Instagram].map(
                  (Icon, index) => (
                    <a
                      key={index}
                      href="#"
                      className="
                        w-12
                        h-12
                        bg-[#f3f5f2]
                        dark:bg-white/5
                        border
                        border-[#e7ebe6]
                        dark:border-white/10
                        rounded-full
                        flex
                        items-center
                        justify-center
                        hover:bg-[#e7ebe6]
                        dark:hover:bg-white/10
                        transition-all
                      "
                    >
                      <Icon className="w-5 h-5 text-[#5f6f67] dark:text-zinc-300" />
                    </a>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-[#e7ebe6] dark:border-white/10 pt-8 text-center text-[#5f6f67] dark:text-zinc-500">
            <p className="font-gloock">
              &copy; 2026 ClothCycle PH. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}