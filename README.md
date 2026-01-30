# Alignment Sanity

**The readability of vertical alignment. The cleanliness of zero git diffs.**

[![VS Code](https://img.shields.io/badge/VS%20Code-Compatible-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/)
[![Cursor](https://img.shields.io/badge/Cursor-Compatible-purple)](https://cursor.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

**Alignment Sanity** gives you perfectly aligned code **without polluting your git history**. Using VS Code's decoration API, alignment is rendered purely visually—your files stay exactly as they are on disk.

![Alignment Sanity Demo](images/tutorial.gif)

## The Problem

Vertical alignment makes code easier to scan, but inserting actual spaces causes issues:

- **Noisy Git Diffs:** Changing one variable name forces you to realign 10 other lines.
- **Formatter Conflicts:** Prettier, Black, and other formatters fight against manual alignment.
- **Team Friction:** "To align or not to align" becomes a debate.

## The Solution

Alignment Sanity renders alignment **visually** while keeping your files untouched.

| What You See (Virtual) | What Is Saved (Disk) |
| :--- | :--- |
| `name:    "app"` | `name: "app"` |
| `version: "1.0"` | `version: "1.0"` |
| `debug:   true` | `debug: true` |

**Your git diff:** Clean. Zero changes.

---

## Key Features

- **Zero File Modifications:** Alignment is purely visual. Your git diffs remain pristine.
- **Tree-sitter Powered:** Uses robust AST parsing instead of fragile regex. It understands context, scope, and structure.
- **Smart Grouping:** Only aligns related code (same indentation, same AST context, consecutive lines).
- **Go-Style Rules:**
  - **Colons (`:`)**: Attached to the key; padding added *after* to align values.
  - **Operators (`=`, `&&`, `||`)**: Padding added *before* to align the operators.
- **Multi-Language:** Native support for TypeScript, TSX, JSON, YAML, and Python.

---

## Visual Examples

### JSON / YAML

Values align after the colon, keeping keys distinct.

```json
{
  "name":        "alignment-sanity",
  "version":     "2.9.0",
  "description": "Virtual code alignment"
}
```

### Python

Assignments align cleanly by padding *before* the operator.

```python
passes   = sum(1 for s in results if s == "pass")
warnings = sum(1 for s in results if s == "warn")
fails    = sum(1 for s in results if s == "fail")
```

### TypeScript / TSX

Mixed alignment handles object properties and logical operators intelligently.

```typescript
const classes = [
  isError   && "text-red",    // Operators align
  isWarning && "text-yellow",
  isSuccess && "text-green",
];

const config = {
  name:    "app",             // Values align
  version: "1.0",
  debug:   true,
};
```

---

## Supported Languages & Operators

| Language | Extension | Aligned Operators |
| :--- | :--- | :--- |
| **TypeScript / TSX** | `.ts`, `.tsx` | `=`, `:`, `&&`, `\|\|` |
| **JSON / JSONC** | `.json`, `.jsonc` | `:` |
| **YAML** | `.yaml`, `.yml` | `:` |
| **Python** | `.py` | `=`, `:`, `and`, `or` |
| **CSS / SCSS / Less** | `.css`, `.scss`, `.less` | `:` |

---

## Usage

| Action | Command / Shortcut |
| :--- | :--- |
| **Toggle** | `Cmd+Shift+A` (Mac) / `Ctrl+Shift+A` (Win/Linux) |
| **Enable** | Command Palette → `Alignment Sanity: Enable` |
| **Disable** | Command Palette → `Alignment Sanity: Disable` |

**Status Bar:** Look for the "✓ Align" / "✗ Align" indicator in the bottom right.

---

## Configuration

You can enable or disable alignment for specific languages in your `settings.json`:

```json
{
  "alignmentSanity.enabledLanguages": {
    "typescript": true,
    "typescriptreact": true,
    "json": true,
    "jsonc": true,
    "yaml": true,
    "python": true,
    "css": true,
    "scss": true,
    "less": true
  }
}
```

Set any language to `false` to disable alignment for that language.

---

## Installation

### From VSIX (Releases)

1. Download the `.vsix` file from the [Releases page](https://github.com/zaydek/alignment-sanity/releases).
2. Run the install command:

```bash
# For VS Code
code --install-extension alignment-sanity-*.vsix

# For Cursor
cursor --install-extension alignment-sanity-*.vsix
```

---

## Credits

Inspired by [virtual-better-align](https://github.com/hborchardt/virtual-better-align). Rebuilt from scratch using **Tree-sitter** for reliable, AST-based parsing.

---

<p align="center">
  <strong>Clean diffs. Aligned code. Zero compromises.</strong>
</p>
