import type { JSX } from 'react';
import { useParams } from 'react-router-dom';

export function StrategyPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  return <h1 className="text-xl font-bold">Strategy: {id ?? ''}</h1>;
}
