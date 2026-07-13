#!/usr/bin/env python3
import json, sys
from pathlib import Path
required = {'id','semester','subject','module','moduleCode','marks','category','type','difficulty','text','keywords','source','verified'}
errors=[]
for p in map(Path, sys.argv[1:]):
    data=json.loads(p.read_text(encoding='utf-8'))
    if 'subject' not in data or 'questions' not in data:
        errors.append(f"{p}: expected object with subject and questions")
        continue
    seen=set()
    for i,q in enumerate(data['questions'],1):
        missing=required-set(q)
        if missing: errors.append(f"{p} question {i}: missing {sorted(missing)}")
        if q.get('id') in seen: errors.append(f"{p}: duplicate id {q.get('id')}")
        seen.add(q.get('id'))
        if q.get('semester')!='sem3': errors.append(f"{p} {q.get('id')}: semester must be sem3")
        if not isinstance(q.get('keywords'), list): errors.append(f"{p} {q.get('id')}: keywords must be list")
        if not isinstance(q.get('marks'), int): errors.append(f"{p} {q.get('id')}: marks must be int")
if errors:
    print('\n'.join(errors)); sys.exit(1)
print('OK')
