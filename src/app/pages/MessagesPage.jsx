import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Paperclip,
  Recycle,
  Search,
  Send,
  Shield,
  X,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMessages } from "../../hooks/useMessages";
import { formatManilaDate } from "../../utils/dateTime";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import "./MessagesPage.css";

const themeDetails = {
  default: {
    label: "User Messages",
    backPath: "/dashboard",
    icon: UserRound,
  },
  partner: {
    label: "Partner Messages",
    backPath: "/partner",
    icon: Building2,
  },
  admin: {
    label: "Admin Messages",
    backPath: "/admin",
    icon: Shield,
  },
};

const roleLabel = {
  user: "ClothCycle User",
  partner: "Partner",
  admin: "ClothCycle Team",
};

const previewUser = {
  id: "preview-user",
  name: "Preview User",
  email: "preview@clothcycle.ph",
  role: "user",
};

const getThemeForRole = (role) => {
  if (role === "partner" || role === "admin") {
    return role;
  }

  return "default";
};

const previewContacts = [
  {
    id: "preview-admin",
    name: "Admin Support",
    email: "support@clothcycle.ph",
    role: "admin",
  },
];

const previewConversations = [
  {
    other_user_id: "preview-partner",
    other_user_name: "Green Loom Partners",
    other_user_email: "partner@greenloom.ph",
    other_user_role: "partner",
    other_user_avatar_url: "",
    last_message_content: "We can receive the sorted cotton shirts tomorrow afternoon.",
    last_message_from_user_id: "preview-partner",
    last_message_time: new Date().toISOString(),
    unread_count: 2,
  },
];

const previewInitialMessages = {
  "preview-partner": [
    {
      id: "preview-message-1",
      from_user_id: "preview-partner",
      to_user_id: "preview-user",
      content: "Hi, we reviewed your textile submission. The cotton shirts are accepted for donation.",
      read: true,
      created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    },
    {
      id: "preview-message-2",
      from_user_id: "preview-user",
      to_user_id: "preview-partner",
      content: "Great. Do you need them packed by color or by item type?",
      read: true,
      created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    },
    {
      id: "preview-message-3",
      from_user_id: "preview-partner",
      to_user_id: "preview-user",
      content: "By item type is enough. Please keep damaged pieces in a separate bag.",
      read: false,
      created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    },
  ],
  "preview-admin": [],
};

const formatMessageTime = (value) => {
  return formatManilaDate(value, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const normalizeEmail = (email) => email?.trim().toLowerCase() ?? "";
const MESSAGE_ATTACHMENT_LIMIT = 50 * 1024 * 1024;
const MESSAGE_ATTACHMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
]);

