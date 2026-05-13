import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Recycle, Package, Clock, CheckCircle, XCircle, Bell, User, BarChart3, Settings, LogOut, MessageSquare, Eye, Loader2, RefreshCw, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { dssService } from "../../services/api";

const platformData = [
  { month: "Jan", users: 850, submissions: 420 },
  { month: "Feb", users: 920, submissions: 480 },
  { month: "Mar", users: 1050, submissions: 550 },
  { month: "Apr", users: 1180, submissions: 620 },
  { month: "May", users: 1320, submissions: 680 },
  { month: "Jun", users: 1450, submissions: 750 }
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

const pathwayLabels = {
  recycle: "Recycle",
  donate: "Donate",
  upcycle: "Upcycle",
  buyback: "Buyback",
};

const statusStyles = {
  pending: "bg-[#8aa6c8]/20 text-[#3f5f8f]",
  accepted: "bg-[#4f6f9f]/20 text-[#10233f]",
  declined: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "";

export function PartnerDashboard() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [requestError, setRequestError] = useState("");

  const loadRequests = async () => {
    setIsLoadingRequests(true);
    setRequestError("");

    try {
      const response = await dssService.getPartnerRequests();
      setRequests(response.data);
    } catch (error) {
      setRequestError(error.message || "Unable to load partner requests.");
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const metrics = useMemo(() => {
    const pending = requests.filter((request) => request.status === "pending").length;
    const accepted = requests.filter((request) => request.status === "accepted").length;

    return [
      { icon: Package, label: "Active Requests", value: String(accepted), change: "+0", color: "#8aa6c8" },
      { icon: Clock, label: "Pending Requests", value: String(pending), change: "+0", color: "#3f5f8f" },
      { icon: BarChart3, label: "Total Requests", value: String(requests.length), change: "+0", color: "#6b93b8" }
    ];
  }, [requests]);

  const updateRequestStatus = async (request, status) => {
    setIsUpdatingStatus(true);
    setRequestError("");

    try {
      await dssService.updateRequestStatus(request.id, {
        status,
        notes: statusNote || undefined,
      });
      await loadRequests();
      setSelectedRequest((current) =>
        current?.id === request.id ? { ...current, status, notes: statusNote || current.notes } : current,
      );
    } catch (error) {
      setRequestError(error.message || "Unable to update request status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {metrics.map((metric, index) => (
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
            <h3 className="text-xl text-[#10233f]">DSS Partner Requests</h3>
            <div className="flex gap-2">
              <button
                onClick={loadRequests}
                className="flex items-center gap-2 rounded-lg bg-[#eff6ff] px-4 py-2 text-sm text-[#41668f] transition-colors hover:bg-[#dbeafe]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {requestError && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {requestError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d6e6f8]">
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">ID</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">User</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Pathway</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Items</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Date</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRequests && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#41668f]">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading requests
                    </td>
                  </tr>
                )}

                {!isLoadingRequests && requests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#41668f]">
                      No DSS requests have been sent to this partner yet.
                    </td>
                  </tr>
                )}

                {!isLoadingRequests && requests.map((request) => (
                  <tr key={request.id} className="border-b border-[#d6e6f8] hover:bg-[#eff6ff] transition-colors">
                    <td className="py-3 px-4 text-sm text-[#10233f]">{request.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-sm text-[#10233f]">{request.user_name}</td>
                    <td className="py-3 px-4 text-sm text-[#41668f]">{pathwayLabels[request.type] || request.type}</td>
                    <td className="py-3 px-4 text-sm text-[#41668f]">{request.quantity || 1} · {request.item_type}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          statusStyles[request.status] || statusStyles.pending
                        }`}
                      >
                        {request.status_label || request.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#41668f]">{formatDate(request.created_at)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setStatusNote(request.notes || "");
                          }}
                          className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center hover:bg-[#dbeafe] transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-[#41668f]" />
                        </button>
                        <button
                          onClick={() => updateRequestStatus(request, "accepted")}
                          className="w-8 h-8 rounded-lg bg-[#4f6f9f]/20 flex items-center justify-center hover:bg-[#4f6f9f]/30 transition-colors"
                          title="Accept"
                        >
                          <CheckCircle className="w-4 h-4 text-[#4f6f9f]" />
                        </button>
                        <button
                          onClick={() => updateRequestStatus(request, "declined")}
                          className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors"
                          title="Decline"
                        >
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

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10233f]/35 p-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#d6e6f8] bg-white p-6 shadow-[0_24px_70px_rgba(16,35,63,0.24)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#41668f]">
                  Partner request
                </div>
                <h2 className="text-2xl font-bold text-[#10233f]">
                  {pathwayLabels[selectedRequest.type] || selectedRequest.type} · {selectedRequest.item_type}
                </h2>
                <p className="mt-1 text-sm text-[#41668f]">
                  Sent by {selectedRequest.user_name} · {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl bg-[#eff6ff] p-2 text-[#41668f] hover:bg-[#dbeafe]"
                aria-label="Close request details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Quantity", selectedRequest.quantity || 1],
                ["Condition", selectedRequest.condition || "Not specified"],
                ["Cleanliness", selectedRequest.cleanliness || "Not specified"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#eff6ff] px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-[#41668f]">
                    {label}
                  </div>
                  <div className="mt-1 font-semibold text-[#10233f]">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl border border-[#d6e6f8] bg-[#fbfdff] p-5">
                <h3 className="mb-3 font-semibold text-[#10233f]">Brief sent by user</h3>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-[#274568]">
                  {selectedRequest.output_payload?.brief || selectedRequest.notes || "No brief provided."}
                </pre>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[#d6e6f8] bg-white p-5">
                  <h3 className="mb-3 font-semibold text-[#10233f]">Submission details</h3>
                  <div className="space-y-2 text-sm text-[#41668f]">
                    <p><span className="font-semibold text-[#10233f]">Fabric:</span> {selectedRequest.fabric || selectedRequest.details?.fabric_types || "Not specified"}</p>
                    <p><span className="font-semibold text-[#10233f]">Brand:</span> {selectedRequest.details?.no_brand_visible ? "No brand visible" : selectedRequest.details?.brand || "Not specified"}</p>
                    <p><span className="font-semibold text-[#10233f]">Burn test:</span> {selectedRequest.burn_test?.performed ? "Performed" : "Not performed"}</p>
                    {selectedRequest.description && (
                      <p><span className="font-semibold text-[#10233f]">User note:</span> {selectedRequest.description}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#d6e6f8] bg-white p-5">
                  <h3 className="mb-3 font-semibold text-[#10233f]">Update status</h3>
                  <textarea
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    rows={3}
                    placeholder="Optional note for the user"
                    className="mb-3 w-full resize-none rounded-xl border border-[#d6e6f8] p-3 text-sm text-[#10233f] outline-none focus:border-[#4f6f9f]"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["accepted", "Accept"],
                      ["declined", "Decline"],
                      ["completed", "Complete"],
                    ].map(([status, label]) => (
                      <button
                        key={status}
                        onClick={() => updateRequestStatus(selectedRequest, status)}
                        disabled={isUpdatingStatus}
                        className="rounded-xl bg-[#4f6f9f] px-3 py-2 text-sm text-white hover:bg-[#3f5f8f] disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
