"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Copy,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CARD_BADGE_LABELS,
  CARD_BADGE_STYLES,
  type CardNotificationBadge,
} from "@/lib/card-badges";
import {
  PRIORITY_STYLES,
  UNASSIGNED_DESIGNER_CARD_CLASS,
  UNASSIGNED_DESIGNER_TEXT_CLASS,
} from "@/lib/constants";
import {
  cardOrderQty,
  cardSkuCount,
  cardSpecFieldsForDisplay,
  findOrderFormField,
} from "@/lib/order-form";
import {
  customerContactFromOrder,
  customerNameFromOrder,
} from "@/lib/notification-messages";
import { cn, formatDate, formatDateShort } from "@/lib/utils";
import { ORDER_TAG_STYLES, orderTagsFromSpecs } from "@/lib/order-tags";
import type { CustomField, OrderWithRelations } from "@/lib/types";
import {
  fmtDuration,
  fmtSince,
  totalWorkedSeconds,
  type CommStateEntry,
} from "@/lib/board-comm-state";

interface OrderCardProps {
  order: OrderWithRelations;
  /** When false the card can be opened but not dragged. */
  canDrag?: boolean;
  customFields?: CustomField[];
  fieldValues?: Record<string, unknown>;
  /** Signed URL of the first image asset — square preview in compact mode. */
  thumbnail?: string;
  /** Resolved designer display name (from specs or team list). */
  designerName?: string;
  notificationBadge?: CardNotificationBadge;
  ownerName?: string;
  onOpen: (order: OrderWithRelations) => void;
  /** V2 preview mode — approval column state indicator. */
  approvalState?: "waiting" | "customer_replied" | "approved" | null;
  /** V2 preview mode — In-Progress card comm-state (Hayk 2026-07-01). */
  commEntry?: CommStateEntry | null;
  /** V2 preview: current time tick (ms) to force re-render of live durations. */
  nowTick?: number;
}

