import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Recycle, Package, Clock, CheckCircle, XCircle, Bell, User, BarChart3, Settings, LogOut, MessageSquare, Eye, Loader2, RefreshCw, X, Search, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { dssService, messageService, notificationService, uploadService } from "../../services/api";
import { FileUploadService } from "../../services/fileUpload";
import { BrandLoadingScreen } from "../components/BrandLoadingScreen";
import { ImageCarousel } from "../components/ImageCarousel";
import { formatManilaDate, parseUtcTimestamp } from "../../utils/dateTime";
import { useAuth } from "../../context/AuthContext";

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

const bagGuidance = {
  recycle: "White bag",
  upcycle: "Black bag",
  donate: "Green bag",
};

const statusStyles = {
  pending: "bg-[#8aa6c8]/20 text-[#3f5f8f]",
  accepted: "bg-[#4f6f9f]/20 text-[#10233f]",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-zinc-100 text-zinc-700",
};

const decisionStatusStyles = {
  accepted: {
    Icon: CheckCircle,
    label: "Accepted",
    className:
      "border-[#cfe2cf] bg-[#edf7ed] text-[#336158] dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
  },
  completed: {
    Icon: CheckCircle,
    label: "Completed",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-400/25 dark:bg-green-400/10 dark:text-green-200",
  },
  rejected: {
    Icon: XCircle,
    label: "Rejected",
    className:
      "border-red-100 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200",
  },
  cancelled: {
    Icon: XCircle,
    label: "Cancelled",
    className:
      "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-400/10 dark:text-zinc-200",
  },
};

const normalizeStatus = (value) => {
  const status = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["declined", "rejected"].includes(status)) return "rejected";
  if (["approved", "accepted"].includes(status)) return "accepted";
  if (["completed", "processed", "complete"].includes(status)) return "completed";
  if (status === "pending") return "pending";
  return status;
};

const getRequestLifecycleStatus = (request) =>
  normalizeStatus(request?.status ?? request?.request_status ?? request?.submission_status ?? request?.status_label);

const formatStatusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const trackingStatusLabels = {
  request_sent: "Request sent",
  scheduled: "Scheduled",
  in_transit: "Shipped / In transit",
  dropoff_completed: "Drop-off completed",
  completed: "Completed",
};

const fulfillmentMethodLabels = {
  drop_off: "Direct drop-off",
  shipping: "Shipping",
  pickup: "Pickup",
  other: "Other",
};

const formatDate = (value) =>
  formatManilaDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

const formatDateTime = (value) =>
  formatManilaDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });

const formatPercent = (value) =>
  value == null ? "Not available" : `${Math.round(Number(value) * 100)}%`;

const getRequestActivityTime = (request) =>
  new Date(request?.updated_at || request?.created_at || 0).getTime();

const getDssRecommendation = (request) =>
  request?.output_payload?.recommendation || {
    recommended_pathway: request?.type,
    confidence: request?.confidence,
    explanation: request?.explanation,
    checks: request?.output_payload?.rule_checks || [],
  };

const getRequestRowKey = (request, index) =>
  [
    request?.id,
    getRequestLifecycleStatus(request),
    request?.updated_at,
    request?.created_at,
    request?.submission_id,
    request?.user_id,
    index,
  ]
    .filter(Boolean)
    .join("-");

function DecisionStatusIndicator({ status, compact = false }) {
  const normalizedStatus = normalizeStatus(status);
  const decisionStyle = decisionStatusStyles[normalizedStatus];

  if (!decisionStyle) {
    return null;
  }

  const { Icon, label, className } = decisionStyle;
  const message =
    normalizedStatus === "accepted"
      ? "You've accepted this request."
      : normalizedStatus === "rejected"
        ? "You've rejected this request."
        : "You've completed this request.";

  return (
    <div className={`rounded-2xl border ${className} ${compact ? "px-3 py-2" : "p-4"}`}>
      <div className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      {!compact && (
        <p className="mt-2 text-sm leading-6">
          {message}
        </p>
      )}
    </div>
  );
}

