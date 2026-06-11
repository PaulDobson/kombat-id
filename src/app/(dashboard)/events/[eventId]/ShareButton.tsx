"use client";

import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
    >
      {copied ? (
        <>
          <span aria-hidden="true">✓</span>
          ¡Enlace copiado!
        </>
      ) : (
        <>
          <span aria-hidden="true">🔗</span>
          Compartir evento
        </>
      )}
    </button>
  );
}
