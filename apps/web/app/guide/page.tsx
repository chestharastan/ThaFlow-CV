"use client";

import { Suspense } from "react";
import { Workspace } from "@/components/workspace";

export default function GuidePage() {
  return (
    <Suspense>
      <Workspace mode="guide" />
    </Suspense>
  );
}
