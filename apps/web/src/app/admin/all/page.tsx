"use client";

import Link from "next/link";
import { StatusPill } from "@myheritage/ui";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { AdminPageFrame, AdminPageHeader, AdminTableRow, AdminTableShell } from "@/components/AdminPortalChrome";
import { screensForGroup } from "@/lib/screens";

export default function Page() {
  const items = screensForGroup("Admin");
  return (
    <ScreenScaffold
      role="admin"
      title="All Admin screens"
      subtitle={"Figma-synced catalogue · " + items.length + " routes"}
      breadcrumb={["Admin", "All screens"]}
      active="All screens"
      hideChromeHeader
    >
      <AdminPageFrame>
        <AdminPageHeader
          title="All Admin screens"
          subtitle={`Figma-synced catalogue · ${items.length} routes`}
          actions={<StatusPill tone="success">{items.length} screens</StatusPill>}
        />

        <AdminTableShell
          countLabel={`${items.length} routes`}
          columns={["Screen", "ID", "Path", "Open"]}
          columnTemplate="minmax(0, 1.4fr) minmax(100px, 0.6fr) minmax(0, 1.2fr) minmax(72px, 0.4fr)"
        >
          {items.map((s) => (
            <AdminTableRow
              key={s.path}
              cells={[
                <strong key="t">{s.title}</strong>,
                <span key="i" style={{ color: "#5C5F5A", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                  {s.id}
                </span>,
                <span key="p" style={{ color: "#5C5F5A", fontSize: 12 }}>
                  {s.path}
                </span>,
                <Link key="l" href={s.path} className="mh-admin-table__link" style={{ color: "#1B7A3D", fontWeight: 700 }}>
                  Open →
                </Link>,
              ]}
            />
          ))}
        </AdminTableShell>
      </AdminPageFrame>
    </ScreenScaffold>
  );
}
