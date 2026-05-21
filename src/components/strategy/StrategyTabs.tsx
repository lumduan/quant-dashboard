import { type JSX, useCallback, useRef } from 'react';

export interface StrategyTabsProps {
  readonly tabs: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  readonly activeTab: string;
  readonly onChange: (tab: string) => void;
}

export function StrategyTabs({ tabs, activeTab, onChange }: StrategyTabsProps): JSX.Element {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowLeft':
          nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          break;
        case 'ArrowRight':
          nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextTab = tabs[nextIndex];
      if (nextTab) {
        tabRefs.current.get(nextTab.id)?.focus();
        onChange(nextTab.id);
      }
    },
    [tabs, onChange],
  );

  return (
    <div role="tablist" className="flex gap-1">
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#2962FF] text-white'
                : 'bg-[#1E222D] text-[#787B86] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
