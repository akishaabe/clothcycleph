import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  ClipboardList,
  Loader2,
  Recycle,
  Send,
  Sparkles,
} from "lucide-react";
import { dssService } from "../../services/api";
import { BrandLoadingScreen } from "../components/BrandLoadingScreen";

const pathwayLabels = {
  recycle: "Recycle",
  donate: "Donate",
  upcycle: "Upcycle",
  buyback: "Buyback",
};

const statusClass = {
  pending: "bg-[#fff8e8] text-[#7a5427] border-[#ead6ae]",
  accepted: "bg-[#edf7ed] text-[#336158] border-[#cfe2cf]",
  declined: "bg-red-50 text-red-700 border-red-100",
  completed: "bg-[#eef5ff] text-[#3f5f8f] border-[#cfe0f4]",
};

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function DssConfirmationPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [partners, setPartners] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedPathway, setSelectedPathway] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [brief, setBrief] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [remindingId, setRemindingId] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDss() {
      setIsLoading(true);
      setError("");

      try {
        const [previewResponse, partnersResponse, requestsResponse] =
          await Promise.all([
            dssService.getSubmissionPreview(submissionId),
            dssService.listPartners(),
            dssService.getUserRequests(),
          ]);

        if (!isMounted) {
          return;
        }

        const nextPreview = previewResponse.data;
        const topRecommendation = nextPreview.recommendations[0];

        setPreview(nextPreview);
        setPartners(partnersResponse.data);
        setRequests(requestsResponse.data);
        setSelectedPathway(topRecommendation?.recommended_pathway || "");
        setBrief(nextPreview.brief || "");
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load DSS confirmation.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDss();

    return () => {
      isMounted = false;
    };
  }, [submissionId]);

  const selectedRecommendation = useMemo(() => {
    return preview?.recommendations.find(
      (recommendation) =>
        recommendation.recommended_pathway === selectedPathway,
    );
  }, [preview, selectedPathway]);

  const matchingPartners = useMemo(() => {
    if (!selectedPathway) {
      return partners;
    }

    return partners.filter((partner) =>
      `${partner.service_types || ""} ${partner.description || ""}`
        .toLowerCase()
        .includes(selectedPathway),
    );
  }, [partners, selectedPathway]);

  const partnerOptions = matchingPartners.length > 0 ? matchingPartners : partners;

  const handlePathwayChange = (pathway) => {
    const recommendation = preview?.recommendations.find(
      (item) => item.recommended_pathway === pathway,
    );

    setSelectedPathway(pathway);
    setBrief((currentBrief) => {
      if (!recommendation || !preview?.submission) {
        return currentBrief;
      }

      return [
        `Recommended pathway: ${pathwayLabels[pathway]} (${Math.round(recommendation.confidence * 100)}% confidence)`,
        `Submission name: ${preview.submission.submission_name || preview.submission.item_type}`,
        `Item: ${preview.submission.item_type}`,
        `Quantity: ${preview.submission.quantity || 1}`,
        `Condition: ${preview.submission.condition}`,
        `Cleanliness: ${preview.submission.cleanliness || "Not specified"}`,
        `Fabric: ${preview.submission.fabric || "Not specified"}`,
        preview.submission.upcycle_request
          ? `Upcycle request: ${preview.submission.upcycle_request}`
          : "",
        `Recommendation note: ${recommendation.explanation}`,
      ].filter(Boolean).join("\n");
    });
  };

  const handleSend = async () => {
    if (!selectedPartnerId || !selectedPathway) {
      setError("Choose a pathway and partner first.");
      return;
    }

    setIsSending(true);
    setError("");
    setSentMessage("");

    try {
      await dssService.sendRecommendation({
        submission_id: submissionId,
        partner_id: selectedPartnerId,
        recommended_pathway: selectedPathway,
        brief,
      });

      const requestsResponse = await dssService.getUserRequests();
      setRequests(requestsResponse.data);
      setSentMessage("Sent to partner. They can now view, accept, or decline it.");
    } catch (sendError) {
      setError(sendError.message || "Unable to send to partner.");
    } finally {
      setIsSending(false);
    }
  };

  const handleReminder = async (requestId) => {
    setRemindingId(requestId);
    setError("");
    setSentMessage("");

    try {
      const response = await dssService.remindRequest(requestId);
      const requestsResponse = await dssService.getUserRequests();
      setRequests(requestsResponse.data);
      setSentMessage(response.message);
    } catch (reminderError) {
      setError(reminderError.message || "Unable to send reminder.");
    } finally {
      setRemindingId("");
    }
  };

  if (isLoading) {
    return (
      <BrandLoadingScreen
        title="Reviewing your textile path"
        message="Hang tight, the DSS engine is preparing your recommendations."
        detail="We are checking fabric clues, item details, and partner-fit options."
      />
    );
  }

  if (error && !preview) {
    return (
      <div className="app-darkable-page flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl text-[#19221d]">DSS preview unavailable</h1>
          <p className="mb-5 text-[#5f6f67]">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-xl bg-[#336158] px-5 py-3 text-white"
          >
            Back to dashboard
          </button>
        </div>
      </div>
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
          <Link to="/" className="flex items-center gap-2">
            <Recycle className="h-6 w-6 text-[#336158]" />
            <span className="font-gloock text-xl text-[#19221d]">
              ClothCycle PH
            </span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 overflow-hidden rounded-[28px] border border-[#dce4da] bg-white/85 p-8 shadow-[0_24px_80px_rgba(25,34,29,0.1)]"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#336158]">
                <Sparkles className="h-4 w-4" />
                DSS confirmation
              </div>
              <h1 className="font-gloock text-4xl text-[#19221d]">
                Review recommendation and send to a partner
              </h1>
              <p className="mt-3 max-w-2xl text-[#5f6f67]">
                The DSS engine reviews your saved submission details, then
                registers a partner request when you send the brief.
              </p>
            </div>
            <div className="rounded-2xl border border-[#dce4da] bg-[#f7faf5] px-5 py-4 text-sm text-[#5f6f67]">
              <div className="font-semibold text-[#19221d]">
                {preview.submission.submission_name || preview.submission.item_type}
              </div>
              <div>{formatDate(preview.submission.created_at)}</div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)]">
              {preview.burn_test_analysis?.performed && (
                <div className="mb-6 rounded-2xl border border-[#dce4da] bg-[#f7faf5] p-5">
                  <h2 className="mb-2 text-xl font-semibold">
                    Burn-test fabric result
                  </h2>
                  <p className="mb-4 text-sm leading-6 text-[#5f6f67]">
                    {preview.burn_test_analysis.summary}
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {preview.burn_test_analysis.top_fibers.map((fiber, index) => (
                      <div
                        key={fiber.fiber}
                        className="rounded-xl border border-[#e1e7df] bg-white p-4"
                      >
                        <div className="text-xs uppercase tracking-wide text-[#5f6f67]">
                          Top {index + 1}
                        </div>
                        <div className="mt-1 font-semibold capitalize text-[#19221d]">
                          {fiber.fiber}
                        </div>
                        <div className="mt-2 text-sm text-[#336158]">
                          {Math.round(fiber.confidence * 100)}% confidence
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <ClipboardList className="h-5 w-5 text-[#336158]" />
                Recommendation options
              </h2>
              <div className="grid gap-3">
                {preview.recommendations.map((recommendation) => (
                  <button
                    key={recommendation.recommended_pathway}
                    onClick={() =>
                      handlePathwayChange(recommendation.recommended_pathway)
                    }
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      selectedPathway === recommendation.recommended_pathway
                        ? "border-[#336158] bg-[#f1f7ef]"
                        : "border-[#e1e7df] bg-white hover:border-[#9bb39c]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-[#19221d]">
                          #{recommendation.rank}{" "}
                          {pathwayLabels[recommendation.recommended_pathway]}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[#5f6f67]">
                          {recommendation.explanation}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-center text-sm text-[#336158]">
                        <div className="font-bold">
                          {Math.round(recommendation.confidence * 100)}%
                        </div>
                        <div>confidence</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)]">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <Building2 className="h-5 w-5 text-[#336158]" />
                Choose partner
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {partnerOptions.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      selectedPartnerId === partner.id
                        ? "border-[#336158] bg-[#f1f7ef]"
                        : "border-[#e1e7df] bg-white hover:border-[#9bb39c]"
                    }`}
                  >
                    <div className="font-semibold text-[#19221d]">
                      {partner.name}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[#5f6f67]">
                      {partner.description || partner.service_types || partner.email}
                    </p>
                    <div className="mt-3 text-xs uppercase tracking-wide text-[#336158]">
                      {partner.service_types || "General textile partner"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)]">
              <h2 className="mb-3 text-xl font-semibold">Partner brief</h2>
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                rows={14}
                className="w-full resize-none rounded-2xl border border-[#dce4da] bg-[#fbfcfa] p-4 text-sm leading-6 text-[#19221d] focus:border-[#336158] focus:outline-none"
              />
              {selectedRecommendation && (
                <div className="mt-3 rounded-xl bg-[#f7faf5] px-4 py-3 text-sm text-[#5f6f67]">
                  Score: {selectedRecommendation.score.toFixed(1)} / 100
                </div>
              )}
              {(error || sentMessage) && (
                <div
                  className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                    sentMessage
                      ? "border-[#cfe2cf] bg-[#edf7ed] text-[#336158]"
                      : "border-red-100 bg-red-50 text-red-700"
                  }`}
                >
                  {sentMessage || error}
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={isSending || !selectedPartnerId || !selectedPathway}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#336158] px-5 py-3 text-white transition-all hover:bg-[#2a4c48] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send to partner
              </button>
            </div>

            <div className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)]">
              <h2 className="mb-4 text-xl font-semibold">Sent requests</h2>
              <div className="space-y-3">
                {requests.length === 0 && (
                  <p className="text-sm text-[#5f6f67]">
                    No partner requests yet for this account.
                  </p>
                )}
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-[#e1e7df] bg-[#fbfcfa] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-[#19221d]">
                        {request.partner_name}
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          statusClass[request.status] || statusClass.pending
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-[#5f6f67]">
                      {pathwayLabels[request.type]} · {request.item_type}
                    </div>
                    {request.status === "accepted" && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-[#336158]">
                        <CheckCircle className="h-4 w-4" />
                        Partner accepted this request.
                      </div>
                    )}
                    {request.status === "pending" && (
                      <button
                        onClick={() => handleReminder(request.id)}
                        disabled={remindingId === request.id}
                        className="mt-3 rounded-xl border border-[#dce4da] px-3 py-2 text-sm text-[#5f6f67] hover:bg-[#f3f5f2] disabled:opacity-50"
                      >
                        {remindingId === request.id
                          ? "Sending reminder..."
                          : "Remind partner"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
