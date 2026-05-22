# Kulima Frontend
This is the exact folder structure to follow before writing a component.

## Structure
```
frontend/
├── public/           # Static files (favicon, robots.txt, etc.)
├── src/
│   ├── assets/       # Images, fonts, icons, SVGs
│   ├── components/   # Reusable UI — Button, Card, Modal, Input
│   ├── layout/       # Page wrappers — Header, Footer, PageWrapper
│   ├── pages/        # One file per route — LandingPage, AboutPage
│   ├── features/     # Modules — Auth, Dashboard, Payments
│   ├── hooks/        # Custom React hooks — useAuth, useWindowSize
│   ├── context/      # React Context — AuthContext, ThemeContext
│   ├── redux/        # Redux store, slices, actions
│   ├── services/     # API calls — Supabase, fetch, Axios
│   ├── utils/        # Pure helpers — formatDate, validateEmail
│   ├── App.jsx       # Root component
│   ├── index.css     # Global styles
│   └── main.jsx      # Entry point
├── .eslintrc.json
├── .gitignore
├── package.json
├── README.md
└── vite.config.js
```

## Start
```bash
npm install
npm run dev
```

## Order
1. Create folder structure
2. Add LandingPage.jsx in `src/pages/`
3. Import it in `App.jsx`
4. Verify at localhost:3000
5. Build layout & features
