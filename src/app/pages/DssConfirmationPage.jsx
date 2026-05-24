import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  AlertTriangle,
  Building2,
  CheckCircle,
  ClipboardList,
  Loader2,
  MapPin,
  Navigation,
  Recycle,
  Send,
  Sparkles,
} from "lucide-react";
import { dssService } from "../../services/api";
import { BrandLoadingScreen } from "../components/BrandLoadingScreen";
import { ImageCarousel } from "../components/ImageCarousel";
import { formatManilaDate } from "../../utils/dateTime";

const pathwayLabels = {
  recycle: "Recycle",
  donate: "Donate",
  upcycle: "Upcycle",
  buyback: "Buyback",
  rejected: "Rejected",
};

const fixedServicePathways = ["recycle", "donate", "upcycle"];

const bagGuidance = {
  recycle: { color: "white", label: "White bag" },
  upcycle: { color: "black", label: "Black bag" },
  donate: { color: "green", label: "Green bag" },
};

const shippingReminderContent = {
  recycle: {
    label: "White bag",
    title: "Recycle pathway",
    instruction:
      "Use a white bag so partner staff can identify this as a recycling request.",
    swatchClass: "border-[#cfd8cf] bg-white dark:border-white/40 dark:bg-white",
  },
  donate: {
    label: "Clean packaging",
    title: "Donate pathway",
    instruction:
      "Pack clean items separately and keep them dry so they are ready for partner sorting.",
    swatchClass: "border-[#a7c8ad] bg-[#edf7ed] dark:border-emerald-300 dark:bg-emerald-200",
  },
  upcycle: {
    label: "Protect materials",
    title: "Upcycle pathway",
    instruction:
      "Protect reusable fabric, trims, buttons, zippers, and accessories from bending or snagging.",
    swatchClass: "border-[#5f6f67] bg-[#19221d] dark:border-zinc-300 dark:bg-zinc-100",
  },
};

const estimateCarbonKg = (distanceKm, weightValue, weightUnit) => {
  const distance = Number(distanceKm || 0);
  const weightKg =
    weightUnit === "g" ? Number(weightValue || 0) / 1000 : Number(weightValue || 0);
  if (!distance || !weightKg) return null;
  return Number((distance * weightKg * 0.12).toFixed(2));
};

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

function formatDate(value) {
  return formatManilaDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizePathway(value) {
  const normalized = String(value || "").toLowerCase().trim();

  if (normalized === "recycling") {
    return "recycle";
  }

  return normalized;
}

function formatStatusLabel(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRecommendationScores(recommendations = []) {
  return recommendations
    .filter((recommendation) => recommendation?.recommended_pathway !== "rejected")
    .sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0))
    .map((recommendation) => {
      const label =
        pathwayLabels[recommendation.recommended_pathway] ||
        recommendation.recommended_pathway;
      const score =
        recommendation.score == null
          ? "N/A"
          : Number(recommendation.score).toFixed(1);
      const confidence = Math.round(Number(recommendation.confidence || 0) * 100);

      return `#${recommendation.rank} ${label}: ${confidence}% confidence, score ${score}/100`;
    })
    .join(" | ");
}

function formatCheckList(checks = [], expectedMatch) {
  const labels = checks
    .filter((check) => Boolean(check?.matched) === expectedMatch && !check?.skipped)
    .map((check) => check.question);

  return labels.length > 0 ? labels.join(", ") : "None";
}

const toTitleCase = (value) =>
  String(value ?? "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatCriteriaLabel = (value) => toTitleCase(value);

function parseSelectedPathwayReasoning(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const matchedIndex = text.search(/\bMatched:/i);
  const notMatchedIndex = text.search(/\bNot matched:/i);
  const skippedIndex = text.search(/\bSkipped as not applicable:/i);
  const firstSectionIndex = [matchedIndex, notMatchedIndex, skippedIndex]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const intro = firstSectionIndex >= 0 ? text.slice(0, firstSectionIndex).trim() : text;
  const matched =
    matchedIndex >= 0
      ? text
          .slice(matchedIndex + "Matched:".length, notMatchedIndex >= 0 ? notMatchedIndex : skippedIndex >= 0 ? skippedIndex : undefined)
          .trim()
      : "";
  const notMatched =
    notMatchedIndex >= 0
      ? text
          .slice(notMatchedIndex + "Not matched:".length, skippedIndex >= 0 ? skippedIndex : undefined)
          .trim()
      : "";
  const skipped =
    skippedIndex >= 0
      ? text.slice(skippedIndex + "Skipped as not applicable:".length).trim()
      : "";
  const criteriaList = (items) =>
    items
      .replace(/\.$/, "")
      .split(",")
      .map((item) => formatCriteriaLabel(item))
      .filter(Boolean);

  return {
    intro: intro ? intro.charAt(0).toUpperCase() + intro.slice(1) : "",
    matched: criteriaList(matched),
    notMatched: criteriaList(notMatched),
    skipped: criteriaList(skipped),
  };
}

function cleanRecommendationExplanation(value = "") {
  return String(value)
    .replace(/\s+Matched:.*$/i, "")
    .replace(/\s+Not matched:.*$/i, "")
    .replace(/\s+Skipped as not applicable:.*$/i, "")
    .trim();
}

function buildRecommendationSummary(recommendation = {}) {
  const pathway = normalizePathway(recommendation.recommended_pathway);
  const matchedChecks = (recommendation.checks || [])
    .filter((check) => check?.matched && !check?.skipped)
    .map((check) => String(check.question || "").toLowerCase());
  const has = (keyword) => matchedChecks.some((check) => check.includes(keyword));

  const signals = [
    has("clean") || has("cleanliness") ? "clean enough for partner handling" : "",
    has("condition") ? "condition fit" : "",
    has("fabric") || has("fiber") || has("material") ? "clear fabric signal" : "",
    has("repurposing") ? "good repurposing potential" : "",
    has("quantity") || has("batch") ? "batch size works well" : "",
  ].filter(Boolean);
  const signalText = signals.length > 0 ? ` Strong signals: ${signals.slice(0, 3).join(", ")}.` : "";

  const summaries = {
    donate:
      "Best fit for extending the textile's life through donation. This route keeps usable pieces moving to people or groups that can still benefit from them.",
    upcycle:
      "Best fit for a creative second life. This route is ideal when the textile can become something new like bags, wallets, accessories, or other partner-made items.",
    recycle:
      "Best fit for material recovery. This route helps move worn or less reusable textiles toward recycling instead of letting them become waste.",
    buyback:
      "Best fit for a value-return pathway. This route may let the textile continue into a partner process while giving the sender a possible return.",
  };

  return `${summaries[pathway] || cleanRecommendationExplanation(recommendation.explanation) || "This route is a practical fit for the submitted textile details."}${signalText}`;
}

function formatListValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ") || "Not specified";
  }

  if (typeof value === "string") {
    return value.trim() || "Not specified";
  }

  return "Not specified";
}

