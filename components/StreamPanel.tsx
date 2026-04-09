
"use client";

import { useState, useRef } from "react";

interface DiagStep {
  step: string;
  status: "ok" | "error" | "warn";
  detail?: string;
}

interface DiagResult {
  ok: boolean;
  steps: DiagStep[];
  videoId?: string;
  title?: string;
  format?: {
    itag: number;
    quality: string;
    mime: string;
    contentLength: number | null;
  };
  error?: string;
}

type LoadState = "idle" | "running" | "done" | "error";

export default function StreamTestPanel() {
  const [diagState, setDiagState] = useState<LoadState>("idle");
  const [diagResult, setDiagResult] = useState<DiagResult | null>(null);

  const [streamState, setStreamState] = useState<LoadState>("idle");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const existingBlobRef = useRef<string | null>(null);

  // ── Diagnostic run ──────────────────────────────────────────────────────────

  const runDiag = async () => {
    setDiagState("running");
    setDiagResult(null);
    try {
      const res = await fetch("/api/stream-test?info=1", {
        headers: { Accept: "application/json" },
      });
      const data: DiagResult = await res.json();
      setDiagResult(data);
      setDiagState(data.ok ? "done" : "error");
    } catch (err: any) {
      setDiagResult({
        ok: false,
        steps: [{ step: "fetch", status: "error", detail: err?.message ?? "Network error" }],
      });
      setDiagState("error");
    }
  };

  // ── Stream + display ────────────────────────────────────────────────────────

  const runStream = async () => {
    // Revoke old blob URL to free memory
    if (existingBlobRef.current) {
      URL.revokeObjectURL(existingBlobRef.current);
      existingBlobRef.current = null;
      setBlobUrl(null);
    }

    setStreamState("running");
    setStreamError(null);
    setDownloadProgress("Connecting…");

    try {
      const res = await fetch("/api/stream-test");

      if (!res.ok) {
        // Non-2xx — read the body as JSON for diag info
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          detail = body?.steps?.findLast?.((s: DiagStep) => s.status === "error")?.detail ?? detail;
        } catch {
          detail = await res.text().catch(() => detail);
        }
        throw new Error(detail);
      }

      if (!res.body) throw new Error("Response body is null");

      // Stream the response body and collect into a Blob
      const reader = res.body.getReader();
      const chunks = [];
      let totalBytes = 0;

      const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalBytes += value.length;

        const mb = (totalBytes / (1024 * 1024)).toFixed(1);
        const pct =
          contentLength > 0
            ? ` (${Math.round((totalBytes / contentLength) * 100)}%)`
            : "";
        setDownloadProgress(`Downloading… ${mb} MB${pct}`);
      }

      const mimeType =
        res.headers.get("content-type")?.split(";")[0] ?? "video/mp4";
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);

      existingBlobRef.current = url;
      setBlobUrl(url);
      setStreamState("done");
      setDownloadProgress(
        `Done — ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
      );

      // Autoplay
      setTimeout(() => {
        videoRef.current?.play().catch(() => {});
      }, 100);
    } catch (err: any) {
      setStreamError(err?.message ?? "Unknown error");
      setStreamState("error");
      setDownloadProgress(null);
    }
  };

  const handleSave = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "stream-test.mp4";
    a.click();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="text-indigo-400">⚡</span> Stream Diagnostic
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Hardcoded video: Big Buck Bunny (public domain) · Uses{" "}
          <code className="text-indigo-300">getBasicInfo → chooseFormat → decipher</code>
          , no <code className="text-indigo-300">yt.download()</code>
        </p>
      </div>

      {/* ── Step 1: Diagnostic ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Step 1 — Run Diagnostics
          </h3>
          <button
            onClick={runDiag}
            disabled={diagState === "running"}
            className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600
                       disabled:opacity-40 text-xs font-semibold transition"
          >
            {diagState === "running" ? (
              <span className="flex items-center gap-1.5">
                <Spin /> Checking…
              </span>
            ) : (
              "Check Pipeline"
            )}
          </button>
        </div>

        {diagResult && (
          <div className="space-y-1.5">
            {diagResult.steps.map((s, i) => (
              <StepRow key={i} step={s} />
            ))}

            {diagResult.ok && diagResult.format && (
              <div className="mt-2 rounded-xl bg-gray-800 border border-gray-700 p-3 text-xs space-y-0.5">
                <p className="text-gray-300 font-medium">Format selected:</p>
                <p className="text-gray-400">
                  itag <span className="text-white">{diagResult.format.itag}</span> ·{" "}
                  {diagResult.format.quality} · {diagResult.format.mime}
                  {diagResult.format.contentLength
                    ? ` · ${(diagResult.format.contentLength / (1024 * 1024)).toFixed(1)} MB`
                    : ""}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Step 2: Stream ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Step 2 — Load & Play Video
          </h3>
          <button
            onClick={runStream}
            disabled={streamState === "running"}
            className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600
                       disabled:opacity-40 text-xs font-semibold transition"
          >
            {streamState === "running" ? (
              <span className="flex items-center gap-1.5">
                <Spin /> {downloadProgress ?? "Loading…"}
              </span>
            ) : (
              "Load Stream"
            )}
          </button>
        </div>

        {/* Progress */}
        {streamState === "running" && downloadProgress && (
          <div className="flex items-center gap-2 text-xs text-indigo-300">
            <Spin /> {downloadProgress}
          </div>
        )}

        {/* Error */}
        {streamState === "error" && streamError && (
          <div className="rounded-xl bg-red-950 border border-red-800 p-3">
            <p className="text-xs font-semibold text-red-400">Stream failed</p>
            <p className="text-xs text-red-300 mt-1">{streamError}</p>
          </div>
        )}

        {/* Video player */}
        {blobUrl && (
          <div className="space-y-3">
            <video
              ref={videoRef}
              src={blobUrl}
              controls
              className="w-full rounded-xl bg-black"
              style={{ maxHeight: "320px" }}
            />

            <div className="flex items-center gap-3">
              <span className="text-xs text-green-400 font-medium">
                ✓ {downloadProgress}
              </span>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600
                           text-xs font-semibold transition ml-auto"
              >
                ⬇ Save file
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepRow({ step }: { step: DiagStep }) {
  const icon = step.status === "ok" ? "✓" : step.status === "warn" ? "⚠" : "✗";
  const color =
    step.status === "ok"
      ? "text-green-400"
      : step.status === "warn"
      ? "text-yellow-400"
      : "text-red-400";
  const bg =
    step.status === "ok"
      ? "bg-green-950/40 border-green-900"
      : step.status === "warn"
      ? "bg-yellow-950/40 border-yellow-900"
      : "bg-red-950/40 border-red-900";

  return (
    <div className={`rounded-lg border px-3 py-2 ${bg}`}>
      <div className="flex items-start gap-2">
        <span className={`text-xs font-bold mt-0.5 flex-shrink-0 ${color}`}>{icon}</span>
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${color}`}>
            {step.step.replace(/_/g, " ")}
          </p>
          {step.detail && (
            <p className="text-xs text-gray-400 mt-0.5 break-all">{step.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Spin() {
  return (
    <span className="inline-block w-3 h-3 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
  );
}
