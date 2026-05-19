import type { JSX } from 'react';
import type { StrategyInfo } from '@/types/gateway';

// Phase 7+ will populate these fields on the Gateway StrategyInfo payload once the
// TFEX integration ships. Declared here so the adapter has a typed contract ready
// (StrategyInfoSchema is intentionally NOT extended yet — Hard Rule #4 mirrors
// the Gateway, not speculative futures).
export interface TFEXFutureFields {
  readonly margin_level?: number;
  readonly contract_expiry?: string;
  readonly position_direction?: 'LONG' | 'SHORT';
}

export interface TFEXAdapterProps {
  readonly strategy: StrategyInfo;
}

export function TFEXAdapter({ strategy }: TFEXAdapterProps): JSX.Element {
  return (
    <section aria-label={`${strategy.name} adapter (TFEX)`} className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-700">{strategy.name}</h2>
        <p className="text-xs text-gray-500">Type: {strategy.type}</p>
      </header>
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">TFEX integration coming soon</p>
      </div>
    </section>
  );
}
