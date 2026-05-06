import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Recycle, User, Mail, Lock, Bell, Shield, Trash2, Save, ArrowLeft } from "lucide-react";
import { useState } from "react";
import "./SettingsPage.css";

export function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({
    name: "Juan Dela Cruz",
    email: "juan@email.com",
    phone: "+63 912 345 6789"
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    newsletter: true
  });

  const handleSave = () => {
    alert("Settings saved successfully!");
  };

  return (
    <div className="settings-page min-h-screen bg-gradient-to-br from-[#f5f5f0] to-[#e8ebe4]">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-[#d4d8d0] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[#f5f5f0] flex items-center justify-center hover:bg-[#e8ebe4] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#5a6f5a]" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-[#6b8e6b]" />
              <span className="text-xl text-[#2d4a2d]">ClothCycle PH</span>
            </Link>
          </div>

          <Link to="/dashboard" className="px-4 py-2 text-[#6b8e6b] hover:text-[#5a7a5a] transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl mb-2 text-[#2d4a2d]">Settings</h1>
          <p className="text-lg text-[#5a6f5a]">Manage your account preferences</p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-4 rounded-2xl shadow-lg h-fit"
          >
            <div className="space-y-2">
              {[
                { id: "profile", icon: User, label: "Profile" },
                { id: "security", icon: Lock, label: "Security" },
                { id: "notifications", icon: Bell, label: "Notifications" },
                { id: "account", icon: Shield, label: "Account" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? "bg-[#6b8e6b] text-white"
                      : "text-[#5a6f5a] hover:bg-[#f5f5f0]"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:col-span-3 bg-white p-8 rounded-2xl shadow-lg"
          >
            {activeTab === "profile" && (
              <div>
                <h2 className="text-2xl mb-6 text-[#2d4a2d]">Profile Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm mb-2 text-[#2d4a2d]">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a6f5a]" />
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#2d4a2d]">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a6f5a]" />
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#2d4a2d]">Phone Number</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white"
                    />
                  </div>

                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div>
                <h2 className="text-2xl mb-6 text-[#2d4a2d]">Security Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm mb-2 text-[#2d4a2d]">Current Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a6f5a]" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#2d4a2d]">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a6f5a]" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#2d4a2d]">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a6f5a]" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div>
                <h2 className="text-2xl mb-6 text-[#2d4a2d]">Notification Preferences</h2>
                <div className="space-y-4">
                  {[
                    { key: "emailNotifications", label: "Email Notifications", description: "Receive updates via email" },
                    { key: "pushNotifications", label: "Push Notifications", description: "Get instant notifications" },
                    { key: "smsNotifications", label: "SMS Notifications", description: "Text message alerts" },
                    { key: "newsletter", label: "Newsletter", description: "Monthly sustainability tips" }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-[#f5f5f0] rounded-xl">
                      <div>
                        <div className="text-[#2d4a2d]">{item.label}</div>
                        <div className="text-sm text-[#5a6f5a]">{item.description}</div>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                        className={`w-12 h-6 rounded-full transition-all ${
                          notifications[item.key] ? "bg-[#6b8e6b]" : "bg-[#d4d8d0]"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full transition-all ${
                            notifications[item.key] ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg mt-6"
                  >
                    <Save className="w-5 h-5" />
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div>
                <h2 className="text-2xl mb-6 text-[#2d4a2d]">Account Management</h2>
                <div className="space-y-6">
                  <div className="p-6 bg-[#f5f5f0] rounded-xl">
                    <h3 className="text-lg mb-2 text-[#2d4a2d]">Account Status</h3>
                    <p className="text-[#5a6f5a] mb-4">Your account is active and in good standing</p>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-[#6b8e6b] rounded-full"></div>
                      <span className="text-sm text-[#5a6f5a]">Active since January 2026</span>
                    </div>
                  </div>

                  <div className="p-6 border-2 border-red-200 rounded-xl bg-red-50">
                    <h3 className="text-lg mb-2 text-red-700">Danger Zone</h3>
                    <p className="text-sm text-red-600 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all">
                      <Trash2 className="w-5 h-5" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
