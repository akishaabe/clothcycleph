import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Recycle, Heart, Sparkles, Users, Package, TrendingUp, Leaf, Facebook, Twitter, Instagram } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f0] to-[#e8ebe4]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#d4d8d0]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Recycle className="w-8 h-8 text-[#6b8e6b]" />
            </motion.div>
            <span className="text-2xl text-[#2d4a2d]">ClothCycle PH</span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-[#4a5f4a] hover:text-[#6b8e6b] transition-colors">About</a>
            <a href="#partner" className="text-[#4a5f4a] hover:text-[#6b8e6b] transition-colors">Partner</a>
            <Link to="/login" className="text-[#4a5f4a] hover:text-[#6b8e6b] transition-colors">Log In</Link>
            <Link
              to="/signup"
              className="px-6 py-2 bg-[#6b8e6b] text-white rounded-full hover:bg-[#5a7a5a] transition-all hover:shadow-lg"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-6xl mb-6 text-[#2d4a2d]">
                Give Your Clothes a <span className="text-[#6b8e6b]">Second Life</span>
              </h1>
              <p className="text-xl text-[#5a6f5a] mb-8">
                Join the sustainable fashion revolution. Recycle, donate, or upcycle your textiles and make a real impact on our planet.
              </p>
              <div className="flex gap-4">
                <Link
                  to="/submit"
                  className="px-8 py-4 bg-[#6b8e6b] text-white rounded-full hover:bg-[#5a7a5a] transition-all hover:shadow-xl hover:scale-105"
                >
                  Recycle Now
                </Link>
                <a
                  href="#how-it-works"
                  className="px-8 py-4 bg-white text-[#6b8e6b] rounded-full border-2 border-[#6b8e6b] hover:bg-[#6b8e6b] hover:text-white transition-all hover:shadow-xl"
                >
                  Learn More
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="w-full h-96 bg-gradient-to-br from-[#a8c9a8] to-[#6b8e6b] rounded-3xl shadow-2xl flex items-center justify-center">
                <Leaf className="w-48 h-48 text-white/30" />
              </div>
              <div className="absolute -top-6 -right-6 bg-white p-6 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#6b8e6b] rounded-full flex items-center justify-center">
                    <Recycle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl text-[#2d4a2d]">50K+</div>
                    <div className="text-sm text-[#5a6f5a]">Items Recycled</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl mb-4 text-[#2d4a2d]">How It Works</h2>
            <p className="text-lg text-[#5a6f5a]">Three simple ways to make a difference</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Recycle, title: "Recycle", description: "Transform old textiles into new materials through our sustainable recycling process", color: "#6b8e6b" },
              { icon: Heart, title: "Donate", description: "Give your gently used clothes to those in need and support local communities", color: "#8fa08f" },
              { icon: Sparkles, title: "Upcycle", description: "Turn unwanted garments into creative, unique pieces with expert guidance", color: "#a8c9a8" }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ y: -10 }}
                className="bg-gradient-to-br from-[#f5f5f0] to-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: item.color }}
                >
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl mb-3 text-[#2d4a2d]">{item.title}</h3>
                <p className="text-[#5a6f5a]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Statistics */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#6b8e6b] to-[#5a7a5a]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center text-white">
            {[
              { icon: Package, value: "50,000+", label: "Items Diverted" },
              { icon: Users, value: "10,000+", label: "Active Users" },
              { icon: TrendingUp, value: "150+", label: "Partner Organizations" }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md p-8 rounded-2xl"
              >
                <stat.icon className="w-12 h-12 mx-auto mb-4" />
                <div className="text-4xl mb-2">{stat.value}</div>
                <div className="text-lg opacity-90">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Partners */}
      <section id="partner" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl mb-4 text-[#2d4a2d]">Featured Partners</h2>
            <p className="text-lg text-[#5a6f5a] mb-12">Collaborating with organizations that share our vision</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-[#f5f5f0] rounded-2xl flex items-center justify-center hover:shadow-lg transition-shadow">
                  <span className="text-[#5a6f5a]">Partner {i}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2d4a2d] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Recycle className="w-6 h-6" />
                <span className="text-xl">ClothCycle PH</span>
              </div>
              <p className="text-white/70">Making sustainable fashion accessible to everyone.</p>
            </div>

            <div>
              <h4 className="mb-4">Quick Links</h4>
              <div className="space-y-2 text-white/70">
                <div><a href="#about" className="hover:text-white transition-colors">About Us</a></div>
                <div><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></div>
                <div><a href="#partner" className="hover:text-white transition-colors">Partners</a></div>
              </div>
            </div>

            <div>
              <h4 className="mb-4">Contact</h4>
              <div className="space-y-2 text-white/70">
                <div>info@clothcycle.ph</div>
                <div>+63 912 345 6789</div>
                <div>Manila, Philippines</div>
              </div>
            </div>

            <div>
              <h4 className="mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 pt-8 text-center text-white/70">
            <p>&copy; 2026 ClothCycle PH. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
