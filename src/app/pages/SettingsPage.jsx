import { Link, useSearchParams } from "react-router-dom";
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
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFileUpload } from "../../hooks/useFileUpload";
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
  const { user, updateProfile, changePassword, getTwoFactorStatus, setupTwoFactor, enableTwoFactor, disableTwoFactor } =
    useAuth();
  const { uploadFile, isLoading: isPhotoUploading } = useFileUpload();
  const [searchParams] = useSearchParams();
  const settingsTheme = ["partner", "admin"].includes(searchParams.get("theme"))
    ? searchParams.get("theme")
    : "default";
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
  const messageRef = useRef(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    enabled: false,
    setup_started: false,
  });
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState([]);
  const [twoFactorPanel, setTwoFactorPanel] = useState("idle");
  const [isTwoFactorBusy, setIsTwoFactorBusy] = useState(false);

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
      const setup = await setupTwoFactor(twoFactorPassword);
      setTwoFactorSetup(setup);
      setTwoFactorPanel("setup");
      setTwoFactorCode("");
      showSaveMessage("success", "Two-factor setup started.");
    } catch (setupError) {
      showSaveMessage("error", setupError.message || "Two-factor setup failed.");
    } finally {
      setIsTwoFactorBusy(false);
    }
  };

  const handleConfirmTwoFactor = async () => {
    if (!twoFactorPassword || !twoFactorCode) {
      showSaveMessage("error", "Enter your password and authenticator code.");
      return;
    }

    setIsTwoFactorBusy(true);

    try {
      const response = await enableTwoFactor(twoFactorPassword, twoFactorCode);
      setTwoFactorRecoveryCodes(response.recovery_codes || []);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      setTwoFactorPassword("");
      setTwoFactorPanel("recovery");
      await refreshTwoFactorStatus();
      showSaveMessage("success", "Two-factor authentication was turned on.");
    } catch (enableError) {
      showSaveMessage(
        "error",
        enableError.message || "Could not enable two-factor authentication."
      );
    } finally {
      setIsTwoFactorBusy(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!twoFactorPassword) {
      showSaveMessage("error", "Enter your current password first.");
      return;
    }

    setIsTwoFactorBusy(true);

    try {
      await disableTwoFactor(twoFactorPassword, twoFactorCode || undefined);
      setTwoFactorRecoveryCodes([]);
      await refreshTwoFactorStatus();
      resetTwoFactorInputs();
      showSaveMessage("success", "Two-factor authentication was turned off.");
    } catch (disableError) {
      showSaveMessage(
        "error",
        disableError.message || "Could not disable two-factor authentication."
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

  const profileNameSize =
    savedProfile.name.length > 28
      ? "text-lg"
      : savedProfile.name.length > 20
        ? "text-xl"
        : "text-2xl";

  const hasFreshRecoveryCodes = twoFactorRecoveryCodes.length > 0;
  const isSetupPanelOpen =
    !twoFactorStatus.enabled &&
    (twoFactorPanel === "setup" || Boolean(twoFactorSetup));
  const isDisablePanelOpen =
    twoFactorStatus.enabled && twoFactorPanel === "disable";
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
                ? "border-[#b9d3bd] bg-[#eef7ef] text-[#2f5f3a]"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${panelClass} rounded-2xl p-6 text-center md:col-start-1 md:row-start-1`}
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

            <label
              htmlFor="profile-photo"
              className="profile-photo-button mt-4 inline-flex cursor-pointer rounded-full border border-[#6b7280] bg-[#9ca3af] px-5 py-2 text-white transition-colors hover:bg-[#6b7280]"
            >
              {isPhotoUploading ? "Uploading..." : "Change Photo"}
            </label>
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
            className={`${panelClass} h-fit rounded-2xl p-3 md:col-start-1 md:row-start-2`}
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

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${panelClass} rounded-2xl p-6 md:col-start-2 md:row-span-2 md:row-start-1 md:flex md:min-h-full md:p-7`}
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

                  {(profile.email !== savedProfile.email ||
                    profile.phone !== savedProfile.phone) && (
                    <div>
                      <label className="mb-2 block text-sm text-[#19221d]">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className={iconClass} />
                        <input
                          type="password"
                          value={profilePassword}
                          onChange={(event) =>
                            setProfilePassword(event.target.value)
                          }
                          className={inputClass}
                          placeholder="Required for email or phone changes"
                        />
                      </div>
                    </div>
                  )}

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
                          Protect sign-ins with an authenticator code.
                        </div>
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                          twoFactorStatus.enabled
                            ? "bg-[#e8f2ec] text-[#2f5f3a]"
                            : "bg-[#d7ddd5] text-[#5f6f67]"
                        }`}
                      >
                        {twoFactorStatus.enabled ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                        {twoFactorStatus.enabled ? "2FA Active" : "2FA Off"}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {!twoFactorStatus.enabled ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTwoFactorPanel("setup");
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#336158] px-5 py-3 text-white transition-all hover:bg-[#2a4c48] hover:shadow-lg"
                        >
                          <Shield className="h-5 w-5" />
                          Set Up 2FA
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setTwoFactorPanel((current) =>
                                current === "disable" ? "idle" : "disable"
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white transition-all hover:bg-red-700 hover:shadow-lg"
                          >
                            <Shield className="h-5 w-5" />
                            Turn Off 2FA
                          </button>
                        </>
                      )}
                    </div>

                    {!twoFactorStatus.enabled && !isSetupPanelOpen ? (
                      <div className="rounded-xl border border-dashed border-[#dce4da] bg-white/70 px-4 py-3 text-sm text-[#5f6f67]">
                        We will only show the recovery codes once, right after setup.
                      </div>
                    ) : null}

                    {twoFactorStatus.enabled &&
                    !isDisablePanelOpen &&
                    !isRecoveryPanelOpen ? (
                      <div className="rounded-xl border border-dashed border-[#dce4da] bg-white/70 px-4 py-3 text-sm text-[#5f6f67]">
                        Authenticator protection is active for future sign-ins.
                      </div>
                    ) : null}

                    {isSetupPanelOpen ? (
                      <div className="space-y-4 rounded-xl border border-[#dce4da] bg-white/85 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-base text-[#19221d]">
                              Authenticator App Setup
                            </div>
                            <div className="text-sm text-[#5f6f67]">
                              Enter your password, scan the QR, then confirm with
                              the 6-digit code from your app.
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
                          <div>
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
                              {isTwoFactorBusy ? "Please wait..." : "Start Setup"}
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
                                    Authenticator Code
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

                    {isDisablePanelOpen ? (
                      <div className="space-y-4 rounded-xl border border-[#f0d0d0] bg-red-50/70 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-base text-red-700">
                              Turn Off Two-Factor Authentication
                            </div>
                            <div className="text-sm text-red-600">
                              Confirm with your password and a current
                              authenticator or recovery code.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={resetTwoFactorInputs}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-100"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
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

                          <div>
                            <label className="mb-2 block text-sm text-[#19221d]">
                              Authenticator or Recovery Code
                            </label>
                            <div className="relative">
                              <Shield className={iconClass} />
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={32}
                                value={twoFactorCode}
                                onChange={(event) =>
                                  setTwoFactorCode(event.target.value)
                                }
                                className={inputClass}
                                placeholder="Enter code"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleDisableTwoFactor}
                          disabled={isTwoFactorBusy}
                          className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-white transition-all hover:bg-red-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Shield className="h-5 w-5" />
                          {isTwoFactorBusy ? "Please wait..." : "Confirm Turn Off"}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {[
                    ["Current Password", "currentPassword"],
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
                          onChange={(event) =>
                            setSecurity({
                              ...security,
                              [field]: event.target.value,
                            })
                          }
                          className={inputClass}
                      />
                    </div>
                    {field === "newPassword" && (
                      <PasswordChecklist
                        password={security.newPassword}
                        confirmPassword={security.confirmPassword}
                      />
                    )}
                  </div>
                ))}

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
                      className="flex items-center justify-between gap-4 rounded-xl border border-[#e7ebe6] bg-[#f8faf6] p-4"
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
                    onClick={() =>
                      showSaveMessage("success", "Changes were successfully saved.")
                    }
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
                        Active since January 2026
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
                    <h7 className="mb-2 text-lg text-red-700">Danger Zone</h7>
                    <p className="mb-4 text-sm text-red-600">
                      Once you delete your account, there is no going back. Please
                      be certain.
                    </p>
                    <button className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-white transition-all hover:bg-red-700">
                      <Trash2 className="h-5 w-5" />
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
