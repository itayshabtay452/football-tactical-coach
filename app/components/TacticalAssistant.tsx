"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Radar,
  Loader2,
  FileText,
  Printer,
  Copy,
  CheckCheck,
  ShieldCheck,
  Swords,
  Users,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

type FormState = {
  opponent: string;
  formation: string;
  offensiveStyle: string;
  defensiveStyle: string;
};

const FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "5-4-1", "4-2-3-1"];
const OFFENSIVE_STYLES = [
  "Counter-attack",
  "Possession",
  "Long ball",
  "High Press",
];
const DEFENSIVE_STYLES = [
  "Low Block",
  "High Line",
  "Man-marking",
  "Zonal",
];

function SelectField({
  label,
  icon,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-navy-deep)] px-4 py-3 pr-10 text-sm text-[var(--color-text-primary)] outline-none transition-all duration-200 focus:border-[var(--color-neon)] focus:shadow-[0_0_0_3px_var(--color-neon-glow)] cursor-pointer"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
        />
      </div>
    </div>
  );
}

function TacticalReport({
  form,
  content,
  isStreaming,
}: {
  form: FormState;
  content: string;
  isStreaming: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Tactical Blueprint – ${form.opponent || "Match"}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 40px; color: #000; }
            pre { white-space: pre-wrap; font-size: 14px; line-height: 1.8; }
          </style>
        </head>
        <body><pre>${content}</pre></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="mt-6 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] overflow-hidden">
      {/* Report header */}
      <div className="flex items-center justify-between border-b border-[var(--color-panel-border)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-neon-glow)] ring-1 ring-[var(--color-neon)]">
            {isStreaming ? (
              <Loader2 size={14} className="text-[var(--color-neon)] animate-spin" />
            ) : (
              <FileText size={14} className="text-[var(--color-neon)]" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-neon)]">
              {isStreaming ? "Generating Report…" : "Tactical Report"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              vs {form.opponent || "Unknown Opponent"} · {form.formation}
            </p>
          </div>
        </div>
        {!isStreaming && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print report"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-navy-deep)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-all duration-200 hover:border-[var(--color-neon)] hover:text-[var(--color-neon)] hover:shadow-[0_0_8px_var(--color-neon-glow)] cursor-pointer"
            >
              <Printer size={12} />
              Print
            </button>
            <button
              onClick={handleCopy}
              title="Copy to clipboard"
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-navy-deep)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-all duration-200 hover:border-[var(--color-neon)] hover:text-[var(--color-neon)] hover:shadow-[0_0_8px_var(--color-neon-glow)] cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCheck size={12} className="text-[var(--color-neon)]" />
                  <span className="text-[var(--color-neon)]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 px-5 pt-4">
        {[
          { label: "Formation", value: form.formation },
          { label: "Attack", value: form.offensiveStyle },
          { label: "Defense", value: form.defensiveStyle },
        ].map(({ label, value }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-neon)] bg-[var(--color-neon-glow)] px-3 py-1 text-xs font-semibold text-[var(--color-neon)]"
          >
            <span className="text-[var(--color-text-muted)] font-normal">
              {label}:
            </span>
            {value}
          </span>
        ))}
      </div>

      {/* Markdown report body */}
      <div className="p-5">
        <div className="rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-navy-deep)] p-4">
          <div className="prose-tactical text-sm leading-relaxed text-[var(--color-text-primary)]">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-base font-bold text-[var(--color-neon)] mt-4 mb-2 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-bold text-[var(--color-neon)] mt-4 mb-2 first:mt-0 uppercase tracking-wider">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mt-3 mb-1.5">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-[var(--color-text-primary)] mb-2 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="space-y-1 mb-2 pl-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="space-y-1 mb-2 pl-2 list-decimal list-inside">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
                    <span className="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-[var(--color-neon)]" />
                    <span>{children}</span>
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--color-text-primary)]">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-[var(--color-text-secondary)]">
                    {children}
                  </em>
                ),
                hr: () => (
                  <hr className="border-[var(--color-panel-border)] my-3" />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-[var(--color-neon)] animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        </div>

        <p className="text-[10px] text-[var(--color-text-muted)] text-right mt-3">
          Generated by Football Tactical Assistant · Powered by Gemini &amp; Tavily ·{" "}
          {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default function TacticalAssistant() {
  const [form, setForm] = useState<FormState>({
    opponent: "",
    formation: "",
    offensiveStyle: "",
    defensiveStyle: "",
  });
  const [status, setStatus] = useState<"idle" | "scanning" | "streaming" | "done">("idle");
  const [reportContent, setReportContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setField = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    setStatus("scanning");
    setReportContent("");
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream available");

      const decoder = new TextDecoder();
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        if (firstChunk) {
          setStatus("streaming");
          firstChunk = false;
        }

        setReportContent((prev) => prev + chunk);
      }

      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setStatus("idle");
    }
  };

  const isFormValid =
    form.opponent.trim() &&
    form.formation &&
    form.offensiveStyle &&
    form.defensiveStyle;

  const isGenerating = status === "scanning" || status === "streaming";

  return (
    <div className="min-h-screen bg-[var(--color-pitch-black)] flex flex-col items-center justify-center px-4 py-12">
      {/* Ambient glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[var(--color-neon)] opacity-[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-600 opacity-[0.06] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-800 opacity-[0.06] blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-neon)] bg-[var(--color-neon-glow)] shadow-[0_0_30px_var(--color-neon-glow)]">
          <Radar size={28} className="text-[var(--color-neon)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Football{" "}
            <span className="text-[var(--color-neon)]">Tactical</span>{" "}
            Assistant
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            AI-powered match preparation &amp; tactical analysis
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-navy-deep)] shadow-[0_0_60px_rgba(0,0,0,0.6)] p-6 sm:p-8">
        {/* Card header stripe */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--color-panel-border)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Match Configuration
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--color-panel-border)]" />
        </div>

        <div className="space-y-5">
          {/* Opponent Name */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
              <Users size={12} />
              Opponent Name
            </label>
            <input
              type="text"
              value={form.opponent}
              onChange={(e) => setField("opponent")(e.target.value)}
              placeholder="e.g. Manchester City"
              disabled={isGenerating}
              className="w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-pitch-black)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all duration-200 focus:border-[var(--color-neon)] focus:shadow-[0_0_0_3px_var(--color-neon-glow)] disabled:opacity-50"
            />
          </div>

          {/* Formation */}
          <SelectField
            label="Formation"
            icon={<Radar size={12} />}
            value={form.formation}
            onChange={setField("formation")}
            options={FORMATIONS}
            placeholder="Select formation"
          />

          {/* Offensive Style */}
          <SelectField
            label="Offensive Style"
            icon={<Swords size={12} />}
            value={form.offensiveStyle}
            onChange={setField("offensiveStyle")}
            options={OFFENSIVE_STYLES}
            placeholder="Select offensive style"
          />

          {/* Defensive Style */}
          <SelectField
            label="Defensive Style"
            icon={<ShieldCheck size={12} />}
            value={form.defensiveStyle}
            onChange={setField("defensiveStyle")}
            options={DEFENSIVE_STYLES}
            placeholder="Select defensive style"
          />

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!isFormValid || isGenerating}
            className="relative mt-2 w-full overflow-hidden rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-widest transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 enabled:cursor-pointer enabled:bg-[var(--color-neon)] enabled:text-[var(--color-pitch-black)] enabled:shadow-[0_0_20px_var(--color-neon-glow)] enabled:hover:shadow-[0_0_35px_rgba(0,230,118,0.4)] enabled:hover:brightness-110 enabled:active:scale-[0.98]"
          >
            {status === "scanning" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Searching Intelligence…
              </span>
            ) : status === "streaming" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Generating Blueprint…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Radar size={16} />
                Generate Tactical Blueprint
              </span>
            )}
            {!isGenerating && (
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 enabled:group-hover:translate-x-full"
              />
            )}
          </button>
        </div>

        {/* Scanning overlay (shown while Tavily searches run, before first Gemini chunk) */}
        {status === "scanning" && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-6">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-neon)] opacity-20" />
              <div className="absolute inset-1 animate-ping rounded-full bg-[var(--color-neon)] opacity-10" />
              <Radar size={24} className="relative text-[var(--color-neon)] animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Scanning Live Intelligence…
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Searching real-world data on {form.opponent}
              </p>
            </div>
            <div className="w-full overflow-hidden rounded-full bg-[var(--color-navy-mid)] h-1">
              <div className="h-full rounded-full bg-[var(--color-neon)] animate-[scan_3s_linear_infinite]" />
            </div>
          </div>
        )}

        {/* Tactical Report (shown while streaming or done) */}
        {(status === "streaming" || status === "done") && reportContent && (
          <TacticalReport
            form={form}
            content={reportContent}
            isStreaming={status === "streaming"}
          />
        )}
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-6 text-xs text-[var(--color-text-muted)]">
        Football Tactical Assistant · Powered by Gemini &amp; Tavily
      </p>
    </div>
  );
}
