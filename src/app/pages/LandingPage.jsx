import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Recycle,
  Heart,
  Sparkles,
  Leaf,
  Package,
  Scissors,
} from "lucide-react";

import "./LandingPage.css";

const revealUp = {
  hidden: { opacity: 0, y: 42 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const revealScale = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerGroup = {
  visible: {
    transition: {
      staggerChildren: 0.14,
    },
  },
};

const viewportReveal = { once: true, amount: 0.24 };

const featuredPartners = [
  {
    id: "tela-cycle-hub",
    name: "Tela Cycle Hub",
    description: "Donation and upcycling collection center in Bulacan.",
    location: "Dona Rosa Subdivision, Subic, Baliuag, Bulacan, Philippines",
    phone: "+63 928 1500 711",
    email: "info@telacycle.com",
    website: "https://www.telacycle.com/",
  },
  {
    id: "green-loom-partners",
    name: "Green Loom Partners",
    description: "Sustainable textile donation partner.",
    location: "Mandaluyong City, Philippines",
    phone: "+63 918 440 1120",
    email: "juan@partner.com",
  },
  {
    id: "circular-weaves-hub",
    name: "Circular Weaves Hub",
    description: "Community recycling and education partner.",
    location: "Quezon City, Philippines",
    phone: "+63 916 337 9012",
    email: "lisa@partner.com",
  },
  {
    id: "urban-fiber-works",
    name: "Urban Fiber Works",
    description: "Upcycling studio for local creatives.",
    location: "Pasig City, Philippines",
    phone: "+63 917 210 4411",
    email: "contact@fiberworks.ph",
  },
];

export function LandingPage() {
  return (
    <div
      className="
        landing-page
        relative
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

              <h1 className="text-6xl md:text-8xl font-light leading-[0.95] tracking-tight mb-8 text-[#19221d] dark:text-white">
                Give Your Clothes
                <span className="block text-[#336158]">
                  A Second Life
                </span>
              </h1>

              <p className="text-xl text-[#5f6f67] dark:text-zinc-400 mb-10 max-w-2xl leading-relaxed">
                Not sure whether to recycle, donate, or upcycle? ClothCycle PH
                uses a DSS engine to read your textile details, fabric clues,
                and burn-test answers, then recommends the best next step.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/login"
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
                  href="#about"
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* About */}
      <motion.section
        id="about"
        className="py-24 px-6 bg-white dark:bg-white/[0.02]"
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={revealUp}
            className="mx-auto max-w-5xl text-center"
          >
            <h3 className="text-5xl font-light mb-10 text-[#19221d] dark:text-white">
              About ClothCycle PH
            </h3>

            <div className="space-y-6 text-lg leading-8 text-[#5f6f67] dark:text-zinc-300">
              <p>
                ClothCycle PH is a sustainable textile management platform
                dedicated to giving clothes and fabric materials a second life
                through recycling, donation, upcycling, and responsible
                disposal. Our goal is to help reduce textile waste in the
                Philippines by connecting individuals with trusted
                organizations, recycling partners, and communities that support
                sustainable fashion and circular living.
              </p>

              <p>
                Through smart recommendations and community-driven solutions,
                ClothCycle PH makes it easier for users to decide the best next
                step for their unwanted clothing items based on their condition,
                material, and usability. Whether it&apos;s donating wearable
                clothes, recycling damaged fabrics, or transforming old textiles
                into something new, ClothCycle PH promotes environmentally
                responsible practices that contribute to a greener future.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* SDG 12 */}
      <motion.section
        id="sdg-12"
        className="py-24 px-6 bg-transparent"
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={revealUp}
            className="
              grid
              gap-8
              md:grid-cols-[auto_minmax(0,1fr)]
              md:gap-12
              items-center
            "
          >
            <div className="flex justify-center md:justify-start">
              <img
                src="/sdg12-logo.png"
                alt="SDG 12 Responsible Consumption and Production"
                className="w-full max-w-[300px] md:max-w-[340px] bg-white"
              />
            </div>

            <div>
              <h3 className="font-sans text-4xl md:text-5xl font-semibold mb-6 text-[#19221d] dark:text-white">
                Aligned With SDG 12
              </h3>

              <p className="text-lg md:text-xl leading-relaxed text-[#5f6f67] dark:text-zinc-300">
                At ClothCycle PH, we believe fashion should not come at the
                expense of the planet. Our platform aligns with Sustainable
                Development Goal 12: Responsible Consumption and Production by
                promoting sustainable clothing practices such as recycling,
                upcycling, and donating pre-loved garments instead of sending
                them to landfills.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section
        id="how-it-works"
        className="py-24 px-6 bg-white dark:bg-white/[0.02]"
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            variants={revealUp}
          >
            <h3 className="text-5xl font-light mb-4 text-[#19221d] dark:text-white">
              How It Works
            </h3>

            <p className="text-lg text-[#5f6f67] dark:text-zinc-400">
              Four modern ways to contribute sustainably
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerGroup}
          >
            {[
              {
                icon: Sparkles,
                title: "DSS Guidance",
                description:
                  "Answer simple textile questions and get a recommended path when you are not sure what to do.",
              },
              {
                icon: Package,
                title: "Donate",
                description:
                  "Support communities by giving garments a meaningful second purpose.",
              },
              {
                icon: Recycle,
                title: "Recycle",
                description:
                  "Divert damaged or unusable textiles into responsible recycling streams.",
              },
              {
                icon: Scissors,
                title: "Upcycle",
                description:
                  "Recycle or upcycle pieces into new materials and creative second-life products.",
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={revealUp}
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
          </motion.div>
        </div>
      </motion.section>

      {/* Partners */}
      <motion.section
        id="featured-partners"
        className="py-24 px-6"
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            variants={revealUp}
          >
            <h3 className="text-5xl font-light mb-4 text-[#19221d] dark:text-white">
              Featured Partners
            </h3>

            <p className="text-lg text-[#5f6f67] dark:text-zinc-400 mb-16">
              Organizations helping create a sustainable future
            </p>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
              variants={staggerGroup}
            >
              {featuredPartners.map((partner) => (
                <motion.div
                  key={partner.id}
                  variants={revealScale}
                  whileHover={{ y: -6 }}
                  className="
                    p-6
                    bg-white
                    dark:bg-white/5
                    backdrop-blur-xl
                    border
                    border-[#e7ebe6]
                    dark:border-white/10
                    rounded-3xl
                    shadow-sm
                    hover:bg-[#f3f5f2]
                    dark:hover:bg-white/10
                    transition-all
                    flex
                    flex-col
                    justify-between
                  "
                >
                  <div>
                    <h4 className="text-xl font-semibold text-[#19221d] dark:text-white mb-2">
                      {partner.name}
                    </h4>
                    <p className="text-sm text-[#5f6f67] dark:text-zinc-300 mb-4">
                      {partner.description}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-[#4b5563] dark:text-zinc-200">
                    <p>{partner.location}</p>
                    <p>{partner.phone}</p>
                    <p>{partner.email}</p>
                    {partner.website && (
                      <a
                        href={partner.website}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[#336158] hover:underline dark:text-emerald-300"
                      >
                        Visit website
                      </a>
                    )}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        partner.location
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex mt-3 items-center justify-center rounded-full bg-[#336158] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4c48] transition-colors"
                    >
                      View on map
                    </a>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        className="bg-[#f3f5f2] dark:bg-[#0b0d12] border-t border-[#e7ebe6] dark:border-white/10 py-16 px-6"
        initial="hidden"
        whileInView="visible"
        viewport={viewportReveal}
        variants={revealUp}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
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
                    About ClothCycle PH
                  </a>
                </div>

                <div>
                  <a
                    href="#sdg-12"
                    className="hover:text-[#336158] dark:hover:text-white transition-colors"
                  >
                    Aligned with SDG 12
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
                    href="#featured-partners"
                    className="hover:text-[#336158] dark:hover:text-white transition-colors"
                  >
                    Featured Partners
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg mb-5 text-[#19221d] dark:text-white">
                Contact
              </h4>

              <div className="space-y-3 text-[#5f6f67] dark:text-zinc-500">
                <a
                  href="mailto:clothcycleph@gmail.com"
                  className="block hover:text-[#336158] hover:underline"
                >
                  clothcycleph@gmail.com
                </a>

                <div>+63 912 345 6789</div>
                <div>Makati City, Metro Manila, Philippines</div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#e7ebe6] dark:border-white/10 pt-8 text-center text-[#5f6f67] dark:text-zinc-500">
            <p className="font-inter">
              &copy; 2026 ClothCycle PH. All rights reserved.
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
