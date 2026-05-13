import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Recycle, Package, Clock, CheckCircle, XCircle, Bell, User, BarChart3, Settings, LogOut, MessageSquare, Eye, Loader2, RefreshCw, X, Search } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { dssService, messageService, notificationService } from "../../services/api";
import { BrandLoadingScreen } from "../components/BrandLoadingScreen";
import { ImageCarousel } from "../components/ImageCarousel";

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
  const [searchParams] = useSearchParams();
  const requestsSectionRef = useRef(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [badgeCounts, setBadgeCounts] = useState({ messages: 0, notifications: 0 });
  const [ruleRequest, setRuleRequest] = useState({
    rule_area: "Partner preferences",
    requested_change: "",
    reason: "",
  });
  const [ruleRequestMessage, setRuleRequestMessage] = useState("");

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

  useEffect(() => {
    let isMounted = true;

    async function loadBadges() {
      try {
        const [messagesResponse, notificationsResponse] = await Promise.all([
          messageService.getUnreadCount(),
          notificationService.getUnreadCount(),
        ]);

        if (isMounted) {
          setBadgeCounts({
            messages: Number(messagesResponse.unread_count || 0),
            notifications: Number(notificationsResponse.unread_count || 0),
          });
        }
      } catch {
        if (isMounted) {
          setBadgeCounts({ messages: 0, notifications: 0 });
        }
      }
    }

    loadBadges();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const requestId = searchParams.get("request");

    if (!requestId || requests.length === 0) {
      return;
    }

    const request = requests.find((item) => item.id === requestId);
    if (request) {
      setSelectedRequest(request);
      setStatusNote("");
      requestsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams, requests]);

  const metrics = useMemo(() => {
    const pending = requests.filter((request) => request.status === "pending").length;
    const accepted = requests.filter((request) => request.status === "accepted").length;

    return [
      { icon: Package, label: "Active Requests", value: String(accepted), filter: "accepted", color: "#8aa6c8" },
      { icon: Clock, label: "Pending Requests", value: String(pending), filter: "pending", color: "#3f5f8f" },
      { icon: BarChart3, label: "Total Requests", value: String(requests.length), filter: "all", color: "#6b93b8" }
    ];
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const statusMatch = activeFilter === "all" || request.status === activeFilter;
      const queryMatch =
        !query ||
        [
          request.user_name,
          request.user_email,
          request.submission_name,
          request.item_type,
          request.type,
          request.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return statusMatch && queryMatch;
    });
  }, [requests, activeFilter, searchQuery]);

  const updateRequestStatus = async (request, status, noteOverride) => {
    setIsUpdatingStatus(true);
    setRequestError("");
    const noteToSend = noteOverride ?? statusNote;

    try {
      await dssService.updateRequestStatus(request.id, {
        status,
        notes: noteToSend || undefined,
      });
      await loadRequests();
      setSelectedRequest((current) =>
        current?.id === request.id ? { ...current, status, notes: noteToSend || current.notes } : current,
      );
      setStatusNote("");
    } catch (error) {
      setRequestError(error.message || "Unable to update request status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const submitRuleRequest = async (event) => {
    event.preventDefault();
    setRuleRequestMessage("");

    try {
      const response = await dssService.requestRuleChange(ruleRequest);
      setRuleRequestMessage(response.message || "Preference request submitted for admin review.");
      setRuleRequest((current) => ({ ...current, requested_change: "", reason: "" }));
    } catch (error) {
      setRuleRequestMessage(error.message || "Unable to submit preference request.");
    }
  };

  if (isLoadingRequests && requests.length === 0) {
    return (
      <BrandLoadingScreen
        tone="partner"
        title="Loading partner requests"
        message="We are gathering DSS briefs sent to your organization."
        detail="Accepted, pending, and completed requests will appear in a moment."
      />
    );
  }

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
            <Link to="/messages?theme=partner" className="relative w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center hover:bg-[#dbeafe] transition-colors" aria-label="Open messages" title="Messages">
              <MessageSquare className="w-5 h-5 text-[#41668f]" />
              {badgeCounts.messages > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
            </Link>
            <Link to="/notifications?theme=partner" className="relative w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center hover:bg-[#dbeafe] transition-colors">
              <Bell className="w-5 h-5 text-[#41668f]" />
              {badgeCounts.notifications > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
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
            <motion.button
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                setActiveFilter(metric.filter);
                requestsSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className={`bg-white p-6 rounded-2xl text-left shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${
                activeFilter === metric.filter ? "ring-2 ring-[#4f6f9f]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}20` }}
                >
                  <metric.icon className="w-6 h-6" style={{ color: metric.color }} />
                </div>
                <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs text-[#41668f]">
                  View
                </span>
              </div>
              <div className="text-3xl mb-1 text-[#10233f]">{metric.value}</div>
              <div className="text-sm text-[#41668f]">{metric.label}</div>
            </motion.button>
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
          ref={requestsSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-2xl shadow-lg"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl text-[#10233f]">DSS Partner Requests</h3>
              <p className="mt-1 text-sm text-[#41668f]">
                View all user briefs, filter by status, then respond with a clear partner decision.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadRequests}
                className="flex items-center gap-2 rounded-lg bg-[#eff6ff] px-4 py-2 text-sm text-[#41668f] transition-colors hover:bg-[#dbeafe]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#41668f]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-[#d6e6f8] bg-[#fbfdff] py-3 pl-10 pr-4 text-sm text-[#10233f] outline-none focus:border-[#4f6f9f]"
                placeholder="Search requester, item, pathway, or status"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "accepted", "declined", "completed"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(status)}
                    className={`rounded-xl px-4 py-2 text-sm capitalize transition-colors ${
                      activeFilter === status
                        ? "bg-[#4f6f9f] text-white"
                        : "bg-[#eff6ff] text-[#41668f] hover:bg-[#dbeafe]"
                    }`}
                  >
                    {status}
                  </button>
                ),
              )}
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

                {!isLoadingRequests && filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#41668f]">
                      No DSS requests match this view.
                    </td>
                  </tr>
                )}

                {!isLoadingRequests && filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b border-[#d6e6f8] hover:bg-[#eff6ff] transition-colors">
                    <td className="py-3 px-4 text-sm text-[#10233f]">{request.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-sm text-[#10233f]">{request.user_name}</td>
                    <td className="py-3 px-4 text-sm text-[#41668f]">{pathwayLabels[request.type] || request.type}</td>
                    <td className="py-3 px-4 text-sm text-[#41668f]">
                      {request.quantity || 1} · {request.submission_name || request.item_type}
                    </td>
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
                            setStatusNote("");
                          }}
                          className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center hover:bg-[#dbeafe] transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-[#41668f]" />
                        </button>
                        <button
                          onClick={() => updateRequestStatus(request, "accepted", "")}
                          className="w-8 h-8 rounded-lg bg-[#4f6f9f]/20 flex items-center justify-center hover:bg-[#4f6f9f]/30 transition-colors"
                          title="Accept"
                        >
                          <CheckCircle className="w-4 h-4 text-[#4f6f9f]" />
                        </button>
                        <button
                          onClick={() => updateRequestStatus(request, "declined", "")}
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

        <motion.form
          id="rule-requests"
          onSubmit={submitRuleRequest}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 rounded-2xl bg-white p-6 shadow-lg"
        >
          <h3 className="text-xl text-[#10233f]">Request partner rule or preference changes</h3>
          <p className="mt-1 text-sm text-[#41668f]">
            Tell admins what your organization can accept so DSS partner matching can improve without changing rules silently.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-[240px_1fr]">
            <label className="block">
              <span className="mb-2 block text-sm text-[#41668f]">Area</span>
              <select
                value={ruleRequest.rule_area}
                onChange={(event) => setRuleRequest((current) => ({ ...current, rule_area: event.target.value }))}
                className="w-full rounded-xl border border-[#d6e6f8] bg-[#fbfdff] px-4 py-3 text-sm text-[#10233f] outline-none focus:border-[#4f6f9f]"
              >
                <option>Partner preferences</option>
                <option>Accepted pathways</option>
                <option>Pickup areas</option>
                <option>Cleanliness requirements</option>
                <option>Capacity notes</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[#41668f]">Requested change</span>
              <input
                value={ruleRequest.requested_change}
                onChange={(event) => setRuleRequest((current) => ({ ...current, requested_change: event.target.value }))}
                required
                className="w-full rounded-xl border border-[#d6e6f8] bg-[#fbfdff] px-4 py-3 text-sm text-[#10233f] outline-none focus:border-[#4f6f9f]"
                placeholder="Example: Accept donation and upcycle only for clean cotton textiles in Quezon City."
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="mb-2 block text-sm text-[#41668f]">Reason</span>
              <textarea
                value={ruleRequest.reason}
                onChange={(event) => setRuleRequest((current) => ({ ...current, reason: event.target.value }))}
                rows={3}
                className="w-full resize-none rounded-xl border border-[#d6e6f8] bg-[#fbfdff] px-4 py-3 text-sm text-[#10233f] outline-none focus:border-[#4f6f9f]"
                placeholder="Add capacity, location, or material-handling context for admins."
              />
            </label>
          </div>
          {ruleRequestMessage && (
            <div className="mt-4 rounded-xl bg-[#eff6ff] px-4 py-3 text-sm text-[#41668f]">
              {ruleRequestMessage}
            </div>
          )}
          <button className="mt-4 rounded-xl bg-[#4f6f9f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3f5f8f]">
            Send to admins
          </button>
        </motion.form>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10233f]/35 p-4 backdrop-blur-sm md:p-8">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-[#d6e6f8] bg-white p-6 shadow-[0_24px_70px_rgba(16,35,63,0.24)] md:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#41668f]">
                  Partner request
                </div>
                <h2 className="text-3xl font-bold text-[#10233f]">
                  {selectedRequest.submission_name || selectedRequest.item_type}
                </h2>
                <p className="mt-1 text-sm text-[#41668f]">
                  {pathwayLabels[selectedRequest.type] || selectedRequest.type} request sent by {selectedRequest.user_name} · {formatDate(selectedRequest.created_at)}
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

            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["Pathway", pathwayLabels[selectedRequest.type] || selectedRequest.type],
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

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-[#d6e6f8] bg-[#fbfdff] p-6">
                <h3 className="mb-4 text-xl font-semibold text-[#10233f]">Brief sent by user</h3>
                <pre className="whitespace-pre-wrap font-sans text-base leading-7 text-[#274568]">
                  {selectedRequest.output_payload?.brief || selectedRequest.notes || "No brief provided."}
                </pre>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[#d6e6f8] bg-white p-6">
                  <h3 className="mb-4 text-xl font-semibold text-[#10233f]">Submission details</h3>
                  <div className="space-y-3 text-base leading-7 text-[#41668f]">
                    <p><span className="font-semibold text-[#10233f]">Fabric:</span> {selectedRequest.fabric || selectedRequest.details?.fabric_types || "Not specified"}</p>
                    <p><span className="font-semibold text-[#10233f]">Brand:</span> {selectedRequest.details?.no_brand_visible ? "No brand visible" : selectedRequest.details?.brand || "Not specified"}</p>
                    <p><span className="font-semibold text-[#10233f]">Burn test:</span> {selectedRequest.burn_test?.performed ? "Performed" : "Not performed"}</p>
                    {selectedRequest.upcycle_request && (
                      <p><span className="font-semibold text-[#10233f]">Upcycle request:</span> {selectedRequest.upcycle_request}</p>
                    )}
                    {selectedRequest.description && (
                      <p><span className="font-semibold text-[#10233f]">User note:</span> {selectedRequest.description}</p>
                    )}
                  </div>
                </div>

                {selectedRequest.photos?.length > 0 && (
                  <ImageCarousel
                    images={selectedRequest.photos}
                    title="Uploaded photos"
                    allowDownload
                  />
                )}

                <div className="rounded-2xl border border-[#d6e6f8] bg-white p-6">
                  <h3 className="mb-2 text-2xl font-semibold text-[#10233f]">Partner decision and message to user</h3>
                  <p className="mb-4 text-sm leading-6 text-[#41668f]">
                    Accept when your organization can handle the item. Decline
                    when capacity, location, cleanliness, or pathway fit is not
                    suitable. The note below will be sent back to the user as
                    the reason or next step.
                  </p>
                  <textarea
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    rows={7}
                    placeholder="Example: Accepted for donation. Please pack clean items separately and bring them on Friday afternoon."
                    className="mb-3 w-full resize-y rounded-xl border border-[#d6e6f8] p-4 text-base leading-7 text-[#10233f] outline-none focus:border-[#4f6f9f]"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ["accepted", "Accept request"],
                      ["declined", "Decline request"],
                      ["completed", "Mark completed"],
                    ].map(([status, label]) => (
                      <button
                        key={status}
                        onClick={() => updateRequestStatus(selectedRequest, status)}
                        disabled={isUpdatingStatus}
                        className={`rounded-xl px-3 py-3 text-sm text-white disabled:opacity-50 ${
                          status === "declined"
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-[#4f6f9f] hover:bg-[#3f5f8f]"
                        }`}
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
