import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

export function LoadingState({
  label = 'Loading scientific data...',
  rows = 4,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-[#E3E1D8] dark:border-[#1C3432] bg-white dark:bg-[#0F1F1E] p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-4 h-4 rounded-full border-2 border-[#0F4C4A] dark:border-[#7ED6B5] border-t-transparent animate-spin" />
        <span className="text-sm font-medium text-[#4A6361] dark:text-[#9DB6B3]">{label}</span>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-md bg-[#F2F1EA] dark:bg-[#152928] animate-pulse"
            style={{ width: `${96 - i * 8}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#D1CFC5] dark:border-[#254240] bg-white/70 dark:bg-[#0F1F1E]/70 px-6 py-12 text-center">
      <Inbox className="w-8 h-8 mx-auto text-[#4A6361] dark:text-[#7ED6B5]/70 mb-3" />
      <h3 className="font-display text-base font-semibold text-[#0F2423] dark:text-[#FAF9F5]">
        {title}
      </h3>
      <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] max-w-md mx-auto mt-1.5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Unable to load section',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-[#E8725A]/50 bg-[#E8725A]/5 dark:bg-[#E8725A]/10 p-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#E8725A] shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-display text-sm font-semibold text-[#0F2423] dark:text-[#FAF9F5]">
            {title}
          </h3>
          <p className="text-sm text-[#4A6361] dark:text-[#CBD9D7] mt-1 leading-relaxed">
            {message}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#E8725A]/50 text-[#0F2423] dark:text-[#FAF9F5] hover:bg-[#E8725A]/15 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
