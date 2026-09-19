"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminSisScreen } from "@/components/AdminSisScreen";

function Instructor360Inner() {
  const sp = useSearchParams();
  const email = sp.get("email");
  const path = email
    ? `/admin/f/ac-14-faculty-360?email=${encodeURIComponent(email)}`
    : "/admin/f/ac-14-faculty-360";
  return <AdminSisScreen path={path} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p style={{ padding: 32 }}>Loading instructor…</p>}>
      <Instructor360Inner />
    </Suspense>
  );
}
