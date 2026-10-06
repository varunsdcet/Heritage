"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SuperFrame } from "@/components/superadmin/shared";
import { ConfirmDelete } from "../location/shared";
import { SC } from "./directory";
import { Swatch, errMsg, invalidateMeta, json, str, sx, useFlash, type Listing, type Row } from "./kit";

const BASE = "/admin/sysconfig/student-statuses";

/** Student Statuses: two-level hierarchy (e.g. Pre-enrolment Application → CLOA, LOA, …). */
export function StudentStatuses() {
  const router = useRouter();
  const sp = useSearchParams();
  const flash = useFlash(sp?.get("notice"));
  const { ok, fail } = flash;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const load = useCallback(() => {
    sx<Listing>("/e/studentStatuses")
      .then((r) => setRows(r.items))
      .catch((e) => fail(errMsg(e, "Could not load student statuses")));
  }, [fail]);
  useEffect(load, [load]);

  const tree = useMemo(() => {
    const all = rows ?? [];
    const top = all.filter((r) => !r.parent);
    return top.map((p) => ({ row: p, children: all.filter((c) => c.parent === p.id) }));
  }, [rows]);

  async function move(siblings: Row[], id: string, delta: number) {
    const ids = siblings.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    ids.splice(j, 0, ids.splice(i, 1)[0]!);
    try {
      const out = await sx<{ message: string }>("/e/studentStatuses/order", json("PUT", { ids }));
      ok(out.message);
      invalidateMeta();
      load();
    } catch (e) {
      fail(errMsg(e, "Could not save the order"));
    }
  }

  const line = (r: Row, siblings: Row[], i: number, child: boolean) => (
    <tr key={r.id} className={child ? "sx-tree__child" : "sx-tree__parent"}>
      <td className="sx-handle-col">
        <button type="button" className="sx-move" aria-label={`Move ${str(r.name)} up`} disabled={i === 0} onClick={() => void move(siblings, r.id, -1)}>
          ▲
        </button>
        <button type="button" className="sx-move" aria-label={`Move ${str(r.name)} down`} disabled={i === siblings.length - 1} onClick={() => void move(siblings, r.id, 1)}>
          ▼
        </button>
      </td>
      <td>
        <span className={`sx-named${child ? " sx-tree__indent" : ""}`}>
          {child ? <span className="sx-tree__elbow" aria-hidden>└</span> : null}
          <Swatch colour={str(r.colour)} />
          {child ? str(r.name) : <strong>{str(r.name)}</strong>}
          {r.defaultStatus === "Yes" ? <span className="sx-badge sx-badge--blue">Default</span> : null}
        </span>
      </td>
      <td>{str(r.description) || <span className="mh-sa__muted">—</span>}</td>
      <td className="lx-actions">
        {!child ? (
          <Link className="mh-sa__btn mh-sa__btn--sm" href={`${BASE}/new?d.parent=${r.id}`}>
            Add Sub-Status
          </Link>
        ) : null}
        <button type="button" className="mh-sa__btn mh-sa__btn--sm" onClick={() => router.push(`${BASE}/edit?id=${r.id}`)}>
          Edit
        </button>
        <button type="button" className="mh-sa__btn mh-sa__btn--sm mh-sa__btn--danger" onClick={() => setConfirm(r)}>
          Delete
        </button>
      </td>
    </tr>
  );

  return (
    <SuperFrame
      title="Student Statuses"
      breadcrumbs={["Home", SC, "Student Statuses"]}
      activeHref={BASE}
      actions={
        <Link className="mh-sa__btn mh-sa__btn--primary" href={`${BASE}/new`}>
          Add Student Status
        </Link>
      }
    >
      <div className="lx sx">
        {flash.node}
        <section className="mh-sa__card">
          {!rows ? (
            <p className="mh-sa__muted">Loading…</p>
          ) : (
            <div className="mh-sa__table-wrap">
              <table className="mh-sa__table lx-table sx-tree">
                <thead>
                  <tr>
                    <th className="sx-handle-col" aria-label="Order" />
                    <th>Status Name</th>
                    <th>Description</th>
                    <th className="lx-actions" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {tree.flatMap((node, i) => [
                    line(
                      node.row,
                      tree.map((t) => t.row),
                      i,
                      false,
                    ),
                    ...node.children.map((c, j) => line(c, node.children, j, true)),
                  ])}
                  {!tree.length ? (
                    <tr>
                      <td colSpan={4} className="mh-sa__empty-cell">
                        No student statuses have been created yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
          <p className="lx-hint">Statuses are listed in the order shown to staff. Use the arrows to reorder a status within its parent. Renaming a status updates every student and configuration record that uses it.</p>
        </section>
        {confirm ? (
          <ConfirmDelete
            title="Delete student status"
            body={`Delete the status "${str(confirm.name)}"? Statuses with sub-statuses, or that students currently hold, cannot be deleted.`}
            okLabel="Delete"
            onCancel={() => setConfirm(null)}
            onOk={() => {
              const r = confirm;
              setConfirm(null);
              sx<{ message: string }>(`/e/studentStatuses/${r.id}`, { method: "DELETE" })
                .then((out) => {
                  ok(out.message);
                  invalidateMeta();
                  load();
                })
                .catch((e) => fail(errMsg(e, "Delete failed")));
            }}
          />
        ) : null}
      </div>
    </SuperFrame>
  );
}
