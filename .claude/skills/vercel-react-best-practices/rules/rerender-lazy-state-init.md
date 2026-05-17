---
title: Lazy State Initialization
impact: MEDIUM
impactDescription: avoids recomputing on every render
tags: rerender, useState, initialization, performance
---

## Lazy State Initialization

Pass a function to `useState` for expensive initial values. Otherwise the expression runs on every render, even though the result is only used on the first one.

**Incorrect (runs on every render):**

```tsx
function FilteredList({ items }: FilteredListProps) {
  const [filtered, setFiltered] = useState(items.filter(expensivePredicate))
  // expensivePredicate runs on every render, result is thrown away after first
  // ...
}
```

**Correct (runs once):**

```tsx
function FilteredList({ items }: FilteredListProps) {
  const [filtered, setFiltered] = useState(() => items.filter(expensivePredicate))
  // expensivePredicate runs only on mount
  // ...
}
```

Also applies to `useRef`, `useReducer`, and any hook with an initializer pattern.
