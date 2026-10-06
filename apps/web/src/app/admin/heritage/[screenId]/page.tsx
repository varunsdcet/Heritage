"use client";

import { Suspense, use } from "react";
import { HeritageScreenPage } from "@/components/heritage/HeritageScreen";

export default function Page({ params }: { params: Promise<{ screenId: string }> }) {
  const { screenId } = use(params);
  return (
    <Suspense fallback={null}>
      <HeritageScreenPage key={screenId} screenId={screenId} />
    </Suspense>
  );
}
