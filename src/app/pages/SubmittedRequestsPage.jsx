import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Image as ImageIcon, Recycle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { dssService, submissionService } from "../../services/api";
import { BrandLoadingScreen } from "../components/BrandLoadingScreen";
import { formatManilaDate } from "../../utils/dateTime";

const statusClass = {
  pending: "bg-[#fff8e8] text-[#7a5427] border-[#ead6ae]",
  accepted: "bg-[#edf7ed] text-[#336158] border-[#cfe2cf]",
  completed: "bg-[#eef5ff] text-[#3f5f8f] border-[#cfe0f4]",
  rejected: "bg-red-50 text-red-700 border-red-100",
};

const pathwayLabels = {
  recycle: "Recycle",
  donate: "Donate",
  upcycle: "Upcycle",
  buyback: "Buyback",
};

const filters = ["all", "pending", "accepted", "completed", "rejected"];

const formatStatusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeStatus = (status) => {
  if (status === "declined" || status === "rejected") return "rejected";
  if (status === "in_progress") return "accepted";
  if (status === "completed") return "completed";
  if (status === "accepted") return "accepted";
  return "pending";
};

const statusFromSubmission = (submission, partnerRequest) => {
  if (partnerRequest?.status) return normalizeStatus(partnerRequest.status);
  if (submission.status === "processed") return "completed";
  if (submission.status === "verified") return "accepted";
  if (submission.status === "rejected") return "rejected";
  return "pending";
};

const formatConfidence = (value) =>
  value == null || Number.isNaN(Number(value))
    ? "N/A"
    : `${Math.round(Number(value) * 100)}%`;

const toPhotoUrl = (photo) => {
  if (!photo) return "";
  return typeof photo === "string" ? photo : photo.url || "";
};

