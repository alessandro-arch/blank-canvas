

# Fix: "WinAnsi cannot encode" error in PDF generation

## Problem

The `generate-thematic-project-pdf` edge function uses `StandardFonts.Helvetica` (WinAnsi encoding only). When any data field contains characters outside WinAnsi range (like the checkmark U+2713, accented chars not in WinAnsi, emojis, etc.), `pdf-lib` throws an error and the PDF fails to generate.

This affects all profiles (Admin, Manager, Auditor) because the issue is in the Edge Function, not in frontend permissions.

## Solution

Add a text sanitization function in the edge function that replaces or removes non-WinAnsi characters before passing them to `page.drawText()`.

### File: `supabase/functions/generate-thematic-project-pdf/index.ts`

1. Add a `sanitize()` helper function near the top of `buildConsolidatedPdf` that:
   - Replaces common Unicode symbols with WinAnsi-safe equivalents (e.g., checkmark -> "OK", bullet -> "-", em-dash -> "--")
   - Strips any remaining characters outside the WinAnsi range (codes 32-255, excluding 127-159 control chars)

2. Apply `sanitize()` in the `txt()` helper so ALL text drawn to the PDF is automatically cleaned -- single point of fix.

3. Apply `sanitize()` in the table cell rendering loop (line 502) which calls `page.drawText()` directly instead of using `txt()`.

### Also fix the same issue in related PDF edge functions

The same pattern exists in:
- `generate-scholarship-pdf/index.ts` (or `template.ts`)
- `generate-executive-report-pdf/index.ts`
- `generate-monthly-report-pdf/index.ts`

Each will get the same `sanitize()` helper applied to their text-drawing functions to prevent the same error from appearing elsewhere.

## Technical Details

The sanitize function:

```text
function sanitize(text: string): string {
  const replacements: Record<string, string> = {
    '\u2713': 'OK',   // checkmark
    '\u2714': 'OK',   // heavy checkmark
    '\u2716': 'X',    // heavy X
    '\u2022': '-',    // bullet
    '\u2019': "'",    // right single quote
    '\u2018': "'",    // left single quote
    '\u201C': '"',    // left double quote
    '\u201D': '"',    // right double quote
    '\u2013': '-',    // en-dash
    '\u2014': '--',   // em-dash
    '\u2026': '...',  // ellipsis
    '\u00A0': ' ',    // non-breaking space
  };
  let result = text;
  for (const [k, v] of Object.entries(replacements)) {
    result = result.replaceAll(k, v);
  }
  // Remove any remaining non-WinAnsi characters
  return result.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}
```

## Impact

- No visual regression: common symbols get readable replacements
- Prevents crashes for any future data containing special characters
- All profiles benefit (Admin, Manager, Auditor)
- No database or RLS changes needed
