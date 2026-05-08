// Chat experience: empty state, messages, composer, streaming simulation

const SCRIPTED_FLOWS = {
  "stock-low": {
    user: "Show me items below reorder point in main warehouse",
    steps: [
      { type: "thinking", text: "Analyzing inventory levels…", ms: 700 },
      { type: "tool", verb: "GET", path: "/Items?$filter=OnHand lt MinStock&$select=ItemCode,ItemName,OnHand,Committed,OrderedQty",
        params: "ItemCode, ItemName, OnHand, Committed, OrderedQty",
        result: "6 items returned · cached 12s",
        ms: "412ms", status: "running", finalStatus: "done", delay: 900 },
      { type: "tool", verb: "GET", path: "/Warehouses('01-MAIN')",
        params: "WarehouseCode, WarehouseName",
        result: "01-MAIN · Main Warehouse",
        ms: "118ms", status: "running", finalStatus: "done", delay: 500 },
      { type: "stream", chunks: [
        "Found ", "**6 items** below reorder point in `01-MAIN`. ",
        "Three are critical (committed exceeds on-hand). ",
        "Combined committed shortfall is **94 units**, est. cost to backorder is **$8,420**."
      ] },
      { type: "table" },
      { type: "stream", chunks: [
        "\n\n**Recommendation**: Generate a draft PO to ", { cite: "V10145", kind: "vendor" },
        " for ", { cite: "A0017", kind: "item" }, " (Bearings Direct GmbH, lead time 9 days).",
      ]},
    ],
  },
  "kpis": {
    user: "Inventory health snapshot for this week",
    steps: [
      { type: "thinking", text: "Aggregating metrics across warehouses…", ms: 600 },
      { type: "tool", verb: "POST", path: "/sql/InventoryHealth",
        params: "fromDate=2026-04-01, toDate=2026-05-08",
        result: "4 KPIs · 6 weekly buckets",
        ms: "684ms", status: "running", finalStatus: "done", delay: 800 },
      { type: "stream", chunks: ["Here's where things stand as of today:"] },
      { type: "kpis" },
      { type: "chart" },
      { type: "stream", chunks: [
        "\n\nInbound is recovering after the W16 dip. Outbound is trending above receipts — ",
        "if this continues, expect **3–4 more SKUs to drop below reorder** by W20."
      ]},
    ],
  },
  "po-draft": {
    user: "Draft a PO to replenish bearings from our usual vendor",
    steps: [
      { type: "thinking", text: "Looking up vendor and item history…", ms: 700 },
      { type: "tool", verb: "GET", path: "/Items('A0017')/PurchaseHistory",
        params: "Top: 5",
        result: "Last 5 POs · avg unit $4.78 · avg lead 9d",
        ms: "287ms", status: "running", finalStatus: "done", delay: 700 },
      { type: "tool", verb: "GET", path: "/BusinessPartners('V10145')",
        params: "CardCode, CardName, Currency, ShipToDefault",
        result: "Bearings Direct GmbH · EUR · DE-10115",
        ms: "152ms", status: "running", finalStatus: "done", delay: 500 },
      { type: "stream", chunks: [
        "Drafted PO for **200 units** of ", { cite: "A0017", kind: "item" },
        " at est. **€956.00** to ", { cite: "V10145", kind: "vendor" },
        ". Ready to review — note this is a draft, not posted to SAP yet.",
      ]},
      { type: "draft-po" },
    ],
  },
};

function MarkdownChunk({ parts, onCite }) {
  // parts is array of strings or {cite, kind}
  return (
    <p>
      {parts.map((p, i) => {
        if (typeof p === "string") {
          // render **bold** and `code`
          const segs = [];
          let s = p;
          let key = 0;
          const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
          let last = 0, m;
          while ((m = re.exec(s))) {
            if (m.index > last) segs.push(s.slice(last, m.index));
            if (m[1]) segs.push(<strong key={"b"+i+(key++)}>{m[1]}</strong>);
            else segs.push(<code key={"c"+i+(key++)} style={{ fontFamily: "var(--font-mono)", fontSize: "0.9em", background: "var(--surface)", padding: "1px 5px", borderRadius: 4 }}>{m[2]}</code>);
            last = m.index + m[0].length;
          }
          if (last < s.length) segs.push(s.slice(last));
          return <React.Fragment key={i}>{segs}</React.Fragment>;
        }
        return <CiteCode key={i} code={p.cite} kind={p.kind} onClick={onCite} />;
      })}
    </p>
  );
}

