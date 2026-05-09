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
} from "lucide-react";
import { useState } from "react";
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

export function SubmissionFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedService = location.state?.service || "";
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
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
    description: "",
    images: [],
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
    }));
  };

  const handleSubmit = () => {
    setStep(5);
    setTimeout(() => {
      navigate("/dashboard");
    }, 3000);
  };

  const hasItemTypes =
    formData.itemTypes.length > 0 &&
    (!formData.itemTypes.includes("Other") || formData.otherItemType.trim());
  const isStepOneComplete =
    hasItemTypes &&
    formData.condition &&
    formData.cleanliness &&
    formData.quantity;
  const isStepTwoComplete =
    formData.knowsFabricType === "Yes"
      ? formData.fabricTypes.length > 0 &&
        formData.fabricIdentification.length > 0 &&
        (formData.noBrandVisible || formData.brand.trim())
      : formData.knowsFabricType === "No" &&
        formData.fabricDescription.length > 0;
  const isStepThreeComplete =
    formData.action &&
    (formData.action !== "Upcycle" || formData.buybackInterest);

  const reviewRows = [
    ["Item Type", formData.itemTypes.join(", ")],
    ["Condition", formData.condition],
    ["Cleanliness", formData.cleanliness],
    ["Quantity", `${formData.quantity} items`],
    ["Fabric Type Known", formData.knowsFabricType],
    [
      "Fabric Type",
      formData.knowsFabricType === "Yes"
        ? formData.fabricTypes.join(", ")
        : formData.fabricDescription.join(", "),
    ],
    ["Fabric Identified By", formData.fabricIdentification.join(", ")],
    ["Brand", formData.noBrandVisible ? "No brand visible" : formData.brand],
    ["Intended Pathway", formData.action],
    ["Buyback Interest", formData.buybackInterest],
  ].filter(([, value]) => value);

  return (
    <div className="submission-page app-darkable-page min-h-screen bg-gradient-to-br from-[#f5f5f0] to-[#e8ebe4]">
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
            {[1, 2, 3, 4].map((num) => (
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
                {num < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      step > num ? "bg-[#6b8e6b]" : "bg-[#d4d8d0]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 text-center text-sm text-[#5a6f5a]">
            <span>Items</span>
            <span>Fabric</span>
            <span>Pathway</span>
            <span>Review</span>
          </div>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-2xl shadow-lg"
        >
          {step === 1 && (
            <div className="space-y-7">
              <h2 className="text-2xl text-[#2d4a2d]">Item Details</h2>

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

              <button
                onClick={() => setStep(2)}
                disabled={!isStepOneComplete}
                className="w-full py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7">
              <h2 className="text-2xl text-[#2d4a2d]">Fabric Details</h2>

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
              <h2 className="text-2xl text-[#2d4a2d]">Intended Pathway</h2>

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
                <QuestionBlock label="Are you interested in a buyback option (selling the upcycled item)?">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {["Yes", "No"].map((answer) => (
                      <RadioOption
                        key={answer}
                        name="buybackInterest"
                        label={answer}
                        checked={formData.buybackInterest === answer}
                        onChange={() =>
                          updateField("buybackInterest", answer)
                        }
                      />
                    ))}
                  </div>
                </QuestionBlock>
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
                <div className="border-2 border-dashed border-[#d4d8d0] rounded-xl p-8 text-center hover:border-[#6b8e6b] transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-[#5a6f5a]" />
                  <p className="text-[#5a6f5a] mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-[#8a9a8a]">PNG, JPG up to 10MB</p>
                </div>
              </QuestionBlock>

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
            <div className="space-y-6">
              <h2 className="text-2xl text-[#2d4a2d]">
                Review Your Submission
              </h2>

              <div className="space-y-4">
                {reviewRows.map(([label, value]) => (
                  <div key={label} className="p-4 bg-[#f5f5f0] rounded-xl">
                    <div className="text-sm text-[#5a6f5a] mb-1">{label}</div>
                    <div className="text-[#2d4a2d]">{value}</div>
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
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-white text-[#6b8e6b] border-2 border-[#6b8e6b] rounded-xl hover:bg-[#f5f5f0] transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
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
              <h2 className="text-3xl mb-4 text-[#2d4a2d]">
                Submission Successful!
              </h2>
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
