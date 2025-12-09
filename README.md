# LLBwithMe Question Bank

A comprehensive, scalable law exam question bank platform for LL.B. students.

## 🎓 Overview

LLBwithMe is a production-ready legal education platform designed to help law students prepare for their examinations. Built with a multi-semester architecture, it currently features **284 curated questions** from actual LL.B. examinations across **6 subjects** for Semester 1.

## ✨ Features

### Core Features
- **Multi-Semester Architecture** - Built to scale from Semester 1 to all 6 semesters
- **284+ Curated Questions** - Real exam questions from multiple examination sessions
- **Advanced Filtering** - Filter by subject, marks, difficulty, type, and study status
- **Full-Text Search** - Real-time search with keyword highlighting
- **Statistics Dashboard** - Interactive charts showing question distribution
- **Progress Tracking** - Track studied questions with localStorage persistence
- **Bookmarking System** - Save important questions for later review
- **Dark/Light Mode** - Toggle between themes with persistent preference
- **Responsive Design** - Mobile-first approach, works on all devices
- **Admin Panel** - Password-protected panel for content management
- **Export Options** - Export questions as JSON, CSV, or PDF

### Subjects (Semester 1)
1. **Criminal Psychology & Criminal Sociology** - 26 questions
2. **Constitutional Law I** - 47 questions
3. **Law of Contract I** - 59 questions
4. **Family Law I** - 52 questions
5. **Law of Crimes** - 52 questions
6. **Intellectual Property Rights** - 48 questions

### Question Distribution
- **15-Mark Questions (Long):** 88
- **10-Mark Questions (Medium):** 106
- **5-Mark Questions (Short):** 90

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (for development)

### Installation

1. Clone or download the repository
2. Start a local web server in the project directory:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if http-server is installed)
npx http-server

# Using PHP
php -S localhost:8000
```

3. Open your browser and navigate to `http://localhost:8000`

### File Structure

```
llb-question-bank/
├── index.html              # Main application entry point
├── css/
│   └── main.css           # Complete design system
├── js/
│   └── app.js             # Main application logic
├── data/
│   ├── semesters.json     # Semester metadata
│   ├── subjects.json      # Subject definitions
│   ├── metadata.json      # Platform metadata
│   └── questions/         # Question files by subject
│       ├── crim_psych.json
│       ├── const_law.json
│       ├── contract_law.json
│       ├── family_law.json
│       ├── crimes.json
│       └── ipr.json
├── admin/                  # Admin panel (optional)
├── assets/                 # Static assets
└── README.md
```

## 📱 Responsive Design

The platform is fully responsive and optimized for:
- **Desktop** (1024px+)
- **Tablet** (768px - 1024px)
- **Mobile** (< 768px)

## 🎨 Design System

### Color Palette
- **Primary:** #1a4d5e (Dark Teal)
- **Secondary:** #2a8fa3 (Bright Teal)
- **Accent:** #d4af37 (Gold)
- **Success:** #27ae60 (Green)
- **Warning:** #f39c12 (Orange)
- **Error:** #e74c3c (Red)

### Typography
- **Headings:** Merriweather (serif)
- **Body:** Open Sans (sans-serif)

## 🔐 Admin Access

The admin panel is password-protected. Default credentials:
- **Password:** ``

Admin features:
- Add new questions
- Export data (JSON/CSV)
- View analytics
- Export user progress

## 📊 Data Structure

Questions follow this schema:

```json
{
  "id": "q_sem1_crim_psych_001",
  "semester": "sem1",
  "subject": "crim_psych",
  "marks": 15,
  "category": "Long Question",
  "type": "definition",
  "difficulty": "medium",
  "text": "Question text here...",
  "keywords": ["keyword1", "keyword2"],
  "source": "April 2025 Exam",
  "verified": true
}
```

## 🔧 Adding New Semesters

The platform is designed for easy expansion:

1. Add semester data to `data/semesters.json`
2. Add subjects to `data/subjects.json`
3. Create question files in `data/questions/`
4. The platform will automatically recognize and display new content

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📝 Exam Sessions Included

Questions extracted from:
- April 2025 Examination
- December 2024 Examination
- June 2024 Examination
- January 2024 Examination

## 🔮 Roadmap

- **Semester 2:** April 2026
- **Semester 3:** August 2026
- **Semester 4:** December 2026
- **Semester 5:** April 2027
- **Semester 6:** August 2027

## 📄 License

All questions are extracted from actual examination papers for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📞 Support

For support or questions, please open an issue in the repository.

---

**Version:** 2.0.0  
**Built with:** HTML5, CSS3, Vanilla JavaScript, Chart.js  
**Made with ❤️ for Law Students**

