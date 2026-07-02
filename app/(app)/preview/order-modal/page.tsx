"use client";

// Hayk 2026-07-01 v4 — Workflow Order Modal preview with tabs + communication thread.
// New sections:
//   • Tabs: Overview / Files / Communication / History
//   • Right-side Communication panel — full customer back-and-forth thread
//   • "Request missing info" nested modal — checklist + message preview + send
// Route: /preview/order-modal · Real /board modal NOT touched.

import { useState } from "react";

const ACCENT = "#3b82f6";

// ─── Mock order ────────────────────────────────────────
const MOCK_ORDER = {
  refId: "35-1",
  fullRef: "ORD-2026-035-2",
  customer: { name: "SOVOA", email: "sovoa@gmail.com" },
  assignee: { name: "Gary", initials: "G" },
  dueDate: "Jul 1, 2026",
  priority: "Normal" as "Normal" | "Rush" | "Critical",
  productSpec: {
    productName: "Folding Cartons / Boxes",
    materialLabel: "18pt C1S",
    finishedSizeLabel: "4.5 x 6 in",
    colorMode: "CMYK",
    laminationLabel: "Matte",
    finishLabel: "Foil",
    quantity: 500,
    skuCount: 1,
    productImage: "📦",
  },
  files: [
    { name: "Dieline.pdf", size: "348 KB", uploaded: "Jun 24, 2026 3:10 PM", kind: "pdf" },
    { name: "Artwork.pdf", size: "2.4 MB", uploaded: "Jun 24, 2026 3:12 PM", kind: "pdf" },
  ],
  design: { designer: "Marianna", designTask: "Prepare proof / prepress", designStatus: "Waiting for files" },
  notes: "gold foil",
  lastUpdated: "Jun 24, 2026 3:15 PM",
  lastUpdatedBy: "Gary",
  communication: [
    {
      author: "Gary", role: "team", initials: "G", tint: "#eff6ff",
      at: "Jun 24, 9:05 AM",
      tag: { label: "Requested info", tone: "info" as const },
      body: "Please provide the following:\n• Updated artwork with bleed\n• Pantone color reference\n• 3D mockup (if available)",
    },
    {
      author: "Customer", role: "customer", initials: "C", tint: "#f0fdf4",
      at: "Jun 24, 11:42 AM",
      body: "Uploaded 1 file",
      attachment: { name: "artwork_v2.ai", size: "5.3 MB", kind: "AI" },
    },
    { author: "Gary", role: "team", initials: "G", tint: "#eff6ff", at: "Jun 24, 11:50 AM", tag: { label: "Follow up", tone: "warn" as const }, body: "Thanks! We still need the Pantone color reference." },
    { author: "Customer", role: "customer", initials: "C", tint: "#f0fdf4", at: "Jun 24, 1:10 PM", tag: { label: "Replied", tone: "success" as const }, body: "Pantone 347C\n\nLet me know if you need anything else." },
    { author: "Marianna", role: "internal", initials: "M", tint: "#fef3c7", at: "Jun 24, 1:25 PM", tag: { label: "Internal note", tone: "muted" as const }, body: "Files verified. Good to move to proof." },
  ],
  history: [
    { at: "Jun 24, 8:45 AM", who: "Manny Carlo", what: "Order created from paid CRM quote QO-2026-035-2" },
    { at: "Jun 24, 8:52 AM", who: "System",      what: "Auto-assigned to Marianna (Boxes queue)" },
    { at: "Jun 24, 9:05 AM", who: "Gary",        what: "Moved to Missing Info · sent request to customer" },
    { at: "Jun 24, 11:42 AM", who: "Customer",   what: "Uploaded artwork_v2.ai" },
    { at: "Jun 24, 1:10 PM", who: "Customer",    what: "Provided Pantone 347C" },
    { at: "Jun 24, 1:25 PM", who: "Marianna",    what: "Verified files · ready for proof" },
    { at: "Jun 24, 3:15 PM", who: "Gary",        what: "Notes updated (gold foil)" },
  ],
};

