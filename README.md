# Ben’s Kinopio userscript

A userscript for experimenting with Kinopio interactions

## Main features:

### Keyboard shortcuts

- Hide UI chrome with keyboard shortcut `d` (useful for presentations)
- 'l' to toggle viewing cards as a list (wonky because of perf optimization)

### Auto-resizing lists

Boxes with a background fill have an auto-tidying list behavior.

- Cards inside are auto-aligned.
- You can rearrange cards by dragging.
- Box will resize according to contents (enlarges/contracts if you add/remove cards).
- If you select cards and drag them in, your cards will be inserted at the point that you drop them.
- Dragging out, removing cards should cause list to tidy.

### Auto-expanding boxes

Boxes with an empty background have an auto-expand behavior.

- When cards get near the box boundaries, the box will expand in that direction.
- This happens when you create or drag cards near the boundaries.
- It only grows—does not contract.

### New cards

When you create a new card by hitting Enter on an existing card, the new card now inherits
the size of the existing card.

### Fixes

- Fixes cursor when resizing boxes (https://club.kinopio.club/t/boxes-resize-cursor-should-be-nwse-cursor/1004)
