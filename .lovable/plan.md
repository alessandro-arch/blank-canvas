
# Fix: "Rascunho de parecer" scroll + fullscreen viewer

## What's wrong
The AI suggestions panel (`MonthlyReportAIPanel`) renders results with `ScrollArea className="max-h-48"` -- only 192px of visible content. When the "Rascunho de parecer" (opinion draft) is long, the content is clipped and hard to read. The panel sits inside a review Dialog that can itself overflow.

## What we'll do

### 1. Increase scroll area height per result type
- Change `max-h-48` (192px) to `max-h-64` (256px) for most types
- For `opinion` type specifically, use `max-h-80` (320px) to give drafts more room

### 2. Add "Expandir" (fullscreen) button per result
- Add an `Expand` (Maximize2) icon button next to Copy and "Inserir no parecer"
- Clicking it opens a dedicated fullscreen Dialog showing the full text

### 3. Fullscreen Dialog
- New state: `expandedType` tracks which result is expanded (or null)
- Dialog uses `max-w-4xl h-[90vh]` with flex layout
- Header: title + actions (Copy, Insert, Close)
- Body: scrollable text area filling remaining height
- Mobile: text bumped to `text-sm` (14px) for readability

### 4. Sticky actions bar
- Move the action buttons (Copy, Insert, Expand) into a sticky header within each result block so they remain accessible while scrolling

## Technical changes

**File: `src/components/dashboard/MonthlyReportAIPanel.tsx`**
- Add state `expandedType: AnalysisType | null`
- Import `Maximize2` icon, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from shadcn
- For each result block:
  - Make the actions bar sticky: `sticky top-0 z-10 bg-inherit`
  - Add Expand button
  - Increase `ScrollArea` max-height (conditionally larger for `opinion`)
- Add a fullscreen `Dialog` at the bottom of the component:
  - `max-w-4xl max-h-[90vh]` with internal scroll
  - Shows the expanded text with actions
  - `text-sm` on mobile for readability
