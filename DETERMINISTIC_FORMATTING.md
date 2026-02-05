# Deterministic Formatting Strategy

## The Problem

The format command produces unpredictable results when input has inconsistent whitespace.

### Example: Inconsistent Input

```typescript
const items = [
  { id: 1, name: "Alice" }, // 2 spaces after comma, 2 after colon
  { id: 2, name: "Bob" }, // 1 space after comma, 1 after colon
  { id: 100, name: "Charlie" }, // 1 space after comma, 1 after colon
];
```

The alignment algorithm calculates positions based on where tokens currently are.
Different spacing → different starting positions → unpredictable padding.

---

## The Options

### Option 1: Full Normalization (Council's Recommendation)

**Strategy:** Normalize all whitespace to canonical form, then align.

```typescript
// Step 1: Tokenize
"{ id: 1,  name:  \"Alice\" }," → ["{ id", ":", "1", ",", "name", ":", "\"Alice\"", "},"]

// Step 2: Trim whitespace around tokens
["{ id", ":", "1", ",", "name", ":", "\"Alice\"", "},"]

// Step 3: Rebuild with canonical spacing (1 space after : and ,)
"{ id: 1, name: \"Alice\" },"

// Step 4: Apply alignment padding
"{ id: 1,   name: \"Alice\"   },"
```

**Result:**

```typescript
const items = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 100, name: "Charlie" },
];
```

**Pros:**

- Fully deterministic
- Works regardless of input state
- Idempotent by design

**Cons:**

- Imposes opinions (exactly 1 space after `:` and `,`)
- May conflict with user's preferred style
- More complex implementation

---

### Option 2: Preserve Existing Formatting

**Strategy:** Keep user's spacing, only add padding for alignment.

```typescript
// Input (inconsistent)
{ id: 1,  name:  "Alice" },   // 2 spaces after comma
{ id: 2, name: "Bob" },        // 1 space after comma

// Output (preserves original spacing, adds alignment padding)
{ id: 1,  name:  "Alice"   },   // keeps 2 spaces, adds padding before }
{ id: 2,  name:  "Bob"     },   // adds 1 space after comma to align, adds padding
```

**Pros:**

- Respects user's existing style
- Minimal changes to code

**Cons:**

- Non-deterministic (output depends on input state)
- Running twice may produce different results
- Harder to reason about

---

### Option 3: Normalize Only at Alignment Boundaries

**Strategy:** Only normalize whitespace at the specific points where alignment happens.

```typescript
// Input
{ id: 1,  name:  "Alice" },   // 2 spaces after first comma, 2 after colon
{ id: 2, name: "Bob" },        // 1 space

// Alignment points identified: after "id:", after ","
// Normalize ONLY at those points

// Output
{ id: 1,  name: "Alice"   },   // keeps 2 spaces after first comma, normalizes colon area
{ id: 2,  name: "Bob"     },   // normalizes to match alignment
```

**Pros:**

- Less invasive than full normalization
- Still deterministic for alignment purposes
- Preserves most of user's style

**Cons:**

- Complex to implement correctly
- Partial normalization may look inconsistent

---

### Option 4: Assume Canonical Input (Current Approach)

**Strategy:** Document that deterministic results require pre-formatted code.

```markdown
## Best Results

For deterministic alignment, format your code first:

1. Run Prettier (or your formatter)
2. Then run "Apply Alignment"
```

**Pros:**

- Simplest implementation
- No opinions imposed
- Leverages existing formatter ecosystem

**Cons:**

- Extra step for users
- Doesn't work for languages without formatters (SQL)
- Results vary if user forgets to format first

---

## Council's Final Recommendation

**Use Option 1: Full Normalization (Trim-and-Pad)**

### The Algorithm

```
1. TOKENIZE  → Split line by alignment delimiters (: , = etc.)
2. TRIM      → Strip whitespace from token boundaries
3. MEASURE   → Calculate max widths for each column
4. CONSTRUCT → Rebuild with canonical spacing + alignment padding
```

### Why This Wins

1. **Deterministic:** Same output regardless of input whitespace
2. **Language-agnostic:** Works for SQL, Python, etc. without external formatters
3. **Self-contained:** No dependency on Prettier or other tools
4. **Idempotent:** Running twice produces identical results

### The "Prettier Fight" Warning

> If a user runs your alignment command and then saves (triggering Format-on-Save),
> Prettier will **destroy** the alignment by collapsing multiple spaces to one.

**Mitigation:** Document this. Suggest `// prettier-ignore` for aligned blocks.

---

## Implementation Sketch

```typescript
interface AlignmentAnchor {
  pattern: RegExp;
  canonical: string; // e.g., ": " or ", "
}

const ANCHORS: Record<string, AlignmentAnchor[]> = {
  typescript: [
    { pattern: /:\s*/g, canonical: ": " },
    { pattern: /,\s*/g, canonical: ", " },
    { pattern: /\s*=\s*/g, canonical: " = " },
  ],
  sql: [
    { pattern: /,\s*/g, canonical: ", " },
    { pattern: /\s+AS\s+/gi, canonical: " AS " },
  ],
};

function normalizeForAlignment(line: string, language: string): string {
  const anchors = ANCHORS[language] ?? ANCHORS.default;
  let result = line;
  for (const anchor of anchors) {
    result = result.replace(anchor.pattern, anchor.canonical);
  }
  return result;
}
```

---

## Decision Required

Which approach do you want to implement?

| Option                | Deterministic | Preserves Style | Complexity |
| --------------------- | ------------- | --------------- | ---------- |
| 1. Full Normalization | ✅ Yes        | ❌ No           | Medium     |
| 2. Preserve Existing  | ❌ No         | ✅ Yes          | Low        |
| 3. Boundary-Only      | ✅ Yes        | ⚠️ Partial      | High       |
| 4. Assume Canonical   | ⚠️ Depends    | ✅ Yes          | Low        |

Council recommends **Option 1** but acknowledges the trade-off of imposing opinions.
