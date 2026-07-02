"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Image from "next/image";
import { ArrowDownAZ, ArrowDownToLine, ArrowUpAZ, ArrowUpFromLine, Plus } from "lucide-react";
import { OrderCard } from "./order-card";
import { effectiveDropRoles, parseDropRoles } from "@/lib/columns";
import { BOARD_ROLES, COLUMN_ACCENT, ROLE_ABBR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CardNotificationBadge } from "@/lib/card-badges";
import type {
  BoardColumn,
  CustomField,
  OrderWithRelations,
  Role,
} from "@/lib/types";
import type { CommStateEntry } from "@/lib/board-comm-state";

type DateSort = "default" | "asc" | "desc";

interface ColumnProps {
  column: BoardColumn;
  canDragCards: boolean;
  canAcceptDrop: boolean;
  isDragActive: boolean;
  orders: OrderWithRelations[];
  customFields: CustomField[];
  fieldValuesByOrder: Record<string, Record<string, unknown>>;
  thumbnailByOrder: Record<string, string>;
  designerNameByOrder: Record<string, string>;
  notificationBadgeByOrder: Record<string, CardNotificationBadge>;
  ownerNameByOrder: Record<string, string>;
  isFirst: boolean;
  onOpenOrder: (order: OrderWithRelations) => void;
  onAdd: (columnId: string) => void;
  /** V2 preview: when this is the synthetic approval column, per-order state map. */
  approvalStateByOrder?: Record<string, "waiting" | "customer_replied" | "approved">;
  /** V2 preview: dev-only button to flip a random waiting card to customer_replied. */
  onSimulateReply?: () => void;
  /** V2 preview (Hayk 2026-07-01): per-order comm-state for In-Progress cards. */
  commEntryByOrder?: Record<string, CommStateEntry>;
  /** V2 preview: current tick ms — passed to cards for live duration re-render. */
  nowTick?: number;
  /** V2 preview: dev menu handler — flip a card's comm-state (In-Progress column). */
  onCycleCommState?: (
    orderId: string,
    next: "active" | "awaiting-customer" | "customer-replied"
  ) => void;
}

/** Short label of which roles a drop permission applies to. */
function dropLabel(roles: Role[] | null | undefined): string {
  const effective = effectiveDropRoles(parseDropRoles(roles));
  if (effective == null) return "All";
  if (effective.length === 0) return "Admins";
  return BOARD_ROLES.filter((r) => effective.includes(r))
    .map((r) => ROLE_ABBR[r])
    .join(" ");
}

