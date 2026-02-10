# 🎨 AI Resume Architect - Frontend

Modern, responsive frontend for AI-powered resume building with live preview and template switching.

## 🛠️ Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Glassmorphism design, animations
- **Vanilla JavaScript** - No frameworks, pure JS
- **Google Fonts** - Outfit font family

## 📁 Project Structure

```
frontend/
├── index.html           # Landing page
├── login.html           # User login
├── signup.html          # User registration
├── dashboard.html       # Resume management dashboard
├── builder.html         # Resume builder with live preview
├── ats-check.html       # Standalone ATS checker
├── jobs.html            # Job search interface
├── app.js               # Main application logic (55KB)
└── styles.css           # Global styles (33KB)
```

## 🎨 Design Features

- **Glassmorphism UI**: Modern frosted glass effects
- **Gradient Backgrounds**: Dynamic color schemes
- **Smooth Animations**: Micro-interactions throughout
- **Responsive Design**: Mobile-first approach
- **Dark Accents**: Professional color palette

## 🚀 Getting Started

### Option 1: Live Server (Recommended)

```bash
# Install Live Server globally
npm install -g live-server

# Navigate to frontend directory
cd frontend

# Start server
live-server
```

Opens at `http://localhost:8080`

### Option 2: Python HTTP Server

```bash
cd frontend
python -m http.server 3000
```

Opens at `http://localhost:3000`

### Option 3: VS Code Live Server Extension

1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

## 📄 Pages Overview

### 1. Landing Page (`index.html`)
- Hero section with CTA
- Features showcase
- How it works section
- Pricing tiers

### 2. Authentication
- **Login** (`login.html`) - JWT token-based
- **Signup** (`signup.html`) - User registration

### 3. Dashboard (`dashboard.html`)
- Resume list with cards
- Create/edit/delete resumes
- PRO upgrade button
- Resume limit indicator

### 4. Builder (`builder.html`)
**Main Features:**
- Live preview panel
- 7 template selector
- Personal info form
- Experience/education sections
- Skills input
- JD analysis panel
- AI optimization tools
- PDF download

### 5. ATS Checker (`ats-check.html`)
- Upload PDF resume
- Paste job description
- Get ATS score
- View keyword analysis

### 6. Job Search (`jobs.html`)
- Search by keywords
- Filter by type (job/internship)
- Location-based search
- Relevance ranking



### Auto-Save
- Saves every 2 seconds of inactivity
- Creates new resume if none exists
- Updates existing resume

### PRO Gating
- Preview PRO templates (free users)
- Block PDF download for PRO templates
- Upgrade prompts

## 🔌 API Integration

### Base URL
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

### Authentication
```javascript
// Stored in localStorage
const token = localStorage.getItem('careerforge_token');
const user = JSON.parse(localStorage.getItem('careerforge_user'));
```

### API Calls
All API calls use JWT tokens in headers:
```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}
```




### Environment Configuration

Update API URL for production in `app.js`:
```javascript
const API_BASE_URL = 'https://your-backend-domain.com/api';
```

## 📊 Performance

- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 2s
- **Total Bundle Size**: ~100KB
- **No external dependencies**: Pure vanilla JS




## 📄 License

Free to use for personal/commercial projects
