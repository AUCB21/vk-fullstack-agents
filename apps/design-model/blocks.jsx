// Reusable content blocks: tool calls, tables, KPI strip, sparkline, citations

function ToolCall({ verb, path, ms, params, result, status, defaultOpen }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div className={"tool" + (open ? " open" : "")}>
      <div className="tool-hd" onClick={() => setOpen(o => !o)}>
        <div className={"stat " + status}>
          {status === "running" ? <span className="spin"></span> : <Icon name="check" />}
        </div>
        <span className="verb">{verb}</span>
        <span className="path">{path}</span>
        <span className="ms">{ms}</span>
        <span style={{ width: 14, height: 14, display: "grid", placeItems: "center", color: "var(--text-subtle)" }}>
          <Icon name="chev" />
        </span>
      </div>
      {open && (
        <div className="tool-body">
          {params && (<><span className="k">$select</span><span className="v">{params}</span></>)}
          {result && (<><span className="k">→</span><span className="v">{result}</span></>)}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    ok:   { cls: "ok",   txt: "In stock" },
    warn: { cls: "warn", txt: "Low" },
    err:  { cls: "err",  txt: "Critical" },
  };
  const m = map[status] || map.ok;
  return <span className={"pill " + m.cls}><span className="pdot"></span>{m.txt}</span>;
}

function CiteCode({ code, kind, onClick }) {
  return (
    <span className="cite-doc" onClick={(e) => onClick && onClick(code, kind, e)}>
      {code}
    </span>
  );
}

function InventoryTable({ rows, onCite }) {
  return (
    <div className="table-card">
      <div className="table-hd">
        <Icon name="table" />
        <span>Inventory — Items below reorder point</span>
        <span className="count">{rows.length} rows</span>
        <div className="actions">
          <button title="Filter"><Icon name="filter" /></button>
          <button title="Export"><Icon name="download" /></button>
          <button title="More"><Icon name="more" /></button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th className="code">ItemCode</th>
              <th>ItemName</th>
              <th>Whs</th>
              <th style={{textAlign:"right"}}>OnHand</th>
              <th style={{textAlign:"right"}}>Committed</th>
              <th style={{textAlign:"right"}}>Ordered</th>
              <th style={{textAlign:"right"}}>AvgPrice</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.ItemCode}>
                <td className="code"><CiteCode code={r.ItemCode} kind="item" onClick={onCite} /></td>
                <td>{r.ItemName}</td>
                <td className="code">{r.Whs}</td>
                <td className="num">{r.OnHand.toLocaleString()}</td>
                <td className="num">{r.Committed.toLocaleString()}</td>
                <td className="num">{r.Ordered.toLocaleString()}</td>
                <td className="num">${r.AvgPrice.toFixed(2)}</td>
                <td><StatusPill status={r.Status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPIStrip({ items }) {
  return (
    <div className="kpis">
      {items.map((k, i) => (
        <div className="kpi" key={i}>
          <span className="l">{k.l}</span>
          <span className="v">{k.v}</span>
          <span className={"d " + (k.up ? "up" : "down")}>
            <Icon name={k.up ? "arrowup" : "arrowdown"} style={{ width: 10, height: 10 }} />
            {k.d}
          </span>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ data, w = 760, h = 90 }) {
  // Two-series mini line chart: inbound vs outbound
  const pad = { l: 8, r: 8, t: 8, b: 18 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const max = Math.max(...data.flatMap(d => [d.inbound, d.outbound])) * 1.1;
  const x = i => pad.l + (i / (data.length - 1)) * innerW;
  const y = v => pad.t + innerH - (v / max) * innerH;

  const lineFor = (k) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[k])}`).join(" ");
  const areaFor = (k) => `${lineFor(k)} L ${x(data.length - 1)} ${pad.t + innerH} L ${x(0)} ${pad.t + innerH} Z`;

  return (
    <div className="chart-card">
      <div className="ttl">
        <Icon name="chart" />
        <span>Weekly stock movement</span>
        <span className="sub">items · 6 weeks</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
        <defs>
          <linearGradient id="g-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="g-out" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--text-muted)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--text-muted)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * p} y2={pad.t + innerH * p}
                stroke="var(--border)" strokeDasharray="2 4" />
        ))}
        <path d={areaFor("inbound")} fill="url(#g-in)" />
        <path d={lineFor("inbound")} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={lineFor("outbound")} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.inbound)} r="2.5" fill="var(--accent)" />
        ))}
        {data.map((d, i) => (
          <text key={"t"+i} x={x(i)} y={h - 4} fontSize="10" fill="var(--text-subtle)" textAnchor="middle"
                fontFamily="var(--font-mono)">{d.week}</text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 2, background: "var(--accent)", borderRadius: 2 }}></span>
          Inbound (GRPO)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 2, background: "var(--text-muted)", borderRadius: 2, borderTop: "1px dashed" }}></span>
          Outbound (deliveries)
        </span>
      </div>
    </div>
  );
}

window.ToolCall = ToolCall;
window.InventoryTable = InventoryTable;
window.KPIStrip = KPIStrip;
window.Sparkline = Sparkline;
window.CiteCode = CiteCode;
window.StatusPill = StatusPill;
