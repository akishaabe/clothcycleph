import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Recycle,
  PackageOpen,
  RefreshCcw,
  HelpCircle,
  Package,
  Clock,
  TrendingUp,
  MessageSquare,
  Menu,
  Bell,
  User,
  Settings,
  LogOut,
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

const serviceCards = [
  {
    icon: Recycle,
    title: "Recycle",
    color: "#336158",
    background: "#f1f7ef",
    wide: false,
  },
  {
    icon: PackageOpen,
    title: "Donate",
    color: "#55735d",
    background: "#f3f8f0",
    wide: false,
  },
  {
    icon: RefreshCcw,
    title: "Upcycle",
    color: "#9a7738",
    background: "#f8f2e6",
    wide: false,
  },
  {
    icon: HelpCircle,
    title: "Not Sure?",
    color: "#46564d",
    background: "#f1f6f3",
    wide: true,
  },
];

const cardClass =
  "bg-white/90 border border-[#e1e7df] shadow-[0_12px_34px_rgba(25,34,29,0.08)]";

export function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isNewSignup = location.state?.entry === "signup";
  const greeting = isNewSignup ? "Welcome to ClothCycle PH" : "Welcome Back";

  return (
    <div className="app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] text-[#19221d]">
      <nav className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-[#e1e7df] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button className="md:hidden">
              <Menu className="w-6 h-6 text-[#19221d]" />
            </button>
            <div className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-[#336158]" />
              <span className="text-xl text-[#19221d] font-gloock">
                ClothCycle PH
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/notifications")}
              className="w-10 h-10 rounded-full bg-[#f3f5f2] border border-[#e1e7df] flex items-center justify-center hover:bg-[#e7ebe6] transition-colors"
              aria-label="Open notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-[#5f6f67]" />
            </button>
            <button
              onClick={() => navigate("/messages")}
              className="w-10 h-10 rounded-full bg-[#f3f5f2] border border-[#e1e7df] flex items-center justify-center hover:bg-[#e7ebe6] transition-colors"
              aria-label="Open messages"
              title="Messages"
            >
              <MessageSquare className="w-5 h-5 text-[#5f6f67]" />
            </button>
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                className="w-10 h-10 rounded-full bg-[#f3f5f2] border border-[#e1e7df] flex items-center justify-center hover:bg-[#e7ebe6] transition-colors"
              >
                <User className="w-5 h-5 text-[#5f6f67]" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-12 w-44 rounded-2xl border border-[#e1e7df] bg-white p-2 shadow-[0_16px_40px_rgba(25,34,29,0.16)]">
                  <button
                    onClick={() => navigate("/settings")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#19221d] hover:bg-[#f3f5f2]"
                  >
                    <Settings className="h-4 w-4 text-[#5f6f67]" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-[28px] border border-[#dce4da] bg-white/80 shadow-[0_24px_80px_rgba(25,34,29,0.12)]"
        >
          <div className="p-8 md:p-10">
            <h1 className="font-gloock text-4xl md:text-5xl mb-3 text-[#19221d]">
              {greeting}
            </h1>
            <p className="text-base text-[#5f6f67] max-w-2xl">
              Track your impact, submit textiles, and keep your sustainability
              activity moving.
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="dashboard-service-section mb-8 rounded-[28px] border border-[#dce7d9] bg-[linear-gradient(135deg,#f8fbf6,#eff6ec,#f7faf5)] p-6 shadow-[0_14px_42px_rgba(51,97,88,0.09)] md:p-8"
        >
          <h2 className="dashboard-service-heading mb-6 text-center font-inter text-xl font-bold text-[#19221d]">
          Select a service
          </h2>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
            {serviceCards.map((service, index) => (
              <motion.button
                key={service.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.08 }}
                whileHover={{ y: -4 }}
                onClick={() =>
                  navigate("/submit", {
                    state: {
                      service:
                        service.title === "Not Sure?" ? "" : service.title,
                    },
                  })
                }
                className={`dashboard-service-card rounded-2xl border border-[#dce4da] p-6 text-center shadow-[0_10px_24px_rgba(25,34,29,0.07)] transition-all hover:brightness-[1.02] hover:shadow-[0_16px_36px_rgba(25,34,29,0.12)] ${
                  service.wide
                    ? "md:col-span-3 flex items-center justify-center gap-5 py-4"
                    : ""
                }`}
                style={{
                  backgroundColor: service.background,
                  borderColor: `${service.color}2f`,
                }}
              >
                <div
                  className={`dashboard-service-icon flex shrink-0 items-center justify-center rounded-full bg-white/85 shadow-inner ${
                    service.wide ? "h-16 w-16" : "mx-auto mb-4 h-24 w-24"
                  }`}
                >
                  <service.icon
                    className={service.wide ? "h-8 w-8" : "h-12 w-12"}
                    style={{ color: service.color }}
                  />
                </div>
                <span
                  className={`dashboard-service-title text-[#19221d] ${
                    service.wide ? "text-lg font-semibold" : "text-xl"
                  }`}
                >
                  {service.title}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        <section className="grid md:grid-cols-3 gap-6 mb-8">
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
          ].map((widget, index) => (
            <motion.button
              key={widget.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className={`${cardClass} p-6 rounded-2xl text-left`}
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
            </motion.button>
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

      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19221d]/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#e1e7df] bg-white p-6 shadow-[0_24px_70px_rgba(25,34,29,0.24)]">
            <h2 className="font-sans text-xl font-bold text-[#19221d]">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-[#5f6f67]">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-[#dce4da] px-4 py-2 text-[#5f6f67] hover:bg-[#f3f5f2]"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded-xl bg-[#336158] px-4 py-2 text-white hover:bg-[#2a4c48]"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