const SIDEBAR_JOBS = [
  { ref: "SOVOA", code: null, date: "Jun 24", qty: 500, skus: 1, owner: "Marianna", active: false },
  { ref: "SOVOA", code: "35-1", date: "Jun 24", qty: 500, skus: 1, owner: "Marianna", active: true },
  { ref: "Family", code: "61-1", date: "Jun 25", cat: "Flyers / Postcards", owner: "Christopher", active: false },
  { ref: "Jesus Girl Apparel", code: "78-2", date: "Jun 29", qty: 100, skus: 1, owner: "Christopher", active: false },
  { ref: "Trap Snacks", code: "98-1", date: "Jun 30", cat: "Folding Cartons", owner: "Christopher", active: false },
];

type TabKey = "overview" | "files" | "communication" | "history";

export default function OrderModalPreview() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [designer, setDesigner] = useState(MOCK_ORDER.design.designer);
  const [missingInfoOpen, setMissingInfoOpen] = useState(false);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#f5f6f8", minHeight: "100vh", padding: "20px", color: "#1f2937" }}>
      <div style={{ maxWidth: "1700px", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center", padding: "10px 14px", background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: ACCENT }}>Preview</span>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>Workflow order modal · tabs + communication thread · v4</span>
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "#9ca3af" }}>Real /board modal untouched</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "16px" }}>
          <BoardSidebar />

          <div style={{ background: "#fff", borderRadius: "14px", boxShadow: "0 10px 40px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", padding: "20px", position: "relative" }}>
            <ModalHeader order={MOCK_ORDER} onRequestMissingInfo={() => setMissingInfoOpen(true)} />
            <Tabs tab={tab} setTab={setTab} counts={{ files: MOCK_ORDER.files.length, communication: MOCK_ORDER.communication.length, history: MOCK_ORDER.history.length }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px", marginTop: "18px" }}>
              {/* MIDDLE — depends on tab */}
              <div>
                {tab === "overview" && (
                  <>
                    <ProductHero spec={MOCK_ORDER.productSpec} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                      <FilesCard files={MOCK_ORDER.files} />
                      <DesignCard design={{ ...MOCK_ORDER.design, designer }} setDesigner={setDesigner} onRequestMissingInfo={() => setMissingInfoOpen(true)} />
                    </div>
                    <NotesCard notes={MOCK_ORDER.notes} lastUpdated={MOCK_ORDER.lastUpdated} lastUpdatedBy={MOCK_ORDER.lastUpdatedBy} />
                  </>
                )}
                {tab === "files" && <FilesTabFull files={MOCK_ORDER.files} />}
                {tab === "communication" && <CommunicationTabFull thread={MOCK_ORDER.communication} onRequestMissingInfo={() => setMissingInfoOpen(true)} />}
                {tab === "history" && <HistoryTab entries={MOCK_ORDER.history} />}
              </div>

              {/* RIGHT — Communication panel (always visible) */}
              <CommunicationPanel thread={MOCK_ORDER.communication} />
            </div>

            <ModalFooter />
          </div>
        </div>
      </div>

      {missingInfoOpen && <MissingInfoModal order={MOCK_ORDER} onClose={() => setMissingInfoOpen(false)} />}
    </div>
  );
}

