#!/usr/bin/env python3
"""Extract labeled text from local PDF/DOCX/PPTX files without cloud services."""
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

def xml_text(data):
    root = ET.fromstring(data)
    return " ".join((e.text or "").strip() for e in root.iter() if e.tag.endswith('}t') and e.text).strip()

def extract(file):
    if file.suffix.lower() == '.pdf':
        p = subprocess.run(['pdftotext', '-layout', str(file), '-'], capture_output=True, text=True, check=True)
        return [(f'page {i}', txt.strip()) for i, txt in enumerate(p.stdout.split('\f'), 1) if txt.strip()]
    with zipfile.ZipFile(file) as archive:
        if file.suffix.lower() == '.docx':
            return [('document', xml_text(archive.read('word/document.xml')))]
        slides = sorted((n for n in archive.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)), key=lambda n:int(re.search(r'slide(\d+)',n).group(1)))
        return [(f'slide {i}', xml_text(archive.read(name))) for i,name in enumerate(slides,1)]

def main():
    if len(sys.argv)!=3: raise SystemExit('Usage: ingest.py INPUT_DIRECTORY OUTPUT.md')
    directory, output = Path(sys.argv[1]), Path(sys.argv[2])
    if not directory.is_dir(): raise SystemExit(f'Not a directory: {directory}')
    files = sorted(p for p in directory.rglob('*') if p.is_file() and p.suffix.lower() in ('.pdf','.docx','.pptx'))
    if not files: raise SystemExit('No PDF, DOCX or PPTX files found')
    lines=['# Source notes', '', 'Extracted local text. Verify against original visual sources; tables and reading order may be imperfect.', '']
    for file in files:
        lines += [f'## {file.relative_to(directory)}', '']
        try:
            for label,content in extract(file): lines += [f'### {label}', '', content or '(no text found)', '']
        except (OSError,subprocess.CalledProcessError,zipfile.BadZipFile,KeyError,ET.ParseError) as error:
            lines += [f'Extraction failed: {type(error).__name__}: {error}', '']
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text('\n'.join(lines),encoding='utf-8')
    print(f'Extracted {len(files)} files to {output}')

if __name__=='__main__': main()
