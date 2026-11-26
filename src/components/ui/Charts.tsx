// Lightweight dependency-free charts (SVG) for the dashboard & reports.

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  max?: number;
}

export function BarChart({ data, height = 200, max }: BarChartProps) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / m) * (height - 30));
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group">
              <span className="text-xs font-semibold text-graphite-600 mb-1 opacity-0 group-hover:opacity-100 transition">{d.value}</span>
              <div
                className="w-full max-w-[42px] rounded-t-md transition-all duration-300 hover:opacity-80"
                style={{ height: h, backgroundColor: d.color ?? '#F28C28' }}
                title={`${d.label}: ${d.value}`}
              />
              <span className="text-[11px] text-graphite-400 mt-2 text-center truncate w-full">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ segments, size = 180, centerLabel, centerValue }: DonutChartProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = size / 2 - 12;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F4F5F6" strokeWidth="14" />
        {segments.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={s.color} strokeWidth="14"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="flex flex-col gap-2">
        {(centerValue || centerLabel) && (
          <div className="mb-1">
            {centerValue && <p className="text-2xl font-display font-bold text-graphite-600">{centerValue}</p>}
            {centerLabel && <p className="text-xs text-graphite-400">{centerLabel}</p>}
          </div>
        )}
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-graphite-500">{s.label}</span>
            <span className="font-semibold text-graphite-600 ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export function LineChart({ data, height = 180, color = '#F28C28' }: LineChartProps) {
  if (data.length === 0) return null;
  const w = 600;
  const h = height;
  const pad = 30;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.value / max) * (h - pad * 2);
    return { x, y, ...d };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} stroke="#E9ECEE" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#lineFill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke={color} strokeWidth="2" />
          <text x={p.x} y={h - 10} textAnchor="middle" className="fill-graphite-400" style={{ fontSize: 10 }}>{p.label}</text>
        </g>
      ))}
    </svg>
  );
}
