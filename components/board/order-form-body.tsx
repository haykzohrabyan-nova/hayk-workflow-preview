"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { CustomFieldInput } from "./custom-field-input";
import { SkuEditor, type SkuItem } from "./sku-editor";
import { OrderQtyField } from "./order-qty-field";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { normalizeCustomerContact } from "@/lib/customers";
import {
  isValidCustomerContact,
  orderFormFieldLabel,
  resolveOrderFormFields,
  validateDueDate,
} from "@/lib/order-form";
import { cn, dateInputValue, localDateInputValue } from "@/lib/utils";
import { PRODUCT_MATERIALS } from "@/lib/product-data";
import {
  hasKnownSubcategory,
  shouldShowConditionalField,
} from "@/lib/product-conditional-fields";
import type { Asset, Category, CustomField, Designer, OrderSkuImageWithUrl } from "@/lib/types";

export interface OrderOwner {
  id: string;
  name: string;
}

export interface OrderFormBodyProps {
  idPrefix: string;
  customFields: CustomField[];
  owners: OrderOwner[];
  designers: Designer[];
  title: string;
  onTitleChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  ownerId: string;
  onOwnerIdChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerContact: string;
  onCustomerContactChange: (value: string) => void;
  designerId: string;
  onDesignerIdChange: (value: string) => void;
  designTask: string;
  onDesignTaskChange: (value: string) => void;
  fieldValues: Record<string, unknown>;
  onFieldValueChange: (fieldId: string, value: unknown) => void;
  skus: SkuItem[];
  onSkusChange: (value: SkuItem[]) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  /** Original due date when editing — allows saving unchanged legacy past dates. */
  previousDueDate?: string | null;
  orderId?: string;
  skuAssets?: Asset[];
  skuImagesBySkuId?: Record<string, OrderSkuImageWithUrl[]>;
  pendingSkuArtwork?: Record<string, File>;
  onPendingSkuArtworkChange?: (files: Record<string, File>) => void;
  deferSkuArtworkUpload?: boolean;
  removedSkuArtworkIds?: ReadonlySet<string>;
  onMarkSkuArtworkForRemoval?: (assetId: string) => void;
  onUnmarkSkuArtworkForRemoval?: (assetId: string) => void;
  /** Saves a newly added SKU row before gallery uploads can attach to it. */
  ensureSkuPersisted?: (skuId: string) => Promise<string | null>;
  readOnly?: boolean;
  /** Hide order number field (shown in modal title when editing existing orders). */
  hideOrderNumberField?: boolean;
  categories?: Category[];
  categoryId?: string;
  onCategoryIdChange?: (value: string) => void;
  /**
   * Hayk 2026-06-30 redesign — when true:
   * - Hide Priority / Owner / Due date (they live in the modal header now)
   * - Hide Category dropdown (category is set at order-creation time via website/CRM)
   * - Reorder body: Product details FIRST, then Artwork, then Customer, then Order Notes at the bottom
   */
  compactMode?: boolean;
}

