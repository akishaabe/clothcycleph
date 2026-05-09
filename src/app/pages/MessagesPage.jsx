import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  Clock3,
  Paperclip,
  Recycle,
  Search,
  Send,
  Shield,
  X,
  UserRound,
} from "lucide-react";
import "./MessagesPage.css";

const conversations = [
  {
    id: 1,
    name: "Green Loom Partners",
    role: "Donation Partner",
    channel: "Submission SUB-047",
    preview: "We can receive the sorted cotton shirts tomorrow afternoon.",
    time: "9:42 AM",
    unread: 2,
    status: "Online",
    messages: [
      {
        from: "partner",
        body: "Hi Akisha, we reviewed SUB-047. The cotton shirts are accepted for donation.",
        time: "9:18 AM",
      },
      {
        from: "me",
        body: "Great. Do you need them packed by color or by item type?",
        time: "9:26 AM",
      },
      {
        from: "partner",
        body: "By item type is enough. Please keep damaged pieces in a separate bag.",
        time: "9:42 AM",
      },
    ],
  },
  {
    id: 2,
    name: "Circular Weaves Hub",
    role: "Recycling Partner",
    channel: "Pickup coordination",
    preview: "Please confirm the pickup window and estimated item count.",
    time: "Yesterday",
    unread: 0,
    status: "Away",
    messages: [
      {
        from: "partner",
        body: "We have an available pickup window on Friday between 2 PM and 5 PM.",
        time: "Yesterday",
      },
      {
        from: "me",
        body: "That works. The batch has around 24 textile items.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: 3,
    name: "Admin Support",
    role: "ClothCycle Team",
    channel: "Account support",
    preview: "Your partner conversation history is now synced.",
    time: "May 6",
    unread: 0,
    status: "Online",
    messages: [
      {
        from: "partner",
        body: "Your partner conversation history is now synced across devices.",
        time: "May 6",
      },
    ],
  },
];

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

export function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTheme = searchParams.get("theme");
  const messagesTheme = ["partner", "admin"].includes(requestedTheme)
    ? requestedTheme
    : "default";
  const details = themeDetails[messagesTheme];
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId),
    [activeId]
  );
  const selectedFileSize = selectedFile
    ? `${Math.max(selectedFile.size / 1024, 1).toFixed(0)} KB`
    : "";

  return (
    <div className={`messages-page messages-theme-${messagesTheme} app-darkable-page min-h-screen`}>
      <nav className="sticky top-0 z-20 border-b px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Recycle className="h-6 w-6 messages-brand-icon" />
            <span className="font-gloock text-xl messages-heading">
              ClothCycle PH
            </span>
          </Link>

          <button
            onClick={() => navigate(details.backPath)}
            className="messages-secondary-button inline-flex items-center gap-2 rounded-xl border px-4 py-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-[1650px] p-6 xl:p-8">
        <section className="messages-shell grid min-h-[820px] overflow-hidden rounded-[28px] border shadow-[0_18px_54px_rgba(25,34,29,0.1)] lg:grid-cols-[470px_1fr]">
          <aside className="messages-sidebar border-r">
            <div className="border-b p-6">
              <div className="messages-search flex items-center gap-4 rounded-2xl border px-6 py-5">
                <Search className="h-6 w-6" />
                <input
                  type="text"
                  placeholder="Search conversations"
                  className="w-full bg-transparent text-lg outline-none"
                />
              </div>
            </div>

            <div className="divide-y">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setActiveId(conversation.id)}
                  className={`messages-thread flex w-full gap-4 p-5 text-left transition-colors ${
                    conversation.id === activeId ? "is-active" : ""
                  }`}
                >
                  <div className="messages-avatar flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl">
                    {conversation.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="truncate font-sans text-lg font-bold messages-heading">
                        {conversation.name}
                      </h2>
                      <span className="shrink-0 text-base messages-muted">
                        {conversation.time}
                      </span>
                    </div>
                    <p className="mt-1 text-base messages-muted">
                      {conversation.channel}
                    </p>
                    <p className="mt-3 truncate text-lg messages-preview">
                      {conversation.preview}
                    </p>
                  </div>
                  {conversation.unread > 0 && (
                    <span className="messages-unread mt-1 flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-base font-bold">
                      {conversation.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          <section className="messages-chat flex min-h-[820px] flex-col">
            <header className="flex flex-col gap-3 border-b p-7 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-sans text-3xl font-bold messages-heading">
                  {activeConversation.name}
                </h2>
                <p className="mt-1 text-lg messages-muted">
                  {activeConversation.role} - {activeConversation.status}
                </p>
              </div>
              <span className="messages-pill inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-lg">
                <Clock3 className="h-5 w-5" />
                Usually replies within 1 hour
              </span>
            </header>

            <div className="flex-1 space-y-6 p-7">
              {activeConversation.messages.map((message, index) => (
                <div
                  key={`${message.time}-${index}`}
                  className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`messages-bubble max-w-[82%] rounded-2xl px-6 py-5 ${
                      message.from === "me" ? "is-mine" : "is-theirs"
                    }`}
                  >
                    <p className="text-lg leading-8">{message.body}</p>
                    <div className="mt-3 flex items-center justify-end gap-1 text-base opacity-80">
                      {message.time}
                      {message.from === "me" && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-6">
              <div className="messages-composer rounded-2xl border p-4">
                {selectedFile && (
                  <div className="messages-attachment mb-2 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="block truncate font-semibold">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs opacity-75">{selectedFileSize}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="messages-icon-button rounded-lg p-2"
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="messages-icon-button rounded-xl p-4"
                    aria-label="Attach file"
                    title="Attach file"
                  >
                    <Paperclip className="h-6 w-6" />
                  </button>
                  <input
                    type="text"
                    placeholder="Write a message..."
                    className="min-w-0 flex-1 bg-transparent px-2 text-lg outline-none"
                  />
                  <button className="messages-send inline-flex items-center gap-2 rounded-xl px-6 py-4 text-lg font-semibold">
                    <Send className="h-5 w-5" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
