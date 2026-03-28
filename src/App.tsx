import { useState, useRef, useCallback, useEffect } from 'react'
import { generatePatternSvg, validateMeasurements } from './svg-generator'
import './app.css'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalibState {
  topLeftX: number; topLeftY: number;
  bottomRightX: number; bottomRightY: number;
  gridCols: number; gridRows: number;
}

interface AppState {
  measureA: string; measureB: string; measureC: string;
  templateUri: string | null;
  templateWidth: number; templateHeight: number;
  calibration: CalibState;
  showGrid: boolean;
  seamAllowance: string;
  isGenerated: boolean;
}

const defaultCalib: CalibState = {
  topLeftX: 0, topLeftY: 0,
  bottomRightX: 0, bottomRightY: 0,
  gridCols: 32, gridRows: 32,
};

const initialState: AppState = {
  measureA: '', measureB: '', measureC: '',
  templateUri: null, templateWidth: 0, templateHeight: 0,
  calibration: defaultCalib,
  showGrid: true, seamAllowance: '0',
  isGenerated: false,
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<AppState>(initialState)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'setup' | 'preview'>('setup')
  const [showInstructions, setShowInstructions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [zoom, setZoom] = useState(1.0)

  const update = (patch: Partial<AppState>) => setState(s => ({ ...s, ...patch }))
  const updateCalib = (patch: Partial<CalibState>) =>
    setState(s => ({ ...s, calibration: { ...s.calibration, ...patch } }))

  const handleGenerate = useCallback(async () => {
    setError(null)
    const v = validateMeasurements(state.measureA, state.measureB)
    if (!v.valid) { setError(v.error || 'Invalid measurements.'); return }
    setIsGenerating(true)
    try {
      const svg = generatePatternSvg({
        measureA: parseFloat(state.measureA),
        measureB: parseFloat(state.measureB),
        measureC: parseFloat(state.measureC) || 0,
        templateUri: state.templateUri,
        templateWidth: state.templateWidth,
        templateHeight: state.templateHeight,
        gridTopLeftX: state.calibration.topLeftX,
        gridTopLeftY: state.calibration.topLeftY,
        gridBottomRightX: state.calibration.bottomRightX,
        gridBottomRightY: state.calibration.bottomRightY,
        gridCols: state.calibration.gridCols,
        gridRows: state.calibration.gridRows,
        showGrid: state.showGrid,
        gridColor: '#C9A0A0',
        seamAllowance: parseFloat(state.seamAllowance) || 0,
      })
      setSvgContent(svg)
      update({ isGenerated: true })
      setActiveTab('preview')
    } finally {
      setIsGenerating(false)
    }
  }, [state])

  const handleDownload = () => {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `elegantissima-pattern-A${state.measureA}-B${state.measureB}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const canGenerate = state.measureA !== '' && state.measureB !== ''

  return (
    <div className="app-root">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="header-title">Elegantissima</span>
          <span className="header-sub">Pattern Maker · A/W 1956</span>
        </div>
        <div className="header-tabs">
          <button
            className={`tab-btn ${activeTab === 'setup' ? 'active' : ''}`}
            onClick={() => setActiveTab('setup')}
          >Setup</button>
          <button
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview{state.isGenerated ? ' ✦' : ''}
          </button>
        </div>
      </header>

      {/* Two-pane layout */}
      <div className="main-layout">
        {/* LEFT PANE — Setup */}
        <aside className={`left-pane ${activeTab === 'setup' ? 'pane-visible' : 'pane-hidden'}`}>
          <InputPanel
            state={state}
            update={update}
            updateCalib={updateCalib}
            error={error}
            isGenerating={isGenerating}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
            onShowInstructions={() => setShowInstructions(true)}
          />
        </aside>

        {/* RIGHT PANE — Preview */}
        <main className={`right-pane ${activeTab === 'preview' ? 'pane-visible' : 'pane-hidden'}`}>
          <PreviewPanel
            svgContent={svgContent}
            isGenerated={state.isGenerated}
            zoom={zoom}
            setZoom={setZoom}
            onDownload={handleDownload}
          />
        </main>
      </div>

      {/* Instructions Modal */}
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
    </div>
  )
}

// ─── Input Panel ──────────────────────────────────────────────────────────────
function InputPanel({
  state, update, updateCalib, error, isGenerating, canGenerate, onGenerate, onShowInstructions
}: {
  state: AppState
  update: (p: Partial<AppState>) => void
  updateCalib: (p: Partial<CalibState>) => void
  error: string | null
  isGenerating: boolean
  canGenerate: boolean
  onGenerate: () => void
  onShowInstructions: () => void
}) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      update({
        templateUri: url,
        templateWidth: img.naturalWidth,
        templateHeight: img.naturalHeight,
      })
    }
    img.src = url
  }

  return (
    <div className="input-panel">
      <div className="panel-header">
        <h2 className="panel-title">Pattern Setup</h2>
        <button className="help-btn" onClick={onShowInstructions}>? Instructions</button>
      </div>

      {/* Body Measurements */}
      <SectionHeader title="Body Measurements" sub="All measurements in centimetres (cm)" />
      <MeasurementRow
        label="A" sublabel="Chest circumference"
        value={state.measureA} placeholder="e.g. 92"
        onChange={v => update({ measureA: v })}
      />
      <MeasurementRow
        label="B" sublabel="Armpit to ground"
        value={state.measureB} placeholder="e.g. 115"
        onChange={v => update({ measureB: v })}
      />
      <MeasurementRow
        label="C" sublabel="Waist to hem (desired length)" optional
        value={state.measureC} placeholder="e.g. 65"
        onChange={v => update({ measureC: v })}
      />

      {/* Pattern Template */}
      <SectionHeader title="Pattern Template" sub="Upload a scan of the printed pattern diagram" />
      <label className={`upload-area ${state.templateUri ? 'has-image' : ''}`}>
        {state.templateUri ? (
          <div className="upload-preview">
            <img src={state.templateUri} alt="Template" className="upload-thumb" />
            <div className="upload-preview-text">
              <span className="upload-label">Template loaded</span>
              <span className="upload-sub">{state.templateWidth} × {state.templateHeight} px</span>
              <span className="upload-change">Click to change</span>
            </div>
          </div>
        ) : (
          <div className="upload-empty">
            <span className="upload-icon">⬆</span>
            <span className="upload-label">Upload Pattern Template</span>
            <span className="upload-sub">PNG, JPG, or SVG image</span>
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
      </label>

      {/* Grid Calibration */}
      {state.templateUri && (
        <>
          <SectionHeader title="Grid Calibration" sub="Click on the template to mark the printed grid corners" />
          <CalibrationOverlay
            templateUri={state.templateUri}
            templateWidth={state.templateWidth}
            templateHeight={state.templateHeight}
            calibration={state.calibration}
            updateCalib={updateCalib}
          />
          <div className="calib-grid">
            <CalibInput label="Top-Left X (px)" value={String(state.calibration.topLeftX)}
              onChange={v => updateCalib({ topLeftX: parseFloat(v) || 0 })} />
            <CalibInput label="Top-Left Y (px)" value={String(state.calibration.topLeftY)}
              onChange={v => updateCalib({ topLeftY: parseFloat(v) || 0 })} />
            <CalibInput label="Bottom-Right X (px)" value={String(state.calibration.bottomRightX)}
              onChange={v => updateCalib({ bottomRightX: parseFloat(v) || 0 })} />
            <CalibInput label="Bottom-Right Y (px)" value={String(state.calibration.bottomRightY)}
              onChange={v => updateCalib({ bottomRightY: parseFloat(v) || 0 })} />
            <CalibInput label="Grid Columns" value={String(state.calibration.gridCols)}
              onChange={v => updateCalib({ gridCols: parseInt(v) || 32 })} />
            <CalibInput label="Grid Rows" value={String(state.calibration.gridRows)}
              onChange={v => updateCalib({ gridRows: parseInt(v) || 32 })} />
          </div>
        </>
      )}

      {/* Grid Settings */}
      <SectionHeader title="Grid Settings" />
      <div className="setting-row">
        <span className="setting-label">Show Grid Overlay</span>
        <label className="toggle">
          <input type="checkbox" checked={state.showGrid}
            onChange={e => update({ showGrid: e.target.checked })} />
          <span className="toggle-track" />
        </label>
      </div>
      <div className="setting-row">
        <span className="setting-label">Seam Allowance</span>
        <div className="seam-input">
          <input type="number" min="0" max="10" step="0.5"
            value={state.seamAllowance}
            onChange={e => update({ seamAllowance: e.target.value })}
            className="seam-number" />
          <span className="seam-unit">cm</span>
        </div>
      </div>

      {/* Error */}
      {error && <div className="error-box">{error}</div>}

      {/* Generate Button */}
      <button
        className={`generate-btn ${canGenerate ? 'enabled' : 'disabled'}`}
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
      >
        {isGenerating ? 'Generating…' : '✦ Generate Pattern'}
      </button>
    </div>
  )
}

// ─── Calibration Overlay ──────────────────────────────────────────────────────
function CalibrationOverlay({
  templateUri, templateWidth, templateHeight, calibration, updateCalib
}: {
  templateUri: string
  templateWidth: number
  templateHeight: number
  calibration: CalibState
  updateCalib: (p: Partial<CalibState>) => void
}) {
  const [mode, setMode] = useState<'view' | 'tl' | 'br'>('view')
  const containerRef = useRef<HTMLDivElement>(null)
  const DISPLAY_W = 300

  const aspectRatio = templateWidth > 0 && templateHeight > 0 ? templateHeight / templateWidth : 1
  const displayH = DISPLAY_W * aspectRatio
  const scaleX = templateWidth / DISPLAY_W
  const scaleY = templateHeight / displayH

  const rectX = calibration.topLeftX / scaleX
  const rectY = calibration.topLeftY / scaleY
  const rectW = (calibration.bottomRightX - calibration.topLeftX) / scaleX
  const rectH = (calibration.bottomRightY - calibration.topLeftY) / scaleY

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'view') return
    const rect = containerRef.current!.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)
    if (mode === 'tl') { updateCalib({ topLeftX: x, topLeftY: y }); setMode('br') }
    else { updateCalib({ bottomRightX: x, bottomRightY: y }); setMode('view') }
  }

  return (
    <div className="calib-overlay-wrap">
      <div
        ref={containerRef}
        className={`calib-image-container ${mode !== 'view' ? 'calib-crosshair' : ''}`}
        style={{ width: DISPLAY_W, height: displayH }}
        onClick={handleClick}
      >
        <img src={templateUri} alt="Template" style={{ width: DISPLAY_W, height: displayH, display: 'block' }} />
        {rectW > 0 && rectH > 0 && (
          <div className="calib-rect" style={{ left: rectX, top: rectY, width: rectW, height: rectH }}>
            <div className="calib-corner tl" />
            <div className="calib-corner tr" />
            <div className="calib-corner bl" />
            <div className="calib-corner br" />
          </div>
        )}
        {mode !== 'view' && (
          <div className="calib-mode-badge">
            {mode === 'tl' ? '↖ Click top-left corner of grid' : '↘ Click bottom-right corner of grid'}
          </div>
        )}
      </div>
      <div className="calib-btn-row">
        <button
          className={`calib-btn ${mode === 'tl' ? 'active' : ''}`}
          onClick={() => setMode(mode === 'tl' ? 'view' : 'tl')}
        >↖ Set top-left</button>
        <button
          className={`calib-btn ${mode === 'br' ? 'active' : ''}`}
          onClick={() => setMode(mode === 'br' ? 'view' : 'br')}
        >↘ Set bottom-right</button>
      </div>
      <p className="calib-hint">
        The pink rectangle marks the printed grid area. Click the buttons above then click on the image to set corners precisely.
      </p>
    </div>
  )
}

// ─── Preview Panel ────────────────────────────────────────────────────────────
function PreviewPanel({
  svgContent, isGenerated, zoom, setZoom, onDownload
}: {
  svgContent: string | null
  isGenerated: boolean
  zoom: number
  setZoom: (z: number) => void
  onDownload: () => void
}) {
  const svgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !svgContent) return
    svgRef.current.innerHTML = svgContent
    const svg = svgRef.current.querySelector('svg')
    if (svg) { svg.style.display = 'block'; svg.style.maxWidth = 'none' }
  }, [svgContent])

  // Get SVG natural dimensions for scroll sizing
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!svgRef.current || !svgContent) return
    const svg = svgRef.current.querySelector('svg')
    if (!svg) return
    const w = parseFloat(svg.getAttribute('width') || '0')
    const h = parseFloat(svg.getAttribute('height') || '0')
    if (w > 0 && h > 0) setNaturalSize({ w, h })
  }, [svgContent])

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <span className="preview-title">Pattern Preview</span>
        {isGenerated && (
          <div className="preview-actions">
            <button className="zoom-btn" onClick={() => setZoom(Math.max(zoom - 0.25, 0.25))}>−</button>
            <button className="zoom-pct" onClick={() => setZoom(1.0)}>{Math.round(zoom * 100)}%</button>
            <button className="zoom-btn" onClick={() => setZoom(Math.min(zoom + 0.25, 4.0))}>+</button>
            <button className="download-btn" onClick={onDownload}>↓ SVG</button>
          </div>
        )}
      </div>

      <div className="preview-content">
        {!isGenerated || !svgContent ? (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <div className="empty-title">Pattern Preview</div>
            <div className="empty-body">
              Enter your measurements and click<br />
              <strong>Generate Pattern</strong><br />
              to see your scaled pattern here.
            </div>
            <div className="empty-hint">
              The app creates a 32×32 grid scaled to your body measurements,
              with your pattern template aligned using affine transforms.
            </div>
          </div>
        ) : (
          <div className="svg-scroll-area">
            <div
              className="svg-scroll-inner"
              style={{
                width: naturalSize.w > 0 ? naturalSize.w * zoom : 'auto',
                height: naturalSize.h > 0 ? naturalSize.h * zoom : 'auto',
              }}
            >
              <div
                ref={svgRef}
                className="svg-container"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Instructions Modal ───────────────────────────────────────────────────────
function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">How to Use</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <h3>Three Body Measurements</h3>
          <div className="instruction-row">
            <span className="instr-badge">A</span>
            <div>
              <strong>Chest circumference</strong> — Measure around the fullest part of your chest.
              This sets the <em>width</em> of your pattern grid.
            </div>
          </div>
          <div className="instruction-row">
            <span className="instr-badge">B</span>
            <div>
              <strong>Armpit to ground</strong> — Measure from your armpit straight down to the floor.
              This sets the <em>height</em> of your pattern grid.
            </div>
          </div>
          <div className="instruction-row">
            <span className="instr-badge">C</span>
            <div>
              <strong>Waist to hem</strong> — The desired finished length of the garment, measured from waist to hem.
              Shown as a dashed line on the pattern.
            </div>
          </div>

          <h3>Making Your Pattern Grid</h3>
          <p>
            The Elegantissima system creates a rectangle <strong>A cm wide × B cm tall</strong>,
            then divides it into <strong>32 × 32 equal sections</strong> by folding in half
            repeatedly (4 times in each direction). Each cell = A/32 cm × B/32 cm.
          </p>

          <h3>Uploading a Pattern Template</h3>
          <p>
            Upload a scan of the printed <em>Tabella</em> diagram from the pattern booklet.
            Use the <strong>Grid Calibration</strong> tool to mark the exact pixel coordinates
            of the printed grid's top-left and bottom-right corners. The app then computes an
            affine transform <code>matrix(scaleX, 0, 0, scaleY, tx, ty)</code> to align the
            template's printed grid to your personal measurement grid.
          </p>

          <h3>Downloading</h3>
          <p>
            Click <strong>↓ SVG</strong> in the preview panel to download the finished pattern
            as a scalable SVG file. Print at 100% scale on large-format paper (A0/A1) so the
            grid dimensions match your actual measurements.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Small reusable components ────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="section-header">
      <span className="section-title">{title}</span>
      {sub && <span className="section-sub">{sub}</span>}
    </div>
  )
}

function MeasurementRow({
  label, sublabel, value, placeholder, optional, onChange
}: {
  label: string; sublabel: string; value: string; placeholder: string;
  optional?: boolean; onChange: (v: string) => void
}) {
  return (
    <div className="measure-row">
      <div className="measure-label-wrap">
        <span className="measure-badge">{label}</span>
        <span className="measure-sublabel">{sublabel}</span>
        {optional && <span className="measure-optional">(optional)</span>}
      </div>
      <div className="measure-input-wrap">
        <input
          type="number" min="0" max="300" step="0.5"
          className="measure-input"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
        />
        <span className="measure-unit">cm</span>
      </div>
    </div>
  )
}

function CalibInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="calib-input-item">
      <label className="calib-input-label">{label}</label>
      <input
        type="number" min="0" step="1"
        className="calib-input-field"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
