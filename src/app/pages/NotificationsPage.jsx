import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bell, CheckCircle2, PackageCheck, Recycle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { notificationService } from "../../services/api";
import "./NotificationsPage.css";

export function NotificationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notificationsTheme = ["partner", "admin"].includes(searchParams.get("theme"))
    ? searchParams.get("theme")
    : "default";
  const backPath =
    notificationsTheme === "partner"
      ? "/partner"
      : notificationsTheme === "admin"
      ? "/admin"
      : "/dashboard";
  const [notifications, setNotifications] = useState([]);
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

  const markAsRead = async (notification) => {
    setError("");

    try {
      if (!notification.read) {
        await notificationService.markAsRead(notification.id);
      }

      const actionUrl =
        notification.data?.action_url || notification.data?.user_action_url;

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

  const formatTime = (value) =>
    value
      ? new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(value))
      : "";

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
            </motion.article>
          ))}
        </section>
      </main>
    </div>
  );
}
