import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

const normalizeImage = (image, index) => {
  if (typeof image === "string") {
    return { url: image, label: `Image ${index + 1}` };
  }

  return {
    url: image?.url || image?.src || "",
    label: image?.label || `Image ${index + 1}`,
  };
};

export function ImageCarousel({ images = [], title = "Images", allowDownload = false }) {
  const normalizedImages = useMemo(
    () => images.map(normalizeImage).filter((image) => image.url),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  if (normalizedImages.length === 0) {
    return null;
  }

  const activeImage = normalizedImages[Math.min(activeIndex, normalizedImages.length - 1)];
  const move = (direction) => {
    setActiveIndex((current) =>
      (current + direction + normalizedImages.length) % normalizedImages.length
    );
  };

  return (
    <div className="rounded-2xl border border-[#dce4da] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#19221d]">{title}</h3>
        <span className="rounded-full bg-[#f3f5f2] px-3 py-1 text-xs text-[#5f6f67]">
          {normalizedImages.length} file{normalizedImages.length === 1 ? "" : "s"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsViewerOpen(true)}
        className="group relative block w-full overflow-hidden rounded-xl bg-[#f3f5f2]"
      >
        <img
          src={activeImage.url}
          alt={activeImage.label}
          className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 text-left text-white">
          <div className="font-semibold">{activeImage.label}</div>
          <div className="text-xs opacity-80">Click to view gallery</div>
        </div>
      </button>

      {normalizedImages.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {normalizedImages.slice(0, 8).map((image, index) => (
            <button
              type="button"
              key={`${image.url}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-lg border ${
                activeIndex === index ? "border-[#336158]" : "border-[#dce4da]"
              }`}
            >
              <img src={image.url} alt={image.label} className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {isViewerOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dce4da] p-4">
              <div>
                <div className="font-semibold text-[#19221d]">{activeImage.label}</div>
                <div className="text-sm text-[#5f6f67]">
                  {activeIndex + 1} of {normalizedImages.length}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {allowDownload && (
                  <a
                    href={activeImage.url}
                    download
                    className="rounded-xl bg-[#f3f5f2] p-2 text-[#336158] hover:bg-[#e7ebe6]"
                    aria-label="Download image"
                    title="Download image"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsViewerOpen(false)}
                  className="rounded-xl bg-[#f3f5f2] p-2 text-[#5f6f67] hover:bg-[#e7ebe6]"
                  aria-label="Close image viewer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="relative bg-black">
              <img
                src={activeImage.url}
                alt={activeImage.label}
                className="max-h-[72vh] w-full object-contain"
              />
              {normalizedImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => move(-1)}
                    className="absolute left-4 top-1/2 rounded-full bg-white/90 p-3 text-[#19221d] shadow-lg"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(1)}
                    className="absolute right-4 top-1/2 rounded-full bg-white/90 p-3 text-[#19221d] shadow-lg"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