function buildPartnerBrief(submission, pathway, recommendation, recommendations = [], options = {}) {
  if (!submission || !pathway) {
    return "";
  }

  const details = submission.details || {};
  const confidence = recommendation
    ? `${Math.round(Number(recommendation.confidence || 0) * 100)}%`
    : "Not available";
  const score = recommendation?.score != null
    ? `${Number(recommendation.score).toFixed(1)} / 100`
    : "Not available";
  const buybackInterest = Boolean(options.buybackInterest ?? submission.buyback_interest);
  const buybackLine = pathway === "upcycle"
    ? `Buyback preference: ${buybackInterest ? "Yes - user is open to buyback if the partner supports it" : "No - upcycle service only"}`
    : "";

  return [
    `Selected pathway: ${pathwayLabels[pathway] || pathway}`,
    `Recommendation confidence: ${confidence}`,
    recommendation ? `Recommendation rank: #${recommendation.rank}` : "",
    `Recommendation score: ${score}`,
    recommendations.length > 0
      ? `All pathway scores: ${formatRecommendationScores(recommendations)}`
      : "",
    `Submission name: ${submission.submission_name || submission.item_type}`,
    `Item: ${submission.item_type}`,
    submission.quantity ? `Quantity: ${submission.quantity}` : "",
    details.weight_value ? `Weight: ${details.weight_value} ${details.weight_unit || "kg"}` : "",
    bagGuidance[pathway] ? `Shipping bag: ${bagGuidance[pathway].label} for ${pathwayLabels[pathway] || pathway}` : "",
    options.estimatedCarbonKg != null ? `Routing footprint estimate: ${options.estimatedCarbonKg} kg CO2e based on partner distance and textile weight` : "",
    `Condition: ${submission.condition || "Not specified"}`,
    `Cleanliness: ${submission.cleanliness || "Not specified"}`,
    `Fabric: ${submission.fabric || formatListValue(details.fabric_types_list || details.fabric_types)}`,
    buybackLine,
    submission.upcycle_request ? `Upcycle/buyback request: ${submission.upcycle_request}` : "",
    recommendation ? `Selected pathway reasoning: ${recommendation.explanation}` : "",
    recommendation ? `Matched routing checks: ${formatCheckList(recommendation.checks, true)}` : "",
    recommendation ? `Needs review: ${formatCheckList(recommendation.checks, false)}` : "",
  ].filter(Boolean).join("\n");
}

const briefLabelMap = {
  "Selected pathway": "Selected Pathway",
  "Recommendation confidence": "Confidence",
  "Recommendation rank": "Rank",
  "Recommendation score": "Score",
  "All pathway scores": "All Pathway Scores",
  "Submission name": "Submission Name",
  "Item": "Item",
  "Quantity": "Quantity",
  "Weight": "Weight",
  "Shipping bag": "Shipping Bag",
  "Routing footprint estimate": "Routing Footprint",
  "Condition": "Condition",
  "Cleanliness": "Cleanliness",
  "Fabric": "Fabric",
  "Buyback preference": "Buyback Preference",
  "User notes": "User Notes",
  "Upcycle/buyback request": "Upcycle / Buyback Request",
  "Selected pathway reasoning": "Selected Pathway Reasoning",
  "Matched routing checks": "Matched Routing Checks",
  "Needs review": "Needs Review",
};

const compactBriefLabels = new Set([
  "Selected pathway",
  "Recommendation confidence",
  "Recommendation rank",
  "Recommendation score",
  "Submission name",
  "Item",
  "Quantity",
  "Weight",
  "Shipping bag",
  "Condition",
  "Cleanliness",
  "Fabric",
  "Buyback preference",
]);

