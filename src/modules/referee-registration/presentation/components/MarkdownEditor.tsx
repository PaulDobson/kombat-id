"use client";

/**
 * MarkdownEditor — WYSIWYG-style markdown editor for non-technical users.
 *
 * Renders a toolbar with formatting buttons (Heading, Bold, Italic, Bullet,
 * Separator, Link) and a live preview panel. The raw markdown value is kept
 * in a hidden <textarea> so it participates in FormData normally.
 *
 * No external dependencies — pure React + Tailwind.
 */

import { useRef, useState, useCallback, useId } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolbarAction {
  label: string;
  title: string;
  icon: React.ReactNode;
  action: (textarea: HTMLTextAreaElement) => void;
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder = "texto",
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end) || placeholder;
  const replacement = `${before}${selected}${after}`;
  const newValue =
    textarea.value.slice(0, start) + replacement + textarea.value.slice(end);
  setNativeValue(textarea, newValue);
  // Restore selection around the inserted text
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + selected.length;
  textarea.focus();
}

function insertLinePrefix(
  textarea: HTMLTextAreaElement,
  prefix: string,
  placeholder = "texto",
) {
  const start = textarea.selectionStart;
  const lineStart = textarea.value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = textarea.value.indexOf("\n", start);
  const end = lineEnd === -1 ? textarea.value.length : lineEnd;
  const line = textarea.value.slice(lineStart, end);

  let newLine: string;
  let cursorOffset: number;

  if (line.startsWith(prefix)) {
    // Toggle off
    newLine = line.slice(prefix.length);
    cursorOffset = -prefix.length;
  } else {
    newLine = line ? `${prefix}${line}` : `${prefix}${placeholder}`;
    cursorOffset = prefix.length;
  }

  const newValue =
    textarea.value.slice(0, lineStart) + newLine + textarea.value.slice(end);
  setNativeValue(textarea, newValue);
  textarea.selectionStart = start + cursorOffset;
  textarea.selectionEnd = start + cursorOffset;
  textarea.focus();
}

function insertAtCursor(textarea: HTMLTextAreaElement, text: string) {
  const start = textarea.selectionStart;
  const newValue =
    textarea.value.slice(0, start) + text + textarea.value.slice(start);
  setNativeValue(textarea, newValue);
  textarea.selectionStart = start + text.length;
  textarea.selectionEnd = start + text.length;
  textarea.focus();
}

