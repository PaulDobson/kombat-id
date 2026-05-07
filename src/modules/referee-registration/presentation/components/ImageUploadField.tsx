"use client";

import { useState, useRef } from "react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface Props {
  name: string;
  defaultImageUrl?: string | null | undefined;
  disabled?: boolean;
}

export function ImageUploadField({ name, defaultImageUrl, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(
    defaultImageUrl ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(defaultImageUrl ?? null);
      setError(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Solo se aceptan imágenes JPEG, PNG o WebP.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("La imagen no puede superar los 5 MB.");
      e.target.value = "";
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-300">
        Imagen de portada <span className="text-neutral-500">(opcional)</span>
      </label>

      {preview && (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Previsualización de imagen de portada"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setError(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute top-2 right-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
            aria-label="Eliminar imagen"
          >
            ✕
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        id={name}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        onChange={handleChange}
        className="w-full text-sm text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-neutral-700 file:text-neutral-200 hover:file:bg-neutral-600 file:cursor-pointer cursor-pointer disabled:opacity-50"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-neutral-500">JPEG, PNG o WebP · máx. 5 MB</p>
    </div>
  );
}
