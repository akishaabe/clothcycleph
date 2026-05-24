import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bell, CheckCircle, Clock, Recycle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { dssService } from "../../services/api";
import { BrandLoadingScreen } from "../components/BrandLoadingScreen";

const statusClass = {
  pending: "bg-[#fff8e8] text-[#7a5427] border-[#ead6ae]",
  accepted: "bg-[#edf7ed] text-[#336158] border-[#cfe2cf]",
  completed: "bg-[#eef5ff] text-[#3f5f8f] border-[#cfe0f4]",
  rejected: "bg-red-50 text-red-700 border-red-100",
};

const normalizeStatus = (status) => {
  if (status === "declined" || status === "rejected") return "rejected";
  if (status === "in_progress") return "accepted";
  if (status === "completed") return "completed";
  if (status === "accepted") return "accepted";
  return "pending";
};

const formatStatusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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

const getRequestActivityTime = (request) =>
  new Date(request.updated_at || request.created_at || 0).getTime();

export function DssRequestsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedRequestId = searchParams.get("request");
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [remindingId, setRemindingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = async () => {
    setError("");
    try {
      const response = await dssService.getUserRequests();
      setRequests(response.data);
    } catch (loadError) {
      setError(loadError.message || "Unable to load partner requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!highlightedRequestId || requests.length === 0) {
      return;
    }

    window.setTimeout(() => {
      document
        .querySelector(`[data-request-id="${highlightedRequestId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }, [highlightedRequestId, requests.length]);

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const status = normalizeStatus(request.status);
      const statusMatch = filter === "all" || status === filter;
      const queryMatch =
        !query ||
        [
          request.partner_name,
          request.submission_name,
          request.item_type,
          request.type,
          status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return statusMatch && queryMatch;
    }).sort((first, second) => getRequestActivityTime(second) - getRequestActivityTime(first));
  }, [requests, filter, search]);

  const handleReminder = async (requestId) => {
    setRemindingId(requestId);
    setMessage("");
    setError("");

    try {
      const response = await dssService.remindRequest(requestId);
      setMessage(response.message);
      await loadRequests();
    } catch (reminderError) {
      setError(reminderError.message || "Unable to send reminder.");
    } finally {
      setRemindingId("");
    }
  };

  if (isLoading) {
    return (
      <BrandLoadingScreen
        title="Loading sent partner requests"
        message="We are gathering partner replies and pending briefs."
        detail="Accepted, rejected, completed, and pending requests will appear here."
      />
    );
  }

  return (
    <div className="app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] text-[#19221d]">
      <nav className="sticky top-0 z-20 border-b border-[#e1e7df] bg-white/85 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm text-[#5f6f67] hover:text-[#19221d]"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="flex items-center gap-2" aria-label="ClothCycle PH">
            <Recycle className="h-6 w-6 text-[#336158]" />
            <span className="font-gloock text-xl text-[#19221d]">ClothCycle PH</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="mb-6 rounded-[28px] border border-[#dce4da] bg-white/85 p-8 shadow-[0_24px_80px_rgba(25,34,29,0.1)]">
          <h1 className="font-gloock text-4xl text-[#19221d]">Sent Partner Requests</h1>
          <p className="mt-2 max-w-2xl text-[#5f6f67]">
            View every brief you sent to partners, follow decisions, and remind partners when a request is still pending.
          </p>
        </section>

        <section className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)]">
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6f67]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-[#dce4da] bg-[#fbfcfa] py-3 pl-10 pr-4 text-sm text-[#19221d] outline-none focus:border-[#336158]"
                placeholder="Search partner, submission, pathway, or status"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "accepted", "completed", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`rounded-xl px-4 py-2 text-sm capitalize ${
                    filter === status
                      ? "bg-[#336158] text-white"
                      : "bg-[#f3f5f2] text-[#5f6f67] hover:bg-[#e7ebe6]"
                  }`}
                >
                  {formatStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          {(message || error) && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                message
                  ? "border-[#cfe2cf] bg-[#edf7ed] text-[#336158]"
                  : "border-red-100 bg-red-50 text-red-700"
              }`}
            >
              {message || error}
            </div>
          )}

          <div className="grid gap-3">
            {visibleRequests.length === 0 && (
              <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-5 text-sm text-[#5f6f67]">
                No sent requests match this view.
              </div>
            )}

            {visibleRequests.map((request) => (
              <article
                key={request.id}
                data-request-id={request.id}
                className={`rounded-2xl border bg-[#fbfcfa] p-5 ${
                  highlightedRequestId === request.id
                    ? "border-[#336158] ring-2 ring-[#336158]/20"
                    : "border-[#e1e7df]"
                }`}
              >
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#19221d]">
                      {request.submission_name || request.item_type}
                    </div>
                    <div className="mt-1 text-sm text-[#5f6f67]">
                      {pathwayLabels[request.type] || request.type} request sent to {request.partner_name || "partner"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#5f6f67]">
                      <span className="rounded-full bg-white px-3 py-1">
                        {bagGuidance[request.type] || "Bag color pending"}
                      </span>
                      {request.weight_value && (
                        <span className="rounded-full bg-white px-3 py-1">
                          {request.weight_value} {request.weight_unit || "kg"}
                        </span>
                      )}
                      {request.estimated_carbon_kg != null && (
                        <span className="rounded-full bg-[#edf7ed] px-3 py-1 text-[#336158]">
                          {Number(request.estimated_carbon_kg).toFixed(1)} kg CO2e estimate
                        </span>
                      )}
                    </div>
                    {request.notes && (
                      <p className="mt-3 max-w-2xl rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#5f6f67]">
                        {request.notes}
                      </p>
                    )}
                    {request.outcome_title && (
                      <div className="mt-3 max-w-2xl rounded-xl border border-[#cfe2cf] bg-[#edf7ed] px-4 py-3 text-sm leading-6 text-[#336158]">
                        <span className="font-semibold">{request.outcome_title}:</span>{" "}
                        {request.outcome_description || "The partner reported what happened to your textile."}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:w-36 md:justify-end">
                    <span className={`inline-flex min-h-8 items-center justify-center rounded-full border px-3 py-1 text-xs ${statusClass[normalizeStatus(request.status)] || statusClass.pending}`}>
                      {formatStatusLabel(normalizeStatus(request.status))}
                    </span>
                    {normalizeStatus(request.status) === "accepted" && <CheckCircle className="h-4 w-4 text-[#336158]" />}
                    {normalizeStatus(request.status) === "pending" && <Clock className="h-4 w-4 text-[#7a5427]" />}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 md:flex md:flex-wrap">
                  <button
                    onClick={() => navigate(`/dss/${request.submission_id}?request=${request.id}`)}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#dce4da] px-3 py-2 text-center text-sm text-[#5f6f67] hover:bg-[#f3f5f2]"
                  >
                    View recommendation
                  </button>
                  {normalizeStatus(request.status) === "pending" && (
                    <button
                      onClick={() => handleReminder(request.id)}
                      disabled={remindingId === request.id}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#336158] px-3 py-2 text-center text-sm text-white hover:bg-[#2a4c48] disabled:opacity-50"
                    >
                      <Bell className="h-4 w-4" />
                      {remindingId === request.id ? "Sending..." : "Remind partner"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
