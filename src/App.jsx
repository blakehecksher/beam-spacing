import React from 'react';

export default function BeamSpacingCalculator() {
  // Inputs (inches + degrees)
  const [C, setC] = React.useState(108); // ceiling height (in)
  const [D, setD] = React.useState(36);  // work plane (in)
  const [B, setB] = React.useState(30);  // beam angle value
  const [angleMode, setAngleMode] = React.useState("full"); // 'full' included or 'half'
  const [s, setS] = React.useState(0.9); // spacing factor

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // ----- Core math helpers (also used by tests) -----
  function toRadians(deg) { return (deg * Math.PI) / 180; }
  function computeAll({ C, D, B, angleMode = 'full', s = 1 }) {
    const MH = Math.max(0, C - D);
    const thetaDeg = angleMode === 'full' ? B / 2 : B; // half-angle for trig
    const theta = toRadians(thetaDeg);
    const r = MH * Math.tan(theta);
    const A_touch = 2 * r;
    const A = s * A_touch;
    return { MH, thetaDeg, r, A_touch, A };
  }

  // Derived values (for UI)
  const { MH, thetaDeg, r, A_touch, A } = computeAll({ C, D, B, angleMode, s });
  const overlap = Math.max(0, A_touch - A); // linear overlap on work plane (in)
  const overlapPct = A_touch > 0 ? (overlap / A_touch) * 100 : 0;

  // ----- Lightweight "tests" (console) -----
  React.useEffect(() => {
    const nearly = (a, b, tol = 0.03) => Math.abs(a - b) <= tol;
    // Test 1: Example from chat — C=108, D=36, B=30 (full), s=1
    // Expected A_touch ≈ 38.585" (2 * 72 * tan(15°))
    const t1 = computeAll({ C: 108, D: 36, B: 30, angleMode: 'full', s: 1 });
    console.assert(nearly(t1.A_touch, 38.585, 0.05), `Test1 failed: got ${t1.A_touch}`);

    // Test 2: Same but s=0.9 → A ≈ 34.726"
    const t2 = computeAll({ C: 108, D: 36, B: 30, angleMode: 'full', s: 0.9 });
    console.assert(nearly(t2.A, 34.726, 0.05), `Test2 failed: got ${t2.A}`);

    // Test 3: Half-angle 15° should match full 30° touch spacing
    const t3 = computeAll({ C: 108, D: 36, B: 15, angleMode: 'half', s: 1 });
    console.assert(nearly(t3.A_touch, t1.A_touch, 0.01), `Test3 failed: got ${t3.A_touch} vs ${t1.A_touch}`);
  }, []);

  // Helpers
  function inchesToFeetIn(inches) {
    if (!isFinite(inches)) return "–";
    const sign = inches < 0 ? -1 : 1;
    inches = Math.abs(inches);
    const feet = Math.floor(inches / 12);
    let remIn = inches - feet * 12;
    // round to nearest 1/8"
    const eighths = Math.round(remIn * 8) / 8;
    remIn = eighths;
    const inchesWhole = Math.floor(remIn);
    const frac = remIn - inchesWhole;
    const fracStr = (() => {
      const den = 8;
      const num = Math.round(frac * den);
      if (num === 0) return "";
      return `${num}/${den}`.replace(/\b1\/8\b/, "1/8");
    })();
    const inStr = inchesWhole + (fracStr ? ` ${fracStr}` : "");
    const base = `${feet}\u2032-${inStr}\u2033`;
    return sign < 0 ? `-${base}` : base;
  }

  // Simple responsive SVG visual
  const svgWidth = 760;
  const svgHeight = 360;
  const margin = { top: 24, right: 24, bottom: 24, left: 24 };

  // We'll map MH vertically to 240px for clarity (ceiling to work plane)
  const MHpx = 240;
  const yCeil = margin.top;
  const yWork = margin.top + MHpx;

  // Horizontal scaling: fit A + 2r with some breathing room
  const totalWidthIn = Math.max(1, A + 2 * r);
  const drawableWidth = svgWidth - margin.left - margin.right;
  const xScale = drawableWidth / (totalWidthIn * 1.1); // 10% margin

  const center = margin.left + drawableWidth / 2;
  const xLeft = center - (A / 2) * xScale;
  const xRight = center + (A / 2) * xScale;

  const beamFootLeftL = (xLeft - r * xScale);
  const beamFootLeftR = (xLeft + r * xScale);
  const beamFootRightL = (xRight - r * xScale);
  const beamFootRightR = (xRight + r * xScale);

  function DimArrow({ x1, x2, y, label }) {
    const ah = 8; // arrow head size
    return (
      <g>
        <line x1={x1} y1={y} x2={x2} y2={y} strokeWidth={1.5} stroke="currentColor" />
        {/* left arrow */}
        <path d={`M${x1},${y} l${ah},-${ah / 2} M${x1},${y} l${ah},${ah / 2}`} stroke="currentColor" fill="none" />
        {/* right arrow */}
        <path d={`M${x2},${y} l-${ah},-${ah / 2} M${x2},${y} l-${ah},${ah / 2}`} stroke="currentColor" fill="none" />
        <text x={(x1 + x2) / 2} y={y - 8} textAnchor="middle" className="fill-current text-xs">
          {label}
        </text>
      </g>
    );
  }

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 p-6">
      <div className="max-w-6xl mx-auto grid gap-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Beam Spacing Calculator</h1>
            <p className="text-sm text-neutral-600">Compute fixture spacing <span className="font-mono">A</span> from ceiling height <span className="font-mono">C</span>, work-plane height <span className="font-mono">D</span>, and beam angle <span className="font-mono">B</span>. Visual below updates live.</p>
          </div>
          <button
            className="px-3 py-2 rounded-xl bg-white shadow border text-sm hover:shadow-md"
            onClick={() => { setC(108); setD(36); setB(30); setAngleMode("full"); setS(0.9); }}
            title="Reset to example"
          >Reset</button>
        </header>

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-3">Inputs</h2>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-600">Ceiling height, C (in)</span>
                <input type="number" className="px-3 py-2 rounded-xl border" min={0}
                  value={C}
                  onChange={(e)=> setC(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-600">Work plane, D (in)</span>
                <input type="number" className="px-3 py-2 rounded-xl border" min={0}
                  value={D}
                  onChange={(e)=> setD(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-600">Beam angle, B ({angleMode === 'full' ? 'full included' : 'half-angle'})</span>
                <input type="number" className="px-3 py-2 rounded-xl border" min={1} max={170}
                  value={B}
                  onChange={(e)=> setB(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-neutral-600">Angle mode</span>
                <select className="px-3 py-2 rounded-xl border" value={angleMode} onChange={(e)=> setAngleMode(e.target.value)}>
                  <option value="full">Full beam angle (included)</option>
                  <option value="half">Half-angle</option>
                </select>
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-sm text-neutral-600">Spacing factor, s (0.60–1.20)
                  <span className="ml-2 text-neutral-500">(1.00 = beams just meet; &lt;1 adds overlap)</span>
                </span>
                <div className="flex items-center gap-3">
                  <input type="range" min={0.6} max={1.2} step={0.01} className="w-full" value={s} onChange={(e)=> setS(Number(e.target.value))} />
                  <input type="number" step={0.01} min={0.6} max={1.2} className="w-24 px-3 py-2 rounded-xl border" value={s}
                    onChange={(e)=> setS(clamp(Number(e.target.value), 0.6, 1.2))} />
                </div>
              </label>
            </div>
            {MH <= 0 && (
              <p className="mt-3 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-sm">Work plane D must be less than ceiling height C.</p>
            )}

            {/* Quick presets */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <button className="px-2 py-1 rounded-lg border bg-white hover:shadow" onClick={() => { setC(108); setD(36); setB(30); setAngleMode('full'); setS(1); }}>Preset: Chat example (no overlap)</button>
              <button className="px-2 py-1 rounded-lg border bg-white hover:shadow" onClick={() => { setC(108); setD(36); setB(30); setAngleMode('full'); setS(0.9); }}>Preset: Chat example (10% overlap)</button>
              <button className="px-2 py-1 rounded-lg border bg-white hover:shadow" onClick={() => { setC(108); setD(36); setB(15); setAngleMode('half'); setS(1); }}>Preset: Half-angle 15° = Full 30°</button>
            </div>
          </div>

          {/* Outputs */}
          <div className="bg-white rounded-2xl shadow p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-3">Results</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="text-neutral-600">Mounting height, MH = C − D</div>
              <div className="font-medium">{MH.toFixed(1)} in ({inchesToFeetIn(MH)})</div>

              <div className="text-neutral-600">Half-angle used for trig</div>
              <div className="font-medium">{thetaDeg.toFixed(2)}°</div>

              <div className="text-neutral-600">Beam radius at work plane, r = MH·tan(θ)</div>
              <div className="font-medium">{r.toFixed(2)} in</div>

              <div className="text-neutral-600">Touch spacing, A<sub>touch</sub> = 2·MH·tan(θ)</div>
              <div className="font-medium">{A_touch.toFixed(2)} in ({inchesToFeetIn(A_touch)})</div>

              <div className="text-neutral-600">Chosen spacing, A = s·A<sub>touch</sub></div>
              <div className="font-semibold text-xl">{A.toFixed(2)} in <span className="text-neutral-500 text-base">({inchesToFeetIn(A)})</span></div>

              <div className="text-neutral-600">Linear overlap on work plane</div>
              <div className="font-medium">{overlap.toFixed(2)} in ({overlapPct.toFixed(1)}%)</div>
            </div>
            <p className="mt-4 text-xs text-neutral-500">Formula: A = 2·(C − D)·tan(B/2) for full included angle B (or A = 2·(C − D)·tan(B) if B is half-angle). Apply spacing factor s for desired overlap.</p>
          </div>
        </div>

        {/* Visual */}
        <div className="bg-white rounded-2xl shadow p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Geometry Visual</h2>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto text-neutral-800">
            {/* Ceiling line */}
            <line x1={margin.left} y1={yCeil} x2={svgWidth - margin.right} y2={yCeil} strokeWidth={2} stroke="currentColor" />
            <text x={margin.left} y={yCeil - 8} className="fill-current text-xs">Ceiling</text>

            {/* Work plane */}
            <line x1={margin.left} y1={yWork} x2={svgWidth - margin.right} y2={yWork} strokeWidth={1.5} strokeDasharray="4 3" stroke="currentColor" />
            <text x={margin.left} y={yWork + 14} className="fill-current text-xs">Work plane</text>

            {/* Fixtures */}
            <circle cx={xLeft} cy={yCeil} r={5} fill="currentColor" />
            <circle cx={xRight} cy={yCeil} r={5} fill="currentColor" />

            {/* Beams (edges) */}
            <line x1={xLeft} y1={yCeil} x2={beamFootLeftL} y2={yWork} strokeWidth={1.25} stroke="currentColor" />
            <line x1={xLeft} y1={yCeil} x2={beamFootLeftR} y2={yWork} strokeWidth={1.25} stroke="currentColor" />
            <line x1={xRight} y1={yCeil} x2={beamFootRightL} y2={yWork} strokeWidth={1.25} stroke="currentColor" />
            <line x1={xRight} y1={yCeil} x2={beamFootRightR} y2={yWork} strokeWidth={1.25} stroke="currentColor" />

            {/* A dimension on ceiling */}
            <DimArrow x1={xLeft} x2={xRight} y={yCeil + 24} label={`A = ${A.toFixed(2)}\"`} />

            {/* C and D note */}
            <g>
              <line x1={svgWidth - margin.right - 32} y1={yCeil} x2={svgWidth - margin.right - 32} y2={yWork} strokeWidth={1} stroke="currentColor" />
              <text x={svgWidth - margin.right - 36} y={(yCeil + yWork) / 2} transform={`rotate(-90 ${svgWidth - margin.right - 36} ${(yCeil + yWork) / 2})`} className="fill-current text-xs">MH = {MH.toFixed(1)}\"</text>
            </g>

            {/* Beam footprint overlap indicator */}
            {overlap > 0 && (
              <g>
                <DimArrow x1={beamFootLeftR} x2={beamFootRightL} y={yWork - 14} label={`overlap = ${overlap.toFixed(2)}\" (${overlapPct.toFixed(0)}%)`} />
              </g>
            )}

            {/* Labels near fixtures */}
            <text x={xLeft} y={yCeil - 8} textAnchor="middle" className="fill-current text-xs">Fixture</text>
            <text x={xRight} y={yCeil - 8} textAnchor="middle" className="fill-current text-xs">Fixture</text>
          </svg>
          <p className="mt-3 text-xs text-neutral-500">The drawing is schematic: vertical scale is fixed; horizontal scale auto-fits to your A and beam diameter at the work plane.</p>
        </div>

        <footer className="text-xs text-neutral-500">
          <p>Tip: For smoother uniformity, many lighting layouts use s ≈ 0.80–0.95. Always verify with photometrics for the actual fixture and reflectances.</p>
        </footer>
      </div>
    </div>
  );
}
