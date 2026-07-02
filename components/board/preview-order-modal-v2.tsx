"use client";

// Hayk 2026-07-01 — New order modal wired into /board when ?v2=1 is set.
// Design matches the mockup Hayk approved:
//   • Tabs: Overview / Files / Communication / History
//   • Right rail: full communication thread + composer (always visible)
//   • Overview: product hero, files card, design card, notes card
//   • "Request missing info" button opens the RequestMissingInfoModal below.
//
// Data: takes the real orderId + minimal order info from the board card so the
// header shows the correct ref/customer/due, but sub-content (thread, history)
// uses sample data — real data wiring happens after David reviews the design.

import { useState } from "react";

const ACCENT = "#3b82f6";

export interface PreviewOrderModalV2Props {
  open: boolean;
  onClose: () => void;
  /** V2 approval-column state, if the order is in that column. null otherwise. */
  approvalState?: "waiting" | "customer_replied" | "approved" | null;
  /** Handler when manager clicks "Mark customer approved" in the modal. */
  onMarkApproved?: () => void;
  order: {
    refId: string;              // e.g. "35-1"
    fullRef?: string;           // e.g. "ORD-2026-035-2"
    customerName: string;       // "SOVOA"
    customerEmail?: string;
    customerPhone?: string;
    assigneeName?: string;
    dueDate?: string;
    priority?: "Normal" | "Rush" | "Critical";
    productName?: string;
    materialLabel?: string;
    finishedSize?: string;
    colorMode?: string;
    laminationLabel?: string;
    finishLabel?: string;
    skuCount?: number;
    quantity?: number;
    designerName?: string;
    notes?: string;
  };
}

// ─── Sample thread + history — real wiring later ─────────
const SAMPLE_THREAD: ThreadMsg[] = [
  { author: "Gary", initials: "G", tint: "#eff6ff", at: "Jun 24, 9:05 AM", tag: { label: "Requested info", tone: "info" }, body: "Please provide the following:\n• Updated artwork with bleed\n• Pantone color reference\n• 3D mockup (if available)" },
  { author: "Customer", initials: "C", tint: "#f0fdf4", at: "Jun 24, 11:42 AM", body: "Uploaded 1 file", attachment: { name: "artwork_v2.ai", size: "5.3 MB", kind: "AI" } },
  { author: "Gary", initials: "G", tint: "#eff6ff", at: "Jun 24, 11:50 AM", tag: { label: "Follow up", tone: "warn" }, body: "Thanks! We still need the Pantone color reference." },
  { author: "Customer", initials: "C", tint: "#f0fdf4", at: "Jun 24, 1:10 PM", tag: { label: "Replied", tone: "success" }, body: "Pantone 347C\n\nLet me know if you need anything else." },
  { author: "Marianna", initials: "M", tint: "#fef3c7", at: "Jun 24, 1:25 PM", tag: { label: "Internal note", tone: "muted" }, body: "Files verified. Good to move to proof." },
];

const SAMPLE_HISTORY = [
  { at: "Jun 24, 8:45 AM", who: "Manny Carlo", what: "Order created from paid CRM quote" },
  { at: "Jun 24, 8:52 AM", who: "System", what: "Auto-assigned to designer" },
  { at: "Jun 24, 9:05 AM", who: "Gary", what: "Moved to Missing Info · sent request to customer" },
  { at: "Jun 24, 11:42 AM", who: "Customer", what: "Uploaded artwork_v2.ai" },
  { at: "Jun 24, 1:10 PM", who: "Customer", what: "Provided Pantone reference" },
  { at: "Jun 24, 1:25 PM", who: "Marianna", what: "Verified files · ready for proof" },
];

const SAMPLE_FILES = [
  { name: "Dieline.pdf", size: "348 KB", uploaded: "Jun 24, 2026 3:10 PM" },
  { name: "Artwork.pdf", size: "2.4 MB", uploaded: "Jun 24, 2026 3:12 PM" },
];

type ThreadMsg = {
  author: string; initials: string; tint: string; at: string;
  tag?: { label: string; tone: "info" | "warn" | "success" | "muted" };
  body: string;
  attachment?: { name: string; size: string; kind: string };
};

type TabKey = "overview" | "files" | "communication" | "history";

