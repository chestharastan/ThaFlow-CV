"use client";

import { Suspense } from "react";
import { CreateFlow } from "@/components/create/flow";

export default function CreatePage() {
  return (
    <Suspense>
      <CreateFlow />
    </Suspense>
  );
}
