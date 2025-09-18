"use client";

import React, { Suspense } from "react";
import { R2BucketNavigator } from "@/components/file-navigator";
import { Header } from "@/components/header";


export default function ExplorerPage() {
  return (
    <div className="p-6 pt-12 max-w-3xl mx-auto flex flex-col h-screen">
      <Suspense fallback={<div className="animate-pulse text-center">Loading...</div>}>
        <Header />
        <R2BucketNavigator />
      </Suspense>
    </div>
  );
}