export function OrderCard({
  order,
  canDrag = true,
  customFields = [],
  fieldValues = {},
  thumbnail,
  designerName: designerNameProp,
  notificationBadge,
  ownerName,
  onOpen,
  approvalState = null,
  commEntry = null,
  nowTick,
}: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const specFields = cardSpecFieldsForDisplay(customFields, fieldValues);
  const orderQty = cardOrderQty(customFields, fieldValues, order.specs);
  const skuCount = cardSkuCount(order.specs);
  const customerName = customerNameFromOrder(
    order,
    fieldValues,
    customFields
  );
  const displayCustomerName =
    customerName === "there" ? null : customerName;
  const { email, phone } = customerContactFromOrder(
    order,
    fieldValues,
    customFields
  );

  const productField = findOrderFormField(customFields, "Product");
  const productName = productField
    ? String(fieldValues[productField.id] ?? "").trim()
    : "";

  const designerName =
    designerNameProp?.trim() ||
    (typeof order.specs?.designer_name === "string"
      ? order.specs.designer_name.trim()
      : "") ||
    null;

  const orderTags = orderTagsFromSpecs(order.specs);
  const isDesignerUnassigned = !designerName;

  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function copyText(e: React.MouseEvent, text: string, key: string) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore clipboard failures
    }
  }

  function toggleExpanded(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((v) => !v);
  }

  function CopyableText({
    text,
    copyKey,
    title,
    className,
  }: {
    text: string;
    copyKey: string;
    title: string;
    className?: string;
  }) {
    return (
      <button
        type="button"
        onClick={(e) => copyText(e, text, copyKey)}
        onPointerDown={(e) => e.stopPropagation()}
        title={title}
        className={cn(
          "group/copy flex max-w-full items-center gap-1 text-left text-[11px] font-medium text-slate-700 hover:text-[var(--primary)]",
          className
        )}
      >
        <span className="min-w-0 truncate">
          {copied === copyKey ? "Copied" : text}
        </span>
        <span className="inline-flex shrink-0 items-center text-[10px] font-normal text-slate-400 group-hover/copy:text-[var(--primary)]">
          {copied === copyKey ? null : (
            <Copy className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover/copy:opacity-100" />
          )}
        </span>
      </button>
    );
  }

  // Hayk 2026-06-30 — always render the same three slots so every card has
  // identical visual rhythm regardless of how much data the order has.
  const summaryTrailingParts = [
    productName || "—",
    `qty ${orderQty != null ? orderQty : "—"}`,
    `${skuCount || 0} SKU`,
  ];

  // Hayk 2026-06-30 — short order ref like "#035" parsed out of full title.
  const shortOrderRef = (() => {
    const t = (order.title || "").trim();
    const match = t.match(/-(\d{3,4})(?:-\d+)?$/) || t.match(/(\d{3,4})/);
    return match ? `#${match[1]}` : t || "#…";
  })();

  // Stable color for the designer chip (hash → palette).
  const designerColor = (() => {
    if (!designerName) return null;
    const palette = [
      "bg-violet-100 text-violet-700 border-violet-200",
      "bg-sky-100 text-sky-700 border-sky-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-teal-100 text-teal-700 border-teal-200",
      "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
    ];
    let hash = 0;
    for (let i = 0; i < designerName.length; i++) {
      hash = (hash * 31 + designerName.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  })();

  // Hayk 2026-06-30 — stock fallback so layout is visible until SKU artwork
  // is uploaded on real orders. Real thumbnail (from sku_images) wins.
  const STOCK_FALLBACK_THUMB =
    "https://api.bazaarprinting.com/api/local-file/products%2Fdhkns6f31o9yvd82_v-mini-tuck-end-box.png";
  const [thumbBroken, setThumbBroken] = useState(false);
  const effectiveThumb =
    thumbnail && !thumbBroken ? thumbnail : STOCK_FALLBACK_THUMB;

  // V2 In-Progress card comm-state — Hayk 2026-07-01.
  // Cards stay in In Progress while designer waits on customer. The card
  // itself changes visual state (dim/amber-pulse) instead of moving columns.
  const commState = commEntry?.state ?? null;
  const nowRef = nowTick ?? Date.now();
  const workedSeconds = commEntry
    ? totalWorkedSeconds(commEntry, nowRef)
    : null;
  const commChipText =
    commEntry && commState === "awaiting-customer"
      ? `⏳ Waiting ${fmtSince(commEntry.stateChangedAt, nowRef)}`
      : commEntry && commState === "customer-replied"
        ? `🔔 Replied ${fmtSince(commEntry.stateChangedAt, nowRef)}`
        : null;
  const commSubtitle =
    commEntry && commState === "awaiting-customer" && commEntry.requestedItems
      ? `Requested: ${commEntry.requestedItems}`
      : commEntry && commState === "customer-replied" && commEntry.replyPreview
        ? commEntry.replyPreview.length > 100
          ? `${commEntry.replyPreview.slice(0, 100)}…`
          : commEntry.replyPreview
        : null;

  const commWrapperStyle: React.CSSProperties = {};
  if (commState === "awaiting-customer") {
    commWrapperStyle.opacity = 0.75;
  }
  if (commState === "customer-replied") {
    commWrapperStyle.border = "2px solid #f59e0b";
    commWrapperStyle.animation = "wf-comm-pulse 2s ease-in-out infinite alternate";
  }

  // V2 approval-column visual state — left border tint + top pill.
  const approvalBorder =
    approvalState === "waiting"
      ? "border-l-4 border-l-amber-400"
      : approvalState === "customer_replied"
        ? "border-l-4 border-l-red-500"
        : approvalState === "approved"
          ? "border-l-4 border-l-emerald-500"
          : "";

  const approvalPill =
    approvalState === "waiting" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
        ⏳ Waiting on customer
      </span>
    ) : approvalState === "customer_replied" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-300">
        💬 New message · click to review
      </span>
    ) : approvalState === "approved" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        ✅ Customer approved · ready for production
      </span>
    ) : null;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...commWrapperStyle }}
      {...attributes}
      {...(canDrag ? listeners : {})}
      onClick={() => onOpen(order)}
      className={cn(
        "relative group rounded-lg border bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300",
        isDesignerUnassigned
          ? UNASSIGNED_DESIGNER_CARD_CLASS
          : "border-slate-200",
        approvalBorder,
        "p-2.5",
        canDrag ? "cursor-pointer" : "cursor-default"
      )}
    >
    {commState === "customer-replied" ? (
      <span
        aria-hidden
        className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
      />
    ) : null}
    {workedSeconds != null ? (
      <span
        className="absolute right-2 top-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
        title={
          commEntry?.activeSegmentStartedAt
            ? "Active time on job"
            : "Timer paused — waiting on customer"
        }
      >
        ⏱ {fmtDuration(workedSeconds)}
      </span>
    ) : null}
    {commChipText ? (
      <div className="mb-1 flex items-center">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
            commState === "customer-replied"
              ? "bg-amber-50 text-amber-800 ring-amber-300"
              : "bg-slate-100 text-slate-600 ring-slate-200"
          )}
        >
          {commChipText}
        </span>
      </div>
    ) : null}
    {commSubtitle ? (
      <div
        className={cn(
          "mb-1.5 line-clamp-2 text-[11px] leading-snug",
          commState === "customer-replied"
            ? "text-slate-700"
            : "text-slate-500"
        )}
      >
        {commSubtitle}
      </div>
    ) : null}
    {approvalPill ? (
      <div className="mb-2 flex items-center">{approvalPill}</div>
    ) : null}
    <div className="flex gap-3">
      {/* Thumbnail — left, 56×56 */}
      <Image
        src={effectiveThumb}
        alt=""
        width={56}
        height={56}
        className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-slate-100"
        unoptimized
        onError={() => setThumbBroken(true)}
      />

    <div className="min-w-0 flex-1">
      {/* Top row — # left, customer right */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => copyText(e, order.title, "order")}
          onPointerDown={(e) => e.stopPropagation()}
          title={`Copy ${order.title}`}
          className="group/copy inline-flex items-center gap-1 text-sm font-bold leading-none text-slate-900 hover:text-[var(--primary)]"
        >
          <span>{shortOrderRef}</span>
          {copied === "order" ? (
            <span className="text-[10px] font-normal text-emerald-600">
              Copied
            </span>
          ) : (
            <Copy className="h-3 w-3 text-slate-300 opacity-0 transition-opacity group-hover/copy:opacity-100" />
          )}
        </button>

        {displayCustomerName ? (
          <button
            type="button"
            onClick={(e) => copyText(e, displayCustomerName, "customer-name")}
            onPointerDown={(e) => e.stopPropagation()}
            title="Copy customer name"
            className="min-w-0 truncate text-right text-sm font-semibold text-slate-700 hover:text-[var(--primary)]"
          >
            {copied === "customer-name" ? "Copied" : displayCustomerName}
          </button>
        ) : null}
      </div>

      {/* Middle row — product summary */}
      {summaryTrailingParts.length > 0 ? (
        <div className="mt-1.5 truncate text-[11px] leading-snug text-slate-500">
          {summaryTrailingParts.join("  ·  ")}
        </div>
      ) : null}

      {/* Bottom row — designer chip · due date · priority · chevron */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {designerName && designerColor ? (
            <span
              className={cn(
                "inline-flex max-w-[140px] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                designerColor
              )}
              title={`Designer: ${designerName}`}
            >
              <span className="truncate">{designerName}</span>
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700",
              )}
              title="Designer unassigned"
            >
              <User className="h-2.5 w-2.5" />
              Unassigned
            </span>
          )}
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 text-[10px] font-medium",
              order.due_date ? "text-slate-500" : "text-slate-300"
            )}
            title={order.due_date ? `Due ${formatDate(order.due_date)}` : "No due date"}
          >
            <CalendarClock className="h-3 w-3" />
            {order.due_date ? formatDateShort(order.due_date) : "No due date"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {order.priority !== "normal" ? (
            <Badge
              className={cn(
                PRIORITY_STYLES[order.priority],
                "h-5 px-1.5 text-[10px]"
              )}
            >
              {order.priority}
            </Badge>
          ) : null}
          <button
            type="button"
            onClick={toggleExpanded}
            onPointerDown={(e) => e.stopPropagation()}
            title={expanded ? "Show less" : "Show more"}
            aria-expanded={expanded}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded — order specs + status badges (customer is in the header) */}
      {expanded ? (
        <div
          className="mt-2.5 space-y-2 rounded-md bg-slate-50 p-2.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Order specs
          </div>
          {specFields.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-snug">
              {specFields.map(({ field, label, display }) => (
                <div key={field.id} className="min-w-0">
                  <span className="text-slate-400">{label}: </span>
                  <span className="truncate font-medium text-slate-700">
                    {display}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {orderQty != null ? (
              <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200">
                qty {orderQty}
              </span>
            ) : null}
            {skuCount > 0 ? (
              <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-[#1e40af] ring-1 ring-blue-200">
                SKU: {skuCount}
              </span>
            ) : null}
          </div>
          {(order.category || notificationBadge || orderTags.length > 0) ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2">
              {order.category ? (
                <span
                  className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: order.category.color }}
                >
                  {order.category.name}
                </span>
              ) : null}
              {notificationBadge ? (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-medium",
                    CARD_BADGE_STYLES[notificationBadge]
                  )}
                >
                  {CARD_BADGE_LABELS[notificationBadge]}
                </span>
              ) : null}
              {orderTags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-medium",
                    ORDER_TAG_STYLES[tag] ??
                      "border-slate-200 bg-slate-100 text-slate-600"
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
    </div>
    </div>
  );
}
