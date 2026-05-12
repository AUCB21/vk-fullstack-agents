// Agent Builder — node-based no-code editor

const NODE_LIBRARY = [
  { id: "trigger-chat",   kind: "trigger",   icon: "msgsq",  name: "Chat message",       desc: "User sends a message" },
  { id: "trigger-sched",  kind: "trigger",   icon: "refresh", name: "Schedule",           desc: "Run on a cron" },
  { id: "trigger-webhook",kind: "trigger",   icon: "ext",    name: "Webhook",            desc: "HTTP trigger" },

  { id: "llm-chat",       kind: "llm",       icon: "bot",    name: "LLM completion",     desc: "GPT-4 / Claude / local" },
  { id: "llm-classify",   kind: "llm",       icon: "spark",  name: "Classifier",         desc: "Route by intent" },

  { id: "tool-sap-items", kind: "tool",      icon: "box",    name: "SAP B1 — Items",     desc: "Read OITM" },
  { id: "tool-sap-orders",kind: "tool",      icon: "cart",   name: "SAP B1 — Orders",    desc: "ORDR / OPOR" },
  { id: "tool-sap-bp",    kind: "tool",      icon: "layers", name: "SAP B1 — BPs",       desc: "OCRD" },
  { id: "tool-http",      kind: "tool",      icon: "ext",    name: "HTTP request",       desc: "REST / OData" },
  { id: "tool-sql",       kind: "tool",      icon: "table",  name: "SQL query",          desc: "Run a SELECT" },

  { id: "memory-vec",     kind: "memory",    icon: "layers", name: "Vector store",       desc: "Long-term recall" },
  { id: "memory-conv",    kind: "memory",    icon: "msgsq",  name: "Conversation",       desc: "Last N turns" },

  { id: "cond-route",     kind: "condition", icon: "filter", name: "Branch",             desc: "If / else routing" },

  { id: "out-reply",      kind: "output",    icon: "send",   name: "Reply to user",      desc: "Stream answer" },
  { id: "out-post",       kind: "output",    icon: "check",  name: "Post to SAP",        desc: "Requires approval" },
];

const INITIAL_NODES = [
  { id: "n1", kind: "trigger", icon: "msgsq", name: "Chat message", x:  60, y: 110, meta: "TRIGGER",
    rows: [{ k: "event", v: "user.message" }, { k: "agent", v: "Inventory" }], status: "ok" },
  { id: "n2", kind: "llm",     icon: "spark", name: "Intent classifier", x: 360, y:  60, meta: "LLM",
    rows: [{ k: "model", v: "gpt-4o-mini" }, { k: "labels", v: "stock · order · lookup", mono: true }], status: "ok" },
  { id: "n3", kind: "tool",    icon: "box",   name: "SAP B1 — Items", x: 680, y:  40, meta: "TOOL",
    rows: [{ k: "verb", v: "GET /Items", mono: true }, { k: "filter", v: "OnHand lt MinStock", mono: true }], status: "ok" },
  { id: "n4", kind: "llm",     icon: "bot",   name: "Reasoning LLM", x: 360, y: 230, meta: "LLM",
    rows: [{ k: "model", v: "claude-3.5-sonnet" }, { k: "tools", v: "3 attached" }, { k: "memory", v: "vector + conv" }], status: "ok", selected: true },
  { id: "n5", kind: "memory",  icon: "layers", name: "Knowledge base", x:  60, y: 320, meta: "MEMORY",
    rows: [{ k: "store", v: "pinecone" }, { k: "topK", v: "8" }], status: "ok" },
  { id: "n6", kind: "output",  icon: "send",  name: "Reply to user", x: 980, y: 230, meta: "OUTPUT",
    rows: [{ k: "stream", v: "enabled" }, { k: "format", v: "markdown + cite" }], status: "idle" },
];

const WIRES = [
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3" },
  { from: "n2", to: "n4" },
  { from: "n3", to: "n4", flow: true },
  { from: "n5", to: "n4" },
  { from: "n4", to: "n6", flow: true },
];

function Node({ node, onSelect }) {
  return (
    <div
      className={"node" + (node.selected ? " selected" : "")}
      data-kind={node.kind}
      data-id={node.id}
      style={{ left: node.x, top: node.y }}
      onClick={(e) => { e.stopPropagation(); onSelect && onSelect(node.id); }}
    >
      <span className="port in"></span>
      <span className={"port out" + (node.status === "ok" ? " active" : "")}></span>
      <div className="node-hd">
        <div className="ic-wrap"><Icon name={node.icon} /></div>
        <span>{node.name}</span>
        <span className="meta">{node.meta}</span>
      </div>
      <div className="node-body">
        {node.rows.map((r, i) => (
          <div key={i} className="node-row">
            <span className="k">{r.k}</span>
            <span className={"v" + (r.mono ? " mono" : "")}>{r.v}</span>
          </div>
        ))}
      </div>
      <div className="node-foot">
        <span className={"stat-dot " + (node.status || "idle")}></span>
        <span>
          {node.status === "ok" ? "Last run: 0.4s · 0 errors"
            : node.status === "warn" ? "Last run: timed out"
            : "Not yet run"}
        </span>
      </div>
    </div>
  );
}

