interface Tab<T extends string> {
  value: T;
  label: string;
}

interface TabSwitcherProps<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function TabSwitcher<T extends string>({
  tabs,
  value,
  onChange,
  className = "",
  size = "md",
}: TabSwitcherProps<T>) {
  const py = size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm";
  return (
    <div className={`flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`flex-1 rounded-lg ${py} font-medium transition-all ${
            value === tab.value
              ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
