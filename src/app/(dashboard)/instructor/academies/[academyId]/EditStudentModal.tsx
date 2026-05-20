"use client";

import { useState, useEffect } from "react";
import { EditStudentForm } from "../../students/[id]/edit/EditStudentForm";

interface StudentData {
  id: string;
  fullName: string;
  weightKg: number | null;
  heightCm: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressRegion: string | null;
}

export function EditStudentModal({ student }: { student: StudentData }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700/60 transition-colors"
        title="Editar alumno"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-xl my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-700/60 border border-neutral-600/50 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 text-neutral-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-50">
                    Editar alumno
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs">
                    {student.fullName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                aria-label="Cerrar"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Formulario */}
            <div className="px-6 py-6">
              <EditStudentForm
                student={{
                  publicId: student.id,
                  weightKg: student.weightKg,
                  heightCm: student.heightCm,
                  contactPhone: student.contactPhone,
                  contactEmail: student.contactEmail,
                  addressStreet: student.addressStreet,
                  addressCity: student.addressCity,
                  addressRegion: student.addressRegion,
                }}
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
