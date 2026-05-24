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
  Search,
  X,
  Image as ImageIcon,
  Leaf,
  Camera,
  Sparkles,
} from "lucide-react";
import { dssService, messageService, notificationService, submissionService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatManilaDate, parseUtcTimestamp } from "../../utils/dateTime";
import { ImageCarousel } from "../components/ImageCarousel";
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

const trackingStatusOptions = [
  { value: "request_sent", label: "Request sent" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_transit", label: "Shipped / In transit" },
  { value: "dropoff_completed", label: "Drop-off completed" },
  { value: "completed", label: "Completed" },
];

const fulfillmentMethodOptions = [
  { value: "drop_off", label: "Direct drop-off" },
  { value: "shipping", label: "Shipping" },
  { value: "pickup", label: "Pickup" },
  { value: "other", label: "Other" },
];

const trackingStatusLabels = trackingStatusOptions.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const fulfillmentMethodLabels = fulfillmentMethodOptions.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

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

const formatStatusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const dashboardStatusFromSubmission = (submission, latestPartnerRequest) => {
  if (latestPartnerRequest?.status) {
    return latestPartnerRequest.status;
  }

  if (submission.status === "processed") {
    return "completed";
  }

  if (submission.status === "verified") {
    return "accepted";
  }

  if (submission.status === "rejected") {
    return "rejected";
  }

  return "pending";
};

const toPhotoUrl = (photo) => {
  if (!photo) {
    return "";
  }

  if (typeof photo === "string") {
    return photo;
  }

  return photo.url || "";
};

const formatConfidence = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return `${Math.round(Number(value) * 100)}%`;
};

const normalizeOutcomePhotos = (photos = []) =>
  photos
    .map((photo, index) => ({
      url: toPhotoUrl(photo),
      label: typeof photo === "object" && photo?.label ? photo.label : `Outcome photo ${index + 1}`,
    }))
    .filter((photo) => photo.url);

