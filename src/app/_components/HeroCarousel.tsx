"use client";

import { useState, useEffect, useCallback } from "react";

const SLIDES = [
  {
    tag: "Competencia",
    tagColor: "bg-primary-900/60 text-primary-300 border border-primary-700",
    title: "Compite al más alto nivel",
    subtitle:
      "Torneos nacionales con resultados verificables y ranking en tiempo real.",
    accent: "from-primary-600/30 to-indigo-600/20",
    icon: (
      <svg
        viewBox="0 0 320 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Belt / uniform silhouette */}
        <defs>
          <radialGradient id="glow1" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="body1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="200" rx="140" ry="160" fill="url(#glow1)" />
        {/* Dobok (uniform) */}
        <rect
          x="100"
          y="140"
          width="120"
          height="160"
          rx="8"
          fill="url(#body1)"
          opacity="0.15"
        />
        {/* Head */}
        <circle cx="160" cy="90" r="38" fill="#e2e8f0" opacity="0.2" />
        {/* Belt */}
        <rect
          x="95"
          y="210"
          width="130"
          height="14"
          rx="4"
          fill="#6366f1"
          opacity="0.7"
        />
        {/* Kick pose — leg extended */}
        <path
          d="M160 300 L200 240 L230 200"
          stroke="#e2e8f0"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.18"
        />
        {/* Arms */}
        <path
          d="M100 180 L60 220"
          stroke="#e2e8f0"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.15"
        />
        <path
          d="M220 180 L260 150"
          stroke="#e2e8f0"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.15"
        />
        {/* Stars */}
        {[40, 280, 290, 30, 60, 310].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={[60, 80, 300, 320, 340, 40][i]}
            r="2"
            fill="#818cf8"
            opacity="0.6"
          />
        ))}
        {/* Trophy icon */}
        <path
          d="M140 340 h40 M160 320 v20 M145 310 q-15-20 0-40 h30 q15 20 0 40 z"
          stroke="#fbbf24"
          strokeWidth="2.5"
          fill="none"
          opacity="0.8"
        />
      </svg>
    ),
  },
  {
    tag: "Certificación",
    tagColor: "bg-emerald-900/60 text-emerald-300 border border-emerald-700",
    title: "Certifica tu grado oficialmente",
    subtitle:
      "Certificados digitales verificables con QR. Válidos en cualquier academia del país.",
    accent: "from-emerald-600/25 to-teal-600/15",
    icon: (
      <svg
        viewBox="0 0 320 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="glow2" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="160" cy="200" rx="130" ry="150" fill="url(#glow2)" />
        {/* Certificate */}
        <rect
          x="60"
          y="100"
          width="200"
          height="160"
          rx="12"
          fill="#0f172a"
          stroke="#10b981"
          strokeWidth="1.5"
          opacity="0.9"
        />
        <rect
          x="60"
          y="100"
          width="200"
          height="36"
          rx="12"
          fill="#10b981"
          opacity="0.2"
        />
        {/* Seal */}
        <circle cx="160" cy="118" r="14" fill="#10b981" opacity="0.3" />
        <circle
          cx="160"
          cy="118"
          r="10"
          stroke="#10b981"
          strokeWidth="1.5"
          fill="none"
          opacity="0.7"
        />
        <text
          x="160"
          y="123"
          textAnchor="middle"
          fill="#10b981"
          fontSize="10"
          fontWeight="bold"
          opacity="0.9"
        >
          KT
        </text>
        {/* Lines */}
        {[160, 180, 200, 220].map((y, i) => (
          <rect
            key={i}
            x="85"
            y={y}
            width={i === 0 ? 150 : i === 3 ? 80 : 120}
            height="6"
            rx="3"
            fill="#334155"
            opacity="0.6"
          />
        ))}
        {/* QR placeholder */}
        <rect
          x="85"
          y="235"
          width="50"
          height="50"
          rx="4"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="1"
        />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={90 + c * 11}
              y={240 + r * 11}
              width="8"
              height="8"
              rx="1"
              fill="#6366f1"
              opacity={Math.random() > 0.4 ? 0.7 : 0.1}
            />
          )),
        )}
        {/* Belt ribbon */}
        <path d="M155 290 L160 310 L165 290" fill="#6366f1" opacity="0.8" />
        <circle cx="160" cy="315" r="8" fill="#6366f1" opacity="0.6" />
        <circle cx="160" cy="315" r="5" fill="#818cf8" opacity="0.8" />
      </svg>
    ),
  },
  {
    tag: "Ranking",
    tagColor: "bg-amber-900/60 text-amber-300 border border-amber-700",
    title: "Escala en el ranking nacional",
    subtitle:
      "Tu posición actualizada por grado, edad y peso. Compara tu progreso con practicantes de todo Chile.",
    accent: "from-amber-600/25 to-orange-600/15",
    icon: (
      <svg
        viewBox="0 0 320 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="glow3" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="160" cy="200" rx="130" ry="150" fill="url(#glow3)" />
        {/* Podium */}
        <rect
          x="110"
          y="240"
          width="60"
          height="80"
          rx="4"
          fill="#f59e0b"
          opacity="0.25"
        />
        <rect
          x="60"
          y="270"
          width="55"
          height="50"
          rx="4"
          fill="#94a3b8"
          opacity="0.2"
        />
        <rect
          x="165"
          y="285"
          width="55"
          height="35"
          rx="4"
          fill="#cd7c2f"
          opacity="0.2"
        />
        {/* #1 */}
        <circle cx="140" cy="215" r="22" fill="#f59e0b" opacity="0.2" />
        <circle
          cx="140"
          cy="215"
          r="18"
          stroke="#f59e0b"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        <text
          x="140"
          y="221"
          textAnchor="middle"
          fill="#fbbf24"
          fontSize="16"
          fontWeight="bold"
        >
          #1
        </text>
        {/* #2 */}
        <circle cx="87" cy="248" r="16" fill="#94a3b8" opacity="0.15" />
        <text
          x="87"
          y="253"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="12"
          fontWeight="bold"
        >
          #2
        </text>
        {/* #3 */}
        <circle cx="192" cy="260" r="14" fill="#cd7c2f" opacity="0.15" />
        <text
          x="192"
          y="265"
          textAnchor="middle"
          fill="#d97706"
          fontSize="11"
          fontWeight="bold"
        >
          #3
        </text>
        {/* Bar chart */}
        {[
          { x: 80, h: 60, color: "#6366f1" },
          { x: 110, h: 90, color: "#6366f1" },
          { x: 140, h: 130, color: "#f59e0b" },
          { x: 170, h: 75, color: "#6366f1" },
          { x: 200, h: 50, color: "#6366f1" },
        ].map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={160 - b.h}
            width="22"
            height={b.h}
            rx="3"
            fill={b.color}
            opacity="0.3"
          />
        ))}
        {/* Stars */}
        {[30, 290, 50, 280].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={[100, 120, 300, 310][i]}
            r="2.5"
            fill="#fbbf24"
            opacity="0.5"
          />
        ))}
      </svg>
    ),
  },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrent(index);
      setTimeout(() => setIsAnimating(false), 400);
    },
    [isAnimating],
  );

  const next = useCallback(
    () => goTo((current + 1) % SLIDES.length),
    [current, goTo],
  );

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  const slide = SLIDES[current];

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Slide content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center transition-opacity duration-400 ${isAnimating ? "opacity-0" : "opacity-100"}`}
      >
        {/* Glow bg */}
        <div
          className={`absolute inset-0 bg-linear-to-br ${slide.accent} rounded-3xl blur-2xl opacity-60 pointer-events-none`}
          aria-hidden="true"
        />

        {/* Tag */}
        <span
          className={`relative z-10 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-4 ${slide.tagColor}`}
        >
          {slide.tag}
        </span>

        {/* Illustration */}
        <div className="relative z-10 w-48 h-56 sm:w-56 sm:h-64 drop-shadow-2xl">
          {slide.icon}
        </div>

        {/* Text */}
        <div className="relative z-10 text-center mt-4 px-4 space-y-2">
          <p className="text-base font-bold text-neutral-50 leading-snug">
            {slide.title}
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div className="relative z-10 flex items-center justify-center gap-2 pb-2 pt-4">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Ir a slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 h-2 bg-primary-400"
                : "w-2 h-2 bg-neutral-600 hover:bg-neutral-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
