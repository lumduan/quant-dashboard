---
title: Use startTransition for Non-Urgent Updates
impact: MEDIUM
impactDescription: keeps UI responsive during expensive updates
tags: rerender, transitions, concurrent, UX
---

## Use startTransition for Non-Urgent Updates

Wrap non-urgent state updates in `startTransition` to keep the UI responsive. React 19's concurrent features let urgent updates (typing, clicks) interrupt and defer lower-priority renders.

**Incorrect (typing lags while filtering):**

```tsx
function SearchList({ items }: SearchListProps) {
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState(items)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setQuery(next)
    setFiltered(items.filter(i => i.name.includes(next))) // blocks input
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      <Results items={filtered} />
    </>
  )
}
```

**Correct (input stays responsive):**

```tsx
function SearchList({ items }: SearchListProps) {
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState(items)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setQuery(next) // urgent: update the input immediately
    startTransition(() => {
      setFiltered(items.filter(i => i.name.includes(next))) // non-urgent
    })
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <Results items={filtered} />}
    </>
  )
}
```

The input re-renders synchronously. The filtered list renders when React has idle time, and can be interrupted by the next keystroke.
