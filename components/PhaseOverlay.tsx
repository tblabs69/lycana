"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface PhaseOverlayProps {
  text: string;
  type: "night" | "dawn" | "debate";
  onDone: () => void;
}

const CONFIG: Record<string, { bg: string; icon: string; color: string }> = {
  night: {
    bg: "linear-gradient(170deg, #03030f 0%, #0a0a2e 50%, #050520 100%)",
    icon: "\u{1F319}",
    color: "#c8d0f0",
  },
  dawn: {
    bg: "linear-gradient(170deg, #1a1005 0%, #2a1808 50%, #1a0f05 100%)",
    icon: "\u2600\uFE0F",
    color: "#d4a843",
  },
  debate: {
    bg: "linear-gradient(170deg, #0f0a1a 0%, #1a0f2e 50%, #1e1232 100%)",
    icon: "\u{1F4AC}",
    color: "#c4b5fd",
  },
};

export default function PhaseOverlay({ text, type, onDone }: PhaseOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const c = CONFIG[type] || CONFIG.night;

  const advance = useCallback(() => {
    if (!showButton) return;
    onDoneRef.current();
  }, [showButton]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => setShowButton(true), 1500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  // Keyboard: Space/Enter to advance
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance]);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center px-8 cursor-pointer"
      style={{
        background: c.bg,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.7s ease",
      }}
      onClick={advance}
    >
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.9)",
          transition: "all 0.8s ease 0.2s",
        }}
      >
        <div className="text-5xl sm:text-6xl text-center mb-6">{c.icon}</div>
      </div>
      <p
        className="font-display text-lg sm:text-xl md:text-2xl text-center max-w-lg leading-relaxed"
        style={{
          color: c.color,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(15px)",
          transition: "all 0.8s ease 0.4s",
        }}
      >
        {text}
      </p>

      {/* Suivant button */}
      <div
        className="mt-10"
        style={{
          opacity: showButton ? 1 : 0,
          transform: showButton ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.5s ease",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            advance();
          }}
          className="px-6 py-2.5 rounded-xl font-display text-sm tracking-widest hover:scale-105 active:scale-95 transition-all"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          SUIVANT ▶
        </button>
        <p className="text-center text-gray-600 text-xs mt-2">Espace / tap</p>
      </div>
    </div>
  );
}