export function OrderFormBody({
  idPrefix,
  customFields,
  owners,
  designers,
  title,
  onTitleChange,
  priority,
  onPriorityChange,
  ownerId,
  onOwnerIdChange,
  description,
  onDescriptionChange,
  customerName,
  onCustomerNameChange,
  customerContact,
  onCustomerContactChange,
  designerId,
  onDesignerIdChange,
  designTask,
  onDesignTaskChange,
  fieldValues,
  onFieldValueChange,
  skus,
  onSkusChange,
  dueDate,
  onDueDateChange,
  previousDueDate,
  orderId,
  skuAssets,
  skuImagesBySkuId,
  pendingSkuArtwork,
  onPendingSkuArtworkChange,
  deferSkuArtworkUpload,
  removedSkuArtworkIds,
  onMarkSkuArtworkForRemoval,
  onUnmarkSkuArtworkForRemoval,
  ensureSkuPersisted,
  readOnly = false,
  hideOrderNumberField = false,
  categories = [],
  categoryId = "",
  onCategoryIdChange,
  compactMode = false,
}: OrderFormBodyProps) {
  const resolved = resolveOrderFormFields(customFields);
  const { artworkField, designerField, orderQtyField, printFields } = resolved;
  const [artworkCopied, setArtworkCopied] = useState(false);
  const [dueDateError, setDueDateError] = useState<string | null>(null);
  const [customerLookupHint, setCustomerLookupHint] = useState<string | null>(
    null
  );
  const nameEditedRef = useRef(false);
  const lookupSeqRef = useRef(0);
  const lastLookupKeyRef = useRef<string | null>(null);
  const normalizedDueDate = dateInputValue(dueDate);
  const minDueDate = localDateInputValue();
  const artworkValue = artworkField
    ? String(fieldValues[artworkField.id] ?? "").trim()
    : "";

  async function copyArtworkLink() {
    if (!artworkValue) return;
    try {
      await navigator.clipboard.writeText(artworkValue);
      setArtworkCopied(true);
      setTimeout(() => setArtworkCopied(false), 1500);
    } catch {
      // ignore clipboard failures
    }
  }

  useEffect(() => {
    if (readOnly) return;

    const normalized = normalizeCustomerContact(customerContact);
    const lookupKey = normalized
      ? `${normalized.kind}:${normalized.value}`
      : null;
    if (lookupKey !== lastLookupKeyRef.current) {
      nameEditedRef.current = false;
      lastLookupKeyRef.current = lookupKey;
      if (!lookupKey) setCustomerLookupHint(null);
    }
  }, [customerContact, readOnly]);

  useEffect(() => {
    if (readOnly) return;

    if (!isValidCustomerContact(customerContact)) {
      setCustomerLookupHint(null);
      return;
    }

    const seq = ++lookupSeqRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const normalized = normalizeCustomerContact(customerContact);
        const params = new URLSearchParams();
        if (normalized?.kind === "email") {
          params.set("email", normalized.value);
        } else if (normalized?.kind === "phone") {
          params.set("phone", normalized.value);
        } else {
          params.set("contact", customerContact);
        }
        const res = await fetch(`/api/customers/lookup?${params}`);
        if (seq !== lookupSeqRef.current) return;
        if (!res.ok) {
          setCustomerLookupHint(null);
          return;
        }
        const json = (await res.json()) as {
          name?: string;
          email?: string | null;
          phone?: string | null;
        } | null;
        if (seq !== lookupSeqRef.current) return;
        if (!json) {
          setCustomerLookupHint(null);
          return;
        }
        if (!nameEditedRef.current && json.name) {
          onCustomerNameChange(json.name);
        }
        const extraContact =
          normalized?.kind === "phone" && json.email
            ? json.email
            : normalized?.kind === "email" && json.phone
              ? json.phone
              : null;
        setCustomerLookupHint(
          extraContact
            ? `Existing customer found — fields auto-filled (also on file: ${extraContact})`
            : "Existing customer found — fields auto-filled"
        );
      } catch {
        if (seq !== lookupSeqRef.current) return;
        setCustomerLookupHint(null);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [customerContact, onCustomerNameChange, readOnly]);

  function handleCustomerNameChange(value: string) {
    nameEditedRef.current = true;
    onCustomerNameChange(value);
  }

  function handleDueDateChange(value: string) {
    if (!value) {
      setDueDateError(null);
      onDueDateChange("");
      return;
    }
    const normalized = dateInputValue(value);
    const error = validateDueDate(normalized, previousDueDate);
    if (error) {
      setDueDateError(error);
      return;
    }
    setDueDateError(null);
    onDueDateChange(normalized);
  }

  // Hayk redesign — section blocks isolated so compactMode can re-order them.
  const priorityOwnerDueBlock = compactMode ? null : (
    <div
      className={
        hideOrderNumberField
          ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      }
    >
      {!hideOrderNumberField ? (
        <div>
          <Label htmlFor={`${idPrefix}-title`}>
            Order Number<span className="ml-0.5 text-red-500">*</span>
          </Label>
          <Input
            id={`${idPrefix}-title`}
            required
            readOnly={readOnly}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. PO-10245"
            className={readOnly ? "bg-slate-50" : undefined}
          />
        </div>
      ) : null}
      <div>
        <Label htmlFor={`${idPrefix}-priority`}>Priority</Label>
        <Select
          id={`${idPrefix}-priority`}
          value={priority}
          disabled={readOnly}
          onChange={(e) => onPriorityChange(e.target.value)}
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-owner`}>Owner</Label>
        <Select
          id={`${idPrefix}-owner`}
          value={ownerId}
          disabled={readOnly}
          onChange={(e) => onOwnerIdChange(e.target.value)}
        >
          <option value="">— Unassigned —</option>
          {owners.length === 0 ? (
            <option value="" disabled>
              No account managers
            </option>
          ) : null}
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-due`}>Due date</Label>
        <Input
          id={`${idPrefix}-due`}
          type="date"
          min={readOnly ? undefined : minDueDate}
          readOnly={readOnly}
          value={normalizedDueDate}
          onChange={(e) => handleDueDateChange(e.target.value)}
          aria-invalid={dueDateError ? true : undefined}
          className={
            dueDateError
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
              : readOnly
                ? "bg-slate-50"
                : undefined
          }
        />
        {dueDateError ? (
          <p className="mt-1 text-xs text-red-600">{dueDateError}</p>
        ) : null}
      </div>
    </div>
  );

  const descriptionBlock = (
    <div>
      <Label htmlFor={`${idPrefix}-desc`}>
        {compactMode ? "Order Notes" : "Order Description"}
      </Label>
      <Textarea
        id={`${idPrefix}-desc`}
        readOnly={readOnly}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Notes, references, special instructions…"
        className={readOnly ? "bg-slate-50" : undefined}
      />
    </div>
  );

  const artworkBlock = artworkField ? (
    <div>
      <Label htmlFor={`${idPrefix}-artwork`}>
        {orderFormFieldLabel(artworkField.name)}
        {artworkField.required ? (
          <span className="ml-0.5 text-red-500">*</span>
        ) : null}
      </Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={copyArtworkLink}
          disabled={!artworkValue}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          title="Copy Artwork GDrive link"
        >
          <Copy className="h-4 w-4" />
          {artworkCopied ? "Copied" : "Copy Link"}
        </button>
        <Input
          id={`${idPrefix}-artwork`}
          readOnly={readOnly}
          value={(fieldValues[artworkField.id] as string) ?? ""}
          onChange={(e) =>
            onFieldValueChange(artworkField.id, e.target.value)
          }
          placeholder="https://drive.google.com/…"
          className={cn(
            "min-w-0 flex-1",
            readOnly ? "bg-slate-50" : undefined
          )}
        />
      </div>
    </div>
  ) : null;

  if (compactMode) {
    return <CompactBody
      idPrefix={idPrefix}
      readOnly={readOnly}
      designers={designers}
      designerField={designerField}
      designerId={designerId}
      onDesignerIdChange={onDesignerIdChange}
      designTask={designTask}
      onDesignTaskChange={onDesignTaskChange}
      printFields={printFields}
      fieldValues={fieldValues}
      onFieldValueChange={onFieldValueChange}
      skus={skus}
      onSkusChange={onSkusChange}
      orderId={orderId}
      skuAssets={skuAssets}
      skuImagesBySkuId={skuImagesBySkuId}
      pendingSkuArtwork={pendingSkuArtwork}
      onPendingSkuArtworkChange={onPendingSkuArtworkChange}
      deferSkuArtworkUpload={deferSkuArtworkUpload}
      removedSkuArtworkIds={removedSkuArtworkIds}
      onMarkSkuArtworkForRemoval={onMarkSkuArtworkForRemoval}
      onUnmarkSkuArtworkForRemoval={onUnmarkSkuArtworkForRemoval}
      ensureSkuPersisted={ensureSkuPersisted}
      orderQtyField={orderQtyField}
      artworkBlock={artworkBlock}
      customerName={customerName}
      onCustomerNameChange={handleCustomerNameChange}
      customerContact={customerContact}
      onCustomerContactChange={onCustomerContactChange}
      customerLookupHint={customerLookupHint}
      descriptionBlock={descriptionBlock}
    />;
  }

  return (
    <div className="space-y-4">
      {priorityOwnerDueBlock}

      {descriptionBlock}

      {artworkField ? (
        <div>
          <Label htmlFor={`${idPrefix}-artwork`}>
            {orderFormFieldLabel(artworkField.name)}
            {artworkField.required ? (
              <span className="ml-0.5 text-red-500">*</span>
            ) : null}
          </Label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyArtworkLink}
              disabled={!artworkValue}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              title="Copy Artwork GDrive link"
            >
              <Copy className="h-4 w-4" />
              {artworkCopied ? "Copied" : "Copy Link"}
            </button>
            <Input
              id={`${idPrefix}-artwork`}
              readOnly={readOnly}
              value={(fieldValues[artworkField.id] as string) ?? ""}
              onChange={(e) =>
                onFieldValueChange(artworkField.id, e.target.value)
              }
              placeholder="https://drive.google.com/…"
              className={cn(
                "min-w-0 flex-1",
                readOnly ? "bg-slate-50" : undefined
              )}
            />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-customer-name`}>
            Customer Name<span className="ml-0.5 text-red-500">*</span>
          </Label>
          <Input
            id={`${idPrefix}-customer-name`}
            required
            readOnly={readOnly}
            value={customerName}
            onChange={(e) => handleCustomerNameChange(e.target.value)}
            className={readOnly ? "bg-slate-50" : undefined}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-customer-contact`}>
            Customer Contact<span className="ml-0.5 text-red-500">*</span>
          </Label>
          <Input
            id={`${idPrefix}-customer-contact`}
            required
            readOnly={readOnly}
            value={customerContact}
            onChange={(e) => onCustomerContactChange(e.target.value)}
            placeholder="Email or phone"
            className={readOnly ? "bg-slate-50" : undefined}
          />
          {customerLookupHint ? (
            <p className="mt-1 text-xs text-emerald-600">{customerLookupHint}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-designer`}>
            Designer
            {designerField?.required ? (
              <span className="ml-0.5 text-red-500">*</span>
            ) : null}
          </Label>
          <Select
            id={`${idPrefix}-designer`}
            value={designerId}
            disabled={readOnly}
            onChange={(e) => onDesignerIdChange(e.target.value)}
          >
            <option value="">
              {designers.length ? "Unassigned" : "No designers on team"}
            </option>
            {designers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-design-task`}>Design task</Label>
          <Input
            id={`${idPrefix}-design-task`}
            readOnly={readOnly}
            value={designTask}
            onChange={(e) => onDesignTaskChange(e.target.value)}
            placeholder="e.g. Prepare proof / prepress"
            className={readOnly ? "bg-slate-50" : undefined}
          />
        </div>
      </div>

      {printFields.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {printFields.map((field) => (
            <CustomFieldInput
              key={field.id}
              field={{
                ...field,
                name: orderFormFieldLabel(field.name),
              }}
              value={fieldValues[field.id]}
              onChange={(v) => onFieldValueChange(field.id, v)}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : null}

      <SkuEditor
        value={skus}
        onChange={onSkusChange}
        orderId={orderId}
        assets={skuAssets}
        skuImagesBySkuId={skuImagesBySkuId}
        pendingArtwork={pendingSkuArtwork}
        onPendingArtworkChange={onPendingSkuArtworkChange}
        deferArtworkUpload={deferSkuArtworkUpload}
        removedArtworkIds={removedSkuArtworkIds}
        onMarkArtworkForRemoval={onMarkSkuArtworkForRemoval}
        onUnmarkArtworkForRemoval={onUnmarkSkuArtworkForRemoval}
        ensureSkuPersisted={ensureSkuPersisted}
        disabled={readOnly}
      />

      {orderQtyField ? (
        <OrderQtyField
          skus={skus}
          value={(fieldValues[orderQtyField.id] as number | null) ?? null}
          onChange={(v) => onFieldValueChange(orderQtyField.id, v)}
          readOnly={readOnly}
        />
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CompactBody — Hayk redesign 2026-06-30
 * Section order:
 *   1) Customer block (collapsed name; click to expand phone + email)
 *   2) Product details (print fields → SKU editor → order qty)
 *   3) Artwork GDrive link
 *   4) Designer + Design task
 *   5) Order notes (bottom)
 * ────────────────────────────────────────────────────────────────────────── */

interface CompactBodyProps {
  idPrefix: string;
  readOnly: boolean;
  designers: Designer[];
  designerField: CustomField | undefined;
  designerId: string;
  onDesignerIdChange: (v: string) => void;
  designTask: string;
  onDesignTaskChange: (v: string) => void;
  printFields: CustomField[];
  fieldValues: Record<string, unknown>;
  onFieldValueChange: (id: string, v: unknown) => void;
  skus: SkuItem[];
  onSkusChange: (v: SkuItem[]) => void;
  orderId?: string;
  skuAssets?: Asset[];
  skuImagesBySkuId?: Record<string, OrderSkuImageWithUrl[]>;
  pendingSkuArtwork?: Record<string, File>;
  onPendingSkuArtworkChange?: (files: Record<string, File>) => void;
  deferSkuArtworkUpload?: boolean;
  removedSkuArtworkIds?: ReadonlySet<string>;
  onMarkSkuArtworkForRemoval?: (id: string) => void;
  onUnmarkSkuArtworkForRemoval?: (id: string) => void;
  ensureSkuPersisted?: (id: string) => Promise<string | null>;
  orderQtyField: CustomField | undefined;
  artworkBlock: React.ReactNode;
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  customerContact: string;
  onCustomerContactChange: (v: string) => void;
  customerLookupHint: string | null;
  descriptionBlock: React.ReactNode;
}

function CompactBody({
  idPrefix,
  readOnly,
  designers,
  designerField,
  designerId,
  onDesignerIdChange,
  designTask,
  onDesignTaskChange,
  printFields,
  fieldValues,
  onFieldValueChange,
  skus,
  onSkusChange,
  orderId,
  skuAssets,
  skuImagesBySkuId,
  pendingSkuArtwork,
  onPendingSkuArtworkChange,
  deferSkuArtworkUpload,
  removedSkuArtworkIds,
  onMarkSkuArtworkForRemoval,
  onUnmarkSkuArtworkForRemoval,
  ensureSkuPersisted,
  orderQtyField,
  artworkBlock,
  customerName,
  onCustomerNameChange,
  customerContact,
  onCustomerContactChange,
  customerLookupHint,
  descriptionBlock,
}: CompactBodyProps) {
  const [customerOpen, setCustomerOpen] = useState(false);
  // Split contact string into phone + email if a unified field is present.
  const looksLikeEmail = customerContact.includes("@");
  const phoneValue = !looksLikeEmail ? customerContact : "";
  const emailValue = looksLikeEmail ? customerContact : "";

  // Hayk 2026-07-02 — Doc 01 Change #4 + #8:
  // 1) Look up the current "Product" selection so we can hide fields that
  //    don't apply (Roll Direction, Die, Sides, Application…).
  // 2) When rendering the Materials dropdown, narrow its options to the
  //    materials whitelisted for that product (mirrors the live Bazaar site).
  const productField = printFields.find(
    (f) => f.name.toLowerCase() === "product"
  );
  const selectedProduct = productField
    ? String(fieldValues[productField.id] ?? "").trim()
    : "";
  const subcategoryKnown = hasKnownSubcategory(selectedProduct);

  // Filter printFields to those that should render for the selected product.
  // Product itself is always shown (guaranteed by ALWAYS_SHOWN).
  const visiblePrintFields = printFields.filter((f) =>
    shouldShowConditionalField(f.name, selectedProduct)
  );

  // Build a per-field option override map for Materials narrowing.
  function fieldForRender(field: CustomField): CustomField {
    const isMaterials = field.name.toLowerCase() === "materials"
      || field.name.toLowerCase() === "material";
    if (isMaterials && selectedProduct) {
      const allowed = PRODUCT_MATERIALS[selectedProduct];
      if (allowed && allowed.length > 0) {
        // Preserve original ordering from field.options where possible.
        const allowedSet = new Set(allowed);
        const filtered = field.options.filter((o) => allowedSet.has(o));
        // If nothing survived the filter (data drift), fall back to allowed.
        const finalOpts = filtered.length > 0 ? filtered : allowed;
        return { ...field, options: finalOpts };
      }
    }
    return field;
  }

  return (
    <div className="space-y-5">
      {/* Hayk 2026-06-30 — Customer block removed from body. Customer name +
          phone + email are now in the modal header (clickable dropdown). */}

      {/* Product details */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Product Details
          </span>
          {selectedProduct && !subcategoryKnown ? (
            <span className="text-[10px] font-normal italic text-slate-400">
              subcategory unknown — showing all fields
            </span>
          ) : null}
        </header>
        {visiblePrintFields.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visiblePrintFields.map((field) => {
              const forRender = fieldForRender(field);
              return (
                <CustomFieldInput
                  key={field.id}
                  field={{
                    ...forRender,
                    name: orderFormFieldLabel(forRender.name),
                  }}
                  value={fieldValues[field.id]}
                  onChange={(v) => onFieldValueChange(field.id, v)}
                  readOnly={readOnly}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No product details configured.</p>
        )}
      </section>

      {/* SKUs + Quantity */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <header className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          SKUs & Quantity
        </header>
        {/* Hayk 2026-07-02 — Doc 01 Bonus: rich product line-item summary card.
            Mirrors the Bazaar-admin cart shape so production sees:
              [thumb]  Product · Material · Size · Finish · N pcs
                       0 File(s) Uploaded
            No unit / extended pricing yet (workflow app doesn't carry
            price data). Icons kept out until wired to real actions. */}
        <ProductLineItemSummary
          skus={skus}
          printFields={printFields}
          fieldValues={fieldValues}
          skuAssetsCount={
            (skuAssets ?? []).filter((a) => a.sku_key).length
          }
        />
        <SkuEditor
          value={skus}
          onChange={onSkusChange}
          orderId={orderId}
          assets={skuAssets}
          skuImagesBySkuId={skuImagesBySkuId}
          pendingArtwork={pendingSkuArtwork}
          onPendingArtworkChange={onPendingSkuArtworkChange}
          deferArtworkUpload={deferSkuArtworkUpload}
          removedArtworkIds={removedSkuArtworkIds}
          onMarkArtworkForRemoval={onMarkSkuArtworkForRemoval}
          onUnmarkArtworkForRemoval={onUnmarkSkuArtworkForRemoval}
          ensureSkuPersisted={ensureSkuPersisted}
          disabled={readOnly}
        />
        {orderQtyField ? (
          <div className="mt-3">
            <OrderQtyField
              skus={skus}
              value={(fieldValues[orderQtyField.id] as number | null) ?? null}
              onChange={(v) => onFieldValueChange(orderQtyField.id, v)}
              readOnly={readOnly}
            />
          </div>
        ) : null}
      </section>

      {/* Artwork */}
      {artworkBlock ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <header className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Artwork
          </header>
          {artworkBlock}
        </section>
      ) : null}

      {/* Design assignment */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <header className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Design
        </header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${idPrefix}-designer`}>
              Designer
              {designerField?.required ? (
                <span className="ml-0.5 text-red-500">*</span>
              ) : null}
            </Label>
            <Select
              id={`${idPrefix}-designer`}
              value={designerId}
              disabled={readOnly}
              onChange={(e) => onDesignerIdChange(e.target.value)}
            >
              <option value="">
                {designers.length ? "Unassigned" : "No designers on team"}
              </option>
              {designers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-design-task`}>Design task</Label>
            <Input
              id={`${idPrefix}-design-task`}
              readOnly={readOnly}
              value={designTask}
              onChange={(e) => onDesignTaskChange(e.target.value)}
              placeholder="e.g. Prepare proof / prepress"
              className={readOnly ? "bg-slate-50" : undefined}
            />
          </div>
        </div>
      </section>

      {/* Order notes */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <header className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Order Notes
        </header>
        {descriptionBlock}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ProductLineItemSummary — Hayk redesign 2026-07-02 (Doc 01 Bonus)
 * Rich product-spec summary card that appears above the raw SKU editor. Mirrors
 * how the Bazaar admin cart shows a line item so production staff scan the
 * spec line at a glance rather than parsing individual fields.
 *
 * Renders when there's at least one SKU or a Product selected. Shows:
 *   • Thumbnail (product-type icon — swap for uploaded artwork later)
 *   • Product · Material · Size · Finish · N pcs (spec line)
 *   • Files-uploaded count (from sku_key-attached assets)
 * ────────────────────────────────────────────────────────────────────────── */
function ProductLineItemSummary({
  skus,
  printFields,
  fieldValues,
  skuAssetsCount,
}: {
  skus: SkuItem[];
  printFields: CustomField[];
  fieldValues: Record<string, unknown>;
  skuAssetsCount: number;
}) {
  const totalQty = skus.reduce(
    (sum, s) =>
      sum + (typeof s.qty === "number" && !Number.isNaN(s.qty) ? s.qty : 0),
    0
  );
  const byName = (n: string) =>
    printFields.find((f) => f.name.toLowerCase() === n.toLowerCase());
  const val = (name: string): string => {
    const f = byName(name);
    if (!f) return "";
    return String(fieldValues[f.id] ?? "").trim();
  };
  const product = val("Product");
  const material = val("Materials") || val("Material");
  const size = val("Finished Size");
  const finish = val("Finishing");
  const color = val("Color");
  const sides = val("Sides");
  const direction = val("Roll Direction") || val("Direction");

  // Nothing to show if the order has no product AND no SKUs yet.
  if (!product && skus.length === 0) return null;

  const specParts = [
    product,
    material,
    size,
    finish,
    color,
    sides,
    direction && `Dir ${direction}`,
    totalQty > 0 && `${totalQty.toLocaleString()} pcs`,
  ].filter(Boolean);

  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-2xl">
        {product.toLowerCase().includes("pouch")
          ? "🧴"
          : product.toLowerCase().includes("box") ||
              product.toLowerCase().includes("carton")
            ? "📦"
            : product.toLowerCase().includes("label")
              ? "🏷️"
              : product.toLowerCase().includes("sticker")
                ? "✨"
                : product.toLowerCase().includes("card")
                  ? "🪪"
                  : "🖨️"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {product || "Product not set"}
        </p>
        <p className="truncate text-xs text-slate-500">
          {specParts.length > 1
            ? specParts.slice(1).join(" · ")
            : "Add material, size, and quantity to complete the spec"}
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-500">
          {skuAssetsCount === 0
            ? "0 File(s) Uploaded"
            : `${skuAssetsCount} File(s) Uploaded`}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs text-slate-500">
        <div className="font-semibold text-slate-700">
          {skus.length} SKU{skus.length === 1 ? "" : "s"}
        </div>
        {totalQty > 0 ? (
          <div className="text-slate-500">
            {totalQty.toLocaleString()} pcs
          </div>
        ) : null}
      </div>
    </div>
  );
}
