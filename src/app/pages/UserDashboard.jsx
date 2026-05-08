import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Recycle,
  Heart,
  Sparkles,
  HelpCircle,
  Package,
  Clock,
  TrendingUp,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Bell,
  User,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const monthlyData = [
  { month: "Jan", items: 12 },
  { month: "Feb", items: 18 },
  { month: "Mar", items: 25 },
  { month: "Apr", items: 22 },
  { month: "May", items: 30 },
  { month: "Jun", items: 28 },
];

const distributionData = [
  { name: "Recycle", value: 45, color: "#336158" },
  { name: "Donate", value: 35, color: "#7d9283" },
  { name: "Upcycle", value: 20, color: "#d0b684" },
];

const cardClass =
  "bg-white/90 border border-[#e1e7df] shadow-[0_12px_34px_rgba(25,34,29,0.08)]";

export function UserDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] text-[#19221d]">
      <nav className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-[#e1e7df] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button className="md:hidden">
              <Menu className="w-6 h-6 text-[#19221d]" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-[#336158]" />
              <span className="text-xl text-[#19221d] font-gloock">
                ClothCycle PH
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-[#f3f5f2] border border-[#e1e7df] flex items-center justify-center hover:bg-[#e7ebe6] transition-colors">
              <Bell className="w-5 h-5 text-[#5f6f67]" />
            </button>
            <Link
              to="/settings"
              className="w-10 h-10 rounded-full bg-[#f3f5f2] border border-[#e1e7df] flex items-center justify-center hover:bg-[#e7ebe6] transition-colors"
            >
              <User className="w-5 h-5 text-[#5f6f67]" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-[28px] border border-[#dce4da] bg-white/80 shadow-[0_24px_80px_rgba(25,34,29,0.12)]"
        >
          <div className="grid gap-8 md:grid-cols-[1.3fr_0.7fr]">
            <div className="p-8 md:p-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dce4da] bg-[#f3f5f2] px-4 py-2 text-sm text-[#5f6f67]">
                <Sparkles className="w-4 h-4 text-[#336158]" />
                Circular textile dashboard
              </div>
              <h1 className="font-gloock text-4xl md:text-5xl mb-3 text-[#19221d]">
                Welcome Back
              </h1>
              <p className="text-lg text-[#5f6f67] max-w-2xl">
                Track your impact, submit textiles, and keep your sustainability
                activity moving.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/submit")}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#336158] px-5 py-3 text-white transition-all hover:bg-[#2a4c48] hover:shadow-lg"
                >
                  <Package className="w-5 h-5" />
                  New Submission
                </button>
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#dce4da] bg-white px-5 py-3 text-[#336158] transition-all hover:bg-[#f3f5f2]"
                >
                  <Settings className="w-5 h-5" />
                  Account Settings
                </Link>
              </div>
            </div>
            <div className="relative hidden min-h-64 items-center justify-center overflow-hidden bg-gradient-to-br from-[#dfe8dd] to-[#aebfb2] md:flex">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.65),_transparent_34%)]" />
              <Recycle className="relative z-10 h-32 w-32 text-[#336158]" />
            </div>
          </div>
        </motion.section>

        <section className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Recycle, title: "Recycle", color: "#336158" },
            { icon: Heart, title: "Donate", color: "#7d9283" },
            { icon: Sparkles, title: "Upcycle", color: "#d0b684" },
            { icon: HelpCircle, title: "Not Sure?", color: "#8b9f90" },
          ].map((service, index) => (
            <motion.button
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => navigate("/submit")}
              className={`${cardClass} p-6 rounded-2xl hover:shadow-[0_18px_48px_rgba(25,34,29,0.14)] transition-all text-left`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: service.color }}
              >
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg text-[#19221d]">{service.title}</h3>
            </motion.button>
          ))}
        </section>

        <section className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            {
              icon: Package,
              label: "Total Submissions",
              value: "47",
              color: "#336158",
            },
            {
              icon: Clock,
              label: "Pending Requests",
              value: "3",
              color: "#d4a574",
            },
            {
              icon: TrendingUp,
              label: "Items Diverted",
              value: "125",
              color: "#336158",
            },
            {
              icon: MessageSquare,
              label: "Messages",
              value: "5",
              color: "#7d9283",
            },
          ].map((widget, index) => (
            <motion.div
              key={widget.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className={`${cardClass} p-6 rounded-2xl`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${widget.color}20` }}
                >
                  <widget.icon
                    className="w-6 h-6"
                    style={{ color: widget.color }}
                  />
                </div>
              </div>
              <div className="text-3xl mb-1 text-[#19221d]">{widget.value}</div>
              <div className="text-sm text-[#5f6f67]">{widget.label}</div>
            </motion.div>
          ))}
        </section>

        <section className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={`${cardClass} p-6 rounded-2xl`}
          >
            <h3 className="text-xl mb-4 text-[#19221d]">Monthly Activity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7ebe6" />
                <XAxis dataKey="month" stroke="#5f6f67" />
                <YAxis stroke="#5f6f67" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid #e7ebe6",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="items" fill="#336158" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className={`${cardClass} p-6 rounded-2xl`}
          >
            <h3 className="text-xl mb-4 text-[#19221d]">Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid #e7ebe6",
                    borderRadius: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`${cardClass} p-6 rounded-2xl`}
        >
          <h3 className="text-xl mb-4 text-[#19221d]">Quick Actions</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              to="/submit"
              className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#f8faf6] to-white rounded-xl hover:shadow-lg transition-all border border-[#e1e7df]"
            >
              <div className="w-10 h-10 bg-[#336158] rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-[#19221d]">New Submission</div>
                <div className="text-sm text-[#5f6f67]">Submit textiles</div>
              </div>
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#f8faf6] to-white rounded-xl hover:shadow-lg transition-all border border-[#e1e7df]"
            >
              <div className="w-10 h-10 bg-[#7d9283] rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-[#19221d]">Settings</div>
                <div className="text-sm text-[#5f6f67]">Manage account</div>
              </div>
            </Link>

            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#f8faf6] to-white rounded-xl hover:shadow-lg transition-all border border-[#e1e7df]"
            >
              <div className="w-10 h-10 bg-[#8b9f90] rounded-lg flex items-center justify-center">
                <LogOut className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-[#19221d]">Log Out</div>
                <div className="text-sm text-[#5f6f67]">Exit dashboard</div>
              </div>
            </button>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
