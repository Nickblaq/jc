
'use client'

import { useState, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoMeta {
  filename: string
  publicPath: string
  duration: number
  width: number
  height: number
}

interface Slide {
  id: string
  position: 'before' | 'after'
  text: string
  subtext: string
  duration: number
  bgColor: string
  textColor: string
  accentColor: string
}

type Step = 'upload' | 'edit' | 'processing' | 'done'

function makeSlide(position: 'before' | 'after'): Slide {
  return {
    id:          Math.random().toString(36).slice(2, 9),
    position,
    text:        position === 'before' ? 'WATCH THIS' : 'FOLLOW FOR MORE',
    subtext:     position === 'before' ? '' : '@yourhandle',
    duration:    3,
    bgColor:     '#0f0f0f',
    textColor:   '#ffffff',
    accentColor: '#ff0000',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditorPage() {
  const [step,        setStep]        = useState<Step>('upload')
  const [video,       setVideo]       = useState<VideoMeta | null>(null)
  const [trimStart,   setTrimStart]   = useState(0)
  const [trimEnd,     setTrimEnd]     = useState(0)
  const [slides,      setSlides]      = useState<Slide[]>([])
  const [outputPath,  setOutputPath]  = useState('')
  const [outputName,  setOutputName]  = useState('')
  const [error,       setError]       = useState('')
  const [uploadProg,  setUploadProg]  = useState(0)
  const [procStatus,  setProcStatus]  = useState('')

  const fileRef    = useRef<HTMLInputElement>(null)
  const videoRef   = useRef<HTMLVideoElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file (mp4, mov, webm)')
      return
    }

    setError('')
    setUploadProg(10)

    const form = new FormData()
    form.append('video', file)

    try {
      setUploadProg(40)
      const res  = await fetch('/api/process?action=upload', { method: 'POST', body: form })
      const data = await res.json()
      setUploadProg(100)

      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      setVideo(data as VideoMeta)
      setTrimEnd(data.duration ?? 0)
      setStep('edit')
    } catch (e: any) {
      setError(e.message)
      setUploadProg(0)
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  // ── Slides ──────────────────────────────────────────────────────────────────

  const addSlide = (position: 'before' | 'after') => {
    setSlides(prev => [...prev, makeSlide(position)])
  }

  const removeSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id))
  }

  const updateSlide = (id: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  // ── Process ─────────────────────────────────────────────────────────────────

  const processVideo = async () => {
    if (!video) return
    setStep('processing')
    setError('')
    setProcStatus('Starting FFmpeg pipeline...')

    try {
      setProcStatus('Trimming video & removing source CTAs...')

      const body = {
        filename:  video.filename,
        trimStart: trimStart > 0 ? trimStart : undefined,
        trimEnd:   trimEnd < video.duration ? trimEnd : undefined,
        slides:    slides.map(s => ({
          text:        s.text,
          subtext:     s.subtext || undefined,
          duration:    s.duration,
          position:    s.position,
          bgColor:     s.bgColor,
          textColor:   s.textColor,
          accentColor: s.accentColor,
        })),
      }

      const res  = await fetch('/api/process?action=process', {
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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '4px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
            Short Editor
          </p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            Trim · Remove CTAs<br />
            <span style={{ color: 'var(--accent)' }}>Add Your Own</span>
          </h1>
          <p style={{ marginTop: 10, fontSize: 14, color: 'var(--dim)', maxWidth: 480 }}>
            Upload a short video, cut source end-screens, prepend or append your own branded CTA slides, export.
          </p>
        </div>

        {/* Step indicator */}
        <StepBar current={step} />

        {/* ── Upload step ── */}
        {step === 'upload' && (
          <div
            ref={dropRef}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 16, padding: '64px 32px',
              textAlign: 'center', cursor: 'pointer',
              transition: 'border-color .2s, background .2s',
              background: 'var(--surface)',
              marginBottom: 20,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>📹</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              Drop your Short here, or click to browse
            </p>
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>
              mp4 · mov · webm · avi — max 500MB
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={onFileInput}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {uploadProg > 0 && uploadProg < 100 && (
          <ProgressBar label="Uploading..." pct={uploadProg} />
        )}

        {/* ── Edit step ── */}
        {step === 'edit' && video && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

            {/* Left — controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Trim section */}
              <Card title="1 · Trim — Remove Source CTAs">
                <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.6 }}>
                  Set trim points to cut out any existing end-screens, channel watermarks or CTAs from the source video. The section between Start and End is kept.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <NumberInput
                    label={`Trim Start (sec) — video is ${video.duration.toFixed(1)}s`}
                    value={trimStart}
                    min={0}
                    max={trimEnd - 1}
                    step={0.5}
                    onChange={setTrimStart}
                  />
                  <NumberInput
                    label="Trim End (sec)"
                    value={trimEnd}
                    min={trimStart + 1}
                    max={video.duration}
                    step={0.5}
                    onChange={setTrimEnd}
                  />
                </div>
                <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 10, fontFamily: 'var(--mono)' }}>
                  Keeping {(trimEnd - trimStart).toFixed(1)}s of {video.duration.toFixed(1)}s
                </p>
              </Card>

              {/* Slides section */}
              <Card title="2 · CTA Slides">
                <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.6 }}>
                  Add branded slides before or after your video. Each slide is a full-screen 1080×1920 card with your text.
                </p>

                {slides.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--faint)', fontFamily: 'var(--mono)', marginBottom: 16 }}>
                    No slides added yet.
                  </p>
                )}

                {slides.map((slide, idx) => (
                  <SlideEditor
                    key={slide.id}
                    slide={slide}
                    index={idx}
                    onChange={updates => updateSlide(slide.id, updates)}
                    onRemove={() => removeSlide(slide.id)}
                  />
                ))}

                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <Btn onClick={() => addSlide('before')} variant="outline">+ Before video</Btn>
                  <Btn onClick={() => addSlide('after')}  variant="outline">+ After video</Btn>
                </div>
              </Card>

              {/* Process button */}
              <div>
                <Btn onClick={processVideo} variant="primary" fullWidth>
                  Process Video →
                </Btn>
                <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 8, fontFamily: 'var(--mono)' }}>
                  FFmpeg will trim, generate slides, and concatenate everything.
                </p>
              </div>
            </div>

            {/* Right — video preview */}
            <div style={{ position: 'sticky', top: 24 }}>
              <Card title="Preview">
                <video
                  ref={videoRef}
                  src={video.publicPath}
                  controls
                  style={{ width: '100%', borderRadius: 8, background: '#000' }}
                />
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <MetaRow label="Duration"   value={`${video.duration.toFixed(1)}s`} />
                  <MetaRow label="Resolution" value={`${video.width}×${video.height}`} />
                  <MetaRow label="File"       value={video.filename} mono />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── Processing step ── */}
        {step === 'processing' && (
          <Card title="Processing...">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 0' }}>
              <div style={{
                width: 28, height: 28, border: '3px solid var(--muted)',
                borderTopColor: 'var(--accent)', borderRadius: '50%',
                animation: 'spin .7s linear infinite', flexShrink: 0,
              }} />
              <div>
                <p style={{ fontSize: 14, color: 'var(--text)' }}>{procStatus}</p>
                <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                  This may take a minute for longer videos.
                </p>
              </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </Card>
        )}

        {/* ── Done step ── */}
        {step === 'done' && outputPath && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
            <Card title="✓ Processing Complete">
              <p style={{ fontSize: 14, color: 'var(--dim)', marginBottom: 20 }}>
                Your edited Short is ready. Preview it below, then download.
              </p>
              <video
                src={outputPath}
                controls
                style={{ width: '100%', maxHeight: 500, borderRadius: 8, background: '#000' }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {/* 
                  KEY: This is a plain <a> with download attribute.
                  There is NO onClick navigation. The href points to the file.
                  The download attribute tells the browser to save — not navigate.
                  This is the correct way to trigger a file download.
                */}
                <a
                  href={outputPath}
                  download={outputName}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                    padding: '12px 20px', borderRadius: 10,
                    background: 'var(--accent)',
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    textDecoration: 'none', transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#cc0000')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
                >
                  ↓ Download {outputName}
                </a>
                <Btn
                  onClick={() => {
                    setStep('upload')
                    setVideo(null)
                    setSlides([])
                    setOutputPath('')
                    setUploadProg(0)
                  }}
                  variant="outline"
                >
                  Edit another
                </Btn>
              </div>
            </Card>

            <Card title="What was done">
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {trimStart > 0 && (
                  <Li>Trimmed first {trimStart.toFixed(1)}s (removed source intro)</Li>
                )}
                {video && trimEnd < video.duration && (
                  <Li>Trimmed last {(video.duration - trimEnd).toFixed(1)}s (removed source CTAs/end-screen)</Li>
                )}
                {slides.filter(s => s.position === 'before').map((s, i) => (
                  <Li key={i}>Added {s.duration}s "{s.text}" slide before video</Li>
                ))}
                {slides.filter(s => s.position === 'after').map((s, i) => (
                  <Li key={i}>Added {s.duration}s "{s.text}" slide after video</Li>
                ))}
                {trimStart === 0 && video && trimEnd >= video.duration && slides.length === 0 && (
                  <Li>No changes — video passed through as-is</Li>
                )}
              </ul>
            </Card>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16,
            background: '#180a0a', border: '1px solid #3a1010',
            borderRadius: 10, padding: '12px 16px',
            color: '#f87171', fontFamily: 'var(--mono)', fontSize: 13,
          }}>
            ✕ {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload',     label: '1 Upload'   },
    { key: 'edit',       label: '2 Edit'     },
    { key: 'processing', label: '3 Process'  },
    { key: 'done',       label: '4 Export'   },
  ]
  const idx = steps.findIndex(s => s.key === current)
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            padding: '5px 14px', borderRadius: 20,
            fontSize: 11, fontFamily: 'var(--mono)',
            background: i <= idx ? 'var(--accent)' : 'var(--surface)',
            color: i <= idx ? '#fff' : 'var(--dim)',
            border: `1px solid ${i <= idx ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'all .2s',
          }}>{s.label}</div>
          {i < steps.length - 1 && (
            <div style={{ width: 20, height: 1, background: i < idx ? 'var(--accent)' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14, padding: '20px 22px',
    }}>
      <p style={{
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '2px',
        textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16,
      }}>{title}</p>
      {children}
    </div>
  )
}

function SlideEditor({ slide, index, onChange, onRemove }: {
  slide: Slide
  index: number
  onChange: (u: Partial<Slide>) => void
  onRemove: () => void
}) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 14, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{
          fontSize: 10, fontFamily: 'var(--mono)',
          color: slide.position === 'before' ? '#60a5fa' : '#f59e0b',
          textTransform: 'uppercase', letterSpacing: 2,
        }}>
          {slide.position} video — slide {index + 1}
        </span>
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: 16 }}
        >×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <TextInput
          label="Main text"
          value={slide.text}
          placeholder="FOLLOW FOR MORE"
          onChange={v => onChange({ text: v })}
        />
        <TextInput
          label="Subtext (optional)"
          value={slide.subtext}
          placeholder="@yourhandle"
          onChange={v => onChange({ subtext: v })}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
        <NumberInput
          label="Seconds"
          value={slide.duration}
          min={1}
          max={10}
          step={1}
          onChange={v => onChange({ duration: v })}
        />
        <ColorInput label="Background"  value={slide.bgColor}     onChange={v => onChange({ bgColor: v })} />
        <ColorInput label="Text color"  value={slide.textColor}   onChange={v => onChange({ textColor: v })} />
        <ColorInput label="Accent"      value={slide.accentColor} onChange={v => onChange({ accentColor: v })} />
      </div>

      {/* Preview */}
      <div style={{
        marginTop: 12,
        background: slide.bgColor,
        borderRadius: 6,
        height: 80,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 4,
      }}>
        <span style={{ color: slide.textColor, fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>
          {slide.text || 'Main text'}
        </span>
        {slide.subtext && (
          <span style={{ color: slide.accentColor, fontSize: 12 }}>{slide.subtext}</span>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--dim)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'var(--muted)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: 'var(--accent)', borderRadius: 2,
          transition: 'width .3s ease',
        }} />
      </div>
    </div>
  )
}

function Btn({ onClick, children, variant, fullWidth }: {
  onClick?: () => void
  children: React.ReactNode
  variant: 'primary' | 'outline'
  fullWidth?: boolean
}) {
  const base: React.CSSProperties = {
    padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'all .15s', border: 'none',
    width: fullWidth ? '100%' : undefined,
  }
  const styles: Record<string, React.CSSProperties> = {
    primary: { ...base, background: 'var(--accent)', color: '#fff' },
    outline: { ...base, background: 'transparent', color: 'var(--dim)', border: '1px solid var(--border)' },
  }
  return (
    <button
      onClick={onClick}
      style={styles[variant]}
      onMouseEnter={e => {
        if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = '#cc0000'
        else (e.currentTarget as HTMLElement).style.borderColor = 'var(--muted)'
      }}
      onMouseLeave={e => {
        if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--accent)'
        else (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
      }}
    >{children}</button>
  )
}

function TextInput({ label, value, placeholder, onChange }: {
  label: string; value: string; placeholder?: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--dim)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 7,
          padding: '7px 10px', fontSize: 13, color: 'var(--text)',
          transition: 'border-color .15s',
        }}
      />
    </div>
  )
}

function NumberInput({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--dim)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: '100%', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 7,
          padding: '7px 10px', fontSize: 13, color: 'var(--text)',
        }}
      />
    </div>
  )
}

function ColorInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--dim)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 }}
        />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 7,
            padding: '5px 8px', fontSize: 11, color: 'var(--text)',
            fontFamily: 'var(--mono)',
          }}
        />
      </div>
    </div>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 11, color: 'var(--dim)' }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: mono ? 'var(--mono)' : undefined }}>{value}</span>
    </div>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--dim)' }}>
      <span style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }}>✓</span>
      <span>{children}</span>
    </li>
  )
}