function WireLayer({ nodes, wires }) {
  // node center anchors
  const nodeW = 240, headerH = 40; // approx node height for centering
  const cy = (n) => n.y + 60;
  function path(a, b) {
    const x1 = a.x + nodeW, y1 = cy(a);
    const x2 = b.x,         y2 = cy(b);
    const dx = Math.max(40, (x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }
  return (
    <svg className="wire-layer">
      {wires.map((w, i) => {
        const a = nodes.find(n => n.id === w.from);
        const b = nodes.find(n => n.id === w.to);
        if (!a || !b) return null;
        return <path key={i} d={path(a, b)} className={w.flow ? "wire-flow" : "wire"} />;
      })}
    </svg>
  );
}

function LibraryItem({ item }) {
  return (
    <div className="lib-item" data-kind={item.kind} draggable>
      <div className="ic-wrap"><Icon name={item.icon} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <span className="t">{item.name}</span>
        <span className="s">{item.desc}</span>
      </div>
      <span className="grip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M5 12h14M5 6h14M5 18h14"/>
        </svg>
      </span>
    </div>
  );
}

function Inspector({ node }) {
  const [tab, setTab] = React.useState("config");
  const [temperature, setTemperature] = React.useState(0.2);
  const [streaming, setStreaming] = React.useState(true);

  if (!node) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-subtle)", fontSize: 12.5 }}>
        Select a node to inspect its configuration.
      </div>
    );
  }

  return (
    <>
      <div className="insp-tabs">
        <button className={"insp-tab" + (tab === "config" ? " active" : "")} onClick={() => setTab("config")}>
          <Icon name="gear" /> Config
        </button>
        <button className={"insp-tab" + (tab === "prompt" ? " active" : "")} onClick={() => setTab("prompt")}>
          <Icon name="pencil" /> Prompt
        </button>
        <button className={"insp-tab" + (tab === "logs" ? " active" : "")} onClick={() => setTab("logs")}>
          <Icon name="layers" /> Runs <span className="count">12</span>
        </button>
      </div>

      <div className="insp-body">
        <div className="insp-hd">
          <div className="ic-wrap"><Icon name={node.icon} /></div>
          <div>
            <div className="t">{node.name}</div>
            <div className="s">{node.meta} · {node.id}</div>
          </div>
        </div>

        {tab === "config" && (
          <>
            <div className="insp-section">
              <span className="label">Model</span>
              <div className="insp-field">
                <select defaultValue="claude-3.5-sonnet">
                  <option>claude-3.5-sonnet</option>
                  <option>claude-3-opus</option>
                  <option>gpt-4o</option>
                  <option>gpt-4o-mini</option>
                  <option>llama-3.1-70b (self-hosted)</option>
                </select>
              </div>
              <div className="insp-field">
                <div className="lbl-row">
                  <span>Temperature</span>
                  <span className="hint">creativity</span>
                </div>
                <div className="slider-row">
                  <input className="slider" type="range" min="0" max="1" step="0.05"
                         value={temperature}
                         onChange={(e) => setTemperature(parseFloat(e.target.value))} />
                  <span className="slider-val">{temperature.toFixed(2)}</span>
                </div>
              </div>
              <div className="insp-field">
                <div className="lbl-row">
                  <span>Max tokens</span>
                  <span className="hint">per response</span>
                </div>
                <input type="number" defaultValue="2048" />
              </div>
            </div>

            <div className="insp-section">
              <span className="label">Tools attached</span>
              <div className="chip-row">
                <span className="tool-pill attached"><Icon name="box" /> SAP_B1.items <span className="x"><Icon name="x" /></span></span>
                <span className="tool-pill attached"><Icon name="cart" /> SAP_B1.orders <span className="x"><Icon name="x" /></span></span>
                <span className="tool-pill attached"><Icon name="table" /> sql.query <span className="x"><Icon name="x" /></span></span>
                <span className="tool-pill"><Icon name="plus" /> Add tool</span>
              </div>
            </div>

            <div className="insp-section">
              <span className="label">Behavior</span>
              <div className={"toggle " + (streaming ? "on" : "")} onClick={() => setStreaming(s => !s)}>
                <div>
                  <div className="lbl">Stream output</div>
                  <div className="desc">Tokens arrive incrementally</div>
                </div>
                <div className="sw"></div>
              </div>
              <div className="toggle on">
                <div>
                  <div className="lbl">Cite SAP records</div>
                  <div className="desc">Wrap DocNum / ItemCode</div>
                </div>
                <div className="sw"></div>
              </div>
              <div className="toggle">
                <div>
                  <div className="lbl">Auto-approve writes</div>
                  <div className="desc">Off = require human review</div>
                </div>
                <div className="sw"></div>
              </div>
            </div>
          </>
        )}

        {tab === "prompt" && (
          <>
            <div className="insp-section">
              <span className="label">System prompt</span>
              <div className="insp-field">
                <textarea className="prompt" defaultValue={`You are the Inventory agent for {{tenant.name}}.

Use the attached SAP B1 tools to answer questions about stock,
warehouses, and item master data. When citing items, wrap the
ItemCode like {{ItemCode}} so it renders as a clickable link.

Never post writes without explicit user confirmation.
Today: {{now}}.`} />
              </div>
            </div>
            <div className="insp-section">
              <span className="label">Available variables</span>
              <div className="chip-row">
                <span className="tool-pill"><span style={{ fontFamily: "var(--font-mono)" }}>{"{{tenant.name}}"}</span></span>
                <span className="tool-pill"><span style={{ fontFamily: "var(--font-mono)" }}>{"{{user.email}}"}</span></span>
                <span className="tool-pill"><span style={{ fontFamily: "var(--font-mono)" }}>{"{{now}}"}</span></span>
                <span className="tool-pill"><span style={{ fontFamily: "var(--font-mono)" }}>{"{{input}}"}</span></span>
              </div>
            </div>
          </>
        )}

        {tab === "logs" && (
          <div className="insp-section">
            <span className="label">Recent runs</span>
            {[
              { id: "r-3401", when: "2m ago",  ms: "412ms", ok: true, q: "Show items below reorder" },
              { id: "r-3400", when: "5m ago",  ms: "684ms", ok: true, q: "Inventory health snapshot" },
              { id: "r-3399", when: "12m ago", ms: "1.2s",  ok: true, q: "Where is A0017 stocked?" },
              { id: "r-3398", when: "1h ago",  ms: "—",     ok: false, q: "Draft PO for vendor V10145" },
            ].map(r => (
              <div key={r.id} style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center",
                padding: "8px 10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6
              }}>
                <span className={"stat-dot " + (r.ok ? "ok" : "warn")} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: r.ok ? "var(--status-ok)" : "var(--status-err)"
                }}></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.q}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>{r.id} · {r.when}</div>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{r.ms}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function BuilderSidebar() {
  const data = window.SAP_DATA;
  const [q, setQ] = React.useState("");
  const filtered = NODE_LIBRARY.filter(i =>
    !q || i.name.toLowerCase().includes(q.toLowerCase()) || i.desc.toLowerCase().includes(q.toLowerCase())
  );
  const grouped = {};
  filtered.forEach(i => { (grouped[i.kind] = grouped[i.kind] || []).push(i); });
  const labels = { trigger: "Triggers", llm: "LLM", tool: "Tools", memory: "Memory", condition: "Logic", output: "Outputs" };

  return (
    <aside className="sb">
      <div className="sb-hd">
        <div className="sb-logo">VK</div>
        <div className="sb-title">Agent Builder</div>
        <div className="sb-status" title="Auto-saved 2s ago">
          <span className="dot"></span>
          Saved
        </div>
      </div>

      <a href="VK Agents.html" className="sb-newchat" style={{ textDecoration: "none", color: "var(--text)" }}>
        <Icon name="chev" style={{ transform: "rotate(90deg)" }} />
        Back to agents
      </a>

      <div className="lib-search">
        <Icon name="search" />
        <input placeholder="Search nodes…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="kbd">/</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 12 }}>
        {Object.keys(labels).map(k => (
          grouped[k] && grouped[k].length > 0 && (
            <div key={k}>
              <div className="sb-section">
                <span>{labels[k]}</span>
              </div>
              {grouped[k].map(i => <LibraryItem key={i.id} item={i} />)}
            </div>
          )
        ))}
      </div>

      <div className="sb-foot">
        <div className="sb-avatar">N</div>
        <div className="who">
          <span className="n">Inventory Agent</span>
          <span className="e">draft · v0.4 · 6 nodes</span>
        </div>
        <button className="gear" title="Settings"><Icon name="gear" /></button>
      </div>
    </aside>
  );
}

const BUILDER_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "indigo"
}/*EDITMODE-END*/;

