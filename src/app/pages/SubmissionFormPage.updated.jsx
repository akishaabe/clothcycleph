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
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubmissions } from "../../hooks/useSubmissions";
import { useFileUpload } from "../../hooks/useFileUpload";
import "./SubmissionFormPage.css";

const itemTypes = [
  "Scraps",
  "Big fabric panels (curtains, bedsheets)",
  "Clothes (top, outerwear, bottoms)",
];

const donationItemTypes = ["Top", "Bottoms", "Outerwear"];

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

export function SubmissionFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { createSubmission, isLoading: isSubmitting } = useSubmissions();
  const { uploadMultipleFiles, isLoading: isUploading, error: uploadError, progress } = useFileUpload();

  const selectedService = location.state?.service || "";

  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    itemTypes: [],
    otherItemType: "",
    condition: "",
    cleanliness: "",
    fabric: "",
    description: "",
    action: selectedService,
    imageFiles: [] as File[],
  });

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="mb-4">Please login to submit clothing items</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleListValue = (field: string, value: string) => {
    setFormData((prev) => {
      const values = prev[field];
      const nextValues = values.includes(value)
        ? values.filter((item: string) => item !== value)
        : [...values, value];
      return { ...prev, [field]: nextValues };
    });
  };

  const handleImageUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    try {
      // Show previews
      const previews = await Promise.all(
        fileArray.map(async (file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        })
      );
      setImagePreviews(previews);
      
      // Store files for upload
      updateField("imageFiles", fileArray);
    } catch (error) {
      setSubmitError("Failed to preview images");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      // Validate form
      if (!formData.condition) {
        setSubmitError("Please select item condition");
        return;
      }
      if (!formData.action) {
        setSubmitError("Please select what you want to do with the item");
        return;
      }

      // Upload images first
      let photoUrls: string[] = [];
      if (formData.imageFiles.length > 0) {
        photoUrls = await uploadMultipleFiles(formData.imageFiles);
        if (photoUrls.length === 0) {
          setSubmitError("Failed to upload images");
          return;
        }
      }

      // Create submission
      const result = await createSubmission({
        item_type: formData.itemTypes.join(", ") || formData.otherItemType,
        condition: formData.condition,
        fabric: formData.fabric,
        cleanliness: formData.cleanliness,
        description: formData.description,
        photos: photoUrls,
      });

      if (result) {
        setSubmitSuccess(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (error) {
      setSubmitError((error as Error).message || "Failed to submit");
    }
  };

  if (submitSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-2">Submission Successful!</h2>
          <p className="text-gray-600">Thank you for contributing to ClothCycle</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl font-bold">Submit Clothing Item</h1>
          <div className="w-8" />
        </div>

        {/* Error Alert */}
        {(submitError || uploadError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700">{submitError || uploadError}</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Condition Selection */}
          <div>
            <label className="block text-lg font-semibold mb-3">
              Item Condition
            </label>
            <div className="space-y-2">
              {conditionOptions.map((option) => (
                <label key={option} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="condition"
                    value={option}
                    checked={formData.condition === option}
                    onChange={(e) => updateField("condition", e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Cleanliness Selection */}
          <div>
            <label className="block text-lg font-semibold mb-3">
              Cleanliness
            </label>
            <div className="space-y-2">
              {cleanlinessOptions.map((option) => (
                <label key={option} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="cleanliness"
                    value={option}
                    checked={formData.cleanliness === option}
                    onChange={(e) => updateField("cleanliness", e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fabric Selection */}
          <div>
            <label className="block text-lg font-semibold mb-3">
              Fabric Type (Optional)
            </label>
            <select
              value={formData.fabric}
              onChange={(e) => updateField("fabric", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="">Select fabric type...</option>
              {fabricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-lg font-semibold mb-3">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Add any additional details about the item..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-lg font-semibold mb-3">
              Upload Photos
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="hidden"
                id="image-input"
                disabled={isUploading}
              />
              <label htmlFor="image-input" className="cursor-pointer">
                <p className="text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500">
                  PNG, JPG, WebP up to 5MB
                </p>
              </label>

              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{progress}% uploading...</p>
                </div>
              )}
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                {imagePreviews.map((preview, idx) => (
                  <img
                    key={idx}
                    src={preview}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action Selection */}
          <div>
            <label className="block text-lg font-semibold mb-3">
              What would you like to do?
            </label>
            <div className="space-y-2">
              {["Donate", "Recycle", "Upcycle"].map((action) => (
                <label key={action} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="action"
                    value={action}
                    checked={formData.action === action}
                    onChange={(e) => updateField("action", e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>{action}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isSubmitting || isUploading ? "Submitting..." : "Submit Item"}
          </button>
        </form>
      </div>
    </div>
  );
}
