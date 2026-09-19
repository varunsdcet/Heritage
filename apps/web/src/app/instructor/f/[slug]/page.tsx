"use client";

import { LiveScreen } from "@/components/LiveScreen";
import { useParams } from "next/navigation";

/** Fallback so instructor SIS screens are reachable even if a dedicated folder is missing. */
export default function InstructorFigmaSlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();
  return <LiveScreen path={`/instructor/f/${slug}`} />;
}
