import React from 'react';

export const WorkspaceSkeleton: React.FC = () => {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Loading PDF workspace"
      className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14"
    >
      <span className="sr-only">Loading PDF workspace...</span>

      {/* Breadcrumb & Workspace Header Skeleton */}
      <div className="mb-8 sm:mb-10 pb-7 border-b border-[#E2E8F0] animate-pulse motion-reduce:animate-none">
        <div className="h-5 w-32 rounded-md bg-[#F1F5F9] mb-4" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="h-5 w-44 rounded-md bg-[#EFF6FF] mb-3" />
            <div className="h-9 sm:h-11 w-56 sm:w-72 rounded-xl bg-[#E2E8F0]" />
            <div className="mt-3 space-y-2 max-w-2xl">
              <div className="h-4 w-full rounded-md bg-[#F1F5F9]" />
              <div className="h-4 w-3/4 rounded-md bg-[#F1F5F9]" />
            </div>
          </div>

          <div className="h-5 w-44 rounded-md bg-[#F1F5F9] shrink-0" />
        </div>
      </div>

      {/* Main Split Workspace Skeleton (Dropzone + Controls Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-pulse motion-reduce:animate-none">
        {/* Left Column: Dropzone & Preview Queue */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl border-2 border-dashed border-[#E2E8F0] bg-white px-6 py-10 sm:py-12 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] mb-4" />
            <div className="h-5 w-56 sm:w-64 rounded-lg bg-[#E2E8F0] mb-2.5" />
            <div className="h-4 w-64 sm:w-80 rounded-md bg-[#F1F5F9] mb-5" />
            <div className="h-10 w-40 rounded-xl bg-[#EFF6FF]" />
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-12 rounded-xl bg-[#E2E8F0] shrink-0" />
              <div className="space-y-2 flex-1 max-w-xs">
                <div className="h-4 w-4/5 rounded bg-[#E2E8F0]" />
                <div className="h-3.5 w-1/2 rounded bg-[#F1F5F9]" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[#E2E8F0]/70" />
              <div className="w-9 h-9 rounded-xl bg-[#E2E8F0]/70" />
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Primary Action Panel */}
        <aside className="lg:col-span-4 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 rounded-lg bg-[#E2E8F0]" />
            <div className="h-5 w-14 rounded-md bg-[#EFF6FF]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="h-11 rounded-xl bg-white border border-[#E2E8F0]" />
            <div className="h-11 rounded-xl bg-white border border-[#E2E8F0]" />
          </div>

          <div className="space-y-2">
            <div className="h-3.5 w-28 rounded bg-[#E2E8F0]" />
            <div className="h-11 w-full rounded-xl bg-white border border-[#E2E8F0]" />
          </div>

          <div className="pt-2 border-t border-[#E2E8F0] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-[#E2E8F0]" />
              <div className="h-3.5 w-12 rounded bg-[#E2E8F0]" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 rounded bg-[#E2E8F0]" />
              <div className="h-3.5 w-16 rounded bg-[#E2E8F0]" />
            </div>
          </div>

          <div className="h-12 w-full rounded-xl bg-[#2563EB]/15" />
        </aside>
      </div>
    </section>
  );
};
