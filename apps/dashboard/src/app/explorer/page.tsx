"use client";

import React, { Suspense } from "react";
import { R2BucketNavigator } from "@/components/file-navigator";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Header } from "@/components/header";
function ExplorerContent() {
  // const fileExplorer = useFileExplorer();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mt-6">
        <div className="flex flex-col h-screen">
          <Header />
          <R2BucketNavigator/>
        </div>
      </div>
    </div>);
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mt-6 text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    }>
      <ExplorerContent />
    </Suspense>
  );
}
