import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Recycle,
  PackageOpen,
  RefreshCcw,
  HelpCircle,
  Package,
  Clock,
  TrendingUp,
  MessageSquare,
  Bell,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { dssService, messageService, notificationService, submissionService } from "../../services/api";
import { formatManilaDate, parseUtcTimestamp } from "../../utils/dateTime";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const serviceCards = [
  {
    icon: Recycle,
    title: "Recycle",
    color: "#336158",
    background: "#f1f7ef",
    wide: false,
  },
  {
    icon: PackageOpen,
    title: "Donate",
    color: "#55735d",
    background: "#f3f8f0",
    wide: false,
  },
  {
    icon: RefreshCcw,
    title: "Upcycle",
    color: "#9a7738",
    background: "#f8f2e6",
    wide: false,
  },
  {
    icon: HelpCircle,
    title: "Not Sure?",
    color: "#46564d",
    background: "#f1f6f3",
    wide: true,
  },
];

const cardClass =
  "bg-white/90 border border-[#e1e7df] shadow-[0_12px_34px_rgba(25,34,29,0.08)]";

const requestStatusClass = {
  pending: "bg-[#fff8e8] text-[#7a5427]",
  accepted: "bg-[#edf7ed] text-[#336158]",
  declined: "bg-red-50 text-red-700",
  completed: "bg-[#eef5ff] text-[#3f5f8f]",
  in_progress: "bg-[#eef5ff] text-[#3f5f8f]",
  rejected: "bg-red-50 text-red-700",
};

const pathwayLabels = {
  recycle: "Recycle",
  donate: "Donate",
  upcycle: "Upcycle",
  buyback: "Buyback",
};

const formatStatusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [requestFilter, setRequestFilter] = useState("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [badgeCounts, setBadgeCounts] = useState({ messages: 0, notifications: 0 });
  const requestsRef = useRef(null);
  const isNewSignup = location.state?.entry === "signup";
  const greeting = isNewSignup ? "Welcome to ClothCycle PH" : "Welcome Back";

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        const [response, submissionsResponse, messagesResponse, notificationsResponse] = await Promise.all([
          dssService.getUserRequests(),
          submissionService.getUserSubmissions(),
          messageService.getUnreadCount(),
          notificationService.getUnreadCount(),
        ]);

        if (isMounted) {
          setRequests(response.data);
          setSubmissions(submissionsResponse.data);
          setBadgeCounts({
            messages: Number(messagesResponse.unread_count || 0),
            notifications: Number(notificationsResponse.unread_count || 0),
          });
        }
      } catch (error) {
        if (isMounted) {
          setRequestError(error.message || "Unable to load DSS requests.");
        }
      }
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardStats = useMemo(() => {
    const pending = requests.filter((request) => request.status === "pending").length;
    const accepted = requests.filter((request) => request.status === "accepted").length;

    return [
      {
        icon: Package,
        label: "Total Requests",
        value: String(requests.length),
        color: "#336158",
      },
      {
        icon: Clock,
        label: "Pending Requests",
        value: String(pending),
        color: "#d4a574",
      },
      {
        icon: TrendingUp,
        label: "Accepted Requests",
        value: String(accepted),
        color: "#336158",
      },
    ];
  }, [requests]);

  const monthlyData = useMemo(() => {
    const grouped = submissions.reduce((acc, submission) => {
      const date = parseUtcTimestamp(submission.created_at) || new Date();
      const month = formatManilaDate(date, { month: "short" });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const rows = Object.entries(grouped).map(([month, items]) => ({ month, items }));
    return rows.length > 0
      ? rows
      : [{ month: formatManilaDate(new Date(), { month: "short" }), items: 0 }];
  }, [submissions]);

  const distributionData = useMemo(() => {
    const colors = {
      Recycle: "#336158",
      Donate: "#7d9283",
      Upcycle: "#d0b684",
      Buyback: "#9a7738",
    };
    const grouped = submissions.reduce((acc, submission) => {
      const label = pathwayLabels[submission.service_type] || formatStatusLabel(submission.service_type || "Not Sure");
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    const rows = Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || "#46564d",
    }));

    return rows.length > 0 ? rows : [{ name: "No requests", value: 1, color: "#dce7d9" }];
  }, [submissions]);

  const filteredRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();

    return requests.filter((request) => {
      const statusMatch = requestFilter === "all" || request.status === requestFilter;
      const queryMatch =
        !query ||
        [
          request.submission_name,
          request.item_type,
          request.partner_name,
          request.type,
          request.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return statusMatch && queryMatch;
    });
  }, [requests, requestFilter, requestSearch]);

  return (
    <div className="app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] text-[#19221d]">
      <nav className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-[#e1e7df] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-[#336158]" />
              <span className="text-xl text-[#19221d] font-gloock">
                ClothCycle PH
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/notifications")}
              className="relative w-10 h-10 rounded-full bg-[#f3f5f2] border border-[#e1e7df] flex items-center justify-center hover:bg-[#e7ebe6] transition-colors"
              aria-label="Open notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-[#5f6f67]" />
              {badgeCounts.notifications > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
            <button
              onClick={() => navigate("/messages")}
              className="relative w-10 h-10 rounded-full bg-[#f3f5f2] border border-[#e1e7df] flex items-center justify-center hover:bg-[#e7ebe6] transition-colors"
              aria-label="Open messages"
              title="Messages"
            >
              <MessageSquare className="w-5 h-5 text-[#5f6f67]" />
              {badgeCounts.messages > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                className="w-10 h-10 rounded-full bg-[#f3f5f2] border border-[#e1e7df] flex items-center justify-center hover:bg-[#e7ebe6] transition-colors"
              >
                <User className="w-5 h-5 text-[#5f6f67]" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-12 w-44 rounded-2xl border border-[#e1e7df] bg-white p-2 shadow-[0_16px_40px_rgba(25,34,29,0.16)]">
                  <button
                    onClick={() => navigate("/settings")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#19221d] hover:bg-[#f3f5f2]"
                  >
                    <Settings className="h-4 w-4 text-[#5f6f67]" />
                    Settings
                  </button>
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

      <main className="p-6 max-w-7xl mx-auto">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-[28px] border border-[#dce4da] bg-white/80 shadow-[0_24px_80px_rgba(25,34,29,0.12)]"
        >
          <div className="p-8 md:p-10">
            <h1 className="font-gloock text-4xl md:text-5xl mb-3 text-[#19221d]">
              {greeting}
            </h1>
            <p className="text-base text-[#5f6f67] max-w-2xl">
              Track your impact, submit textiles, and keep your sustainability
              activity moving.
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="dashboard-service-section mb-8 rounded-[28px] border border-[#dce7d9] bg-[linear-gradient(135deg,#f8fbf6,#eff6ec,#f7faf5)] p-6 shadow-[0_14px_42px_rgba(51,97,88,0.09)] md:p-8"
        >
          <h2 className="dashboard-service-heading mb-6 text-center font-inter text-xl font-bold text-[#19221d]">
          Select a service
          </h2>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
            {serviceCards.map((service, index) => (
              <motion.button
                key={service.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.08 }}
                whileHover={{ y: -4 }}
                onClick={() =>
                  navigate("/submit", {
                    state: {
                      service:
                        service.title === "Not Sure?" ? "" : service.title,
                    },
                  })
                }
                className={`dashboard-service-card rounded-2xl border border-[#dce4da] p-6 text-center shadow-[0_10px_24px_rgba(25,34,29,0.07)] transition-all hover:brightness-[1.02] hover:shadow-[0_16px_36px_rgba(25,34,29,0.12)] ${
                  service.wide
                    ? "md:col-span-3 flex items-center justify-center gap-5 py-4"
                    : ""
                }`}
                style={{
                  backgroundColor: service.background,
                  borderColor: `${service.color}2f`,
                }}
              >
                <div
                  className={`dashboard-service-icon flex shrink-0 items-center justify-center rounded-full bg-white/85 shadow-inner ${
                    service.wide ? "h-16 w-16" : "mx-auto mb-4 h-24 w-24"
                  }`}
                >
                  <service.icon
                    className={service.wide ? "h-8 w-8" : "h-12 w-12"}
                    style={{ color: service.color }}
                  />
                </div>
                <span
                  className={`dashboard-service-title text-[#19221d] ${
                    service.wide ? "text-lg font-semibold" : "text-xl"
                  }`}
                >
                  {service.title}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        <section className="grid md:grid-cols-3 gap-6 mb-8">
          {dashboardStats.map((widget, index) => (
            <motion.button
              key={widget.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => {
                const nextFilter = widget.label.includes("Pending")
                  ? "pending"
                  : widget.label.includes("Accepted")
                    ? "accepted"
                    : "all";
                setRequestFilter(nextFilter);
                requestsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`${cardClass} p-6 rounded-2xl text-left transition-all hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${widget.color}20` }}
                >
                  <widget.icon
                    className="w-6 h-6"
                    style={{ color: widget.color }}
                  />
                </div>
              </div>
              <div className="text-3xl mb-1 text-[#19221d]">{widget.value}</div>
              <div className="text-sm text-[#5f6f67]">{widget.label}</div>
            </motion.button>
          ))}
        </section>

        {false ? (
        <motion.section
          ref={requestsRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className={`${cardClass} mb-8 rounded-2xl p-6`}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl text-[#19221d]">Requests</h3>
              <p className="mt-1 text-sm text-[#5f6f67]">
                Track DSS briefs you sent to partners.
              </p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={requestSearch}
              onChange={(event) => setRequestSearch(event.target.value)}
              className="rounded-xl border border-[#dce4da] bg-[#fbfcfa] px-4 py-3 text-sm text-[#19221d] outline-none focus:border-[#336158]"
              placeholder="Search partner requests"
            />
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "accepted", "declined", "completed"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setRequestFilter(status)}
                    className={`rounded-xl px-4 py-2 text-sm capitalize ${
                      requestFilter === status
                        ? "bg-[#336158] text-white"
                        : "bg-[#f3f5f2] text-[#5f6f67] hover:bg-[#e7ebe6]"
                    }`}
                  >
                    {formatStatusLabel(status)}
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

          <div className="grid gap-3">
            {filteredRequests.length === 0 && (
              <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] px-4 py-5 text-sm text-[#5f6f67]">
                No partner requests yet. Submit textile details, review the DSS
                recommendation, then send the brief to a partner.
              </div>
            )}

            {filteredRequests.slice(0, 8).map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-semibold text-[#19221d]">
                    {request.submission_name || request.item_type} · {pathwayLabels[request.type] || request.type}
                  </div>
                  <div className="mt-1 text-sm text-[#5f6f67]">
                    Sent to {request.partner_name || "partner"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      requestStatusClass[request.status] ||
                      requestStatusClass.pending
                    }`}
                  >
                    {formatStatusLabel(request.status)}
                  </span>
                  <button
                    onClick={() => navigate(`/dss/${request.submission_id}?request=${request.id}`)}
                    className="rounded-xl border border-[#dce4da] px-3 py-2 text-sm text-[#5f6f67] hover:bg-[#f3f5f2]"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
        ) : null}

        <section className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={`${cardClass} p-6 rounded-2xl`}
          >
            <h3 className="text-xl mb-4 text-[#19221d]">Monthly Activity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7ebe6" />
                <XAxis dataKey="month" stroke="#5f6f67" />
                <YAxis stroke="#5f6f67" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid #e7ebe6",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="items" fill="#336158" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className={`${cardClass} p-6 rounded-2xl`}
          >
            <h3 className="text-xl mb-4 text-[#19221d]">Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
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
                    border: "2px solid #e7ebe6",
                    borderRadius: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </section>

        {/*
          Partner requests are intentionally not shown on the user dashboard.
          The dedicated DSS request views still handle sent partner requests.
        */}
        {false ? (
        <motion.section>

          {requestError && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {requestError}
            </div>
          )}

          <div className="grid gap-3">
            {filteredRequests.length === 0 && (
              <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] px-4 py-5 text-sm text-[#5f6f67]">
                No partner requests yet. Submit textile details, review the DSS
                recommendation, then send the brief to a partner.
              </div>
            )}

            {requests.slice(0, 3).map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-semibold text-[#19221d]">
                    {request.submission_name || request.item_type} · {pathwayLabels[request.type] || request.type}
                  </div>
                  <div className="mt-1 text-sm text-[#5f6f67]">
                    Sent to {request.partner_name || "partner"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      requestStatusClass[request.status] ||
                      requestStatusClass.pending
                    }`}
                  >
                    {request.status}
                  </span>
                  <button
                    onClick={() => navigate(`/dss/${request.submission_id}?request=${request.id}`)}
                    className="rounded-xl border border-[#dce4da] px-3 py-2 text-sm text-[#5f6f67] hover:bg-[#f3f5f2]"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
          {requests.length > 3 && (
            <button
              type="button"
              onClick={() => navigate("/dss-requests")}
              className="mt-4 w-full rounded-xl border border-[#dce4da] px-4 py-3 text-sm font-semibold text-[#336158] hover:bg-[#f3f5f2]"
            >
              View all sent DSS requests
            </button>
          )}
        </motion.section>
        ) : null}

      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19221d]/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#e1e7df] bg-white p-6 shadow-[0_24px_70px_rgba(25,34,29,0.24)]">
            <h2 className="font-sans text-xl font-bold text-[#19221d]">
              Log out?
            </h2>
            <p className="mt-2 text-sm text-[#5f6f67]">
              Are you sure you want to log out of your account?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-[#dce4da] px-4 py-2 text-[#5f6f67] hover:bg-[#f3f5f2]"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate("/")}
                className="rounded-xl bg-[#336158] px-4 py-2 text-white hover:bg-[#2a4c48]"
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
