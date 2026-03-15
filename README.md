# LLBwithMe Question Bank — v3.0.0

735+ curated exam questions across 12 subjects, 2 active semesters.

## Quick Start
```bash
python -m http.server 8000
# → http://localhost:8000
```

## Architecture
```
data/curriculum.json          ← semesters + subjects + modules (single source of truth)
data/questions/<subject>.json ← lazy-loaded per subject
js/app.js                     ← application logic
css/main.css                  ← design system
```

## Adding questions → see ADDING_QUESTIONS_GUIDE.md
