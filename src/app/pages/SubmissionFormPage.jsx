import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Recycle, ArrowLeft, Upload, CheckCircle, Shirt, Package, Trash2 } from "lucide-react";
import { useState } from "react";
import "./SubmissionFormPage.css";

export function SubmissionFormPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    textileType: "",
    condition: "",
    quantity: "",
    action: "",
    description: "",
    images: []
  });

  const handleSubmit = () => {
    setStep(4);
    setTimeout(() => {
      navigate("/dashboard");
    }, 3000);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="submission-page app-darkable-page min-h-screen bg-gradient-to-br from-[#f5f5f0] to-[#e8ebe4]">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-[#d4d8d0] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="w-10 h-10 rounded-full bg-[#f5f5f0] flex items-center justify-center hover:bg-[#e8ebe4] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#5a6f5a]" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <Recycle className="w-6 h-6 text-[#6b8e6b]" />
              <span className="text-xl text-[#2d4a2d] font-gloock">ClothCycle PH</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl mb-2 text-[#2d4a2d]">Textile Submission</h1>
          <p className="text-lg text-[#5a6f5a]">Help us give your textiles a second life</p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step >= num ? "bg-[#6b8e6b] text-white" : "bg-white text-[#5a6f5a] border-2 border-[#d4d8d0]"
                  }`}
                >
                  {step > num ? <CheckCircle className="w-5 h-5" /> : num}
                </div>
                {num < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      step > num ? "bg-[#6b8e6b]" : "bg-[#d4d8d0]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-[#5a6f5a]">
            <span>Item Details</span>
            <span>Additional Info</span>
            <span>Review</span>
          </div>
        </div>

        {/* Form Content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-2xl shadow-lg"
        >
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl mb-6 text-[#2d4a2d]">Item Details</h2>

              <div>
                <label className="block text-sm mb-3 text-[#2d4a2d]">Type of Textile</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {["Clothing", "Bedding", "Towels", "Curtains", "Bags", "Other"].map((type) => (
                    <button
                      key={type}
                      onClick={() => updateField("textileType", type)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.textileType === type
                          ? "border-[#6b8e6b] bg-[#6b8e6b]/10 text-[#2d4a2d]"
                          : "border-[#d4d8d0] text-[#5a6f5a] hover:border-[#6b8e6b]"
                      }`}
                    >
                      <Shirt className="w-6 h-6 mx-auto mb-2" />
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-3 text-[#2d4a2d]">Condition</label>
                <div className="grid grid-cols-3 gap-3">
                  {["New", "Used", "Damaged"].map((condition) => (
                    <button
                      key={condition}
                      onClick={() => updateField("condition", condition)}
                      className={`py-3 px-4 rounded-xl border-2 transition-all ${
                        formData.condition === condition
                          ? "border-[#6b8e6b] bg-[#6b8e6b]/10 text-[#2d4a2d]"
                          : "border-[#d4d8d0] text-[#5a6f5a] hover:border-[#6b8e6b]"
                      }`}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-[#2d4a2d]">Quantity (items)</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => updateField("quantity", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white"
                  placeholder="Enter number of items"
                  min="1"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!formData.textileType || !formData.condition || !formData.quantity}
                className="w-full py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl mb-6 text-[#2d4a2d]">Additional Information</h2>

              <div>
                <label className="block text-sm mb-3 text-[#2d4a2d]">Preferred Action</label>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { value: "Recycle", icon: Recycle, color: "#6b8e6b" },
                    { value: "Donate", icon: Package, color: "#8fa08f" },
                    { value: "Upcycle", icon: Trash2, color: "#a8c9a8" }
                  ].map((action) => (
                    <button
                      key={action.value}
                      onClick={() => updateField("action", action.value)}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        formData.action === action.value
                          ? "border-[#6b8e6b] bg-[#6b8e6b]/10"
                          : "border-[#d4d8d0] hover:border-[#6b8e6b]"
                      }`}
                    >
                      <action.icon
                        className="w-8 h-8 mx-auto mb-3"
                        style={{ color: formData.action === action.value ? action.color : "#5a6f5a" }}
                      />
                      <div className="text-[#2d4a2d]">{action.value}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-[#2d4a2d]">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#d4d8d0] rounded-xl focus:border-[#6b8e6b] focus:outline-none transition-colors bg-white resize-none"
                  placeholder="Add any additional details about your textiles..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-[#2d4a2d]">Upload Images (Optional)</label>
                <div className="border-2 border-dashed border-[#d4d8d0] rounded-xl p-8 text-center hover:border-[#6b8e6b] transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-[#5a6f5a]" />
                  <p className="text-[#5a6f5a] mb-1">Click to upload or drag and drop</p>
                  <p className="text-sm text-[#8a9a8a]">PNG, JPG up to 10MB</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-white text-[#6b8e6b] border-2 border-[#6b8e6b] rounded-xl hover:bg-[#f5f5f0] transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!formData.action}
                  className="flex-1 py-3 bg-[#6b8e6b] text-white rounded-xl hover:bg-[#5a7a5a] transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl mb-6 text-[#2d4a2d]">Review Your Submission</h2>

              <div className="space-y-4">
                <div className="p-4 bg-[#f5f5f0] rounded-xl">
                  <div className="text-sm text-[#5a6f5a] mb-1">Textile Type</div>
                  <div className="text-[#2d4a2d]">{formData.textileType}</div>
                </div>

                <div className="p-4 bg-[#f5f5f0] rounded-xl">
                  <div className="text-sm text-[#5a6f5a] mb-1">Condition</div>
                  <div className="text-[#2d4a2d]">{formData.condition}</div>
                </div>

                <div className="p-4 bg-[#f5f5f0] rounded-xl">
                  <div className="text-sm text-[#5a6f5a] mb-1">Quantity</div>
                  <div className="text-[#2d4a2d]">{formData.quantity} items</div>
                </div>

                <div className="p-4 bg-[#f5f5f0] rounded-xl">
                  <div className="text-sm text-[#5a6f5a] mb-1">Preferred Action</div>
                  <div className="text-[#2d4a2d]">{formData.action}</div>
                </div>

                {formData.description && (
                  <div className="p-4 bg-[#f5f5f0] rounded-xl">
                    <div className="text-sm text-[#5a6f5a] mb-1">Description</div>
                    <div className="text-[#2d4a2d]">{formData.description}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
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

          {step === 4 && (
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
              <h2 className="text-3xl mb-4 text-[#2d4a2d]">Submission Successful!</h2>
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