export function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTheme = searchParams.get("theme");
  const isPreview = searchParams.get("preview") === "true";
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const currentUser = isPreview ? previewUser : user;
  const messagesTheme = isPreview
    ? ["partner", "admin"].includes(requestedTheme)
      ? requestedTheme
      : "default"
    : getThemeForRole(currentUser?.role);
  const details = themeDetails[messagesTheme];
  const {
    messages,
    conversations,
    contacts,
    isLoading,
    error,
    fetchContacts,
    fetchConversations,
    fetchMessages,
    sendMessage,
    uploadAttachment,
  } = useMessages();
  const [activeUserId, setActiveUserId] = useState(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [sendError, setSendError] = useState("");
  const [previewThreadMessages, setPreviewThreadMessages] = useState(
    previewInitialMessages
  );
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const canAccessMessages = isAuthenticated || isPreview;
  const isCurrentUserId = (id) => Boolean(currentUser?.id && id === currentUser.id);
  const isCurrentUserEmail = (email) =>
    Boolean(
      currentUser?.email &&
        normalizeEmail(email) === normalizeEmail(currentUser.email)
    );
  const activeConversations = (
    isPreview ? previewConversations : conversations
  ).filter(
    (conversation) =>
      !isCurrentUserId(conversation.other_user_id) &&
      !isCurrentUserEmail(conversation.other_user_email)
  );
  const activeContacts = (isPreview ? previewContacts : contacts).filter(
    (contact) => !isCurrentUserId(contact.id) && !isCurrentUserEmail(contact.email)
  );
  const activeMessages = isPreview
    ? previewThreadMessages[activeUserId] || []
    : messages;

  const conversationUserIds = useMemo(
    () =>
      new Set(
        activeConversations.map((conversation) => conversation.other_user_id)
      ),
    [activeConversations]
  );

  const contactById = useMemo(() => {
    const entries = activeContacts.map((contact) => [contact.id, contact]);
    return new Map(entries);
  }, [activeContacts]);

  const activeConversation = useMemo(
    () =>
      activeConversations.find(
        (conversation) => conversation.other_user_id === activeUserId
      ),
    [activeUserId, activeConversations]
  );

  const activeContact = activeUserId ? contactById.get(activeUserId) : null;
  const activeParticipant = activeConversation
    ? {
        id: activeConversation.other_user_id,
        name: activeConversation.other_user_name,
        email: activeConversation.other_user_email,
        role: activeConversation.other_user_role,
        avatar_url: activeConversation.other_user_avatar_url,
      }
    : activeContact;

  const starterContacts = activeContacts.filter(
    (contact) => !conversationUserIds.has(contact.id)
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleConversations = activeConversations.filter((conversation) =>
    [
      conversation.other_user_name,
      conversation.other_user_email,
      conversation.other_user_role,
      conversation.last_message_content,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch)
  );
  const visibleStarterContacts = starterContacts.filter((contact) =>
    [contact.name, contact.email, contact.role]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch)
  );

  const isMessageFromCurrentUser = (message) =>
    Boolean(currentUser?.id && message.from_user_id === currentUser.id);

  const openConversation = (userId) => {
    setActiveUserId(userId);
    setIsMobileChatOpen(true);
  };

  const closeMobileChat = () => {
    setIsMobileChatOpen(false);
  };

  useEffect(() => {
    if (!isAuthenticated || isPreview) {
      return;
    }

    fetchContacts();
    fetchConversations();
  }, [isAuthenticated, isPreview]);

  useEffect(() => {
    if (activeUserId || activeConversations.length === 0) {
      return;
    }

    setActiveUserId(activeConversations[0].other_user_id);
  }, [activeUserId, activeConversations]);

  useEffect(() => {
    if (!activeUserId || activeUserId !== currentUser?.id) {
      return;
    }

    setActiveUserId(activeConversations[0]?.other_user_id ?? null);
  }, [activeUserId, activeConversations, currentUser?.id]);

  useEffect(() => {
    if (!activeUserId || isPreview) {
      return;
    }

    fetchMessages(activeUserId);
  }, [activeUserId, isPreview]);

  useEffect(() => {
    if (!isAuthenticated || !activeUserId || isPreview) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      fetchConversations();
      fetchMessages(activeUserId);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [activeUserId, isAuthenticated, isPreview]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, activeUserId]);

  const handleSend = async (event) => {
    event.preventDefault();
    const content = draft.trim();

    if (!activeUserId || (!content && selectedAttachments.length === 0)) {
      return;
    }

    setSendError("");
    const recipientId = activeParticipant?.id || activeUserId;

    if (
      !recipientId ||
      isCurrentUserId(recipientId) ||
      isCurrentUserEmail(activeParticipant?.email)
    ) {
      setSendError("Choose a partner, user, or admin before sending.");
      return;
    }

    if (isPreview) {
      const nextMessage = {
        id: `preview-message-${Date.now()}`,
        from_user_id: previewUser.id,
        to_user_id: recipientId,
        content,
        read: true,
        created_at: new Date().toISOString(),
      };

      setPreviewThreadMessages((current) => ({
        ...current,
        [activeUserId]: [...(current[activeUserId] || []), nextMessage],
      }));
      setDraft("");
      setSelectedAttachments([]);
      return;
    }

    try {
      let attachments = [];
      if (selectedAttachments.length > 0) {
        attachments = await Promise.all(
          selectedAttachments.map(async (item) => {
            const uploadedAttachment = await uploadAttachment(item.file);
            return {
              ...uploadedAttachment,
              filename: (item.displayName.trim() || uploadedAttachment.filename).slice(0, 255),
            };
          })
        );
      }

      await sendMessage(
        recipientId,
        content || `Sent ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`,
        attachments
      );
      setDraft("");
      setSelectedAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await fetchConversations();
    } catch (err) {
      setSendError(err.message || "Failed to send message");
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    setSendError("");

    if (files.length === 0) {
      return;
    }

    const nextFiles = [];

    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const isAllowedType =
        MESSAGE_ATTACHMENT_ACCEPT.split(",").includes(file.type) ||
        ALLOWED_ATTACHMENT_EXTENSIONS.has(extension);

      if (!isAllowedType) {
        event.target.value = "";
        setSendError("Only images, PDF, Word, and Excel files can be attached.");
        return;
      }

      if (file.size > MESSAGE_ATTACHMENT_LIMIT) {
        event.target.value = "";
        setSendError("Message attachments must be 50MB or smaller.");
        return;
      }

      nextFiles.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        displayName: file.name,
      });
    }

    setSelectedAttachments((current) => {
      const combined = [...current, ...nextFiles].slice(0, 5);
      if (current.length + nextFiles.length > 5) {
        setSendError("You can attach up to 5 files per message.");
      }
      return combined;
    });
    event.target.value = "";
  };

  const updateAttachmentName = (id, displayName) => {
    setSelectedAttachments((current) =>
      current.map((item) => (item.id === id ? { ...item, displayName } : item))
    );
  };

  const removeAttachment = (id) => {
    setSelectedAttachments((current) => current.filter((item) => item.id !== id));
  };

  const openMessageAction = (message) => {
    const roleActionUrl =
      currentUser?.role === "admin"
        ? message.metadata?.admin_action_url
        : currentUser?.role === "partner"
          ? message.metadata?.partner_action_url
          : currentUser?.role === "user"
            ? message.metadata?.user_action_url
            : null;
    const fallbackUrl =
      currentUser?.role === "partner" && message.related_transaction_id
        ? `/partner?request=${message.related_transaction_id}`
        : currentUser?.role === "user" && message.related_transaction_id
          ? `/dss-requests?request=${message.related_transaction_id}`
          : currentUser?.role === "admin" && message.metadata?.rule_change_request_id
            ? `/admin?panel=rule-requests&request=${message.metadata.rule_change_request_id}`
            : null;
    const url = roleActionUrl || fallbackUrl || message.action_url;

    if (!url) {
      return;
    }

    if (url.startsWith("/")) {
      navigate(url);
      return;
    }

    window.location.assign(url);
  };

  const hasMessageAction = (message) =>
    Boolean(
      message.action_url ||
        message.related_transaction_id ||
        message.metadata?.rule_change_request_id ||
        message.metadata?.admin_action_url ||
        message.metadata?.partner_action_url ||
        message.metadata?.user_action_url
    );

  if (isAuthLoading && !isPreview) {
    return (
      <div className={`messages-page messages-theme-${messagesTheme} app-darkable-page flex min-h-screen items-center justify-center`}>
        <p className="messages-muted text-lg">Loading messages...</p>
      </div>
    );
  }

  if (!canAccessMessages) {
    return (
      <div className={`messages-page messages-theme-${messagesTheme} app-darkable-page flex min-h-screen items-center justify-center p-6`}>
        <div className="messages-shell w-full max-w-md rounded-2xl border p-8 text-center">
          <UserRound className="messages-brand-icon mx-auto mb-4 h-12 w-12" />
          <h1 className="messages-heading font-sans text-2xl font-bold">
            Log in to use messages
          </h1>
          <p className="messages-muted mt-2">
            Messages are connected to your ClothCycle account so users and partners can coordinate safely.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="messages-send mt-6 rounded-xl px-5 py-3 font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`messages-page messages-theme-${messagesTheme} app-darkable-page min-h-screen`}>
      <nav className="sticky top-0 z-20 border-b px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2" aria-label="ClothCycle PH">
            <Recycle className="h-6 w-6 messages-brand-icon" />
            <span className="font-gloock text-xl messages-heading">
              ClothCycle PH
            </span>
          </div>

          <button
            onClick={() => navigate(details.backPath)}
            className="messages-secondary-button inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-[1650px] p-4 sm:p-6 xl:p-8">
        <section className="messages-shell grid min-h-[620px] overflow-hidden rounded-[28px] border shadow-[0_18px_54px_rgba(25,34,29,0.1)] lg:h-[calc(100vh-150px)] lg:grid-cols-[minmax(320px,430px)_minmax(0,1fr)]">
          <aside
            className={`messages-sidebar messages-panel-list flex min-h-0 flex-col border-r ${
              isMobileChatOpen ? "is-hidden-mobile" : ""
            }`}
          >
            <div className="border-b p-4 sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="messages-heading font-sans text-2xl font-bold">
                    {details.label}
                  </h1>
                  <p className="messages-muted mt-1 break-words text-sm">
                    Signed in as {currentUser?.name} ({roleLabel[currentUser?.role]})
                  </p>
                </div>
                <details.icon className="messages-brand-icon h-8 w-8 shrink-0" />
              </div>
              <div className="messages-search flex items-center gap-3 rounded-2xl border px-4 py-3 sm:px-6 sm:py-5">
                <Search className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search conversations"
                  className="min-w-0 w-full bg-transparent text-base outline-none sm:text-lg"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 divide-y overflow-y-auto">
              {visibleConversations.map((conversation) => (
                <button
                  key={conversation.other_user_id}
                  onClick={() => openConversation(conversation.other_user_id)}
                  className={`messages-thread flex w-full gap-3 p-4 text-left transition-colors sm:gap-4 sm:p-5 ${
                    conversation.other_user_id === activeUserId ? "is-active" : ""
                  }`}
                >
                  <MessageAvatar
                    name={conversation.other_user_name}
                    url={conversation.other_user_avatar_url}
                    className="h-12 w-12 rounded-2xl text-lg sm:h-14 sm:w-14"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <h2 className="min-w-0 truncate font-sans text-base font-bold messages-heading sm:text-lg">
                        {conversation.other_user_name}
                      </h2>
                      <span className="shrink-0 text-sm messages-muted">
                        {formatMessageTime(conversation.last_message_time)}
                      </span>
                    </div>
                    <p className="mt-1 text-base messages-muted">
                      {roleLabel[conversation.other_user_role]}
                    </p>
                    <p className="mt-2 line-clamp-2 break-words text-sm messages-preview sm:mt-3 sm:text-base">
                      {conversation.last_message_content}
                    </p>
                  </div>
                  {Number(conversation.unread_count) > 0 && (
                    <span className="messages-unread mt-1 flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-base font-bold">
                      {conversation.unread_count}
                    </span>
                  )}
                </button>
              ))}

              {visibleStarterContacts.length > 0 && (
                <div className="p-4">
                  <p className="messages-muted px-1 pb-3 text-sm font-semibold">
                    Start a conversation
                  </p>
                  <div className="space-y-2">
                    {visibleStarterContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => openConversation(contact.id)}
                        className={`messages-thread flex w-full gap-4 rounded-2xl p-4 text-left transition-colors ${
                          contact.id === activeUserId ? "is-active" : ""
                        }`}
                      >
                        <MessageAvatar
                          name={contact.name}
                          url={contact.avatar_url}
                          className="h-12 w-12 rounded-xl"
                        />
                        <div className="min-w-0">
                          <h2 className="truncate font-sans font-bold messages-heading">
                            {contact.name}
                          </h2>
                          <p className="truncate text-sm messages-muted">
                            {roleLabel[contact.role]} - {contact.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isLoading &&
                visibleConversations.length === 0 &&
                visibleStarterContacts.length === 0 && (
                  <div className="messages-muted p-6 text-center">
                    No matching conversations or contacts.
                  </div>
                )}
            </div>
          </aside>

          <section
            className={`messages-chat messages-panel-chat flex min-h-0 flex-col ${
              isMobileChatOpen ? "is-open-mobile" : ""
            }`}
          >
            {activeParticipant ? (
              <>
                <header className="flex flex-col gap-3 border-b p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
                  <button
                    type="button"
                    onClick={closeMobileChat}
                    className="messages-mobile-back mb-1 inline-flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Conversations
                  </button>
                  <div className="flex min-w-0 items-center gap-4">
                    <MessageAvatar
                      name={activeParticipant.name}
                      url={activeParticipant.avatar_url}
                      className="h-12 w-12 rounded-2xl text-lg sm:h-14 sm:w-14"
                    />
                    <div className="min-w-0">
                      <h2 className="break-words font-sans text-2xl font-bold messages-heading sm:text-3xl">
                        {activeParticipant.name}
                      </h2>
                      <p className="mt-1 break-all text-base messages-muted sm:text-lg">
                        {roleLabel[activeParticipant.role]} - {activeParticipant.email}
                      </p>
                    </div>
                  </div>
                  <span className="messages-pill inline-flex w-fit max-w-full items-center gap-2 rounded-full px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-lg">
                    <Clock3 className="h-5 w-5 shrink-0" />
                    Transaction and inquiry thread
                  </span>
                </header>

                {(error || sendError) && (
                  <div className="border-b p-4">
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      {sendError || error}
                    </div>
                  </div>
                )}

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 md:p-6">
                  {activeMessages.length === 0 && (
                    <div className="messages-muted flex h-full items-center justify-center text-center">
                      No messages yet. Send the first note to coordinate a transaction or inquiry.
                    </div>
                  )}

                  {activeMessages.map((message) => {
                    const isMine = isMessageFromCurrentUser(message);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`messages-bubble max-w-[min(78%,42rem)] break-words rounded-2xl px-4 py-3 ${
                            isMine ? "is-mine" : "is-theirs"
                          }`}
                        >
                          <p className="text-sm leading-6 md:text-base">{message.content}</p>
                          <MessageAttachmentGallery attachments={message.attachments} />
                          {hasMessageAction(message) && (
                            <button
                              type="button"
                              onClick={() => openMessageAction(message)}
                              className="mt-3 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-[#336158] shadow-sm transition-colors hover:bg-white"
                            >
                              View request
                            </button>
                          )}
                          <div className="mt-2 flex items-center justify-end gap-1 text-xs opacity-80">
                            {formatMessageTime(message.created_at)}
                            {isMine && <Check className="h-3.5 w-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="border-t p-4 sm:p-6">
                  <div className="messages-composer rounded-2xl border p-3 sm:p-4">
                    {selectedAttachments.length > 0 && (
                      <div className="mb-3 grid gap-2">
                        {selectedAttachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="messages-attachment grid gap-2 rounded-xl px-3 py-2 text-sm sm:grid-cols-[1fr_auto]"
                          >
                            <div className="min-w-0">
                              <input
                                value={attachment.displayName}
                                onChange={(event) => updateAttachmentName(attachment.id, event.target.value)}
                                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold outline-none"
                                aria-label="Attachment display name"
                              />
                              <span className="mt-1 block truncate text-xs opacity-75">
                                {attachment.file.name} - {formatFileSize(attachment.file.size)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(attachment.id)}
                              className="messages-icon-button h-10 rounded-lg p-2"
                              aria-label="Remove attachment"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={MESSAGE_ATTACHMENT_ACCEPT}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="messages-icon-button rounded-xl p-3 sm:p-4"
                        aria-label="Attach file"
                        title="Attach file"
                      >
                        <Paperclip className="h-6 w-6" />
                      </button>
                      <input
                        type="text"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Write a message..."
                        className="min-w-0 flex-1 bg-transparent px-2 text-base outline-none sm:text-lg"
                      />
                      <button
                        type="submit"
                        disabled={!draft.trim() && selectedAttachments.length === 0}
                        className="messages-send inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-4 sm:text-lg"
                      >
                        <Send className="h-5 w-5" />
                        Send
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <MessageEmptyIcon />
                  <h2 className="messages-heading mt-4 font-sans text-2xl font-bold">
                    No conversation selected
                  </h2>
                  <p className="messages-muted mt-2 max-w-md">
                    Choose an existing thread or a contact from the left to start coordinating.
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

function MessageAttachmentGallery({ attachments }) {
  const items = Array.isArray(attachments)
    ? attachments.filter((attachment) => attachment?.url)
    : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const activeAttachment = items[Math.min(activeIndex, items.length - 1)];
  const activeUrl = resolveMediaUrl(activeAttachment.url);
  const activeIsImage = isImageAttachment(activeAttachment);
  const move = (direction) => {
    setActiveIndex((current) => (current + direction + items.length) % items.length);
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          setActiveIndex(0);
          setIsOpen(true);
        }}
        className="block w-full rounded-xl border border-white/20 bg-white/10 p-2 text-left text-sm transition-colors hover:bg-white/20"
      >
        <div className="grid grid-cols-2 gap-2">
          {items.slice(0, 4).map((attachment, index) => {
            const url = resolveMediaUrl(attachment.url);
            const isImage = isImageAttachment(attachment);

            return (
              <div key={attachment.id || `${attachment.url}-${index}`} className="overflow-hidden rounded-lg bg-black/10">
                {isImage ? (
                  <img
                    src={url}
                    alt={attachment.filename || "Message attachment"}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center gap-2 px-2">
                    <FileText className="h-5 w-5 shrink-0" />
                    <span className="truncate text-xs font-semibold">
                      {attachment.filename || "Document"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="truncate font-semibold">
            {items.length} attachment{items.length === 1 ? "" : "s"}
          </span>
          <span className="text-xs opacity-75">Open gallery</span>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white text-[#19221d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dce4da] p-4">
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {activeAttachment.filename || "Attachment"}
                </div>
                <div className="text-sm text-[#5f6f67]">
                  {activeIndex + 1} of {items.length}
                  {activeAttachment.metadata?.size
                    ? ` - ${formatFileSize(Number(activeAttachment.metadata.size))}`
                    : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeUrl}
                  download={activeAttachment.filename || true}
                  className="rounded-xl bg-[#f3f5f2] p-2 text-[#336158] hover:bg-[#e7ebe6]"
                  aria-label="Download attachment"
                  title="Download attachment"
                >
                  <Download className="h-5 w-5" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl bg-[#f3f5f2] p-2 text-[#5f6f67] hover:bg-[#e7ebe6]"
                  aria-label="Close attachment viewer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative flex min-h-[420px] items-center justify-center bg-black">
              {activeIsImage ? (
                <img
                  src={activeUrl}
                  alt={activeAttachment.filename || "Message attachment"}
                  className="max-h-[72vh] w-full object-contain"
                />
              ) : (
                <div className="m-6 flex min-h-72 w-full max-w-md flex-col items-center justify-center rounded-2xl bg-white p-8 text-center">
                  <FileText className="mb-4 h-12 w-12 text-[#336158]" />
                  <div className="max-w-full truncate text-lg font-semibold">
                    {activeAttachment.filename || "Document attachment"}
                  </div>
                  <a
                    href={activeUrl}
                    download={activeAttachment.filename || true}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#336158] px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download file
                  </a>
                </div>
              )}

              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => move(-1)}
                    className="absolute left-4 top-1/2 rounded-full bg-white/90 p-3 text-[#19221d] shadow-lg"
                    aria-label="Previous attachment"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(1)}
                    className="absolute right-4 top-1/2 rounded-full bg-white/90 p-3 text-[#19221d] shadow-lg"
                    aria-label="Next attachment"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isImageAttachment(attachment) {
  const mimetype = attachment?.metadata?.mimetype || "";
  return mimetype.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(attachment?.filename || "");
}

function formatFileSize(size) {
  if (!Number.isFinite(size)) {
    return "";
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(size / 1024, 1).toFixed(0)} KB`;
}

function MessageEmptyIcon() {
  return (
    <div className="messages-avatar mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
      <Send className="h-7 w-7" />
    </div>
  );
}

function MessageAvatar({ name, url, className = "" }) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageUrl = resolveMediaUrl(url);
  const fallback = name?.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  return (
    <div
      className={`messages-avatar flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      title={name}
    >
      {imageUrl && !hasImageError ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setHasImageError(true)}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