function BriefPreview({ brief }) {
  const lines = String(brief || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const renderValue = (label, value) => {
    if (label === "Selected pathway reasoning") {
      const reasoning = parseSelectedPathwayReasoning(value);
      const sectionClass = "mt-4";
      const headingClass = "text-xs font-bold uppercase tracking-[0.06em] text-[#336158] dark:text-emerald-300";
      const listClass = "mt-2 grid gap-1.5 text-sm leading-6 text-[#4f6258] dark:text-zinc-300";

      return (
        <div>
          {reasoning.intro && (
            <p className="mt-1 leading-7 text-[#4f6258] dark:text-zinc-300">
              {reasoning.intro}
            </p>
          )}
          {reasoning.matched.length > 0 && (
            <div className={sectionClass}>
              <div className={headingClass}>Matched Criteria</div>
              <ul className={listClass}>
                {reasoning.matched.map((item) => (
                  <li key={`matched-${item}`} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#336158] dark:bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {reasoning.notMatched.length > 0 && (
            <div className={sectionClass}>
              <div className={headingClass}>Not Matched</div>
              <ul className={listClass}>
                {reasoning.notMatched.map((item) => (
                  <li key={`not-matched-${item}`} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b7791f] dark:bg-amber-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {reasoning.skipped.length > 0 && (
            <div className={sectionClass}>
              <div className={headingClass}>Skipped as Not Applicable</div>
              <ul className={listClass}>
                {reasoning.skipped.map((item) => (
                  <li key={`skipped-${item}`} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7c8c84] dark:bg-zinc-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (label === "Matched routing checks" || label === "Needs review") {
      return (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.split(",").map((item) => item.trim()).filter(Boolean).map((item) => (
            <span
              key={`${label}-${item}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                label === "Matched routing checks"
                  ? "bg-[#edf7ed] text-[#336158] dark:bg-emerald-400/10 dark:text-emerald-200"
                  : "bg-[#fff8e8] text-[#7a5427] dark:bg-amber-400/10 dark:text-amber-200"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      );
    }

    if (label === "All pathway scores") {
      return (
        <div className="mt-2 grid gap-2">
          {value.split("|").map((item) => item.trim()).filter(Boolean).map((item) => (
            <div key={item} className="rounded-xl bg-white px-3 py-2 text-sm text-[#5f6f67] dark:bg-white/[0.06] dark:text-zinc-300">
              {item}
            </div>
          ))}
        </div>
      );
    }

    return <p className="mt-1 whitespace-pre-line leading-7 text-[#4f6258] dark:text-zinc-300">{value}</p>;
  };

  return (
    <div className="rounded-2xl border border-[#dce4da] bg-[#fbfcfa] p-4 text-sm text-[#19221d] dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100">
      {lines.map((line, index) => {
        const separatorIndex = line.indexOf(":");

        if (separatorIndex <= 0) {
          return <p key={`${line}-${index}`} className="mb-3 break-words leading-7 last:mb-0">{line}</p>;
        }

        const rawLabel = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        const displayLabel = briefLabelMap[rawLabel] || rawLabel.replace(/\b\w/g, (letter) => letter.toUpperCase());
        const compact = compactBriefLabels.has(rawLabel);

        return (
          <div
            key={`${line}-${index}`}
            className={`mb-3 break-words rounded-xl border border-[#e1e7df] bg-white px-4 py-3 last:mb-0 dark:border-white/10 dark:bg-white/[0.04] ${
              compact ? "sm:flex sm:items-start sm:justify-between sm:gap-4" : ""
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-[0.06em] text-[#336158] dark:text-emerald-300">
              {displayLabel}
            </div>
            <div className={compact ? "mt-1 font-semibold text-[#19221d] dark:text-white sm:mt-0 sm:text-right" : ""}>
              {compact ? value : renderValue(rawLabel, value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShippingReminderCard({ pathway }) {
  const reminder = shippingReminderContent[pathway];

  if (!reminder) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#dce4da] bg-white/90 p-5 shadow-[0_12px_34px_rgba(25,34,29,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_34px_rgba(0,0,0,0.3)]">
      <div className="text-xs font-bold uppercase tracking-wide text-[#336158] dark:text-emerald-300">
        Shipping reminder
      </div>
      <div className="mt-5 flex items-start gap-4">
        <span
          aria-hidden="true"
          className={`mt-0.5 h-10 w-10 shrink-0 rounded-full border-2 ${reminder.swatchClass}`}
        />
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-6 text-[#19221d] dark:text-white">
            {reminder.label}
          </div>
          <div className="text-sm text-[#336158] dark:text-emerald-300">
            {reminder.title}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#5f6f67] dark:text-zinc-300">
        {reminder.instruction}
      </p>
    </div>
  );
}

export function DssConfirmationPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedRequestId = searchParams.get("request");
  const [preview, setPreview] = useState(null);
  const [partners, setPartners] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedPathway, setSelectedPathway] = useState("");
  const [buybackPreference, setBuybackPreference] = useState("no");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [manualLocationInput, setManualLocationInput] = useState("");
  const [isResolvingManualLocation, setIsResolvingManualLocation] = useState(false);
  const [partnerAddressCoordinates, setPartnerAddressCoordinates] = useState({});
  const [brief, setBrief] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [remindingId, setRemindingId] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [isSendConfirmationOpen, setIsSendConfirmationOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDss() {
      setIsLoading(true);
      setError("");

      try {
        const browserLocation = await getBrowserLocation();
        const [previewResponse, requestsResponse] =
          await Promise.all([
            dssService.getSubmissionPreview(submissionId),
            dssService.getUserRequests(),
          ]);

        if (!isMounted) {
          return;
        }

        const nextPreview = previewResponse.data;
        const lockedServicePathway = normalizePathway(
          nextPreview.submission?.service_type || nextPreview.submission?.action,
        );
        const topRecommendation = nextPreview.recommendations[0];
        const initialPathway = fixedServicePathways.includes(lockedServicePathway)
          ? lockedServicePathway
          : topRecommendation?.recommended_pathway;
        const initialRecommendation =
          nextPreview.recommendations.find(
            (item) => item.recommended_pathway === initialPathway,
          ) || topRecommendation;
        const partnersResponse =
          initialPathway === "rejected"
            ? { data: [] }
            : await dssService.listPartners({
                lat: browserLocation?.lat,
                lng: browserLocation?.lng,
                pathway: initialPathway,
                radiusKm: 120,
              });

        if (!isMounted) {
          return;
        }

        setPreview(nextPreview);
        setPartners(partnersResponse.data);
        setRequests(requestsResponse.data);
        setUserLocation(browserLocation);
        setLocationMessage(
          browserLocation
            ? "Partners are ranked by distance from your current location."
            : "Location access is off. Enter your address to rank partners by distance.",
        );
        setSelectedPathway(initialPathway || "");
        const initialBuybackPreference = nextPreview.submission?.buyback_interest ? "yes" : "no";
        setBuybackPreference(initialBuybackPreference);
        setBrief(buildPartnerBrief(
          nextPreview.submission,
          initialPathway,
          initialRecommendation,
          nextPreview.recommendations,
          { buybackInterest: initialBuybackPreference === "yes" },
        ));
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load recommendation review.");
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

  const topRecommendation = preview?.recommendations?.[0];

  const dssAverageScore = useMemo(() => {
    const scoredRecommendations = (preview?.recommendations || []).filter(
      (recommendation) =>
        recommendation.recommended_pathway !== "rejected" &&
        recommendation.score != null,
    );

    if (scoredRecommendations.length === 0) {
      return null;
    }

    const total = scoredRecommendations.reduce(
      (sum, recommendation) => sum + Number(recommendation.score || 0),
      0,
    );

    return total / scoredRecommendations.length;
  }, [preview]);

  const selectedServicePathway = useMemo(() => {
    const servicePathway = normalizePathway(
      preview?.submission?.service_type || preview?.submission?.action,
    );

    return fixedServicePathways.includes(servicePathway) ? servicePathway : "";
  }, [preview]);

  const hasSelectedService = Boolean(selectedServicePathway);
  const isRejected = preview?.recommendations?.[0]?.recommended_pathway === "rejected";
  const buybackRequested = buybackPreference === "yes";
  const upcycleRequest = preview?.submission?.upcycle_request;

  const recommendationOptions = useMemo(() => {
    if (!preview?.recommendations) {
      return [];
    }

    return preview.recommendations;
  }, [preview]);

  const matchingPartners = useMemo(() => {
    if (!selectedPathway) {
      return partners;
    }

    return partners.filter((partner) =>
      `${partner.service_types || ""} ${partner.accepted_service_types || ""} ${partner.description || ""}`
        .toLowerCase()
        .includes(selectedPathway),
    );
  }, [partners, selectedPathway]);

  const partnerOptions = useMemo(() => {
    const sourcePartners = matchingPartners.length > 0 ? matchingPartners : partners;

    return sourcePartners
      .map((partner) => enrichPartnerDistance(partner, userLocation, partnerAddressCoordinates[partner.id]))
      .sort((first, second) => {
        if (first.distance_km != null && second.distance_km != null) {
          return Number(first.distance_km) - Number(second.distance_km);
        }

        if (first.distance_km != null) {
          return -1;
        }

        if (second.distance_km != null) {
          return 1;
        }

        return 0;
      });
  }, [matchingPartners, partners, partnerAddressCoordinates, userLocation]);

  const selectedPartner = partnerOptions.find((partner) => partner.id === selectedPartnerId) || null;
  const selectedDistanceKm = selectedPartner?.distance_km == null ? null : Number(selectedPartner.distance_km);
  const selectedCarbonKg = estimateCarbonKg(
    selectedDistanceKm,
    preview?.submission?.details?.weight_value,
    preview?.submission?.details?.weight_unit,
  );

  const handlePathwayChange = (pathway) => {
    const recommendation = preview?.recommendations.find(
      (item) => item.recommended_pathway === pathway,
    );

    setSelectedPathway(pathway);
    setBrief(buildPartnerBrief(preview?.submission, pathway, recommendation, preview?.recommendations || [], {
      buybackInterest: buybackPreference === "yes",
      estimatedCarbonKg: selectedCarbonKg,
    }));
  };

  const handleBuybackPreferenceChange = (value) => {
    const recommendation = preview?.recommendations.find(
      (item) => item.recommended_pathway === selectedPathway,
    );

    setBuybackPreference(value);
    setBrief(buildPartnerBrief(preview?.submission, selectedPathway, recommendation, preview?.recommendations || [], {
      buybackInterest: value === "yes",
      estimatedCarbonKg: selectedCarbonKg,
    }));
  };

  useEffect(() => {
    if (!preview?.submission || !selectedPathway) {
      return;
    }
    const recommendation = preview.recommendations.find(
      (item) => item.recommended_pathway === selectedPathway,
    );
    setBrief(buildPartnerBrief(preview.submission, selectedPathway, recommendation, preview.recommendations || [], {
      buybackInterest: buybackPreference === "yes",
      estimatedCarbonKg: selectedCarbonKg,
    }));
  }, [selectedPartnerId, selectedCarbonKg, selectedPathway, buybackPreference, preview]);

  useEffect(() => {
    if (!userLocation || partners.length === 0) {
      return;
    }

    let isCancelled = false;
    const missingCoordinatePartners = partners.filter((partner) => {
      const hasCoordinates = partner.latitude != null && partner.longitude != null;
      return !hasCoordinates && partner.address && !partnerAddressCoordinates[partner.id];
    });

    if (missingCoordinatePartners.length === 0) {
      return;
    }

    async function resolvePartnerAddresses() {
      const resolvedEntries = [];

      for (const partner of missingCoordinatePartners) {
        try {
          const coordinates = await resolveManualLocation(partner.address);
          if (coordinates) {
            resolvedEntries.push([partner.id, coordinates]);
          }
        } catch {
          // Keep this quiet per-partner; the card badge will show Distance unavailable.
        }
      }

      if (!isCancelled && resolvedEntries.length > 0) {
        setPartnerAddressCoordinates((current) => ({
          ...current,
          ...Object.fromEntries(resolvedEntries),
        }));
      }
    }

    resolvePartnerAddresses();

    return () => {
      isCancelled = true;
    };
  }, [partnerAddressCoordinates, partners, userLocation]);

  const refreshNearbyPartners = async () => {
    setError("");
    try {
      const browserLocation = await getBrowserLocation(true);
      setUserLocation(browserLocation);
      const response = await dssService.listPartners({
        lat: browserLocation?.lat,
        lng: browserLocation?.lng,
        pathway: selectedPathway,
        radiusKm: 120,
      });
      setPartners(response.data);
      setLocationMessage(
        browserLocation
          ? "Partners are ranked by distance from your current location."
          : "Location access is off. Enter your address to rank partners by distance.",
      );
    } catch (locationError) {
      setLocationMessage(
        locationError.message ||
          "Location permission was denied or unavailable. Enter your address to rank partners by distance.",
      );
    }
  };

  const rankPartnersFromLocation = async (location, message) => {
    setUserLocation(location);
    const response = await dssService.listPartners({
      lat: location.lat,
      lng: location.lng,
      pathway: selectedPathway,
      radiusKm: 120,
    });
    setPartners(response.data);
    setLocationMessage(message);
  };

  const handleManualLocationSubmit = async (event) => {
    event.preventDefault();
    const address = manualLocationInput.trim();

    if (!address) {
      setLocationMessage("Enter an address to rank partners by distance.");
      return;
    }

    setIsResolvingManualLocation(true);
    setError("");

    try {
      const location = await resolveManualLocation(address);
      await rankPartnersFromLocation(
        location,
        "Partners are ranked by distance from your entered location.",
      );
    } catch (manualLocationError) {
      setLocationMessage(
        manualLocationError.message ||
          "We could not find that address. Try a city and province, or enter coordinates.",
      );
    } finally {
      setIsResolvingManualLocation(false);
    }
  };

  const handleSend = async (confirmed = false) => {
    if (isRejected) {
      setError("This submission is ineligible and cannot be sent to a partner.");
      return;
    }

    if (!selectedPartnerId || !selectedPathway) {
      setError("Choose a pathway and partner first.");
      return;
    }

    if (!confirmed && selectedServicePathway) {
      setIsSendConfirmationOpen(true);
      return;
    }

    setIsSending(true);
    setError("");
    setSentMessage("");
    setIsSendConfirmationOpen(false);

    try {
      await dssService.sendRecommendation({
        submission_id: submissionId,
        partner_id: selectedPartnerId,
        recommended_pathway: selectedPathway,
        buyback_interest: selectedPathway === "upcycle" && buybackPreference === "yes",
        estimated_distance_km: selectedDistanceKm,
        estimated_carbon_kg: selectedCarbonKg,
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
        message="Hang tight, we are preparing your recommendations."
        detail="We are checking fabric clues, item details, and partner-fit options."
      />
    );
  }

  if (error && !preview) {
    return (
      <div className="app-darkable-page flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl text-[#19221d]">Recommendation preview unavailable</h1>
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
    <div className="app-darkable-page min-h-screen bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] text-[#19221d] dark:bg-[radial-gradient(circle_at_top_left,_#1d2a25,_transparent_30%),linear-gradient(135deg,#0f1412,#121821,#0d1016)] dark:text-zinc-100">
      <nav className="sticky top-0 z-20 border-b border-[#e1e7df] bg-white/85 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1412]/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm text-[#5f6f67] hover:text-[#19221d] dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <div className="flex items-center gap-2" aria-label="ClothCycle PH">
            <Recycle className="h-6 w-6 text-[#336158]" />
            <span className="font-gloock text-xl text-[#19221d] dark:text-white">
              ClothCycle PH
            </span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 overflow-hidden rounded-[28px] border border-[#dce4da] bg-white/85 p-8 shadow-[0_24px_80px_rgba(25,34,29,0.1)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#336158] dark:text-emerald-300">
                <Sparkles className="h-4 w-4" />
                Recommendation review
              </div>
              <h1 className="font-gloock text-4xl text-[#19221d] dark:text-white">
                Review recommendation and send to a partner
              </h1>
              <p className="mt-3 max-w-2xl text-[#5f6f67] dark:text-zinc-300">
                ClothCycle reviews your saved submission details, then
                registers a partner request when you send the brief.
              </p>
            </div>
            <div className="rounded-2xl border border-[#dce4da] bg-[#f7faf5] px-5 py-4 text-sm text-[#5f6f67] dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-400">
              <div className="font-semibold text-[#19221d] dark:text-white">
                {preview.submission.submission_name || preview.submission.item_type}
              </div>
              <div>{formatDate(preview.submission.created_at)}</div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_34px_rgba(0,0,0,0.3)]">
              {preview.burn_test_analysis?.performed && (
                <div className="mb-6 rounded-2xl border border-[#dce4da] bg-[#f7faf5] p-5 dark:border-white/10 dark:bg-white/[0.05]">
                  <h2 className="mb-2 text-xl font-semibold">
                    Burn-test fabric result
                  </h2>
                  <p className="mb-4 text-sm leading-6 text-[#5f6f67] dark:text-zinc-300">
                    {preview.burn_test_analysis.summary}
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {preview.burn_test_analysis.top_fibers.map((fiber, index) => (
                      <div
                        key={fiber.fiber}
                        className="rounded-xl border border-[#e1e7df] bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <div className="text-xs uppercase tracking-wide text-[#5f6f67] dark:text-zinc-400">
                          Top {index + 1}
                        </div>
                        <div className="mt-1 font-semibold capitalize text-[#19221d] dark:text-white">
                          {fiber.fiber}
                        </div>
                        <div className="mt-2 text-sm text-[#336158] dark:text-emerald-300">
                          {Math.round(fiber.confidence * 100)}% confidence
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasSelectedService && (
                <div className="mb-6">
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                    <ClipboardList className="h-5 w-5 text-[#336158] dark:text-emerald-300" />
                    Your intended service
                  </h2>
                  <div className="rounded-2xl border border-[#dce4da] bg-[#f7faf5] p-5 dark:border-white/10 dark:bg-white/[0.05]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-2xl font-semibold text-[#19221d] dark:text-white">
                          {pathwayLabels[selectedServicePathway]}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#5f6f67] dark:text-zinc-300">
                          This is the pathway you picked in the submission form. You can keep it or switch before sending.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#336158] dark:bg-white/10 dark:text-emerald-200">
                        Original choice
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {recommendationOptions.length > 0 && (
                <>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                    <ClipboardList className="h-5 w-5 text-[#336158] dark:text-emerald-300" />
                    Recommended pathways
                  </h2>
                  <div className="mb-5 rounded-2xl border border-[#dce4da] bg-[#fbfcfa] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="mb-3 text-sm font-semibold text-[#19221d] dark:text-white">
                      Send this request as
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {recommendationOptions
                        .filter((recommendation) => fixedServicePathways.includes(recommendation.recommended_pathway))
                        .map((recommendation) => {
                          const isSelected = selectedPathway === recommendation.recommended_pathway;
                          const isOriginal = selectedServicePathway === recommendation.recommended_pathway;

                          return (
                            <button
                              key={`selector-${recommendation.recommended_pathway}`}
                              type="button"
                              onClick={() => handlePathwayChange(recommendation.recommended_pathway)}
                              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                                isSelected
                                  ? "border-[#336158] bg-[#f1f7ef] text-[#19221d] ring-2 ring-[#336158]/15 dark:border-emerald-300 dark:bg-emerald-300/15 dark:text-white"
                                  : "border-[#e1e7df] bg-white text-[#5f6f67] hover:border-[#9bb39c] dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:border-emerald-300/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">
                                  {pathwayLabels[recommendation.recommended_pathway]}
                                </span>
                                {isSelected && <CheckCircle className="h-4 w-4 text-[#336158] dark:text-emerald-300" />}
                              </div>
                              <div className="mt-1 text-xs">
                                Route #{recommendation.rank} · {Math.round(recommendation.confidence * 100)}% confidence
                              </div>
                              {isOriginal && (
                                <div className="mt-2 w-fit rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#336158] dark:bg-white/10 dark:text-emerald-200">
                                  Initial choice
                                </div>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  <p className="mt-3 text-sm leading-6 text-[#5f6f67] dark:text-zinc-300">
                    The cards below explain the recommendation scoring only. Use the buttons above to choose what gets sent to the partner.
                  </p>
                  {selectedPathway === "upcycle" && (
                    <div className="mt-4 rounded-2xl border border-[#dce4da] bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="text-sm font-semibold text-[#19221d] dark:text-white">
                        Buyback preference for this Upcycle request
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#5f6f67] dark:text-zinc-300">
                        This is not a route score. It only tells the partner whether you are open to buyback.
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {[
                          ["yes", "Yes, open to buyback"],
                          ["no", "No, upcycle only"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleBuybackPreferenceChange(value)}
                            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                              buybackPreference === value
                                ? "border-[#336158] bg-[#f1f7ef] text-[#19221d] ring-2 ring-[#336158]/15 dark:border-emerald-300 dark:bg-emerald-300/15 dark:text-white"
                                : "border-[#e1e7df] bg-white text-[#5f6f67] hover:border-[#9bb39c] dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                  <div className="grid gap-3">
                    {recommendationOptions.map((recommendation) => {
                      const isSelected =
                        selectedPathway === recommendation.recommended_pathway;

                      return (
                        <div
                          key={recommendation.recommended_pathway}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            isSelected
                              ? "border-[#336158] bg-[#f1f7ef] dark:border-emerald-400/40 dark:bg-emerald-400/10"
                              : "border-[#e1e7df] bg-white hover:border-[#9bb39c] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-300/50"
                          }`}
                        >
                          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px] md:items-start">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xl font-semibold text-[#19221d] dark:text-white">
                                <span>#{recommendation.rank} {pathwayLabels[recommendation.recommended_pathway]}</span>
                                {isSelected && (
                                  <span className="rounded-full bg-[#336158] px-2 py-0.5 text-xs font-semibold text-white dark:bg-emerald-300 dark:text-[#07110d]">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="mt-3 max-w-3xl text-base leading-7 text-[#4f6258] dark:text-zinc-300">
                                {buildRecommendationSummary(recommendation)}
                              </p>
                              {recommendation.checks?.length > 0 && (
                                <details className="group mt-4 rounded-2xl border border-[#e1e7df] bg-white/80 px-4 py-3 text-sm text-[#5f6f67] dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
                                  <summary className="cursor-pointer select-none py-1 text-base font-semibold text-[#336158] dark:text-emerald-300">
                                    Why this was recommended
                                  </summary>
                                  <div className="mt-4 grid origin-top gap-2 transition-all duration-300 ease-out group-open:animate-[accordion-down_260ms_ease-out] sm:grid-cols-2">
                                    {recommendation.checks.map((check) => (
                                      <span
                                        key={`${recommendation.recommended_pathway}-${check.question}`}
                                        className={`rounded-xl px-3 py-2 text-xs leading-5 ${
                                          check.matched
                                            ? "bg-[#edf7ed] text-[#336158] dark:bg-emerald-400/10 dark:text-emerald-200"
                                            : "bg-[#fff8e8] text-[#7a5427] dark:bg-amber-400/10 dark:text-amber-200"
                                        }`}
                                      >
                                        {check.question}: {check.matched ? "matched" : "not matched"}
                                      </span>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 text-center text-sm text-[#336158] shadow-sm dark:bg-white/10 dark:text-emerald-200">
                              <div className="text-2xl font-bold">
                                {Math.round(recommendation.confidence * 100)}%
                              </div>
                              <div>confidence</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {isRejected && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm leading-6 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
                  <div className="text-lg font-semibold">Eligibility screening failed</div>
                  <p className="mt-2">
                    {preview.recommendations[0]?.explanation}
                  </p>
                  <p className="mt-2 font-semibold">
                    Evaluation stopped before donation, upcycling, or recycling recommendations.
                  </p>
                </div>
              )}
            </div>

            {!isRejected && <div className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_34px_rgba(0,0,0,0.3)]">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Building2 className="h-5 w-5 text-[#336158] dark:text-emerald-300" />
                  Choose partner
                </h2>
                <button
                  onClick={refreshNearbyPartners}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce4da] px-3 py-2 text-sm text-[#5f6f67] hover:bg-[#f3f5f2] dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  <Navigation className="h-4 w-4" />
                  Rank nearby
                </button>
              </div>
              {locationMessage && (
                <div className="mb-4 rounded-xl bg-[#f7faf5] px-4 py-3 text-sm text-[#5f6f67] dark:bg-white/[0.05] dark:text-zinc-300">
                  {locationMessage}
                </div>
              )}
              {!userLocation && (
                <form
                  onSubmit={handleManualLocationSubmit}
                  className="mb-4 flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    value={manualLocationInput}
                    onChange={(event) => setManualLocationInput(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-[#dce4da] bg-white px-3 py-2 text-sm text-[#19221d] outline-none transition focus:border-[#336158] focus:ring-2 focus:ring-[#336158]/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500"
                    placeholder="Enter your city, province, or coordinates"
                  />
                  <button
                    type="submit"
                    disabled={isResolvingManualLocation}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce4da] px-3 py-2 text-sm font-semibold text-[#336158] hover:bg-[#f3f5f2] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-emerald-300 dark:hover:bg-white/10"
                  >
                    {isResolvingManualLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    Use address
                  </button>
                </form>
              )}
              <PartnerMap
                partners={partnerOptions}
                selectedPartnerId={selectedPartnerId}
                onSelect={setSelectedPartnerId}
                userLocation={userLocation}
              />
              <div className="grid gap-3 md:grid-cols-2">
                {partnerOptions.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      selectedPartnerId === partner.id
                        ? "border-[#336158] bg-[#f1f7ef] ring-2 ring-[#336158]/20 dark:border-emerald-300 dark:bg-emerald-300/20 dark:ring-emerald-300/30"
                        : "border-[#e1e7df] bg-white hover:border-[#9bb39c] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-300/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 font-semibold text-[#19221d] dark:text-white">
                        {partner.name}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <span className="rounded-full border border-[#dce4da] bg-[#fbfcfa] px-2.5 py-1 text-xs font-semibold text-[#336158] dark:border-white/10 dark:bg-white/[0.06] dark:text-emerald-300">
                          {formatDistanceIndicator(partner, userLocation)}
                        </span>
                        {selectedPartnerId === partner.id && (
                          <span className="rounded-full bg-[#336158] px-2 py-1 text-xs font-semibold text-white dark:bg-emerald-300 dark:text-[#07110d]">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[#5f6f67] dark:text-zinc-300">
                      {partner.description || partner.service_types || partner.email}
                    </p>
                    <div className="mt-3 text-xs uppercase tracking-wide text-[#336158] dark:text-emerald-300">
                      {partner.service_types || "General textile partner"}
                    </div>
                    {(partner.accepted_service_types || partner.pickup_areas || partner.capacity_notes) && (
                      <div className="mt-3 space-y-1 text-xs text-[#5f6f67] dark:text-zinc-400">
                        {partner.accepted_service_types && <div>Accepts: {partner.accepted_service_types}</div>}
                        {partner.pickup_areas && <div>Pickup areas: {partner.pickup_areas}</div>}
                        {partner.accepts_clean_only && <div>Clean textiles only</div>}
                        {partner.capacity_notes && <div>{partner.capacity_notes}</div>}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2 text-sm text-[#5f6f67] dark:text-zinc-300">
                      <MapPin className="h-4 w-4 text-[#336158] dark:text-emerald-300" />
                      {partner.address || "Address unavailable"}
                    </div>
                    {partner.gis_rank_reason && (
                      <div className="mt-2 text-xs text-[#6d7c73] dark:text-zinc-400">
                        {partner.gis_rank_reason}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>}
          </div>

          <aside className="space-y-6">
            <ShippingReminderCard pathway={selectedPathway} />

            <div className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_34px_rgba(0,0,0,0.3)]">
              <h2 className="mb-3 text-xl font-semibold">Partner Brief</h2>
              <BriefPreview brief={brief} />
              {selectedRecommendation && (
                <div className="mt-3 rounded-xl bg-[#f7faf5] px-4 py-3 text-sm text-[#5f6f67] dark:bg-white/[0.05] dark:text-zinc-300">
                  <div>Average recommendation score: {dssAverageScore?.toFixed(1) || "N/A"} / 100</div>
                  Recommendation score: {selectedRecommendation.score.toFixed(1)} / 100 | Rank #{selectedRecommendation.rank}
                </div>
              )}
              <div className="mt-3 rounded-xl border border-[#dce4da] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 text-[#5f6f67] dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
                <div className="font-semibold text-[#19221d] dark:text-white">Routing footprint context</div>
                {selectedCarbonKg != null ? (
                  <p className="mt-1">
                    This estimate uses selected partner distance, textile weight, and a light freight factor. It is meant for comparing nearby routes, not as a formal carbon audit.
                  </p>
                ) : (
                  <p className="mt-1">
                    Add textile weight and allow location ranking to show a route estimate before sending.
                  </p>
                )}
              </div>
              {(error || sentMessage) && (
                <div
                  className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                    sentMessage
                      ? "border-[#cfe2cf] bg-[#edf7ed] text-[#336158] dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                      : "border-red-100 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
                  }`}
                >
                  {sentMessage || error}
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={isRejected || isSending || !selectedPartnerId || !selectedPathway}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#336158] px-5 py-3 text-white transition-all hover:bg-[#2a4c48] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500/80 dark:text-[#07110d] dark:hover:bg-emerald-400 dark:disabled:bg-emerald-500/30 dark:disabled:text-zinc-400"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send to partner
              </button>
            </div>

            {preview.submission.photos?.length > 0 && (
              <ImageCarousel
                images={preview.submission.photos}
                title="Your uploaded images"
              />
            )}

            <div className="rounded-2xl border border-[#e1e7df] bg-white/90 p-6 shadow-[0_12px_34px_rgba(25,34,29,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_34px_rgba(0,0,0,0.3)]">
              <h2 className="mb-2 text-xl font-semibold">Sent requests</h2>
              <p className="text-sm leading-6 text-[#5f6f67] dark:text-zinc-300">
                Partner replies and reminder controls now live on a separate page so this recommendation review stays focused.
              </p>
              {highlightedRequestId && (
                <div className="mt-4 rounded-xl border border-[#cfe2cf] bg-[#edf7ed] px-4 py-3 text-sm text-[#336158] dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                  A request from messages is highlighted in your sent requests page.
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate(highlightedRequestId ? `/dss-requests?request=${highlightedRequestId}` : "/dss-requests")}
                className="mt-4 w-full rounded-xl border border-[#dce4da] px-4 py-3 text-sm font-semibold text-[#336158] hover:bg-[#f3f5f2] dark:border-white/10 dark:text-emerald-300 dark:hover:bg-white/10"
              >
                View sent requests
              </button>
              {false && <div className="space-y-3">
                {requests.length === 0 && (
                  <p className="text-sm text-[#5f6f67]">
                    No partner requests yet for this account.
                  </p>
                )}
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className={`rounded-2xl border bg-[#fbfcfa] p-4 ${
                      highlightedRequestId === request.id
                        ? "border-[#336158] ring-2 ring-[#336158]/20"
                        : "border-[#e1e7df]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-[#19221d]">
                        {request.partner_name}
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          statusClass[normalizeStatus(request.status)] || statusClass.pending
                        }`}
                      >
                        {formatStatusLabel(normalizeStatus(request.status))}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-[#5f6f67]">
                      {pathwayLabels[request.type]} · {request.item_type}
                    </div>
                    {normalizeStatus(request.status) === "accepted" && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-[#336158]">
                        <CheckCircle className="h-4 w-4" />
                        Partner accepted your request.
                      </div>
                    )}
                    {normalizeStatus(request.status) === "pending" && (
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
              </div>}
            </div>
          </aside>
        </section>
      </main>

      {isSendConfirmationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[#dce4da] bg-white p-6 shadow-[0_24px_70px_rgba(25,34,29,0.24)] dark:border-white/10 dark:bg-[#111817]">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-2xl bg-[#fff8e8] p-3 text-[#7a5427] dark:bg-amber-400/10 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#19221d] dark:text-white">
                  Send as {pathwayLabels[selectedPathway]}?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6f67] dark:text-zinc-300">
                  {selectedPathway === selectedServicePathway
                    ? `You are keeping your original ${pathwayLabels[selectedPathway]} intent.`
                    : `You changed this from your original ${pathwayLabels[selectedServicePathway]} intent to ${pathwayLabels[selectedPathway]}.`}
                  {" "}
                  {selectedRecommendation?.rank === 1
                    ? "This also matches the top recommendation."
                    : `The top recommendation is ${pathwayLabels[topRecommendation?.recommended_pathway] || "another pathway"}, but you can still send your chosen pathway.`}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-[#e1e7df] bg-[#f7faf5] p-4 text-sm text-[#5f6f67] dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300">
              <div className="font-semibold text-[#19221d] dark:text-white">
                {pathwayLabels[selectedPathway]} confidence: {Math.round(Number(selectedRecommendation?.confidence || 0) * 100)}%
              </div>
              <div className="mt-1">
                Top suggested option: {pathwayLabels[topRecommendation?.recommended_pathway] || "Not available"} ({Math.round(Number(topRecommendation?.confidence || 0) * 100)}% confidence)
              </div>
              {selectedPathway === "upcycle" && (
                <div className="mt-3 rounded-xl border border-[#dce4da] bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="font-semibold text-[#19221d] dark:text-white">
                    Buyback preference: {buybackRequested ? "Yes" : "No"}
                  </div>
                  <div className="mt-1">
                    {buybackRequested
                      ? "This will be sent as an Upcycle request with buyback interest noted. The partner still decides whether they can support buyback."
                      : "This will be sent as Upcycle only, without buyback interest."}
                  </div>
                  {upcycleRequest && (
                    <div className="mt-1">
                      Request: {upcycleRequest}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsSendConfirmationOpen(false)}
                className="rounded-xl border border-[#dce4da] px-4 py-3 text-sm font-semibold text-[#5f6f67] hover:bg-[#f3f5f2] dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Review choices
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePathwayChange(selectedServicePathway);
                  setIsSendConfirmationOpen(false);
                }}
                className="rounded-xl border border-[#336158] px-4 py-3 text-sm font-semibold text-[#336158] hover:bg-[#f1f7ef] dark:border-emerald-300/40 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
              >
                Keep initial intent
              </button>
              <button
                type="button"
                onClick={() => handleSend(true)}
                className="rounded-xl bg-[#336158] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a4c48] dark:bg-emerald-500/80 dark:text-[#07110d] dark:hover:bg-emerald-400"
              >
                Send as {pathwayLabels[selectedPathway]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getBrowserLocation(force = false) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        if (force) {
          reject(new Error(error.message || "Location permission was not granted."));
          return;
        }
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

function formatDistanceKm(value) {
  const distance = Number(value);
  if (!Number.isFinite(distance)) {
    return "";
  }

  return `${distance.toFixed(distance < 10 ? 1 : 0)} km`;
}

function formatDistanceIndicator(partner, userLocation) {
  if (partner.distance_km != null) {
    return `Approx. ${formatDistanceKm(partner.distance_km)} away`;
  }

  return "Distance unavailable";
}

function enrichPartnerDistance(partner, userLocation, fallbackCoordinates) {
  if (partner.distance_km != null || !userLocation) {
    return partner;
  }

  const partnerLat =
    partner.latitude == null ? fallbackCoordinates?.lat : Number(partner.latitude);
  const partnerLng =
    partner.longitude == null ? fallbackCoordinates?.lng : Number(partner.longitude);

  if (!isValidCoordinate(partnerLat, partnerLng)) {
    return partner;
  }

  const distanceKm = calculateDistanceKm(
    Number(userLocation.lat),
    Number(userLocation.lng),
    partnerLat,
    partnerLng,
  );

  return {
    ...partner,
    latitude: partner.latitude ?? partnerLat,
    longitude: partner.longitude ?? partnerLng,
    distance_km: distanceKm,
    gis_rank_reason: partner.gis_rank_reason || `${distanceKm} km from your location`,
  };
}

function calculateDistanceKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLatitude - fromLatitude);
  const dLng = toRadians(toLongitude - fromLongitude);
  const startLat = toRadians(fromLatitude);
  const endLat = toRadians(toLatitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

async function resolveManualLocation(value) {
  const coordinateMatch = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);

  if (coordinateMatch) {
    const lat = Number(coordinateMatch[1]);
    const lng = Number(coordinateMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    q: value,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("We could not check that address right now. Try coordinates or allow browser location.");
  }

  const results = await response.json();
  const firstResult = Array.isArray(results) ? results[0] : null;
  const lat = Number(firstResult?.lat);
  const lng = Number(firstResult?.lon);

  if (!isValidCoordinate(lat, lng)) {
    throw new Error("We could not find that address. Try a city and province, or enter coordinates.");
  }

  return { lat, lng };
}

function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function PartnerMap({ partners, selectedPartnerId, onSelect, userLocation }) {
  const plottedPartners = partners.filter(
    (partner) => partner.latitude != null && partner.longitude != null,
  );
  const coordinates = [
    ...plottedPartners.map((partner) => ({
      lat: Number(partner.latitude),
      lng: Number(partner.longitude),
    })),
    ...(userLocation ? [userLocation] : []),
  ];

  if (coordinates.length === 0) {
    return null;
  }

  const bounds = coordinates.reduce(
    (nextBounds, point) => ({
      minLat: Math.min(nextBounds.minLat, point.lat),
      maxLat: Math.max(nextBounds.maxLat, point.lat),
      minLng: Math.min(nextBounds.minLng, point.lng),
      maxLng: Math.max(nextBounds.maxLng, point.lng),
    }),
    {
      minLat: coordinates[0].lat,
      maxLat: coordinates[0].lat,
      minLng: coordinates[0].lng,
      maxLng: coordinates[0].lng,
    },
  );

  const toPosition = (lat, lng) => {
    const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.08);
    const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.08);
    return {
      top: `${8 + ((bounds.maxLat - lat) / latSpan) * 84}%`,
      left: `${8 + ((lng - bounds.minLng) / lngSpan) * 84}%`,
    };
  };

  return (
    <div className="relative mb-4 h-64 overflow-hidden rounded-2xl border border-[#dce4da] bg-[#eef5ea]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(51,97,88,0.08)_1px,transparent_1px),linear-gradient(rgba(51,97,88,0.08)_1px,transparent_1px)] bg-[length:36px_36px]" />
      {userLocation && (
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={toPosition(userLocation.lat, userLocation.lng)}
          title="Your location"
        >
          <div className="h-4 w-4 rounded-full border-2 border-white bg-[#10233f] shadow-lg" />
        </div>
      )}
      {plottedPartners.map((partner) => (
        <button
          key={partner.id}
          onClick={() => onSelect(partner.id)}
          className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-110 ${
            selectedPartnerId === partner.id ? "h-5 w-5 bg-[#336158]" : "h-4 w-4 bg-[#7ea186]"
          }`}
          style={toPosition(Number(partner.latitude), Number(partner.longitude))}
          title={partner.name}
          aria-label={`Select ${partner.name}`}
        />
      ))}
      <div className="absolute bottom-3 left-3 rounded-xl bg-white/90 px-3 py-2 text-xs text-[#5f6f67] shadow-sm">
        Dark marker: you. Green markers: partners.
      </div>
    </div>
  );
}