export function PreviewOrderModalV2({ open, onClose, order, approvalState = null, onMarkApproved }: PreviewOrderModalV2Props) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [designer, setDesigner] = useState(order.designerName || "Marianna");
  const [missingInfoOpen, setMissingInfoOpen] = useState(false);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px", overflowY: "auto", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1f2937" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "1300px", padding: "22px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative" }}
      >
        {/* Preview banner */}
        <div style={{ display: "inline-flex", gap: "6px", marginBottom: "10px", alignItems: "center", padding: "4px 10px", background: "#fef3c7", borderRadius: "999px", fontSize: "10.5px", color: "#b45309", fontWeight: 700 }}>
          🎨 PREVIEW — new modal design · sample thread + history
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}>{order.refId}</div>
            <button style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "14px" }} title="Copy ref">⧉</button>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", background: "#eff6ff", color: ACCENT, borderRadius: "999px" }}>{order.customerName}</span>
          <PickerPill icon="👤" value={order.assigneeName || "Unassigned"} />
          <PickerPill icon="📅" value={`Due: ${order.dueDate || "—"}`} />
          <PickerPill icon="🚩" value={`Priority: ${order.priority || "Normal"}`} />
          <button onClick={() => setMissingInfoOpen(true)} style={{ marginLeft: "auto", padding: "6px 12px", fontSize: "12px", fontWeight: 700, color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", cursor: "pointer" }}>⚠ Request missing info</button>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "22px" }} title="Close">×</button>
        </div>

        {/* Tabs */}
        <Tabs tab={tab} setTab={setTab} counts={{ files: SAMPLE_FILES.length, communication: SAMPLE_THREAD.length, history: SAMPLE_HISTORY.length }} />

        {/* Body: middle + right rail */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "18px", marginTop: "16px" }}>
          <div>
            {tab === "overview" && <OverviewTab order={order} designer={designer} setDesigner={setDesigner} onRequestMissingInfo={() => setMissingInfoOpen(true)} approvalState={approvalState} onMarkApproved={onMarkApproved} />}
            {tab === "files" && <FilesTab />}
            {tab === "communication" && <CommunicationTabFull onRequestMissingInfo={() => setMissingInfoOpen(true)} />}
            {tab === "history" && <HistoryTab />}
          </div>
          <CommunicationPanel />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid #e5e7eb" }}>
          <button onClick={onClose} style={{ padding: "9px 22px", fontSize: "13px", fontWeight: 600, color: "#374151", background: "#fff", border: "1px solid #d1d5db", borderRadius: "10px", cursor: "pointer" }}>Close</button>
          <button style={{ padding: "9px 22px", fontSize: "13px", fontWeight: 700, color: "#fff", background: ACCENT, border: "none", borderRadius: "10px", cursor: "pointer" }}>Save changes</button>
        </div>
      </div>

      {missingInfoOpen && (
        <RequestMissingInfoModal
          fullRef={order.fullRef || `ORD-${order.refId}`}
          customerName={order.customerName}
          customerEmail={order.customerEmail || `${order.customerName.toLowerCase().replace(/\s+/g, "")}@example.com`}
          onClose={() => setMissingInfoOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Header pill ────────────────────────────────────────
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

// ─── Overview tab ────────────────────────────────
function OverviewTab({ order, designer, setDesigner, onRequestMissingInfo, approvalState, onMarkApproved }: { order: PreviewOrderModalV2Props["order"]; designer: string; setDesigner: (v: string) => void; onRequestMissingInfo: () => void; approvalState?: "waiting" | "customer_replied" | "approved" | null; onMarkApproved?: () => void }) {
  return (
    <>
      <ProductHero order={order} />
      {approvalState ? <ApprovalCard state={approvalState} onMarkApproved={onMarkApproved} /> : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "14px" }}>
        <FilesCard files={SAMPLE_FILES} />
        <DesignCard designer={designer} setDesigner={setDesigner} designerHint={order.designerName} onRequestMissingInfo={onRequestMissingInfo} />
      </div>
      <NotesCard notes={order.notes || "gold foil"} />
    </>
  );
}

function ApprovalCard({ state, onMarkApproved }: { state: "waiting" | "customer_replied" | "approved"; onMarkApproved?: () => void }) {
  const stateInfo =
    state === "waiting"
      ? { label: "⏳ Waiting on customer", bg: "#fef3c7", fg: "#b45309", border: "#fde68a" }
      : state === "customer_replied"
        ? { label: "💬 Customer replied — needs review", bg: "#fee2e2", fg: "#b91c1c", border: "#fecaca" }
        : { label: "✅ Customer approved · ready for production", bg: "#dcfce7", fg: "#166534", border: "#bbf7d0" };
  return (
    <div style={{ marginTop: "14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: "10px" }}>Customer approval</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 12px", fontSize: "12.5px", fontWeight: 700, color: stateInfo.fg, background: stateInfo.bg, border: `1px solid ${stateInfo.border}`, borderRadius: "999px" }}>{stateInfo.label}</span>
        {state !== "approved" && onMarkApproved ? (
          <button onClick={onMarkApproved} style={{ padding: "9px 14px", fontSize: "12.5px", fontWeight: 700, color: "#fff", background: "#059669", border: "none", borderRadius: "10px", cursor: "pointer" }}>✅ Mark customer approved</button>
        ) : null}
      </div>
    </div>
  );
}

function ProductHero({ order }: { order: PreviewOrderModalV2Props["order"] }) {
  const pills = [
    order.materialLabel && { icon: "📄", label: order.materialLabel },
    order.finishedSize && { icon: "📐", label: order.finishedSize },
    order.colorMode && { icon: "🎨", label: order.colorMode },
    order.laminationLabel && { icon: "✨", label: order.laminationLabel },
    order.finishLabel && { icon: "🟡", label: order.finishLabel },
  ].filter(Boolean) as { icon: string; label: string }[];
  return (
    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "16px", alignItems: "center" }}>
      <div style={{ width: "110px", height: "110px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "44px" }}>📦</div>
      <div>
        <div style={{ fontSize: "19px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>{order.productName || "—"}</div>
        {pills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            {pills.map((p, i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#374151", background: "#fff", border: "1px solid #e5e7eb", padding: "4px 9px", borderRadius: "8px", fontWeight: 500 }}><span>{p.icon}</span>{p.label}</span>)}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", maxWidth: "340px" }}>
          <div><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>SKU Count</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{order.skuCount || 1} SKU</div></div>
          <div><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Order Quantity</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{order.quantity || 0} pcs</div></div>
        </div>
      </div>
    </div>
  );
}

function FilesCard({ files }: { files: typeof SAMPLE_FILES }) {
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

function DesignCard({ designer, setDesigner, designerHint, onRequestMissingInfo }: { designer: string; setDesigner: (v: string) => void; designerHint?: string; onRequestMissingInfo: () => void }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: "10px" }}>👤 Design</div>
      <label style={{ fontSize: "11.5px", color: "#374151", fontWeight: 600, display: "block", marginBottom: "3px" }}>Designer</label>
      <select value={designer} onChange={e => setDesigner(e.target.value)} style={{ width: "100%", padding: "8px 10px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "10px" }}>
        {[designerHint, "Marianna", "Christopher", "Hayk", "Manny Carlo"].filter((v, i, a) => v && a.indexOf(v) === i).map(d => <option key={d}>{d}</option>)}
      </select>
      <label style={{ fontSize: "11.5px", color: "#374151", fontWeight: 600, display: "block", marginBottom: "3px" }}>Design Task</label>
      <input defaultValue="Prepare proof / prepress" style={{ width: "100%", padding: "8px 10px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "10px" }} />
      <label style={{ fontSize: "11.5px", color: "#374151", fontWeight: 600, display: "block", marginBottom: "3px" }}>Design Status</label>
      <div style={{ marginBottom: "10px" }}><span style={{ display: "inline-block", padding: "3px 10px", fontSize: "11.5px", fontWeight: 700, color: "#b45309", background: "#fef3c7", borderRadius: "999px" }}>Waiting for files</span></div>
      <button onClick={onRequestMissingInfo} style={{ width: "100%", padding: "9px", fontSize: "13px", fontWeight: 700, color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px", cursor: "pointer" }}>⚠ Request Missing Info</button>
    </div>
  );
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", marginTop: "14px" }}>
      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>✎ Notes</div>
      <textarea defaultValue={notes} rows={2} style={{ width: "100%", padding: "10px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ marginTop: "6px", fontSize: "11px", color: "#6b7280" }}>Notes are visible to your team.</div>
    </div>
  );
}

// ─── Files-only tab ────────────────────────────────
function FilesTab() {
  return <FilesCard files={SAMPLE_FILES} />;
}

// ─── Communication tab (full width) ───────────────
function CommunicationTabFull({ onRequestMissingInfo }: { onRequestMissingInfo: () => void }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>Customer thread</div>
          <div style={{ fontSize: "11.5px", color: "#6b7280" }}>All back-and-forth in one place</div>
        </div>
        <button onClick={onRequestMissingInfo} style={{ padding: "8px 14px", fontSize: "12.5px", fontWeight: 700, color: "#fff", background: ACCENT, border: "none", borderRadius: "8px", cursor: "pointer" }}>+ Request missing info</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>{SAMPLE_THREAD.map((m, i) => <ThreadItem key={i} m={m} />)}</div>
    </div>
  );
}

// ─── History tab ────────────────────────────────
function HistoryTab() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
      <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "10px" }}>Order history</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {SAMPLE_HISTORY.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 10px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
            <div style={{ width: "80px", flexShrink: 0, fontSize: "11px", color: "#6b7280" }}>{e.at}</div>
            <div style={{ flex: 1, fontSize: "12.5px", color: "#374151" }}><span style={{ fontWeight: 700 }}>{e.who}</span> · {e.what}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Communication rail (right side) ───────────────
function CommunicationPanel() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", display: "flex", flexDirection: "column", maxHeight: "620px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Communication</div>
        <button style={{ fontSize: "12px", fontWeight: 600, color: ACCENT, background: "transparent", border: "none", cursor: "pointer" }}>+ New message</button>
      </div>
      <div style={{ padding: "12px 14px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
        {SAMPLE_THREAD.map((m, i) => <ThreadItem key={i} m={m} />)}
      </div>
      <div style={{ padding: "10px 12px", borderTop: "1px solid #f3f4f6", display: "flex", gap: "8px", alignItems: "center" }}>
        <input placeholder="Write a message..." style={{ flex: 1, padding: "8px 12px", fontSize: "12.5px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
        <button style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer" }} title="Attach">📎</button>
        <button style={{ background: ACCENT, color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>➤</button>
      </div>
    </div>
  );
}

function ThreadItem({ m }: { m: ThreadMsg }) {
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

// ─── Request-missing-info modal ────────────────────
const DEFAULT_CHECKLIST = [
  { key: "artwork", label: "Updated artwork with bleed", on: true },
  { key: "pantone", label: "Pantone color reference", on: true },
  { key: "mockup", label: "3D mockup (if available)", on: false },
];

function RequestMissingInfoModal({ fullRef, customerName, customerEmail, onClose }: { fullRef: string; customerName: string; customerEmail: string; onClose: () => void }) {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [message, setMessage] = useState(`Hi ${customerName},\n\nWe need a few more details to move forward with your order ${fullRef}.\n\nPlease provide the information listed below.\n\nThank you!`);

  const active = checklist.filter(c => c.on);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px", overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "14px", width: "100%", maxWidth: "820px", padding: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>Request missing info from customer</div>
            <div style={{ fontSize: "12.5px", color: "#6b7280", marginTop: "2px" }}>{fullRef} · {customerName}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "22px" }}>×</button>
        </div>

        <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "6px" }}>Send via</label>
        <div style={{ display: "inline-flex", gap: "8px", marginBottom: "14px" }}>
          <button onClick={() => setChannel("email")} style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: 700, color: channel === "email" ? ACCENT : "#374151", background: channel === "email" ? "#eff6ff" : "#fff", border: `1px solid ${channel === "email" ? ACCENT : "#e5e7eb"}`, borderRadius: "8px", cursor: "pointer" }}>✉ Email</button>
          <button onClick={() => setChannel("sms")} style={{ padding: "8px 16px", fontSize: "12.5px", fontWeight: 700, color: channel === "sms" ? ACCENT : "#374151", background: channel === "sms" ? "#eff6ff" : "#fff", border: `1px solid ${channel === "sms" ? ACCENT : "#e5e7eb"}`, borderRadius: "8px", cursor: "pointer" }}>💬 SMS</button>
        </div>

        <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "6px" }}>To</label>
        <select defaultValue={customerEmail} style={{ width: "100%", padding: "10px 12px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "14px" }}>
          <option>{customerEmail}</option>
        </select>

        <label style={{ fontSize: "12px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "6px" }}>Message to customer</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} style={{ width: "100%", padding: "10px 12px", fontSize: "13px", border: "1px solid #e5e7eb", borderRadius: "8px", resize: "vertical", fontFamily: "inherit", marginBottom: "4px" }} />
        <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "16px" }}>This message will be included in the email.</div>

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
              <div style={{ marginBottom: "8px" }}>Hi {customerName}, we need more info for your order {fullRef}.</div>
              <div style={{ marginBottom: "8px" }}>Please reply here: [reply link added on send] - BazaarPrinting</div>
              <ol style={{ margin: 0, paddingLeft: "18px" }}>
                {active.map(c => <li key={c.key}>{c.label}</li>)}
              </ol>
            </div>
          </div>
        </div>

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
