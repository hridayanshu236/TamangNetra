import csv, re

FORMULA_RE = re.compile(r'^\s*=')
NUMBER_RE  = re.compile(r'^\s*-?[\d,]+\.?\d*\s*%?\s*$')
DATE_RE    = re.compile(r'^\s*\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4}\s*$')
EMPTY_RE   = re.compile(r'^\s*$')

def is_translatable(cell: str) -> bool:
    if EMPTY_RE.match(cell): return False
    if FORMULA_RE.match(cell): return False   # =SUM(A1:A10) etc.
    if NUMBER_RE.match(cell): return False    # 1,234.56
    if DATE_RE.match(cell): return False      # 2024-01-15
    return True

async def process_csv(input_path, output_path, src, tgt, translator, glossary, progress_cb, delimiter=','):
    with open(input_path, newline='', encoding='utf-8-sig') as f:
        rows = list(csv.reader(f, delimiter=delimiter))

    # Count translatable cells for progress
    cells_to_translate = [(r, c) for r, row in enumerate(rows)
                          for c, cell in enumerate(row) if is_translatable(cell)]
    total = len(cells_to_translate)

    for i, (r, c) in enumerate(cells_to_translate):
        rows[r][c] = await translator.translate(rows[r][c], src, tgt)
        await progress_cb(i + 1, total, f"Row {r+1}")

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        csv.writer(f, delimiter=delimiter).writerows(rows)