import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Recycle, Users, Shield, Building2, Settings, Activity, Menu, Bell, User, Crown, UserCog, ChevronRight, Search } from "lucide-react";
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

export function SuperAdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f0] to-[#e8ebe4]">
      {/* Top Navigation */}
      <nav className="bg-gradient-to-r from-[#5a7a5a] to-[#6b8e6b] border-b border-[#4a6a4a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="md:hidden">
              <Menu className="w-6 h-6 text-white" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-white" />
              <span className="text-xl text-white font-gloock">ClothCycle PH</span>
            </Link>
            <span className="px-3 py-1 bg-yellow-500 text-[#2d4a2d] text-sm rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Super Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <Bell className="w-5 h-5 text-white" />
            </button>
            <Link to="/settings" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <User className="w-5 h-5 text-white" />
            </Link>
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
          <h1 className="text-4xl mb-2 text-[#2d4a2d] flex items-center gap-3">
            <Crown className="w-10 h-10 text-yellow-600" />
            Super Admin Dashboard
          </h1>
          <p className="text-lg text-[#5a6f5a]">Full system control and management</p>
        </motion.div>

        {/* System Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: "Total Users", value: "1,500", trend: "+120", color: "#6b8e6b" },
            { icon: Shield, label: "Total Admins", value: "19", trend: "+3", color: "#5a7a5a" },
            { icon: Building2, label: "Total Partners", value: "58", trend: "+8", color: "#8fa08f" },
            { icon: Activity, label: "System Health", value: "98.5%", trend: "Optimal", color: "#a8c9a8" }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg border-2 border-transparent hover:border-[#6b8e6b] transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}` }}
                >
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm px-2 py-1 bg-[#6b8e6b]/20 text-[#2d4a2d] rounded-lg">{metric.trend}</span>
              </div>
              <div className="text-3xl mb-1 text-[#2d4a2d]">{metric.value}</div>
              <div className="text-sm text-[#5a6f5a]">{metric.label}</div>
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
          <h3 className="text-xl mb-6 text-[#2d4a2d]">System Growth Analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={systemData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b8e6b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6b8e6b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAdmins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8fa08f" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8fa08f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a8c9a8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a8c9a8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
              <XAxis dataKey="date" stroke="#5a6f5a" />
              <YAxis stroke="#5a6f5a" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #d4d8d0",
                  borderRadius: "12px"
                }}
              />
              <Area type="monotone" dataKey="users" stroke="#6b8e6b" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
              <Area type="monotone" dataKey="admins" stroke="#8fa08f" fillOpacity={1} fill="url(#colorAdmins)" strokeWidth={2} />
              <Area type="monotone" dataKey="partners" stroke="#a8c9a8" fillOpacity={1} fill="url(#colorPartners)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Role Management Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: Users, title: "Manage Users", count: "1,500", color: "#6b8e6b" },
            { icon: Shield, title: "Manage Admins", count: "19", color: "#5a7a5a" },
            { icon: Building2, title: "Manage Partners", count: "58", color: "#8fa08f" }
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
              <h3 className="text-xl mb-2 text-[#2d4a2d]">{card.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl text-[#5a6f5a]">{card.count} users</span>
                <ChevronRight className="w-5 h-5 text-[#5a6f5a]" />
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
            <h3 className="text-xl text-[#2d4a2d]">User Management</h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6f5a]" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 border-2 border-[#d4d8d0] rounded-lg focus:border-[#6b8e6b] focus:outline-none bg-white"
                />
              </div>
              <button className="px-4 py-2 bg-[#6b8e6b] text-white rounded-lg hover:bg-[#5a7a5a] transition-colors">
                Add New
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d4d8d0]">
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Name</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Role</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Email</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Joined</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managementItems.map((item) => (
                  <tr key={item.id} className="border-b border-[#d4d8d0] hover:bg-[#f5f5f0] transition-colors">
                    <td className="py-3 px-4 text-sm text-[#2d4a2d]">{item.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          item.role === "Admin"
                            ? "bg-[#5a7a5a]/20 text-[#2d4a2d]"
                            : item.role === "Partner"
                            ? "bg-[#8fa08f]/20 text-[#2d4a2d]"
                            : "bg-[#a8c9a8]/20 text-[#2d4a2d]"
                        }`}
                      >
                        {item.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#5a6f5a]">{item.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          item.status === "active"
                            ? "bg-[#6b8e6b]/20 text-[#2d4a2d]"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#5a6f5a]">{item.joined}</td>
                    <td className="py-3 px-4">
                      <button className="w-8 h-8 rounded-lg bg-[#6b8e6b]/20 flex items-center justify-center hover:bg-[#6b8e6b]/30 transition-colors">
                        <UserCog className="w-4 h-4 text-[#6b8e6b]" />
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
          <h3 className="text-xl mb-4 text-[#2d4a2d]">Recent System Activity</h3>
          <div className="space-y-3">
            {[
              { time: "10:45 AM", action: "New user registered", user: "Ana Reyes" },
              { time: "10:30 AM", action: "Admin role assigned", user: "Maria Santos" },
              { time: "10:15 AM", action: "Partner approved", user: "Juan Cruz" },
              { time: "09:50 AM", action: "System backup completed", user: "System" }
            ].map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#f5f5f0] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#6b8e6b]"></div>
                  <div>
                    <div className="text-sm text-[#2d4a2d]">{log.action}</div>
                    <div className="text-xs text-[#5a6f5a]">{log.user}</div>
                  </div>
                </div>
                <span className="text-sm text-[#5a6f5a]">{log.time}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
