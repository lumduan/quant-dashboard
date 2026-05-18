// The ONLY barrel file in the project. Exists exclusively to centralize React.lazy()
// wrappers so every consumer suspends identically and Recharts ships in a chunk
// separate from the main bundle (Vercel bundle-dynamic-imports).
import { lazy } from 'react';

export const EquityCurveChart = lazy(() => import('./EquityCurveChart'));
export const DrawdownChart = lazy(() => import('./DrawdownChart'));
export const MultiStrategyChart = lazy(() => import('./MultiStrategyChart'));
