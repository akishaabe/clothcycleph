import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "motion/react";
import { Recycle, Users, Package, TrendingUp, CheckCircle, XCircle, Bell, User, BarChart3, Settings, LogOut, MessageSquare } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const platformData = [
  { month: "Jan", users: 850, submissions: 420 },
  { month: "Feb", users: 920, submissions: 480 },
  { month: "Mar", users: 1050, submissions: 550 },
  { month: "Apr", users: 1180, submissions: 620 },
  { month: "May", users: 1320, submissions: 680 },
  { month: "Jun", users: 1450, submissions: 750 }
];

const submissions = [
  { id: "SUB-001", user: "Maria Santos", type: "Recycle", items: 15, status: "pending", date: "2026-05-06" },
  { id: "SUB-002", user: "Juan Cruz", type: "Donate", items: 8, status: "pending", date: "2026-05-06" },
  { id: "SUB-003", user: "Ana Reyes", type: "Upcycle", items: 5, status: "approved", date: "2026-05-05" },
  { id: "SUB-004", user: "Pedro Garcia", type: "Recycle", items: 12, status: "approved", date: "2026-05-05" },
  { id: "SUB-005", user: "Lisa Tan", type: "Donate", items: 20, status: "rejected", date: "2026-05-04" }
];

const getTrendClass = (value) => {
  if (value.startsWith("-")) {
    return "text-red-600 dark:text-red-300";
  }

  if (value.startsWith("+")) {
    return "text-green-700 dark:text-green-300";
  }

  return "text-[#4f6f9f]";
};

export function PartnerDashboard() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="partner-dashboard app-darkable-page min-h-screen bg-gradient-to-br from-[#f3f7fb] to-[#e4edf6]">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-[#d6e6f8] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-[#4f6f9f]" />
              <span className="text-xl text-[#10233f] font-gloock">ClothCycle PH</span>
            </div>
            <span className="px-3 py-1 bg-[#4f6f9f] text-white text-sm rounded-full">Partner</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/messages?theme=partner" className="w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center hover:bg-[#dbeafe] transition-colors" aria-label="Open messages" title="Messages">
              <MessageSquare className="w-5 h-5 text-[#41668f]" />
            </Link>
            <Link to="/notifications?theme=partner" className="w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center hover:bg-[#dbeafe] transition-colors">
              <Bell className="w-5 h-5 text-[#41668f]" />
            </Link>
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                className="w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center hover:bg-[#dbeafe] transition-colors"
                aria-label="Open profile menu"
                title="Profile"
              >
                <User className="w-5 h-5 text-[#41668f]" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-12 z-30 w-44 rounded-2xl border border-[#d6e6f8] bg-white p-2 shadow-[0_16px_40px_rgba(16,35,63,0.16)]">
                  <Link
                    to="/settings?theme=partner"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#10233f] hover:bg-[#eff6ff]"
                  >
                    <Settings className="h-4 w-4 text-[#41668f]" />
                    Settings
                  </Link>
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

      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl mb-2 text-[#10233f]">Partner Dashboard</h1>
          <p className="text-lg text-[#41668f]">Platform overview and management</p>
        </motion.div>

        {/* Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: "Total Users", value: "1,450", change: "+12%", color: "#4f6f9f" },
            { icon: Package, label: "Active Requests", value: "23", change: "+5", color: "#8aa6c8" },
            { icon: TrendingUp, label: "Partner Activity", value: "87%", change: "+3%", color: "#3f5f8f" },
            { icon: BarChart3, label: "Total Submissions", value: "750", change: "+8%", color: "#6b93b8" }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}20` }}
                >
                  <metric.icon className="w-6 h-6" style={{ color: metric.color }} />
                </div>
                <span className={`text-sm ${getTrendClass(metric.change)}`}>{metric.change}</span>
              </div>
              <div className="text-3xl mb-1 text-[#10233f]">{metric.value}</div>
              <div className="text-sm text-[#41668f]">{metric.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Analytics Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-lg mb-8"
        >
          <h3 className="text-xl mb-6 text-[#10233f]">Platform Analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d6e6f8" />
              <XAxis dataKey="month" stroke="#41668f" />
              <YAxis stroke="#41668f" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #d6e6f8",
                  borderRadius: "12px"
                }}
              />
              <Line type="monotone" dataKey="users" stroke="#4f6f9f" strokeWidth={3} dot={{ fill: "#4f6f9f", r: 5 }} />
              <Line type="monotone" dataKey="submissions" stroke="#6b93b8" strokeWidth={3} dot={{ fill: "#6b93b8", r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Submissions Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-2xl shadow-lg"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-[#10233f]">Recent Submissions</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#eff6ff] text-[#41668f] rounded-lg hover:bg-[#dbeafe] transition-colors text-sm">
                Filter
              </button>
              <button className="px-4 py-2 bg-[#4f6f9f] text-white rounded-lg hover:bg-[#3f5f8f] transition-colors text-sm">
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d6e6f8]">
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">ID</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">User</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Type</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Items</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Date</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id} className="border-b border-[#d6e6f8] hover:bg-[#eff6ff] transition-colors">
                    <td className="py-3 px-4 text-sm text-[#10233f]">{submission.id}</td>
                    <td className="py-3 px-4 text-sm text-[#10233f]">{submission.user}</td>
                    <td className="py-3 px-4 text-sm text-[#41668f]">{submission.type}</td>
                    <td className="py-3 px-4 text-sm text-[#41668f]">{submission.items}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          submission.status === "approved"
                            ? "bg-[#4f6f9f]/20 text-[#10233f]"
                            : submission.status === "pending"
                            ? "bg-[#8aa6c8]/20 text-[#3f5f8f]"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {submission.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#41668f]">{submission.date}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="w-8 h-8 rounded-lg bg-[#4f6f9f]/20 flex items-center justify-center hover:bg-[#4f6f9f]/30 transition-colors">
                          <CheckCircle className="w-4 h-4 text-[#4f6f9f]" />
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors">
                          <XCircle className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10233f]/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#d6e6f8] bg-white p-6 shadow-[0_24px_70px_rgba(16,35,63,0.24)]">
            <h2 className="font-sans text-xl font-bold text-[#10233f]">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-[#41668f]">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-[#d6e6f8] px-4 py-2 text-[#41668f] hover:bg-[#eff6ff]"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded-xl bg-[#4f6f9f] px-4 py-2 text-white hover:bg-[#3f5f8f]"
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