function BuilderApp() {
  const [t, setTweak] = useTweaks(BUILDER_TWEAK_DEFAULTS);
  const [nodes, setNodes] = React.useState(INITIAL_NODES);
  const [selectedId, setSelectedId] = React.useState("n4");
  const [zoom, setZoom] = React.useState(100);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", t.theme === "dark");
    document.documentElement.classList.toggle("theme-light", t.theme === "light");
    document.documentElement.dataset.accent = t.accent;
  }, [t.theme, t.accent]);

  const selectedNode = nodes.find(n => n.id === selectedId);

  function selectNode(id) {
    setSelectedId(id);
    setNodes(ns => ns.map(n => ({ ...n, selected: n.id === id })));
  }

  function runTest() {
    setTesting(true);
    setTimeout(() => setTesting(false), 3500);
  }

  return (
    <div className="builder">
      <BuilderSidebar />

      <div className="canvas-pane">
        <div className="canvas-top">
          <div className="crumbs">
            <a href="VK Agents.html" className="crumb-static" style={{ textDecoration: "none" }}>Agents</a>
            <span className="crumb-static">/</span>
            <span className="crumb-name">
              <Icon name="box" />
              Inventory Agent
              <span className="badge">v0.4 · draft</span>
            </span>
          </div>
          <div className="right">
            <button className="ghost-btn"><Icon name="layers" /> Versions</button>
            <button className="ghost-btn"><Icon name="share" /> Share</button>
            <div className="theme-toggle" style={{ marginLeft: 4 }}>
              <button className={t.theme === "light" ? "active" : ""}
                      onClick={() => setTweak("theme", "light")}><Icon name="sun" /></button>
              <button className={t.theme === "dark" ? "active" : ""}
                      onClick={() => setTweak("theme", "dark")}><Icon name="moon" /></button>
            </div>
            <button className="ghost-btn" onClick={runTest}><Icon name="spark" /> Test run</button>
            <button className="run-btn"><Icon name="arrowup" /> Publish</button>
          </div>
        </div>

        <div className="canvas" onClick={() => selectNode(null)}>
          <WireLayer nodes={nodes} wires={WIRES} />
          {nodes.map(n => <Node key={n.id} node={n} onSelect={selectNode} />)}

          <div className="canvas-controls">
            <button title="Zoom in" onClick={() => setZoom(z => Math.min(200, z + 10))}><Icon name="plus" /></button>
            <div className="zoom-pct">{zoom}%</div>
            <button title="Zoom out" onClick={() => setZoom(z => Math.max(50, z - 10))}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="ic" style={{ width: 16, height: 16 }}><path d="M5 12h14"/></svg>
            </button>
            <button title="Fit to screen"><Icon name="layers" /></button>
          </div>

          <div className="minimap">
            {nodes.map(n => (
              <div key={n.id} className="mini-node" style={{
                left: (n.x / 1300) * 160,
                top:  (n.y / 500) * 100,
                width:  (240 / 1300) * 160,
                height: 14,
                background: n.id === selectedId ? "var(--accent)" : "var(--text-subtle)",
                opacity: n.id === selectedId ? 0.9 : 0.4,
              }}></div>
            ))}
            <div className="viewport" style={{ left: 6, top: 6, width: 130, height: 70 }}></div>
          </div>

          {testing && (
            <div className="run-banner testing">
              <span className="dot"></span>
              <span>Test run</span>
              <span className="step">› reasoning LLM</span>
              <button className="stop" onClick={() => setTesting(false)}>Stop</button>
            </div>
          )}
        </div>
      </div>

      <div className="inspector">
        <Inspector node={selectedNode} />
      </div>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme} options={["dark","light"]}
                    onChange={(v) => setTweak("theme", v)} />
        <TweakColor label="Accent" value={t.accent}
                    options={["oklch(0.72 0.13 195)","oklch(0.55 0.18 268)","oklch(0.78 0.15 70)","oklch(0.7 0.13 158)","oklch(0.55 0.025 240)"]}
                    onChange={(v) => {
                      const colors = ["oklch(0.72 0.13 195)","oklch(0.55 0.18 268)","oklch(0.78 0.15 70)","oklch(0.7 0.13 158)","oklch(0.55 0.025 240)"];
                      const names = ["teal","indigo","amber","emerald","slate"];
                      setTweak("accent", names[colors.indexOf(v)] || "indigo");
                    }} />
        <TweakSection label="Actions" />
        <TweakButton label="Trigger test run" onClick={runTest} />
        <TweakButton label="← Back to chat" onClick={() => window.location.href = "VK Agents.html"} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<BuilderApp />);
