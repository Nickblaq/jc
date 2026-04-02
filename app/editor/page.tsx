'use client'

import { useState, useRef, useCallback, useId } from 'react'
import { VideoMeta, CTASlide, ShortItem } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function fmtSec(s: number) {
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

function fmtBytes(b: number) {
  if (b < 1024)      return `${b} B`
  if (b < 1048576)   return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function makeSlide(position: 'before' | 'after'): CTASlide {
  return {
    id:          uid(),
    position,
    text:        position === 'before' ? 'COMING UP' : 'FOLLOW FOR MORE',
    subtext:     position === 'before' ? '' : '@yourhandle',
    duration:    3,
    bgColor:     '#0a0a0a',
    textColor:   '#ffffff',
    accentColor: '#ff0000',
  }
}

type Step = 'upload' | 'edit' | 'processing' | 'done'

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditorPage() {
  // Upload
  const [step,       setStep]       = useState<Step>('upload')
  const [video,      setVideo]      = useState<VideoMeta | null>(null)
  const [uploadPct,  setUploadPct]  = useState(0)
  const [dragging,   setDragging]   = useState(false)

  // Edit controls
  const [trimStart,  setTrimStart]  = useState(0)
  const [trimEnd,    setTrimEnd]    = useState(0)
  const [slides,     setSlides]     = useState<CTASlide[]>([])
  const [mute,       setMute]       = useState(false)
  const [fadeIn,     setFadeIn]     = useState(true)
  const [fadeOut,    setFadeOut]    = useState(true)
  const [activeTab,  setActiveTab]  = useState<'trim'|'slides'|'shorts'>('trim')

  // Shorts browser
  const [shortsCh,   setShortsCh]   = useState('')
  const [shorts,     setShorts]     = useState<ShortItem[]>([])
  const [shortsLoad, setShortsLoad] = useState(false)
  const [shortsErr,  setShortsErr]  = useState('')

  // Output
  const [outputPath, setOutputPath] = useState('')
  const [outputName, setOutputName] = useState('')
  const [procStatus, setProcStatus] = useState('')
  const [error,      setError]      = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setError('')
    setUploadPct(5)

    const form = new FormData()
    form.append('video', file)

    try {
      setUploadPct(30)
      const res  = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      setUploadPct(100)

      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      const meta = data as VideoMeta
      setVideo(meta)
      setTrimStart(0)
      setTrimEnd(meta.duration)
      setStep('edit')
    } catch (e: any) {
      setError(e.message)
      setUploadPct(0)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  // ── Slides ──────────────────────────────────────────────────────────────────

  const addSlide    = (pos: 'before' | 'after') => setSlides(p => [...p, makeSlide(pos)])
  const removeSlide = (id: string)              => setSlides(p => p.filter(s => s.id !== id))
  const updateSlide = (id: string, u: Partial<CTASlide>) =>
    setSlides(p => p.map(s => s.id === id ? { ...s, ...u } : s))

  // ── Shorts browser ──────────────────────────────────────────────────────────

  const fetchShorts = async () => {
    if (!shortsCh.trim()) return
    setShortsLoad(true)
    setShortsErr('')
    setShorts([])
    try {
      const res  = await fetch(`/api/shorts?channel=${encodeURIComponent(shortsCh.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setShorts(data.shorts ?? [])
    } catch (e: any) {
      setShortsErr(e.message)
    } finally {
      setShortsLoad(false)
    }
  }

  // ── Process ─────────────────────────────────────────────────────────────────

  const processVideo = async () => {
    if (!video) return
    setStep('processing')
    setError('')
    setProcStatus('Trimming video & removing source CTAs...')

    try {
      const body = {
        filename:          video.filename,
        trimStart,
        trimEnd,
        slides,
        muteOriginalAudio: mute,
        addFadeIn:         fadeIn,
        addFadeOut:        fadeOut,
      }

      if (slides.length > 0) {
        setProcStatus(`Generating ${slides.length} CTA slide${slides.length > 1 ? 's' : ''}...`)
      }

      const res  = await fetch('/api/process', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Processing failed')

      setProcStatus('Done!')
      setOutputPath(data.publicPath)
      setOutputName(data.filename)
      setStep('done')
    } catch (e: any) {
      setError(e.message)
      setStep('edit')
    }
  }

  const reset = () => {
    setStep('upload')
    setVideo(null)
    setSlides([])
    setOutputPath('')
    setUploadPct(0)
    setError('')
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        {/* Header */}
        <header style={{ marginBottom: 36 }}>
          <p style={S.eyebrow}>Short Editor · FFmpeg Pipeline</p>
          <h1 style={S.h1}>
            Trim · Remove CTAs<br />
            <span style={{ color: 'var(--red)' }}>Add Your Own</span>
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--dim)', maxWidth: 520, lineHeight: 1.65 }}>
            Upload a Short, cut source end-screens, prepend or append branded CTA slides with your text and colours, then export a clean mp4.
          </p>
        </header>

        {/* Step bar */}
        <StepBar step={step} />

        {/* ═══════════════════════════ UPLOAD ════════════════════════════════ */}
        {step === 'upload' && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              ...S.dropZone,
              borderColor:     dragging ? 'var(--red)' : 'var(--border)',
              backgroundColor: dragging ? 'rgba(255,0,0,.04)' : 'var(--surface)',
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 14 }}>📹</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              {dragging ? 'Drop it!' : 'Drop your Short here, or click to browse'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>
              mp4 · mov · webm · avi · mkv
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="video/*,.mp4,.mov,.webm,.avi,.mkv,.m4v"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        )}

        {uploadPct > 0 && uploadPct < 100 && (
          <div style={{ marginTop: 16 }}>
            <ProgressBar pct={uploadPct} label="Uploading..." />
          </div>
        )}

        {/* ═══════════════════════════ EDIT ══════════════════════════════════ */}
        {step === 'edit' && video && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 22, alignItems: 'start' }}>

            {/* Left panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 0, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {(['trim', 'slides', 'shorts'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    style={{
                      flex: 1, padding: '10px 0',
                      background:  activeTab === t ? 'var(--surface2)' : 'transparent',
                      borderRight: '1px solid var(--border)',
                      borderBottom: 'none', borderTop: 'none', borderLeft: 'none',
                      color: activeTab === t ? 'var(--text)' : 'var(--dim)',
                      fontSize: 12, fontFamily: 'var(--mono)', letterSpacing: 1,
                      textTransform: 'uppercase', cursor: 'pointer',
                      transition: 'all .15s',
                      borderLeft: activeTab === t ? `2px solid var(--red)` : '2px solid transparent',
                    }}
                  >
                    {t === 'trim' ? '✂ Trim' : t === 'slides' ? '✦ Slides' : '▶ Shorts'}
                  </button>
                ))}
              </div>

              {/* ── Trim tab ── */}
              {activeTab === 'trim' && (
                <Card label="1 · Trim — Cut Source CTAs">
                  <p style={S.hint}>
                    Set trim points to cut existing end-screens or watermarks. Everything between Start and End is kept.
                  </p>

                  {/* Visual trim strip */}
                  <div style={{ position: 'relative', height: 40, background: 'var(--faint)', borderRadius: 6, margin: '16px 0 8px', overflow: 'hidden' }}>
                    {/* Kept region */}
                    <div style={{
                      position: 'absolute', top: 0, height: '100%',
                      left:  `${(trimStart / video.duration) * 100}%`,
                      width: `${((trimEnd - trimStart) / video.duration) * 100}%`,
                      background: 'rgba(255,0,0,.25)',
                      borderLeft:  '2px solid var(--red)',
                      borderRight: '2px solid var(--red)',
                    }} />
                    {/* Labels */}
                    <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mono)' }}>0:00</span>
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mono)' }}>{fmtSec(video.duration)}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <NumberField
                      label={`Start (0 – ${video.duration.toFixed(1)}s)`}
                      value={trimStart}
                      min={0} max={trimEnd - 0.5} step={0.5}
                      onChange={v => setTrimStart(Math.min(v, trimEnd - 0.5))}
                    />
                    <NumberField
                      label={`End (max ${video.duration.toFixed(1)}s)`}
                      value={trimEnd}
                      min={trimStart + 0.5} max={video.duration} step={0.5}
                      onChange={v => setTrimEnd(Math.max(v, trimStart + 0.5))}
                    />
                  </div>

                  <p style={{ ...S.hint, color: 'var(--red)' }}>
                    Keeping {fmtSec(trimEnd - trimStart)} of {fmtSec(video.duration)}
                    {trimStart > 0 ? ` · removed ${fmtSec(trimStart)} from start` : ''}
                    {trimEnd < video.duration ? ` · removed ${fmtSec(video.duration - trimEnd)} from end` : ''}
                  </p>

                  {/* Options */}
                  <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                    <Checkbox label="Mute original audio" checked={mute}    onChange={setMute} />
                    <Checkbox label="Fade in"             checked={fadeIn}  onChange={setFadeIn} />
                    <Checkbox label="Fade out"            checked={fadeOut} onChange={setFadeOut} />
                  </div>
                </Card>
              )}

              {/* ── Slides tab ── */}
              {activeTab === 'slides' && (
                <Card label="2 · CTA Slides — Before & After">
                  <p style={S.hint}>
                    Add branded 1080×1920 slides with text overlays before or after your video.
                    Each slide is generated as a separate mp4 then concatenated.
                  </p>

                  {slides.length === 0 && (
                    <p style={{ ...S.hint, color: 'var(--faint)', marginTop: 12 }}>
                      No slides yet. Add one below.
                    </p>
                  )}

                  {slides.map((s, i) => (
                    <SlideRow key={s.id} slide={s} index={i}
                      onChange={u => updateSlide(s.id, u)}
                      onRemove={() => removeSlide(s.id)}
                    />
                  ))}

                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <Btn variant="outline" onClick={() => addSlide('before')}>+ Before</Btn>
                    <Btn variant="outline" onClick={() => addSlide('after')}>+ After</Btn>
                  </div>
                </Card>
              )}

              {/* ── Shorts tab ── */}
              {activeTab === 'shorts' && (
                <Card label="3 · Browse Channel Shorts">
                  <p style={S.hint}>
                    Look up the top 5 Shorts from any YouTube channel. Useful for inspiration or repurposing reference.
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, marginBottom: 16 }}>
                    <input
                      value={shortsCh}
                      onChange={e => setShortsCh(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchShorts()}
                      placeholder="@channel or channel name or UCxxxxx"
                      style={S.input}
                    />
                    <Btn variant="primary" onClick={fetchShorts}>
                      {shortsLoad ? '...' : 'Fetch'}
                    </Btn>
                  </div>

                  {shortsLoad && <Spinner label="Fetching via InnerTube..." />}
                  {shortsErr  && <ErrBox msg={shortsErr} />}

                  {shorts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {shorts.map((s, i) => (
                        <ShortCard key={s.id} short={s} rank={i} />
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Process button */}
              <Btn variant="primary" fullWidth onClick={processVideo}>
                ▶ Process Video
              </Btn>
              <p style={{ ...S.hint, textAlign: 'center' }}>
                FFmpeg will trim, generate slides, and concatenate into a single mp4.
              </p>
            </div>

            {/* Right: video preview + metadata */}
            <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Card label="Source Preview">
                {/* The video element - clicking plays it, does NOT navigate */}
                <video
                  src={video.publicPath}
                  controls
                  playsInline
                  style={{ width: '100%', borderRadius: 8, background: '#000', display: 'block' }}
                />
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <MetaRow k="File"       v={video.filename} mono />
                  <MetaRow k="Duration"   v={fmtSec(video.duration)} />
                  <MetaRow k="Resolution" v={`${video.width} × ${video.height}`} />
                  <MetaRow k="FPS"        v={String(video.fps)} />
                  <MetaRow k="Size"       v={fmtBytes(video.size)} />
                </div>
              </Card>

              <Btn variant="outline" onClick={reset}>↩ Upload different file</Btn>
            </div>
          </div>
        )}

        {/* ═══════════════════════════ PROCESSING ════════════════════════════ */}
        {step === 'processing' && (
          <Card label="Processing...">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '20px 0' }}>
              <div style={{
                width: 28, height: 28, flexShrink: 0,
                border: '3px solid var(--muted)', borderTopColor: 'var(--red)',
                borderRadius: '50%', animation: 'spin .7s linear infinite',
              }} />
              <div>
                <p style={{ fontSize: 14, color: 'var(--text)' }}>{procStatus}</p>
                <p style={{ ...S.hint, marginTop: 4 }}>
                  This may take a minute for longer videos or multiple slides.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ═══════════════════════════ DONE ══════════════════════════════════ */}
        {step === 'done' && outputPath && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 22, alignItems: 'start' }}>
            <Card label="✓ Export Complete">
              <p style={{ ...S.hint, marginBottom: 18 }}>
                Preview your edited Short below, then download it.
              </p>

              <video
                src={outputPath}
                controls
                playsInline
                style={{ width: '100%', maxHeight: 520, borderRadius: 8, background: '#000', display: 'block' }}
              />

              {/*
                KEY DOWNLOAD PATTERN:
                - Plain <a> with href pointing to the static file in /public/output/
                - The `download` attribute tells the browser to save the file — not navigate
                - e.stopPropagation() on the anchor itself prevents any parent handler
                - No JavaScript fetch, no Blob assembly, no window.open
                - This is the only reliable method for large video files
              */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <a
                  href={outputPath}
                  download={outputName}
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '13px 20px',
                    background: 'var(--red)', borderRadius: 10,
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    textDecoration: 'none', transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#cc0000')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--red)')}
                >
                  ↓ Download {outputName}
                </a>
                <Btn variant="outline" onClick={reset}>Edit another</Btn>
              </div>
            </Card>

            <Card label="What was applied">
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trimStart > 0 && <Li>Removed first {fmtSec(trimStart)} (source intro / watermark)</Li>}
                {video && trimEnd < video.duration && <Li>Removed last {fmtSec(video.duration - trimEnd)} (source CTAs / end-screen)</Li>}
                {mute    && <Li>Muted original audio</Li>}
                {fadeIn  && <Li>Added 0.4s fade-in</Li>}
                {fadeOut && <Li>Added 0.4s fade-out</Li>}
                {slides.filter(s => s.position === 'before').map((s, i) => (
                  <Li key={i}>"{s.text}" slide prepended ({s.duration}s)</Li>
                ))}
                {slides.filter(s => s.position === 'after').map((s, i) => (
                  <Li key={i}>"{s.text}" slide appended ({s.duration}s)</Li>
                ))}
                {trimStart === 0 && video && trimEnd >= video.duration && !mute && !fadeIn && !fadeOut && slides.length === 0 && (
                  <Li>No changes (passthrough)</Li>
                )}
              </ul>
            </Card>
          </div>
        )}

        {/* Global error */}
        {error && <ErrBox msg={error} style={{ marginTop: 20 }} />}

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload',     label: '1 Upload'  },
    { key: 'edit',       label: '2 Edit'    },
    { key: 'processing', label: '3 Process' },
    { key: 'done',       label: '4 Export'  },
  ]
  const idx = steps.findIndex(s => s.key === step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            padding: '4px 14px', borderRadius: 20, fontSize: 11,
            fontFamily: 'var(--mono)', letterSpacing: 1,
            background: i <= idx ? 'var(--red)' : 'var(--surface)',
            color:      i <= idx ? '#fff'       : 'var(--dim)',
            border: `1px solid ${i <= idx ? 'var(--red)' : 'var(--border)'}`,
            transition: 'all .2s',
          }}>{s.label}</span>
          {i < steps.length - 1 && (
            <div style={{ width: 24, height: 1, background: i < idx ? 'var(--red)' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
      <p style={S.cardLabel}>{label}</p>
      {children}
    </div>
  )
}

function SlideRow({ slide, index, onChange, onRemove }: {
  slide: CTASlide; index: number
  onChange: (u: Partial<CTASlide>) => void
  onRemove: () => void
}) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 14, marginTop: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{
          fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: 2, textTransform: 'uppercase',
          color: slide.position === 'before' ? 'var(--blue)' : 'var(--amber)',
        }}>
          {slide.position} video — slide {index + 1}
        </span>
        <button onClick={onRemove} style={{ ...S.iconBtn }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <TextField label="Main text"        value={slide.text}    placeholder="FOLLOW FOR MORE" onChange={v => onChange({ text: v })} />
        <TextField label="Subtext (opt.)"   value={slide.subtext} placeholder="@yourhandle"    onChange={v => onChange({ subtext: v })} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <NumberField label="Sec" value={slide.duration} min={1} max={10} step={1} onChange={v => onChange({ duration: v })} />
        <ColorField label="Background" value={slide.bgColor}     onChange={v => onChange({ bgColor: v })} />
        <ColorField label="Text"       value={slide.textColor}   onChange={v => onChange({ textColor: v })} />
        <ColorField label="Accent"     value={slide.accentColor} onChange={v => onChange({ accentColor: v })} />
      </div>

      {/* Live preview */}
      <div style={{
        background: slide.bgColor, borderRadius: 6, height: 72,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <span style={{ color: slide.textColor, fontWeight: 800, fontSize: 18, letterSpacing: 1, fontFamily: 'Syne, sans-serif' }}>
          {slide.text || 'Main text'}
        </span>
        {slide.subtext && (
          <span style={{ color: slide.accentColor, fontSize: 12 }}>{slide.subtext}</span>
        )}
      </div>
    </div>
  )
}

function ShortCard({ short, rank }: { short: ShortItem; rank: number }) {
  const RANK_C = ['#FFD700', '#C0C0C0', '#CD7F32', '#777', '#555']
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'center',
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 10,
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: RANK_C[rank], width: 20, flexShrink: 0, textAlign: 'center' }}>
        #{rank + 1}
      </span>
      {short.thumbnail && (
        <img
          src={short.thumbnail}
          alt={short.title}
          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {short.title}
        </p>
        <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mono)' }}>
          {short.views} views{short.duration ? ` · ${short.duration}` : ''}
        </p>
      </div>
      {/*
        Shorts link — opens YouTube in a new tab.
        e.stopPropagation() prevents any parent click from also firing.
      */}
      <a
        href={short.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          fontSize: 11, color: 'var(--red)', fontFamily: 'var(--mono)',
          textDecoration: 'none', flexShrink: 0, padding: '4px 8px',
          border: '1px solid var(--border)', borderRadius: 4,
        }}
      >↗ open</a>
    </div>
  )
}

// ─── Primitive UI atoms ───────────────────────────────────────────────────────

function Btn({ onClick, children, variant, fullWidth }: {
  onClick?: () => void; children: React.ReactNode
  variant: 'primary' | 'outline'; fullWidth?: boolean
}) {
  const base: React.CSSProperties = {
    padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'all .15s', border: 'none',
    width: fullWidth ? '100%' : undefined,
  }
  const styles = {
    primary: { ...base, background: 'var(--red)',       color: '#fff'       },
    outline: { ...base, background: 'transparent',      color: 'var(--dim)',
               border: '1px solid var(--border)'  },
  }
  return (
    <button
      onClick={onClick}
      style={styles[variant]}
      onMouseEnter={e => {
        const el = e.currentTarget
        if (variant === 'primary') el.style.background = '#cc0000'
        else el.style.borderColor = 'var(--muted)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        if (variant === 'primary') el.style.background = 'var(--red)'
        else el.style.borderColor = 'var(--border)'
      }}
    >{children}</button>
  )
}

function TextField({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label style={S.fieldLabel}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={S.input} />
    </div>
  )
}

function NumberField({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <label style={S.fieldLabel}>{label}</label>
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={S.input}
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label style={S.fieldLabel}>{label}</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer', padding: 0, borderRadius: 4 }} />
        <input value={value} onChange={e => onChange(e.target.value)}
          style={{ ...S.input, flex: 1, fontFamily: 'var(--mono)', fontSize: 11 }} />
      </div>
    </div>
  )
}

function Checkbox({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--dim)' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--red)', width: 14, height: 14 }} />
      {label}
    </label>
  )
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--dim)' }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--red)' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'var(--muted)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--red)', borderRadius: 2, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

function Spinner({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
      <div style={{ width: 18, height: 18, border: '2px solid var(--muted)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--dim)', letterSpacing: 1 }}>{label}</span>
    </div>
  )
}

function ErrBox({ msg, style: extraStyle }: { msg: string; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#1a0808', border: '1px solid #3a1010', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, fontFamily: 'var(--mono)', ...extraStyle }}>
      ✕ {msg}
    </div>
  )
}

function MetaRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--dim)' }}>{k}</span>
      <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: mono ? 'var(--mono)' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{v}</span>
    </div>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--dim)', alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
      <span>{children}</span>
    </li>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  eyebrow: {
    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '4px',
    textTransform: 'uppercase', color: 'var(--red)', marginBottom: 8,
  },
  h1: {
    fontFamily: 'Syne, sans-serif', fontWeight: 800,
    fontSize: 'clamp(32px, 5vw, 54px)', lineHeight: 1, color: '#fff',
  },
  hint: {
    fontSize: 12, color: 'var(--dim)', lineHeight: 1.65, fontFamily: 'var(--mono)',
  },
  cardLabel: {
    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '2px',
    textTransform: 'uppercase', color: 'var(--red)', marginBottom: 14,
  },
  fieldLabel: {
    display: 'block', fontSize: 10, fontFamily: 'var(--mono)',
    color: 'var(--dim)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5,
  },
  input: {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 7, padding: '8px 10px', fontSize: 13, color: 'var(--text)',
    transition: 'border-color .15s',
  },
  iconBtn: {
    background: 'none', border: 'none', color: 'var(--dim)',
    cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px',
  },
  dropZone: {
    border: '2px dashed', borderRadius: 16, padding: '72px 32px',
    textAlign: 'center' as const, cursor: 'pointer',
    transition: 'border-color .2s, background .2s',
    marginBottom: 16,
  },
}
