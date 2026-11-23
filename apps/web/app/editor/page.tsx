"use client";

import { Suspense } from "react";
import { Workspace } from "@/components/workspace";

export default function EditorPage() {
  return (
    <Suspense>
      <Workspace />
    </Suspense>
  );
}