export function PartnerDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const requestsSectionRef = useRef(null);
  const ruleRequestsSectionRef = useRef(null);
  const highlightedRuleRequestId = searchParams.get("highlight");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [outcomeTitle, setOutcomeTitle] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [outcomeFiles, setOutcomeFiles] = useState([]);
  const [outcomePreviews, setOutcomePreviews] = useState([]);
  const [outcomeUploadError, setOutcomeUploadError] = useState("");
  const [isUploadingOutcome, setIsUploadingOutcome] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [requestSort, setRequestSort] = useState("newest");
  const [badgeCounts, setBadgeCounts] = useState({ messages: 0, notifications: 0 });
  const [ruleRequests, setRuleRequests] = useState([]);
  const [isLoadingRuleRequests, setIsLoadingRuleRequests] = useState(false);
  const [ruleRequestFilter, setRuleRequestFilter] = useState("all");
  const [ruleRequestSearch, setRuleRequestSearch] = useState("");
  const [showAllRuleRequests, setShowAllRuleRequests] = useState(false);
  const [ruleRequest, setRuleRequest] = useState({
    rule_area: "Partner preferences",
    requested_change: "",
    reason: "",
  });
  const [ruleRequestMessage, setRuleRequestMessage] = useState("");
  const [ruleReplyDrafts, setRuleReplyDrafts] = useState({});
  const [ruleReplyStatus, setRuleReplyStatus] = useState({});

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
    loadRuleRequests();
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

  useEffect(() => {
    if (searchParams.get("panel") !== "rule-requests" || !highlightedRuleRequestId) {
      return;
    }

    setShowAllRuleRequests(true);
    ruleRequestsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams, highlightedRuleRequestId, ruleRequests]);

  useEffect(() => {
    if (!selectedRequest) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setOutcomeTitle(selectedRequest.outcome_title || "");
    setOutcomeDescription(selectedRequest.outcome_description || "");
    setOutcomeFiles([]);
    setOutcomePreviews([]);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedRequest]);

  const uniquePartnerRequests = useMemo(() => {
    const seen = new Set();

    return requests.filter((request) => {
      const identity = [
        request?.id,
        getRequestLifecycleStatus(request),
        request?.updated_at,
        request?.created_at,
        request?.submission_id,
        request?.user_id,
      ]
        .map((value) => String(value ?? "").trim())
        .join("|");

      if (seen.has(identity)) {
        return false;
      }

      seen.add(identity);
      return true;
    });
  }, [requests]);

  const metrics = useMemo(() => {
    const pending = uniquePartnerRequests.filter((request) => getRequestLifecycleStatus(request) === "pending").length;
    const accepted = uniquePartnerRequests.filter((request) => getRequestLifecycleStatus(request) === "accepted").length;

    return [
      { icon: Package, label: "Active Requests", value: String(accepted), filter: "accepted", color: "#8aa6c8" },
      { icon: Clock, label: "Pending Requests", value: String(pending), filter: "pending", color: "#3f5f8f" },
      { icon: BarChart3, label: "Total Requests", value: String(uniquePartnerRequests.length), filter: "all", color: "#6b93b8" }
    ];
  }, [uniquePartnerRequests]);

  const requestStatusCounts = useMemo(
    () =>
      uniquePartnerRequests.reduce(
        (counts, request) => {
          const status = getRequestLifecycleStatus(request);
          return {
            ...counts,
            all: counts.all + 1,
            [status]: (counts[status] || 0) + 1,
          };
        },
        { all: 0, pending: 0, accepted: 0, completed: 0, rejected: 0 },
      ),
    [uniquePartnerRequests],
  );

  const filteredPartnerRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const selectedStatus = normalizeStatus(activeFilter);

    const searchedRequests = uniquePartnerRequests.filter((request) => {
      const status = getRequestLifecycleStatus(request);
      const queryMatch =
        !query ||
        [
          request.user_name,
          request.user_email,
          request.submission_name,
          request.item_type,
          request.type,
          status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return queryMatch;
    });

    const statusFilteredRequests = searchedRequests.filter((request) => {
      const status = getRequestLifecycleStatus(request);
      if (selectedStatus === "all") return true;
      return status === selectedStatus;
    });

    return statusFilteredRequests.sort((first, second) => {
      if (requestSort === "oldest") {
        return getRequestActivityTime(first) - getRequestActivityTime(second);
      }
      if (requestSort === "status") {
        const order = { pending: 0, accepted: 1, completed: 2, rejected: 3 };
        return (order[getRequestLifecycleStatus(first)] ?? 9) - (order[getRequestLifecycleStatus(second)] ?? 9);
      }
      if (requestSort === "pathway") {
        return String(pathwayLabels[first.type] || first.type || "").localeCompare(String(pathwayLabels[second.type] || second.type || ""));
      }
      return getRequestActivityTime(second) - getRequestActivityTime(first);
    });
  }, [uniquePartnerRequests, activeFilter, searchQuery, requestSort]);

  const filteredRuleRequests = useMemo(() => {
    const query = ruleRequestSearch.trim().toLowerCase();

    return ruleRequests.filter((item) => {
      const status = String(item.status || "pending");
      const statusMatch = ruleRequestFilter === "all" || status === ruleRequestFilter;
      const queryMatch =
        !query ||
        [
          item.rule_area,
          item.requested_change,
          item.reason,
          item.admin_notes,
          status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return statusMatch && queryMatch;
    });
  }, [ruleRequests, ruleRequestFilter, ruleRequestSearch]);

  const platformTrendData = useMemo(() => {
    const grouped = requests.reduce((acc, request) => {
      const date = parseUtcTimestamp(request.created_at) || new Date();
      const month = formatManilaDate(date, { month: "short" });

      if (!acc[month]) {
        acc[month] = { month, users: new Set(), submissions: 0 };
      }

      if (request.from_user_id || request.user_email) {
        acc[month].users.add(request.from_user_id || request.user_email);
      }

      acc[month].submissions += 1;
      return acc;
    }, {});

    const rows = Object.values(grouped).map((item) => ({
      month: item.month,
      users: item.users.size,
      submissions: item.submissions,
    }));

    return rows.length > 0
      ? rows
      : [{ month: formatManilaDate(new Date(), { month: "short" }), users: 0, submissions: 0 }];
  }, [requests]);

  const updateRequestStatus = async (request, status, noteOverride, options = {}) => {
    setIsUpdatingStatus(true);
    setRequestError("");
    const noteToSend = noteOverride ?? statusNote;

    try {
      let uploadedOutcomePhotos = options.outcome_photos || [];
      if (status === "completed" && outcomeFiles.length > 0) {
        setIsUploadingOutcome(true);
        uploadedOutcomePhotos = await uploadService.uploadMultipleFiles(outcomeFiles);
      }
      const response = await dssService.updateRequestStatus(request.id, {
        status,
        notes: noteToSend || undefined,
        outcome_title: status === "completed" ? outcomeTitle || undefined : undefined,
        outcome_description: status === "completed" ? outcomeDescription || undefined : undefined,
        outcome_photos: status === "completed" ? uploadedOutcomePhotos : undefined,
      });
      await loadRequests();
      const updatedRequest = response.data || {};
      const normalizedStatus = normalizeStatus(updatedRequest.status || status);
      setSelectedRequest((current) =>
        current?.id === request.id
          ? {
              ...current,
              ...updatedRequest,
              status: normalizedStatus,
              status_label: updatedRequest.status_label || formatStatusLabel(normalizedStatus),
              notes: noteToSend || current.notes,
              outcome_title: status === "completed" ? outcomeTitle : current.outcome_title,
              outcome_description: status === "completed" ? outcomeDescription : current.outcome_description,
              outcome_photos: status === "completed" ? uploadedOutcomePhotos : current.outcome_photos,
            }
          : current,
      );
      setStatusNote("");
      setOutcomeTitle("");
      setOutcomeDescription("");
      setOutcomeFiles([]);
      setOutcomePreviews([]);
      setOutcomeUploadError("");
    } catch (error) {
      setRequestError(error.message || "Unable to update request status.");
    } finally {
      setIsUpdatingStatus(false);
      setIsUploadingOutcome(false);
    }
  };

  const existingOutcomeImages = useMemo(() => {
    if (!selectedRequest?.outcome_photos?.length) {
      return [];
    }

    return selectedRequest.outcome_photos.map((photo, index) => ({
      url: typeof photo === "string" ? photo : photo?.url,
      label: typeof photo === "object" && photo?.label ? photo.label : `Outcome photo ${index + 1}`,
    })).filter((photo) => photo.url);
  }, [selectedRequest]);

  const previewOutcomeImages = useMemo(
    () => outcomePreviews.map((url, index) => ({ url, label: outcomeFiles[index]?.name || `Selected photo ${index + 1}` })),
    [outcomeFiles, outcomePreviews],
  );

  const handleOutcomeFiles = (files, input) => {
    const selectedFiles = Array.from(files || []);

    try {
      selectedFiles.forEach((file) => FileUploadService.validateFile(file));
    } catch (error) {
      const message = error.message || "Only image files up to 5MB can be uploaded.";
      setOutcomeUploadError(message);
      setRequestError(message);
      if (input) {
        input.value = "";
      }
      return;
    }

    setOutcomeUploadError("");
    setRequestError("");
    setOutcomeFiles(selectedFiles);
    outcomePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setOutcomePreviews(selectedFiles.map((file) => URL.createObjectURL(file)));
  };

  const submitRuleRequest = async (event) => {
    event.preventDefault();
    setRuleRequestMessage("");

    try {
      const response = await dssService.requestRuleChange(ruleRequest);
      setRuleRequestMessage(response.message || "Preference request submitted for admin review.");
      setRuleRequest((current) => ({ ...current, requested_change: "", reason: "" }));
      await loadRuleRequests();
    } catch (error) {
      setRuleRequestMessage(error.message || "Unable to submit preference request.");
    }
  };

  const submitRuleRequestReply = async (request) => {
    const message = String(ruleReplyDrafts[request.id] || "").trim();

    if (!message) {
      setRuleReplyStatus((current) => ({ ...current, [request.id]: { type: "error", message: "Add a reply before sending." } }));
      return;
    }

    setRuleReplyStatus((current) => ({ ...current, [request.id]: { type: "loading", message: "Sending reply..." } }));

    try {
      await dssService.replyToRuleChangeRequest(request.id, { message });
      setRuleReplyDrafts((current) => ({ ...current, [request.id]: "" }));
      setRuleReplyStatus((current) => ({ ...current, [request.id]: { type: "success", message: "Reply sent to admins." } }));
      await loadRuleRequests();
    } catch (error) {
      setRuleReplyStatus((current) => ({
        ...current,
        [request.id]: { type: "error", message: error.message || "Unable to send reply." },
      }));
    }
  };

  const loadRuleRequests = async () => {
    setIsLoadingRuleRequests(true);

    try {
      const response = await dssService.getRuleChangeRequests();
      setRuleRequests(response.data || []);
    } catch {
      setRuleRequests([]);
    } finally {
      setIsLoadingRuleRequests(false);
    }
  };

  if (isLoadingRequests && requests.length === 0) {
    return (
      <BrandLoadingScreen
        tone="partner"
        title="Loading partner requests"
        message="We are gathering textile briefs sent to your organization."
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
            <LineChart data={platformTrendData}>
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
          className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-[#111827]"
        >
          <details open>
            <summary className="flex cursor-pointer list-none flex-col gap-3 border-b border-[#d6e6f8] p-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
              <div>
                <h3 className="text-xl text-[#10233f] dark:text-white">Partner Requests</h3>
                <p className="mt-1 text-sm text-[#41668f] dark:text-[#9fc5f8]">
                  View all user briefs, filter by status, then respond with a clear partner decision.
                </p>
              </div>
              <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-sm font-semibold text-[#41668f] dark:bg-white/10 dark:text-[#9fc5f8]">
                {filteredPartnerRequests.length} shown
              </span>
            </summary>
            <div className="p-6 pt-5">
            <div className="mb-5 flex justify-end">
              <button
                onClick={loadRequests}
                className="flex items-center gap-2 rounded-lg bg-[#eff6ff] px-4 py-2 text-sm text-[#41668f] transition-colors hover:bg-[#dbeafe] dark:bg-white/10 dark:text-[#9fc5f8] dark:hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

          <div className="mb-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#41668f]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-[#d6e6f8] bg-[#fbfdff] py-3 pl-10 pr-4 text-sm text-[#10233f] outline-none focus:border-[#4f6f9f] dark:border-white/10 dark:bg-black/20 dark:text-white"
                placeholder="Search requester, item, pathway, or status"
              />
            </label>
            <label className="relative block">
              <select
                value={requestSort}
                onChange={(event) => setRequestSort(event.target.value)}
                className="w-full appearance-none rounded-xl border border-[#d6e6f8] bg-[#fbfdff] py-3 pl-4 pr-10 text-sm font-semibold text-[#41668f] outline-none focus:border-[#4f6f9f] dark:border-white/10 dark:bg-black/20 dark:text-[#9fc5f8]"
              >
                <option value="newest">Newest activity</option>
                <option value="oldest">Oldest activity</option>
                <option value="status">Status order</option>
                <option value="pathway">Pathway A-Z</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#41668f] dark:text-[#9fc5f8]" />
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "accepted", "completed", "cancelled", "rejected"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(normalizeStatus(status))}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm capitalize transition-colors ${
                      normalizeStatus(activeFilter) === status
                        ? "bg-[#4f6f9f] text-white"
                        : "bg-[#eff6ff] text-[#41668f] hover:bg-[#dbeafe] dark:bg-white/10 dark:text-[#9fc5f8] dark:hover:bg-white/15"
                    }`}
                  >
                    <span>{formatStatusLabel(status)}</span>
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-[#41668f] dark:bg-white/15 dark:text-[#cfe1ff]">
                      {requestStatusCounts[status] || 0}
                    </span>
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
                <tr className="border-b border-[#d6e6f8] dark:border-white/10">
                  <th className="text-left py-3 px-4 text-sm text-[#41668f] dark:text-[#9fc5f8]">ID</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f] dark:text-[#9fc5f8]">User</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f] dark:text-[#9fc5f8]">Pathway</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f] dark:text-[#9fc5f8]">Items</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f] dark:text-[#9fc5f8]">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f] dark:text-[#9fc5f8]">Date</th>
                  <th className="text-left py-3 px-4 text-sm text-[#41668f] dark:text-[#9fc5f8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRequests && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#41668f] dark:text-[#9fc5f8]">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading requests
                    </td>
                  </tr>
                )}

                {!isLoadingRequests && filteredPartnerRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#41668f] dark:text-[#9fc5f8]">
                      No requests match this view.
                    </td>
                  </tr>
                )}

                {!isLoadingRequests && filteredPartnerRequests.map((request, index) => {
                  const lifecycleStatus = getRequestLifecycleStatus(request);

                  return (
                  <tr key={getRequestRowKey(request, index)} className="border-b border-[#d6e6f8] transition-colors hover:bg-[#eff6ff] dark:border-white/10 dark:hover:bg-white/[0.04]">
                    <td className="py-3 px-4 text-sm text-[#10233f] dark:text-white">{request.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-sm text-[#10233f] dark:text-white">{request.user_name}</td>
                    <td className="py-3 px-4 text-sm text-[#41668f] dark:text-[#cfe1ff]">{pathwayLabels[request.type] || request.type}</td>
                    <td className="py-3 px-4 text-sm text-[#41668f] dark:text-[#cfe1ff]">
                      {request.quantity || "Quantity not specified"} | {request.submission_name || request.item_type}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          statusStyles[lifecycleStatus] || statusStyles.pending
                        }`}
                      >
                        {formatStatusLabel(lifecycleStatus)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#41668f] dark:text-[#cfe1ff]">{formatDate(request.created_at)}</td>
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
                        {lifecycleStatus === "pending" && (
                          <>
                            <button
                              onClick={() => updateRequestStatus(request, "accepted", "")}
                              disabled={isUpdatingStatus}
                              className="w-8 h-8 rounded-lg bg-[#4f6f9f]/20 flex items-center justify-center hover:bg-[#4f6f9f]/30 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              title="Accept"
                            >
                              <CheckCircle className="w-4 h-4 text-[#4f6f9f]" />
                            </button>
                            <button
                              onClick={() => updateRequestStatus(request, "rejected", "")}
                              disabled={isUpdatingStatus}
                              className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            </div>
          </details>
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
            Tell admins what your organization can accept so partner matching can improve without changing rules silently.
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

        <motion.section
          id="rule-requests"
          ref={ruleRequestsSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: searchParams.get("panel") === "rule-requests" ? [1, 1.01, 1] : 1,
          }}
          transition={{ delay: 0.55 }}
          className={`mt-6 rounded-2xl bg-white p-6 shadow-lg dark:bg-[#111827] ${
            searchParams.get("panel") === "rule-requests"
              ? "ring-2 ring-[#4f6f9f]/25 dark:ring-[#9fc5f8]/30"
              : ""
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl text-[#10233f] dark:text-white">Partner rule request updates</h3>
              <p className="mt-1 text-sm text-[#41668f] dark:text-[#9fc5f8]">
                Admin replies for preference changes are tracked here and in notifications.
              </p>
            </div>
            <button
              type="button"
              onClick={loadRuleRequests}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#eff6ff] px-4 py-2 text-sm font-semibold text-[#41668f] hover:bg-[#dbeafe] dark:bg-white/10 dark:text-[#9fc5f8] dark:hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#41668f] dark:text-[#9fc5f8]" />
              <input
                value={ruleRequestSearch}
                onChange={(event) => setRuleRequestSearch(event.target.value)}
                className="w-full rounded-xl border border-[#d6e6f8] bg-[#fbfdff] py-3 pl-10 pr-4 text-sm text-[#10233f] outline-none focus:border-[#4f6f9f] dark:border-white/10 dark:bg-black/20 dark:text-white"
                placeholder="Search area, change, reason, note, or status"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "accepted", "declined", "needs_more_information"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setRuleRequestFilter(status)}
                  className={`rounded-xl px-4 py-2 text-sm capitalize transition-colors ${
                    ruleRequestFilter === status
                      ? "bg-[#4f6f9f] text-white"
                      : "bg-[#eff6ff] text-[#41668f] hover:bg-[#dbeafe] dark:bg-white/10 dark:text-[#9fc5f8] dark:hover:bg-white/15"
                  }`}
                >
                  {formatStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {isLoadingRuleRequests && (
              <div className="rounded-2xl border border-[#d6e6f8] bg-[#fbfdff] p-5 text-sm text-[#41668f] dark:border-white/10 dark:bg-black/20 dark:text-[#9fc5f8]">
                Loading rule requests...
              </div>
            )}

            {!isLoadingRuleRequests && filteredRuleRequests.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#d6e6f8] bg-[#fbfdff] p-5 text-sm text-[#41668f] lg:col-span-3 dark:border-white/10 dark:bg-black/20 dark:text-[#9fc5f8]">
                No partner rule or preference requests match this view.
              </div>
            )}

            {!isLoadingRuleRequests &&
              filteredRuleRequests
                .slice(0, showAllRuleRequests ? filteredRuleRequests.length : 3)
                .map((item) => {
                const status = String(item.status || "pending");
                const isHighlighted = highlightedRuleRequestId === item.id;
                const replies = item.replies || [];
                const canReply = !["accepted", "approved", "declined"].includes(status);
                const isClosedRequest = !canReply;
                const replyState = ruleReplyStatus[item.id];
                const statusClass =
                  status === "accepted" || status === "approved"
                    ? "bg-[#4f6f9f]/20 text-[#10233f]"
                    : status === "declined"
                      ? "bg-red-100 text-red-700"
                      : status === "needs_more_information"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-[#8aa6c8]/20 text-[#3f5f8f]";

                return (
                  <motion.article
                    key={item.id}
                    animate={isHighlighted ? { scale: [1, 1.025, 1] } : { scale: 1 }}
                    transition={{ duration: 0.7 }}
                    className={`rounded-2xl border bg-[#fbfdff] p-5 shadow-sm dark:bg-white/[0.04] ${
                      isHighlighted
                        ? "border-[#4f6f9f] ring-2 ring-[#4f6f9f]/20 dark:border-[#9fc5f8] dark:ring-[#9fc5f8]/20"
                        : "border-[#d6e6f8] dark:border-white/10"
                    }`}
                  >
                    <div className={`grid gap-5 lg:items-stretch ${canReply ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "lg:grid-cols-1"}`}>
                      <div className={`flex min-w-0 flex-col ${canReply ? "lg:min-h-[15rem]" : ""}`}>
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#41668f] dark:text-[#9fc5f8]">
                                {item.rule_area}
                              </p>
                              <h4 className="mt-1 line-clamp-2 font-semibold text-[#10233f] dark:text-white">
                                {item.requested_change}
                              </h4>
                            </div>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                              {formatStatusLabel(status)}
                            </span>
                          </div>
                          {item.reason && (
                            <p className="mt-4 text-sm leading-6 text-[#41668f] dark:text-[#cfe1ff]">
                              {item.reason}
                            </p>
                          )}
                        </div>
                        <div className={`${isClosedRequest ? "mt-6" : "mt-8 lg:mt-auto lg:pt-8"}`}>
                          {item.admin_notes && (
                            <div className="rounded-xl bg-[#eff6ff] p-4 text-sm leading-6 text-[#41668f] dark:bg-black/20 dark:text-[#cfe1ff]">
                              <span className="font-semibold text-[#10233f] dark:text-white">Admin note: </span>
                              {item.admin_notes}
                            </div>
                          )}
                          <p className={`${item.admin_notes ? "mt-6" : "mt-0"} text-xs text-[#6b93b8] dark:text-[#9fc5f8]`}>
                            Submitted {formatDate(item.created_at)}
                            {item.reviewed_at ? ` - Updated ${formatDate(item.reviewed_at)}` : ""}
                          </p>
                        </div>
                      </div>

                      {canReply && (
                        <div className="h-full rounded-xl border border-[#d6e6f8] bg-white p-4 dark:border-white/10 dark:bg-black/20">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[#41668f] dark:text-[#9fc5f8]">
                            Reply thread
                          </div>
                          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                            {replies.length === 0 && (
                              <p className="text-sm text-[#41668f] dark:text-[#cfe1ff]">
                                No replies yet.
                              </p>
                            )}
                            {replies.map((reply) => (
                              <div
                                key={reply.id}
                                className="rounded-lg border border-[#d6e6f8] bg-[#fbfdff] px-3 py-2 text-sm text-[#41668f] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#cfe1ff]"
                              >
                                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-[#6b93b8] dark:text-[#9fc5f8]">
                                  <span className="font-semibold capitalize">{reply.author_role}</span>
                                  <span>{reply.author_name || reply.author_email || "Unknown"}</span>
                                  <span>{reply.created_at ? formatDateTime(reply.created_at) : "Recent"}</span>
                                </div>
                                {reply.message}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3">
                            <textarea
                              value={ruleReplyDrafts[item.id] || ""}
                              onChange={(event) =>
                                setRuleReplyDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                              }
                              disabled={replyState?.type === "loading"}
                              rows={3}
                              className="w-full resize-none rounded-xl border border-[#d6e6f8] bg-[#fbfdff] px-3 py-2 text-sm text-[#10233f] outline-none focus:border-[#4f6f9f] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-white"
                              placeholder="Add more details for admins..."
                            />
                            <div className="mt-3 flex justify-center">
                              {replyState?.message ? (
                                <span className={`mr-auto self-center text-xs ${replyState.type === "error" ? "text-red-600 dark:text-red-300" : "text-[#41668f] dark:text-[#9fc5f8]"}`}>
                                  {replyState.message}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => submitRuleRequestReply(item)}
                                disabled={replyState?.type === "loading"}
                                className="min-w-32 rounded-xl bg-[#4f6f9f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3f5f8f] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {replyState?.type === "loading" ? "Sending..." : "Send reply"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
          </div>
          {filteredRuleRequests.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllRuleRequests((current) => !current)}
              className="mt-5 w-full rounded-xl border border-[#d6e6f8] bg-[#fbfdff] px-4 py-3 text-sm font-semibold text-[#41668f] transition-colors hover:bg-[#eff6ff] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#9fc5f8] dark:hover:bg-white/10"
            >
              {showAllRuleRequests ? "Show less" : `Show all ${filteredRuleRequests.length} updates`}
            </button>
          )}
        </motion.section>
      </div>

      {selectedRequest && (() => {
        const selectedDecisionStatus = normalizeStatus(selectedRequest.status);
        const isDecisionLocked = ["accepted", "rejected", "completed", "cancelled"].includes(selectedDecisionStatus);

        return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10233f]/35 p-4 backdrop-blur-sm md:p-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedRequest(null);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-7xl overflow-y-auto rounded-[28px] border border-[#d6e6f8] bg-white p-6 shadow-[0_24px_70px_rgba(16,35,63,0.24)] md:p-8 dark:border-blue-400/20 dark:bg-[#111c2f]">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#41668f] dark:text-[#9fc5f8]">
                  Partner request
                </div>
                <h2 className="text-3xl font-bold text-[#10233f] dark:text-white">
                  {selectedRequest.submission_name || selectedRequest.item_type}
                </h2>
                <p className="mt-1 text-sm text-[#41668f] dark:text-[#9fc5f8]">
                  {pathwayLabels[selectedRequest.type] || selectedRequest.type} request sent by {selectedRequest.user_name} · {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl bg-[#eff6ff] p-2 text-[#41668f] hover:bg-[#dbeafe] dark:bg-white/10 dark:text-[#9fc5f8] dark:hover:bg-white/15"
                aria-label="Close request details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Pathway", pathwayLabels[selectedRequest.type] || selectedRequest.type],
                ["Quantity", selectedRequest.quantity || "Not specified"],
                ["Weight", selectedRequest.weight_value ? `${selectedRequest.weight_value} ${selectedRequest.weight_unit || "kg"}` : "Not specified"],
                ["Shipping bag", bagGuidance[selectedRequest.type] || "Not specified"],
                ["Condition", selectedRequest.condition || "Not specified"],
                ["Cleanliness", selectedRequest.cleanliness || "Not specified"],
                ["Buyback interest", selectedRequest.buyback_interest ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#eff6ff] px-4 py-3 dark:bg-blue-400/10">
                  <div className="text-xs uppercase tracking-wide text-[#41668f] dark:text-[#9fc5f8]">
                    {label}
                  </div>
                  <div className="mt-1 font-semibold text-[#10233f] dark:text-white">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] lg:items-start">
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#d6e6f8] bg-[#fbfdff] p-6 dark:border-blue-400/20 dark:bg-white/[0.04]">
                  <h3 className="mb-4 text-xl font-semibold text-[#10233f] dark:text-white">Brief sent by user</h3>
                  <pre className="max-h-[34rem] overflow-y-auto whitespace-pre-wrap pr-2 font-sans text-base leading-7 text-[#41668f] dark:text-[#9fc5f8]">
                    {selectedRequest.output_payload?.brief || selectedRequest.notes || "No brief provided."}
                  </pre>
                </div>

                {normalizeStatus(selectedRequest.status) === "cancelled" && (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm leading-6 text-zinc-700 dark:border-zinc-400/20 dark:bg-zinc-400/10 dark:text-zinc-200">
                    <h3 className="mb-2 text-xl font-semibold text-[#10233f] dark:text-white">Cancellation</h3>
                    <p>
                      {selectedRequest.cancellation_reason ||
                        "The user cancelled this request before adding a reason."}
                    </p>
                    {selectedRequest.cancelled_at && (
                      <p className="mt-2 text-xs">Cancelled {formatDateTime(selectedRequest.cancelled_at)}</p>
                    )}
                  </div>
                )}

                <div className="rounded-2xl border border-[#d6e6f8] bg-white p-6 dark:border-blue-400/20 dark:bg-white/[0.04]">
                  <h3 className="mb-4 text-xl font-semibold text-[#10233f] dark:text-white">Recommendation summary</h3>
                  {(() => {
                    const recommendation = getDssRecommendation(selectedRequest);
                    const checks = recommendation.checks || selectedRequest.output_payload?.rule_checks || [];

                    return (
                      <div className="space-y-4 text-base leading-7 text-[#41668f] dark:text-[#9fc5f8]">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-[#eff6ff] px-4 py-3 dark:bg-blue-400/10">
                            <div className="text-xs uppercase tracking-wide">Pathway</div>
                            <div className="mt-1 font-semibold text-[#10233f] dark:text-white">
                              {pathwayLabels[recommendation.recommended_pathway] || selectedRequest.type}
                            </div>
                          </div>
                          <div className="rounded-xl bg-[#eff6ff] px-4 py-3 dark:bg-blue-400/10">
                            <div className="text-xs uppercase tracking-wide">Confidence</div>
                            <div className="mt-1 font-semibold text-[#10233f] dark:text-white">
                              {formatPercent(recommendation.confidence)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-[#eff6ff] px-4 py-3 dark:bg-blue-400/10">
                            <div className="text-xs uppercase tracking-wide">Score</div>
                            <div className="mt-1 font-semibold text-[#10233f] dark:text-white">
                              {recommendation.score != null ? Number(recommendation.score).toFixed(1) : "N/A"}
                            </div>
                          </div>
                        </div>
                        <p>{recommendation.explanation || "No recommendation note was saved for this request."}</p>
                        {selectedRequest.output_payload?.recommendations?.length > 0 && (
                          <div className="rounded-xl border border-[#d6e6f8] bg-[#fbfdff] p-4 dark:border-blue-400/20 dark:bg-white/[0.04]">
                            <div className="mb-3 font-semibold text-[#10233f] dark:text-white">
                              All pathway scores
                            </div>
                            <div className="space-y-2">
                              {selectedRequest.output_payload.recommendations.map((item) => (
                                <div
                                  key={`${selectedRequest.id}-${item.recommended_pathway}`}
                                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm dark:bg-white/[0.04]"
                                >
                                  <span className="font-semibold text-[#10233f] dark:text-white">
                                    #{item.rank} {pathwayLabels[item.recommended_pathway] || item.recommended_pathway}
                                  </span>
                                  <span className="text-[#41668f] dark:text-[#9fc5f8]">
                                    {formatPercent(item.confidence)} · {Number(item.score || 0).toFixed(1)}/100
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {checks.length > 0 && (
                          <details className="rounded-xl border border-[#d6e6f8] bg-[#fbfdff] px-4 py-3 dark:border-blue-400/20 dark:bg-white/[0.04]">
                            <summary className="cursor-pointer font-semibold text-[#4f6f9f] dark:text-[#9fc5f8]">
                              View routing checks
                            </summary>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {checks.map((check) => (
                                <span
                                  key={`${selectedRequest.id}-${check.question}`}
                                  className={`rounded-full px-3 py-1 text-xs ${
                                    check.matched
                                      ? "bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-200"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200"
                                  }`}
                                >
                                  {check.question}: {check.matched ? "matched" : "missed"}
                                </span>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-[#d6e6f8] bg-white p-6 dark:border-blue-400/20 dark:bg-white/[0.04]">
                  <h3 className="mb-4 text-xl font-semibold text-[#10233f] dark:text-white">Submission details</h3>
                  <div className="space-y-3 text-base leading-7 text-[#41668f] dark:text-[#9fc5f8]">
                    <p><span className="font-semibold text-[#10233f] dark:text-white">Fabric:</span> {selectedRequest.fabric || selectedRequest.details?.custom_fabric_text || selectedRequest.details?.fabric_types || "Not specified"}</p>
                    <p><span className="font-semibold text-[#10233f] dark:text-white">Brand:</span> {selectedRequest.details?.no_brand_visible ? "No brand visible" : selectedRequest.details?.brand || "Not specified"}</p>
                    <p><span className="font-semibold text-[#10233f] dark:text-white">Burn test:</span> {selectedRequest.burn_test?.performed ? "Performed" : "Not performed"}</p>
                    {selectedRequest.upcycle_request && (
                      <p><span className="font-semibold text-[#10233f] dark:text-white">Upcycle request:</span> {selectedRequest.upcycle_request}</p>
                    )}
                    {selectedRequest.type === "upcycle" && (
                      <p>
                        <span className="font-semibold text-[#10233f] dark:text-white">Partner handoff:</span>{" "}
                        {selectedRequest.buyback_interest
                          ? "User sent this as Upcycle and is open to buyback if your organization supports it."
                          : "User sent this as Upcycle only; no buyback interest was requested."}
                      </p>
                    )}
                    {selectedRequest.description && (
                      <p><span className="font-semibold text-[#10233f] dark:text-white">User note:</span> {selectedRequest.description}</p>
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

                <div className="rounded-2xl border border-[#d6e6f8] bg-white p-6 dark:border-blue-400/20 dark:bg-white/[0.04]">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-[#10233f] dark:text-white">User tracking updates</h3>
                      <p className="mt-1 text-sm leading-6 text-[#41668f] dark:text-[#9fc5f8]">
                        User-side logistics and drop-off documentation for this request.
                      </p>
                    </div>
                    {selectedRequest.latest_tracking_update && (
                      <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-[#41668f] dark:bg-white/10 dark:text-[#9fc5f8]">
                        {trackingStatusLabels[selectedRequest.latest_tracking_update.progress_status] ||
                          formatStatusLabel(selectedRequest.latest_tracking_update.progress_status)}
                      </span>
                    )}
                  </div>
                  {selectedRequest.tracking_updates?.length > 0 ? (
                    <div className="space-y-4">
                      {selectedRequest.tracking_updates.map((update) => (
                        <div
                          key={update.id}
                          className="rounded-2xl border border-[#d6e6f8] bg-[#fbfdff] p-5 text-sm text-[#41668f] dark:border-white/10 dark:bg-black/20 dark:text-[#cfe1ff]"
                        >
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="text-lg font-semibold text-[#10233f] dark:text-white">
                              {trackingStatusLabels[update.progress_status] || formatStatusLabel(update.progress_status)}
                            </div>
                            <div className="text-xs text-[#6b93b8] dark:text-[#9fc5f8]">
                              {formatDateTime(update.created_at)}
                            </div>
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <div><span className="font-semibold text-[#10233f] dark:text-white">Method:</span> {fulfillmentMethodLabels[update.fulfillment_method] || formatStatusLabel(update.fulfillment_method)}</div>
                            {update.contact_name && <div><span className="font-semibold text-[#10233f] dark:text-white">Contact name:</span> {update.contact_name}</div>}
                            {update.logistics_company && <div><span className="font-semibold text-[#10233f] dark:text-white">Courier:</span> {update.logistics_company}</div>}
                            {update.tracking_number && <div><span className="font-semibold text-[#10233f] dark:text-white">Tracking Number:</span> {update.tracking_number}</div>}
                            {update.dropoff_scheduled_at && <div><span className="font-semibold text-[#10233f] dark:text-white">Drop-off:</span> {formatDateTime(update.dropoff_scheduled_at)}</div>}
                            {update.dropoff_location && <div><span className="font-semibold text-[#10233f] dark:text-white">Location:</span> {update.dropoff_location}</div>}
                          </div>
                          {update.notes && <p className="mt-4 rounded-xl bg-[#eff6ff] px-3 py-2 leading-6 dark:bg-white/10"><span className="font-semibold text-[#10233f] dark:text-white">Notes:</span> {update.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-[#d6e6f8] bg-[#fbfdff] px-4 py-3 text-sm text-[#41668f] dark:border-white/10 dark:bg-black/20 dark:text-[#cfe1ff]">
                      No tracking updates yet.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-[#d6e6f8] bg-white p-6 dark:border-blue-400/20 dark:bg-white/[0.04]">
                  <h3 className="mb-2 text-2xl font-semibold text-[#10233f] dark:text-white">Partner decision and message to user</h3>
                  {isDecisionLocked ? (
                    <DecisionStatusIndicator
                      status={selectedDecisionStatus}
                    />
                  ) : (
                    <>
                      <p className="mb-4 text-sm leading-6 text-[#41668f] dark:text-[#9fc5f8]">
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
                        className="mb-3 w-full resize-y rounded-xl border border-[#d6e6f8] p-4 text-base leading-7 text-[#10233f] outline-none focus:border-[#4f6f9f] dark:border-blue-400/20 dark:bg-[#0f1b33] dark:text-white"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ["accepted", "Accept request"],
                          ["rejected", "Reject request"],
                        ].map(([status, label]) => (
                          <button
                            key={status}
                            onClick={() => updateRequestStatus(selectedRequest, status)}
                            disabled={isUpdatingStatus}
                            className={`rounded-xl px-3 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                              status === "rejected"
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-[#4f6f9f] hover:bg-[#3f5f8f]"
                            }`}
                          >
                            {isUpdatingStatus ? "Saving..." : label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {normalizeStatus(selectedRequest.status) === "accepted" && (
                  <div className="grid gap-3 rounded-2xl border border-[#d6e6f8] bg-white p-6 dark:border-blue-400/20 dark:bg-white/[0.04]">
                    <div>
                      <h3 className="text-2xl font-semibold text-[#10233f] dark:text-white">Report what happened</h3>
                      <p className="mt-1 text-sm leading-6 text-[#41668f] dark:text-[#9fc5f8]">
                        Share the user-facing story once the textile has been processed. This sends a notification and message to the user.
                      </p>
                    </div>
                    <input
                      value={outcomeTitle}
                      onChange={(event) => setOutcomeTitle(event.target.value)}
                      className="rounded-xl border border-[#d6e6f8] px-4 py-3 text-sm text-[#10233f] outline-none focus:border-[#4f6f9f] dark:border-blue-400/20 dark:bg-[#0f1b33] dark:text-white"
                      placeholder="Example: Turned into tote bags"
                    />
                    <textarea
                      value={outcomeDescription}
                      onChange={(event) => setOutcomeDescription(event.target.value)}
                      rows={4}
                      className="resize-y rounded-xl border border-[#d6e6f8] px-4 py-3 text-sm leading-6 text-[#10233f] outline-none focus:border-[#4f6f9f] dark:border-blue-400/20 dark:bg-[#0f1b33] dark:text-white"
                      placeholder="Example: We sorted and stitched the fabric into two tote bags for the next community sale."
                    />
                    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-[#d6e6f8] bg-[#fbfdff] p-5 text-center text-sm text-[#41668f] transition-colors hover:bg-[#eff6ff] dark:border-blue-400/20 dark:bg-white/[0.04] dark:text-[#9fc5f8]">
                      <span className="block font-semibold">Add outcome photos</span>
                      <span className="mt-1 block text-xs text-[#6a83a4] dark:text-[#9fc5f8]">Upload images up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => handleOutcomeFiles(event.target.files, event.target)}
                      />
                    </label>
                    {outcomeUploadError && (
                      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {outcomeUploadError}
                      </div>
                    )}
                    {(previewOutcomeImages.length > 0 || existingOutcomeImages.length > 0) && (
                      <ImageCarousel
                        images={previewOutcomeImages.length > 0 ? previewOutcomeImages : existingOutcomeImages}
                        title={previewOutcomeImages.length > 0 ? "Selected outcome photos" : "Outcome photos"}
                        allowDownload={existingOutcomeImages.length > 0}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(selectedRequest, "completed")}
                      disabled={isUpdatingStatus || isUploadingOutcome || !outcomeTitle.trim()}
                      className="rounded-xl bg-[#4f6f9f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#3f5f8f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUploadingOutcome ? "Uploading photos..." : isUpdatingStatus ? "Completing..." : "Mark as completed"}
                    </button>
                  </div>
                )}

                {normalizeStatus(selectedRequest.status) === "completed" && (selectedRequest.outcome_title || existingOutcomeImages.length > 0) && (
                  <div className="grid gap-3 rounded-2xl border border-[#d6e6f8] bg-white p-6 dark:border-blue-400/20 dark:bg-white/[0.04]">
                    <h3 className="text-2xl font-semibold text-[#10233f] dark:text-white">Completion report</h3>
                    {selectedRequest.outcome_title && (
                      <p className="text-sm leading-6 text-[#41668f] dark:text-[#9fc5f8]">
                        <span className="font-semibold text-[#10233f] dark:text-white">{selectedRequest.outcome_title}: </span>
                        {selectedRequest.outcome_description || "Completed"}
                      </p>
                    )}
                    {existingOutcomeImages.length > 0 && (
                      <ImageCarousel images={existingOutcomeImages} title="Outcome photos" allowDownload />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

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
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                  navigate("/", { replace: true });
                }}
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
