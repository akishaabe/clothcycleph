import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Recycle,
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Trash2,
  Save,
  ArrowLeft,
  Sparkles,
  Phone,
} from "lucide-react";
import { useState } from "react";
import "./SettingsPage.css";

const panelClass =
  "bg-white/90 border border-[#e1e7df] shadow-[0_12px_34px_rgba(25,34,29,0.08)]";

const inputClass =
  "w-full pl-12 pr-4 py-3 border-2 border-[#e7ebe6] rounded-xl focus:border-[#336158] focus:outline-none focus:ring-2 focus:ring-[#336158]/15 transition-colors bg-white text-[#19221d]";

const iconClass =
  "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6f67]";

export function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({
    name: "Juan Dela Cruz",
    email: "juan@email.com",
    phone: "+63 912 345 6789",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    newsletter: true,
  });

  const tabs = [
    { id: "profile", icon: User, label: "Profile" },
    { id: "security", icon: Lock, label: "Security" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "account", icon: Shield, label: "Account" },
  ];

  const handleSave = () => {
    alert("Settings saved successfully!");
  };

  return (
    <div className="settings-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] text-[#19221d]">
      <nav className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-[#e1e7df] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-[#f3f5f2] border border-[#e1e7df] flex items-center justify-center hover:bg-[#e7ebe6] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#5f6f67]" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-[#336158]" />
              <span className="text-xl text-[#19221d] font-gloock">
                ClothCycle PH
              </span>
            </Link>
          </div>

          <Link
            to="/dashboard"
            className="rounded-xl border border-[#dce4da] bg-white px-4 py-2 text-[#336158] hover:bg-[#f3f5f2] transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="p-6 max-w-6xl mx-auto">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-[28px] border border-[#dce4da] bg-white/80 p-8 shadow-[0_24px_80px_rgba(25,34,29,0.12)]"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dce4da] bg-[#f3f5f2] px-4 py-2 text-sm text-[#5f6f67] mb-5">
            <Sparkles className="w-4 h-4 text-[#336158]" />
            Account preferences
          </div>
          <h1 className="font-gloock text-4xl md:text-5xl mb-3 text-[#19221d]">
            Settings
          </h1>
          <p className="text-lg text-[#5f6f67] max-w-2xl">
            Keep your profile, security, notifications, and account controls up
            to date.
          </p>
        </motion.section>

        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${panelClass} p-3 rounded-2xl h-fit`}
          >
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? "bg-[#336158] text-white shadow-md"
                      : "text-[#5f6f67] hover:bg-[#f3f5f2] hover:text-[#19221d]"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${panelClass} md:col-span-1 p-8 rounded-2xl`}
          >
            {activeTab === "profile" && (
              <div>
                <h2 className="text-2xl mb-2 text-[#19221d]">
                  Profile Settings
                </h2>
                <p className="text-[#5f6f67] mb-6">
                  Update the details connected to your ClothCycle account.
                </p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm mb-2 text-[#19221d]">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className={iconClass} />
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) =>
                          setProfile({ ...profile, name: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#19221d]">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className={iconClass} />
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#19221d]">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className={iconClass} />
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile({ ...profile, phone: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#336158] text-white rounded-xl hover:bg-[#2a4c48] transition-all hover:shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div>
                <h2 className="text-2xl mb-2 text-[#19221d]">
                  Security Settings
                </h2>
                <p className="text-[#5f6f67] mb-6">
                  Change your password to keep your account protected.
                </p>
                <div className="space-y-6">
                  {["Current Password", "New Password", "Confirm New Password"].map(
                    (label) => (
                      <div key={label}>
                        <label className="block text-sm mb-2 text-[#19221d]">
                          {label}
                        </label>
                        <div className="relative">
                          <Lock className={iconClass} />
                          <input
                            type="password"
                            placeholder="••••••••"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    )
                  )}

                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#336158] text-white rounded-xl hover:bg-[#2a4c48] transition-all hover:shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div>
                <h2 className="text-2xl mb-2 text-[#19221d]">
                  Notification Preferences
                </h2>
                <p className="text-[#5f6f67] mb-6">
                  Choose how ClothCycle keeps you updated.
                </p>
                <div className="space-y-4">
                  {[
                    {
                      key: "emailNotifications",
                      label: "Email Notifications",
                      description: "Receive updates via email",
                    },
                    {
                      key: "pushNotifications",
                      label: "Push Notifications",
                      description: "Get instant notifications",
                    },
                    {
                      key: "smsNotifications",
                      label: "SMS Notifications",
                      description: "Text message alerts",
                    },
                    {
                      key: "newsletter",
                      label: "Newsletter",
                      description: "Monthly sustainability tips",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 p-4 bg-[#f8faf6] border border-[#e7ebe6] rounded-xl"
                    >
                      <div>
                        <div className="text-[#19221d]">{item.label}</div>
                        <div className="text-sm text-[#5f6f67]">
                          {item.description}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications({
                            ...notifications,
                            [item.key]: !notifications[item.key],
                          })
                        }
                        className={`w-12 h-6 rounded-full transition-all ${
                          notifications[item.key]
                            ? "bg-[#336158]"
                            : "bg-[#d7ddd5]"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                            notifications[item.key]
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#336158] text-white rounded-xl hover:bg-[#2a4c48] transition-all hover:shadow-lg mt-6"
                  >
                    <Save className="w-5 h-5" />
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div>
                <h2 className="text-2xl mb-2 text-[#19221d]">
                  Account Management
                </h2>
                <p className="text-[#5f6f67] mb-6">
                  Review account status and high-impact account actions.
                </p>
                <div className="space-y-6">
                  <div className="p-6 bg-[#f8faf6] border border-[#e7ebe6] rounded-xl">
                    <h3 className="text-lg mb-2 text-[#19221d]">
                      Account Status
                    </h3>
                    <p className="text-[#5f6f67] mb-4">
                      Your account is active and in good standing.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-[#336158] rounded-full" />
                      <span className="text-sm text-[#5f6f67]">
                        Active since January 2026
                      </span>
                    </div>
                  </div>

                  <div className="p-6 border-2 border-red-200 rounded-xl bg-red-50">
                    <h3 className="text-lg mb-2 text-red-700">Danger Zone</h3>
                    <p className="text-sm text-red-600 mb-4">
                      Once you delete your account, there is no going back.
                      Please be certain.
                    </p>
                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all">
                      <Trash2 className="w-5 h-5" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        </div>
      </main>
    </div>
  );
}
