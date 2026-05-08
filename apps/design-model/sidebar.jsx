// Sidebar component

function Sidebar({ activeAgent, onSelectAgent, onNewChat, recentId, onSelectRecent }) {
  const data = window.SAP_DATA;
  return (
    <aside className="sb">
      <div className="sb-hd">
        <div className="sb-logo">VK</div>
        <div className="sb-title">VK Agents</div>
        <div className="sb-status" title="Connected to SAP Business One">
          <span className="dot"></span>
          Live
        </div>
      </div>

      <button className="sb-newchat" onClick={onNewChat}>
        <Icon name="plus" />
        New chat
        <span className="kbd">⌘K</span>
      </button>

      <div className="sb-section">
        <span>Agents</span>
        <button title="Browse all agents"><Icon name="search" /></button>
      </div>
      <div className="sb-list">
        {data.agents.map(a => (
          <button
            key={a.id}
            className={"sb-item" + (activeAgent === a.id ? " active" : "")}
            onClick={() => onSelectAgent(a.id)}
          >
            <Icon name={a.icon} />
            <span>{a.name}</span>
            {a.id === "inventory" && <span className="badge">37</span>}
          </button>
        ))}
      </div>

      <div className="sb-section" style={{ marginTop: 14 }}>
        <span>Recent</span>
        <button><Icon name="chev" /></button>
      </div>
      <div className="sb-recent">
        <div className="scroll">
          <div className="sb-list">
            {data.recent.map(r => (
              <button
                key={r.id}
                className={"sb-item" + (recentId === r.id ? " active" : "")}
                onClick={() => onSelectRecent(r)}
                style={{ flexDirection: "column", alignItems: "stretch", gap: 2, padding: "8px 10px" }}
              >
                <span style={{ fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                  {r.title}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-subtle)", display: "flex", gap: 6 }}>
                  <span style={{ color: "var(--text-muted)" }}>{data.agents.find(a => a.id === r.agent)?.name}</span>
                  <span>·</span>
                  <span>{r.when}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sb-foot">
        <div className="sb-avatar">N</div>
        <div className="who">
          <span className="n">Nicolas</span>
          <span className="e">ops · acme-mfg</span>
        </div>
        <button className="gear" title="Settings"><Icon name="gear" /></button>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
