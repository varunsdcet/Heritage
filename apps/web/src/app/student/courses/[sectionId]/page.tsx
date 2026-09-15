"use client";

import { StudentCourseDetailView } from "@/components/StudentFunctionalViews";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams<{ sectionId: string }>();
  const sectionId = params?.sectionId ?? "demo";
  return <StudentCourseDetailView sectionId={sectionId} />;
}
