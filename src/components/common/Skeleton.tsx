import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-zinc-200/80 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
};

export const TourismDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pb-24 animate-pulse">
      {/* Top quick navigation strip skeleton */}
      <div className="flex items-center gap-2 overflow-hidden py-1">
        <div className="h-9 w-36 bg-zinc-200 rounded-xl" />
        <div className="h-9 w-40 bg-zinc-200 rounded-xl" />
        <div className="h-9 w-36 bg-zinc-200 rounded-xl" />
        <div className="h-9 w-48 bg-zinc-200 rounded-xl" />
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-zinc-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-zinc-200 rounded" />
              <div className="w-8 h-8 rounded-xl bg-zinc-200" />
            </div>
            <div className="h-7 w-28 bg-zinc-300 rounded" />
            <div className="h-2.5 w-20 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>

      {/* Wallets Strip Skeleton */}
      <div className="bg-zinc-100 rounded-2xl border border-zinc-200 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-4 w-36 bg-zinc-300 rounded" />
          <div className="h-4 w-24 bg-zinc-200 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 bg-white rounded-xl border border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-200" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-20 bg-zinc-300 rounded" />
                  <div className="h-2.5 w-14 bg-zinc-200 rounded" />
                </div>
              </div>
              <div className="h-5 w-16 bg-zinc-300 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Tour Folders Grid Skeleton */}
      <div className="bg-white rounded-3xl p-5 border-2 border-zinc-200 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <div className="h-5 w-44 bg-zinc-300 rounded" />
            <div className="h-3 w-32 bg-zinc-200 rounded" />
          </div>
          <div className="h-4 w-24 bg-zinc-200 rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <div className="h-3 w-16 bg-zinc-200 rounded" />
                <div className="h-3 w-14 bg-zinc-200 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-14 bg-zinc-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-zinc-300 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-200 rounded" />
                </div>
              </div>
              <div className="h-10 bg-zinc-100 rounded-xl" />
              <div className="h-2 bg-zinc-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Inquiries Skeleton */}
      <div className="bg-white rounded-3xl p-5 border-2 border-zinc-200 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-5 w-48 bg-zinc-300 rounded" />
          <div className="h-4 w-28 bg-zinc-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-50 border-2 border-zinc-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-zinc-200 rounded" />
                <div className="h-3 w-14 bg-zinc-200 rounded" />
              </div>
              <div className="h-4 w-32 bg-zinc-300 rounded" />
              <div className="h-12 bg-white rounded-lg border border-zinc-200" />
              <div className="h-8 bg-zinc-200 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const InquiriesSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 pb-24 animate-pulse">
      {/* Counters Strip Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-3 rounded-2xl border-2 border-zinc-200 flex justify-between items-center">
            <div className="space-y-1.5">
              <div className="h-2.5 w-16 bg-zinc-200 rounded" />
              <div className="h-5 w-10 bg-zinc-300 rounded" />
            </div>
            <div className="w-6 h-6 rounded-full bg-zinc-200" />
          </div>
        ))}
      </div>

      {/* Search & Actions Skeleton */}
      <div className="flex items-center justify-between gap-3">
        <div className="h-11 flex-1 bg-white rounded-2xl border-2 border-zinc-200" />
        <div className="h-11 w-36 bg-zinc-300 rounded-2xl" />
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-hidden py-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-7 w-20 bg-zinc-200 rounded-xl" />
        ))}
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <div className="h-3.5 w-16 bg-zinc-200 rounded" />
              <div className="h-3.5 w-14 bg-zinc-200 rounded" />
            </div>
            <div className="h-5 w-3/4 bg-zinc-300 rounded" />
            <div className="h-3.5 w-1/2 bg-zinc-200 rounded" />
            <div className="h-14 bg-zinc-50 rounded-xl border border-zinc-200" />
            <div className="h-16 bg-zinc-50 rounded-xl border border-zinc-200" />
            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <div className="h-8 flex-1 bg-zinc-200 rounded-xl" />
              <div className="h-8 flex-1 bg-zinc-200 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BatchesSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 pb-24 animate-pulse">
      <div className="h-11 bg-white rounded-2xl border-2 border-zinc-200" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <div className="h-3 w-16 bg-zinc-200 rounded" />
              <div className="h-3 w-12 bg-zinc-200 rounded" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-14 bg-zinc-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-zinc-300 rounded" />
                <div className="h-3 w-1/2 bg-zinc-200 rounded" />
              </div>
            </div>
            <div className="h-12 bg-zinc-50 rounded-xl border border-zinc-200" />
            <div className="h-2 bg-zinc-200 rounded-full" />
            <div className="h-4 w-1/3 bg-zinc-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const BookingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 pb-24 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-3 rounded-2xl border-2 border-zinc-200 space-y-2">
            <div className="h-2.5 w-16 bg-zinc-200 rounded" />
            <div className="h-5 w-20 bg-zinc-300 rounded" />
          </div>
        ))}
      </div>
      <div className="h-11 bg-white rounded-2xl border-2 border-zinc-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl border-2 border-zinc-200 p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <div className="h-3 w-16 bg-zinc-200 rounded" />
              <div className="h-3 w-14 bg-zinc-200 rounded" />
            </div>
            <div className="h-5 w-3/4 bg-zinc-300 rounded" />
            <div className="h-3.5 w-1/2 bg-zinc-200 rounded" />
            <div className="h-16 bg-zinc-50 rounded-xl border border-zinc-200" />
            <div className="h-8 bg-zinc-200 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
};