function AssistantMessage({ steps, agentName, onCite, onComplete }) {
  const [progress, setProgress] = React.useState(0); // index of last completed step
  const [streamText, setStreamText] = React.useState({}); // index -> chunks revealed
  const [toolStatuses, setToolStatuses] = React.useState({}); // i -> "running"|"done"
  const completedRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    let i = 0;

    const advance = async () => {
      while (i < steps.length && !cancelled) {
        const step = steps[i];
        if (step.type === "thinking") {
          setProgress(i + 1);
          await sleep(step.ms || 700);
        } else if (step.type === "tool") {
          setToolStatuses(s => ({ ...s, [i]: "running" }));
          setProgress(i + 1);
          await sleep(step.delay || 600);
          if (cancelled) return;
          setToolStatuses(s => ({ ...s, [i]: step.finalStatus || "done" }));
          await sleep(150);
        } else if (step.type === "stream") {
          setProgress(i + 1);
          const chunks = step.chunks;
          for (let c = 0; c < chunks.length; c++) {
            if (cancelled) return;
            setStreamText(t => ({ ...t, [i]: (t[i] || []).concat([chunks[c]]) }));
            await sleep(80 + Math.random() * 80);
          }
        } else {
          setProgress(i + 1);
          await sleep(280);
        }
        i++;
      }
      if (!cancelled && !completedRef.current) {
        completedRef.current = true;
        onComplete && onComplete();
      }
    };

    advance();
    return () => { cancelled = true; };
  }, []);

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return (
    <div className="msg assistant">
      <div className="msg-meta">
        <Icon name="bot" style={{ width: 12, height: 12 }} />
        <span className="agent-mark">{agentName} agent</span>
        <span>·</span>
        <span>SAP Service Layer</span>
      </div>
      <div className="assistant-body">
        {steps.slice(0, progress).map((step, i) => {
          if (step.type === "thinking" && i === progress - 1 && progress < steps.length) {
            return (
              <div className="thinking" key={i}>
                <span className="pulse"></span>
                <span>{step.text}</span>
              </div>
            );
          }
          if (step.type === "thinking") return null; // collapse once done
          if (step.type === "tool") {
            return (
              <ToolCall key={i}
                verb={step.verb}
                path={step.path}
                ms={toolStatuses[i] === "done" ? step.ms : "…"}
                params={step.params}
                result={toolStatuses[i] === "done" ? step.result : "(pending)"}
                status={toolStatuses[i] || "running"}
              />
            );
          }
          if (step.type === "stream") {
            const revealed = streamText[i] || [];
            const isLastStreaming = i === progress - 1 && revealed.length < step.chunks.length;
            return <MarkdownChunk key={i} parts={revealed.concat(isLastStreaming ? [] : [])} onCite={onCite} />;
          }
          if (step.type === "table") {
            return <InventoryTable key={i} rows={window.SAP_DATA.items} onCite={onCite} />;
          }
          if (step.type === "kpis") {
            return <KPIStrip key={i} items={window.SAP_DATA.inventoryKpis} />;
          }
          if (step.type === "chart") {
            return <Sparkline key={i} data={window.SAP_DATA.weeklyMovements} />;
          }
          if (step.type === "draft-po") {
            return (
              <div key={i} className="table-card">
                <div className="table-hd">
                  <Icon name="pencil" />
                  <span>Draft Purchase Order</span>
                  <span className="count">DRAFT · not posted</span>
                  <div className="actions">
                    <button title="Edit"><Icon name="pencil" /></button>
                  </div>
                </div>
                <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 18px", fontSize: 12.5 }}>
                  <span style={{ color: "var(--text-subtle)", fontFamily: "var(--font-mono)", fontSize: 11 }}>CardCode</span>
                  <span><CiteCode code="V10145" kind="vendor" onClick={onCite} /> · Bearings Direct GmbH</span>
                  <span style={{ color: "var(--text-subtle)", fontFamily: "var(--font-mono)", fontSize: 11 }}>Item</span>
                  <span><CiteCode code="A0017" kind="item" onClick={onCite} /> · Bearing 6204-2RS · 200 × €4.78</span>
                  <span style={{ color: "var(--text-subtle)", fontFamily: "var(--font-mono)", fontSize: 11 }}>Total</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>€956.00</span>
                  <span style={{ color: "var(--text-subtle)", fontFamily: "var(--font-mono)", fontSize: 11 }}>ETA</span>
                  <span>2026-05-21 (9d lead time)</span>
                </div>
                <div style={{ borderTop: "1px solid var(--border)", padding: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="agent-select">Discard</button>
                  <button className="agent-select">Edit lines</button>
                  <button className="send" style={{ width: "auto", padding: "0 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 500 }}>
                    Post to SAP
                  </button>
                </div>
              </div>
            );
          }
          return null;
        })}
        {progress >= steps.length && completedRef.current && (
          <div className="msg-actions">
            <button title="Copy"><Icon name="copy" /></button>
            <button title="Re-run"><Icon name="refresh" /></button>
            <button title="Share"><Icon name="share" /></button>
            <button title="Helpful"><Icon name="thumbup" /></button>
            <button title="Not helpful"><Icon name="thumbdown" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

window.AssistantMessage = AssistantMessage;
window.SCRIPTED_FLOWS = SCRIPTED_FLOWS;
