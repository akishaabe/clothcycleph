import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Recycle,
  ArrowLeft,
  Upload,
  CheckCircle,
  Shirt,
  Package,
  RefreshCcw,
  AlertCircle,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useSubmissions } from "../../hooks/useSubmissions";
import { BrandLoadingScreen } from "../components/BrandLoadingScreen";
import "./SubmissionFormPage.css";

const itemTypes = [
  "Top",
  "Pants / Jeans",
  "Dress",
  "Jacket / Outerwear",
  "Household textile (curtains, bedsheets)",
  "Fabric scraps",
  "Other",
];

const conditionOptions = [
  "Good condition (wearable, no major damage)",
  "Minor damage (small tears, loose seams, stains)",
  "Heavily damaged (large tears, unusable as clothing)",
];

const cleanlinessOptions = [
  "Yes, clean and ready for use",
  "Needs cleaning",
  "Heavily soiled or contaminated",
];

const fabricOptions = [
  {
    value: "Cotton / Linen",
    description:
      "Usually breathable, matte, absorbent, and wrinkles more easily.",
  },
  {
    value: "Polyester, nylon, acrylic",
    description:
      "Often smooth, light, wrinkle-resistant, and dries quickly.",
  },
  {
    value: "Viscose / Rayon",
    description:
      "Soft and drapey with a cool feel, often used for flowy clothing.",
  },
  {
    value: "Cotton-spandex, poly-spandex blend",
    description:
      "Stretchy fabric commonly used for fitted tops, leggings, and activewear.",
  },
  {
    value: "Coated fabrics, multilayer PPE",
    description:
      "May feel stiff, water-resistant, plasticky, laminated, or layered.",
  },
  {
    value: "Wool / Silk",
    description:
      "Wool feels warm and textured; silk is smooth, glossy, and delicate.",
  },
];

const identificationMethods = [
  "Clothing label",
  "Personal knowledge",
  "Burn test",
];

const pathwayOptions = [
  { value: "Donate", icon: Package },
  { value: "Recycle", icon: Recycle },
  { value: "Upcycle", icon: RefreshCcw },
];

const burnTestMomentOptions = [
  "Burned fast",
  "Melted and did not burn",
  "No flame",
  "Burned slowly",
  "Shrinked away from flame",
  "Curled away",
  "Turned black",
];

const burnTestFlameOptions = [
  "Burns slowly",
  "Burns quickly",
  "Melts",
  "Sputters",
  "Flame was flickering",
  "Sizzles",
  "Drips",
];

const burnTestNoFlameOptions = [
  "Continues to burn",
  "Continues to burn quickly",
  "Has an afterglow",
  "Burns with difficulty",
  "Completely stops burning",
  "Continues to melt and burn",
];

const burnTestSmellOptions = [
  "Like burning paper",
  "Like burning hair",
  "Like celery",
  "Like chemicals",
  "Like vinegar",
  "Sharp and bitter",
];

const burnTestAshOptions = [
  "Light and feathery gray ash",
  "Black ash",
  "Soft, sticky, gummy",
  "Easy to crush",
  "Won’t crush",
  "Difficult to crush",
  "Hard, black ash",
  "Round, hard, grayish bead",
  "Round, hard, black bead",
  "Irregular bead",
  "Irregular, hard, black bead",
  "Round, shiny black beads",
];

const burnTestDescriptionMap = {
  "Burned fast": "The fabric caught fire immediately when flame touched it.",
  "Melted and did not burn":
    "The textile softened and liquefied instead of producing a steady flame.",
  "No flame": "The textile did not catch flame when heat touched it.",
  "Burned slowly": "The flame spread gradually and the fabric took time to catch.",
  "Shrinked away from flame":
    "The material pulled back from the heat rather than burning straight away.",
  "Curled away":
    "The edges curled as the textile heated, a sign of fibers reacting to flame.",
  "Turned black": "The surface darkened quickly when exposed to the flame.",
  "Burns slowly": "The flame moves through the textile without spreading fast.",
  "Burns quickly": "The fabric feeds the flame and burns with speed.",
  Melts: "The fabric liquefies into a sticky or drippy form while heated.",
  Sputters: "Small sparks or popping sounds happen as it burns.",
  "Flame was flickering":
    "The flame moved irregularly instead of staying steady.",
  Sizzles: "A sizzling sound suggests moisture or certain synthetic fibers.",
  Drips: "Molten material drops from the textile as it burns.",
  "Continues to burn":
    "The fabric keeps burning after the flame source is removed.",
  "Continues to burn quickly":
    "Even after the flame is removed, it keeps burning without slowing down.",
  "Has an afterglow":
    "The fabric continues to glow or smolder after flames are gone.",
  "Burns with difficulty":
    "It is hard to keep the textile burning once the flame is removed.",
  "Completely stops burning":
    "The material stops burning immediately after the flame leaves.",
  "Continues to melt and burn":
    "It keeps melting while also burning slowly.",
  "Like burning paper":
    "A dry paper smell often points to natural cellulose fibers.",
  "Like burning hair":
    "This scent usually indicates animal fibers or protein-based materials.",
  "Like celery":
    "A green, plant-like odor can appear with certain natural fibers.",
  "Like chemicals":
    "A sharp chemical smell often means synthetics or finishes.",
  "Like vinegar":
    "A sour or acidic scent may come from coated or treated fibers.",
  "Sharp and bitter":
    "A strong bitter odor often means synthetic blends or plastic content.",
  "Light and feathery gray ash":
    "Fine, soft ash that crushes easily is typical of natural fibers.",
  "Black ash": "Dark ash without much residue suggests some synthetic content.",
  "Soft, sticky, gummy":
    "The ash stays sticky and does not fall apart cleanly.",
  "Easy to crush":
    "The leftover ash or bead breaks apart with light pressure.",
  "Won’t crush": "The residue stays firm and resists pressure.",
  "Difficult to crush":
    "The ash is hard and takes effort to break apart.",
  "Hard, black ash":
    "A rigid black residue often means synthetic or blended fibers.",
  "Round, hard, grayish bead":
    "A solid gray bead forms as melted material cools.",
  "Round, hard, black bead":
    "A dark bead means the material melted and solidified in a dense form.",
  "Irregular bead":
    "The melted residue forms an uneven, bumpy shape.",
  "Irregular, hard, black bead":
    "A stiff, uneven dark bead suggests melting synthetics.",
  "Round, shiny black beads":
    "Small shiny beads are a classic sign of plasticized fibers.",
};

