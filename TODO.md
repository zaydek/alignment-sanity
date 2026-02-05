# TODO

## Document Commands & Shortcuts

The README is missing documentation for some commands. Update the Usage section to include all available commands:

### Commands in `package.json` (need to verify these are all documented):

| Command                             | Title            | Keybinding                     | Documented? |
| ----------------------------------- | ---------------- | ------------------------------ | ----------- |
| `even-better-virtual-align.toggle`  | Toggle           | `Cmd+Shift+A` / `Ctrl+Shift+A` | ✓ Yes       |
| `even-better-virtual-align.enable`  | Enable           | -                              | ✓ Yes       |
| `even-better-virtual-align.disable` | Disable          | -                              | ✓ Yes       |
| `even-better-virtual-align.format`  | Apply Formatting | -                              | ✗ **NO**    |

### Action Items

1. **Document the "Apply Formatting" command** - This command actually writes the virtual alignment to the file (makes it permanent). The README doesn't mention this exists.

2. **Consider adding a keybinding for format** - Currently only toggle has a keybinding.

3. **Clarify the difference between virtual alignment and formatting** - Users should understand:
   - Virtual alignment = visual only, no file changes
   - Apply Formatting = writes alignment to file permanently

### Notes for future agent

- Check `package.json` under `contributes.commands` and `contributes.keybindings` for the source of truth
- Test each command to verify behavior before documenting
- The format command behavior may need investigation - does it format selection? whole file? only aligned groups?
