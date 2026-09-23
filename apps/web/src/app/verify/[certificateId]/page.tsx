"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { SelfpacedShell } from "@/components/selfpaced/SelfpacedShell";
import { getSelfpacedProgram } from "@/lib/selfpacedPrograms";

/**
 * Public certificate verification. In the client prototype, verification uses
 * the query string issued on the certificate page; production will hit GET /verify/:id.
 */
function VerifyInner() {
  const params = useParams<{ certificateId: string }>();
  const search = useSearchParams();
  const id = params.certificateId || "";
  const slug = search.get("slug") || "";
  const name = search.get("name") || "Learner";
  const issued = search.get("issued") || "";
  const program = useMemo(() => (slug ? getSelfpacedProgram(slug) : undefined), [slug]);
  const valid = Boolean(id && slug && program);

  return (
    <SelfpacedShell>
      <div className="sp-verify">
        <p className="sp-kicker">CERTIFICATE VERIFICATION</p>
        <h1>{valid ? "Certificate verified" : "Certificate not found"}</h1>
        {valid ? (
          <>
            <p className="sp-lede">
              <strong>{id}</strong> was issued for {name} · {program?.title}
              {issued ? ` · ${new Date(issued).toLocaleDateString("en-CA")}` : ""}
            </p>
            <p className="sp-tuition__note">
              This public page confirms the certificate ID format and programme binding. Heritage staff can audit the
              full student record in Campus OS.
            </p>
            <Link href={`/selfpaced/programs/${slug}`} className="sp-btn sp-btn--primary">
              View programme
            </Link>
          </>
        ) : (
          <>
            <p className="sp-lede">We could not verify that certificate ID.</p>
            <Link href="/selfpaced" className="sp-btn sp-btn--primary">
              Heritage eLearning
            </Link>
          </>
        )}
      </div>
    </SelfpacedShell>
  );
}

export default function VerifyCertificatePage() {
  return (
    <Suspense
      fallback={
        <SelfpacedShell>
          <div className="sp-verify">
            <p>Checking certificate…</p>
          </div>
        </SelfpacedShell>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