// ─── Board sidebar ────────────────────────────────────────
function BoardSidebar() {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "10px", height: "fit-content", position: "sticky", top: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px 10px", borderBottom: "2px solid #ef4444" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#1f2937", textTransform: "uppercase", letterSpacing: "0.04em" }}>Start</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
        {SIDEBAR_JOBS.map((j, i) => (
          <div key={i} style={{ padding: "8px 10px", background: j.active ? "#eff6ff" : "transparent", border: j.active ? `1px solid ${ACCENT}` : "1px solid transparent", borderRadius: "8px", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.ref}</div>
              {j.code && <div style={{ fontSize: "11px", fontWeight: 700, color: ACCENT }}>{j.code}</div>}
            </div>
            <div style={{ fontSize: "10.5px", color: "#6b7280", marginTop: "2px" }}>{j.date} · {j.qty ? `qty ${j.qty} · ${j.skus} SKU` : j.cat}</div>
            {j.owner && <div style={{ marginTop: "4px", display: "inline-block", padding: "1px 6px", background: "#eff6ff", color: ACCENT, fontSize: "10px", fontWeight: 600, borderRadius: "4px" }}>{j.owner}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal header ─────────────────────────────────────
function ModalHeader({ order, onRequestMissingInfo }: { order: typeof MOCK_ORDER; onRequestMissingInfo: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}>{order.refId}</div>
        <button style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "14px" }} title="Copy ref">⧉</button>
      </div>
      <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", background: "#eff6ff", color: ACCENT, borderRadius: "999px" }}>{order.customer.name}</span>
      <PickerPill icon="👤" value={order.assignee.name} />
      <PickerPill icon="📅" value={`Due: ${order.dueDate}`} />
      <PickerPill icon="🚩" value={`Normal`} />
      <button onClick={onRequestMissingInfo} style={{ marginLeft: "auto", padding: "6px 12px", fontSize: "12px", fontWeight: 700, color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", cursor: "pointer" }}>⚠ Request missing info</button>
      <button style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "20px" }} title="Close">×</button>
    </div>
  );
}

function PickerPill({ icon, value }: { icon: string; value: string }) {
  return (
    <button style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "12.5px", color: "#374151", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: 500 }}>
      <span>{icon}</span><span>{value}</span><span style={{ color: "#9ca3af", fontSize: "10px" }}>▾</span>
    </button>
  );
}

// ─── Tabs ────────────────────────────────────────
function Tabs({ tab, setTab, counts }: { tab: TabKey; setTab: (t: TabKey) => void; counts: { files: number; communication: number; history: number } }) {
  const defs: { key: TabKey; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "files", label: "Files", count: counts.files },
    { key: "communication", label: "Communication", count: counts.communication },
    { key: "history", label: "History" },
  ];
  return (
    <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid #e5e7eb" }}>
      {defs.map(t => {
        const active = tab === t.key;
        return (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ background: "transparent", border: "none", padding: "10px 2px", marginBottom: "-1px", borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent", color: active ? ACCENT : "#6b7280", fontSize: "13px", fontWeight: active ? 700 : 500, cursor: "pointer" }}>
            {t.label}{t.count !== undefined && ` (${t.count})`}
          </button>
        );
      })}
    </div>
  );
}