export function SubmittedRequestsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState([]);
  const [partnerRequests, setPartnerRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState(searchParams.get("status") || "all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      setError("");
      try {
        const [submissionsResponse, requestsResponse] = await Promise.all([
          submissionService.getUserSubmissions(),
          dssService.getUserRequests(),
        ]);

        if (isMounted) {
          setSubmissions(submissionsResponse.data || []);
          setPartnerRequests(requestsResponse.data || []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load submitted requests.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRequests();
    return () => {
      isMounted = false;
    };
  }, []);

  const requests = useMemo(() => {
    const bySubmission = partnerRequests.reduce((acc, request) => {
      acc[request.submission_id] = [...(acc[request.submission_id] || []), request];
      return acc;
    }, {});

    return submissions.map((submission) => {
      const relatedRequests = (bySubmission[submission.id] || []).sort(
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
        latestPartnerRequest?.type || submission.service_type || submission.action || "not_sure";
      const status = statusFromSubmission(submission, latestPartnerRequest);

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
        confidence: latestPartnerRequest?.confidence ?? recommendation?.confidence ?? null,
        score: recommendation?.score ?? latestPartnerRequest?.score ?? null,
      };
    });
  }, [partnerRequests, submissions]);

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = requests.filter((request) => {
      const statusMatch = filter === "all" || request.status === filter;
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

    return rows.sort((first, second) => {
      const firstDate = new Date(first.submittedAt || 0).getTime();
      const secondDate = new Date(second.submittedAt || 0).getTime();
      return sort === "oldest" ? firstDate - secondDate : secondDate - firstDate;
    });
  }, [filter, requests, search, sort]);

  const updateFilter = (status) => {
    setFilter(status);
    setSearchParams(status === "all" ? {} : { status });
  };

  if (isLoading) {
    return (
      <BrandLoadingScreen
        title="Loading submitted requests"
        message="We are gathering your saved textile submissions."
        detail="Statuses, partner routing, and DSS details will appear here."
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
          <h1 className="font-gloock text-4xl text-[#19221d]">My Requests</h1>
          <p className="mt-2 max-w-2xl text-[#5f6f67]">
            View your submitted textile requests, DSS outcomes, partner routing, and request status in one place.
          </p>
        </section>

        <section className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)]">
          <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6f67]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-[#dce4da] bg-[#fbfcfa] py-3 pl-10 pr-4 text-sm text-[#19221d] outline-none focus:border-[#336158]"
                placeholder="Search item, pathway, partner, or status"
              />
            </label>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="rounded-xl border border-[#dce4da] bg-[#fbfcfa] px-4 py-3 text-sm text-[#19221d] outline-none focus:border-[#336158]"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <div className="flex flex-wrap gap-2">
              {filters.map((status) => (
                <button
                  key={status}
                  onClick={() => updateFilter(status)}
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

          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-3">
            {visibleRequests.length === 0 && (
              <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-6 text-sm text-[#5f6f67]">
                No submitted requests match this view.
              </div>
            )}

            {visibleRequests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#19221d]">{request.title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5f6f67]">
                      <span>{pathwayLabels[request.selectedPathway] || formatStatusLabel(request.selectedPathway)}</span>
                      <span>Partner: {request.partnerName || "Not sent yet"}</span>
                      <span>{formatManilaDate(request.submittedAt)}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-[#5f6f67] sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl border border-[#e1e7df] bg-white/70 px-3 py-2">
                        Recommended: {pathwayLabels[request.recommendedPathway] || "DSS pending"}
                      </div>
                      <div className="rounded-xl border border-[#e1e7df] bg-white/70 px-3 py-2">
                        Confidence: {formatConfidence(request.confidence)}
                      </div>
                      <div className="rounded-xl border border-[#e1e7df] bg-white/70 px-3 py-2">
                        Score: {request.score == null ? "N/A" : `${Number(request.score).toFixed(1)} / 100`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusClass[request.status] || statusClass.pending}`}>
                      {formatStatusLabel(request.status)}
                    </span>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="rounded-xl border border-[#dce4da] px-3 py-2 text-sm font-semibold text-[#5f6f67] hover:bg-[#f3f5f2]"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/dss/${request.submission.id}${request.latestPartnerRequest ? `?request=${request.latestPartnerRequest.id}` : ""}`)
                      }
                      className="rounded-xl bg-[#336158] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2a4c48]"
                    >
                      Open DSS
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onOpenDss={() =>
            navigate(`/dss/${selectedRequest.submission.id}${selectedRequest.latestPartnerRequest ? `?request=${selectedRequest.latestPartnerRequest.id}` : ""}`)
          }
          onOpenMessages={() => navigate("/messages")}
        />
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-[#7d8a82]">{label}</div>
      <div className="mt-1 text-[#19221d]">{value || "Not specified"}</div>
    </div>
  );
}

function RequestDetailsModal({ request, onClose, onOpenDss, onOpenMessages }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19221d]/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#e1e7df] bg-white p-5 shadow-[0_24px_70px_rgba(25,34,29,0.24)] md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-sans text-2xl font-bold text-[#19221d]">{request.title}</h2>
            <p className="mt-1 text-sm text-[#5f6f67]">Submitted {formatManilaDate(request.submittedAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
              <DetailItem label="Item" value={request.submission.item_type} />
              <DetailItem label="Selected pathway" value={pathwayLabels[request.selectedPathway] || formatStatusLabel(request.selectedPathway)} />
              <DetailItem label="Condition" value={request.submission.condition} />
              <DetailItem label="Cleanliness" value={request.submission.cleanliness} />
              <DetailItem label="Fabric" value={request.submission.fabric} />
              <DetailItem label="Quantity" value={request.submission.quantity || "1"} />
              <DetailItem label="Brand" value={request.submission.details?.brand || "Not specified"} />
              <DetailItem label="Repairability" value={request.submission.details?.repairability || "Not specified"} />
            </div>
            {request.submission.description && (
              <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#5f6f67]">
                {request.submission.description}
              </p>
            )}

            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold text-[#19221d]">Uploaded Images</h4>
              {request.submission.photos?.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {request.submission.photos.slice(0, 6).map((photo, index) => {
                    const url = toPhotoUrl(photo);
                    return (
                      <div key={`${url}-${index}`} className="overflow-hidden rounded-xl border border-[#e1e7df] bg-white">
                        <img src={url} alt={`Submitted textile ${index + 1}`} className="h-28 w-full object-cover" />
                      </div>
                    );
                  })}
                </div>
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
              <h3 className="mb-3 font-semibold text-[#19221d]">DSS Recommendation</h3>
              <div className="grid gap-3 text-sm text-[#5f6f67]">
                <DetailItem label="Recommended pathway" value={pathwayLabels[request.recommendedPathway] || "DSS pending"} />
                <DetailItem label="Confidence" value={formatConfidence(request.confidence)} />
                <DetailItem label="Score" value={request.score == null ? "N/A" : `${Number(request.score).toFixed(1)} / 100`} />
              </div>
              {request.recommendation?.explanation && (
                <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#5f6f67]">
                  {request.recommendation.explanation}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4">
              <h3 className="mb-3 font-semibold text-[#19221d]">Partner Brief</h3>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs ${statusClass[request.status] || statusClass.pending}`}>
                  {formatStatusLabel(request.status)}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-[#5f6f67]">
                  {request.partnerName || "Not sent to a partner yet"}
                </span>
              </div>
              {request.relatedRequests.length > 0 ? (
                <div className="space-y-2">
                  {request.relatedRequests.map((partnerRequest) => (
                    <div key={partnerRequest.id} className="rounded-xl border border-[#e1e7df] bg-white px-4 py-3 text-sm text-[#5f6f67]">
                      <div className="font-semibold text-[#19221d]">
                        {pathwayLabels[partnerRequest.type] || partnerRequest.type} to {partnerRequest.partner_name || "partner"}
                      </div>
                      <div className="mt-1">
                        {formatStatusLabel(normalizeStatus(partnerRequest.status))} · {formatManilaDate(partnerRequest.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[#5f6f67]">
                  This submission is saved, but no partner brief has been sent yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onOpenMessages}
            className="rounded-xl border border-[#dce4da] px-4 py-2 text-sm font-semibold text-[#5f6f67] hover:bg-[#f3f5f2]"
          >
            Messages
          </button>
          <button
            type="button"
            onClick={onOpenDss}
            className="rounded-xl bg-[#336158] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a4c48]"
          >
            Open Full Details
          </button>
        </div>
      </div>
    </div>
  );
}
