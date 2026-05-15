import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  Phone,
  Copy,
  Download,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFileUpload } from "../../hooks/useFileUpload";
import { notificationService } from "../../services/api";
import { isStrongPassword, PasswordChecklist } from "../../utils/passwordPolicy";
import "./SettingsPage.css";

const panelClass =
  "bg-white/90 border border-[#e1e7df] shadow-[0_12px_34px_rgba(25,34,29,0.08)]";

const inputClass =
  "w-full pl-12 pr-4 py-3 border-2 border-[#e7ebe6] rounded-xl focus:border-[#336158] focus:outline-none focus:ring-2 focus:ring-[#336158]/15 transition-colors bg-white text-[#19221d]";

const iconClass =
  "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6f67]";

const actionButtonClass =
  "inline-flex min-w-[190px] items-center justify-center gap-2 px-6 py-3 bg-[#336158] text-white rounded-xl hover:bg-[#2a4c48] transition-all hover:shadow-lg";

export function SettingsPage() {
  const { user, updateProfile, changePassword, getTwoFactorStatus, setupTwoFactor, enableTwoFactor, deleteAccount } =
    useAuth();
  const navigate = useNavigate();
  const { uploadFile, isLoading: isPhotoUploading } = useFileUpload();
  const [searchParams] = useSearchParams();
  const inferredTheme = user?.role === "partner" || user?.role === "admin" ? user.role : "default";
  const settingsTheme = ["partner", "admin"].includes(searchParams.get("theme"))
    ? searchParams.get("theme")
    : inferredTheme;
  const backPath =
    settingsTheme === "partner"
      ? "/partner"
      : settingsTheme === "admin"
        ? "/admin"
        : "/dashboard";

  const [activeTab, setActiveTab] = useState("profile");
  const [savedProfile, setSavedProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    bio: user?.bio || "",
  });
  const [profile, setProfile] = useState(savedProfile);
  const [profilePhoto, setProfilePhoto] = useState(user?.avatar_url || "");
  const [profilePassword, setProfilePassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const messageRef = useRef(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [focusedPasswordField, setFocusedPasswordField] = useState("");
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    enabled: false,
    setup_started: false,
  });
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState("email");
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState([]);
  const [twoFactorPanel, setTwoFactorPanel] = useState("idle");
  const [isTwoFactorBusy, setIsTwoFactorBusy] = useState(false);

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newsletter: true,
  });

  useEffect(() => {
    notificationService
      .getPreferences()
      .then((response) => {
        setNotifications((current) => ({
          ...current,
          emailNotifications: Boolean(response.data.email_notifications),
          pushNotifications: Boolean(response.data.push_notifications),
          newsletter: Boolean(response.data.newsletter),
        }));
      })
      .catch(() => {
        try {
          const saved = window.localStorage.getItem("clothcycle_notification_preferences");
          if (saved) {
            setNotifications((current) => ({ ...current, ...JSON.parse(saved) }));
          }
        } catch {
          // Keep defaults when local storage is unavailable.
        }
      });
  }, []);

  const updateNotificationPreference = (key) => {
    setNotifications((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleNotificationSave = async () => {
    try {
      window.localStorage.setItem("clothcycle_notification_preferences", JSON.stringify(notifications));
      const response = await notificationService.updatePreferences({
        email_notifications: notifications.emailNotifications,
        push_notifications: notifications.pushNotifications,
        newsletter: notifications.newsletter,
      });
      setNotifications((current) => ({
        ...current,
        emailNotifications: Boolean(response.data.email_notifications),
        pushNotifications: Boolean(response.data.push_notifications),
        newsletter: Boolean(response.data.newsletter),
      }));
      showSaveMessage("success", "Notification preferences were saved.");
    } catch (error) {
      showSaveMessage("error", error.message || "Notification preferences were not saved.");
    }
  };

  const tabs = [
    { id: "profile", icon: User, label: "Profile" },
    { id: "security", icon: Lock, label: "Security" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "account", icon: Shield, label: "Account" },
  ];

  useEffect(() => {
    getTwoFactorStatus().then(setTwoFactorStatus).catch(() => undefined);
  }, []);

  useEffect(() => {
    const nextProfile = {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      bio: user?.bio || "",
    };
    setSavedProfile(nextProfile);
    setProfile(nextProfile);
    setProfilePhoto(user?.avatar_url || "");
  }, [user]);

  const showSaveMessage = (type, text) => {
    setSaveMessage({ type, text });
    window.setTimeout(() => {
      messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const handleProfileSave = async () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      showSaveMessage(
        "error",
        "Changes were not saved. Please complete your name and email."
      );
      return;
    }

    const needsPassword =
      profile.email !== savedProfile.email || profile.phone !== savedProfile.phone;

    if (needsPassword && !profilePassword) {
      showSaveMessage("error", "Enter your password to change email or phone number.");
      return;
    }

    try {
      const updated = await updateProfile({
        name: profile.name,
        email: profile.email,
        phone: profile.phone || null,
        address: profile.address || null,
        bio: profile.bio || null,
        avatar_url: profilePhoto || null,
        password: needsPassword ? profilePassword : undefined,
      });
      setSavedProfile({
        name: updated.name || "",
        email: updated.email || "",
        phone: updated.phone || "",
        address: updated.address || "",
        bio: updated.bio || "",
      });
      setProfilePassword("");
      showSaveMessage("success", "Profile changes were saved.");
    } catch (error) {
      showSaveMessage("error", error.message || "Profile update failed.");
    }
  };

  const handleSecuritySave = async () => {
    if (
      !security.currentPassword ||
      !security.newPassword ||
      !security.confirmPassword
    ) {
      showSaveMessage(
        "error",
        "Changes were not saved. Please complete all password fields."
      );
      return;
    }

    if (security.newPassword !== security.confirmPassword) {
      showSaveMessage(
        "error",
        "Changes were not saved. New passwords do not match."
      );
      return;
    }

    if (!isStrongPassword(security.newPassword)) {
      showSaveMessage("error", "New password does not meet the strength requirements.");
      return;
    }

    try {
      await changePassword(
        security.currentPassword,
        security.newPassword,
        security.confirmPassword
      );
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showSaveMessage("success", "Password was changed successfully.");
    } catch (error) {
      showSaveMessage("error", error.message || "Password update failed.");
    }
  };

  const refreshTwoFactorStatus = async () => {
    const status = await getTwoFactorStatus();
    setTwoFactorStatus(status);
  };

  const resetTwoFactorInputs = () => {
    setTwoFactorPassword("");
    setTwoFactorCode("");
    setTwoFactorMethod(twoFactorStatus.method || "email");
    setTwoFactorSetup(null);
    setTwoFactorPanel("idle");
  };

  const handleStartTwoFactorSetup = async () => {
    if (!twoFactorPassword) {
      showSaveMessage("error", "Enter your current password first.");
      return;
    }

    setIsTwoFactorBusy(true);
    setTwoFactorRecoveryCodes([]);

    try {
      const setup = await setupTwoFactor(twoFactorPassword, twoFactorMethod);

      if (setup.method !== "totp" && setup.recovery_codes) {
        setTwoFactorRecoveryCodes(setup.recovery_codes || []);
        setTwoFactorSetup(null);
        setTwoFactorCode("");
        setTwoFactorPassword("");
        setTwoFactorPanel("idle");
        await refreshTwoFactorStatus();
        showSaveMessage("success", "Email verification is now your sign-in method.");
        return;
      }

      setTwoFactorSetup(setup);
      setTwoFactorPanel("setup");
      setTwoFactorCode("");
      showSaveMessage(
        "success",
        "Two-factor setup started.",
      );
    } catch (setupError) {
      showSaveMessage("error", setupError.message || "Two-factor setup failed.");
    } finally {
      setIsTwoFactorBusy(false);
    }
  };

  const handleConfirmTwoFactor = async () => {
    if (!twoFactorPassword || !twoFactorCode) {
      showSaveMessage("error", "Enter your password and verification code.");
      return;
    }

    setIsTwoFactorBusy(true);

    try {
      const response = await enableTwoFactor(
        twoFactorPassword,
        twoFactorCode,
        twoFactorSetup?.method || twoFactorMethod,
      );
      setTwoFactorRecoveryCodes(response.recovery_codes || []);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      setTwoFactorPassword("");
      setTwoFactorPanel("recovery");
      await refreshTwoFactorStatus();
      showSaveMessage("success", "Two-factor method was updated.");
    } catch (enableError) {
      showSaveMessage(
        "error",
        enableError.message || "Could not update two-factor method."
      );
    } finally {
      setIsTwoFactorBusy(false);
    }
  };

  const handleCopyRecoveryCodes = async () => {
    if (!twoFactorRecoveryCodes.length) {
      return;
    }

    try {
      await navigator.clipboard.writeText(twoFactorRecoveryCodes.join("\n"));
      showSaveMessage("success", "Recovery codes copied.");
    } catch {
      showSaveMessage("error", "Could not copy recovery codes.");
    }
  };

  const handleDownloadRecoveryCodes = () => {
    if (!twoFactorRecoveryCodes.length) {
      return;
    }

    const fileContents = [
      "ClothCycle PH Recovery Codes",
      "",
      "Store these codes somewhere safe.",
      "Each code can only be used once.",
      "",
      ...twoFactorRecoveryCodes,
      "",
    ].join("\n");

    const blob = new Blob([fileContents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clothcycleph-recovery-codes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSaveMessage("success", "Recovery codes downloaded.");
  };

  const resizeProfilePhoto = (file) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 500;
        const context = canvas.getContext("2d");
        const side = Math.min(image.width, image.height);
        const sx = (image.width - side) / 2;
        const sy = (image.height - side) / 2;
        context.drawImage(image, sx, sy, side, side, 0, 0, 500, 500);
        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(new File([blob], "profile-photo.webp", { type: "image/webp" }))
              : reject(new Error("Could not resize photo")),
          "image/webp",
          0.9,
        );
      };
      image.onerror = () => reject(new Error("Could not read photo"));
      image.src = URL.createObjectURL(file);
    });

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const resizedFile = await resizeProfilePhoto(file);
      const url = await uploadFile(resizedFile);
      if (url) {
        setProfilePhoto(url);
        await updateProfile({ avatar_url: url });
        showSaveMessage("success", "Profile photo updated at 500x500px.");
      }
    } catch (error) {
      showSaveMessage("error", error.message || "Photo upload failed.");
    }
  };

  const handleRemovePhoto = async () => {
    if (!profilePhoto) {
      return;
    }

    const previousPhoto = profilePhoto;
    setProfilePhoto("");

    try {
      await updateProfile({ avatar_url: null });
      showSaveMessage("success", "Profile photo removed.");
    } catch (error) {
      setProfilePhoto(previousPhoto);
      showSaveMessage("error", error.message || "Could not remove profile photo.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showSaveMessage("error", "Enter your password to delete your account.");
      return;
    }

    try {
      await deleteAccount(deletePassword);
      navigate("/login", { replace: true });
    } catch (error) {
      showSaveMessage("error", error.message || "Account deletion failed.");
    }
  };

  const activeSince = user?.created_at
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(user.created_at))
    : "Not available";

  const profileNameSize =
    savedProfile.name.length > 28
      ? "text-lg"
      : savedProfile.name.length > 20
        ? "text-xl"
        : "text-2xl";

  const hasFreshRecoveryCodes = twoFactorRecoveryCodes.length > 0;
  const isSetupPanelOpen =
    twoFactorPanel === "setup" || Boolean(twoFactorSetup);
  const isRecoveryPanelOpen =
    hasFreshRecoveryCodes && twoFactorPanel === "recovery";

  return (
    <div
      className={`settings-page settings-theme-${settingsTheme} app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] text-[#19221d]`}
    >
      <nav className="sticky top-0 z-20 border-b border-[#e1e7df] bg-white/85 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Recycle className="h-6 w-6 text-[#336158]" />
              <span className="font-gloock text-xl text-[#19221d]">
                ClothCycle PH
              </span>
            </div>
          </div>

          <Link
            to={backPath}
            className="rounded-xl border border-[#dce4da] bg-white px-4 py-2 text-[#336158] transition-colors hover:bg-[#f3f5f2]"
          >
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-[28px] border border-[#dce4da] bg-white/80 p-8 shadow-[0_24px_80px_rgba(25,34,29,0.12)]"
        >
          <h1 className="mb-3 font-gloock text-4xl text-[#19221d] md:text-5xl">
            Settings
          </h1>
          <p className="max-w-2xl text-base text-[#5f6f67]">
            Keep your profile, security, notifications, and account controls up
            to date.
          </p>
        </motion.section>

        {saveMessage && (
          <div
            ref={messageRef}
            className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
              saveMessage.type === "success"
                ? "border-[#b9d3bd] bg-[#eef7ef] text-[#2f5f3a] dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200"
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[260px_1fr] md:items-start">
          <div className="space-y-6 md:col-start-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${panelClass} h-fit rounded-2xl p-6 text-center`}
            >
              <div className="mx-auto mb-5 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#e5e7eb]">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-[#4b5563]" />
                )}
              </div>

              <h2
                className={`${profileNameSize} font-bold leading-tight text-[#19221d]`}
              >
                {savedProfile.name}
              </h2>
              <p className="mt-2 break-all text-[#6f7f77]">{savedProfile.email}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <label
                  htmlFor="profile-photo"
                  className="profile-photo-button inline-flex cursor-pointer rounded-full border border-[#6b7280] bg-[#9ca3af] px-5 py-2 text-white transition-colors hover:bg-[#6b7280]"
                >
                  {isPhotoUploading ? "Uploading..." : "Change Photo"}
                </label>
                {profilePhoto ? (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex rounded-full border border-[#d9b7b7] bg-white px-5 py-2 text-[#8a3333] transition-colors hover:bg-[#fff1f1] dark:border-red-400/30 dark:bg-white/5 dark:text-red-200 dark:hover:bg-red-400/10"
                  >
                    Remove Photo
                  </button>
                ) : null}
              </div>
              <input
                id="profile-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${panelClass} h-fit rounded-2xl p-3`}
            >
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                      activeTab === tab.id
                        ? "bg-[#336158] text-white shadow-md"
                        : "text-[#5f6f67] hover:bg-[#f3f5f2] hover:text-[#19221d]"
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.aside>
          </div>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${panelClass} rounded-2xl p-6 md:col-start-2 md:row-start-1 md:flex md:p-7`}
          >
            {activeTab === "profile" && (
              <div className="flex w-full flex-col">
                <h2 className="mb-2 text-2xl text-[#19221d]">Profile Settings</h2>
                <p className="mb-5 text-[#5f6f67]">
                  Update the details connected to your ClothCycle account.
                </p>
                <div className="flex flex-1 flex-col justify-between gap-5">
                  <div>
                    <label className="mb-2 block text-sm text-[#19221d]">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className={iconClass} />
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(event) =>
                          setProfile({ ...profile, name: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-[#19221d]">
                      Address
                    </label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(event) =>
                        setProfile({ ...profile, address: event.target.value })
                      }
                      className="w-full rounded-xl border-2 border-[#e7ebe6] bg-white px-4 py-3 text-[#19221d] transition-colors focus:border-[#336158] focus:outline-none focus:ring-2 focus:ring-[#336158]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-[#19221d]">
                      Bio
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(event) =>
                        setProfile({ ...profile, bio: event.target.value })
                      }
                      rows={3}
                      className="w-full resize-none rounded-xl border-2 border-[#e7ebe6] bg-white px-4 py-3 text-[#19221d] transition-colors focus:border-[#336158] focus:outline-none focus:ring-2 focus:ring-[#336158]/15"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-[#19221d]">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className={iconClass} />
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(event) =>
                          setProfile({ ...profile, email: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-[#19221d]">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className={iconClass} />
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(event) =>
                          setProfile({ ...profile, phone: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {(profile.email !== savedProfile.email ||
                    profile.phone !== savedProfile.phone) && (
                    <div className="rounded-2xl border-2 border-[#d6c8a5] bg-[#fffaf0] p-4 shadow-sm dark:border-amber-300/25 dark:bg-amber-300/10">
                      <div className="mb-3">
                        <label className="block text-sm font-semibold text-[#19221d] dark:text-amber-100">
                          Current password required
                        </label>
                        <p className="mt-1 text-sm text-[#6f6242] dark:text-amber-100/80">
                          Enter your current password before saving email or phone number changes.
                        </p>
                      </div>
                      <div className="relative">
                        <Lock className={iconClass} />
                        <input
                          type="password"
                          value={profilePassword}
                          onChange={(event) =>
                            setProfilePassword(event.target.value)
                          }
                          className={inputClass}
                          placeholder="Current password"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleProfileSave}
                    className={`${actionButtonClass} mt-6`}
                  >
                    <Save className="h-5 w-5" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="flex w-full flex-col">
                <h2 className="mb-2 text-2xl text-[#19221d]">Security Settings</h2>
                <p className="mb-5 text-[#5f6f67]">
                  Change your password to keep your account protected.
                </p>
                <div className="flex flex-1 flex-col justify-between gap-5">
                  <div className="space-y-4 rounded-xl border border-[#e7ebe6] bg-[#f8faf6] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[#19221d]">Two-Factor Authentication</div>
                        <div className="text-sm text-[#5f6f67]">
                          Choose the verification method required after email/password sign-in.
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-[#19221d] dark:text-white">
                      <span className="font-semibold">Current 2FA Method:</span>{" "}
                      <span>{twoFactorStatus.method === "totp" ? "Authenticator App" : "Email"}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorMethod(twoFactorStatus.method || "email");
                          setTwoFactorPanel("setup");
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#336158] px-5 py-3 text-white transition-all hover:bg-[#2a4c48] hover:shadow-lg"
                      >
                        <Shield className="h-5 w-5" />
                        Change 2FA Method
                      </button>
                    </div>

                    {isSetupPanelOpen ? (
                      <div className="space-y-4 rounded-xl border border-[#dce4da] bg-white/85 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-base text-[#19221d]">
                              Two-Factor Setup
                            </div>
                            <div className="text-sm text-[#5f6f67]">
                              Choose the verification method used after email/password sign-in.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={resetTwoFactorInputs}
                            className="rounded-lg border border-[#dce4da] px-3 py-2 text-sm text-[#5f6f67] transition-colors hover:bg-[#f3f5f2]"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                          <div className="space-y-4">
                            <div>
                              <label className="mb-2 block text-sm text-[#19221d]">
                                2FA Method
                              </label>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {[
                                  ["email", "Email"],
                                  ["totp", "Authenticator App"],
                                ].map(([method, label]) => (
                                  <button
                                    key={method}
                                    type="button"
                                    onClick={() => {
                                      setTwoFactorMethod(method);
                                      setTwoFactorSetup(null);
                                      setTwoFactorCode("");
                                    }}
                                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                                      twoFactorMethod === method
                                        ? "border-[#336158] bg-[#edf7ed] text-[#19221d]"
                                        : "border-[#dce4da] bg-white text-[#5f6f67] hover:bg-[#f3f5f2]"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <label className="mb-2 block text-sm text-[#19221d]">
                              Current Password
                            </label>
                            <div className="relative">
                              <Lock className={iconClass} />
                              <input
                                type="password"
                                value={twoFactorPassword}
                                onChange={(event) =>
                                  setTwoFactorPassword(event.target.value)
                                }
                                className={inputClass}
                                placeholder="Enter your password"
                              />
                            </div>
                          </div>
                          {!twoFactorSetup ? (
                            <button
                              type="button"
                              onClick={handleStartTwoFactorSetup}
                              disabled={isTwoFactorBusy}
                              className={`${actionButtonClass} disabled:cursor-not-allowed disabled:opacity-70`}
                            >
                              <Shield className="h-5 w-5" />
                              {isTwoFactorBusy ? "Please wait..." : twoFactorMethod === "totp" ? "Start Setup" : "Save Method"}
                            </button>
                          ) : null}
                        </div>

                        {twoFactorSetup ? (
                          <div className="space-y-4 rounded-xl border border-[#e7ebe6] bg-[#f8faf6] p-4">
                            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                              <div className="flex justify-center">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(twoFactorSetup.otpauth_url)}`}
                                  alt="Authenticator QR code"
                                  className="h-[220px] w-[220px] rounded-xl border border-[#dce4da] bg-white p-3"
                                />
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <div className="text-sm text-[#5f6f67]">
                                    Manual Setup Key
                                  </div>
                                  <div className="mt-1 break-all rounded-xl bg-white px-4 py-3 font-mono text-sm text-[#19221d]">
                                    {twoFactorSetup.secret}
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm text-[#19221d]">
                                    Verification Code
                                  </label>
                                  <div className="relative">
                                    <Shield className={iconClass} />
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      maxLength={6}
                                      value={twoFactorCode}
                                      onChange={(event) =>
                                        setTwoFactorCode(event.target.value)
                                      }
                                      className={inputClass}
                                      placeholder="123456"
                                    />
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleConfirmTwoFactor}
                                  disabled={isTwoFactorBusy}
                                  className={`${actionButtonClass} disabled:cursor-not-allowed disabled:opacity-70`}
                                >
                                  <Shield className="h-5 w-5" />
                                  {isTwoFactorBusy ? "Please wait..." : "Confirm 2FA"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {isRecoveryPanelOpen ? (
                      <div className="space-y-4 rounded-xl border border-[#ead9a7] bg-[#fffaf0] p-4">
                        <div className="flex items-start gap-3 rounded-xl border border-[#f0e2b8] bg-white/70 px-4 py-3 text-sm text-[#7a6230]">
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                          <div>
                            <div className="font-medium text-[#6d5420]">
                              Save these recovery codes now.
                            </div>
                            <div className="mt-1">
                              We only show this set once. Store them in a secure place before closing this section.
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCopyRecoveryCodes}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#d8c692] bg-white px-4 py-2.5 text-sm text-[#6d5420] transition-colors hover:bg-[#fffdf6]"
                          >
                            <Copy className="h-4 w-4" />
                            Copy Codes
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadRecoveryCodes}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#d8c692] bg-white px-4 py-2.5 text-sm text-[#6d5420] transition-colors hover:bg-[#fffdf6]"
                          >
                            <Download className="h-4 w-4" />
                            Download .txt
                          </button>
                          <button
                            type="button"
                            onClick={() => setTwoFactorPanel("idle")}
                            className="inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-sm text-[#7a6230] transition-colors hover:bg-white/60"
                          >
                            Done
                          </button>
                        </div>

                        <div className="grid gap-2 md:grid-cols-2">
                          {twoFactorRecoveryCodes.map((code) => (
                            <div
                              key={code}
                              className="rounded-lg border border-[#ecdcae] bg-white px-3 py-3 font-mono text-sm text-[#19221d]"
                            >
                              {code}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                  </div>

                  {[
                    ["New Password", "newPassword"],
                    ["Confirm New Password", "confirmPassword"],
                  ].map(([label, field]) => (
                    <div key={field}>
                      <label className="mb-2 block text-sm text-[#19221d]">
                        {label}
                      </label>
                      <div className="relative">
                        <Lock className={iconClass} />
                        <input
                          type="password"
                          placeholder="Enter password"
                          value={security[field]}
                          onFocus={() => setFocusedPasswordField(field)}
                          onBlur={() => setFocusedPasswordField("")}
                          onChange={(event) =>
                            setSecurity({
                              ...security,
                              [field]: event.target.value,
                            })
                          }
                          className={inputClass}
                      />
                    </div>
                    {field === "newPassword" && focusedPasswordField === "newPassword" && (
                      <PasswordChecklist
                        password={security.newPassword}
                        confirmPassword={security.confirmPassword}
                      />
                    )}
                  </div>
                ))}

                  <div className="rounded-2xl border-2 border-[#d6c8a5] bg-[#fffaf0] p-4 shadow-sm dark:border-amber-300/25 dark:bg-amber-300/10">
                    <label className="mb-1 block text-sm font-semibold text-[#19221d] dark:text-amber-100">
                      Current password required
                    </label>
                    <p className="mb-3 text-sm text-[#6f6242] dark:text-amber-100/80">
                      Confirm your current password before updating your account password.
                    </p>
                    <div className="relative">
                      <Lock className={iconClass} />
                      <input
                        type="password"
                        placeholder="Current password"
                        value={security.currentPassword}
                        onFocus={() => setFocusedPasswordField("currentPassword")}
                        onBlur={() => setFocusedPasswordField("")}
                        onChange={(event) =>
                          setSecurity({
                            ...security,
                            currentPassword: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSecuritySave}
                    className={actionButtonClass}
                  >
                    <Save className="h-5 w-5" />
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="w-full">
                <h2 className="mb-2 text-2xl text-[#19221d]">
                  Notification Preferences
                </h2>
                <p className="mb-6 text-[#5f6f67]">
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
                      key: "newsletter",
                      label: "Newsletter",
                      description: "Monthly sustainability tips",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 rounded-xl border border-[#e7ebe6] bg-[#f8faf6] p-4"
                    >
                      <div>
                        <div className="text-[#19221d]">{item.label}</div>
                        <div className="text-sm text-[#5f6f67]">
                          {item.description}
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotificationPreference(item.key)}
                        className={`h-6 w-12 rounded-full transition-all ${
                          notifications[item.key] ? "bg-[#336158]" : "bg-[#d7ddd5]"
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                            notifications[item.key] ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleNotificationSave}
                    className={`${actionButtonClass} mt-6`}
                  >
                    <Save className="h-5 w-5" />
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="flex w-full flex-col">
                <h2 className="mb-2 text-2xl text-[#19221d]">
                  Account Management
                </h2>
                <p className="mb-5 text-[#5f6f67]">
                  Review account status and high-impact account actions.
                </p>
                <div className="flex flex-1 flex-col justify-between gap-5">
                  <div className="rounded-xl border border-[#e7ebe6] bg-[#f8faf6] p-5">
                    <h7 className="mb-2 text-lg text-[#19221d]">Account Status</h7>
                    <p className="mb-4 text-[#5f6f67]">
                      Your account is active and in good standing.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-[#336158]" />
                      <span className="text-sm text-[#5f6f67]">
                        Active since {activeSince}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
                    <h7 className="mb-2 text-lg text-red-700">Danger Zone</h7>
                    <p className="mb-4 text-sm text-red-600">
                      Once you delete your account, there is no going back. Please
                      be certain.
                    </p>
                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-white transition-all hover:bg-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                        Delete Account
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <Lock className={iconClass} />
                          <input
                            type="password"
                            value={deletePassword}
                            onChange={(event) => setDeletePassword(event.target.value)}
                            className={inputClass}
                            placeholder="Enter password to confirm"
                          />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleDeleteAccount}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-white transition-all hover:bg-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeletePassword("");
                            }}
                            className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-red-700 transition-colors hover:bg-red-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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
