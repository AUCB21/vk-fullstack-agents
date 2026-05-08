// Main App: layout, theme, tweaks, conversation state

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "teal",
  "density": "regular",
  "showAgentName": true
}/*EDITMODE-END*/;

const SUGGESTIONS = {
  inventory: [
    { label: "Stock health", q: "Show me items below reorder point in main warehouse", flow: "stock-low", icon: "table" },
    { label: "KPIs",          q: "Inventory health snapshot for this week",            flow: "kpis",     icon: "chart" },
    { label: "Action",        q: "Draft a PO to replenish bearings from our usual vendor", flow: "po-draft", icon: "pencil" },
    { label: "Lookup",        q: "Where is ItemCode A0017 stocked and what's the reorder history?", flow: "stock-low", icon: "search" },
  ],
  sales: [
    { label: "Open orders",   q: "Show open sales orders this week, sorted by value",   flow: "stock-low", icon: "table" },
    { label: "Top customers", q: "Top 10 customers by revenue MTD",                     flow: "kpis",      icon: "chart" },
    { label: "Aging",          q: "A/R aging — anything over 60 days?",                  flow: "kpis",      icon: "chart" },
    { label: "Lookup",        q: "Find sales history for CardCode C20410",              flow: "stock-low", icon: "search" },
  ],
  purchasing: [
    { label: "Open POs",       q: "List open POs and their ETAs",                       flow: "stock-low", icon: "table" },
    { label: "Vendor perf",    q: "Vendor on-time delivery rate, last 90 days",         flow: "kpis",      icon: "chart" },
    { label: "Action",         q: "Draft a PO to replenish bearings from our usual vendor", flow: "po-draft", icon: "pencil" },
    { label: "Lookup",         q: "Show last 5 POs for vendor V10145",                  flow: "stock-low", icon: "search" },
  ],
};

