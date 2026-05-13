import { motion } from "motion/react";
import { Recycle, Sparkles } from "lucide-react";

export function BrandLoadingScreen({
  title = "ClothCycle PH",
  message = "Preparing your workspace...",
  detail = "Just a moment while we organize the textile flow.",
  tone = "user",
}) {
  const accent = tone === "partner" ? "#4f6f9f" : "#336158";
  const soft = tone === "partner" ? "#eff6ff" : "#f3f5f2";

  return (
    <div className="app-darkable-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_#e7ebe6,_transparent_28%),linear-gradient(135deg,#f8faf6,#f3f5f2,#e7ebe6)] px-6 text-[#19221d]">
      <div className="absolute right-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-[#d4a373]/15 blur-[110px]" />
      <div className="absolute bottom-[-160px] left-[-130px] h-[360px] w-[360px] rounded-full bg-[#336158]/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-xl text-center"
      >
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/70 shadow-[0_18px_50px_rgba(25,34,29,0.14)]"
          style={{ background: soft }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Recycle className="h-10 w-10" style={{ color: accent }} />
          </motion.div>
        </div>

        <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#5f6f67]">
          <Sparkles className="h-4 w-4" style={{ color: accent }} />
          ClothCycle PH
        </div>

        <h1 className="font-gloock text-4xl text-[#19221d] md:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#5f6f67]">
          {message}
        </p>
        <p className="mt-2 text-sm text-[#7d8a82]">{detail}</p>

        <div className="mx-auto mt-8 h-2 max-w-xs overflow-hidden rounded-full bg-white/80">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accent }}
            initial={{ x: "-100%" }}
            animate={{ x: "115%" }}
            transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
