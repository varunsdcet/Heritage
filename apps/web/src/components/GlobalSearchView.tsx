"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, EmptyState, Panel } from "@myheritage/ui";
import { api, loadSession } from "@/lib/api";
import { ScreenScaffold } from "@/components/ScreenScaffold";

type SearchItem = { id: string; label: string; sub?: string; href?: string };
type SearchGroup = { type: string; items: SearchItem[] };

export function GlobalSearchView({ role }: { role: "admin" | "student" | "instructor" | "applicant" | "employer" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    const session = loadSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ groups: SearchGroup[] }>(
        `/search?q=${encodeURIComponent(query.trim())}`,
        {},
        session.accessToken,
      );
      setGroups(result.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  const crumb =
    role === "admin"
      ? ["Admin", "Search"]
      : role === "instructor"
        ? ["Instructor", "Search"]
        : role === "applicant"
          ? ["Applicant", "Search"]
          : role === "employer"
            ? ["Employer", "Search"]
            : ["Student", "Search"];

  return (
    <ScreenScaffold
      role={role}
      title="Global search"
      subtitle="Find people, courses, applications, placements, and campus records"
      active="Search"
      breadcrumb={crumb}
    >
      <Panel>
        <form onSubmit={onSearch} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "Marcus", "CS301", "Nursing"…'
            aria-label="Search"
            style={{
              flex: "1 1 240px",
              minHeight: 40,
              border: "1px solid var(--mh-border)",
              borderRadius: 8,
              padding: "0 12px",
            }}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Searching…" : "Search"}
          </Button>
        </form>
        {error ? <Banner>{error}</Banner> : null}
        {!groups.length ? (
          <EmptyState title="No results yet" body="Run a search to see live campus matches." />
        ) : (
          groups.map((group) => (
            <div key={group.type} style={{ marginTop: 16 }}>
              <h3 style={{ textTransform: "capitalize", marginBottom: 8 }}>{group.type}</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.href && router.push(item.href)}
                    style={{
                      textAlign: "left",
                      border: "1px solid var(--mh-border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      background: "var(--mh-surface)",
                      cursor: item.href ? "pointer" : "default",
                    }}
                  >
                    <strong>{item.label}</strong>
                    {item.sub ? <div style={{ color: "var(--mh-text-muted)", fontSize: 13 }}>{item.sub}</div> : null}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </Panel>
    </ScreenScaffold>
  );
}
