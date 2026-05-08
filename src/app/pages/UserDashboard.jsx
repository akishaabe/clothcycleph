import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Recycle, Heart, Sparkles, HelpCircle, Package, Clock, TrendingUp, MessageSquare, Settings, LogOut, Menu, Bell, User } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const monthlyData = [
  { month: "Jan", items: 12 },
  { month: "Feb", items: 18 },
  { month: "Mar", items: 25 },
  { month: "Apr", items: 22 },
  { month: "May", items: 30 },
  { month: "Jun", items: 28 }
];

const distributionData = [
  { name: "Recycle", value: 45, color: "#6b8e6b" },
  { name: "Donate", value: 35, color: "#8fa08f" },
  { name: "Upcycle", value: 20, color: "#a8c9a8" }
];

export function UserDashboard() {
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
              <span className="text-xl text-[#2d4a2d] font-gloock">ClothCycle PH</span>
            </Link>
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
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl mb-2 text-[#2d4a2d]">Welcome! 👋</h1>
          <p className="text-lg text-[#5a6f5a]">Ready to make a difference today?</p>
        </motion.div>

        {/* Service Selection Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Recycle, title: "Recycle", color: "#6b8e6b", path: "/submit" },
            { icon: Heart, title: "Donate", color: "#8fa08f", path: "/submit" },
            { icon: Sparkles, title: "Upcycle", color: "#a8c9a8", path: "/submit" },
            { icon: HelpCircle, title: "Not Sure?", color: "#b8c9b8", path: "/submit" }
          ].map((service, index) => (
            <motion.button
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => navigate(service.path)}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all text-left"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: service.color }}
              >
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg text-[#2d4a2d]">{service.title}</h3>
            </motion.button>
          ))}
        </div>

        {/* Dashboard Widgets */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Package, label: "Total Submissions", value: "47", color: "#6b8e6b" },
            { icon: Clock, label: "Pending Requests", value: "3", color: "#d4a574" },
            { icon: TrendingUp, label: "Items Diverted", value: "125", color: "#6b8e6b" },
            { icon: MessageSquare, label: "Messages", value: "5", color: "#8fa08f" }
          ].map((widget, index) => (
            <motion.div
              key={widget.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${widget.color}20` }}
                >
                  <widget.icon className="w-6 h-6" style={{ color: widget.color }} />
                </div>
              </div>
              <div className="text-3xl mb-1 text-[#2d4a2d]">{widget.value}</div>
              <div className="text-sm text-[#5a6f5a]">{widget.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-6 rounded-2xl shadow-lg"
          >
            <h3 className="text-xl mb-4 text-[#2d4a2d]">Monthly Activity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
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
                <Bar dataKey="items" fill="#6b8e6b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white p-6 rounded-2xl shadow-lg"
          >
            <h3 className="text-xl mb-4 text-[#2d4a2d]">Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                    border: "2px solid #d4d8d0",
                    borderRadius: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Quick Actions Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white p-6 rounded-2xl shadow-lg"
        >
          <h3 className="text-xl mb-4 text-[#2d4a2d]">Quick Actions</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              to="/submit"
              className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#f5f5f0] to-white rounded-xl hover:shadow-lg transition-all border border-[#d4d8d0]"
            >
              <div className="w-10 h-10 bg-[#6b8e6b] rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-[#2d4a2d]">New Submission</div>
                <div className="text-sm text-[#5a6f5a]">Submit textiles</div>
              </div>
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#f5f5f0] to-white rounded-xl hover:shadow-lg transition-all border border-[#d4d8d0]"
            >
              <div className="w-10 h-10 bg-[#8fa08f] rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-[#2d4a2d]">Settings</div>
                <div className="text-sm text-[#5a6f5a]">Manage account</div>
              </div>
            </Link>

            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#f5f5f0] to-white rounded-xl hover:shadow-lg transition-all border border-[#d4d8d0]"
            >
              <div className="w-10 h-10 bg-[#a8c9a8] rounded-lg flex items-center justify-center">
                <LogOut className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-[#2d4a2d]">Log Out</div>
                <div className="text-sm text-[#5a6f5a]">Exit dashboard</div>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
