# Reference Document: Deterministic PDF Parsing Logic

**Source Material**: "Parse 12 Months Of Credit Card Statements In 3 Minutes" by Zach Quinn (Medium).

**Context**: This document analyzes the specific deterministic (non-AI) logic used by the author to extract financial transactions from PDF bank statements. This serves as the blueprint for our `src/utils/parser.ts`.

## 1. Core Philosophy: "The Sledgehammer Approach"

The author relies on the fact that PDF text, while unstructured, often follows a predictable linear sequence when extracted as raw text. He does not use optical character recognition (OCR) or spatial layout analysis. He uses **Raw Text Extraction + String Splitting**.

## 2. Technical Stack & Equivalent for Our Project

| Author's Stack (Python) | Our Stack (TypeScript/Client-Side) |
| :---------------------- | :--------------------------------- |
| PyPDF2 (PdfReader)      | pdfjs-dist (Mozilla)               |
| pandas (DataFrame)      | Array of Objects `[{...}]`         |
| re (Regex)              | Native JS RegExp                   |
| SQL CASE WHEN           | JS Switch or Dictionary Lookup     |

## 3. Step-by-Step Parsing Algorithm

### Step A: Page Isolation (Finding the "Meat")

The author notes that Page 1 is usually a summary. The actual transaction list often starts on Page 3 or 4.

- **Logic**: Iterate through pages. Extract text.
- **Heuristic**: In our application, we cannot hardcode "Page 3." We must scan text for keywords like "Date", "Description", "Amount", or "Transactions" to identify the start of the data table.

### Step B: Raw Text Ingestion

Instead of trying to keep table columns aligned (which is hard in PDF parsing), the author extracts the entire page text as a single string and splits it by the newline character.

- **Code Concept**: `const lines = rawPdfText.split('\n');`
- **Result**: A massive list of strings. Some are header junk, some are transactions.

### Step C: The "Header/Footer" Slice

The author realized the first ~6 lines and the last few lines of every page are "junk" (bank address, page numbers).

- **Logic**: `const cleanLines = lines.slice(6, lines.length - footerOffset);`
- **Adaptation for Us**: We should implement a "Junk Filter" that removes lines that are too short, contain specific boilerplate (e.g., "Page 1 of 5"), or are empty.

### Step D: Regex for Amounts (The Anchor)

The most consistent data point in a bank statement is the money format.

- **Regex Used**: `\$[0-9,]+` (Finds a dollar sign, followed by digits and commas).
- **Strategy**: Iterate through every line. If a line doesn't contain a money pattern, it is likely garbage or a wrapped text description. Discard or merge it.

### Step E: Handling Dates (The Shortcut)

The author struggled to write a Regex that reliably captured dates for every specific transaction line.

- **His Workaround**: He completely ignored individual transaction dates. instead, he calculated the "Statement Period" (e.g., "August 2024") and applied that date to every transaction in the list.
- **Our Improvement**: While his method works for general analysis, for subscription detection, we need specific dates to calculate 30-day intervals. We will use a stricter Regex strategy:
  - Look for: `^\d{2}/\d{2}` (MM/DD at start of line) OR `[A-MMM] \d{2}` (Jan 01).

### Step F: Description Normalization (The "No AI" Cleaner)

Once he had the raw strings (e.g., `NETFLIX.COM *89203 BENTONVILLE`), he needed them to just say "Netflix."

- **Method**: He used a hardcoded SQL CASE WHEN statement (essentially a giant if/else block).
  - `WHEN description LIKE "%NETFLIX%" THEN "Netflix"`
  - `WHEN description LIKE "%SPOTIFY%" THEN "Spotify"`
- **Our Implementation**: We will use a `keyword_map` object to instant-match:

```javascript
const normalize = (rawString) => {
  if (rawString.includes('NETFLIX')) return 'Netflix';
  if (rawString.includes('SPOTIFY')) return 'Spotify';
  return rawString; // Return original if no match
};
```

## 4. Key Takeaways for the Agent

1.  **Don't over-engineer column detection**. Treat the PDF as a stream of text lines.
2.  **Filter by "Value."** If a line doesn't have a price, it's probably not a transaction.
3.  **Hardcode the winners.** Since we can't use AI to guess that "Amzn Prime" is "Amazon," we must rely on a robust list of keywords for the top 50 subscriptions.