const burnTestFiberRules = [
  ["cotton", "burned fast", "Burns quickly", "Continues to burn quickly, Has an afterglow", "Like burning paper", "Light and feathery gray ash OR Black ash"],
  ["linen", "burned fast", "Burns quickly", "Continues to burn", "Like burning paper", "Light and feathery gray ash"],
  ["rayon, tencel", "burned fast", "Burns quickly", "Continues to burn quickly", "Like burning paper", "Light and feathery gray ash"],
  ["silk", "curled away, no flame", "Burns slowly, Sputters", "Burns with difficulty, Completely stops burning", "Like burning hair", "Round, shiny black beads & Easy to crush"],
  ["wool", "curled away, no flame, burned slowly", "Burns slowly, Sizzles, Flame was flickering", "Completely stops burning", "Like burning hair", "Easy to crush, Irregular bead"],
  ["nylon", "Melted and did not burn, Shrinked away from flame", "Melts, Burns slowly", "Completely stops burning", "Like celery", "Round, hard, grayish bead & Won't crush"],
  ["polyester, poly fleece", "Shrinked away from flame", "Melts, Burns slowly", "Burns with difficulty", "Like chemicals", "Round, hard, grayish bead & Won't crush"],
  ["acetate", "Shrinked away from flame, Turned black", "Sputters, Melts, Drips, Burns quickly", "Continues to melt and burn", "Like vinegar", "Hard, black ash, Irregular bead, Difficult to crush"],
  ["acrylic", "Shrinked away from flame", "Burns quickly, Sputters, Melts", "Continues to melt and burn", "Like chemicals", "Irregular, hard, black bead & Won't crush"],
  ["spandex", "Shrinked away from flame", "Melts, Burns quickly", "Continues to melt and burn", "Sharp and bitter", "Soft, sticky, gummy"],
];

const normalizeAnswer = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .trim();

const selectedList = (value) =>
  Array.isArray(value)
    ? value.map(normalizeAnswer)
    : String(value || "")
        .split(",")
        .map(normalizeAnswer)
        .filter(Boolean);

const matchesExpected = (expectedValue, selectedValue) => {
  const selected = selectedList(selectedValue);
  const expected = String(expectedValue || "");

  if (expected.includes("&")) {
    return expected
      .split("&")
      .map(normalizeAnswer)
      .every((answer) => selected.includes(answer));
  }

  return expected
    .split(/\s+OR\s+|,/i)
    .map(normalizeAnswer)
    .some((answer) => selected.includes(answer));
};

const analyzeBurnTestAnswers = (formData) =>
  burnTestFiberRules
    .map(([fiber, moment, flames, noFlame, smell, ashes]) => {
      const checks = [
        matchesExpected(moment, formData.burnTestMoment),
        matchesExpected(flames, formData.burnTestFlames),
        matchesExpected(noFlame, formData.burnTestNoFlame),
        matchesExpected(smell, formData.burnTestSmell),
        matchesExpected(ashes, formData.burnTestAshes),
      ];
      const score = checks.filter(Boolean).length;

      return {
        fiber,
        score,
        confidence: score / checks.length,
      };
    })
    .sort((a, b) => b.confidence - a.confidence || b.score - a.score)
    .slice(0, 3);

