"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Avatar from "@radix-ui/react-avatar";
import * as Separator from "@radix-ui/react-separator";
import * as Label from "@radix-ui/react-label";
import * as Progress from "@radix-ui/react-progress";
import { cn } from "@/lib/cn";

// ─── Sección wrapper ────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider border-b border-neutral-700 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const [switchOn, setSwitchOn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [progress] = useState(68);

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="min-h-screen bg-neutral-950 text-neutral-50">
        {/* Header */}
        <header className="border-b border-neutral-800 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Design System
            </h1>
            <p className="text-sm text-neutral-400 mt-0.5">
              Kombat Taekwondo Identity — componentes UI
            </p>
          </div>
          <span className="text-xs bg-primary-900/50 text-primary-400 border border-primary-800 px-2.5 py-1 rounded-full">
            Tailwind v4 · Radix UI
          </span>
        </header>

        <main className="max-w-5xl mx-auto px-8 py-12 space-y-16">
          {/* ── COLORES ─────────────────────────────────────────────────── */}
          <Section title="Paleta de colores">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                {
                  label: "Primary",
                  swatches: [
                    "bg-primary-400",
                    "bg-primary-500",
                    "bg-primary-600",
                    "bg-primary-700",
                  ],
                },
                {
                  label: "Success",
                  swatches: [
                    "bg-success-400",
                    "bg-success-500",
                    "bg-success-600",
                  ],
                },
                {
                  label: "Error",
                  swatches: ["bg-error-400", "bg-error-500", "bg-error-600"],
                },
                {
                  label: "Warning",
                  swatches: [
                    "bg-warning-400",
                    "bg-warning-500",
                    "bg-warning-600",
                  ],
                },
              ].map(({ label, swatches }) => (
                <div key={label} className="space-y-2">
                  <p className="text-xs text-neutral-400">{label}</p>
                  <div className="flex gap-1">
                    {swatches.map((s) => (
                      <div key={s} className={cn("h-8 flex-1 rounded", s)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1 mt-2">
              {[
                "bg-neutral-950",
                "bg-neutral-900",
                "bg-neutral-800",
                "bg-neutral-700",
                "bg-neutral-600",
                "bg-neutral-500",
                "bg-neutral-400",
                "bg-neutral-300",
                "bg-neutral-200",
                "bg-neutral-100",
                "bg-neutral-50",
              ].map((s) => (
                <div key={s} className={cn("h-8 flex-1 rounded", s)} />
              ))}
            </div>
          </Section>

          {/* ── TIPOGRAFÍA ──────────────────────────────────────────────── */}
          <Section title="Tipografía">
            <div className="space-y-3">
              <p className="text-4xl font-bold tracking-tight">
                Heading 4xl bold
              </p>
              <p className="text-2xl font-semibold tracking-tight">
                Heading 2xl semibold
              </p>
              <p className="text-xl font-semibold">Heading xl semibold</p>
              <p className="text-lg font-medium">Heading lg medium</p>
              <p className="text-base text-neutral-200">
                Body base — texto principal del contenido
              </p>
              <p className="text-sm text-neutral-400">
                Body sm — texto secundario y descripciones
              </p>
              <p className="text-xs text-neutral-500">
                Caption xs — metadatos y etiquetas
              </p>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Label uppercase
              </p>
            </div>
          </Section>

          {/* ── BOTONES ─────────────────────────────────────────────────── */}
          <Section title="Botones">
            <div className="flex flex-wrap gap-3 items-center">
              <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Primario
              </button>
              <button className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Secundario
              </button>
              <button className="bg-error-600 hover:bg-error-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Destructivo
              </button>
              <button className="hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 px-4 py-2 rounded-lg text-sm transition-colors">
                Ghost
              </button>
              <button
                disabled
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
              >
                Deshabilitado
              </button>
            </div>
          </Section>

          {/* ── BADGES ──────────────────────────────────────────────────── */}
          <Section title="Badges y estados">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="bg-success-900/50 text-success-400 border border-success-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                Activo
              </span>
              <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                Inactivo
              </span>
              <span className="bg-primary-900/50 text-primary-400 border border-primary-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                Cinturón Negro
              </span>
              <span className="bg-warning-500/10 text-warning-400 border border-warning-500/30 px-2.5 py-0.5 rounded-full text-xs font-medium">
                Pendiente
              </span>
              <span className="bg-error-500/10 text-error-400 border border-error-500/30 px-2.5 py-0.5 rounded-full text-xs font-medium">
                Revocada
              </span>
            </div>
          </Section>

          {/* ── CARDS ───────────────────────────────────────────────────── */}
          <Section title="Cards">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  title: "Practicantes",
                  value: "142",
                  sub: "+12 este mes",
                  color: "text-primary-400",
                },
                {
                  title: "Certificaciones",
                  value: "89",
                  sub: "3 pendientes",
                  color: "text-success-400",
                },
                {
                  title: "Eventos",
                  value: "7",
                  sub: "Próximo: 15 Jul",
                  color: "text-warning-400",
                },
              ].map(({ title, value, sub, color }) => (
                <div
                  key={title}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl p-6"
                >
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    {title}
                  </p>
                  <p
                    className={cn(
                      "text-3xl font-bold mt-2 tracking-tight",
                      color,
                    )}
                  >
                    {value}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">{sub}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── FORMULARIO ──────────────────────────────────────────────── */}
          <Section title="Formulario">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md space-y-4">
              <div className="space-y-1">
                <Label.Root
                  htmlFor="nombre"
                  className="block text-sm font-medium text-neutral-300"
                >
                  Nombre completo
                </Label.Root>
                <input
                  id="nombre"
                  type="text"
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                />
              </div>
              <div className="space-y-1">
                <Label.Root
                  htmlFor="grado"
                  className="block text-sm font-medium text-neutral-300"
                >
                  Grado
                </Label.Root>
                <Select.Root>
                  <Select.Trigger
                    id="grado"
                    className="w-full flex items-center justify-between px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <Select.Value placeholder="Seleccionar grado..." />
                    <Select.Icon className="text-neutral-400">▾</Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
                      <Select.Viewport className="p-1">
                        {[
                          "Blanco",
                          "Amarillo",
                          "Verde",
                          "Azul",
                          "Rojo",
                          "Negro",
                        ].map((g) => (
                          <Select.Item
                            key={g}
                            value={g.toLowerCase()}
                            className="px-3 py-2 text-sm text-neutral-200 rounded-md hover:bg-neutral-800 cursor-pointer outline-none data-highlighted:bg-neutral-800"
                          >
                            <Select.ItemText>{g}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
              <div className="space-y-1">
                <Label.Root
                  htmlFor="email-error"
                  className="block text-sm font-medium text-neutral-300"
                >
                  Email (con error)
                </Label.Root>
                <input
                  id="email-error"
                  type="email"
                  defaultValue="correo-invalido"
                  className="w-full px-3 py-2 bg-neutral-800 border border-error-500 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-error-500"
                />
                <p className="text-xs text-error-400" role="alert">
                  Ingresa un correo electrónico válido
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox.Root
                  id="terms"
                  checked={checked}
                  onCheckedChange={(v) => setChecked(v === true)}
                  className="w-4 h-4 bg-neutral-800 border border-neutral-600 rounded data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600 flex items-center justify-center"
                >
                  <Checkbox.Indicator className="text-white text-xs">
                    ✓
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <Label.Root
                  htmlFor="terms"
                  className="text-sm text-neutral-300 cursor-pointer"
                >
                  Acepto los términos y condiciones
                </Label.Root>
              </div>
              <button className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Registrar practicante
              </button>
            </div>
          </Section>

          {/* ── TABS ────────────────────────────────────────────────────── */}
          <Section title="Tabs">
            <Tabs.Root defaultValue="perfil">
              <Tabs.List className="flex border-b border-neutral-700 gap-1">
                {["perfil", "historial", "ranking", "certificaciones"].map(
                  (tab) => (
                    <Tabs.Trigger
                      key={tab}
                      value={tab}
                      className="px-4 py-2.5 text-sm text-neutral-400 hover:text-neutral-200 capitalize transition-colors data-[state=active]:text-primary-400 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=active]:-mb-px"
                    >
                      {tab}
                    </Tabs.Trigger>
                  ),
                )}
              </Tabs.List>
              <Tabs.Content value="perfil" className="pt-6">
                <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 flex items-start gap-4">
                  <Avatar.Root className="w-14 h-14 rounded-full overflow-hidden shrink-0">
                    <Avatar.Image src="" alt="Practicante" />
                    <Avatar.Fallback className="w-full h-full bg-primary-700 flex items-center justify-center text-sm font-semibold text-white">
                      JP
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <div className="space-y-1">
                    <p className="font-semibold text-neutral-50">Juan Pérez</p>
                    <p className="text-sm text-neutral-400">
                      12.345.678-9 · Cinturón Negro 1° Dan
                    </p>
                    <span className="inline-flex bg-success-900/50 text-success-400 border border-success-800 px-2 py-0.5 rounded-full text-xs font-medium">
                      Activo
                    </span>
                  </div>
                </div>
              </Tabs.Content>
              <Tabs.Content value="historial" className="pt-6">
                <p className="text-sm text-neutral-500 text-center py-8">
                  Sin entradas en el historial.
                </p>
              </Tabs.Content>
              <Tabs.Content value="ranking" className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">
                      Posición en categoría
                    </span>
                    <span className="font-semibold text-neutral-100">
                      #3 de 24
                    </span>
                  </div>
                  <Progress.Root className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <Progress.Indicator
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </Progress.Root>
                  <p className="text-xs text-neutral-500">
                    {progress} puntos acumulados
                  </p>
                </div>
              </Tabs.Content>
              <Tabs.Content value="certificaciones" className="pt-6">
                <p className="text-sm text-neutral-500 text-center py-8">
                  Sin certificaciones emitidas.
                </p>
              </Tabs.Content>
            </Tabs.Root>
          </Section>

          {/* ── CONTROLES ───────────────────────────────────────────────── */}
          <Section title="Controles">
            <div className="flex flex-wrap gap-8 items-center">
              <div className="flex items-center gap-3">
                <Switch.Root
                  checked={switchOn}
                  onCheckedChange={setSwitchOn}
                  className="w-10 h-6 bg-neutral-700 rounded-full data-[state=checked]:bg-primary-600 transition-colors"
                >
                  <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow translate-x-1 data-[state=checked]:translate-x-5 transition-transform" />
                </Switch.Root>
                <span className="text-sm text-neutral-300">
                  Notificaciones {switchOn ? "activadas" : "desactivadas"}
                </span>
              </div>

              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    aria-label="Ver información"
                    className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 text-sm transition-colors"
                  >
                    ?
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-200 shadow-lg"
                    sideOffset={6}
                  >
                    Este es un tooltip de ejemplo
                    <Tooltip.Arrow className="fill-neutral-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </Section>

          {/* ── SEPARADOR ───────────────────────────────────────────────── */}
          <Separator.Root className="bg-neutral-700 h-px" />

          {/* ── DIALOG ──────────────────────────────────────────────────── */}
          <Section title="Dialog / Modal">
            <Dialog.Root>
              <Dialog.Trigger className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Abrir modal de ejemplo
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 data-[state=open]:animate-fade-in" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-6 w-full max-w-md data-[state=open]:animate-scale-in">
                  <Dialog.Title className="text-lg font-semibold text-neutral-50">
                    Confirmar acción
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-neutral-400 mt-2">
                    ¿Estás seguro de que deseas desactivar este practicante?
                    Esta acción quedará registrada en el log de auditoría.
                  </Dialog.Description>
                  <div className="flex justify-end gap-3 mt-6">
                    <Dialog.Close className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Cancelar
                    </Dialog.Close>
                    <Dialog.Close className="bg-error-600 hover:bg-error-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Desactivar
                    </Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </Section>

          {/* ── ESTADOS VACÍO / CARGA ───────────────────────────────────── */}
          <Section title="Estados">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 text-center">
                <p className="text-neutral-500 text-sm">Sin resultados</p>
                <p className="text-xs text-neutral-600 mt-1">Estado vacío</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-3">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2" />
                  <div className="h-3 bg-neutral-800 rounded w-5/6" />
                </div>
                <p className="text-xs text-neutral-600 text-center">
                  Skeleton / cargando
                </p>
              </div>
              <div className="bg-neutral-900 border border-error-500/30 rounded-xl p-6">
                <p className="text-error-400 text-sm font-medium" role="alert">
                  Error al cargar datos
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Intenta nuevamente más tarde
                </p>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </Tooltip.Provider>
  );
}
