

# UX Improvements: AI Panel Text Readability, Resize, and Fullscreen

## Summary
Enhance the AI suggestions panel in `MonthlyReportAIPanel.tsx` with larger fonts, vertically resizable text areas, and an improved fullscreen dialog. The parent dialog in `MonthlyReportsReviewManagement.tsx` is already correctly structured (flex-col, scrollable body, sticky footer) and needs no changes.

## Changes

### File: `src/components/dashboard/MonthlyReportAIPanel.tsx`

#### A. Make AI text area resizable with larger font (inline results)

Replace the current `ScrollArea` + inner div pattern with a plain `div` that supports vertical resize:

**Current (line 154-157):**
```tsx
<ScrollArea className={maxH}>
  <div className="text-xs ... p-3 bg-background rounded border">
    {text}
  </div>
</ScrollArea>
```

**New:**
```tsx
<div
  className="resize-y overflow-auto min-h-[180px] max-h-[480px] rounded-md border
             bg-background p-4 text-[15px] leading-relaxed
             whitespace-pre-wrap break-words text-foreground/80"
  style={{ resize: 'vertical' }}
>
  {text}
</div>
```

Key differences:
- Font bumped from `text-xs` (12px) to `text-[15px]` (15px)
- `leading-relaxed` for comfortable line-height (1.625)
- `resize-y` + inline `style={{ resize: 'vertical' }}` for vertical resizing
- `min-h-[180px]` / `max-h-[480px]` to keep it bounded
- `overflow-auto` for internal scroll
- Removes `ScrollArea` wrapper (unnecessary with native overflow)

#### B. Improve fullscreen dialog text

**Current (line 200):**
```tsx
<div className="text-sm sm:text-xs ... p-4 ...">
```

**New:**
```tsx
<div className="text-base leading-relaxed whitespace-pre-wrap break-words
               text-foreground/80 p-6 bg-muted/50 rounded border min-h-[200px]">
```

Key differences:
- Font changed from `text-sm sm:text-xs` to `text-base` (16px) everywhere
- Padding increased to `p-6`
- Consistent `leading-relaxed`

#### C. Slightly enlarge action button labels for better touch targets

Bump the inline result action buttons from `h-6` to `h-7` and icon sizes from `h-3 w-3` to `h-3.5 w-3.5` for better accessibility.

## What stays the same

- The parent dialog (`MonthlyReportsReviewManagement.tsx` line 735) already has the correct flex-col layout with pinned header/footer and scrollable body -- no changes needed.
- The fullscreen dialog structure (flex-col, shrink-0 header/footer, scrollable body) stays the same.
- All four analysis types (summary, risks, indicators, opinion) get the same improvements.
- All existing functionality (copy, insert, expand, analyze) is preserved.

## Technical notes

- `resize-y` is a standard CSS property supported in all modern browsers. On mobile, it may not show a drag handle, but the content remains scrollable. The `style={{ resize: 'vertical' }}` is added as a fallback.
- Removing `ScrollArea` (Radix) in favor of native `overflow-auto` simplifies the DOM and makes `resize` work correctly (Radix ScrollArea wraps content in a viewport div that interferes with CSS resize).

