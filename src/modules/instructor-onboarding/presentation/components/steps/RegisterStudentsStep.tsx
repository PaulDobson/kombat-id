"use client";

import { useState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";
import { RegisterStudentForm } from "@/app/(dashboard)/instructor/RegisterStudentForm";
import type { SessionStudent } from "../types";

interface RegisterStudentsStepProps {
  academyId: string;
  onComplete: (students: SessionStudent[]) => void;
}

export function RegisterStudentsStep({
  academyId,
  onComplete,
}: RegisterStudentsStepProps) {
  const [registeredStudents, setRegisteredStudents] = useState<
    SessionStudent[]
  >([]);

  function handleFormSuccess(result: {
    publicId: string;
    fullName: string;
    email: string;
    temporaryPassword?: string;
  }) {
    // Map the result to SessionStudent and add to registered list
    const newStudent: SessionStudent = {
      practitionerId: result.publicId,
      fullName: result.fullName,
      email: result.email,
      temporaryPassword: result.temporaryPassword || "",
    };

    setRegisteredStudents((prev) => [...prev, newStudent]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-neutral-50 mb-1">
          Registrar alumnos
        </h3>
        <p className="text-sm text-neutral-400">
          Agrega tus alumnos uno a uno. Puedes agregar varios antes de
          continuar.
        </p>
      </div>

      {/* Registered students list */}
      {registeredStudents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
            Alumnos registrados ({registeredStudents.length})
          </p>
          {registeredStudents.map((student) => (
            <div
              key={student.practitionerId}
              className="flex items-center gap-3 px-4 py-2.5 bg-emerald-400/5 border border-emerald-400/20 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  {student.fullName}
                </p>
                <p className="text-xs text-neutral-500">{student.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration form - now using RegisterStudentForm component */}
      <div className="space-y-4 bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Nuevo alumno
        </p>

        <RegisterStudentForm
          academyId={academyId}
          simplifiedMode={true}
          onSuccess={handleFormSuccess}
        />
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onComplete([])}
          className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          Omitir
        </button>
        <button
          type="button"
          disabled={registeredStudents.length === 0}
          onClick={() => onComplete(registeredStudents)}
          className="flex-1 bg-primary-500 hover:bg-primary-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-900 font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          Continuar ({registeredStudents.length})
        </button>
      </div>
    </div>
  );
}
