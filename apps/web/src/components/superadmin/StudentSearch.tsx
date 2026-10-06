"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { errorMessage, qs, saApi, type StudentHit, type StudentSearchOptions } from "@/lib/superAdmin";
import { SaCard, SaField, SaNotice, SuperFrame } from "./shared";

const EMPTY = {
  status: "",
  sisEmail: "",
  lastName: "",
  firstName: "",
  middleName: "",
  preferredName: "",
  dobMonth: "",
  dobDay: "",
  dobYear: "",
  residency: "",
  street: "",
  city: "",
  postal: "",
  phone: "",
  email: "",
  discountCode: "",
  campus: "",
  delivery: "",
  program: "",
  admissionTerm: "",
};

type Filters = typeof EMPTY;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function SuperStudentSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [options, setOptions] = useState<StudentSearchOptions | null>(null);
  const [filters, setFilters] = useState<Filters>(() => {
    const init = { ...EMPTY };
    for (const k of Object.keys(EMPTY) as Array<keyof Filters>) init[k] = params.get(k) ?? "";
    return init;
  });
  const [results, setResults] = useState<{ total: number; items: StudentHit[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quick = params.get("q") ?? "";

  useEffect(() => {
    saApi<StudentSearchOptions>("/students/options")
      .then(setOptions)
      .catch((err) => setError(errorMessage(err, "Could not load search options")));
  }, []);

  const lastQuery = useRef<string | null>(null);

  function runSearch(query: Record<string, string>) {
    const key = qs(query);
    if (key === lastQuery.current) return;
    lastQuery.current = key;
    setBusy(true);
    setError(null);
    saApi<{ total: number; items: StudentHit[] }>(`/students/search${qs(query)}`)
      .then(setResults)
      .catch((err) => setError(errorMessage(err, "Search failed")))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    const query: Record<string, string> = { q: quick };
    for (const k of Object.keys(EMPTY)) query[k] = params.get(k) ?? "";
    if (Object.values(query).some(Boolean)) runSearch(query);
  }, [params, quick]);

  function set<K extends keyof Filters>(k: K, v: string) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    lastQuery.current = null;
    runSearch(filters);
    window.history.replaceState(null, "", `/admin/student-search${qs(filters)}`);
  }

  function onReset() {
    setFilters({ ...EMPTY });
    setResults(null);
    lastQuery.current = null;
    router.replace("/admin/student-search");
  }

  const years = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - 14 - i));

  return (
    <SuperFrame breadcrumbs={["Home", "Students", "Search Results"]} activeHref="/admin/student-search" title="Search Students">
      {error ? <SaNotice tone="error" onClose={() => setError(null)}>{error}</SaNotice> : null}
      {quick ? (
        <p className="mh-sa__muted">
          Quick search for <strong>“{quick}”</strong> (student # or last name).
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mh-sa__stack">
        <SaCard title="Status">
          <div className="mh-sa__grid">
            <SaField label="Status">
              <select className="mh-sa__input" value={filters.status} onChange={(e) => set("status", e.target.value)}>
                <option value="">All Statuses</option>
                {options?.statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </SaField>
            <SaField label="SIS E-mail Address">
              <input className="mh-sa__input" value={filters.sisEmail} onChange={(e) => set("sisEmail", e.target.value)} />
            </SaField>
          </div>
        </SaCard>

        <SaCard title="Name">
          <div className="mh-sa__grid">
            <SaField label="Last Name">
              <input className="mh-sa__input" value={filters.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </SaField>
            <SaField label="First Name">
              <input className="mh-sa__input" value={filters.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </SaField>
            <SaField label="Middle Name">
              <input className="mh-sa__input" value={filters.middleName} onChange={(e) => set("middleName", e.target.value)} />
            </SaField>
            <SaField label="Preferred Name">
              <input className="mh-sa__input" value={filters.preferredName} onChange={(e) => set("preferredName", e.target.value)} />
            </SaField>
            <SaField label="Date of Birth" wide>
              <div className="mh-sa__inline">
                <select className="mh-sa__input" aria-label="Month" value={filters.dobMonth} onChange={(e) => set("dobMonth", e.target.value)}>
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={String(i + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
                <select className="mh-sa__input" aria-label="Day" value={filters.dobDay} onChange={(e) => set("dobDay", e.target.value)}>
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select className="mh-sa__input" aria-label="Year" value={filters.dobYear} onChange={(e) => set("dobYear", e.target.value)}>
                  <option value="">Year</option>
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
            </SaField>
            <SaField label="Domestic / International">
              <select className="mh-sa__input" value={filters.residency} onChange={(e) => set("residency", e.target.value)}>
                <option value="">All</option>
                {options?.residency.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </SaField>
          </div>
        </SaCard>

        <SaCard title="Address">
          <div className="mh-sa__grid">
            <SaField label="Street Address" wide>
              <input className="mh-sa__input" value={filters.street} onChange={(e) => set("street", e.target.value)} />
            </SaField>
            <SaField label="City">
              <input className="mh-sa__input" value={filters.city} onChange={(e) => set("city", e.target.value)} />
            </SaField>
            <SaField label="Postal / ZIP Code">
              <input className="mh-sa__input" value={filters.postal} onChange={(e) => set("postal", e.target.value)} />
            </SaField>
          </div>
        </SaCard>

        <SaCard title="Contact">
          <div className="mh-sa__grid">
            <SaField label="Phone Number">
              <input className="mh-sa__input" type="tel" value={filters.phone} onChange={(e) => set("phone", e.target.value)} />
            </SaField>
            <SaField label="E-mail Address">
              <input className="mh-sa__input" value={filters.email} onChange={(e) => set("email", e.target.value)} />
            </SaField>
          </div>
        </SaCard>

        <SaCard title="Discount">
          <div className="mh-sa__grid">
            <SaField label="Discount Code">
              <input className="mh-sa__input" value={filters.discountCode} onChange={(e) => set("discountCode", e.target.value)} />
            </SaField>
          </div>
        </SaCard>

        <SaCard title="Campus / Program">
          <div className="mh-sa__grid">
            <SaField label="Campus">
              <select className="mh-sa__input" value={filters.campus} onChange={(e) => set("campus", e.target.value)}>
                <option value="">All Campuses</option>
                {options?.campuses.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </SaField>
            <SaField label="Delivery Method">
              <select className="mh-sa__input" value={filters.delivery} onChange={(e) => set("delivery", e.target.value)}>
                <option value="">All</option>
                {options?.deliveryMethods.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </SaField>
            <SaField label="Program" wide>
              <select className="mh-sa__input" value={filters.program} onChange={(e) => set("program", e.target.value)}>
                <option value="">All Programs</option>
                {options?.programs.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </SaField>
            <SaField label="Admission Term">
              <select className="mh-sa__input" value={filters.admissionTerm} onChange={(e) => set("admissionTerm", e.target.value)}>
                <option value="">All</option>
                {options?.admissionTerms.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </SaField>
          </div>
        </SaCard>

        <div className="mh-sa__actions">
          <button type="button" className="mh-sa__btn" onClick={onReset}>
            Reset
          </button>
          <button type="submit" className="mh-sa__btn mh-sa__btn--primary" disabled={busy}>
            {busy ? "Searching…" : "Search Students"}
          </button>
        </div>
      </form>

      {results ? (
        <SaCard title={`Search Results (${results.total.toLocaleString()})`}>
          {results.total > results.items.length ? (
            <p className="mh-sa__muted">Showing the first {results.items.length} matches — refine your filters to narrow the list.</p>
          ) : null}
          <div className="mh-sa__table-wrap">
            <table className="mh-sa__table">
              <thead>
                <tr>
                  <th>Student #</th>
                  <th>Name</th>
                  <th>SIS E-mail</th>
                  <th>Program</th>
                  <th>Campus</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.items.length ? (
                  results.items.map((s) => (
                    <tr key={s.studentId}>
                      <td>
                        <Link href={`/admin/f/rg-01-student-360?student=${encodeURIComponent(s.studentNumber)}`}>{s.studentNumber}</Link>
                      </td>
                      <td>
                        {s.name}
                        {s.preferredName ? <span className="mh-sa__muted"> ({s.preferredName})</span> : null}
                      </td>
                      <td>{s.sisEmail}</td>
                      <td>{s.program}</td>
                      <td>{s.campus ?? "—"}</td>
                      <td>
                        <span className="mh-sa__pill">{s.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="mh-sa__empty-cell">
                      No students matched your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SaCard>
      ) : null}
    </SuperFrame>
  );
}
