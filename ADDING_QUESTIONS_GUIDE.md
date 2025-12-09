# Guide: Adding New Questions to LLBwithMe Question Bank

This document explains how to add new exam questions to the LLBwithMe Question Bank application.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Question Format](#question-format)
3. [How to Collate Questions](#how-to-collate-questions)
4. [Module Mapping Reference](#module-mapping-reference)
5. [Prompt Template](#prompt-template-for-ai-assistant)
6. [Examples](#examples)
7. [Validation Checklist](#validation-checklist)

---

## Quick Start

### Minimum Information Needed Per Question:

| Field | Required | Example |
|-------|----------|---------|
| Subject | ✅ Yes | Constitutional Law I |
| Question Text | ✅ Yes | "Discuss the scope of Article 14..." |
| Marks | ✅ Yes | 15 / 10 / 5 |
| Exam Source | ✅ Yes | "June 2025 Exam" |
| Difficulty | Optional | Easy / Medium / Hard |
| Question Type | Optional | Definition / Analytical / Comparative |

---

## Question Format

### JSON Structure (Internal Format)

Each question in the database follows this structure:

```json
{
  "id": "q_sem1_const_law_048",
  "semester": "sem1",
  "subject": "const_law",
  "marks": 15,
  "category": "Long Question",
  "type": "analytical",
  "difficulty": "hard",
  "text": "Discuss the evolution of Article 14 and the concept of reasonable classification with reference to landmark judgments.",
  "keywords": ["Article 14", "reasonable classification", "equality", "judicial interpretation"],
  "relatedQuestions": ["q_sem1_const_law_001"],
  "source": "June 2025 Exam",
  "verified": true,
  "module": "module_03",
  "moduleName": "Right to Equality (Article 14 to 18)",
  "moduleSectionNumber": 3
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Auto-generated unique ID (format: `q_sem{N}_{subject}_{number}`) |
| `semester` | string | Semester code: `sem1`, `sem2`, etc. |
| `subject` | string | Subject code (see Subject Codes table below) |
| `marks` | number | 5, 10, or 15 |
| `category` | string | "Short Question" (5), "Medium Question" (10), "Long Question" (15) |
| `type` | string | Question type (see Question Types below) |
| `difficulty` | string | "easy", "medium", or "hard" |
| `text` | string | The full question text |
| `keywords` | array | 3-5 relevant keywords for search |
| `relatedQuestions` | array | IDs of similar questions (optional) |
| `source` | string | Exam session (e.g., "June 2025 Exam") |
| `verified` | boolean | Always `true` for real exam questions |
| `module` | string | Module ID (e.g., "module_01") |
| `moduleName` | string | Full module name from syllabus |
| `moduleSectionNumber` | number | Module number (1-9 depending on subject) |

### Subject Codes

| Subject | Code | Semester |
|---------|------|----------|
| Criminal Psychology & Criminal Sociology | `crim_psych` | sem1 |
| Constitutional Law I | `const_law` | sem1 |
| Law of Contract I | `contract_law` | sem1 |
| Family Law I | `family_law` | sem1 |
| Law of Crimes (BNS) | `crimes` | sem1 |
| Intellectual Property Rights | `ipr` | sem1 |

### Question Types

| Type | Code | Description |
|------|------|-------------|
| Definition | `definition` | "Define X", "What is X?" |
| Analytical | `analytical` | "Analyze", "Critically examine", "Evaluate" |
| Comparative | `comparative` | "Distinguish between", "Compare X and Y" |
| Statutory | `statutory` | Questions about specific sections/provisions |
| Case Law | `case_law` | Questions requiring case law discussion |
| Problem-Based | `problem` | Hypothetical scenarios to solve |

### Marks to Category Mapping

| Marks | Category | Typical Length |
|-------|----------|----------------|
| 15 | Long Question | Detailed answer, multiple parts |
| 10 | Medium Question | Moderate detail |
| 5 | Short Question | Brief, concise answer |

---

## How to Collate Questions

### Option 1: Simple Table Format (Recommended)

Create a table or spreadsheet with these columns:

```
| Subject | Question | Marks | Exam Source |
|---------|----------|-------|-------------|
| Constitutional Law I | Discuss the scope of Article 21... | 15 | June 2025 |
| Contract Law I | Define consideration and its essentials | 10 | June 2025 |
| Family Law I | What is Muta marriage? | 5 | June 2025 |
```

### Option 2: Grouped by Subject

```markdown
## Constitutional Law I - June 2025 Exam

### 15-Mark Questions:
1. Discuss the scope of Article 21 and right to privacy with recent case laws.
2. Explain the procedure for Constitutional Amendment under Article 368.

### 10-Mark Questions:
1. What are the grounds of reasonable restrictions under Article 19(2)?
2. Explain the concept of Basic Structure doctrine.

### 5-Mark Questions:
1. Doctrine of Eclipse
2. Right to Education under Article 21A
```

### Option 3: Raw List Format

```
Subject: Constitutional Law I
Source: June 2025 Exam

15 Marks:
- Discuss the scope of Article 21 and right to privacy with recent case laws.
- Explain the procedure for Constitutional Amendment under Article 368.

10 Marks:
- What are the grounds of reasonable restrictions under Article 19(2)?

5 Marks:
- Doctrine of Eclipse
- Right to Education under Article 21A
```

---

## Module Mapping Reference

### Constitutional Law I (9 Modules)

| Module | Name | Topics |
|--------|------|--------|
| module_01 | Introduction to the Indian Constitution | Constituent Assembly, framing, commencement |
| module_02 | Territory, Citizenship & Articles 12-13 | Citizenship, State definition, Article 13 |
| module_03 | Right to Equality (Article 14-18) | Article 14, 15, 16, 17, 18 |
| module_04 | Right to Freedom I (Article 19) | Six freedoms, reasonable restrictions |
| module_05 | Right to Freedom II (Articles 20-22) | Protection in conviction, life/liberty, arrest |
| module_06 | Right against Exploitation (Articles 23-24) | Forced labor, child labor |
| module_07 | Freedom of Religion & Cultural Rights | Articles 25-30 |
| module_08 | Right to Constitutional Remedies | Article 32, writs, PIL |
| module_09 | Directive Principles & Fundamental Duties | Articles 36-51, 51A |

### Criminal Psychology (7 Modules)

| Module | Name | Topics |
|--------|------|--------|
| module_01 | Crime, Criminal and Criminology | Schools of criminology, Lombroso, Ferri |
| module_02 | Psychology and Crime | Psychological approaches, mental illness |
| module_03 | Psychometric Tests and Criminal Profiling | Criminal profiling, tests |
| module_04 | Forensic Psychology | Police, court, prison applications |
| module_05 | Sociological Theories | Social structure, disorganization, anomie |
| module_06 | Subcultural Theories | Cohen, Miller's theories |
| module_07 | Crime and Social Process | Differential association, labeling, control |

### Law of Contract I (8 Modules)

| Module | Name | Topics |
|--------|------|--------|
| module_01 | Introduction and Formation | Offer, acceptance, communication |
| module_02 | Competency of Parties | Minor, unsound mind, disqualified |
| module_03 | Free Consent | Coercion, undue influence, fraud, mistake |
| module_04 | Consideration | Definition, adequacy, privity |
| module_05 | Void Agreements | Sections 23-30, wagering |
| module_06 | Contingent & Quasi-Contracts | Sections 31-36, 68-72 |
| module_07 | Performance and Discharge | Modes of discharge, breach |
| module_08 | Contract Remedies | Damages, specific performance, injunction |

### Family Law I (6 Modules)

| Module | Name | Topics |
|--------|------|--------|
| module_01 | Introduction to Hindu & Muslim Law | Sources, schools, nature |
| module_02 | Hindu Marriage & Matrimonial Reliefs | Hindu Marriage Act 1955, divorce |
| module_03 | Muslim Marriage & Matrimonial Reliefs | Nikah, mehr, talaq |
| module_04 | Parsi, Christian & Special Marriage | Other personal laws |
| module_05 | Alimony and Maintenance | Maintenance provisions |
| module_06 | Adoption and Guardianship | HAMA, guardianship |

### Law of Crimes (8 Modules)

| Module | Name | Topics |
|--------|------|--------|
| module_01 | Introduction to BNS 2023 | Structure, jurisdiction, definitions |
| module_02 | General Exceptions | Sections 14-44, defenses |
| module_03 | Inchoate Crimes | Abetment, conspiracy, attempt |
| module_04 | Offences Against Human Body | Murder, hurt, kidnapping |
| module_05 | Offences Against Women | Rape, harassment, dowry death |
| module_06 | Offences Against Property | Theft, extortion, robbery |
| module_07 | Offences Against Public Tranquility | Unlawful assembly, rioting |
| module_08 | Offences Against State | Sedition, waging war |

### Intellectual Property Rights (7 Modules)

| Module | Name | Topics |
|--------|------|--------|
| module_01 | Understanding IP | Theories, history, WIPO, WTO |
| module_02 | Copyright and Neighbouring Rights | Copyright Act 1957, infringement |
| module_03 | Patents | Patents Act 1970, registration, licensing |
| module_04 | Trademarks | Trademarks Act 1999, registration |
| module_05 | Industrial Designs | Designs Act 2000 |
| module_06 | Geographical Indications | GI Act 1999 |
| module_07 | Other IP Rights | Layout designs, plant varieties, trade secrets |

---

## Prompt Template for AI Assistant

### Basic Prompt:

```
Add the following new questions to the LLBwithMe Question Bank:

**Exam Source:** [Month Year] Examination
**Semester:** 1

## [Subject Name]

### 15-Mark Questions:
1. [Question text]
2. [Question text]

### 10-Mark Questions:
1. [Question text]
2. [Question text]

### 5-Mark Questions:
1. [Question text]
2. [Question text]

---

Please:
1. Add these to the appropriate question JSON files
2. Map each question to the correct module based on content
3. Generate appropriate keywords
4. Assign difficulty levels
5. Update question counts
```

### Detailed Prompt (with difficulty hints):

```
Add the following new questions to the LLBwithMe Question Bank:

**Exam Source:** June 2025 Examination
**Semester:** 1

## Constitutional Law I

### 15-Mark Questions:
1. [Hard] Critically analyze the evolution of the Basic Structure doctrine from Kesavananda Bharati to recent judgments.
2. [Medium] Discuss the scope and importance of Article 21 with reference to right to privacy.

### 10-Mark Questions:
1. [Medium] Explain the concept of reasonable classification under Article 14.
2. [Hard] Discuss the powers of Supreme Court under Article 32.

### 5-Mark Questions:
1. [Easy] Doctrine of Severability
2. [Easy] Right to Constitutional Remedies

## Law of Contract I

### 15-Mark Questions:
1. [Medium] Define contract and explain essential elements of a valid contract.

---

Please update the question bank with these questions, mapping them to appropriate modules.
```

---

## Examples

### Example 1: Adding Constitutional Law Questions

**Your Input:**
```
Add these questions from December 2025 Exam:

Constitutional Law I:

15 Marks:
- Discuss the scope of judicial review in India with reference to Article 13.
- Explain the Right to Privacy as a fundamental right under Article 21.

10 Marks:
- What are writs? Explain any three types of writs.

5 Marks:
- Doctrine of Basic Structure
- Article 15 - Prohibition of discrimination
```

**Result:** Questions will be added to `data/questions/const_law.json` with:
- Proper IDs (q_sem1_const_law_048, 049, etc.)
- Module mappings (module_02, module_05, module_08, etc.)
- Keywords generated
- Difficulty assigned

### Example 2: Adding Multiple Subject Questions

**Your Input:**
```
Add June 2025 Exam questions:

## Criminal Psychology
15 Marks:
- Explain Sutherland's Differential Association Theory.

## Contract Law
10 Marks:
- What is undue influence? Discuss its essentials.

## Family Law
5 Marks:
- Muta Marriage
- Iddat period
```

---

## Validation Checklist

Before submitting questions, verify:

- [ ] Subject name is correct
- [ ] Marks value is clear (5, 10, or 15)
- [ ] Exam source/session is mentioned
- [ ] Question text is complete (not truncated)
- [ ] Questions are from actual exam papers (not invented)
- [ ] No duplicate questions already in the bank

### After Adding Questions:

- [ ] Question count updated in subject
- [ ] Module mapping is logical
- [ ] Test locally before deploying
- [ ] Push to GitHub for Vercel deployment

---

## File Locations

| File | Purpose |
|------|---------|
| `data/questions/const_law.json` | Constitutional Law questions |
| `data/questions/crim_psych.json` | Criminal Psychology questions |
| `data/questions/contract_law.json` | Contract Law questions |
| `data/questions/family_law.json` | Family Law questions |
| `data/questions/crimes.json` | Law of Crimes questions |
| `data/questions/ipr.json` | IPR questions |
| `data/modules/*.json` | Module definitions (don't modify) |

---

## Support

If you encounter issues:
1. Verify question format matches examples
2. Check module mapping reference
3. Ensure exam source is specified
4. Test locally before deploying

---

**Last Updated:** December 2024
**Current Question Count:** 284 questions across 6 subjects

