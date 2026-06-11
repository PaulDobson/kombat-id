"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Building2, Users } from "lucide-react";
import { AcademySection } from "./AcademySection";
import { RegisterStudentModal } from "./RegisterStudentModal";

interface Academy {
  id: string;
  name: string;
  region: string;
  city: string;
  is_active: boolean;
}

interface Props {
  academies: Academy[];
  /** The StudentSection is passed as a server-rendered slot */
  studentSection: React.ReactNode;
  defaultTab?: "academies" | "students";
}

export function DashboardTabs({
  academies,
  studentSection,
  defaultTab = "academies",
}: Props) {
  return (
    <Tabs.Root defaultValue={defaultTab} className="space-y-0">
      {/* Tab list */}
      <Tabs.List className="flex items-center gap-0 border-b border-neutral-800 bg-neutral-900/50 rounded-t-2xl px-1 pt-1">
        <Tabs.Trigger
          value="academies"
          className="
            group relative flex items-center gap-2 px-4 py-3 text-sm font-medium
            text-neutral-400 hover:text-neutral-200
            data-[state=active]:text-neutral-50
            transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-950 rounded-t-lg
          "
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span>Academias</span>
          {/* Active indicator */}
          <span
            className="
            absolute bottom-0 left-0 right-0 h-0.5 rounded-full
            bg-transparent group-data-[state=active]:bg-primary-500
            transition-colors
          "
          />
        </Tabs.Trigger>

        <Tabs.Trigger
          value="students"
          className="
            group relative flex items-center gap-2 px-4 py-3 text-sm font-medium
            text-neutral-400 hover:text-neutral-200
            data-[state=active]:text-neutral-50
            transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-950 rounded-t-lg
          "
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Alumnos</span>
          <span
            className="
            absolute bottom-0 left-0 right-0 h-0.5 rounded-full
            bg-transparent group-data-[state=active]:bg-primary-500
            transition-colors
          "
          />
        </Tabs.Trigger>
      </Tabs.List>

      {/* Tab panels */}
      <Tabs.Content
        value="academies"
        className="outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-b-2xl pt-6"
      >
        <AcademySection academies={academies} />
      </Tabs.Content>

      <Tabs.Content
        value="students"
        className="outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-b-2xl pt-6"
      >
        {/* "Registrar alumno" button prominently placed at the top of the Students tab */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-neutral-400">
            Gestiona y registra los alumnos de tu academia
          </p>
          <RegisterStudentModal />
        </div>
        {studentSection}
      </Tabs.Content>
    </Tabs.Root>
  );
}
