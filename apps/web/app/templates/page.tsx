"use client";

import { Suspense } from "react";
import { Gallery } from "@/components/gallery/gallery";

export default function TemplatesPage() {
  return (
    <Suspense>
      <Gallery />
    </Suspense>
  );
}
