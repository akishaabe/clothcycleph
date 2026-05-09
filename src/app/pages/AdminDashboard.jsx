import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "motion/react";
import { Recycle, Users, Shield, Building2, Activity, Bell, User, Crown, UserCog, ChevronRight, Search, Settings, LogOut, MessageSquare } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const systemData = [
  { date: "01 May", users: 1200, admins: 15, partners: 45 },
  { date: "08 May", users: 1280, admins: 16, partners: 48 },
  { date: "15 May", users: 1350, admins: 17, partners: 52 },
  { date: "22 May", users: 1420, admins: 18, partners: 55 },
  { date: "29 May", users: 1500, admins: 19, partners: 58 }
];

const managementItems = [
  { id: 1, name: "Maria Santos", role: "Admin", email: "maria@clothcycle.ph", status: "active", joined: "2025-12-15" },
  { id: 2, name: "Juan Cruz", role: "Partner", email: "juan@partner.com", status: "active", joined: "2026-01-10" },
  { id: 3, name: "Ana Reyes", role: "User", email: "ana@email.com", status: "active", joined: "2026-02-20" },
  { id: 4, name: "Pedro Garcia", role: "Admin", email: "pedro@clothcycle.ph", status: "inactive", joined: "2025-11-05" },
  { id: 5, name: "Lisa Tan", role: "Partner", email: "lisa@partner.com", status: "active", joined: "2026-03-12" }
];

const getTrendClass = (value) => {
  if (value.startsWith("-")) {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  if (value.startsWith("+")) {
    return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300";
  }

  return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200";
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="admin-dashboard app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e5e7eb,_transparent_28%),linear-gradient(135deg,#f7f7f7,#ffffff,#eeeeee)]">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-gray-950" />
              <span className="text-xl text-gray-950 font-gloock">ClothCycle PH</span>
            </div>
            <span className="admin-crown-badge px-3 py-1 bg-[#fff3c4] text-[#4a3300] text-sm rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#9a7a2f]" />
              Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/messages?theme=admin" className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors" aria-label="Open messages" title="Messages">
              <MessageSquare className="w-5 h-5 text-gray-700" />
            </Link>
            <Link to="/notifications?theme=admin" className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Bell className="w-5 h-5 text-gray-700" />
            </Link>
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors"
                aria-label="Open profile menu"
                title="Profile"
              >
                <User className="w-5 h-5 text-gray-700" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-12 z-30 w-44 rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
                  <Link
                    to="/settings?theme=admin"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-gray-950 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4 text-gray-600" />
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
          <h1 className="text-4xl mb-2 text-gray-950 flex items-center gap-3">
            <Crown className="w-10 h-10 text-[#9a7a2f]" />
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">Full system control and management</p>
        </motion.div>

        {/* System Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: "Total Users", value: "1,500", trend: "+120", color: "#111827" },
            { icon: Shield, label: "Total Admins", value: "19", trend: "+3", color: "#374151" },
            { icon: Building2, label: "Total Partners", value: "58", trend: "+8", color: "#4b5563" },
            { icon: Activity, label: "System Health", value: "98.5%", trend: "Optimal", color: "#6b7280" }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:border-gray-950 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}` }}
                >
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <span className={`text-sm px-2 py-1 rounded-lg ${getTrendClass(metric.trend)}`}>{metric.trend}</span>
              </div>
              <div className="text-3xl mb-1 text-gray-950">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.label}</div>
            </motion.div>
          ))}
        </div>

        {/* System Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-lg mb-8"
        >
          <h3 className="text-xl mb-6 text-gray-950">System Growth Analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={systemData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111827" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAdmins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4b5563" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#4b5563" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#4b5563" />
              <YAxis stroke="#4b5563" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px"
                }}
              />
              <Area type="monotone" dataKey="users" stroke="#111827" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
              <Area type="monotone" dataKey="admins" stroke="#4b5563" fillOpacity={1} fill="url(#colorAdmins)" strokeWidth={2} />
              <Area type="monotone" dataKey="partners" stroke="#9ca3af" fillOpacity={1} fill="url(#colorPartners)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Role Management Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: Users, title: "Manage Users", count: "1,500", color: "#111827" },
            { icon: Shield, title: "Manage Admins", count: "19", color: "#374151" },
            { icon: Building2, title: "Manage Partners", count: "58", color: "#4b5563" }
          ].map((card, index) => (
            <motion.button
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all text-left"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: card.color }}
              >
                <card.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl mb-2 text-gray-950">{card.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl text-gray-600">{card.count} users</span>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* User Management Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white p-6 rounded-2xl shadow-lg mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-gray-950">User Management</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-gray-950 focus:outline-none bg-white text-gray-950"
                />
              </div>
              <button className="px-4 py-2 bg-gray-950 text-white rounded-lg hover:bg-black transition-colors">
                Add New
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Role</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Joined</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managementItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-950">{item.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          item.role === "Admin"
                            ? "bg-gray-950 text-white"
                            : item.role === "Partner"
                            ? "bg-gray-200 text-gray-950"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          item.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.joined}</td>
                    <td className="py-3 px-4">
                      <button className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <UserCog className="w-4 h-4 text-gray-700" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* System Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white p-6 rounded-2xl shadow-lg"
        >
          <h3 className="text-xl mb-4 text-gray-950">Recent System Activity</h3>
          <div className="space-y-3">
            {[
              { time: "10:45 AM", action: "New user registered", user: "Ana Reyes" },
              { time: "10:30 AM", action: "Admin role assigned", user: "Maria Santos" },
              { time: "10:15 AM", action: "Partner approved", user: "Juan Cruz" },
              { time: "09:50 AM", action: "System backup completed", user: "System" }
            ].map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-950"></div>
                  <div>
                    <div className="text-sm text-gray-950">{log.action}</div>
                    <div className="text-xs text-gray-600">{log.user}</div>
                  </div>
                </div>
                <span className="text-sm text-gray-600">{log.time}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
            <h2 className="font-sans text-xl font-bold text-gray-950">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded-xl bg-gray-950 px-4 py-2 text-white hover:bg-black"
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
