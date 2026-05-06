import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Recycle, Users, Package, TrendingUp, CheckCircle, XCircle, Clock, Menu, Bell, User, Settings, BarChart3, FileText } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

export function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f0] to-[#e8ebe4]">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-[#d4d8d0] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="md:hidden">
              <Menu className="w-6 h-6 text-[#2d4a2d]" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-[#6b8e6b]" />
              <span className="text-xl text-[#2d4a2d]">ClothCycle PH</span>
            </Link>
            <span className="px-3 py-1 bg-[#6b8e6b] text-white text-sm rounded-full">Admin</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-[#f5f5f0] flex items-center justify-center hover:bg-[#e8ebe4] transition-colors">
              <Bell className="w-5 h-5 text-[#5a6f5a]" />
            </button>
            <Link to="/settings" className="w-10 h-10 rounded-full bg-[#f5f5f0] flex items-center justify-center hover:bg-[#e8ebe4] transition-colors">
              <User className="w-5 h-5 text-[#5a6f5a]" />
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
          <h1 className="text-4xl mb-2 text-[#2d4a2d]">Admin Dashboard</h1>
          <p className="text-lg text-[#5a6f5a]">Platform overview and management</p>
        </motion.div>

        {/* Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, label: "Total Users", value: "1,450", change: "+12%", color: "#6b8e6b" },
            { icon: Package, label: "Active Requests", value: "23", change: "+5", color: "#d4a574" },
            { icon: TrendingUp, label: "Partner Activity", value: "87%", change: "+3%", color: "#8fa08f" },
            { icon: BarChart3, label: "Total Submissions", value: "750", change: "+8%", color: "#a8c9a8" }
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
                <span className="text-sm text-[#6b8e6b]">{metric.change}</span>
              </div>
              <div className="text-3xl mb-1 text-[#2d4a2d]">{metric.value}</div>
              <div className="text-sm text-[#5a6f5a]">{metric.label}</div>
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
          <h3 className="text-xl mb-6 text-[#2d4a2d]">Platform Analytics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ebe4" />
              <XAxis dataKey="month" stroke="#5a6f5a" />
              <YAxis stroke="#5a6f5a" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #d4d8d0",
                  borderRadius: "12px"
                }}
              />
              <Line type="monotone" dataKey="users" stroke="#6b8e6b" strokeWidth={3} dot={{ fill: "#6b8e6b", r: 5 }} />
              <Line type="monotone" dataKey="submissions" stroke="#8fa08f" strokeWidth={3} dot={{ fill: "#8fa08f", r: 5 }} />
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
            <h3 className="text-xl text-[#2d4a2d]">Recent Submissions</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#f5f5f0] text-[#5a6f5a] rounded-lg hover:bg-[#e8ebe4] transition-colors text-sm">
                Filter
              </button>
              <button className="px-4 py-2 bg-[#6b8e6b] text-white rounded-lg hover:bg-[#5a7a5a] transition-colors text-sm">
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d4d8d0]">
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">ID</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">User</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Type</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Items</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Date</th>
                  <th className="text-left py-3 px-4 text-sm text-[#5a6f5a]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id} className="border-b border-[#d4d8d0] hover:bg-[#f5f5f0] transition-colors">
                    <td className="py-3 px-4 text-sm text-[#2d4a2d]">{submission.id}</td>
                    <td className="py-3 px-4 text-sm text-[#2d4a2d]">{submission.user}</td>
                    <td className="py-3 px-4 text-sm text-[#5a6f5a]">{submission.type}</td>
                    <td className="py-3 px-4 text-sm text-[#5a6f5a]">{submission.items}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          submission.status === "approved"
                            ? "bg-[#6b8e6b]/20 text-[#2d4a2d]"
                            : submission.status === "pending"
                            ? "bg-[#d4a574]/20 text-[#8b6f47]"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {submission.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#5a6f5a]">{submission.date}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="w-8 h-8 rounded-lg bg-[#6b8e6b]/20 flex items-center justify-center hover:bg-[#6b8e6b]/30 transition-colors">
                          <CheckCircle className="w-4 h-4 text-[#6b8e6b]" />
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
    </div>
  );
}
