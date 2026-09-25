#!/usr/bin/env python3
"""Render every slide with local LibreOffice/Poppler and report obvious geometry risks."""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

def run(cmd): subprocess.run(cmd,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)

def main():
    if len(sys.argv)!=2: raise SystemExit('Usage: qa.py DECK.pptx')
    deck=Path(sys.argv[1]).resolve()
    if not deck.is_file(): raise SystemExit(f'Missing: {deck}')
    for cmd in ['soffice','pdftoppm']:
        if not shutil.which(cmd): raise SystemExit(f'Missing required local executable: {cmd}')
    preview=deck.parent/(deck.stem+'-preview');preview.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='slide-qa-') as tmp:
        # Isolated profile avoids collisions with the user's LibreOffice instance.
        run(['soffice',f'-env:UserInstallation=file://{tmp}/profile','--headless','--convert-to','pdf','--outdir',str(preview),str(deck)])
    pdf=preview/(deck.stem+'.pdf')
    if not pdf.exists(): raise SystemExit('LibreOffice did not create the PDF preview')
    run(['pdftoppm','-f','1','-r','110','-png',str(pdf),str(preview/'slide')])
    pngs=sorted(preview.glob('slide-*.png'))
    geometry=deck.with_suffix('.geometry.json')
    warnings=[]
    if geometry.exists():
        slides=json.loads(geometry.read_text())
        for slide in slides:
            for e in slide['elements']:
                # Approximate capacity only; final fitting must be checked in rendered slides.
                chars_per_line=max(1,e['w']*72/(e['fontSize']*.56))
                lines=sum(max(1,len(p)/chars_per_line) for p in e['text'].split('\n'))
                if lines*e['fontSize']*1.13/72>e['h']*1.18:
                    warnings.append(f"slide {slide['slide']}: possible text clipping: {e['text'][:60]!r}")
    if not pngs: warnings.append('No slide PNGs produced')
    report={'pptx':str(deck),'preview':str(preview),'slides_rendered':len(pngs),'warnings':warnings,'manual_review':'Inspect every PNG, verify citations and editability in PowerPoint.'}
    (preview/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
    print(json.dumps(report,indent=2,ensure_ascii=False))
    if not pngs: raise SystemExit(1)

if __name__=='__main__': main()
