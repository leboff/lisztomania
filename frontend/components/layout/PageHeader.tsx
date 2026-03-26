"use client";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

export function PageHeader({ title, showBack = false, action }: PageHeaderProps) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 px-4 backdrop-blur-sm no-print">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Go back"
        >
          <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}
      <h1 className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
      {action && <div>{action}</div>}
    </header>
  );
}