// ─── Product hero ────────────────────────────────────────
function ProductHero({ spec }: { spec: typeof MOCK_ORDER.productSpec }) {
  const pills = [
    { icon: "📄", label: spec.materialLabel },
    { icon: "📐", label: spec.finishedSizeLabel },
    { icon: "🎨", label: spec.colorMode },
    { icon: "✨", label: spec.laminationLabel },
    { icon: "🟡", label: spec.finishLabel },
  ];
  return (
    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "18px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "18px", alignItems: "center" }}>
      <div style={{ width: "130px", height: "130px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "50px" }}>{spec.productImage}</div>
      <div>
        <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>{spec.productName}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
          {pills.map((p, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#374151", background: "#fff", border: "1px solid #e5e7eb", padding: "5px 10px", borderRadius: "8px", fontWeight: 500 }}><span>{p.icon}</span>{p.label}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "360px" }}>
          <div><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>SKU Count</div><div style={{ fontSize: "17px", fontWeight: 700 }}>{spec.skuCount} SKU</div></div>
          <div><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", marginBottom: "2px" }}>Order Quantity</div><div style={{ fontSize: "17px", fontWeight: 700 }}>{spec.quantity} pcs</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── Files card + Design card (unchanged from v3) ────────
function FilesCard({ files }: { files: typeof MOCK_ORDER.files }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>📎 Files</div>
        <button style={{ fontSize: "12px", fontWeight: 600, color: ACCENT, background: "transparent", border: "none", cursor: "pointer" }}>+ Upload</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {files.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
            <div style={{ width: "32px", height: "32px", background: "#fee2e2", color: "#dc2626", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>PDF</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: "12.5px", fontWeight: 600 }}>{f.name}</div><div style={{ fontSize: "10.5px", color: "#6b7280" }}>PDF · {f.size}</div></div>
            <div style={{ textAlign: "right", fontSize: "10.5px", color: "#6b7280" }}><div>Uploaded</div><div style={{ color: "#374151" }}>{f.uploaded}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignCard({ design, setDesigner, onRequestMissingInfo }: { design: typeof MOCK_ORDER.design; setDesigner: (v: string) => void; onRequestMissingInfo: () => void }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: "10px" }}>👤 Design</div>
      <label style={{ fontSize: "11.5px", color: "#374151", fontWeight: 600, display: "block", marginBottom: "3px" }}>Designer</label>
      <select value={design.designer} onChange={e => setDesigner(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "10px" }}>
        {["Marianna", "Christopher", "Hayk", "Manny Carlo"].map(d => <option key={d}>{d}</option>)}
      </select>
      <label style={{ fontSize: "11.5px", color: "#374151", fontWeight: 600, display: "block", marginBottom: "3px" }}>Design Task</label>
      <input defaultValue={design.designTask} style={{ width: "100%", padding: "8px 10px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "10px" }} />
      <label style={{ fontSize: "11.5px", color: "#374151", fontWeight: 600, display: "block", marginBottom: "3px" }}>Design Status</label>
      <div style={{ marginBottom: "10px" }}><span style={{ display: "inline-block", padding: "3px 10px", fontSize: "11.5px", fontWeight: 700, color: "#b45309", background: "#fef3c7", borderRadius: "999px" }}>{design.designStatus}</span></div>
      <button onClick={onRequestMissingInfo} style={{ width: "100%", padding: "9px", fontSize: "13px", fontWeight: 700, color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px", cursor: "pointer" }}>⚠ Request Missing Info</button>
    </div>
  );
}

function NotesCard({ notes, lastUpdated, lastUpdatedBy }: { notes: string; lastUpdated: string; lastUpdatedBy: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", marginTop: "14px" }}>
      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>✎ Notes</div>
      <textarea defaultValue={notes} rows={2} style={{ width: "100%", padding: "10px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "#6b7280" }}>
        <span>Notes are visible to your team.</span>
        <span>Last updated {lastUpdated} by {lastUpdatedBy}</span>
      </div>
    </div>
  );
}

// ─── Communication Panel (right rail) ────────────────────
function CommunicationPanel({ thread }: { thread: typeof MOCK_ORDER.communication }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", display: "flex", flexDirection: "column", height: "fit-content", maxHeight: "700px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Communication</div>
        <button style={{ fontSize: "12px", fontWeight: 600, color: ACCENT, background: "transparent", border: "none", cursor: "pointer" }}>+ New message</button>
      </div>
      <div style={{ padding: "12px 14px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
        {thread.map((m, i) => <ThreadItem key={i} m={m} />)}
      </div>
      <MessageComposer />
    </div>
  );
}

function ThreadItem({ m }: { m: typeof MOCK_ORDER.communication[number] }) {
  const tagStyle = (tone?: string): React.CSSProperties => {
    if (tone === "info")    return { color: ACCENT, background: "#eff6ff" };
    if (tone === "warn")    return { color: "#b45309", background: "#fef3c7" };
    if (tone === "success") return { color: "#166534", background: "#dcfce7" };
    return { color: "#6b7280", background: "#f3f4f6" };
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: m.tint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#111827" }}>{m.initials}</div>
          <span style={{ fontSize: "12.5px", fontWeight: 700 }}>{m.author}</span>
          {m.tag && <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 8px", borderRadius: "999px", ...tagStyle(m.tag.tone) }}>{m.tag.label}</span>}
        </div>
        <div style={{ fontSize: "10.5px", color: "#9ca3af" }}>{m.at}</div>
      </div>
      <div style={{ fontSize: "12.5px", color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{m.body}</div>
      {m.attachment && (
        <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
          <div style={{ width: "26px", height: "26px", background: "#fef3c7", color: "#b45309", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700 }}>{m.attachment.kind}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: "12px", fontWeight: 600 }}>{m.attachment.name}</div><div style={{ fontSize: "10.5px", color: "#6b7280" }}>{m.attachment.kind} · {m.attachment.size}</div></div>
          <button style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer" }}>⬇</button>
        </div>
      )}
    </div>
  );
}

function MessageComposer() {
  return (
    <div style={{ padding: "10px 12px", borderTop: "1px solid #f3f4f6", display: "flex", gap: "8px", alignItems: "center" }}>
      <input placeholder="Write a message..." style={{ flex: 1, padding: "8px 12px", fontSize: "12.5px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
      <button style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer" }} title="Attach">📎</button>
      <button style={{ background: ACCENT, color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>➤</button>
    </div>
  );
}

// ─── Full-tab variants ────────────────────────────────
function FilesTabFull({ files }: { files: typeof MOCK_ORDER.files }) {
  return (
    <div>
      <FilesCard files={files} />
      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "10px" }}>All artwork, dielines, and reference files uploaded for this order.</div>
    </div>
  );
}

function CommunicationTabFull({ thread, onRequestMissingInfo }: { thread: typeof MOCK_ORDER.communication; onRequestMissingInfo: () => void }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Customer thread</div>
          <div style={{ fontSize: "11.5px", color: "#6b7280" }}>All back-and-forth in one place — visible to team + customer</div>
        </div>
        <button onClick={onRequestMissingInfo} style={{ padding: "8px 14px", fontSize: "12.5px", fontWeight: 700, color: "#fff", background: ACCENT, border: "none", borderRadius: "8px", cursor: "pointer" }}>+ Request missing info</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>{thread.map((m, i) => <ThreadItem key={i} m={m} />)}</div>
    </div>
  );
}

function HistoryTab({ entries }: { entries: typeof MOCK_ORDER.history }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
      <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "12px" }}>Order history</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {entries.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 10px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
            <div style={{ width: "80px", flexShrink: 0, fontSize: "11px", color: "#6b7280" }}>{e.at}</div>
            <div style={{ flex: 1, fontSize: "12.5px", color: "#374151" }}><span style={{ fontWeight: 700 }}>{e.who}</span> · {e.what}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Footer ────────────────────────────────────────
function ModalFooter() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
      <button style={{ padding: "9px 22px", fontSize: "13px", fontWeight: 600, color: "#374151", background: "#fff", border: "1px solid #d1d5db", borderRadius: "10px", cursor: "pointer" }}>Close</button>
      <button style={{ padding: "9px 22px", fontSize: "13px", fontWeight: 700, color: "#fff", background: ACCENT, border: "none", borderRadius: "10px", cursor: "pointer" }}>Save changes</button>
    </div>
  );
}

// ─── Missing info request modal ───────────────────────────
const DEFAULT_MISSING_CHECKLIST = [
  { key: "artwork", label: "Updated artwork with bleed", on: true },
  { key: "pantone", label: "Pantone color reference", on: true },
  { key: "mockup", label: "3D mockup (if available)", on: false },
];

function MissingInfoModal({ order, onClose }: { order: typeof MOCK_ORDER; onClose: () => void }) {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [checklist, setChecklist] = useState(DEFAULT_MISSING_CHECKLIST);
  const [message, setMessage] = useState(`Hi ${order.customer.name},\n\nWe need a few more details to move forward with your order ${order.fullRef}.\n\nPlease provide the information listed below.\n\nThank you!`);

  const active = checklist.filter(c => c.on);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "820px", padding: "24px", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>Request missing info from customer</div>
            <div style={{ fontSize: "12.5px", color: "#6b7280", marginTop: "2px" }}>{order.fullRef} · {order.customer.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "22px" }}>×</button>
        </div>

        {/* Send via */}
        <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "6px" }}>Send via</label>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "14px" }}>
          <button onClick={() => setChannel("email")} style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: 700, color: channel === "email" ? ACCENT : "#374151", background: channel === "email" ? "#eff6ff" : "#fff", border: `1px solid ${channel === "email" ? ACCENT : "#e5e7eb"}`, borderRadius: "8px", cursor: "pointer" }}>✉ Email</button>
          <button onClick={() => setChannel("sms")} style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: 700, color: channel === "sms" ? ACCENT : "#374151", background: channel === "sms" ? "#eff6ff" : "#fff", border: `1px solid ${channel === "sms" ? ACCENT : "#e5e7eb"}`, borderRadius: "8px", cursor: "pointer" }}>💬 SMS</button>
        </div>

        {/* To */}
        <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "6px" }}>To</label>
        <select defaultValue={order.customer.email} style={{ width: "100%", padding: "10px 12px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "14px" }}>
          <option>{order.customer.email}</option>
        </select>

        {/* Message */}
        <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "6px" }}>Message to customer</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} style={{ width: "100%", padding: "10px 12px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", resize: "vertical", fontFamily: "inherit", marginBottom: "4px" }} />
        <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "16px" }}>This message will be included in the email.</div>

        {/* Two column: checklist + preview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "8px" }}>What's missing?</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {checklist.map((c, i) => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: c.on ? "#eff6ff" : "#f9fafb", border: `1px solid ${c.on ? "#bfdbfe" : "#e5e7eb"}`, borderRadius: "8px", cursor: "pointer" }}>
                  <input type="checkbox" checked={c.on} onChange={() => setChecklist(prev => prev.map((p, j) => j === i ? { ...p, on: !p.on } : p))} />
                  <span style={{ fontSize: "13px", color: "#111827" }}>{c.label}</span>
                </label>
              ))}
            </div>
            <button style={{ marginTop: "8px", padding: "8px 12px", fontSize: "12px", fontWeight: 600, color: "#374151", background: "#fff", border: "1px dashed #d1d5db", borderRadius: "8px", cursor: "pointer" }}>+ Add custom request</button>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "8px" }}>Customer will see</label>
            <div style={{ padding: "12px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "12.5px", color: "#1e40af", lineHeight: 1.5 }}>
              <div style={{ marginBottom: "8px" }}>Hi {order.customer.name}, we need more info for your order {order.fullRef}.</div>
              <div style={{ marginBottom: "8px" }}>Please reply here: [reply link added on send] - BazaarPrinting</div>
              <ol style={{ margin: 0, paddingLeft: "18px" }}>
                {active.map(c => <li key={c.key}>{c.label}</li>)}
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: "12.5px", color: "#6b7280" }}>📎 Attach example files <span style={{ color: "#9ca3af" }}>(optional)</span><div style={{ fontSize: "10.5px", color: "#9ca3af" }}>PDF, JPG, PNG up to 20MB</div></div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={{ padding: "9px 20px", fontSize: "13px", fontWeight: 600, color: "#374151", background: "#fff", border: "1px solid #d1d5db", borderRadius: "10px", cursor: "pointer" }}>Cancel</button>
            <button onClick={onClose} style={{ padding: "9px 24px", fontSize: "13px", fontWeight: 700, color: "#fff", background: ACCENT, border: "none", borderRadius: "10px", cursor: "pointer" }}>Send request</button>
          </div>
        </div>
      </div>
    </div>
  );
}
