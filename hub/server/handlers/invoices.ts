import { gate } from "../lib/auth.js";
import { crmJson, guard, mapContact } from "../lib/crm.js";
import {
  altBody,
  altQuery,
  businessName,
  getPlatformInvoice,
  ID,
  invoiceToPlatform,
  mapInvoice,
  validateInvoiceDraft,
  validateInvoiceEdit,
} from "../lib/crm-extended.js";
import type { InvoiceDraft } from "../lib/crm-extended.js";
import { intParam, jsonError, jsonOk, readJson } from "../lib/http.js";

const PAGE = 20;

// GET /api/invoices?contactId= or ?all=1&page= -> { invoices } in the Hub Invoice shape.
// Proven in Dev: GET /invoices/ list (step21), draft create, read, update, delete (step21 and step22).
export async function GET(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const url = new URL(request.url);
    const contactId = url.searchParams.get("contactId") ?? "";
    const all = url.searchParams.get("all") === "1";
    if (contactId && !ID.test(contactId)) return jsonError(400, "Bad contactId");
    if (!contactId && !all) return jsonError(400, "contactId or all=1 is required");
    const page = intParam(url, "page", 1);
    let path = "/invoices/?" + altQuery() + "&limit=" + PAGE + "&offset=" + (page - 1) * PAGE;
    if (contactId) path += "&contactId=" + contactId;
    const j = await crmJson(path);
    const list = (j.invoices ?? j.data ?? []) as Record<string, unknown>[];
    return jsonOk({
      invoices: list.map((i) => mapInvoice(i)),
      page,
      pageSize: PAGE,
      total: Number(j.total ?? list.length),
    });
  });
}

// POST /api/invoices { Invoice draft } -> 201 { invoice }. Creates a DRAFT only; nothing is sent (see invoices-send.ts).
// Needs contactId, jobId and items. Field mapping and what is lost: see invoiceToPlatform in lib/crm-extended.ts.
export async function POST(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const bad = validateInvoiceDraft(b);
    if (bad) return jsonError(400, bad);
    const contactId = String(b.contactId);
    const c = ((await crmJson("/contacts/" + contactId)).contact ?? null) as Record<
      string,
      unknown
    > | null;
    if (!c) return jsonError(404, "Not found");
    const hubContact = mapContact(c);
    const draft = b as unknown as InvoiceDraft;
    const body = invoiceToPlatform(
      {
        ...draft,
        items: (b.items as Record<string, unknown>[]).map((i) => ({
          description: String(i.description).trim(),
          qty: Number(i.qty),
          unit: String(i.unit ?? "each"),
          unitPrice: Number(i.unitPrice),
          gst: i.gst === true,
        })),
        discount: Number(b.discount ?? 0),
        notes: String(b.notes ?? ""),
      },
      { id: contactId, name: hubContact.name || "Customer", email: hubContact.email },
      businessName(),
      new Date().toISOString().slice(0, 10),
    );
    Object.assign(body, altBody());
    const j = await crmJson("/invoices/", { method: "POST", body: JSON.stringify(body) });
    const created = (j.invoice ?? j) as Record<string, unknown>;
    return jsonOk({ invoice: mapInvoice(created) }, 201);
  });
}

// PUT /api/invoices?id= { items?, discount?, issueDate?, dueDate?, notes?, contactId? } -> { invoice }. DRAFTS ONLY (409 otherwise).
// The platform PUT replaces the whole invoice, so: read it, merge the changes into the Hub shape, rebuild the full body
// with the same GST-baked mapping as create (invoiceToPlatform), and send it with the lines under invoiceItems.
export async function PUT(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!ID.test(id)) return jsonError(400, "Bad id");
    const b = await readJson(request);
    if (!b) return jsonError(400, "Bad request");
    const bad = validateInvoiceEdit(b);
    if (bad) return jsonError(400, bad);
    const inv = await getPlatformInvoice(id);
    if (String(inv.status ?? "") !== "draft") return jsonError(409, "Only drafts can be edited");
    const cur = mapInvoice(inv);
    let contact = {
      id: String(inv.contactDetails?.id ?? cur.contactId ?? ""),
      name: String(inv.contactDetails?.name ?? "Customer"),
      email: String(inv.contactDetails?.email ?? ""),
    };
    if (b.contactId !== undefined && String(b.contactId) !== contact.id) {
      const c = ((await crmJson("/contacts/" + String(b.contactId))).contact ?? null) as Record<
        string,
        unknown
      > | null;
      if (!c) return jsonError(404, "Not found");
      const hc = mapContact(c);
      contact = { id: String(b.contactId), name: hc.name || "Customer", email: hc.email };
    }
    const items =
      b.items === undefined
        ? cur.items.map((i) => ({
            description: i.description,
            qty: i.qty,
            unit: i.unit,
            unitPrice: i.unitPrice,
            gst: i.gst,
          }))
        : (b.items as Record<string, unknown>[]).map((i) => ({
            description: String(i.description).trim(),
            qty: Number(i.qty),
            unit: String(i.unit ?? "each"),
            unitPrice: Number(i.unitPrice),
            gst: i.gst === true,
          }));
    const issueDate = b.issueDate ? String(b.issueDate).slice(0, 10) : cur.issueDate;
    const merged: InvoiceDraft = {
      contactId: contact.id,
      jobId: cur.jobId,
      kind: cur.kind,
      items,
      discount: b.discount === undefined ? cur.discount : Number(b.discount),
      issueDate,
      dueDate: b.dueDate ? String(b.dueDate).slice(0, 10) : cur.dueDate || issueDate,
      notes: b.notes === undefined ? cur.notes : String(b.notes),
      ...(cur.quoteId ? { quoteId: cur.quoteId } : {}),
    };
    const body = invoiceToPlatform(merged, contact, businessName(), issueDate);
    body.invoiceItems = body.items;
    delete body.items;
    if (inv.businessDetails) body.businessDetails = inv.businessDetails;
    if (inv.invoiceNumber) body.invoiceNumber = inv.invoiceNumber;
    body.contactId = contact.id;
    Object.assign(body, altBody());
    await crmJson("/invoices/" + id, { method: "PUT", body: JSON.stringify(body) });
    return jsonOk({ invoice: mapInvoice(await getPlatformInvoice(id)) });
  });
}

// DELETE /api/invoices?id= -> { ok: true }. DRAFTS ONLY (409 otherwise; sent invoices are voided, paid ones cannot go).
export async function DELETE(request: Request): Promise<Response> {
  const denied = await gate(request);
  if (denied) return denied;
  return guard(async () => {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!ID.test(id)) return jsonError(400, "Bad id");
    const inv = await getPlatformInvoice(id);
    if (String(inv.status ?? "") !== "draft") return jsonError(409, "Only drafts can be deleted");
    await crmJson("/invoices/" + id + "?" + altQuery(), { method: "DELETE" });
    return jsonOk({ ok: true });
  });
}
