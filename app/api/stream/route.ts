
/**
 * GET /api/stream-test
 *
 * Diagnostic streaming route — uses getBasicInfo + chooseFormat + decipher
 * instead of yt.download(). No yt.download() call anywhere in this file.
 *
 * Flow:
 *   1. Create Innertube (ANDROID client — avoids SABR throttle on WEB client)
 *   2. getBasicInfo(VIDEO_ID)              → check playability status
 *   3. chooseFormat({ type:'videoandaudio', quality:'best' })
 *      — falls back through 360p (itag 18) which is the most reliable
 *        muxed format that doesn't require SABR
 *   4. format.decipher(yt.session.player)  → deciphered streaming URL
 *   5. Fetch that URL from YouTube with a Range header (chunked, ≤10 MiB)
 *   6. Pipe the response bytes back to the client as video/mp4
 *      — browser receives a real byte stream it can play/save
 *
 * Why ANDROID client?
 *   YouTube's SABR (Serverless ABR) protocol rolled out in 2025 breaks
 *   streaming URLs above 360p on the WEB client — they return dynamic
 *   chunk URLs that change per request. The ANDROID / TV_EMBEDDED clients
 *   still serve static progressive URLs. We use ANDROID here.
 *
 * Why itag 18 / 360p as primary target?
 *   Itag 18 is a muxed (video+audio) mp4. No ffmpeg needed to merge streams.
 *   It reliably works without login on most public videos.
 *   We still try "best" first and fall back to itag 18 if needed.
 *
 * Hardcoded video: "Big Buck Bunny" — public domain, always accessible,
 * never age-restricted. Swap VIDEO_ID for any public video to test.
 */

import { NextRequest, NextResponse } from "next/server";
import { Innertube, UniversalCache } from "youtubei.js";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Hardcoded test video ────────────────────────────────────────────────────
// Big Buck Bunny — public domain, no login required, always streamable
const VIDEO_ID = "aqz-KE-bpKQ";

// YouTube chunk limit — go above this and they throttle the connection
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MiB

// ─── Diagnostic response shape ───────────────────────────────────────────────
interface DiagStep {
  step: string;
  status: "ok" | "error" | "warn";
  detail?: string;
}