export function SubmissionFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { createSubmission, isLoading: isSubmitting } = useSubmissions();
  const {
    uploadMultipleFiles,
    getFilePreview,
    isLoading: isUploading,
    progress,
    error: uploadError,
  } = useFileUpload();
  const selectedService = location.state?.service || "";
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [showBurnTestResult, setShowBurnTestResult] = useState(false);
  const [isReviewEditing, setIsReviewEditing] = useState(false);

  const [formData, setFormData] = useState({
    submissionName: "",
    itemTypes: [],
    otherItemType: "",
    condition: "",
    cleanliness: "",
    quantity: "",
    knowsFabricType: "",
    fabricTypes: [],
    fabricIdentification: [],
    brand: "",
    noBrandVisible: false,
    fabricDescription: [],
    action: selectedService,
    buybackInterest: "",
    upcycleRequest: "",
    description: "",
    imageFiles: [],
    imageLabels: [],

    burnTestChoice: "",
    burnTestPage: null,
    burnTestMoment: [],
    burnTestFlames: [],
    burnTestNoFlame: [],
    burnTestSmell: "",
    burnTestAshes: [],
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleListValue = (field, value) => {
    setFormData((prev) => {
      const values = prev[field];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];

      return { ...prev, [field]: nextValues };
    });
  };

  const updateAction = (action) => {
    setFormData((prev) => ({
      ...prev,
      action,
      buybackInterest: action === "Upcycle" ? prev.buybackInterest : "",
      upcycleRequest: action === "Upcycle" ? prev.upcycleRequest : "",
    }));
  };

  const setBurnTestChoice = (choice) => {
    setShowBurnTestResult(false);
    setFormData((prev) => ({
      ...prev,
      burnTestChoice: choice,
      burnTestPage: choice === "Yes" ? 1 : null,
      burnTestMoment: choice === "Yes" ? prev.burnTestMoment : [],
      burnTestFlames: choice === "Yes" ? prev.burnTestFlames : [],
      burnTestNoFlame: choice === "Yes" ? prev.burnTestNoFlame : [],
      burnTestSmell: choice === "Yes" ? prev.burnTestSmell : "",
      burnTestAshes: choice === "Yes" ? prev.burnTestAshes : [],
    }));
  };

  const handleBurnTestBack = () => {
    setFormData((prev) => ({
      ...prev,
      burnTestPage: prev.burnTestPage > 1 ? prev.burnTestPage - 1 : null,
      burnTestChoice: prev.burnTestPage > 1 ? prev.burnTestChoice : "",
    }));
  };

  const handleBurnTestNext = () => {
    if (formData.burnTestPage === 6) {
      setShowBurnTestResult(true);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      burnTestPage: prev.burnTestPage + 1,
    }));
  };

  const toSubmissionItemType = () => {
    return formData.itemTypes
      .map((type) =>
        type === "Other" && formData.otherItemType.trim()
          ? formData.otherItemType.trim()
          : type,
      )
      .join(", ");
  };

  const toServiceType = () => {
    if (!formData.action) {
      return null;
    }

    return formData.action.toLowerCase();
  };

  const handleImageUpload = async (files) => {
    const nextFiles = Array.from(files || []);
    setFormData((prev) => ({
      ...prev,
      imageFiles: nextFiles,
      imageLabels: nextFiles.map((file, index) => prev.imageLabels[index] || file.name.replace(/\.[^.]+$/, "")),
    }));

    const previews = await Promise.all(
      nextFiles.map(async (file) => getFilePreview(file)),
    );
    setImagePreviews(previews.filter(Boolean));
  };

  const removeImage = (indexToRemove) => {
    setFormData((prev) => {
      const nextFiles = prev.imageFiles.filter((_, index) => index !== indexToRemove);
      const nextLabels = prev.imageLabels.filter((_, index) => index !== indexToRemove);
      return { ...prev, imageFiles: nextFiles, imageLabels: nextLabels };
    });

    setImagePreviews((prev) => prev.filter((_, index) => index !== indexToRemove));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");

    try {
      let photoUrls = [];

      if (formData.imageFiles.length > 0) {
        photoUrls = await uploadMultipleFiles(formData.imageFiles);

        if (photoUrls.length === 0) {
          setSubmitError("Image upload failed. Please try again.");
          return;
        }
      }

      const photosWithLabels = photoUrls.map((url, index) => ({
        url,
        label: formData.imageLabels[index] || `Textile image ${index + 1}`,
      }));

      const fabricSummary =
        formData.knowsFabricType === "Yes"
          ? formData.fabricTypes.join(", ")
          : formData.fabricDescription.join(", ");

      const createdSubmission = await createSubmission({
        submission_name: formData.submissionName || null,
        item_type: toSubmissionItemType(),
        condition: formData.condition,
        fabric: fabricSummary,
        cleanliness: formData.cleanliness,
        description: formData.description || null,
        photos: photosWithLabels,
        service_type: toServiceType(),
        quantity: Number(formData.quantity),
        buyback_interest:
          formData.action === "Upcycle" && formData.buybackInterest === "Yes",
        action: formData.action,
        upcycle_request: formData.upcycleRequest || null,
        details: {
          item_types: formData.itemTypes,
          other_item_type: formData.otherItemType || null,
          condition: formData.condition,
          cleanliness: formData.cleanliness,
          knows_fabric_type: formData.knowsFabricType === "Yes",
          fabric_types: formData.fabricTypes,
          fabric_identification: formData.fabricIdentification,
          brand: formData.noBrandVisible ? null : formData.brand || null,
          no_brand_visible: formData.noBrandVisible,
          fabric_description: formData.fabricDescription,
        },
        burn_test: {
          performed: formData.burnTestChoice === "Yes",
          page: formData.burnTestChoice === "Yes" ? formData.burnTestPage : null,
          moment: formData.burnTestMoment,
          flames: formData.burnTestFlames,
          no_flame: formData.burnTestNoFlame,
          smell: formData.burnTestSmell || null,
          ashes: formData.burnTestAshes,
        },
      });

      setStep(6);
      setIsReviewEditing(false);

      setTimeout(() => {
        navigate(`/dss/${createdSubmission.id}`);
      }, 3000);
    } catch (error) {
      setSubmitError(error.message || "Failed to submit textile details.");
    }
  };

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="submission-page app-darkable-page flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f5f5f0] to-[#e8ebe4] px-6">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#a45d4d]" />
          <h1 className="mb-2 text-2xl text-[#2d4a2d]">Login required</h1>
          <p className="mb-5 text-[#5a6f5a]">
            Please login before submitting textile items.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="rounded-xl bg-[#6b8e6b] px-5 py-3 text-white transition-all hover:bg-[#5a7a5a]"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const hasItemTypes =
    formData.itemTypes.length > 0 &&
    (!formData.itemTypes.includes("Other") || formData.otherItemType.trim());

  const isBurnTestComplete =
    formData.burnTestChoice === "No" ||
    (formData.burnTestChoice === "Yes" && formData.burnTestAshes.length > 0);

  const isStepTwoComplete =
    hasItemTypes &&
    formData.condition &&
    formData.cleanliness &&
    formData.quantity;

  const isStepThreeComplete =
    formData.knowsFabricType === "Yes"
      ? formData.fabricTypes.length > 0 &&
        formData.fabricIdentification.length > 0 &&
        (formData.noBrandVisible || formData.brand.trim())
      : formData.knowsFabricType === "No" &&
        formData.fabricDescription.length > 0;

  const isStepFourComplete =
    isBurnTestComplete &&
    formData.action &&
    (formData.action !== "Upcycle" ||
      (formData.buybackInterest &&
        (formData.buybackInterest !== "Yes" || formData.upcycleRequest.trim())));

  const burnTestResult = analyzeBurnTestAnswers(formData);

  const reviewRows = [
    { label: "Submission Name", value: formData.submissionName, step: 2 },
    { label: "Burn Test", value: formData.burnTestChoice, step: 1 },
    { label: "Moment Flame", value: formData.burnTestMoment.join(", "), step: 1 },
    { label: "While in Flames", value: formData.burnTestFlames.join(", "), step: 1 },
    { label: "Without Flame", value: formData.burnTestNoFlame.join(", "), step: 1 },
    { label: "Smell", value: formData.burnTestSmell, step: 1 },
    { label: "Ash Characteristics", value: formData.burnTestAshes.join(", "), step: 1 },
    { label: "Item Type", value: formData.itemTypes.join(", "), step: 2 },
    { label: "Condition", value: formData.condition, step: 2 },
    { label: "Cleanliness", value: formData.cleanliness, step: 2 },
    { label: "Quantity", value: `${formData.quantity} items`, step: 2 },
    { label: "Fabric Type Known", value: formData.knowsFabricType, step: 3 },
    {
      label: "Fabric Type",
      step: 3,
      value:
      formData.knowsFabricType === "Yes"
        ? formData.fabricTypes.join(", ")
        : formData.fabricDescription.join(", "),
    },
    { label: "Fabric Identified By", value: formData.fabricIdentification.join(", "), step: 3 },
    { label: "Brand", value: formData.noBrandVisible ? "No brand visible" : formData.brand, step: 3 },
    { label: "Intended Pathway", value: formData.action, step: 4 },
    { label: "Buyback Interest", value: formData.buybackInterest, step: 4 },
    { label: "Upcycle Request", value: formData.upcycleRequest, step: 4 },
  ].filter(({ value }) => value);

  if (step === 6) {
    return (
      <BrandLoadingScreen
        title="Generating your path..."
        message="Hang tight, the DSS engine is generating its recommendations."
        detail="We are preparing your fabric clues, item details, and partner-ready brief."
      />
    );
  }

  return (
    <div className="submission-page app-darkable-page min-h-screen bg-gradient-to-br from-[#f5f5f0] to-[#e8ebe4]">
      {isReviewEditing && step !== 5 && (
        <button
          onClick={() => setStep(5)}
          className="fixed right-6 top-24 z-40 rounded-full bg-[#336158] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(25,34,29,0.22)] hover:bg-[#2a4c48]"
        >
          Back to review
        </button>
      )}
      <nav className="bg-white border-b border-[#d4d8d0] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-10 h-10 rounded-full bg-[#f5f5f0] flex items-center justify-center hover:bg-[#e8ebe4] transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-[#5a6f5a]" />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-[#6b8e6b]" />
              <span className="text-xl text-[#2d4a2d] font-gloock">
                ClothCycle PH
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl mb-2 text-[#2d4a2d]">
            Textile Submission
          </h1>
          <p className="text-lg text-[#5a6f5a]">
            Help us give your textiles a second life
          </p>
        </motion.div>

        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step >= num
                      ? "bg-[#6b8e6b] text-white"
                      : "bg-white text-[#5a6f5a] border-2 border-[#d4d8d0]"
                  }`}
                >
                  {step > num ? <CheckCircle className="w-5 h-5" /> : num}
                </div>

                {num < 5 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      step > num ? "bg-[#6b8e6b]" : "bg-[#d4d8d0]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 text-center text-sm text-[#5a6f5a]">
            <span>Burn Test</span>
            <span>Items</span>
            <span>Fabric</span>
            <span>Pathway</span>
            <span>Review</span>
          </div>
        </div>

<motion.div
  key={`${step}-${formData.burnTestPage}`}
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  className="bg-white p-8 rounded-2xl shadow-lg"
>
          {step === 1 && (
            <div className="space-y-7">
              <h7 className="text-2xl text-[#2d4a2d]">Burn Test</h7>

              {showBurnTestResult && (
                <QuestionBlock label="Burn test fabric result">
                  <div className="rounded-2xl border border-[#d4d8d0] bg-[#f5f5f0] p-5">
                    <p className="mb-4 text-[#5a6f5a]">
                      Your fabric might be one of these based on DSS burn-test
                      rules.
                    </p>

                    <div className="grid gap-3 md:grid-cols-3">
                      {burnTestResult.map((result, index) => (
                        <div
                          key={result.fiber}
                          className="rounded-xl border border-[#d4d8d0] bg-white p-4"
                        >
                          <div className="text-sm text-[#5a6f5a]">
                            Top {index + 1}
                          </div>
                          <div className="mt-1 text-lg font-semibold capitalize text-[#2d4a2d]">
                            {result.fiber}
                          </div>
                          <div className="mt-2 text-sm text-[#5a6f5a]">
                            {Math.round(result.confidence * 100)}% confidence ·{" "}
                            {result.score}/5 rule matches
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => setShowBurnTestResult(false)}
                      className="flex-1 rounded-xl border-2 border-[#6b8e6b] bg-white py-3 text-[#6b8e6b] transition-all hover:bg-[#f5f5f0]"
                    >
                      Edit burn test
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 rounded-xl bg-[#6b8e6b] py-3 text-white transition-all hover:bg-[#5a7a5a] hover:shadow-lg"
                    >
                      Continue to item details
                    </button>
                  </div>
                </QuestionBlock>
              )}

              {!showBurnTestResult && !formData.burnTestChoice && (
                <QuestionBlock label="Do you want to do a burn test?">
                  <p className="text-sm text-[#5a6f5a]/80 mb-4">
                    A burn test can help determine if your textile item is
                    organic, like cotton, or synthetic, like polyester.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {["Yes", "No"].map((answer) => (
                      <RadioOption
                        key={answer}
                        name="burnTestChoice"
                        label={answer}
                        checked={formData.burnTestChoice === answer}
                        onChange={() => setBurnTestChoice(answer)}
                      />
                    ))}
                  </div>
                </QuestionBlock>
              )}

              {!showBurnTestResult && formData.burnTestChoice === "No" && (
                <QuestionBlock label="Do you want to do a burn test?">
                  <p className="text-sm text-[#5a6f5a]/80 mb-4">
                    A burn test can help determine if your textile item is
                    organic, like cotton, or synthetic, like polyester.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {["Yes", "No"].map((answer) => (
                      <RadioOption
                        key={answer}
                        name="burnTestChoice"
                        label={answer}
                        checked={formData.burnTestChoice === answer}
                        onChange={() => setBurnTestChoice(answer)}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="mt-4 w-full py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg"
                  >
                    Continue to item details
                  </button>
                </QuestionBlock>
              )}

              {!showBurnTestResult && formData.burnTestChoice === "Yes" &&
                formData.burnTestPage === 1 && (
                  <div className="space-y-6">
                    <QuestionBlock label="How to do a burn test?">
                      <div className="space-y-3 text-[#5a6f5a]">
                        <p>1. Cut up a small piece of your textile waste.</p>
                        <p>
                          2. Prepare a lighter or a candle. Don’t use a match.
                        </p>
                        <p>
                          3. Prepare tweezers for the safety of your fingers.
                        </p>
                        <p>
                          4. Prepare something to put your burning textile on,
                          such as glassware or a baking tray.
                        </p>
                        <p>
                          5. Take notes on how it burns, smells, reacts to
                          flame, and what the ashes look like.
                        </p>
                        <p>6. Get burning!</p>
                      </div>
                    </QuestionBlock>

                    <div className="flex gap-3">
                      <button
                        onClick={handleBurnTestBack}
                        className="flex-1 py-3 bg-white text-[#6b8e6b] border-2 border-[#6b8e6b] rounded-xl hover:bg-[#f5f5f0] transition-all"
                      >
                        Back
                      </button>

                      <button
                        onClick={handleBurnTestNext}
                        className="flex-1 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

              {!showBurnTestResult && formData.burnTestChoice === "Yes" &&
                formData.burnTestPage === 2 && (
                  <BurnTestCheckboxPage
                    label="How did it look like the moment flame touched the textile?"
                    description="Was it fast, did it curl, did it melt? You can select multiple items that apply."
                    options={burnTestMomentOptions}
                    selected={formData.burnTestMoment}
                    onToggle={(option) =>
                      toggleListValue("burnTestMoment", option)
                    }
                    onBack={handleBurnTestBack}
                    onNext={handleBurnTestNext}
                  />
                )}

              {!showBurnTestResult && formData.burnTestChoice === "Yes" &&
                formData.burnTestPage === 3 && (
                  <BurnTestCheckboxPage
                    label="How did it look like while in flames?"
                    description="Slowly? Quickly? Melting?"
                    options={burnTestFlameOptions}
                    selected={formData.burnTestFlames}
                    onToggle={(option) =>
                      toggleListValue("burnTestFlames", option)
                    }
                    onBack={handleBurnTestBack}
                    onNext={handleBurnTestNext}
                  />
                )}

              {!showBurnTestResult && formData.burnTestChoice === "Yes" &&
                formData.burnTestPage === 4 && (
                  <BurnTestCheckboxPage
                    label="When there was no flame, what did you notice?"
                    description="Yes, again. Promise this is the last on how it looks like on flames."
                    options={burnTestNoFlameOptions}
                    selected={formData.burnTestNoFlame}
                    onToggle={(option) =>
                      toggleListValue("burnTestNoFlame", option)
                    }
                    onBack={handleBurnTestBack}
                    onNext={handleBurnTestNext}
                  />
                )}

              {!showBurnTestResult && formData.burnTestChoice === "Yes" &&
                formData.burnTestPage === 5 && (
                  <div className="space-y-6">
                    <QuestionBlock label="Almost there, how did it smell like?">
                      <p className="text-sm text-[#5a6f5a]/80 mb-4">
                        Like what? Just one. Pick the one closest.
                      </p>

                      <div className="grid md:grid-cols-2 gap-3">
                        {burnTestSmellOptions.map((option) => (
                          <BurnTestRadioOption
                            key={option}
                            name="burnTestSmell"
                            label={option}
                            description={burnTestDescriptionMap[option]}
                            checked={formData.burnTestSmell === option}
                            onChange={() => updateField("burnTestSmell", option)}
                          />
                        ))}
                      </div>
                    
                      {formData.burnTestSmell && (
                        <SelectedOptionSummary
                          selected={[formData.burnTestSmell]}
                          descriptionMap={burnTestDescriptionMap}
                        />
                      )}
                    </QuestionBlock>

                    <div className="flex gap-3">
                      <button
                        onClick={handleBurnTestBack}
                        className="flex-1 py-3 bg-white text-[#6b8e6b] border-2 border-[#6b8e6b] rounded-xl hover:bg-[#f5f5f0] transition-all"
                      >
                        Back
                      </button>

                      <button
                        onClick={handleBurnTestNext}
                        disabled={!formData.burnTestSmell}
                        className="flex-1 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

              {!showBurnTestResult && formData.burnTestChoice === "Yes" &&
                formData.burnTestPage === 6 && (
                  <BurnTestCheckboxPage
                    label="What were the characteristics of the ashes?"
                    description="Don’t let the ashes fly!"
                    options={burnTestAshOptions}
                    selected={formData.burnTestAshes}
                    onToggle={(option) =>
                      toggleListValue("burnTestAshes", option)
                    }
                    onBack={handleBurnTestBack}
                    onNext={handleBurnTestNext}
                  />
                )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7">
              <h7 className="text-2xl text-[#2d4a2d]">Item Details</h7>

              <QuestionBlock label="Name this submission (Optional)">
                <input
                  type="text"
                  value={formData.submissionName}
                  onChange={(event) =>
                    updateField("submissionName", event.target.value)
                  }
                  className="w-full rounded-xl border-2 border-[#d4d8d0] bg-white px-4 py-3 focus:border-[#6b8e6b]"
                  placeholder="Example: Denim jacket for upcycling"
                  maxLength={160}
                />
              </QuestionBlock>

              <QuestionBlock label="What type of item/s are you submitting?">
                <div className="grid md:grid-cols-2 gap-3">
                  {itemTypes.map((type) => (
                    <CheckboxOption
                      key={type}
                      label={type}
                      checked={formData.itemTypes.includes(type)}
                      onChange={() => toggleListValue("itemTypes", type)}
                    />
                  ))}
                </div>

                {formData.itemTypes.includes("Other") && (
                  <input
                    type="text"
                    value={formData.otherItemType}
                    onChange={(event) =>
                      updateField("otherItemType", event.target.value)
                    }
                    className="mt-3 w-full px-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] bg-white"
                    placeholder="Please specify the item type"
                  />
                )}
              </QuestionBlock>

              <QuestionBlock label="What is the overall condition of the item?">
                <div className="space-y-3">
                  {conditionOptions.map((condition) => (
                    <RadioOption
                      key={condition}
                      name="condition"
                      label={condition}
                      checked={formData.condition === condition}
                      onChange={() => updateField("condition", condition)}
                    />
                  ))}
                </div>
              </QuestionBlock>

              <QuestionBlock label="Is/are the item/s clean?">
                <div className="space-y-3">
                  {cleanlinessOptions.map((cleanliness) => (
                    <RadioOption
                      key={cleanliness}
                      name="cleanliness"
                      label={cleanliness}
                      checked={formData.cleanliness === cleanliness}
                      onChange={() => updateField("cleanliness", cleanliness)}
                    />
                  ))}
                </div>

                {formData.cleanliness === "Heavily soiled or contaminated" && (
                  <div className="mt-3 rounded-xl border border-[#d4a574] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5427]">
                    Heavily soiled or contaminated items may need special
                    handling and may not be accepted for donation.
                  </div>
                )}
              </QuestionBlock>

              <QuestionBlock label="Quantity (items)">
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(event) =>
                    updateField("quantity", event.target.value)
                  }
                  className="w-full px-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] bg-white"
                  placeholder="Enter number of items"
                  min="1"
                />
              </QuestionBlock>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-white text-[#6b8e6b] border-2 border-[#6b8e6b] rounded-xl hover:bg-[#f5f5f0] transition-all"
                >
                  Back
                </button>

                <button
                  onClick={() => setStep(3)}
                  disabled={!isStepTwoComplete}
                  className="flex-1 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-7">
              <h7 className="text-2xl text-[#2d4a2d]">Fabric Details</h7>

              <QuestionBlock label="Do you know the fabric type of the item/s?">
                <div className="grid sm:grid-cols-2 gap-3">
                  {["Yes", "No"].map((answer) => (
                    <RadioOption
                      key={answer}
                      name="knowsFabricType"
                      label={answer}
                      checked={formData.knowsFabricType === answer}
                      onChange={() => updateField("knowsFabricType", answer)}
                    />
                  ))}
                </div>
              </QuestionBlock>

              {formData.knowsFabricType === "Yes" && (
                <>
                  {formData.burnTestChoice === "Yes" &&
                    formData.fabricTypes.length === 0 && (
                      <div className="rounded-xl border border-[#d4a574] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5427]">
                        Burn test clue: your fabric might be{" "}
                        <span className="font-semibold">
                          {burnTestResult
                            .map((result) => result.fiber)
                            .join(", ")}
                        </span>
                        . Use this as a guide when selecting fabric type.
                      </div>
                    )}

                  <QuestionBlock label="What is the fabric type?">
                    <FabricChecklist
                      selected={formData.fabricTypes}
                      onToggle={(value) =>
                        toggleListValue("fabricTypes", value)
                      }
                    />
                  </QuestionBlock>

                  <QuestionBlock label="How did you identify the fabric?">
                    <div className="grid md:grid-cols-3 gap-3">
                      {identificationMethods.map((method) => (
                        <CheckboxOption
                          key={method}
                          label={method}
                          checked={formData.fabricIdentification.includes(
                            method,
                          )}
                          onChange={() =>
                            toggleListValue("fabricIdentification", method)
                          }
                        />
                      ))}
                    </div>
                  </QuestionBlock>

                  <QuestionBlock label="What is the brand of the fabric?">
                    <input
                      type="text"
                      value={formData.brand}
                      disabled={formData.noBrandVisible}
                      onChange={(event) =>
                        updateField("brand", event.target.value)
                      }
                      className="w-full px-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] bg-white disabled:bg-[#f5f5f0]"
                      placeholder="Enter brand name"
                    />

                    <div className="mt-3">
                      <CheckboxOption
                        label="No brand visible"
                        checked={formData.noBrandVisible}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            noBrandVisible: !prev.noBrandVisible,
                            brand: !prev.noBrandVisible ? "" : prev.brand,
                          }))
                        }
                      />
                    </div>
                  </QuestionBlock>
                </>
              )}

              {formData.knowsFabricType === "No" && (
                <QuestionBlock label="How would you describe the fabric?">
                  <FabricChecklist
                    selected={formData.fabricDescription}
                    onToggle={(value) =>
                      toggleListValue("fabricDescription", value)
                    }
                  />
                </QuestionBlock>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-white text-[#6b8e6b] border-2 border-[#6b8e6b] rounded-xl hover:bg-[#f5f5f0] transition-all"
                >
                  Back
                </button>

                <button
                  onClick={() => setStep(4)}
                  disabled={!isStepThreeComplete}
                  className="flex-1 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-7">
              <h7 className="text-2xl text-[#2d4a2d]">Intended Pathway</h7>

              <QuestionBlock label="What would you prefer to do with this item?">
                <div className="grid md:grid-cols-3 gap-3">
                  {pathwayOptions.map((action) => (
                    <button
                      key={action.value}
                      onClick={() => updateAction(action.value)}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        formData.action === action.value
                          ? "border-[#6b8e6b] bg-[#6b8e6b]/10"
                          : "border-[#d4d8d0] hover:border-[#6b8e6b]"
                      }`}
                    >
                      <action.icon className="w-8 h-8 mx-auto mb-3 text-[#5a6f5a]" />
                      <div className="text-[#2d4a2d]">{action.value}</div>
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {formData.action === "Upcycle" && (
                <>
                  <QuestionBlock label="Are you interested in a buyback option (selling the upcycled item)?">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {["Yes", "No"].map((answer) => (
                        <RadioOption
                          key={answer}
                          name="buybackInterest"
                          label={answer}
                          checked={formData.buybackInterest === answer}
                          onChange={() => updateField("buybackInterest", answer)}
                        />
                      ))}
                    </div>
                  </QuestionBlock>

                  {formData.buybackInterest === "Yes" && (
                    <QuestionBlock label="What would you like this item to become?">
                      <textarea
                        value={formData.upcycleRequest}
                        onChange={(event) =>
                          updateField("upcycleRequest", event.target.value)
                        }
                        className="w-full resize-none rounded-xl border-2 border-[#d4d8d0] bg-white px-4 py-3 focus:border-[#6b8e6b]"
                        placeholder="Example: tote bag, pouch, patchwork piece, repaired jacket..."
                        rows={3}
                      />
                    </QuestionBlock>
                  )}
                </>
              )}

              <QuestionBlock label="Description (Optional)">
                <textarea
                  value={formData.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  className="w-full px-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] bg-white resize-none"
                  placeholder="Add any additional details about your textiles..."
                  rows={4}
                />
              </QuestionBlock>

              <QuestionBlock label="Upload Images (Optional)">
                <label
                  htmlFor="submission-images"
                  className="block cursor-pointer rounded-xl border-2 border-dashed border-[#d4d8d0] p-8 text-center transition-colors hover:border-[#6b8e6b]"
                >
                  <Upload className="w-12 h-12 mx-auto mb-3 text-[#5a6f5a]" />
                  <p className="text-[#5a6f5a] mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-[#8a9a8a]">PNG, JPG up to 10MB</p>
                  <input
                    id="submission-images"
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    disabled={isUploading || isSubmitting}
                    onChange={(event) => handleImageUpload(event.target.files)}
                  />
                </label>

                {isUploading && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d4d8d0]">
                    <div
                      className="h-full bg-[#6b8e6b] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                {(uploadError || submitError) && (
                  <div className="mt-3 rounded-xl border border-[#d4a574] bg-[#fff8e8] px-4 py-3 text-sm text-[#7a5427]">
                    {submitError || uploadError}
                  </div>
                )}

                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={preview} className="overflow-hidden rounded-2xl border border-[#dce4da] bg-white shadow-sm">
                        <div className="relative">
                          <img
                          src={preview}
                          alt={`Selected textile ${index + 1}`}
                          className="h-36 w-full object-cover"
                        />
                          <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-lg leading-none text-transparent hover:bg-black"
                          aria-label={`Remove selected image ${index + 1}`}
                        >
                          <X className="h-4 w-4 text-white" />
                          ×
                          </button>
                        </div>
                        <label className="block p-3">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#5f6f67]">
                            Image label
                          </span>
                          <input
                            value={formData.imageLabels[index] || ""}
                            onChange={(event) =>
                              setFormData((prev) => {
                                const labels = [...prev.imageLabels];
                                labels[index] = event.target.value;
                                return { ...prev, imageLabels: labels };
                              })
                            }
                            className="w-full rounded-xl border border-[#dce4da] bg-[#fbfcfa] px-3 py-2 text-sm text-[#19221d] outline-none focus:border-[#336158]"
                            placeholder={`Image ${index + 1} label`}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </QuestionBlock>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-white text-[#6b8e6b] border-2 border-[#6b8e6b] rounded-xl hover:bg-[#f5f5f0] transition-all"
                >
                  Back
                </button>

                <button
                  onClick={() => setStep(5)}
                  disabled={!isStepFourComplete}
                  className="flex-1 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl text-[#2d4a2d]">
                Review Your Submission
              </h2>

              <div className="space-y-4">
                {reviewRows.map(({ label, value, step: rowStep }) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 rounded-xl bg-[#f5f5f0] p-4"
                  >
                    <div>
                      <div className="text-sm text-[#5a6f5a] mb-1">{label}</div>
                      <div className="text-[#2d4a2d]">{value}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (rowStep === 1) {
                          setShowBurnTestResult(false);
                        }

                        setIsReviewEditing(true);
                        setStep(rowStep);
                      }}
                      className="shrink-0 rounded-lg border border-[#d4d8d0] bg-white px-3 py-1.5 text-sm text-[#5a6f5a] hover:border-[#6b8e6b]"
                    >
                      Edit
                    </button>
                  </div>
                ))}

                {formData.description && (
                  <div className="p-4 bg-[#f5f5f0] rounded-xl">
                    <div className="text-sm text-[#5a6f5a] mb-1">
                      Description
                    </div>
                    <div className="text-[#2d4a2d]">
                      {formData.description}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsReviewEditing(false);
                    setStep(4);
                  }}
                  className="flex-1 py-3 bg-white text-[#6b8e6b] border-2 border-[#6b8e6b] rounded-xl hover:bg-[#f5f5f0] transition-all"
                >
                  Back
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUploading}
                  className="flex-1 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg"
                >
                  {isSubmitting || isUploading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
              >
                <div className="w-24 h-24 bg-[#6b8e6b] rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              <h7 className="text-3xl mb-4 text-[#2d4a2d]">
                Submission Successful!
              </h7>

              <p className="text-lg text-[#5a6f5a] mb-2">
                Thank you for contributing to a sustainable future.
              </p>

              <p className="text-[#5a6f5a]">
                We'll review your submission and get back to you soon.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function BurnTestCheckboxPage({
  label,
  description,
  options,
  selected,
  onToggle,
  onBack,
  onNext,
  nextLabel = "Next",
}) {
  return (
    <div className="space-y-6">
      <QuestionBlock label={label}>
        <p className="text-sm text-[#5a6f5a]/80 mb-4">{description}</p>

        <div className="grid md:grid-cols-2 gap-3">
          {options.map((option) => (
            <BurnTestCheckboxOption
              key={option}
              label={option}
              description={burnTestDescriptionMap[option]}
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
            />
          ))}
        </div>
      </QuestionBlock>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-white text-[#6b8e6b] border-2 border-[#6b8e6b] rounded-xl hover:bg-[#f5f5f0] transition-all"
        >
          Back
        </button>

        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-1 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function BurnTestCheckboxOption({ label, description, checked, onChange }) {
  return (
    <label
      className={`cursor-pointer rounded-xl border-2 px-4 py-3 transition-all ${
        checked
          ? "border-[#6b8e6b] bg-[#6b8e6b]/10"
          : "border-[#d4d8d0] hover:border-[#6b8e6b]"
      }`}
    >
      <span className="flex items-center gap-3 text-[#2d4a2d]">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 accent-[#6b8e6b]"
        />
        <span>{label}</span>
      </span>

      <span className="mt-2 block pl-7 text-sm leading-5 text-[#5a6f5a]">
        {description}
      </span>
    </label>
  );
}

function BurnTestRadioOption({ name, label, description, checked, onChange }) {
  return (
    <label
      className={`cursor-pointer rounded-xl border-2 px-4 py-3 transition-all ${
        checked
          ? "border-[#6b8e6b] bg-[#6b8e6b]/10"
          : "border-[#d4d8d0] hover:border-[#6b8e6b]"
      }`}
    >
      <span className="flex items-center gap-3 text-[#2d4a2d]">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 accent-[#6b8e6b]"
        />
        <span>{label}</span>
      </span>

      <span className="mt-2 block pl-7 text-sm leading-5 text-[#5a6f5a]">
        {description}
      </span>
    </label>
  );
}

function QuestionBlock({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-3 text-[#2d4a2d]">
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckboxOption({ label, checked, onChange }) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-[#2d4a2d] transition-all ${
        checked
          ? "border-[#6b8e6b] bg-[#6b8e6b]/10"
          : "border-[#d4d8d0] hover:border-[#6b8e6b]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[#6b8e6b]"
      />
      <span>{label}</span>
    </label>
  );
}

function RadioOption({ name, label, checked, onChange }) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-[#2d4a2d] transition-all ${
        checked
          ? "border-[#6b8e6b] bg-[#6b8e6b]/10"
          : "border-[#d4d8d0] hover:border-[#6b8e6b]"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[#6b8e6b]"
      />
      <span>{label}</span>
    </label>
  );
}

function FabricChecklist({ selected, onToggle }) {
  return (
    <div className="grid gap-3">
      {fabricOptions.map((fabric) => (
        <label
          key={fabric.value}
          className={`cursor-pointer rounded-xl border-2 px-4 py-3 transition-all ${
            selected.includes(fabric.value)
              ? "border-[#6b8e6b] bg-[#6b8e6b]/10"
              : "border-[#d4d8d0] hover:border-[#6b8e6b]"
          }`}
        >
          <span className="flex items-center gap-3 text-[#2d4a2d]">
            <input
              type="checkbox"
              checked={selected.includes(fabric.value)}
              onChange={() => onToggle(fabric.value)}
              className="h-4 w-4 accent-[#6b8e6b]"
            />
            <span>{fabric.value}</span>
          </span>

          <span className="mt-2 block pl-7 text-sm leading-5 text-[#5a6f5a]">
            {fabric.description}
          </span>
        </label>
      ))}
    </div>
  );
}

function SelectedOptionSummary({ selected, descriptionMap }) {
  if (!selected || selected.length === 0) {
    return null;
  }
}
