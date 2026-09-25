# Corporate Slides Factory for Cursor

A local, editable PowerPoint starter with a project skill at `.cursor/skills/corporate-slides/SKILL.md`. Clone or unpack the repository and open its root in Cursor. Ask: “Use corporate-slides to create a 10-slide architecture review from my files in `references/private/`.” The agent should create a slide specification, build the deck, inspect rendered slides, and revise it.

## First run

Requires Node.js 20+, Python 3, LibreOffice (`soffice`) and Poppler (`pdftoppm`, `pdftotext`) for PDF intake and visual QA. The PPTX builder requires `pptxgenjs` 4.0.1. Install dependencies from an **approved internal npm mirror** or pre-populated cache in isolated environments. A tracked lockfile supports `npm ci`.

```bash
npm ci
npm run demo
python3 scripts/qa.py output/demo.pptx
```

Open `output/demo.pptx` in PowerPoint and inspect `output/demo-preview/`. To build your own:

```bash
python3 scripts/ingest.py references/private/ output/source-notes.md
node scripts/build.mjs examples/architecture.json output/review.pptx
python3 scripts/qa.py output/review.pptx
```

Place private manuals, DOCX documents, source PPTX decks, images and approved fonts in `references/private/`. Update `config/brand.json` with verified colors and fonts; the included brand and deck are fictional placeholders. The ingestion script extracts source text locally and labels PDF pages/PPTX slides. Examine reference visuals yourself: the script does not infer brand rules, reproduce existing masters, or certify the correctness of extracted text. Edit the JSON spec to create your story and diagrams. For richer designs, extend `scripts/build.mjs` while preserving editable text/shapes.

## Repository map

- `.cursor/skills/corporate-slides/SKILL.md`: agent workflow and guardrails.
- `scripts/ingest.py`: local PDF, DOCX and PPTX text extraction.
- `scripts/build.mjs`: deterministic editable PPTX renderer and spec validation.
- `scripts/qa.py`: local PDF/PNG render plus geometry report.
- `config/brand.json`: design tokens and optional local logo path.
- `examples/architecture.json`: fictional 5-slide example and supported schema.

This starter does not call a cloud service while generating slides. Cursor's own inference can still transmit prompt and file context under your organization's configuration. Verify its privacy settings and keep installations pinned to approved internal packages. `.gitignore` excludes private inputs and generated output; check `git status` before pushing. Rendering with LibreOffice can differ from PowerPoint, so inspect the final file there.
