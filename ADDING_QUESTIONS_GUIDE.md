# Adding Questions Guide — v3.0.0

## Question schema
```json
{
  "id": "q_sem2_const_law_2_apr_2026_01",
  "semester": "sem2",
  "subject": "const_law_2",
  "module": "module_01",
  "moduleName": "Nature of Indian Federalism",
  "moduleCode": "01",
  "marks": 15,
  "category": "Long Question",
  "type": "analytical",
  "difficulty": "hard",
  "text": "Question text.",
  "keywords": ["keyword1"],
  "source": "April 2026 Exam",
  "verified": true
}
```

## Sem 2 Module IDs
| Subject | module_01 | module_02 | module_03 |
|---|---|---|---|
| const_law_2 | Nature of Indian Federalism | Distribution of Legislative and Executive Powers | — |
| contract_law_2 | Contracts of Indemnity | Contracts of Guarantee | Contracts of Bailment |
| family_law_2 | Hindu Joint Family System | Intestate Succession | — |
| jurisprudence | Introduction to Jurisprudence | Sources of Law | — |
| media_law | Introduction to Media and Communication | History of Press and Theories of Press | — |
| penology_victimology | Penology — Introduction | Punishment | — |

## Adding a new semester
1. Append semester object to `curriculum.json → semesters[]`
2. Add subjects with modules inline under `subjects[]`
3. Drop question files in `data/questions/`
4. No code changes needed.
