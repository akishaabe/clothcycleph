import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bell, CheckCircle2, PackageCheck, Recycle, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { dssService, notificationService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./NotificationsPage.css";

export function NotificationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const inferredTheme = user?.role === "partner" || user?.role === "admin" ? user.role : "default";
  const notificationsTheme = ["partner", "admin"].includes(searchParams.get("theme"))
    ? searchParams.get("theme")
    : inferredTheme;
  const backPath =
    notificationsTheme === "partner"
      ? "/partner"
      : notificationsTheme === "admin"
      ? "/admin"
      : "/dashboard";
  const [notifications, setNotifications] = useState([]);
  const [ruleChangeRequests, setRuleChangeRequests] = useState([]);
  const [selectedRuleRequest, setSelectedRuleRequest] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load notifications.");
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (notificationsTheme !== "admin") {
      return;
    }

    async function loadRuleRequests() {
      try {
        const response = await dssService.getRuleChangeRequests();
        setRuleChangeRequests(response.data || []);
      } catch {
        setRuleChangeRequests([]);
      }
    }

    loadRuleRequests();
  }, [notificationsTheme]);

  const markAsRead = async (notification) => {
    setError("");

    try {
      if (!notification.read) {
        await notificationService.markAsRead(notification.id);
      }

      const ruleChangeRequestId =
        notification.data?.ruleChangeRequestId ||
        notification.data?.rule_change_request_id;

      if (notificationsTheme === "admin" && ruleChangeRequestId) {
        let nextRuleChangeRequests = ruleChangeRequests;
        let ruleRequest = nextRuleChangeRequests.find(
          (request) => request.id === ruleChangeRequestId,
        );

        if (!ruleRequest) {
          const response = await dssService.getRuleChangeRequests();
          nextRuleChangeRequests = response.data || [];
          setRuleChangeRequests(nextRuleChangeRequests);
          ruleRequest = nextRuleChangeRequests.find(
            (request) => request.id === ruleChangeRequestId,
          );
        }

        if (ruleRequest) {
          setSelectedRuleRequest(ruleRequest);
          await loadNotifications();
          return;
        }

        navigate(`/admin?panel=rule-requests&request=${ruleChangeRequestId}`);
        return;
      }

      const actionUrl =
        notification.data?.action_url ||
        notification.data?.user_action_url ||
        (notificationsTheme === "admin"
          ? notification.data?.admin_action_url
          : notification.data?.partner_action_url);

      if (actionUrl) {
        if (actionUrl.startsWith('/')) {
          navigate(actionUrl);
        } else {
          window.location.assign(actionUrl);
        }
        return;
      }

      if (notification.data?.transactionId && notificationsTheme === "partner") {
        navigate(`/partner?request=${notification.data.transactionId}`);
        return;
      }

      if (notification.data?.transactionId) {
        navigate(`/dss-requests?request=${notification.data.transactionId}`);
        return;
      }

      if (notification.data?.submissionId) {
        navigate(`/dss/${notification.data.submissionId}`);
        return;
      }

      await loadNotifications();
    } catch (readError) {
      setError(readError.message || 'Unable to update notification.');
    }
  };

  const markAllAsRead = async () => {
    setError("");

    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
    } catch (readError) {
      setError(readError.message || "Unable to mark notifications as read.");
    }
  };

  const deleteNotification = async () => {
    if (!deleteTarget) {
      return;
    }

    setError("");

    try {
      await notificationService.deleteNotification(deleteTarget.id);
      setNotifications((current) =>
        current.filter((notification) => notification.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete notification.");
    }
  };

  const toDisplayDate = (value) => {
    if (!value) {
      return null;
    }

    const timestamp = String(value);
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp);

    return new Date(hasTimezone ? timestamp : `${timestamp}Z`);
  };

  const formatTime = (value) => {
    const date = toDisplayDate(value);

    return date
      ? new Intl.DateTimeFormat("en-PH", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Asia/Manila",
        }).format(date)
      : "";
  };

  const ruleRequestRows = selectedRuleRequest
    ? [
        ["Rule area", selectedRuleRequest.rule_area],
        [
          "Partner",
          selectedRuleRequest.partner_name ||
            selectedRuleRequest.requested_by_name ||
            "Partner",
        ],
        [
          "Requested by",
          selectedRuleRequest.requested_by_name ||
            selectedRuleRequest.requested_by_email ||
            "Unknown",
        ],
        ["Status", selectedRuleRequest.status || "pending"],
        ["Requested change", selectedRuleRequest.requested_change],
        ["Reason", selectedRuleRequest.reason || "Not specified"],
        ["Date submitted", formatTime(selectedRuleRequest.created_at)],
      ]
    : [];

  return (
    <div className={`notifications-page notifications-theme-${notificationsTheme} app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] text-[#19221d]`}>
      <nav className="sticky top-0 z-20 border-b border-[#e1e7df] bg-white/85 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Recycle className="h-6 w-6 text-[#336158]" />
            <span className="font-gloock text-xl text-[#19221d]">
              ClothCycle PH
            </span>
          </div>

          <button
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dce4da] bg-white px-4 py-2 text-[#336158] transition-colors hover:bg-[#f3f5f2]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl p-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-[28px] border border-[#dce4da] bg-white/85 p-8 shadow-[0_24px_80px_rgba(25,34,29,0.12)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#336158] text-white">
                <Bell className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-gloock text-4xl text-[#19221d]">
                  Notifications
                </h1>
                <p className="mt-1 text-[#5f6f67]">
                  Recent updates about your submissions and account activity.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={!notifications.some((notification) => !notification.read)}
              className="w-fit rounded-xl bg-[#336158] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2a4c48] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all as read
            </button>
          </div>
        </motion.section>

        <section className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {notifications.length === 0 && !error && (
            <div className="rounded-2xl border border-[#e1e7df] bg-white/90 p-5 text-[#5f6f67]">
              No notifications yet.
            </div>
          )}
          {notifications.map((notification, index) => (
            <motion.article
              key={notification.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => markAsRead(notification)}
              className="flex cursor-pointer gap-4 rounded-2xl border border-[#e1e7df] bg-white/90 p-5 shadow-[0_12px_34px_rgba(25,34,29,0.08)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#336158]/12">
                {notification.type === "submission_approved" ? (
                  <CheckCircle2 className="h-6 w-6 text-[#336158]" />
                ) : notification.type === "partner_update" ? (
                  <PackageCheck className="h-6 w-6 text-[#336158]" />
                ) : (
                  <Bell className="h-6 w-6 text-[#336158]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <h2 className="font-sans text-lg font-bold text-[#19221d]">
                    {notification.title}
                  </h2>
                  <span className="text-sm text-[#5f6f67]">
                    {formatTime(notification.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-[#5f6f67]">
                  {notification.body || notification.message}
                </p>
              </div>

              {!notification.read && (
                <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-[#336158]" />
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteTarget(notification);
                }}
                className="rounded-xl p-2 text-[#5f6f67] transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Delete notification"
                title="Delete notification"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.article>
          ))}
        </section>
      </main>

      {selectedRuleRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-2xl rounded-3xl border border-[#dce4da] bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] notifications-summary-modal"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-gloock text-3xl text-[#19221d]">
                  Partner rule request summary
                </h2>
                <p className="mt-1 text-sm text-[#5f6f67]">
                  Review the partner&apos;s requested DSS preference update.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRuleRequest(null)}
                className="rounded-xl bg-[#f3f5f2] p-2 text-[#5f6f67] hover:bg-[#e7ebe6]"
                aria-label="Close summary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {ruleRequestRows.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] px-4 py-3"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#5f6f67]">
                    {label}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-[#19221d]">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSelectedRuleRequest(null)}
                className="w-full rounded-xl bg-[#336158] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a4c48]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#dce4da] bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] dark:border-white/10 dark:bg-[#161a22]">
            <h2 className="text-xl font-bold text-[#19221d] dark:text-white">
              Delete notification?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5f6f67] dark:text-zinc-300">
              This removes the notification from your list. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-[#dce4da] px-4 py-2 text-sm text-[#5f6f67] hover:bg-[#f3f5f2] dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteNotification}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