function diagError(steps: DiagStep[], step: string, detail: string) {
  steps.push({ step, status: "error", detail });
  return NextResponse.json({ ok: false, steps }, { status: 500 });
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const steps: DiagStep[] = [];

  // ── 1. Create Innertube with ANDROID client ──────────────────────────────
  let yt: Innertube;
  try {
    yt = await Innertube.create({
      // ANDROID client avoids SABR — static progressive URLs still work here
      client_type: "ANDROID" as any,
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
    steps.push({ step: "innertube_create", status: "ok", detail: "ANDROID client" });
  } catch (err: any) {
    return diagError(steps, "innertube_create", err?.message ?? String(err));
  }

  // ── 2. getBasicInfo ───────────────────────────────────────────────────────
  let info: any;
  try {
    info = await yt.getBasicInfo(VIDEO_ID);
    steps.push({
      step: "get_basic_info",
      status: "ok",
      detail: `title="${info.basic_info?.title ?? "unknown"}"`,
    });
  } catch (err: any) {
    return diagError(steps, "get_basic_info", err?.message ?? String(err));
  }

  // ── 3. Check playability status ───────────────────────────────────────────
  const playStatus = info.playability_status?.status ?? "UNKNOWN";
  const playReason = info.playability_status?.reason ?? "";

  if (playStatus === "LOGIN_REQUIRED") {
    steps.push({
      step: "playability_check",
      status: "error",
      detail: `LOGIN_REQUIRED — ${playReason}. Video is age-restricted or private. Use a cookie-authenticated client.`,
    });
    return NextResponse.json({ ok: false, steps }, { status: 403 });
  }

  if (playStatus !== "OK") {
    steps.push({
      step: "playability_check",
      status: "error",
      detail: `Status: ${playStatus} — ${playReason}`,
    });
    return NextResponse.json({ ok: false, steps }, { status: 403 });
  }

  steps.push({ step: "playability_check", status: "ok", detail: `Status: ${playStatus}` });

  // ── 4. Check streaming_data exists ────────────────────────────────────────
  if (!info.streaming_data) {
    steps.push({
      step: "streaming_data_check",
      status: "error",
      detail: "streaming_data is null — no formats available. Player may need deciphering.",
    });
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  const allFormats = [
    ...(info.streaming_data.formats ?? []),
    ...(info.streaming_data.adaptive_formats ?? []),
  ];

  steps.push({
    step: "streaming_data_check",
    status: "ok",
    detail: `${allFormats.length} total formats available`,
  });

  // ── 5. chooseFormat — prefer muxed 360p (itag 18), reliable & no auth ────
  //
  // Strategy:
  //   a) Try chooseFormat with type:'videoandaudio', quality:'best'
  //   b) If that fails or returns null, manually find itag 18 (360p muxed mp4)
  //   c) If itag 18 missing, pick first format with both video+audio

  let format: any = null;
  let formatNote = "";

  try {
    format = info.chooseFormat({ type: "videoandaudio", quality: "best" });
    formatNote = "chooseFormat(best videoandaudio)";
  } catch {
    /* fall through */
  }

  // Explicit itag 18 fallback — most reliable muxed mp4 on all clients
  if (!format) {
    format = allFormats.find((f: any) => f.itag === 18);
    formatNote = "itag 18 fallback (360p muxed mp4)";
  }

  // Last resort: first format that has both video and audio codecs
  if (!format) {
    format = allFormats.find(
      (f: any) => f.has_video && f.has_audio
    );
    formatNote = "first muxed format (last resort)";
  }

  if (!format) {
    steps.push({
      step: "choose_format",
      status: "error",
      detail: "No muxed (video+audio) format found. Available itags: " +
        allFormats.map((f: any) => f.itag).join(", "),
    });
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  steps.push({
    step: "choose_format",
    status: "ok",
    detail: `${formatNote} | itag=${format.itag} | quality=${format.quality_label ?? format.quality ?? "?"} | mime=${format.mime_type ?? "?"}`,
  });

  // ── 6. Decipher the streaming URL ─────────────────────────────────────────
  let streamUrl: string | undefined;
  try {
    streamUrl = format.decipher(yt.session.player);
  } catch (err: any) {
    return diagError(steps, "decipher_url", err?.message ?? String(err));
  }

  if (!streamUrl) {
    // Some formats expose .url directly (pre-signed, no cipher needed)
    streamUrl = format.url;
  }

  if (!streamUrl) {
    steps.push({
      step: "decipher_url",
      status: "error",
      detail: "decipher() returned undefined and format.url is also empty",
    });
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  steps.push({
    step: "decipher_url",
    status: "ok",
    detail: `URL deciphered (${streamUrl.slice(0, 80)}…)`,
  });

  // ── 7. Probe the URL — HEAD request to confirm it's reachable ─────────────
  let contentLength: number | null = null;
  try {
    const probe = await fetch(streamUrl, { method: "HEAD" });
    if (!probe.ok) {
      steps.push({
        step: "probe_url",
        status: "warn",
        detail: `HEAD returned ${probe.status} — will still attempt GET`,
      });
    } else {
      contentLength = parseInt(probe.headers.get("content-length") ?? "0", 10) || null;
      const mime = probe.headers.get("content-type") ?? "unknown";
      steps.push({
        step: "probe_url",
        status: "ok",
        detail: `reachable | content-type=${mime} | size=${contentLength ? `${(contentLength / (1024 * 1024)).toFixed(1)} MB` : "unknown"}`,
      });
    }
  } catch (err: any) {
    steps.push({
      step: "probe_url",
      status: "warn",
      detail: `HEAD probe failed: ${err?.message} — will still attempt GET`,
    });
  }

  // ── 8. Detect if this is a JSON/diagnostic-only request ───────────────────
  // If caller sends ?info=1 or Accept: application/json, return the diag steps
  // without streaming. Useful for debugging.
  const wantDiag =
    req.nextUrl.searchParams.has("info") ||
    req.headers.get("accept")?.includes("application/json");

  if (wantDiag) {
    return NextResponse.json({
      ok: true,
      steps,
      videoId: VIDEO_ID,
      title: info.basic_info?.title,
      format: {
        itag: format.itag,
        quality: format.quality_label ?? format.quality,
        mime: format.mime_type,
        contentLength,
      },
    });
  }

  // ── 9. Stream the video back to the client ────────────────────────────────
  //
  // YouTube requires we download in chunks ≤ 10 MiB, using &range=start-end.
  // We build a TransformStream that fetches chunks sequentially and pipes them.
  //
  // The client browser gets a proper video/mp4 stream it can play in a
  // <video> element (via a blob URL) or save directly.

  steps.push({ step: "stream_start", status: "ok", detail: "Beginning chunked transfer" });

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  // Run the chunked fetch in the background
  (async () => {
    let start = 0;
    const end = contentLength ? contentLength - 1 : null;

    try {
      while (true) {
        const chunkEnd = Math.min(start + CHUNK_SIZE - 1, end ?? start + CHUNK_SIZE - 1);
        const rangeHeader = `bytes=${start}-${chunkEnd}`;

        const res = await fetch(`${streamUrl}&range=${start}-${chunkEnd}`, {
          headers: { Range: rangeHeader },
        });

        if (!res.ok && res.status !== 206) {
          console.error(`[stream-test] chunk fetch failed: ${res.status} at range ${rangeHeader}`);
          break;
        }

        const chunk = new Uint8Array(await res.arrayBuffer());
        if (chunk.length === 0) break;

        await writer.write(chunk);
        start += chunk.length;

        // If we got less than the chunk size, we've hit the end
        if (chunk.length < CHUNK_SIZE) break;
        if (end !== null && start > end) break;
      }
    } catch (err) {
      console.error("[stream-test] streaming error:", err);
    } finally {
      await writer.close().catch(() => {});
    }
  })();

  // Build response headers
  const headers: Record<string, string> = {
    "Content-Type": format.mime_type?.split(";")[0] ?? "video/mp4",
    "Transfer-Encoding": "chunked",
    // Tell the browser this is a downloadable file with a suggested name
    "Content-Disposition": `inline; filename="stream-test-${VIDEO_ID}.mp4"`,
    // Let the browser know ranges are supported (enables seeking in <video>)
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
    // Pass diag steps in a custom header (truncated to avoid header size limits)
    "X-Stream-Diag": JSON.stringify(steps).slice(0, 2000),
  };

  if (contentLength) {
    headers["Content-Length"] = String(contentLength);
  }

  return new Response(readable as unknown as ReadableStream, { headers });
}
