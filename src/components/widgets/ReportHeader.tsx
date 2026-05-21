import type { JSX } from 'react';
import { StrategyTabs } from '@/components/strategy/StrategyTabs';
import { PrintButton } from '@/components/widgets/PrintButton';

export interface ReportHeaderProps {
  readonly strategyName: string;
  readonly activeTab: string;
  readonly onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'report', label: 'Report' },
  { id: 'trades', label: 'List of Trades' },
] as const;

export function ReportHeader({
  strategyName,
  activeTab,
  onTabChange,
}: ReportHeaderProps): JSX.Element {
  return (
    <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 bg-[#131722] px-6 pb-4 pt-4" data-no-print>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{strategyName}</h1>
        <PrintButton />
      </div>
      <div className="mt-3">
        <StrategyTabs tabs={TABS} activeTab={activeTab} onChange={onTabChange} />
      </div>
    </div>
  );
}