/** Trigger React's synthetic onChange by using the native input setter */
function setNativeValue(el: HTMLTextAreaElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  nativeInputValueSetter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// ---------------------------------------------------------------------------
// Markdown → simple HTML preview (no external lib)
// ---------------------------------------------------------------------------

function markdownToHtml(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      if (/^### (.+)/.test(line))
        return `<h5 class="text-sm font-semibold text-neutral-200 mt-3 mb-0.5">${line.slice(4)}</h5>`;
      if (/^## (.+)/.test(line))
        return `<h4 class="text-base font-semibold text-neutral-100 mt-4 mb-1">${line.slice(3)}</h4>`;
      if (/^# (.+)/.test(line))
        return `<h3 class="text-lg font-bold text-white mt-4 mb-1">${line.slice(2)}</h3>`;
      if (/^[-*+] (.+)/.test(line))
        return `<div class="flex gap-2 text-sm text-neutral-300 leading-relaxed"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-neutral-500 shrink-0"></span><span>${inlineHtml(line.slice(2))}</span></div>`;
      if (/^---+$/.test(line.trim()))
        return `<hr class="border-neutral-700 my-3" />`;
      if (line.trim() === "") return `<div class="h-2"></div>`;
      return `<p class="text-sm text-neutral-300 leading-relaxed">${inlineHtml(line)}</p>`;
    })
    .join("");
}

function inlineHtml(text: string): string {
  return text
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="text-neutral-100 font-semibold">$1</strong>',
    )
    .replace(/\*(.+?)\*/g, '<em class="italic text-neutral-200">$1</em>')
    .replace(
      /`(.+?)`/g,
      '<code class="bg-neutral-700 text-neutral-200 px-1 rounded text-xs">$1</code>',
    );
}

// ---------------------------------------------------------------------------
// Toolbar button definitions
// ---------------------------------------------------------------------------

function buildToolbarActions(): ToolbarAction[] {
  return [
    {
      label: "H1",
      title: "Título principal",
      icon: <span className="font-bold text-xs">H1</span>,
      action: (ta) => insertLinePrefix(ta, "# ", "Título"),
    },
    {
      label: "H2",
      title: "Subtítulo",
      icon: <span className="font-bold text-xs">H2</span>,
      action: (ta) => insertLinePrefix(ta, "## ", "Subtítulo"),
    },
    {
      label: "B",
      title: "Negrita",
      icon: <span className="font-bold text-sm">B</span>,
      action: (ta) => wrapSelection(ta, "**", "**", "texto en negrita"),
    },
    {
      label: "I",
      title: "Cursiva",
      icon: <span className="italic text-sm">I</span>,
      action: (ta) => wrapSelection(ta, "*", "*", "texto en cursiva"),
    },
    {
      label: "•",
      title: "Lista con viñetas",
      icon: (
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
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      ),
      action: (ta) => insertLinePrefix(ta, "- ", "elemento de lista"),
    },
    {
      label: "—",
      title: "Separador horizontal",
      icon: <span className="text-sm font-light">—</span>,
      action: (ta) => insertAtCursor(ta, "\n---\n"),
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  error?: string | undefined;
}

export function MarkdownEditor({
  name,
  defaultValue = "",
  disabled,
  error,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorId = useId();
  const toolbarActions = buildToolbarActions();

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
    },
    [],
  );

  function applyAction(action: ToolbarAction["action"]) {
    if (!textareaRef.current || disabled) return;
    action(textareaRef.current);
    // Sync React state after native value mutation
    setValue(textareaRef.current.value);
  }

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap bg-neutral-900 border border-neutral-700 rounded-t-lg px-2 py-1.5">
        {toolbarActions.map((action) => (
          <button
            key={action.label}
            type="button"
            title={action.title}
            disabled={disabled || showPreview}
            onClick={() => applyAction(action.action)}
            className="flex items-center justify-center w-7 h-7 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs"
          >
            {action.icon}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-4 bg-neutral-700 mx-1" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          disabled={disabled}
          className={`flex items-center gap-1 px-2 h-7 rounded text-xs font-medium transition-colors disabled:opacity-40 ${
            showPreview
              ? "bg-neutral-700 text-neutral-100"
              : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
          }`}
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
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {showPreview ? "Editar" : "Vista previa"}
        </button>
      </div>

      {/* Editor / Preview area */}
      <div className="relative">
        {/* Raw textarea (always mounted so FormData works) */}
        <textarea
          ref={textareaRef}
          id={editorId}
          name={name}
          value={value}
          onChange={handleInput}
          disabled={disabled}
          rows={12}
          placeholder={
            "Escribe el contenido aquí...\n\nEjemplos de formato:\n# Título principal\n## Subtítulo\n**texto en negrita**\n*texto en cursiva*\n- elemento de lista"
          }
          className={`w-full px-3 py-3 bg-neutral-800 border border-neutral-700 rounded-b-lg text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50 resize-y font-mono leading-relaxed ${
            showPreview ? "sr-only" : ""
          }`}
        />

        {/* Preview panel */}
        {showPreview && (
          <div
            className="w-full min-h-72 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-b-lg overflow-auto"
            dangerouslySetInnerHTML={{
              __html:
                markdownToHtml(value) ||
                '<p class="text-neutral-600 text-sm">Sin contenido aún.</p>',
            }}
          />
        )}
      </div>

      {/* Hint */}
      {!showPreview && (
        <p className="text-xs text-neutral-600">
          Usa los botones de la barra para dar formato. Haz clic en &ldquo;Vista
          previa&rdquo; para ver el resultado.
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
