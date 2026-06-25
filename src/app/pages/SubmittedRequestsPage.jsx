import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Image as ImageIcon, Recycle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { dssService, submissionService } from "../../services/api";
import { BrandLoadingScreen } from "../components/BrandLoadingScreen";
import { ImageCarousel } from "../components/ImageCarousel";
import { formatManilaDate } from "../../utils/dateTime";

const statusClass = {
  pending: "bg-[#fff8e8] text-[#7a5427] border-[#ead6ae]",
  accepted: "bg-[#edf7ed] text-[#336158] border-[#cfe2cf]",
  completed: "bg-[#eef5ff] text-[#3f5f8f] border-[#cfe0f4]",
  rejected: "bg-red-50 text-red-700 border-red-100",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const pathwayLabels = {
  recycle: "Recycle",
  donate: "Donate",
  upcycle: "Upcycle",
  buyback: "Buyback",
};

const filters = ["all", "pending", "accepted", "completed", "cancelled", "rejected"];

const trackingStatusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_transit", label: "Shipped / In transit" },
  { value: "dropoff_completed", label: "Drop-off completed" },
];

const fulfillmentMethodOptions = [
  { value: "shipping", label: "Ship via logistics/courier" },
  { value: "drop_off", label: "Direct drop-off" },
];

const trackingStatusLabels = trackingStatusOptions.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const fulfillmentMethodLabels = fulfillmentMethodOptions.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const fieldClass =
  "w-full rounded-2xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#19221d] outline-none transition focus:border-[#336158] focus:ring-2 focus:ring-[#336158]/10";

const selectClass = `${fieldClass} appearance-none pr-11`;

const trackingLabelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-[#5f6f67]";

const formatStatusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeStatus = (value) => {
  const status = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["declined", "rejected"].includes(status)) return "rejected";
  if (["approved", "accepted"].includes(status)) return "accepted";
  if (["completed", "processed", "complete"].includes(status)) return "completed";
  if (status === "pending") return "pending";
  return status;
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

const normalizeOutcomePhotos = (photos = []) =>
  photos
    .map((photo, index) => ({
      url: toPhotoUrl(photo),
      label: typeof photo === "object" && photo?.label ? photo.label : `Outcome photo ${index + 1}`,
    }))
    .filter((photo) => photo.url);

const getActivityTime = (value) =>
  new Date(value?.updated_at || value?.created_at || value?.submittedAt || 0).getTime();

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
  const [trackingMessage, setTrackingMessage] = useState("");
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    progress_status: "in_transit",
    fulfillment_method: "shipping",
    contact_name: "",
    logistics_company: "",
    tracking_number: "",
    dropoff_scheduled_at: "",
    dropoff_location: "",
    notes: "",
  });
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
        activityAt: latestPartnerRequest?.updated_at || latestPartnerRequest?.created_at || submission.updated_at || submission.created_at,
        confidence: latestPartnerRequest?.confidence ?? recommendation?.confidence ?? null,
        score: recommendation?.score ?? latestPartnerRequest?.score ?? null,
        outcomeTitle: latestOutcomeRequest?.outcome_title || "",
        outcomeDescription: latestOutcomeRequest?.outcome_description || "",
        outcomePhotos: normalizeOutcomePhotos(latestOutcomeRequest?.outcome_photos || []),
        trackingUpdates: submission.tracking_updates || [],
        latestTrackingUpdate: submission.latest_tracking_update || submission.tracking_updates?.[0] || null,
      };
    });
  }, [partnerRequests, submissions]);

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedStatus = normalizeStatus(filter);

    const searchedRequests = requests.filter((request) => {
      const status = normalizeStatus(request.status);
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

      return queryMatch;
    });

    const rows = searchedRequests.filter((request) => {
      const status = normalizeStatus(request.status);
      return selectedStatus === "all" || status === selectedStatus;
    });

    return rows.sort((first, second) => {
      const firstDate = getActivityTime(first);
      const secondDate = getActivityTime(second);
      return sort === "oldest" ? firstDate - secondDate : secondDate - firstDate;
    });
  }, [filter, requests, search, sort]);

  useEffect(() => {
    const requestId = searchParams.get("request");
    if (!requestId || requests.length === 0) return;

    const matched = requests.find((request) =>
      request.latestPartnerRequest?.id === requestId ||
      request.relatedRequests.some((partnerRequest) => partnerRequest.id === requestId),
    );
    if (matched) {
      setSelectedRequest(matched);
    }
  }, [requests, searchParams]);

  const submitTrackingUpdate = async () => {
    if (!selectedRequest) return;

    setIsSavingTracking(true);
    setTrackingMessage("");

    try {
      if (!trackingForm.contact_name.trim()) {
        setTrackingMessage("Please add a contact name for this delivery update.");
        setIsSavingTracking(false);
        return;
      }
      if (!trackingForm.notes.trim()) {
        setTrackingMessage("Please add delivery notes for the partner.");
        setIsSavingTracking(false);
        return;
      }
      if (
        trackingForm.fulfillment_method === "shipping" &&
        (!trackingForm.logistics_company.trim() || !trackingForm.tracking_number.trim())
      ) {
        setTrackingMessage("Please add both the courier and tracking number.");
        setIsSavingTracking(false);
        return;
      }
      if (
        trackingForm.fulfillment_method === "drop_off" &&
        (!trackingForm.dropoff_scheduled_at ||
          (!trackingForm.dropoff_location.trim() && !selectedRequest.latestPartnerRequest?.partner_address))
      ) {
        setTrackingMessage("Please add the drop-off date/time and location.");
        setIsSavingTracking(false);
        return;
      }

      const response = await submissionService.createTrackingUpdate(selectedRequest.submission.id, {
        request_id: selectedRequest.latestPartnerRequest?.id || null,
        progress_status: trackingForm.progress_status,
        fulfillment_method: trackingForm.fulfillment_method,
        contact_name: trackingForm.contact_name.trim() || null,
        logistics_company:
          trackingForm.fulfillment_method === "shipping" ? trackingForm.logistics_company.trim() || null : null,
        tracking_number:
          trackingForm.fulfillment_method === "shipping" ? trackingForm.tracking_number.trim() || null : null,
        dropoff_scheduled_at:
          trackingForm.fulfillment_method === "drop_off" && trackingForm.dropoff_scheduled_at
            ? new Date(trackingForm.dropoff_scheduled_at).toISOString()
            : null,
        dropoff_location:
          trackingForm.fulfillment_method === "drop_off"
            ? trackingForm.dropoff_location.trim() || selectedRequest.latestPartnerRequest?.partner_address || null
            : null,
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
              trackingUpdates: [update, ...(current.trackingUpdates || [])],
              latestTrackingUpdate: update,
              submission: {
                ...current.submission,
                tracking_updates: [update, ...(current.submission.tracking_updates || [])],
                latest_tracking_update: update,
              },
            }
          : current,
      );
      setTrackingForm((current) => ({
        ...current,
        contact_name: "",
        logistics_company: "",
        tracking_number: "",
        dropoff_scheduled_at: "",
        notes: "",
      }));
      setTrackingMessage("Delivery details saved and sent to the partner.");
    } catch (saveError) {
      setTrackingMessage(saveError.message || "Unable to save delivery details.");
    } finally {
      setIsSavingTracking(false);
    }
  };

  const updateFilter = (status) => {
    setFilter(status);
    setSearchParams(status === "all" ? {} : { status });
  };

  if (isLoading) {
    return (
      <BrandLoadingScreen
        title="Loading submitted requests"
        message="We are gathering your saved textile submissions."
        detail="Statuses, partner routing, and recommendation details will appear here."
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
            View your submitted textile requests, recommendation outcomes, partner routing, and request status in one place.
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

            {visibleRequests.map((request) => {
              const requestStatus = normalizeStatus(request.status);

              return (
              <article key={request.id} className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-5 md:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="text-base font-semibold leading-6 text-[#19221d]">{request.title}</div>
                    <span className={`inline-flex min-h-9 w-fit shrink-0 items-center justify-center rounded-full border px-3 py-1 text-xs ${statusClass[requestStatus] || statusClass.pending}`}>
                      {formatStatusLabel(requestStatus)}
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

                  <div>
                    {request.outcomeTitle && (
                      <div className="rounded-2xl border border-[#cfe2cf] bg-[#edf7ed] px-4 py-4 text-sm text-[#336158]">
                        <div className="font-semibold leading-6 text-[#19221d]">
                          Congratulations! Your {request.title} was turned into {request.outcomeTitle}!
                        </div>
                        {request.outcomePhotos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(request)}
                            className="mt-3 inline-flex min-h-8 items-center justify-center rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-[#336158] hover:bg-[#f7faf5]"
                          >
                            View photos
                          </button>
                        )}
                      </div>
                    )}
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
                        navigate(`/dss/${request.submission.id}${request.latestPartnerRequest ? `?request=${request.latestPartnerRequest.id}` : ""}`)
                      }
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#336158] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[#2a4c48]"
                    >
                      Open recommendation
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        </section>
      </main>

      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          trackingForm={trackingForm}
          setTrackingForm={setTrackingForm}
          trackingMessage={trackingMessage}
          isSavingTracking={isSavingTracking}
          onSubmitTracking={submitTrackingUpdate}
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

function RequestDetailsModal({
  request,
  onClose,
  onOpenDss,
  onOpenMessages,
  trackingForm,
  setTrackingForm,
  trackingMessage,
  isSavingTracking,
  onSubmitTracking,
}) {
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
              <DetailItem label="Quantity" value={request.submission.quantity || "Not specified"} />
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
              <h3 className="mb-3 font-semibold text-[#19221d]">Recommendation</h3>
              <div className="grid gap-3 text-sm text-[#5f6f67]">
                <DetailItem label="Recommended pathway" value={pathwayLabels[request.recommendedPathway] || "Recommendation pending"} />
                <DetailItem label="Confidence" value={formatConfidence(request.confidence)} />
                <DetailItem label="Score" value={request.score == null ? "N/A" : `${Number(request.score).toFixed(1)} / 100`} />
              </div>
              {request.recommendation?.explanation && (
                <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#5f6f67]">
                  {request.recommendation.explanation}
                </p>
              )}
            </div>

            {request.outcomeTitle && (
              <div className="rounded-2xl border border-[#cfe2cf] bg-[#edf7ed] p-4 text-[#336158]">
                <div className="font-semibold text-[#19221d]">
                  Congratulations! Your {request.title} was turned into {request.outcomeTitle}!
                </div>
                <p className="mt-2 text-sm leading-6">
                  {request.outcomeDescription || "The partner shared a happy update for your textile."}
                </p>
                {request.outcomePhotos.length > 0 && (
                  <div className="mt-3">
                    <ImageCarousel title="Outcome photos" allowDownload images={request.outcomePhotos} />
                  </div>
                )}
              </div>
            )}

            {normalizeStatus(request.status) === "accepted" && (
              <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-[#19221d]">Tracking / Delivery Details</h3>
                  <p className="mt-1 text-sm leading-6 text-[#5f6f67]">
                    Share courier or direct drop-off details after the partner accepts your request.
                  </p>
                </div>

                <div className="grid gap-4">
                  <label className="block">
                    <span className={trackingLabelClass}>Fulfillment method</span>
                    <span className="relative block">
                      <select
                        value={trackingForm.fulfillment_method}
                        onChange={(event) =>
                          setTrackingForm((current) => ({
                            ...current,
                            fulfillment_method: event.target.value,
                            progress_status: event.target.value === "shipping" ? "in_transit" : "scheduled",
                          }))
                        }
                        className={selectClass}
                      >
                        {fulfillmentMethodOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6f67]" />
                    </span>
                  </label>

                  <label className="block">
                    <span className={trackingLabelClass}>Delivery status</span>
                    <span className="relative block">
                      <select
                        value={trackingForm.progress_status}
                        onChange={(event) =>
                          setTrackingForm((current) => ({ ...current, progress_status: event.target.value }))
                        }
                        className={selectClass}
                      >
                        {trackingStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6f67]" />
                    </span>
                  </label>

                  <label className="block">
                    <span className={trackingLabelClass}>Contact name</span>
                    <input
                      required
                      value={trackingForm.contact_name}
                      onChange={(event) =>
                        setTrackingForm((current) => ({ ...current, contact_name: event.target.value }))
                      }
                      className={fieldClass}
                      placeholder="Name to show with this update"
                    />
                  </label>

                  {trackingForm.fulfillment_method === "shipping" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className={trackingLabelClass}>Courier</span>
                        <input
                          required
                          value={trackingForm.logistics_company}
                          onChange={(event) =>
                            setTrackingForm((current) => ({ ...current, logistics_company: event.target.value }))
                          }
                          className={fieldClass}
                          placeholder="Example: LBC, J&T, JRS"
                        />
                      </label>
                      <label className="block">
                        <span className={trackingLabelClass}>Tracking number</span>
                        <input
                          required
                          value={trackingForm.tracking_number}
                          onChange={(event) =>
                            setTrackingForm((current) => ({ ...current, tracking_number: event.target.value }))
                          }
                          className={fieldClass}
                          placeholder="Example: 123456789"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className={trackingLabelClass}>Drop-off date/time</span>
                        <input
                          required
                          type="datetime-local"
                          value={trackingForm.dropoff_scheduled_at}
                          onChange={(event) =>
                            setTrackingForm((current) => ({ ...current, dropoff_scheduled_at: event.target.value }))
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label className="block">
                        <span className={trackingLabelClass}>Drop-off location</span>
                        <input
                          required
                          value={trackingForm.dropoff_location}
                          onChange={(event) =>
                            setTrackingForm((current) => ({ ...current, dropoff_location: event.target.value }))
                          }
                          className={fieldClass}
                          placeholder={request.latestPartnerRequest?.partner_address || "Drop-off location"}
                        />
                      </label>
                    </div>
                  )}

                  <label className="block">
                    <span className={trackingLabelClass}>Notes</span>
                    <textarea
                      required
                      value={trackingForm.notes}
                      onChange={(event) => setTrackingForm((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                      className={`${fieldClass} resize-none leading-6`}
                      placeholder="Add handoff reminders or delivery context"
                    />
                  </label>

                  {trackingMessage && (
                    <div className="rounded-xl border border-[#dce4da] bg-white px-4 py-3 text-sm text-[#5f6f67]">
                      {trackingMessage}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onSubmitTracking}
                    disabled={isSavingTracking}
                    className="rounded-xl bg-[#336158] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a4c48] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingTracking ? "Saving update..." : "Update delivery details"}
                  </button>
                </div>

                <div className="mt-6 border-t border-[#e1e7df] pt-5">
                  <h4 className="mb-3 text-sm font-semibold text-[#19221d]">Tracking history</h4>
                  {request.trackingUpdates?.length > 0 ? (
                    <div className="space-y-3">
                      {request.trackingUpdates.map((update) => (
                        <div key={update.id} className="rounded-2xl border border-[#e1e7df] bg-white p-4 text-sm text-[#5f6f67]">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="text-base font-semibold text-[#19221d]">
                              {trackingStatusLabels[update.progress_status] || formatStatusLabel(update.progress_status)}
                            </div>
                            <div className="text-xs text-[#7c8c84]">{formatManilaDate(update.created_at)}</div>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div><span className="font-semibold text-[#19221d]">Method:</span> {fulfillmentMethodLabels[update.fulfillment_method] || formatStatusLabel(update.fulfillment_method)}</div>
                            {update.contact_name && <div><span className="font-semibold text-[#19221d]">Contact name:</span> {update.contact_name}</div>}
                            {update.logistics_company && <div><span className="font-semibold text-[#19221d]">Courier:</span> {update.logistics_company}</div>}
                            {update.tracking_number && <div><span className="font-semibold text-[#19221d]">Tracking Number:</span> {update.tracking_number}</div>}
                            {update.dropoff_scheduled_at && <div><span className="font-semibold text-[#19221d]">Drop-off:</span> {formatManilaDate(update.dropoff_scheduled_at)}</div>}
                            {update.dropoff_location && <div><span className="font-semibold text-[#19221d]">Location:</span> {update.dropoff_location}</div>}
                          </div>
                          {update.notes && <p className="mt-3 rounded-xl bg-[#f7faf6] px-3 py-2 leading-6"><span className="font-semibold text-[#19221d]">Notes:</span> {update.notes}</p>}
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
            )}

            <div className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4">
              <h3 className="mb-3 font-semibold text-[#19221d]">Partner Brief</h3>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs ${statusClass[normalizeStatus(request.status)] || statusClass.pending}`}>
                  {formatStatusLabel(normalizeStatus(request.status))}
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