function CitationPopover({ data, onClose, anchor }) {
  if (!data) return null;
  const style = { top: anchor.y + 18, left: Math.min(anchor.x, window.innerWidth - 296) };
  if (data.kind === "item") {
    const it = window.SAP_DATA.items.find(i => i.ItemCode === data.code);
    return (
      <div className="cite-pop" style={style} onClick={(e) => e.stopPropagation()}>
        <div className="h">SAP B1 · Item Master</div>
        <dl>
          <dt>ItemCode</dt><dd>{data.code}</dd>
          <dt>ItemName</dt><dd>{it?.ItemName || "—"}</dd>
          <dt>OnHand</dt><dd style={{ fontVariantNumeric: "tabular-nums" }}>{it?.OnHand ?? "—"}</dd>
          <dt>Whs</dt><dd style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{it?.Whs || "—"}</dd>
        </dl>
        <div className="open-link"><Icon name="ext" /> Open in SAP B1 → /Items('{data.code}')</div>
      </div>
    );
  }
  if (data.kind === "vendor") {
    return (
      <div className="cite-pop" style={style} onClick={(e) => e.stopPropagation()}>
        <div className="h">SAP B1 · Business Partner</div>
        <dl>
          <dt>CardCode</dt><dd>{data.code}</dd>
          <dt>CardName</dt><dd>Bearings Direct GmbH</dd>
          <dt>Currency</dt><dd>EUR</dd>
          <dt>Lead time</dt><dd>9 days (avg of last 5)</dd>
        </dl>
        <div className="open-link"><Icon name="ext" /> Open in SAP B1 → /BusinessPartners('{data.code}')</div>
      </div>
    );
  }
  return null;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [activeAgent, setActiveAgent] = React.useState("inventory");
  const [composeAgent, setComposeAgent] = React.useState("inventory");
  const [conversation, setConversation] = React.useState([]); // { role, content, flow }
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [citation, setCitation] = React.useState(null);
  const scrollerRef = React.useRef(null);

  const agents = window.SAP_DATA.agents;
  const agent = agents.find(a => a.id === activeAgent);

  // Apply theme to root
  React.useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", t.theme === "dark");
    document.documentElement.classList.toggle("theme-light", t.theme === "light");
    document.documentElement.dataset.accent = t.accent;
  }, [t.theme, t.accent]);

  // Auto-scroll on new content
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation, busy]);

  function startFlow(flowKey, userText) {
    const flow = window.SCRIPTED_FLOWS[flowKey];
    if (!flow) return;
    setConversation(c => [...c,
      { role: "user", content: userText || flow.user, attachments: attachments },
      { role: "assistant", agent: agent.name, steps: flow.steps, key: Date.now() },
    ]);
    setAttachments([]);
    setInput("");
    setBusy(true);
  }

  function onSend() {
    if (!input.trim()) return;
    // Match a flow heuristically; default to "stock-low"
    const text = input.toLowerCase();
    let flow = "stock-low";
    if (/draft|create|po\b|purchase order/.test(text)) flow = "po-draft";
    else if (/snapshot|kpi|health|trend|chart/.test(text)) flow = "kpis";
    startFlow(flow, input);
  }

  function onNewChat() {
    setConversation([]);
    setBusy(false);
  }

  function onSelectAgent(id) {
    setActiveAgent(id);
    setComposeAgent(id);
    onNewChat();
  }

  function onCite(code, kind, ev) {
    ev.stopPropagation();
    const r = ev.currentTarget.getBoundingClientRect();
    setCitation({ code, kind, x: r.left, y: r.bottom });
  }

  function addAttachment() {
    setAttachments(a => [...a, { name: "Acme-Invoice-Apr.pdf", size: "184 KB" }]);
  }

  React.useEffect(() => {
    function close() { setCitation(null); }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <div
      className="app"
      data-density={t.density}
      onClick={() => setCitation(null)}
    >
      <Sidebar
        activeAgent={activeAgent}
        onSelectAgent={onSelectAgent}
        onNewChat={onNewChat}
        recentId={null}
        onSelectRecent={() => {}}
      />
      <main className="main">
        <div className="topbar">
          <div className="ctx">
            <div className="agent-pill">
              <Icon name={agent.icon} />
              <span>{agent.name}</span>
              <span className="v">v0.4 · gpt-4 + B1 SL</span>
            </div>
            <span className="crumb">·</span>
            <span className="crumb">acme-mfg / production</span>
          </div>
          <div className="actions">
            <div className="conn" title="Latency to SAP B1 Service Layer">
              <span className="dot"></span>
              <span>SL · 38ms</span>
            </div>
            <div className="theme-toggle">
              <button className={t.theme === "light" ? "active" : ""}
                      onClick={() => setTweak("theme", "light")} title="Light"><Icon name="sun" /></button>
              <button className={t.theme === "dark" ? "active" : ""}
                      onClick={() => setTweak("theme", "dark")} title="Dark"><Icon name="moon" /></button>
            </div>
            <button title="Search"><Icon name="search" /></button>
            <button title="More"><Icon name="more" /></button>
          </div>
        </div>

        <div className="scroller" ref={scrollerRef}>
          {conversation.length === 0 ? (
            <EmptyState
              agent={agent}
              suggestions={SUGGESTIONS[activeAgent]}
              onPick={(s) => startFlow(s.flow, s.q)}
              onSelectAgent={(id) => { setActiveAgent(id); setComposeAgent(id); }}
              activeAgent={activeAgent}
            />
          ) : (
            <div className="thread">
              {conversation.map((m, i) => {
                if (m.role === "user") {
                  return (
                    <div className="msg user" key={i}>
                      {m.attachments && m.attachments.length > 0 && (
                        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                          {m.attachments.map((a, j) => (
                            <div className="att-chip" key={j}>
                              <Icon name="pdf" />
                              <span>{a.name}</span>
                              <span className="meta">{a.size}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="msg-bubble">{m.content}</div>
                    </div>
                  );
                }
                return (
                  <AssistantMessage
                    key={m.key || i}
                    steps={m.steps}
                    agentName={m.agent}
                    onCite={onCite}
                    onComplete={() => setBusy(false)}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="composer-wrap">
          <div className="composer">
            {attachments.length > 0 && (
              <div className="attachments">
                {attachments.map((a, i) => (
                  <div className="att-chip" key={i}>
                    <Icon name="pdf" />
                    <span>{a.name}</span>
                    <span className="meta">{a.size}</span>
                    <button onClick={() => setAttachments(arr => arr.filter((_, j) => j !== i))}>
                      <Icon name="x" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              placeholder={`Ask the ${agent.name} agent…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              rows={1}
            />
            <div className="composer-row">
              <div className="left">
                <button className="icbtn" title="Attach file" onClick={addAttachment}>
                  <Icon name="attach" />
                </button>
                <button className="icbtn" title="Voice"><Icon name="mic" /></button>
                <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }}></div>
                {agents.map(a => (
                  <button
                    key={a.id}
                    className={"agent-select" + (composeAgent === a.id ? " active" : "")}
                    onClick={() => { setComposeAgent(a.id); setActiveAgent(a.id); }}
                  >
                    <Icon name={a.icon} />
                    <span>{a.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
              <div className="right">
                <span className="composer-hint" style={{ paddingRight: 4 }}>
                  <span style={{ color: "var(--text-subtle)" }}>↵ to send · ⇧↵ newline</span>
                </span>
                <button className="send" onClick={onSend} disabled={!input.trim()}>
                  <Icon name="arrowup" />
                </button>
              </div>
            </div>
          </div>
          <div className="disclaimer">
            Connected via SAP B1 Service Layer · {agent.name} agent reads {activeAgent === "purchasing" ? "OPOR, OITM, OCRD" : activeAgent === "sales" ? "ORDR, OINV, OCRD" : "OITM, OITW, OINM"}
            <span className="sep">·</span>
            Drafts require approval before posting
          </div>
        </div>

        <CitationPopover data={citation} onClose={() => setCitation(null)} anchor={citation || { x: 0, y: 0 }} />
      </main>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme} options={["dark", "light"]}
                    onChange={(v) => setTweak("theme", v)} />
        <TweakColor label="Accent" value={t.accent}
                    options={[
                      { value: "teal",    color: "oklch(0.72 0.13 195)" },
                      { value: "indigo",  color: "oklch(0.62 0.14 268)" },
                      { value: "amber",   color: "oklch(0.78 0.15 70)"  },
                      { value: "emerald", color: "oklch(0.7 0.13 158)"  },
                      { value: "slate",   color: "oklch(0.55 0.025 240)"},
                    ].map(o => o.color)}
                    onChange={(v) => {
                      const map = ["teal","indigo","amber","emerald","slate"];
                      const colors = ["oklch(0.72 0.13 195)","oklch(0.62 0.14 268)","oklch(0.78 0.15 70)","oklch(0.7 0.13 158)","oklch(0.55 0.025 240)"];
                      setTweak("accent", map[colors.indexOf(v)] || "teal");
                    }} />
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density} options={["compact","regular","comfy"]}
                    onChange={(v) => setTweak("density", v)} />
        <TweakSection label="Try a flow" />
        <TweakButton label="Stock health" onClick={() => startFlow("stock-low")} />
        <TweakButton label="KPI snapshot" onClick={() => startFlow("kpis")} />
        <TweakButton label="Draft PO" onClick={() => startFlow("po-draft")} />
        <TweakButton label="Reset chat" onClick={onNewChat} />
      </TweaksPanel>
    </div>
  );
}

function EmptyState({ agent, suggestions, onPick, onSelectAgent, activeAgent }) {
  const agents = window.SAP_DATA.agents;
  return (
    <div className="empty">
      <div className="empty-hero">
        <Icon name={agent.icon} style={{ width: 24, height: 24 }} />
      </div>
      <h1>What would you like to do with {agent.name.toLowerCase()}?</h1>
      <p className="lede">{agent.desc}. Ask in plain language — the agent calls SAP B1 directly and shows its work.</p>

      <div className="suggestions">
        {suggestions.map((s, i) => (
          <button className="suggestion" key={i} onClick={() => onPick(s)}>
            <div className="row">
              <Icon name={s.icon} />
              <span className="label">{s.label}</span>
            </div>
            <span className="q">{s.q}</span>
          </button>
        ))}
      </div>

      <div className="agent-strip">
        <span style={{ fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4, alignSelf: "center" }}>
          Or switch:
        </span>
        {agents.map(a => (
          <button
            key={a.id}
            className={"agent-chip" + (activeAgent === a.id ? " active" : "")}
            onClick={() => onSelectAgent(a.id)}
          >
            <Icon name={a.icon} />
            <span>{a.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
