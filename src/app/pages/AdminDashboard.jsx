import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "motion/react";
import { Recycle, Users, Shield, Building2, Activity, Bell, User, Crown, UserCog, ChevronRight, Search, Settings, LogOut } from "lucide-react";
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

  return "bg-[#b99a4a]/20 text-[#4a3300]";
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="admin-dashboard app-darkable-page min-h-screen bg-gradient-to-br from-[#fbf7ec] to-[#eadfbe]">
      {/* Top Navigation */}
      <nav className="bg-gradient-to-r from-[#806326] to-[#b99a4a] border-b border-[#6f5520] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-white" />
              <span className="text-xl text-white font-gloock">ClothCycle PH</span>
            </div>
            <span className="px-3 py-1 bg-[#fff3c4] text-[#4a3300] text-sm rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/notifications?theme=admin" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <Bell className="w-5 h-5 text-white" />
            </Link>
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                aria-label="Open profile menu"
                title="Profile"
              >
                <User className="w-5 h-5 text-white" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-12 z-30 w-44 rounded-2xl border border-[#ead9aa] bg-white p-2 shadow-[0_16px_40px_rgba(74,51,0,0.18)]">
                  <Link
                    to="/settings?theme=admin"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#4a3300] hover:bg-[#fff8e6]"
                  >
                    <Settings className="h-4 w-4 text-[#7a5a13]" />
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
          <h1 className="text-4xl mb-2 text-[#4a3300] flex items-center gap-3">
            <Crown className="w-10 h-10 text-[#9a7a2f]" />
            Admin Dashboard
          </h1>
          <p className="text-lg text-[#7a5a13]">Full system control and management</p>
        </motion.div>

        {/* System Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: "Total Users", value: "1,500", trend: "+120", color: "#b99a4a" },
            { icon: Shield, label: "Total Admins", value: "19", trend: "+3", color: "#9a7a2f" },
            { icon: Building2, label: "Total Partners", value: "58", trend: "+8", color: "#c7ad65" },
            { icon: Activity, label: "System Health", value: "98.5%", trend: "Optimal", color: "#d6c281" }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg border-2 border-transparent hover:border-[#b99a4a] transition-all"
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
              <div className="text-3xl mb-1 text-[#4a3300]">{metric.value}</div>
              <div className="text-sm text-[#7a5a13]">{metric.label}</div>
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
          <h3 className="text-xl mb-6 text-[#4a3300]">System Growth Analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={systemData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b99a4a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#b99a4a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAdmins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9a7a2f" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9a7a2f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c7ad65" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c7ad65" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ead9aa" />
              <XAxis dataKey="date" stroke="#7a5a13" />
              <YAxis stroke="#7a5a13" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #ead9aa",
                  borderRadius: "12px"
                }}
              />
              <Area type="monotone" dataKey="users" stroke="#b99a4a" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
              <Area type="monotone" dataKey="admins" stroke="#9a7a2f" fillOpacity={1} fill="url(#colorAdmins)" strokeWidth={2} />
              <Area type="monotone" dataKey="partners" stroke="#c7ad65" fillOpacity={1} fill="url(#colorPartners)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Role Management Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: Users, title: "Manage Users", count: "1,500", color: "#b99a4a" },
            { icon: Shield, title: "Manage Admins", count: "19", color: "#9a7a2f" },
            { icon: Building2, title: "Manage Partners", count: "58", color: "#c7ad65" }
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
              <h3 className="text-xl mb-2 text-[#4a3300]">{card.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl text-[#7a5a13]">{card.count} users</span>
                <ChevronRight className="w-5 h-5 text-[#7a5a13]" />
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
            <h3 className="text-xl text-[#4a3300]">User Management</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a5a13]" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 border-2 border-[#ead9aa] rounded-lg focus:border-[#b99a4a] focus:outline-none bg-white"
                />
              </div>
              <button className="px-4 py-2 bg-[#b99a4a] text-[#2d2100] rounded-lg hover:bg-[#9a7a2f] hover:text-white transition-colors">
                Add New
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ead9aa]">
                  <th className="text-left py-3 px-4 text-sm text-[#7a5a13]">Name</th>
                  <th className="text-left py-3 px-4 text-sm text-[#7a5a13]">Role</th>
                  <th className="text-left py-3 px-4 text-sm text-[#7a5a13]">Email</th>
                  <th className="text-left py-3 px-4 text-sm text-[#7a5a13]">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-[#7a5a13]">Joined</th>
                  <th className="text-left py-3 px-4 text-sm text-[#7a5a13]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managementItems.map((item) => (
                  <tr key={item.id} className="border-b border-[#ead9aa] hover:bg-[#fff8e6] transition-colors">
                    <td className="py-3 px-4 text-sm text-[#4a3300]">{item.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          item.role === "Admin"
                            ? "bg-[#9a7a2f]/20 text-[#4a3300]"
                            : item.role === "Partner"
                            ? "bg-[#c7ad65]/20 text-[#4a3300]"
                            : "bg-[#d6c281]/20 text-[#4a3300]"
                        }`}
                      >
                        {item.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#7a5a13]">{item.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          item.status === "active"
                            ? "bg-[#b99a4a]/20 text-[#4a3300]"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#7a5a13]">{item.joined}</td>
                    <td className="py-3 px-4">
                      <button className="w-8 h-8 rounded-lg bg-[#b99a4a]/20 flex items-center justify-center hover:bg-[#b99a4a]/30 transition-colors">
                        <UserCog className="w-4 h-4 text-[#9a7a2f]" />
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
          <h3 className="text-xl mb-4 text-[#4a3300]">Recent System Activity</h3>
          <div className="space-y-3">
            {[
              { time: "10:45 AM", action: "New user registered", user: "Ana Reyes" },
              { time: "10:30 AM", action: "Admin role assigned", user: "Maria Santos" },
              { time: "10:15 AM", action: "Partner approved", user: "Juan Cruz" },
              { time: "09:50 AM", action: "System backup completed", user: "System" }
            ].map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#fff8e6] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#b99a4a]"></div>
                  <div>
                    <div className="text-sm text-[#4a3300]">{log.action}</div>
                    <div className="text-xs text-[#7a5a13]">{log.user}</div>
                  </div>
                </div>
                <span className="text-sm text-[#7a5a13]">{log.time}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#4a3300]/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#ead9aa] bg-white p-6 shadow-[0_24px_70px_rgba(74,51,0,0.24)]">
            <h2 className="font-sans text-xl font-bold text-[#4a3300]">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-[#7a5a13]">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-[#ead9aa] px-4 py-2 text-[#7a5a13] hover:bg-[#fff8e6]"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded-xl bg-[#b99a4a] px-4 py-2 text-[#2d2100] hover:bg-[#9a7a2f] hover:text-white"
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
