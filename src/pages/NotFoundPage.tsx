import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#091414] text-[#0F2423] dark:text-[#F2F5F3] flex flex-col items-center justify-center px-4 text-center">
      <Logo size="md" showWordmark showTagline />
      <p className="font-mono tabular-nums text-5xl font-bold text-[#0F4C4A] dark:text-[#7ED6B5] mt-8">
        404
      </p>
      <h1 className="font-display text-2xl font-bold mt-2">Page not found</h1>
      <p className="text-sm text-[#4A6361] dark:text-[#9DB6B3] max-w-sm mt-2 leading-relaxed">
        The page you requested does not exist or you do not have permission to view it.
      </p>
      <Link
        to="/"
        className="mt-6 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#0F4C4A] text-[#FAF9F5] hover:bg-[#16605D] dark:bg-[#1F8A72] dark:hover:bg-[#27A085] transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