export function Column({
  column,
  canDragCards,
  canAcceptDrop,
  isDragActive,
  orders,
  customFields,
  fieldValuesByOrder,
  thumbnailByOrder,
  designerNameByOrder,
  notificationBadgeByOrder,
  ownerNameByOrder,
  isFirst,
  onOpenOrder,
  onAdd,
  approvalStateByOrder,
  onSimulateReply,
  commEntryByOrder,
  nowTick,
  onCycleCommState,
}: ColumnProps) {
  const [dateSort, setDateSort] = useState<DateSort>("default");

  const dropDisabled = isDragActive && !canAcceptDrop;
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    disabled: dropDisabled,
  });

  const showDropTarget = isDragActive && isOver && canAcceptDrop;

  const isApprovalColumn = !!approvalStateByOrder;
  const isInProgressComm = !!commEntryByOrder;

  // Load-summary counts (In Progress v2, Hayk 2026-07-01).
  let repliedCount = 0;
  let waitingCount = 0;
  if (isInProgressComm) {
    for (const o of orders) {
      const s = commEntryByOrder![o.id]?.state;
      if (s === "customer-replied") repliedCount++;
      else if (s === "awaiting-customer") waitingCount++;
    }
  }

  const sortedOrders = isApprovalColumn
    ? [...orders].sort((a, b) => {
        const sa = approvalStateByOrder![a.id] ?? "waiting";
        const sb = approvalStateByOrder![b.id] ?? "waiting";
        const rank = (s: string) =>
          s === "customer_replied" ? 0 : s === "waiting" ? 1 : 2;
        const ra = rank(sa);
        const rb = rank(sb);
        if (ra !== rb) return ra - rb;
        // Within same bucket: newest first.
        const ta = new Date(a.updated_at || a.created_at).getTime();
        const tb = new Date(b.updated_at || b.created_at).getTime();
        return tb - ta;
      })
    : dateSort === "default"
      ? orders
      : [...orders].sort((a, b) => {
          const ta = new Date(a.created_at).getTime();
          const tb = new Date(b.created_at).getTime();
          return dateSort === "asc" ? ta - tb : tb - ta;
        });

  function cycleDateSort() {
    setDateSort((prev) =>
      prev === "default" ? "asc" : prev === "asc" ? "desc" : "default"
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-lg transition-[opacity,box-shadow]",
        isDragActive && !canAcceptDrop && "opacity-50",
        showDropTarget && "ring-2 ring-blue-400 ring-offset-2"
      )}
    >
      <div
        className={cn(
          "mb-2 rounded-t-lg border-t-4 bg-slate-200/60 px-3 py-2",
          !column.color ? COLUMN_ACCENT[column.kind] : undefined
        )}
        style={column.color ? { borderTopColor: column.color } : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            {column.color ? (
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: column.color }}
              />
            ) : null}
            <span className="truncate text-sm font-semibold text-slate-700">
              {column.name}
            </span>
            <span className="rounded-full bg-white px-1.5 text-xs font-medium text-slate-500">
              {isInProgressComm
                ? `${orders.length} job${orders.length === 1 ? "" : "s"}`
                : orders.length}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={cycleDateSort}
              className={cn(
                "rounded p-1 transition-colors",
                dateSort === "default"
                  ? "text-slate-400 hover:bg-white hover:text-slate-600"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
              )}
              title={
                dateSort === "default"
                  ? "Sort by date created (oldest first)"
                  : dateSort === "asc"
                    ? "Sorted: oldest first — click for newest first"
                    : "Sorted: newest first — click to reset"
              }
            >
              {dateSort === "desc" ? (
                <ArrowDownAZ className="h-4 w-4" />
              ) : (
                <ArrowUpAZ className="h-4 w-4" />
              )}
            </button>
            {isFirst ? (
              <button
                onClick={() => onAdd(column.id)}
                className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-700"
                aria-label="Add order"
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {column.image_url ? (
          <Image
            src={column.image_url}
            alt=""
            width={320}
            height={96}
            className="mt-2 h-20 w-full rounded-md object-cover"
            unoptimized
          />
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-medium text-slate-500">
          <span
            className="inline-flex items-center gap-0.5"
            title="Roles that can drop orders into this stage"
          >
            <ArrowDownToLine className="h-3 w-3" />
            {dropLabel(column.drop_in_roles)}
          </span>
          <span
            className="inline-flex items-center gap-0.5"
            title="Roles that can take orders out of this stage"
          >
            <ArrowUpFromLine className="h-3 w-3" />
            {dropLabel(column.drop_out_roles)}
          </span>
        </div>

        {isInProgressComm && (repliedCount > 0 || waitingCount > 0) ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {repliedCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-300">
                🔔 {repliedCount} replied
              </span>
            ) : null}
            {waitingCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-300">
                ⏳ {waitingCount} waiting
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "board-scroll flex min-h-[8rem] flex-1 flex-col gap-1.5 overflow-y-auto rounded-b-lg p-1 transition-colors",
          showDropTarget ? "bg-blue-50" : "bg-slate-100/40"
        )}
      >
        {isApprovalColumn && onSimulateReply ? (
          <button
            type="button"
            onClick={onSimulateReply}
            className="mb-1 inline-flex items-center justify-center gap-1 rounded-md border border-dashed border-purple-300 bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100"
            title="Dev only: pick a random waiting card and flip it to customer_replied"
          >
            🎲 Simulate customer reply
          </button>
        ) : null}
        <SortableContext
          items={sortedOrders.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedOrders.map((order) => (
            <div key={order.id} className="relative">
              <OrderCard
                order={order}
                canDrag={canDragCards}
                customFields={customFields}
                fieldValues={fieldValuesByOrder[order.id]}
                thumbnail={thumbnailByOrder[order.id]}
                designerName={designerNameByOrder[order.id]}
                notificationBadge={notificationBadgeByOrder[order.id]}
                ownerName={ownerNameByOrder[order.id]}
                onOpen={onOpenOrder}
                approvalState={
                  isApprovalColumn
                    ? (approvalStateByOrder![order.id] ?? "waiting")
                    : null
                }
                commEntry={
                  isInProgressComm ? commEntryByOrder![order.id] ?? null : null
                }
                nowTick={nowTick}
              />
              {isInProgressComm && onCycleCommState ? (
                <div
                  className="mt-0.5 mb-1 flex flex-wrap gap-1 px-1"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onCycleCommState(order.id, "active")}
                    className="rounded border border-dashed border-slate-300 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 hover:bg-slate-50"
                    title="Simulate: mark active"
                  >
                    🎭 active
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onCycleCommState(order.id, "awaiting-customer")
                    }
                    className="rounded border border-dashed border-slate-300 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 hover:bg-slate-50"
                    title="Simulate: sent request, awaiting customer"
                  >
                    🎭 waiting
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onCycleCommState(order.id, "customer-replied")
                    }
                    className="rounded border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 hover:bg-amber-100"
                    title="Simulate: customer replied"
                  >
                    🎭 replied
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