export function UserDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [requestFilter, setRequestFilter] = useState("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [trackingForm, setTrackingForm] = useState({
    progress_status: "request_sent",
    fulfillment_method: "drop_off",
    logistics_company: "",
    tracking_number: "",
    notes: "",
  });
  const [trackingMessage, setTrackingMessage] = useState("");
  const [isSavingTracking, setIsSavingTracking] = useState(false);
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
          setRequestError(error.message || "Unable to load partner requests.");
        }
      }
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  const submittedRequests = useMemo(() => {
    const requestsBySubmission = requests.reduce((acc, request) => {
      if (!request.submission_id) {
        return acc;
      }

      acc[request.submission_id] = [...(acc[request.submission_id] || []), request];
      return acc;
    }, {});

    return submissions.map((submission) => {
      const relatedRequests = (requestsBySubmission[submission.id] || []).sort(
        (first, second) =>
          new Date(second.updated_at || second.created_at || 0).getTime() -
          new Date(first.updated_at || first.created_at || 0).getTime(),
      );
      const latestPartnerRequest = relatedRequests[0] || null;
      const recommendation =
        latestPartnerRequest?.output_payload?.recommendation ||
        latestPartnerRequest?.output_payload?.recommendations?.[0] ||
        null;
      const selectedPathway =
        latestPartnerRequest?.type ||
        submission.service_type ||
        submission.action ||
        "not_sure";
      const status = dashboardStatusFromSubmission(submission, latestPartnerRequest);
      const estimatedCarbonKg =
        latestPartnerRequest?.estimated_carbon_kg ??
        latestPartnerRequest?.output_payload?.estimated_carbon_kg ??
        null;
      const latestOutcomeRequest =
        relatedRequests.find((request) => request.outcome_title || request.outcome_photos?.length > 0) || null;

      return {
        id: submission.id,
        submission,
        relatedRequests,
        latestPartnerRequest,
        recommendation,
        title: submission.submission_name || submission.item_type || "Untitled request",
        itemType: submission.item_type,
        selectedPathway,
        recommendedPathway: recommendation?.recommended_pathway || null,
        partnerName: latestPartnerRequest?.partner_name || "",
        status,
        submittedAt: submission.created_at,
        confidence:
          latestPartnerRequest?.confidence ?? recommendation?.confidence ?? null,
        score: recommendation?.score ?? null,
        estimatedCarbonKg,
        outcomeTitle: latestOutcomeRequest?.outcome_title || "",
        outcomeDescription: latestOutcomeRequest?.outcome_description || "",
        outcomePhotos: normalizeOutcomePhotos(latestOutcomeRequest?.outcome_photos || []),
        trackingUpdates: submission.tracking_updates || [],
        latestTrackingUpdate: submission.latest_tracking_update || submission.tracking_updates?.[0] || null,
      };
    });
  }, [requests, submissions]);

  const submitTrackingUpdate = async () => {
    if (!selectedRequest) return;

    setIsSavingTracking(true);
    setTrackingMessage("");

    try {
      const response = await submissionService.createTrackingUpdate(selectedRequest.submission.id, {
        request_id: selectedRequest.latestPartnerRequest?.id || null,
        progress_status: trackingForm.progress_status,
        fulfillment_method: trackingForm.fulfillment_method,
        logistics_company:
          trackingForm.fulfillment_method === "shipping" ? trackingForm.logistics_company.trim() || null : null,
        tracking_number:
          trackingForm.fulfillment_method === "shipping" ? trackingForm.tracking_number.trim() || null : null,
        notes: trackingForm.notes.trim() || null,
      });

      const update = response.data;
      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === selectedRequest.submission.id
            ? {
                ...submission,
                tracking_updates: [update, ...(submission.tracking_updates || [])],
                latest_tracking_update: update,
              }
            : submission,
        ),
      );
      setSelectedRequest((current) =>
        current
          ? {
              ...current,
              submission: {
                ...current.submission,
                tracking_updates: [update, ...(current.submission.tracking_updates || [])],
                latest_tracking_update: update,
              },
              trackingUpdates: [update, ...(current.trackingUpdates || [])],
              latestTrackingUpdate: update,
            }
          : current,
      );
      setTrackingForm((current) => ({
        ...current,
        logistics_company: "",
        tracking_number: "",
        notes: "",
      }));
      setTrackingMessage("Tracking update recorded and sent to the partner.");
      const notificationsResponse = await notificationService.getUnreadCount();
      setBadgeCounts((current) => ({
        ...current,
        notifications: Number(notificationsResponse.unread_count || current.notifications),
      }));
    } catch (error) {
      setTrackingMessage(error.message || "Unable to save tracking update.");
    } finally {
      setIsSavingTracking(false);
    }
  };

  const dashboardStats = useMemo(() => {
    const pending = submittedRequests.filter((request) => request.status === "pending").length;
    const completedStories = submittedRequests.filter((request) => request.outcomeTitle).length;

    return [
      {
        icon: Package,
        label: "Total Requests",
        value: String(submittedRequests.length),
        color: "#336158",
      },
      {
        icon: Clock,
        label: "Pending Requests",
        value: String(pending),
        color: "#d4a574",
      },
      {
        icon: Sparkles,
        label: "Textile Stories",
        value: String(completedStories),
        color: "#9a7738",
      },
      {
        icon: Leaf,
        label: "Routing Footprint",
        value: `${submittedRequests
          .reduce((total, request) => total + Number(request.estimatedCarbonKg || 0), 0)
          .toFixed(1)} kg CO2e`,
        color: "#55735d",
      },
    ];
  }, [submittedRequests]);

  const completedOutcomes = useMemo(
    () => submittedRequests.filter((request) => request.outcomeTitle).slice(0, 3),
    [submittedRequests],
  );

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

    return submittedRequests.filter((request) => {
      const statusMatch = requestFilter === "all" || request.status === requestFilter;
      const queryMatch =
        !query ||
        [
          request.title,
          request.itemType,
          request.partnerName,
          request.selectedPathway,
          request.recommendedPathway,
          request.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return statusMatch && queryMatch;
    });
  }, [submittedRequests, requestFilter, requestSearch]);

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

        <section className="grid gap-6 mb-8 md:grid-cols-4">
          {dashboardStats.map((widget, index) => (
            <motion.button
              key={widget.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => {
                const nextFilter = widget.label.includes("Pending")
                  ? "pending"
                  : widget.label.includes("Stories")
                    ? "completed"
                    : "all";
                navigate(`/my-requests${nextFilter === "all" ? "" : `?status=${nextFilter}`}`);
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

        {completedOutcomes.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-8 overflow-hidden rounded-[28px] border border-[#d9e8cf] bg-[linear-gradient(135deg,#f7fbef,#edf7ed,#fff8e8)] p-6 shadow-[0_18px_48px_rgba(51,97,88,0.13)] md:p-8"
          >
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-[#336158]">
                  <Sparkles className="h-4 w-4" />
                  Textile wins
                </div>
                <h2 className="font-gloock text-3xl text-[#19221d]">
                  Your textiles are becoming something new
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/my-requests?status=completed")}
                className="rounded-xl border border-[#cfe2cf] bg-white/80 px-4 py-2 text-sm font-semibold text-[#336158] hover:bg-white"
              >
                View completed
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {completedOutcomes.map((request) => (
                <article key={request.id} className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_10px_28px_rgba(25,34,29,0.08)]">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7ed] text-[#336158]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#336158]">Congratulations!</div>
                      <div className="text-xs text-[#5f6f67]">{request.partnerName || "Partner update"}</div>
                    </div>
                  </div>
                  <p className="text-lg font-semibold leading-7 text-[#19221d]">
                    Your {request.title} was turned into {request.outcomeTitle}!
                  </p>
                  {request.outcomeDescription && (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5f6f67]">
                      {request.outcomeDescription}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {request.outcomePhotos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(request)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#336158] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2a4c48]"
                      >
                        <Camera className="h-4 w-4" />
                        View photos
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(request)}
                      className="rounded-xl border border-[#dce4da] px-3 py-2 text-sm font-semibold text-[#5f6f67] hover:bg-[#f3f5f2]"
                    >
                      Read story
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </motion.section>
        )}

        {false ? (
        <motion.section
          ref={requestsRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className={`${cardClass} mb-8 rounded-2xl p-6`}
        >
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-xl text-[#19221d]">My Requests</h3>
              <p className="mt-1 text-sm text-[#5f6f67]">
                View submitted textile requests, recommendation outcomes, partner routing, and current status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dss-requests")}
              className="w-full rounded-xl border border-[#dce4da] px-4 py-2 text-sm font-semibold text-[#336158] hover:bg-[#f3f5f2] md:w-auto"
            >
              Sent partner requests
            </button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6f67]" />
              <input
                value={requestSearch}
                onChange={(event) => setRequestSearch(event.target.value)}
                className="w-full rounded-xl border border-[#dce4da] bg-[#fbfcfa] py-3 pl-10 pr-4 text-sm text-[#19221d] outline-none focus:border-[#336158]"
                placeholder="Search item, pathway, partner, or status"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "accepted", "in_progress", "completed", "declined", "rejected"].map(
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
                No submitted requests match this view. New submissions will appear here after you complete the textile request form.
              </div>
            )}

            {filteredRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-5 md:p-6"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="text-base font-semibold leading-6 text-[#19221d]">
                      {request.title}
                    </div>
                    <span
                      className={`inline-flex min-h-9 w-fit shrink-0 items-center justify-center rounded-full px-3 py-1 text-xs ${
                        requestStatusClass[request.status] ||
                        requestStatusClass.pending
                      }`}
                    >
                      {formatStatusLabel(request.status)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5f6f67]">
                      <span>{pathwayLabels[request.selectedPathway] || formatStatusLabel(request.selectedPathway)}</span>
                      <span>Partner: {request.partnerName || "Not sent yet"}</span>
                      <span>{formatManilaDate(request.submittedAt)}</span>
                    </div>
                  </div>

                  <div className="grid gap-2.5 text-sm text-[#5f6f67] sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex min-h-10 items-center rounded-xl border border-[#e1e7df] bg-white/70 px-3 py-2">
                      Recommended: {pathwayLabels[request.recommendedPathway] || "Recommendation pending"}
                    </div>
                    <div className="flex min-h-10 items-center rounded-xl border border-[#e1e7df] bg-white/70 px-3 py-2">
                      Confidence: {formatConfidence(request.confidence)}
                    </div>
                    <div className="flex min-h-10 items-center rounded-xl border border-[#e1e7df] bg-white/70 px-3 py-2">
                      Score: {request.score == null ? "N/A" : `${Number(request.score).toFixed(1)} / 100`}
                    </div>
                  </div>

                  <div className="grid w-full gap-2">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#dce4da] px-4 py-2 text-center text-sm font-semibold text-[#5f6f67] hover:bg-[#f3f5f2]"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() =>
                        navigate(
                          `/dss/${request.submission.id}${
                            request.latestPartnerRequest
                              ? `?request=${request.latestPartnerRequest.id}`
                              : ""
                          }`,
                        )
                      }
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#336158] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[#2a4c48]"
                    >
                      Open recommendation
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </motion.section>
        ) : null}

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
                Track textile briefs you sent to partners.
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
                No partner requests yet. Submit textile details, review the
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
          Historical disabled request-preview markup remains off while My Requests
          above owns the dashboard request list.
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
                No partner requests yet. Submit textile details, review the
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
              View all sent partner requests
            </button>
          )}
        </motion.section>
        ) : null}

      </main>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19221d]/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-[0_24px_70px_rgba(25,34,29,0.24)] md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-sans text-2xl font-bold text-[#19221d]">
                  {selectedRequest.title}
                </h2>
                <p className="mt-1 text-sm text-[#5f6f67]">
                  Submitted {formatManilaDate(selectedRequest.submittedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce4da] text-[#5f6f67] hover:bg-[#f3f5f2]"
                aria-label="Close request details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4">
                <h3 className="mb-3 font-semibold text-[#19221d]">Submission Details</h3>
                <div className="grid gap-3 text-sm text-[#5f6f67] sm:grid-cols-2">
                  <DetailItem label="Item" value={selectedRequest.submission.item_type} />
                  <DetailItem
                    label="Selected pathway"
                    value={pathwayLabels[selectedRequest.selectedPathway] || formatStatusLabel(selectedRequest.selectedPathway)}
                  />
                  <DetailItem label="Condition" value={selectedRequest.submission.condition} />
                  <DetailItem label="Cleanliness" value={selectedRequest.submission.cleanliness} />
                  <DetailItem label="Fabric" value={selectedRequest.submission.fabric} />
                  <DetailItem label="Quantity" value={selectedRequest.submission.quantity || "Not specified"} />
                  <DetailItem
                    label="Weight"
                    value={
                      selectedRequest.submission.details?.weight_value
                        ? `${selectedRequest.submission.details.weight_value} ${selectedRequest.submission.details.weight_unit || "kg"}`
                        : "Not specified"
                    }
                  />
                  <DetailItem
                    label="Shipping bag"
                    value={bagGuidance[selectedRequest.selectedPathway] || "Set after pathway selection"}
                  />
                  <DetailItem label="Brand" value={selectedRequest.submission.details?.brand || "Not specified"} />
                  <DetailItem label="Repairability" value={selectedRequest.submission.details?.repairability || "Not specified"} />
                </div>
                {selectedRequest.submission.description && (
                  <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#5f6f67]">
                    {selectedRequest.submission.description}
                  </p>
                )}

                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold text-[#19221d]">Uploaded Images</h4>
                  {selectedRequest.submission.photos?.length > 0 ? (
                    <ImageCarousel
                      title="Uploaded Images"
                      allowDownload
                      images={selectedRequest.submission.photos.map((photo, index) => ({
                        url: toPhotoUrl(photo),
                        label: typeof photo === "object" && photo?.label ? photo.label : `Submitted textile ${index + 1}`,
                      }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-[#e1e7df] bg-white px-4 py-3 text-sm text-[#5f6f67]">
                      <ImageIcon className="h-4 w-4" />
                      No images uploaded.
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4">
                  <h3 className="mb-3 font-semibold text-[#19221d]">Recommendation</h3>
                  <div className="grid gap-3 text-sm text-[#5f6f67]">
                    <DetailItem
                      label="Recommended pathway"
                      value={pathwayLabels[selectedRequest.recommendedPathway] || "Recommendation pending"}
                    />
                    <DetailItem label="Confidence" value={formatConfidence(selectedRequest.confidence)} />
                    <DetailItem
                      label="Score"
                      value={selectedRequest.score == null ? "N/A" : `${Number(selectedRequest.score).toFixed(1)} / 100`}
                    />
                  </div>
                  {selectedRequest.recommendation?.explanation && (
                    <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#5f6f67]">
                      {selectedRequest.recommendation.explanation}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4">
                  <h3 className="mb-3 font-semibold text-[#19221d]">Partner Brief</h3>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        requestStatusClass[selectedRequest.status] || requestStatusClass.pending
                      }`}
                    >
                      {formatStatusLabel(selectedRequest.status)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-[#5f6f67]">
                      {selectedRequest.partnerName || "Not sent to a partner yet"}
                    </span>
                    {selectedRequest.estimatedCarbonKg != null && (
                      <span className="rounded-full bg-[#edf7ed] px-3 py-1 text-xs text-[#336158]">
                        {Number(selectedRequest.estimatedCarbonKg).toFixed(1)} kg CO2e estimate
                      </span>
                    )}
                  </div>
                  {selectedRequest.relatedRequests.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRequest.relatedRequests.map((request) => (
                        <div key={request.id} className="rounded-xl border border-[#e1e7df] bg-white px-4 py-3 text-sm text-[#5f6f67]">
                          <div className="font-semibold text-[#19221d]">
                            {pathwayLabels[request.type] || request.type} to {request.partner_name || "partner"}
                          </div>
                          <div className="mt-1">
                            {formatStatusLabel(request.status)} · {formatManilaDate(request.created_at)}
                          </div>
                          {request.outcome_title && (
                            <div className="mt-3 rounded-2xl border border-[#cfe2cf] bg-[#edf7ed] px-4 py-3 text-[#336158]">
                              <div className="flex items-center gap-2 font-semibold text-[#19221d]">
                                <Sparkles className="h-4 w-4 text-[#336158]" />
                                Congratulations! Your {selectedRequest.title} was turned into {request.outcome_title}!
                              </div>
                              <p className="mt-2 leading-6">
                                {request.outcome_description || "The partner reported a happy update for your textile."}
                              </p>
                              {normalizeOutcomePhotos(request.outcome_photos || []).length > 0 && (
                                <div className="mt-3">
                                  <ImageCarousel
                                    title="Outcome photos"
                                    allowDownload
                                    images={normalizeOutcomePhotos(request.outcome_photos || [])}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-[#5f6f67]">
                      This submission is saved, but no partner brief has been sent yet.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#19221d]">Tracking & Logistics</h3>
                      <p className="mt-1 text-sm leading-6 text-[#5f6f67]">
                        Record what happened after routing. Courier details are optional for direct drop-off.
                      </p>
                    </div>
                    {selectedRequest.latestTrackingUpdate && (
                      <span className="rounded-full bg-[#edf7ed] px-3 py-1 text-xs font-semibold text-[#336158]">
                        {trackingStatusLabels[selectedRequest.latestTrackingUpdate.progress_status] ||
                          formatStatusLabel(selectedRequest.latestTrackingUpdate.progress_status)}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <select
                      value={trackingForm.progress_status}
                      onChange={(event) =>
                        setTrackingForm((current) => ({ ...current, progress_status: event.target.value }))
                      }
                      className="rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#19221d] outline-none focus:border-[#336158]"
                    >
                      {trackingStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={trackingForm.fulfillment_method}
                      onChange={(event) =>
                        setTrackingForm((current) => ({ ...current, fulfillment_method: event.target.value }))
                      }
                      className="rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#19221d] outline-none focus:border-[#336158]"
                    >
                      {fulfillmentMethodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {trackingForm.fulfillment_method === "shipping" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={trackingForm.logistics_company}
                          onChange={(event) =>
                            setTrackingForm((current) => ({ ...current, logistics_company: event.target.value }))
                          }
                          className="rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#19221d] outline-none focus:border-[#336158]"
                          placeholder="Logistics company / courier"
                        />
                        <input
                          value={trackingForm.tracking_number}
                          onChange={(event) =>
                            setTrackingForm((current) => ({ ...current, tracking_number: event.target.value }))
                          }
                          className="rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#19221d] outline-none focus:border-[#336158]"
                          placeholder="Tracking number"
                        />
                      </div>
                    )}

                    <textarea
                      value={trackingForm.notes}
                      onChange={(event) => setTrackingForm((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                      className="resize-none rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm leading-6 text-[#19221d] outline-none focus:border-[#336158]"
                      placeholder="Optional notes"
                    />

                    {trackingMessage && (
                      <div className="rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#5f6f67]">
                        {trackingMessage}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={submitTrackingUpdate}
                      disabled={isSavingTracking}
                      className="rounded-xl bg-[#336158] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a4c48] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingTracking ? "Saving update..." : "Save tracking update"}
                    </button>
                  </div>

                  <div className="mt-5 border-t border-[#e1e7df] pt-4">
                    <h4 className="mb-3 text-sm font-semibold text-[#19221d]">Tracking history</h4>
                    {(selectedRequest.trackingUpdates || []).length > 0 ? (
                      <div className="space-y-3">
                        {selectedRequest.trackingUpdates.map((update) => (
                          <div key={update.id} className="rounded-xl border border-[#e1e7df] bg-white px-4 py-3 text-sm text-[#5f6f67]">
                            <div className="font-semibold text-[#19221d]">
                              {trackingStatusLabels[update.progress_status] || formatStatusLabel(update.progress_status)}
                            </div>
                            <div className="mt-1 text-xs">{formatManilaDate(update.created_at)}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-[#f3f5f2] px-2 py-1">
                                {fulfillmentMethodLabels[update.fulfillment_method] || formatStatusLabel(update.fulfillment_method)}
                              </span>
                              {update.logistics_company && (
                                <span className="rounded-full bg-[#f3f5f2] px-2 py-1">{update.logistics_company}</span>
                              )}
                              {update.tracking_number && (
                                <span className="rounded-full bg-[#f3f5f2] px-2 py-1">#{update.tracking_number}</span>
                              )}
                            </div>
                            {update.notes && <p className="mt-2 leading-6">{update.notes}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-[#dce4da] bg-white px-4 py-3 text-sm text-[#5f6f67]">
                        No tracking updates yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/messages")}
                className="rounded-xl border border-[#dce4da] px-4 py-2 text-sm font-semibold text-[#5f6f67] hover:bg-[#f3f5f2]"
              >
                Messages
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/dss/${selectedRequest.submission.id}${
                      selectedRequest.latestPartnerRequest
                        ? `?request=${selectedRequest.latestPartnerRequest.id}`
                        : ""
                    }`,
                  )
                }
                className="rounded-xl bg-[#336158] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a4c48]"
              >
                Open Full Details
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                  navigate("/login", { replace: true });
                }}
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

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-[#7d8a82]">
        {label}
      </div>
      <div className="mt-1 text-[#19221d]">{value || "Not specified"}</div>
    </div>
  );
}
