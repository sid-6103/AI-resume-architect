# 🤖 AI Resume Architect

> **Build ATS-optimized resumes in minutes using advanced artificial intelligence**

A full-stack web application that helps job seekers create professional, ATS-friendly resumes with AI-powered optimization, multiple templates, and real-time preview.


## ✨ Features

### 🎨 **7 Professional Templates**
- 4 Free templates (Professional, Minimalist, Compact, Classic)
- 3 PRO templates (Modern, Creative, Executive)
- Live preview with instant switching
- Clickable URLs (LinkedIn, GitHub, Portfolio, Projects)

### 🤖 **AI-Powered Optimization**
- Job Description analysis with keyword extraction
- ATS score calculation (0-100%)
- Bullet point rewriting with keyword injection
- Professional summary generation
- Cover letter generation
- Full resume optimization ("Magic" button)

### 📄 **Resume Management**
- Create, edit, delete resumes
- Auto-save functionality
- Multiple resume support (PRO)
- PDF generation with all templates
- Persistent storage in MongoDB

### 🔍 **Additional Tools**
- **ATS Checker**: Upload PDF, get instant score
- **Job Search**: Find jobs/internships with smart filtering
- **User Tiers**: Free (1 resume, 4 templates) vs PRO (unlimited, 7 templates)
- **Mock Payments**: Stripe integration (test mode)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB Atlas account (free tier)
- Google Gemini API key (free tier)

### Installation

```bash
# Clone the repository
git clone 
cd AI-resume-architect

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (optional, no build needed)
cd ../frontend
npm install -g live-server

# Set up environment variables
cp backend/.env.example backend/.env
# Edit .env with your credentials

# Start backend server
cd backend
npm run dev

# Start frontend (in new terminal)
cd frontend
live-server
```

**Backend**: `http://localhost:5000`  
**Frontend**: `http://localhost:8080`

## 📁 Project Structure

```
AI-resume-architect/
├── README.md                 # This file
├── backend/                  # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/      # Business logic
│   │   ├── models/           # MongoDB schemas
│   │   ├── routes/           # API endpoints
│   │   ├── middleware/       # Auth middleware
│   │   ├── utils/            # Template CSS files
│   │   └── server.js         # Express app
│   ├── .env                  # Environment variables
│   ├── package.json
│   └── README.md             # Backend docs
├── frontend/                 # Vanilla HTML/CSS/JS
│   ├── index.html            # Landing page
│   ├── login.html            # Authentication
│   ├── signup.html
│   ├── dashboard.html        # Resume management
│   ├── builder.html          # Resume builder
│   ├── ats-check.html        # ATS checker
│   ├── jobs.html             # Job search
│   ├── app.js                # Main logic
│   ├── styles.css            # Global styles
│   └── README.md             # Frontend docs
└── .gitignore
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB (Mongoose)
- **AI**: Google Gemini 1.5 Flash
- **PDF**: Puppeteer
- **Auth**: JWT + bcrypt
- **Payments**: Stripe (test mode)

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Glassmorphism design
- **JavaScript**: Vanilla JS (no frameworks)
- **Fonts**: Google Fonts (Outfit)

## 🔑 Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Stripe (Mock Mode)
STRIPE_SECRET_KEY=sk_test_mock
STRIPE_PUBLISHABLE_KEY=pk_test_mock
STRIPE_WEBHOOK_SECRET=whsec_mock



## 🎯 Key Features Breakdown

### 1. Resume Builder
- **Live Preview**: See changes instantly
- **7 Templates**: Professional variety
- **Auto-Save**: Never lose your work
- **Sections**: Personal info, experience, education, skills, projects
- **Clickable Links**: LinkedIn, GitHub, portfolio, project URLs

### 2. AI Optimization
- **JD Analysis**: Extract keywords from job descriptions
- **ATS Scoring**: Calculate match percentage
- **Bullet Rewriting**: AI-enhanced bullet points
- **Summary Generation**: Professional summaries
- **Cover Letters**: Tailored to job description

### 3. User Tiers
| Feature | Free | PRO |
|---------|------|-----|
| Resumes | 1 | Unlimited |
| Templates | 4 | 7 |
| AI Features | ✅ | ✅ |
| PDF Download | ✅ | ✅ |
| ATS Checker | ✅ | ✅ |
| Job Search | ✅ | ✅ |

### 4. Templates

**Free Templates:**
- **Professional**: Classic centered design
- **Minimalist**: Clean, lightweight
- **Compact**: Space-efficient
- **Classic**: Traditional serif

**PRO Templates:**
- **Modern**: Bold blue accents
- **Creative**: Two-column sidebar
- **Executive**: Premium navy design

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get user

### Resumes
- `GET /api/resumes` - List resumes
- `POST /api/resumes` - Create resume
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

### AI Features
- `POST /api/ai/analyze-jd` - Analyze JD
- `POST /api/ai/optimize-resume` - Optimize resume
- `POST /api/ai/check-ats` - ATS checker

### PDF & Payments
- `GET /api/pdf/generate/:id` - Generate PDF
- `POST /api/payment/create-checkout-session` - Checkout

Full API docs: [Backend README](backend/README.md)

## 🧪 Testing

### Test User Accounts
```javascript
// Free User
Email: test@test.com
Password: test123

// PRO User (upgrade via mock payment)
Use test card: 4242 4242 4242 4242
```

### Manual Testing
1. ✅ Signup/Login flow
2. ✅ Create resume
3. ✅ Switch templates
4. ✅ AI optimization
5. ✅ PDF download
6. ✅ ATS checker
7. ✅ Job search
8. ✅ Payment flow

## 🚀 Deployment




## 📊 Performance

- **Backend**: < 100ms response time
- **Frontend**: < 1s first paint
- **PDF Generation**: 2-3s average
- **AI Features**: 3-5s (Gemini API)

## 🔒 Security

- JWT authentication
- Password hashing (bcrypt)
- Protected API routes
- User ownership validation
- XSS protection
- CORS configuration


## 📄 License

Free to use for personal/commercial projects




