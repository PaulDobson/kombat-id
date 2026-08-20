"use client";

import { ROLE_LABELS } from "@/lib/roles";

interface InstructorOption {
  id: string;
  fullName: string;
  rut: string;
  role: string;
}

export function ManageInstructorsPanel({
  current,
}: {
  academyId: string;
  current: InstructorOption[];
}) {
  return (
    <div className="space-y-4">
      {current.length > 0 && (
        <ul className="divide-y divide-neutral-800">
          {current.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <div>
                <span className="text-neutral-100 font-medium">
                  {i.fullName}
                </span>
                <span className="ml-2 text-xs text-neutral-500">
                  {ROLE_LABELS[i.role] ?? i.role} · {i.rut}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
