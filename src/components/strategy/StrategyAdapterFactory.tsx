import type { ComponentType, JSX } from 'react';
import { CSMSetAdapter } from '@/components/strategy/CSMSetAdapter';
import { DefaultAdapter } from '@/components/strategy/DefaultAdapter';
import { TFEXAdapter } from '@/components/strategy/TFEXAdapter';
import type { StrategyInfo } from '@/types/gateway';

export interface StrategyAdapterProps {
  readonly strategy: StrategyInfo;
}

// O(1) lookup (Vercel js-set-map-lookups). Adding a new strategy type is a one-line
// change here — no switch/if-else; unknown types fall through to DefaultAdapter
// via the `??` below.
const ADAPTER_MAP: Readonly<Record<string, ComponentType<StrategyAdapterProps>>> = {
  EQUITY_MOMENTUM: CSMSetAdapter,
  TFEX_FUTURES: TFEXAdapter,
};

export function StrategyAdapterFactory({ strategy }: StrategyAdapterProps): JSX.Element {
  const Adapter = ADAPTER_MAP[strategy.type] ?? DefaultAdapter;
  return <Adapter strategy={strategy} />;
}
