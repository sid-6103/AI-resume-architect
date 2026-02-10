# 🚀 AI Resume Architect - Backend

AI-powered resume builder backend with advanced ATS optimization, template generation, and payment integration.

## 🛠️ Tech Stack

- **Runtime**: Node.js + Express.js
- **Database**: MongoDB (Mongoose ODM)
- **AI**: Google Gemini 1.5 Flash
- **PDF Generation**: Puppeteer
- **Authentication**: JWT (jsonwebtoken + bcrypt)
- **Payments**: Stripe (mock mode)
- **APIs**: Adzuna, The Muse, Remotive (job search)

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/      # Business logic
│   │   ├── auth.js       # User authentication
│   │   ├── resumes.js    # Resume CRUD
│   │   ├── ai.js         # AI features (JD analysis, rewrite, optimize)
│   │   ├── pdf.js        # PDF generation with templates
│   │   ├── payment.js    # Stripe integration
│   │   └── jobs.js       # Job search
│   ├── models/           # MongoDB schemas
│   │   ├── User.js       # User model (auth, tier)
│   │   └── Resume.js     # Resume model (full schema)
│   ├── routes/           # API routes
│   ├── middleware/       # Auth middleware
│   ├── utils/            # Template CSS files (7 templates)
│   └── server.js         # Express app setup
├── .env                  # Environment variables
└── package.json          # Dependencies
```

## 🔑 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Stripe (Mock Mode)
STRIPE_SECRET_KEY=sk_test_mock
STRIPE_PUBLISHABLE_KEY=pk_test_mock
STRIPE_WEBHOOK_SECRET=whsec_mock

# Job Search APIs (Optional)
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_API_KEY=your_adzuna_api_key
```

## 📦 Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server
npm run dev
```

The server will start on `http://localhost:5000`

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Resumes
- `GET /api/resumes` - Get all user resumes (protected)
- `GET /api/resumes/:id` - Get single resume (protected)
- `POST /api/resumes` - Create resume (protected)
- `PUT /api/resumes/:id` - Update resume (protected)
- `DELETE /api/resumes/:id` - Delete resume (protected)

### AI Features
- `POST /api/ai/analyze-jd` - Analyze job description
- `POST /api/ai/rewrite-bullet` - Rewrite single bullet point
- `POST /api/ai/optimize-resume` - Full resume optimization
- `POST /api/ai/generate-summary` - Generate professional summary
- `POST /api/ai/generate-cover-letter` - Generate cover letter
- `POST /api/ai/check-ats` - ATS score checker (PDF upload)

### PDF Generation
- `GET /api/pdf/generate/:id` - Generate PDF (protected)

### Payments
- `POST /api/payment/create-checkout-session` - Create Stripe checkout (protected)
- `POST /api/payment/webhook` - Stripe webhook handler
- `POST /api/payment/success` - Payment success verification (protected)

### Job Search
- `GET /api/jobs/search` - Search jobs/internships

## 🎨 Resume Templates

7 professional templates with CSS files in `src/utils/`:

**Free Templates:**
1. `pdfStyles.css` - Professional (default)
2. `minimalist.css` - Clean & lightweight
3. `compact.css` - Space-efficient
4. `classic.css` - Traditional serif

**PRO Templates:**
5. `modernStyles.css` - Bold blue accents
6. `creative.css` - Two-column sidebar
7. `executive.css` - Premium navy design

## 🤖 AI Features

### Gemini 1.5 Flash Integration
- **Job Description Analysis**: Extract keywords, skills, tools
- **Bullet Point Rewriting**: Optimize with keywords
- **ATS Scoring**: Calculate match percentage
- **Resume Optimization**: Full resume enhancement
- **Summary Generation**: AI-generated professional summaries
- **Cover Letter**: Tailored to job description

## 🔒 Security

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Protected Routes**: Middleware validation
- **Ownership Checks**: Users can only access their data
- **Webhook Verification**: Stripe signature validation




## 📄 License

Free to use for personal/commercial projects
