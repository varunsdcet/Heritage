"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SelfpacedShell } from "@/components/selfpaced/SelfpacedShell";
import { enrollProgram, loadSelfpacedUser } from "@/lib/selfpacedAuth";
import { getSelfpacedProgram } from "@/lib/selfpacedPrograms";

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get("slug") || "";
  const program = getSelfpacedProgram(slug);
  const [hasUser, setHasUser] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sessionId = params.get("session_id");
    const demo = params.get("demo") === "1";
    // Only unlock after Stripe success (session_id) or explicit local demo.
    if (slug && (sessionId || demo)) {
      enrollProgram(slug);
    }
    const user = Boolean(loadSelfpacedUser());
    setHasUser(user);
    setReady(true);
    if (user && slug && (sessionId || demo)) {
      const t = window.setTimeout(() => {
        router.replace("/selfpaced/dashboard");
      }, 900);
      return () => window.clearTimeout(t);
    }
  }, [slug, router, params]);

  const dashHref = "/selfpaced/dashboard";
  const learnHref = program ? `/selfpaced/learn/${program.slug}` : dashHref;

  if (!ready) {
    return (
      <SelfpacedShell>
        <div className="sp-success">
          <p>Confirming…</p>
        </div>
      </SelfpacedShell>
    );
  }

  if (!hasUser) {
    return (
      <SelfpacedShell nextAfterLogin={dashHref}>
        <div className="sp-success">
          <p className="sp-kicker">PAYMENT RECEIVED</p>
          <h1>Almost there</h1>
          <p className="sp-lede">
            Your seat is reserved. Sign in with the same account you used before checkout to open your dashboard.
          </p>
          <Link
            href={`/selfpaced/success?slug=${encodeURIComponent(slug)}&auth=login&next=${encodeURIComponent(dashHref)}`}
            className="sp-btn sp-btn--primary"
          >
            Sign in to open dashboard
          </Link>
        </div>
      </SelfpacedShell>
    );
  }

  return (
    <SelfpacedShell>
      <div className="sp-success">
        <p className="sp-kicker">ENROLLMENT CONFIRMED</p>
        <h1>{program ? program.title : "Your course"} is ready</h1>
        <p className="sp-lede">Payment received. Taking you to your dashboard…</p>
        <div className="sp-hero__cta">
          <Link href={dashHref} className="sp-btn sp-btn--primary">
            Go to dashboard
          </Link>
          <Link href={learnHref} className="sp-btn sp-btn--ghost">
            Start learning
          </Link>
        </div>
      </div>
    </SelfpacedShell>
  );
}

export default function SelfpacedSuccessPage() {
  return (
    <Suspense
      fallback={
        <SelfpacedShell>
          <div className="sp-success">
            <p>Confirming…</p>
          </div>
        </SelfpacedShell>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
