

# Fix: Overflow Issues in MonthlyReportAIPanel Parent Containers

## Issues Found

### 1. Parent Review Dialog uses flat scroll (line 735)
The parent `DialogContent` at line 735 of `MonthlyReportsReviewManagement.tsx` uses:
```
className="max-w-2xl max-h-[90vh] overflow-y-auto"
```
This makes the **entire dialog** one big scroll container. The AI panel's "sticky" action bars (`sticky top-0`) stick to this outer scroll ancestor, not within the AI results card -- so they don't behave as intended when the user scrolls within results.

### 2. Default DialogContent uses `grid` layout
The base `DialogContent` component applies `grid` by default. The fullscreen dialog in `MonthlyReportAIPanel` overrides with `flex flex-col`, which is correct. But the parent review dialog doesn't use flex, so there's no `min-height: 0` flex child to constrain growth.

### 3. AI Panel fullscreen dialog is correct
The expanded dialog (line 169-210) already has proper structure: `flex flex-col`, `shrink-0` on header/footer, `flex-1 min-h-0 overflow-y-auto` on body. No changes needed here.

## Plan

### File: `src/components/dashboard/MonthlyReportsReviewManagement.tsx`

**Change the parent Review Dialog (line 735)** from a flat scrolling container to a flex-column layout with a dedicated scrollable body:

- **DialogContent**: Change from `overflow-y-auto` to `flex flex-col overflow-hidden` (prevent dialog itself from scrolling)
- **Wrap the body content** (lines 744-806, between DialogHeader and DialogFooter) in a `<div className="flex-1 min-h-0 overflow-y-auto px-1">` so only the body scrolls
- **DialogHeader and DialogFooter**: Add `shrink-0` to prevent them from shrinking
- Remove `p-6` override: use `p-0 gap-0` on DialogContent, add padding to header/body/footer individually (matching the fullscreen dialog pattern)

This ensures:
- The header ("Avaliar Relatorio Mensal") and footer buttons (Cancelar / Devolver / Aprovar) stay pinned
- Only the middle section scrolls
- The AI panel's sticky bars work correctly within the scrollable area

### File: `src/components/dashboard/MonthlyReportAIPanel.tsx`

No changes needed -- the component itself is correctly structured after the previous fix. The issue was entirely in the parent container.

## Technical Details

**Before (line 735):**
```tsx
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
```

**After:**
```tsx
<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
  <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
    ...
  </DialogHeader>
  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
    {/* all body content: report info, buttons, AI panel, feedback textarea */}
  </div>
  <DialogFooter className="px-6 pb-6 pt-3 border-t shrink-0 gap-2 sm:gap-0">
    ...
  </DialogFooter>
</DialogContent>
```

This follows the same proven pattern already used in the AI panel's fullscreen dialog.

