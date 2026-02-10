/**
 * AI RESUME ARCHITECT - Main Application
 * 
 * Architecture:
 * - Global state management with reactive updates
 * - Live preview rendering
 * - API integration for AI features
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = 'http://localhost:5050/api';

// Auth state (persisted in localStorage)
let authToken = localStorage.getItem('cf_token') || null;
let currentUser = JSON.parse(localStorage.getItem('cf_user') || 'null');

// ============================================
// GLOBAL STATE MANAGEMENT
// ============================================

const initialState = {
    resumeId: null,
    personalInfo: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: '',
        portfolio: '',
        summary: ''
    },
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    languages: [],
    awards: [],
    skills: {
        technical: [],
        tools: [],
        soft: []
    },
    atsData: {
        targetJD: '',
        extractedKeywords: null,
        atsScore: 0,
        matchedKeywords: [],
        missingKeywords: []
    }
};

// Deep clone helper
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// State management class
class StateManager {
    constructor(initialState) {
        this.state = deepClone(initialState);
        this.listeners = [];
    }

    getState() {
        return this.state;
    }

    setState(updater) {
        if (typeof updater === 'function') {
            this.state = updater(deepClone(this.state));
        } else {
            this.state = { ...this.state, ...updater };
        }
        this.notify();
    }

    // Update state without triggering listeners (for input fields)
    setSilent(updater) {
        if (typeof updater === 'function') {
            this.state = updater(deepClone(this.state));
        } else {
            this.state = { ...this.state, ...updater };
        }
        // Only update the preview, not the input lists
        renderResumePreview(this.state);
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

// Create global store
const store = new StateManager(initialState);

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
    // Pages
    landingPage: document.getElementById('landing-page'),
    builderApp: document.getElementById('builder-app'),
    dashboardApp: document.getElementById('dashboard-app'),

    // Navigation
    startBtn: document.getElementById('start-btn'),
    demoBtn: document.getElementById('demo-btn'),
    navBuilderBtn: document.getElementById('nav-builder-btn'),
    navDashboardBtn: document.getElementById('nav-dashboard-btn'),
    navLoginBtn: document.getElementById('nav-login-btn'),
    navSignupBtn: document.getElementById('nav-signup-btn'),
    backToLanding: document.getElementById('back-to-landing'),

    // Builder Header
    atsScoreDisplay: document.getElementById('ats-score-display'),
    magicBtn: document.getElementById('magic-btn'),
    coverLetterBtn: document.getElementById('cover-letter-btn'),
    downloadPdfBtn: document.getElementById('download-pdf-btn'),
    saveResumeBtn: document.getElementById('save-resume-btn'),

    // JD Section
    jdInput: document.getElementById('jd-input'),
    analyzeJdBtn: document.getElementById('analyze-jd-btn'),
    keywordsDisplay: document.getElementById('keywords-display'),
    techKeywords: document.getElementById('tech-keywords'),
    toolKeywords: document.getElementById('tool-keywords'),

    // Personal Info
    fullName: document.getElementById('fullName'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    location: document.getElementById('location'),
    linkedin: document.getElementById('linkedin'),
    github: document.getElementById('github'),
    portfolio: document.getElementById('portfolio'),
    summary: document.getElementById('summary'),
    generateSummaryBtn: document.getElementById('generate-summary-btn'),

    // Sections
    experienceList: document.getElementById('experience-list'),
    educationList: document.getElementById('education-list'),
    projectList: document.getElementById('project-list'),
    certificationList: document.getElementById('certification-list'),
    languageList: document.getElementById('language-list'),
    awardList: document.getElementById('award-list'),
    addExperienceBtn: document.getElementById('add-experience-btn'),
    addEducationBtn: document.getElementById('add-education-btn'),
    addProjectBtn: document.getElementById('add-project-btn'),
    addCertificationBtn: document.getElementById('add-certification-btn'),
    addLanguageBtn: document.getElementById('add-language-btn'),
    addAwardBtn: document.getElementById('add-award-btn'),
    technicalSkills: document.getElementById('technical-skills'),
    toolsSkills: document.getElementById('tools-skills'),
    softSkills: document.getElementById('soft-skills'),

    // Preview
    resumePreview: document.getElementById('resume-preview'),
    downloadBtn: document.getElementById('download-btn'),

    // Optimization Modal
    optimizationModal: document.getElementById('optimization-modal'),
    closeOptimizationModal: document.getElementById('close-optimization-modal'),
    beforeScore: document.getElementById('before-score'),
    afterScore: document.getElementById('after-score'),
    optimizedBullets: document.getElementById('optimized-bullets'),
    acceptAllBtn: document.getElementById('accept-all-btn'),
    reviewChangesBtn: document.getElementById('review-changes-btn'),

    // Auth Modal
    authModal: document.getElementById('auth-modal'),
    closeAuthModal: document.getElementById('close-auth-modal'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    showRegister: document.getElementById('show-register'),
    showLogin: document.getElementById('show-login'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),
    registerSubmitBtn: document.getElementById('register-submit-btn'),

    // Cover Letter Modal  
    coverLetterModal: document.getElementById('cover-letter-modal'),
    closeCLModal: document.getElementById('close-cl-modal'),
    generateCLBtn: document.getElementById('generate-cl-btn'),
    clForm: document.getElementById('cl-form'),
    clResult: document.getElementById('cl-result'),
    clLoading: document.getElementById('cl-loading'),
    exportCLPdfBtn: document.getElementById('export-cl-pdf-btn'),
    regenerateCLBtn: document.getElementById('regenerate-cl-btn'),
    copyCLBtn: document.getElementById('copy-cl-btn'),

    // PDF Loading Modal
    pdfLoadingModal: document.getElementById('pdf-loading-modal'),

    // Dashboard
    dashBuilderBtn: document.getElementById('dash-builder-btn'),
    dashBackBtn: document.getElementById('dash-back-btn'),
    dashLogoutBtn: document.getElementById('dash-logout-btn'),
    resumeCards: document.getElementById('resume-cards'),
    coverletterCards: document.getElementById('coverletter-cards'),
    emptyCreateBtn: document.getElementById('empty-create-btn'),
    saveProfileBtn: document.getElementById('save-profile-btn'),
    upgradeBtn: document.getElementById('upgrade-btn'),
    manageSubBtn: document.getElementById('manage-sub-btn'),
    proPlanBtn: document.getElementById('pro-plan-btn'),

    // Toast
    toastContainer: document.getElementById('toast-container')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setLoading(element, isLoading) {
    if (isLoading) {
        element.disabled = true;
        element.dataset.originalText = element.textContent;
        element.textContent = 'Loading...';
    } else {
        element.disabled = false;
        element.textContent = element.dataset.originalText || element.textContent;
    }
}

// ============================================
// API CALLS
// ============================================

function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
}

const api = {
    async createResume(data) {
        const res = await fetch(`${API_BASE_URL}/resumes`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async updateResume(id, data) {
        const res = await fetch(`${API_BASE_URL}/resumes/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async analyzeJD(jdText, resumeId) {
        const res = await fetch(`${API_BASE_URL}/ai/analyze-jd`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ jdText, resumeId })
        });
        return res.json();
    },

    async calculateATSScore(resumeId, targetKeywords, resumeData) {
        const res = await fetch(`${API_BASE_URL}/ai/score`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ resumeId, targetKeywords, resumeData })
        });
        return res.json();
    },

    async rewriteBullet(bulletPoint, keyword, context) {
        const res = await fetch(`${API_BASE_URL}/ai/rewrite`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ bulletPoint, keyword, context })
        });
        return res.json();
    },

    async optimizeResume(resumeId, jdText) {
        const res = await fetch(`${API_BASE_URL}/ai/optimize`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ resumeId, jdText })
        });
        return res.json();
    },

    async generateSummary(resumeId, resumeData, targetKeywords) {
        const res = await fetch(`${API_BASE_URL}/ai/summary`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ resumeId, resumeData, targetKeywords })
        });
        return res.json();
    },

    // Auth APIs
    async register(name, email, password) {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        return res.json();
    },

    async login(email, password) {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return res.json();
    },

    async getMe() {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: authHeaders()
        });
        return res.json();
    },

    async updateProfile(data) {
        const res = await fetch(`${API_BASE_URL}/auth/update-profile`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    // Dashboard APIs
    async getDashboard() {
        const res = await fetch(`${API_BASE_URL}/dashboard`, {
            headers: authHeaders()
        });
        return res.json();
    },

    async deleteResume(id) {
        const res = await fetch(`${API_BASE_URL}/dashboard/resumes/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        return res.json();
    },

    // Cover Letter APIs  
    async generateCoverLetter(data) {
        const res = await fetch(`${API_BASE_URL}/ai/generate-cover-letter`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async getCoverLetters() {
        const res = await fetch(`${API_BASE_URL}/cover-letter`, {
            headers: authHeaders()
        });
        return res.json();
    },

    async deleteCoverLetter(id) {
        const res = await fetch(`${API_BASE_URL}/cover-letter/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        return res.json();
    },

    // PDF APIs
    async generatePDF(resumeData, templateId) {
        const res = await fetch(`${API_BASE_URL}/resume/generate-pdf`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ resumeData, templateId: templateId || 'professional' })
        });
        return res.json();
    },

    // Subscription APIs
    async createCheckout(planType) {
        const res = await fetch(`${API_BASE_URL}/subscription/create-checkout`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ planType })
        });
        return res.json();
    },

    async getSubscriptionStatus() {
        const res = await fetch(`${API_BASE_URL}/subscription/status`, {
            headers: authHeaders()
        });
        return res.json();
    }
};

// ============================================
// PAGE NAVIGATION
// ============================================

function hideAllPages() {
    elements.landingPage.classList.add('hidden');
    elements.builderApp.classList.add('hidden');
    elements.dashboardApp.classList.add('hidden');
    document.body.style.overflow = '';
}

function showBuilder() {
    hideAllPages();
    elements.builderApp.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Initialize with empty experience if none exists
    const state = store.getState();
    if (state.experience.length === 0) {
        addExperience();
    }
    if (state.education.length === 0) {
        addEducation();
    }
}

function showLanding() {
    hideAllPages();
    elements.landingPage.classList.remove('hidden');
}

function showDashboard() {
    if (!authToken) {
        openAuthModal();
        return;
    }
    hideAllPages();
    elements.dashboardApp.classList.remove('hidden');
    loadDashboard();
}

// ============================================
// EXPERIENCE MANAGEMENT
// ============================================

function addExperience() {
    store.setState(state => {
        state.experience.push({
            id: generateId(),
            company: '',
            role: '',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            bullets: [
                { id: generateId(), original: '', rewritten: null, isAIRewritten: false, accepted: false }
            ]
        });
        return state;
    });
}

function updateExperience(expId, field, value) {
    // Use setSilent to avoid re-rendering input fields while typing
    store.setSilent(state => {
        const exp = state.experience.find(e => e.id === expId);
        if (exp) exp[field] = value;
        return state;
    });
}

function deleteExperience(expId) {
    store.setState(state => {
        state.experience = state.experience.filter(e => e.id !== expId);
        return state;
    });
}

function addBullet(expId) {
    store.setState(state => {
        const exp = state.experience.find(e => e.id === expId);
        if (exp && exp.bullets.length < 8) {
            exp.bullets.push({
                id: generateId(),
                original: '',
                rewritten: null,
                isAIRewritten: false,
                accepted: false
            });
        }
        return state;
    });
}

function updateBullet(expId, bulletId, value) {
    // Use setSilent to avoid re-rendering input fields while typing
    store.setSilent(state => {
        const exp = state.experience.find(e => e.id === expId);
        if (exp) {
            const bullet = exp.bullets.find(b => b.id === bulletId);
            if (bullet) bullet.original = value;
        }
        return state;
    });
}

function deleteBullet(expId, bulletId) {
    store.setState(state => {
        const exp = state.experience.find(e => e.id === expId);
        if (exp) {
            exp.bullets = exp.bullets.filter(b => b.id !== bulletId);
        }
        return state;
    });
}

async function rewriteBulletWithAI(expId, bulletId) {
    const state = store.getState();
    const exp = state.experience.find(e => e.id === expId);
    const bullet = exp?.bullets.find(b => b.id === bulletId);

    if (!bullet?.original) {
        showToast('Please enter a bullet point first', 'error');
        return;
    }

    const keywords = state.atsData.missingKeywords || [];
    const keyword = keywords[0] || '';
    const context = `${exp.role} at ${exp.company}`;

    try {
        const result = await api.rewriteBullet(bullet.original, keyword, context);
        if (result.success) {
            store.setState(s => {
                const e = s.experience.find(x => x.id === expId);
                const b = e?.bullets.find(x => x.id === bulletId);
                if (b) {
                    b.rewritten = result.data.rewritten;
                    b.isAIRewritten = true;
                    b.injectedKeywords = keyword ? [keyword] : [];
                }
                return s;
            });
            showToast('Bullet rewritten successfully!', 'success');
        } else {
            showToast(result.message || 'Failed to rewrite', 'error');
        }
    } catch (err) {
        showToast('AI rewrite failed. Check if backend is running.', 'error');
    }
}

function acceptBulletRewrite(expId, bulletId) {
    store.setState(state => {
        const exp = state.experience.find(e => e.id === expId);
        const bullet = exp?.bullets.find(b => b.id === bulletId);
        if (bullet && bullet.rewritten) {
            bullet.accepted = true;
        }
        return state;
    });
    showToast('Rewrite accepted!', 'success');
}

function rejectBulletRewrite(expId, bulletId) {
    store.setState(state => {
        const exp = state.experience.find(e => e.id === expId);
        const bullet = exp?.bullets.find(b => b.id === bulletId);
        if (bullet) {
            bullet.rewritten = null;
            bullet.isAIRewritten = false;
            bullet.accepted = false;
            bullet.injectedKeywords = [];
        }
        return state;
    });
    showToast('Rewrite rejected', 'info');
}

// ============================================
// EDUCATION MANAGEMENT
// ============================================

function addEducation() {
    store.setState(state => {
        state.education.push({
            id: generateId(),
            school: '',
            degree: '',
            fieldOfStudy: '',
            startDate: '',
            endDate: '',
            gpa: ''
        });
        return state;
    });
}

function updateEducation(eduId, field, value) {
    // Use setSilent to avoid re-rendering input fields while typing
    store.setSilent(state => {
        const edu = state.education.find(e => e.id === eduId);
        if (edu) edu[field] = value;
        return state;
    });
}

function deleteEducation(eduId) {
    store.setState(state => {
        state.education = state.education.filter(e => e.id !== eduId);
        return state;
    });
}

// ============================================
// PERSONAL INFO & SKILLS
// ============================================

function updatePersonalInfo(field, value) {
    store.setState(state => {
        state.personalInfo[field] = value;
        return state;
    });
}

function updateSkills(category, value) {
    store.setState(state => {
        state.skills[category] = value.split(',').map(s => s.trim()).filter(s => s);
        return state;
    });
}

// ============================================
// PROJECTS MANAGEMENT
// ============================================

function addProject() {
    store.setState(state => {
        state.projects.push({
            id: generateId(),
            title: '',
            description: '',
            technologies: '',
            link: '',
            startDate: '',
            endDate: ''
        });
        return state;
    });
}

function updateProject(projId, field, value) {
    store.setSilent(state => {
        const proj = state.projects.find(p => p.id === projId);
        if (proj) proj[field] = value;
        return state;
    });
}

function deleteProject(projId) {
    store.setState(state => {
        state.projects = state.projects.filter(p => p.id !== projId);
        return state;
    });
}

// ============================================
// CERTIFICATIONS MANAGEMENT
// ============================================

function addCertification() {
    store.setState(state => {
        state.certifications.push({
            id: generateId(),
            name: '',
            issuer: '',
            date: '',
            credentialId: '',
            url: ''
        });
        return state;
    });
}

function updateCertification(certId, field, value) {
    store.setSilent(state => {
        const cert = state.certifications.find(c => c.id === certId);
        if (cert) cert[field] = value;
        return state;
    });
}

function deleteCertification(certId) {
    store.setState(state => {
        state.certifications = state.certifications.filter(c => c.id !== certId);
        return state;
    });
}

// ============================================
// LANGUAGES MANAGEMENT
// ============================================

function addLanguage() {
    store.setState(state => {
        state.languages.push({
            id: generateId(),
            language: '',
            proficiency: 'Intermediate'
        });
        return state;
    });
}

function updateLanguage(langId, field, value) {
    store.setSilent(state => {
        const lang = state.languages.find(l => l.id === langId);
        if (lang) lang[field] = value;
        return state;
    });
}

function deleteLanguage(langId) {
    store.setState(state => {
        state.languages = state.languages.filter(l => l.id !== langId);
        return state;
    });
}

// ============================================
// AWARDS MANAGEMENT
// ============================================

function addAward() {
    store.setState(state => {
        state.awards.push({
            id: generateId(),
            title: '',
            issuer: '',
            date: '',
            description: ''
        });
        return state;
    });
}

function updateAward(awardId, field, value) {
    store.setSilent(state => {
        const award = state.awards.find(a => a.id === awardId);
        if (award) award[field] = value;
        return state;
    });
}

function deleteAward(awardId) {
    store.setState(state => {
        state.awards = state.awards.filter(a => a.id !== awardId);
        return state;
    });
}

// ============================================
// JD ANALYSIS
// ============================================

async function analyzeJobDescription() {
    const jdText = elements.jdInput.value.trim();
    if (!jdText) {
        showToast('Please enter a job description', 'error');
        return;
    }

    setLoading(elements.analyzeJdBtn, true);

    try {
        const result = await api.analyzeJD(jdText, store.getState().resumeId);

        if (result.success) {
            store.setState(state => {
                state.atsData.targetJD = jdText;
                state.atsData.extractedKeywords = result.data.keywords;
                return state;
            });

            // Display keywords
            displayKeywords(result.data.keywords);
            elements.keywordsDisplay.classList.remove('hidden');

            showToast(`Extracted ${result.data.totalKeywords} keywords!`, 'success');

            // Auto-calculate ATS score
            await calculateATSScore();
        } else {
            showToast(result.message || 'Analysis failed', 'error');
        }
    } catch (err) {
        showToast('Failed to analyze JD. Is the backend running?', 'error');
    } finally {
        setLoading(elements.analyzeJdBtn, false);
    }
}

function displayKeywords(keywords) {
    elements.techKeywords.innerHTML = (keywords.technicalSkills || [])
        .map(k => `<span class="keyword-tag">${k}</span>`)
        .join('');

    elements.toolKeywords.innerHTML = (keywords.tools || [])
        .map(k => `<span class="keyword-tag">${k}</span>`)
        .join('');
}

// ============================================
// ATS SCORING
// ============================================

async function calculateATSScore() {
    const state = store.getState();
    if (!state.atsData.extractedKeywords) {
        return;
    }

    try {
        const result = await api.calculateATSScore(
            state.resumeId,
            state.atsData.extractedKeywords,
            state
        );

        if (result.success) {
            store.setState(s => {
                s.atsData.atsScore = result.data.atsScore;
                s.atsData.matchedKeywords = result.data.matchedKeywords;
                s.atsData.missingKeywords = result.data.missingKeywords;
                return s;
            });

            // Update display
            elements.atsScoreDisplay.textContent = result.data.atsScore + '%';
            elements.atsScoreDisplay.style.color =
                result.data.atsScore >= 70 ? '#10b981' :
                    result.data.atsScore >= 40 ? '#f59e0b' : '#ef4444';
        }
    } catch (err) {
        console.error('ATS Score calculation failed:', err);
    }
}

// ============================================
// MAGIC BUTTON OPTIMIZATION (ENHANCED)
// ============================================

async function runMagicOptimization() {
    const state = store.getState();

    if (!state.atsData.targetJD) {
        showToast('Please analyze a job description first', 'error');
        return;
    }

    if (state.experience.length === 0 || !state.experience[0].bullets[0]?.original) {
        showToast('Please add some experience with bullet points first', 'error');
        return;
    }

    setLoading(elements.magicBtn, true);
    elements.magicBtn.textContent = '✨ Optimizing...';
    showToast('🚀 Starting AI optimization... This may take a moment.', 'info');

    try {
        // First, save the resume to get an ID
        let resumeId = state.resumeId;

        if (!resumeId) {
            const createResult = await api.createResume({
                personalInfo: state.personalInfo,
                experience: state.experience.map(e => ({
                    ...e,
                    bullets: e.bullets.map(b => ({
                        original: b.original,
                        rewritten: b.rewritten,
                        isAIRewritten: b.isAIRewritten,
                        accepted: b.accepted
                    }))
                })),
                education: state.education,
                projects: state.projects || [],
                skills: state.skills
            });

            if (createResult.success) {
                resumeId = createResult.data._id;
                store.setState(s => { s.resumeId = resumeId; return s; });
            } else {
                showToast(createResult.message || 'Failed to save resume for optimization', 'error');
                return;
            }
        }

        // Final check for resumeId
        if (!resumeId) {
            showToast('Resume ID missing. Please try again.', 'error');
            return;
        }

        // Run optimization
        const result = await api.optimizeResume(resumeId, state.atsData.targetJD);

        if (result.success) {
            // Update state with ALL optimized content
            store.setState(s => {
                // Update all optimized bullets
                result.data.optimizedBullets.forEach(opt => {
                    const exp = s.experience[opt.experienceIndex];
                    if (exp && exp.bullets[opt.bulletIndex]) {
                        exp.bullets[opt.bulletIndex].rewritten = opt.rewritten;
                        exp.bullets[opt.bulletIndex].isAIRewritten = true;
                        exp.bullets[opt.bulletIndex].accepted = true; // Auto-accept
                        exp.bullets[opt.bulletIndex].injectedKeywords = opt.allInjectedKeywords || [opt.injectedKeyword];
                        // Update original to show the rewritten version
                        exp.bullets[opt.bulletIndex].original = opt.rewritten;
                    }
                });

                // Update summary if provided
                if (result.data.summary) {
                    s.personalInfo.summary = result.data.summary;
                }

                // Update skills with added ones
                if (result.data.skillsAdded) {
                    if (result.data.skillsAdded.technical && result.data.skillsAdded.technical.length > 0) {
                        s.skills.technical = [...(s.skills.technical || []), ...result.data.skillsAdded.technical];
                    }
                    if (result.data.skillsAdded.tools && result.data.skillsAdded.tools.length > 0) {
                        s.skills.tools = [...(s.skills.tools || []), ...result.data.skillsAdded.tools];
                    }
                    if (result.data.skillsAdded.soft && result.data.skillsAdded.soft.length > 0) {
                        s.skills.soft = [...(s.skills.soft || []), ...result.data.skillsAdded.soft];
                    }
                    // Methodologies are already added to technical on backend, but if sent separately we can track them
                    // No need to duplicate as backend handles the merge into technical/tools
                }

                // Update ATS data
                s.atsData.atsScore = result.data.newScore;
                s.atsData.matchedKeywords = result.data.matchedKeywords || [];
                s.atsData.missingKeywords = result.data.missingKeywords || [];

                return s;
            });

            // Update UI elements
            if (result.data.summary && elements.summary) {
                elements.summary.value = result.data.summary;
            }

            // Update skills inputs if they exist
            if (elements.technicalSkills) {
                const state = store.getState();
                elements.technicalSkills.value = state.skills.technical.join(', ');
            }
            if (elements.toolsSkills) {
                const state = store.getState();
                elements.toolsSkills.value = state.skills.tools.join(', ');
            }

            // Show optimization modal with enhanced results
            showOptimizationResults(result.data);
        } else {
            showToast(result.message || 'Optimization failed', 'error');
        }
    } catch (err) {
        console.error('Magic optimization failed:', err);
        showToast('Optimization failed. Check backend connection.', 'error');
    } finally {
        setLoading(elements.magicBtn, false);
        elements.magicBtn.textContent = '✨ Magic Optimize';
    }
}

function showOptimizationResults(data) {
    elements.beforeScore.textContent = data.initialScore + '%';
    elements.afterScore.textContent = data.newScore + '%';

    // Add improvement indicator
    const improvement = data.improvement || (data.newScore - data.initialScore);

    // Build enhanced results display
    let resultsHTML = '';

    // Show skills added section if any
    const skills = data.skillsAdded || {};
    const hasSkills = (skills.technical?.length > 0) ||
        (skills.tools?.length > 0) ||
        (skills.soft?.length > 0) ||
        (skills.methodologies?.length > 0);

    if (hasSkills) {
        resultsHTML += `
            <div class="optimization-section skills-added">
                <h4>🎯 Skills Added to Your Resume</h4>
                <div class="added-skills-list">
                    ${(skills.technical || []).map(s => `<span class="skill-tag technical" title="Technical Skill">${s}</span>`).join('')}
                    ${(skills.tools || []).map(s => `<span class="skill-tag tool" title="Tool">${s}</span>`).join('')}
                    ${(skills.soft || []).map(s => `<span class="skill-tag soft" title="Soft Skill">${s}</span>`).join('')}
                    ${(skills.methodologies || []).map(s => `<span class="skill-tag methodology" title="Methodology">${s}</span>`).join('')}
                </div>
            </div>
        `;
    }

    // Show summary if generated
    if (data.summary) {
        resultsHTML += `
            <div class="optimization-section summary-preview">
                <h4>📝 Optimized Professional Summary</h4>
                <p class="summary-text">${data.summary}</p>
            </div>
        `;
    }

    // Show optimized bullets (limit to first 5 for readability)
    const bulletsToShow = data.optimizedBullets.slice(0, 5);
    resultsHTML += `
        <div class="optimization-section bullets-preview">
            <h4>✨ Optimized Experience Bullets (${data.optimizedBullets.length} total)</h4>
            ${bulletsToShow.map(opt => `
                <div class="optimized-bullet-item">
                    <div class="bullet-version">
                        <div class="bullet-version-label">Original</div>
                        <div class="bullet-original">${opt.original}</div>
                    </div>
                    <div class="bullet-version">
                        <div class="bullet-version-label">AI Optimized</div>
                        <div class="bullet-rewritten">${opt.rewritten}</div>
                        <div class="injected-keywords">
                            ${(opt.allInjectedKeywords || [opt.injectedKeyword]).map(k => `<span class="injected-keyword">+${k}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `).join('')}
            ${data.optimizedBullets.length > 5 ? `<p class="more-bullets">... and ${data.optimizedBullets.length - 5} more bullets optimized!</p>` : ''}
        </div>
    `;

    elements.optimizedBullets.innerHTML = resultsHTML;
    elements.optimizationModal.classList.remove('hidden');

    // Update score display with color
    elements.atsScoreDisplay.textContent = data.newScore + '%';
    elements.atsScoreDisplay.style.color =
        data.newScore >= 70 ? '#10b981' :
            data.newScore >= 40 ? '#f59e0b' : '#ef4444';

    // Show success message
    showToast(`🎯 ATS Score improved from ${data.initialScore}% to ${data.newScore}% (+${improvement}%)`, 'success');
}

function closeOptimizationModal() {
    elements.optimizationModal.classList.add('hidden');
}

function acceptAllOptimizations() {
    store.setState(state => {
        state.experience.forEach(exp => {
            exp.bullets.forEach(bullet => {
                if (bullet.rewritten && bullet.isAIRewritten) {
                    bullet.accepted = true;
                    // Update original to show rewritten version in preview
                    bullet.original = bullet.rewritten;
                }
            });
        });
        return state;
    });
    closeOptimizationModal();
    showToast('🎉 All optimizations accepted! Your resume is now ATS-optimized.', 'success');
}

// ============================================
// SUMMARY GENERATION
// ============================================

async function generateSummary() {
    const state = store.getState();
    setLoading(elements.generateSummaryBtn, true);

    try {
        const keywords = state.atsData.extractedKeywords ? [
            ...(state.atsData.extractedKeywords.technicalSkills || []).slice(0, 3),
            ...(state.atsData.extractedKeywords.tools || []).slice(0, 2)
        ] : [];

        const result = await api.generateSummary(null, state, keywords);

        if (result.success) {
            elements.summary.value = result.data.summary;
            updatePersonalInfo('summary', result.data.summary);
            showToast('Summary generated!', 'success');
        } else {
            showToast(result.message || 'Failed to generate summary', 'error');
        }
    } catch (err) {
        showToast('Failed to generate summary', 'error');
    } finally {
        setLoading(elements.generateSummaryBtn, false);
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderExperienceList(experience) {
    elements.experienceList.innerHTML = experience.map(exp => `
        <div class="experience-item" data-id="${exp.id}">
            <div class="item-header">
                <div class="item-info">
                    <input type="text" class="role-input" placeholder="Job Title" 
                           value="${exp.role}" data-field="role">
                    <input type="text" class="company-input" placeholder="Company Name" 
                           value="${exp.company}" data-field="company">
                    <div class="item-dates">
                        <input type="text" placeholder="Start" value="${exp.startDate}" data-field="startDate">
                        <input type="text" placeholder="End" value="${exp.endDate}" data-field="endDate">
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-sm btn-danger delete-exp-btn">×</button>
                </div>
            </div>
            <div class="bullets-container">
                ${exp.bullets.map(bullet => `
                    <div class="bullet-item ${bullet.isAIRewritten ? 'ai-rewritten' : ''}" data-bullet-id="${bullet.id}">
                        <span class="bullet-marker">•</span>
                        <div class="bullet-content">
                            <textarea placeholder="Describe your achievement..." 
                                      rows="2">${bullet.accepted && bullet.rewritten ? bullet.rewritten : bullet.original}</textarea>
                            ${bullet.isAIRewritten && bullet.rewritten && !bullet.accepted ? `
                                <div class="bullet-rewrite-preview">
                                    <small>AI Suggestion: ${bullet.rewritten}</small>
                                    <button class="btn-sm accept-rewrite-btn" style="margin-left: 8px;">✓</button>
                                    <button class="btn-sm reject-rewrite-btn">×</button>
                                </div>
                            ` : ''}
                        </div>
                        <div class="bullet-actions">
                            <button class="rewrite-bullet-btn" title="AI Rewrite">✨</button>
                            <button class="delete-bullet-btn" title="Delete">🗑</button>
                        </div>
                    </div>
                `).join('')}
                <button class="add-bullet-btn" data-exp-id="${exp.id}">+ Add Bullet Point</button>
            </div>
        </div>
    `).join('');

    // Attach event listeners
    elements.experienceList.querySelectorAll('.experience-item').forEach(item => {
        const expId = item.dataset.id;

        // Field updates
        item.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('input', () => {
                updateExperience(expId, input.dataset.field, input.value);
            });
        });

        // Delete experience
        item.querySelector('.delete-exp-btn')?.addEventListener('click', () => {
            deleteExperience(expId);
        });

        // Bullet operations
        item.querySelectorAll('.bullet-item').forEach(bulletEl => {
            const bulletId = bulletEl.dataset.bulletId;

            bulletEl.querySelector('textarea')?.addEventListener('input', (e) => {
                updateBullet(expId, bulletId, e.target.value);
            });

            bulletEl.querySelector('.rewrite-bullet-btn')?.addEventListener('click', () => {
                rewriteBulletWithAI(expId, bulletId);
            });

            bulletEl.querySelector('.delete-bullet-btn')?.addEventListener('click', () => {
                deleteBullet(expId, bulletId);
            });

            bulletEl.querySelector('.accept-rewrite-btn')?.addEventListener('click', () => {
                acceptBulletRewrite(expId, bulletId);
            });

            bulletEl.querySelector('.reject-rewrite-btn')?.addEventListener('click', () => {
                rejectBulletRewrite(expId, bulletId);
            });
        });

        // Add bullet
        item.querySelector('.add-bullet-btn')?.addEventListener('click', () => {
            addBullet(expId);
        });
    });
}

function renderEducationList(education) {
    elements.educationList.innerHTML = education.map(edu => `
        <div class="education-item" data-id="${edu.id}">
            <div class="item-header">
                <div class="item-info">
                    <input type="text" class="role-input" placeholder="Degree" 
                           value="${edu.degree}" data-field="degree">
                    <input type="text" class="company-input" placeholder="School/University" 
                           value="${edu.school}" data-field="school">
                    <div class="item-dates">
                        <input type="text" placeholder="Start" value="${edu.startDate}" data-field="startDate">
                        <input type="text" placeholder="End" value="${edu.endDate}" data-field="endDate">
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-sm btn-danger delete-edu-btn">×</button>
                </div>
            </div>
        </div>
    `).join('');

    // Attach event listeners
    elements.educationList.querySelectorAll('.education-item').forEach(item => {
        const eduId = item.dataset.id;

        item.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('input', () => {
                updateEducation(eduId, input.dataset.field, input.value);
            });
        });

        item.querySelector('.delete-edu-btn')?.addEventListener('click', () => {
            deleteEducation(eduId);
        });
    });
}

function renderProjectList(projects) {
    if (!elements.projectList) return;
    elements.projectList.innerHTML = projects.map(proj => `
        <div class="project-item" data-id="${proj.id}" style="border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 0.75rem; background: #f9fafb;">
            <div class="item-header">
                <div class="item-info">
                    <input type="text" class="role-input" placeholder="Project Title" 
                           value="${proj.title}" data-field="title">
                    <input type="text" class="company-input" placeholder="Technologies Used (e.g. React, Node.js)" 
                           value="${proj.technologies}" data-field="technologies">
                    <div class="item-dates">
                        <input type="text" placeholder="Start" value="${proj.startDate}" data-field="startDate">
                        <input type="text" placeholder="End" value="${proj.endDate}" data-field="endDate">
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-sm btn-danger delete-proj-btn">×</button>
                </div>
            </div>
            <textarea class="proj-description" placeholder="Describe the project and your contributions..." rows="2"
                style="width:100%; margin-top:0.5rem; padding:0.5rem; border:1px solid #e5e7eb; border-radius:0.375rem; font-size:0.875rem; resize:none; background:#fff;">${proj.description}</textarea>
            <input type="text" class="proj-link" placeholder="Project Link (optional)" value="${proj.link || ''}"
                data-field="link" style="width:100%; margin-top:0.5rem; padding:0.5rem; border:1px solid #e5e7eb; border-radius:0.375rem; font-size:0.875rem; background:#fff;">
        </div>
    `).join('');

    elements.projectList.querySelectorAll('.project-item').forEach(item => {
        const projId = item.dataset.id;
        item.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('input', () => updateProject(projId, input.dataset.field, input.value));
        });
        item.querySelector('.proj-description')?.addEventListener('input', (e) => {
            updateProject(projId, 'description', e.target.value);
        });
        item.querySelector('.proj-link')?.addEventListener('input', (e) => {
            updateProject(projId, 'link', e.target.value);
        });
        item.querySelector('.delete-proj-btn')?.addEventListener('click', () => deleteProject(projId));
    });
}

function renderCertificationList(certifications) {
    if (!elements.certificationList) return;
    elements.certificationList.innerHTML = certifications.map(cert => `
        <div class="certification-item" data-id="${cert.id}" style="border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 0.75rem; background: #f9fafb;">
            <div class="item-header">
                <div class="item-info">
                    <input type="text" class="role-input" placeholder="Certification Name" 
                           value="${cert.name}" data-field="name">
                    <input type="text" class="company-input" placeholder="Issuing Organization" 
                           value="${cert.issuer}" data-field="issuer">
                    <div class="item-dates">
                        <input type="text" placeholder="Date" value="${cert.date}" data-field="date">
                        <input type="text" placeholder="Credential ID" value="${cert.credentialId || ''}" data-field="credentialId">
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-sm btn-danger delete-cert-btn">×</button>
                </div>
            </div>
        </div>
    `).join('');

    elements.certificationList.querySelectorAll('.certification-item').forEach(item => {
        const certId = item.dataset.id;
        item.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('input', () => updateCertification(certId, input.dataset.field, input.value));
        });
        item.querySelector('.delete-cert-btn')?.addEventListener('click', () => deleteCertification(certId));
    });
}

function renderLanguageList(languages) {
    if (!elements.languageList) return;
    elements.languageList.innerHTML = languages.map(lang => `
        <div class="language-item" data-id="${lang.id}" style="display:flex; gap:0.75rem; align-items:center; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 0.5rem; background: #f9fafb;">
            <input type="text" placeholder="Language" value="${lang.language}" data-field="language"
                style="flex:1; padding:0.5rem; border:1px solid #e5e7eb; border-radius:0.375rem; font-size:0.875rem; background:#fff;">
            <select data-field="proficiency" style="padding:0.5rem; border:1px solid #e5e7eb; border-radius:0.375rem; font-size:0.875rem; background:#fff;">
                <option value="Native" ${lang.proficiency === 'Native' ? 'selected' : ''}>Native</option>
                <option value="Fluent" ${lang.proficiency === 'Fluent' ? 'selected' : ''}>Fluent</option>
                <option value="Advanced" ${lang.proficiency === 'Advanced' ? 'selected' : ''}>Advanced</option>
                <option value="Intermediate" ${lang.proficiency === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                <option value="Basic" ${lang.proficiency === 'Basic' ? 'selected' : ''}>Basic</option>
            </select>
            <button class="btn-sm btn-danger delete-lang-btn" style="padding:0.25rem 0.5rem; border-radius:0.375rem; color:#ef4444; border:1px solid #fecaca; cursor:pointer;">×</button>
        </div>
    `).join('');

    elements.languageList.querySelectorAll('.language-item').forEach(item => {
        const langId = item.dataset.id;
        item.querySelectorAll('[data-field]').forEach(input => {
            input.addEventListener('input', () => updateLanguage(langId, input.dataset.field, input.value));
            input.addEventListener('change', () => updateLanguage(langId, input.dataset.field, input.value));
        });
        item.querySelector('.delete-lang-btn')?.addEventListener('click', () => deleteLanguage(langId));
    });
}

function renderAwardList(awards) {
    if (!elements.awardList) return;
    elements.awardList.innerHTML = awards.map(award => `
        <div class="award-item" data-id="${award.id}" style="border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 0.75rem; background: #f9fafb;">
            <div class="item-header">
                <div class="item-info">
                    <input type="text" class="role-input" placeholder="Award / Achievement Title" 
                           value="${award.title}" data-field="title">
                    <input type="text" class="company-input" placeholder="Issuing Organization" 
                           value="${award.issuer}" data-field="issuer">
                    <div class="item-dates">
                        <input type="text" placeholder="Date" value="${award.date}" data-field="date">
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-sm btn-danger delete-award-btn">×</button>
                </div>
            </div>
            <textarea class="award-description" placeholder="Brief description (optional)" rows="2"
                style="width:100%; margin-top:0.5rem; padding:0.5rem; border:1px solid #e5e7eb; border-radius:0.375rem; font-size:0.875rem; resize:none; background:#fff;">${award.description || ''}</textarea>
        </div>
    `).join('');

    elements.awardList.querySelectorAll('.award-item').forEach(item => {
        const awardId = item.dataset.id;
        item.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('input', () => updateAward(awardId, input.dataset.field, input.value));
        });
        item.querySelector('.award-description')?.addEventListener('input', (e) => {
            updateAward(awardId, 'description', e.target.value);
        });
        item.querySelector('.delete-award-btn')?.addEventListener('click', () => deleteAward(awardId));
    });
}

function renderResumePreview(state) {
    const { personalInfo, experience, education, projects, certifications, languages, awards, skills } = state;

    // Check if there's any content
    const hasContent = personalInfo.fullName || experience.some(e => e.role || e.company);

    if (!hasContent) {
        elements.resumePreview.innerHTML = `
            <div class="preview-placeholder">
                <p>Start filling in your details to see the live preview</p>
            </div>
        `;
        return;
    }

    elements.resumePreview.innerHTML = `
        <div class="resume-document">
            <div class="resume-header">
                <h1>${personalInfo.fullName || 'Your Name'}</h1>
                <div class="resume-contact">
                    ${personalInfo.email ? `<span>📧 ${personalInfo.email}</span>` : ''}
                    ${personalInfo.phone ? `<span>📱 ${personalInfo.phone}</span>` : ''}
                    ${personalInfo.location ? `<span>📍 ${personalInfo.location}</span>` : ''}
                    ${personalInfo.linkedin ? `<span>🔗 LinkedIn</span>` : ''}
                    ${personalInfo.github ? `<span>💻 GitHub</span>` : ''}
                    ${personalInfo.portfolio ? `<span>🌐 Portfolio</span>` : ''}
                </div>
            </div>

            ${personalInfo.summary ? `
                <div class="resume-summary">
                    ${personalInfo.summary}
                </div>
            ` : ''}

            ${experience.some(e => e.role || e.company) ? `
                <div class="resume-section">
                    <h2 class="resume-section-title">Experience</h2>
                    ${experience.filter(e => e.role || e.company).map(exp => `
                        <div class="resume-experience-item">
                            <div class="resume-item-header">
                                <div>
                                    <span class="resume-role">${exp.role || 'Position'}</span>
                                    <span class="resume-company"> | ${exp.company || 'Company'}</span>
                                </div>
                                <span class="resume-dates">${exp.startDate}${exp.endDate ? ' - ' + exp.endDate : ''}</span>
                            </div>
                            <ul class="resume-bullets">
                                ${exp.bullets.filter(b => b.original || b.rewritten).map(b => `
                                    <li>${b.accepted && b.rewritten ? b.rewritten : b.original}</li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${education.some(e => e.degree || e.school) ? `
                <div class="resume-section">
                    <h2 class="resume-section-title">Education</h2>
                    ${education.filter(e => e.degree || e.school).map(edu => `
                        <div class="resume-education-item">
                            <div class="resume-item-header">
                                <div>
                                    <span class="resume-role">${edu.degree || 'Degree'}</span>
                                    <span class="resume-company"> | ${edu.school || 'Institution'}</span>
                                </div>
                                <span class="resume-dates">${edu.startDate}${edu.endDate ? ' - ' + edu.endDate : ''}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${projects && projects.some(p => p.title) ? `
                <div class="resume-section">
                    <h2 class="resume-section-title">Projects</h2>
                    ${projects.filter(p => p.title).map(proj => `
                        <div class="resume-experience-item">
                            <div class="resume-item-header">
                                <div>
                                    <span class="resume-role">${proj.title}</span>
                                    ${proj.technologies ? `<span class="resume-company"> | ${proj.technologies}</span>` : ''}
                                </div>
                                <span class="resume-dates">${proj.startDate || ''}${proj.endDate ? ' - ' + proj.endDate : ''}</span>
                            </div>
                            ${proj.description ? `<p style="font-size:0.8rem; color:#4b5563; margin-top:4px; line-height:1.4;">${proj.description}</p>` : ''}
                            ${proj.link ? `<a href="${proj.link}" style="font-size:0.75rem; color:#135bec; text-decoration:none;">🔗 ${proj.link}</a>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${skills.technical.length > 0 || skills.tools.length > 0 || skills.soft?.length > 0 ? `
                <div class="resume-section">
                    <h2 class="resume-section-title">Skills</h2>
                    ${skills.technical.length > 0 ? `
                        <div style="margin-bottom:6px;">
                            <span style="font-size:0.75rem; font-weight:700; color:#374151;">Technical: </span>
                            <span style="font-size:0.75rem; color:#4b5563;">${skills.technical.join(', ')}</span>
                        </div>
                    ` : ''}
                    ${skills.tools.length > 0 ? `
                        <div style="margin-bottom:6px;">
                            <span style="font-size:0.75rem; font-weight:700; color:#374151;">Tools: </span>
                            <span style="font-size:0.75rem; color:#4b5563;">${skills.tools.join(', ')}</span>
                        </div>
                    ` : ''}
                    ${skills.soft?.length > 0 ? `
                        <div style="margin-bottom:6px;">
                            <span style="font-size:0.75rem; font-weight:700; color:#374151;">Soft Skills: </span>
                            <span style="font-size:0.75rem; color:#4b5563;">${skills.soft.join(', ')}</span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            ${certifications && certifications.some(c => c.name) ? `
                <div class="resume-section">
                    <h2 class="resume-section-title">Certifications</h2>
                    ${certifications.filter(c => c.name).map(cert => `
                        <div class="resume-education-item">
                            <div class="resume-item-header">
                                <div>
                                    <span class="resume-role">${cert.name}</span>
                                    ${cert.issuer ? `<span class="resume-company"> | ${cert.issuer}</span>` : ''}
                                </div>
                                <span class="resume-dates">${cert.date || ''}</span>
                            </div>
                            ${cert.credentialId ? `<p style="font-size:0.7rem; color:#6b7280;">Credential ID: ${cert.credentialId}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${languages && languages.some(l => l.language) ? `
                <div class="resume-section">
                    <h2 class="resume-section-title">Languages</h2>
                    <div style="display:flex; flex-wrap:wrap; gap:12px;">
                        ${languages.filter(l => l.language).map(lang => `
                            <span style="font-size:0.8rem; color:#374151;"><strong>${lang.language}</strong> — ${lang.proficiency}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${awards && awards.some(a => a.title) ? `
                <div class="resume-section">
                    <h2 class="resume-section-title">Awards & Achievements</h2>
                    ${awards.filter(a => a.title).map(award => `
                        <div class="resume-education-item">
                            <div class="resume-item-header">
                                <div>
                                    <span class="resume-role">${award.title}</span>
                                    ${award.issuer ? `<span class="resume-company"> | ${award.issuer}</span>` : ''}
                                </div>
                                <span class="resume-dates">${award.date || ''}</span>
                            </div>
                            ${award.description ? `<p style="font-size:0.75rem; color:#4b5563; margin-top:2px;">${award.description}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// MAIN RENDER & STATE SUBSCRIPTION
// ============================================

function render(state) {
    renderExperienceList(state.experience);
    renderEducationList(state.education);
    renderProjectList(state.projects || []);
    renderCertificationList(state.certifications || []);
    renderLanguageList(state.languages || []);
    renderAwardList(state.awards || []);
    renderResumePreview(state);
}

// Subscribe to state changes
store.subscribe(render);

// ============================================
// AUTH FUNCTIONS
// ============================================

function openAuthModal(showRegisterFirst = false) {
    elements.authModal.classList.remove('hidden');
    if (showRegisterFirst) {
        elements.loginForm.classList.add('hidden');
        elements.registerForm.classList.remove('hidden');
    } else {
        elements.loginForm.classList.remove('hidden');
        elements.registerForm.classList.add('hidden');
    }
}

function closeAuthModal() {
    elements.authModal.classList.add('hidden');
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }

    setLoading(elements.loginSubmitBtn, true);
    try {
        const result = await api.login(email, password);
        if (result.success) {
            authToken = result.token;
            currentUser = result.data || { email };
            localStorage.setItem('cf_token', authToken);
            localStorage.setItem('cf_user', JSON.stringify(currentUser));
            closeAuthModal();
            updateAuthUI();
            showToast(`Welcome back, ${currentUser.name || 'User'}!`, 'success');
        } else {
            showToast(result.message || 'Login failed', 'error');
        }
    } catch (err) {
        showToast('Login failed. Check backend connection.', 'error');
    } finally {
        setLoading(elements.loginSubmitBtn, false);
    }
}

async function handleRegister() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    if (!name || !email || !password) { showToast('Please fill in all fields', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

    setLoading(elements.registerSubmitBtn, true);
    try {
        const result = await api.register(name, email, password);
        if (result.success) {
            authToken = result.token;
            currentUser = result.data || { name, email };
            localStorage.setItem('cf_token', authToken);
            localStorage.setItem('cf_user', JSON.stringify(currentUser));
            closeAuthModal();
            updateAuthUI();
            showToast(`Welcome, ${name}! Account created successfully.`, 'success');
        } else {
            showToast(result.message || 'Registration failed', 'error');
        }
    } catch (err) {
        showToast('Registration failed. Check backend connection.', 'error');
    } finally {
        setLoading(elements.registerSubmitBtn, false);
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_user');
    updateAuthUI();
    showLanding();
    showToast('Logged out successfully', 'info');
}

function updateAuthUI() {
    const loginBtn = elements.navLoginBtn;
    const dashBtn = elements.navDashboardBtn;
    const signupBtn = elements.navSignupBtn;
    if (authToken && currentUser) {
        if (loginBtn) {
            loginBtn.textContent = currentUser.name || 'Profile';
            loginBtn.style.display = '';
        }
        if (dashBtn) {
            dashBtn.classList.remove('hidden');
            dashBtn.style.display = 'flex';
        }
        if (signupBtn) signupBtn.style.display = 'none';
    } else {
        if (loginBtn) {
            loginBtn.textContent = 'Login';
            loginBtn.style.display = '';
        }
        if (dashBtn) {
            dashBtn.classList.add('hidden');
            dashBtn.style.display = 'none';
        }
        if (signupBtn) signupBtn.style.display = '';
    }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

async function loadDashboard() {
    try {
        const result = await api.getDashboard();
        if (result.success) {
            renderDashboardStats(result.data);
            renderResumeCards(result.data.resumes || []);
            renderCoverLetterCards(result.data.coverLetters || []);
            renderAccountTab(result.data.user);
        } else {
            showToast(result.message || 'Failed to load dashboard', 'error');
        }
    } catch (err) {
        // Render empty dashboard if API fails
        renderDashboardStats({ totalResumes: 0, avgATSScore: 0, totalCoverLetters: 0, user: { subscription: { plan: 'free' } } });
    }
}

function renderDashboardStats(data) {
    document.getElementById('stat-resumes').textContent = data.totalResumes || 0;
    document.getElementById('stat-ats').textContent = data.avgATSScore ? Math.round(data.avgATSScore) + '%' : '--';
    document.getElementById('stat-covers').textContent = data.totalCoverLetters || 0;
    document.getElementById('stat-plan').textContent = data.user?.subscription?.plan === 'pro' ? 'Pro' : 'Free';
}

function renderResumeCards(resumes) {
    const container = elements.resumeCards;
    // Keep the "Create New" card and append resume cards after it
    const emptyCard = document.getElementById('empty-create-btn');
    const emptyCardHTML = emptyCard ? emptyCard.outerHTML : '';

    if (!resumes.length) {
        container.innerHTML = emptyCardHTML;
        return;
    }

    container.innerHTML = emptyCardHTML + resumes.map(r => {
        const score = r.atsData?.atsScore || 0;
        const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-500' : 'text-red-500';
        const date = new Date(r.updatedAt || r.createdAt).toLocaleDateString();
        return `
            <div class="group flex flex-col gap-3 dash-resume-card">
                <div class="relative w-full aspect-[3/4] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group-hover:shadow-lg group-hover:border-primary/50 transition-all">
                    <div class="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gray-50">
                        <span class="material-symbols-outlined text-6xl text-gray-200 mb-2">description</span>
                        <span class="text-xs font-bold ${scoreColor}">ATS: ${score}%</span>
                    </div>
                    <div class="dash-card-overlay absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onclick="editResumeFromDashboard('${r._id}')" class="h-10 px-4 bg-primary text-white rounded-lg text-sm font-bold shadow-lg flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]">edit</span> Edit
                        </button>
                        <button onclick="deleteResumeFromDashboard('${r._id}')" class="h-10 w-10 bg-white text-gray-900 rounded-lg flex items-center justify-center shadow-lg hover:bg-red-50 hover:text-red-600">
                            <span class="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </div>
                </div>
                <div class="px-1">
                    <h3 class="text-base font-bold text-gray-900 truncate">${r.personalInfo?.fullName || 'Untitled Resume'}</h3>
                    <p class="text-sm text-gray-500">Modified ${date}</p>
                    <div class="flex gap-3 mt-2 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="downloadResumeFromDashboard('${r._id}')" class="hover:underline">Download PDF</button>
                        <button onclick="deleteResumeFromDashboard('${r._id}')" class="hover:underline text-red-500">Delete</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function renderCoverLetterCards(coverLetters) {
    const container = elements.coverletterCards;
    if (!coverLetters.length) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
                <span class="material-symbols-outlined text-5xl text-gray-300 mb-4">mail</span>
                <h3 class="text-lg font-bold mb-1">No Cover Letters Yet</h3>
                <p class="text-sm text-gray-500">Generate from Resume Builder</p>
            </div>`;
        return;
    }

    container.innerHTML = coverLetters.map(cl => {
        const date = new Date(cl.createdAt).toLocaleDateString();
        return `
            <div class="cl-card">
                <div class="flex items-center gap-3 mb-3">
                    <div class="size-10 rounded bg-blue-50 flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined">mail</span>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold">${cl.jobTitle || 'Cover Letter'}</h4>
                        <p class="text-xs text-gray-500">${cl.companyName || ''} • ${date}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded">${cl.tone || 'professional'}</span>
                    <button onclick="deleteCoverLetterFromDashboard('${cl._id}')" class="text-xs font-bold text-red-500 hover:underline">Delete</button>
                </div>
            </div>`;
    }).join('');
}

function renderAccountTab(user) {
    if (!user) return;
    const nameInput = document.getElementById('account-name');
    const emailInput = document.getElementById('account-email');
    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';

    const plan = user.subscription?.plan || 'free';
    document.getElementById('sub-plan').textContent = plan === 'pro' ? 'Pro' : 'Free';
    const statusText = document.getElementById('sub-status-text');
    if (plan === 'pro') {
        statusText.textContent = 'Active Pro subscription';
        elements.upgradeBtn?.classList.add('hidden');
        elements.manageSubBtn?.classList.remove('hidden');
    } else {
        statusText.textContent = '';
        elements.upgradeBtn?.classList.remove('hidden');
        elements.manageSubBtn?.classList.add('hidden');
    }
}

async function editResumeFromDashboard(resumeId) {
    try {
        const res = await fetch(`${API_BASE_URL}/resumes/${resumeId}`, { headers: authHeaders() });
        const result = await res.json();
        if (result.success) {
            const r = result.data;
            store.setState(s => {
                s.resumeId = r._id;
                s.personalInfo = r.personalInfo || s.personalInfo;
                s.experience = (r.experience || []).map(e => ({ ...e, id: e.id || generateId(), bullets: (e.bullets || []).map(b => ({ ...b, id: b.id || generateId() })) }));
                s.education = (r.education || []).map(e => ({ ...e, id: e.id || generateId() }));
                s.skills = r.skills || s.skills;
                return s;
            });
            // Populate form fields
            const state = store.getState();
            Object.keys(state.personalInfo).forEach(k => { if (elements[k]) elements[k].value = state.personalInfo[k] || ''; });
            if (elements.technicalSkills) elements.technicalSkills.value = (state.skills.technical || []).join(', ');
            if (elements.toolsSkills) elements.toolsSkills.value = (state.skills.tools || []).join(', ');
            showBuilder();
        }
    } catch (err) {
        showToast('Failed to load resume', 'error');
    }
}

async function downloadResumeFromDashboard(resumeId) {
    showPdfLoading(true);
    try {
        const res = await fetch(`${API_BASE_URL}/resumes/${resumeId}`, { headers: authHeaders() });
        const result = await res.json();
        if (result.success) {
            await downloadPDFFromData(result.data);
        }
    } catch (err) {
        showToast('PDF download failed', 'error');
    } finally {
        showPdfLoading(false);
    }
}

async function deleteResumeFromDashboard(resumeId) {
    if (!confirm('Delete this resume?')) return;
    try {
        await api.deleteResume(resumeId);
        showToast('Resume deleted', 'success');
        loadDashboard();
    } catch (err) {
        showToast('Failed to delete resume', 'error');
    }
}

async function deleteCoverLetterFromDashboard(clId) {
    if (!confirm('Delete this cover letter?')) return;
    try {
        await api.deleteCoverLetter(clId);
        showToast('Cover letter deleted', 'success');
        loadDashboard();
    } catch (err) {
        showToast('Failed to delete cover letter', 'error');
    }
}

// Dashboard tabs
function initDashboardTabs() {
    const tabMap = {
        'dash-tab-resumes': 'tab-resumes',
        'dash-tab-coverletters': 'tab-coverletters',
        'dash-tab-account': 'tab-account'
    };
    Object.entries(tabMap).forEach(([btnId, contentId]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                // Update nav link styles
                Object.keys(tabMap).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.classList.remove('text-primary', 'font-semibold');
                        el.classList.add('text-gray-600', 'font-medium');
                    }
                });
                btn.classList.remove('text-gray-600', 'font-medium');
                btn.classList.add('text-primary', 'font-semibold');
                // Show/hide content
                document.querySelectorAll('.dash-content').forEach(c => c.classList.add('hidden'));
                document.getElementById(contentId)?.classList.remove('hidden');
            });
        }
    });
}

// ============================================
// COVER LETTER FUNCTIONS
// ============================================

function openCoverLetterModal() {
    elements.coverLetterModal.classList.remove('hidden');
    elements.clForm.classList.remove('hidden');
    elements.clResult.classList.add('hidden');
    elements.clLoading.classList.add('hidden');

    // Pre-fill from JD if available
    const state = store.getState();
    if (state.atsData.targetJD) {
        document.getElementById('cl-jd').value = state.atsData.targetJD;
    }
}

function closeCoverLetterModal() {
    elements.coverLetterModal.classList.add('hidden');
}

async function generateCoverLetter() {
    const jobTitle = document.getElementById('cl-job-title').value.trim();
    const companyName = document.getElementById('cl-company').value.trim();
    const jobDescription = document.getElementById('cl-jd').value.trim();
    const tone = document.getElementById('cl-tone').value;

    if (!jobDescription) { showToast('Please enter a job description', 'error'); return; }

    // Show loading
    elements.clForm.classList.add('hidden');
    elements.clLoading.classList.remove('hidden');

    try {
        const state = store.getState();
        const result = await api.generateCoverLetter({
            resumeData: {
                personalInfo: state.personalInfo,
                experience: state.experience,
                skills: state.skills
            },
            jobDescription,
            jobTitle,
            companyName,
            tone
        });

        if (result.success) {
            const cl = result.data.content || result.data;
            document.getElementById('cl-greeting').value = cl.greeting || '';
            document.getElementById('cl-opening').value = cl.opening || '';
            document.getElementById('cl-body').value = cl.body || '';
            document.getElementById('cl-closing').value = cl.closing || '';
            document.getElementById('cl-signature').value = cl.signature || '';

            elements.clLoading.classList.add('hidden');
            elements.clResult.classList.remove('hidden');
            showToast('Cover letter generated!', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (err) {
        elements.clLoading.classList.add('hidden');
        elements.clForm.classList.remove('hidden');
        showToast('Cover letter generation failed: ' + (err.message || 'Unknown error'), 'error');
    }
}

function getCoverLetterText() {
    return [
        document.getElementById('cl-greeting')?.value || '',
        '',
        document.getElementById('cl-opening')?.value || '',
        '',
        document.getElementById('cl-body')?.value || '',
        '',
        document.getElementById('cl-closing')?.value || '',
        '',
        document.getElementById('cl-signature')?.value || ''
    ].join('\n');
}

function copyCoverLetter() {
    navigator.clipboard.writeText(getCoverLetterText())
        .then(() => showToast('Cover letter copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
}

// ============================================
// PDF GENERATION FUNCTIONS
// ============================================

async function saveResume() {
    if (!authToken) {
        showToast('Please log in to save your resume', 'info');
        openAuthModal();
        return;
    }

    const state = store.getState();
    // Validate essential data
    if (!state.personalInfo.fullName) {
        showToast('Please enter your name first', 'error');
        return;
    }

    const resumeData = {
        personalInfo: state.personalInfo,
        experience: state.experience,
        education: state.education,
        skills: state.skills,
        atsData: state.atsData,
        status: 'draft'
    };

    setLoading(elements.saveResumeBtn, true);
    elements.saveResumeBtn.innerHTML = '💾 Saving...';

    try {
        let result;
        if (state.resumeId) {
            result = await api.updateResume(state.resumeId, resumeData);
        } else {
            result = await api.createResume(resumeData);
        }

        if (result.success) {
            if (!state.resumeId && result.data) {
                store.setState(s => { s.resumeId = result.data._id; return s; });
            }
            showToast('Resume saved successfully!', 'success');
        } else {
            showToast(result.message || 'Failed to save resume', 'error');
        }
    } catch (err) {
        console.error('Save error:', err);
        showToast('Save failed. Check backend connection.', 'error');
    } finally {
        setLoading(elements.saveResumeBtn, false);
        elements.saveResumeBtn.innerHTML = '💾 Save';
    }
}

function showPdfLoading(show) {
    if (show) {
        elements.pdfLoadingModal.classList.remove('hidden');
    } else {
        elements.pdfLoadingModal.classList.add('hidden');
    }
}

async function downloadPDF() {
    const state = store.getState();
    const hasContent = state.personalInfo.fullName || state.experience.some(e => e.role || e.company);
    if (!hasContent) {
        showToast('Please add some content first', 'error');
        return;
    }
    showPdfLoading(true);
    await downloadPDFFromData(state);
    showPdfLoading(false);
}

async function downloadPDFFromData(resumeData) {
    try {
        const result = await api.generatePDF(resumeData);
        if (result.success) {
            // Trigger download
            const downloadUrl = `${API_BASE_URL.replace('/api', '')}${result.data.downloadUrl}`;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = result.data.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            showToast('PDF downloaded!', 'success');
        } else {
            showToast(result.message || 'PDF generation failed', 'error');
        }
    } catch (err) {
        showToast('PDF generation failed. Check backend connection.', 'error');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Navigation
elements.startBtn?.addEventListener('click', showBuilder);
elements.demoBtn?.addEventListener('click', () => {
    document.getElementById('templates-section')?.scrollIntoView({ behavior: 'smooth' });
});

// Template data
const resumeTemplates = {
    'software-engineer': {
        personalInfo: {
            fullName: 'Alex Johnson',
            email: 'alex.johnson@email.com',
            phone: '(555) 123-4567',
            location: 'San Francisco, CA',
            linkedin: 'linkedin.com/in/alexjohnson',
            github: 'github.com/alexjohnson',
            portfolio: 'alexjohnson.dev',
            summary: 'Full-stack software engineer with 5+ years of experience building scalable web applications and microservices. Proficient in React, Node.js, and cloud infrastructure. Passionate about clean code architecture and performance optimization. Led cross-functional teams to deliver products serving 2M+ users.'
        },
        experience: [
            {
                id: 'exp1', role: 'Senior Software Engineer', company: 'Google', startDate: 'Jan 2021', endDate: 'Present',
                bullets: [
                    { id: 'b1', original: 'Led development of microservices architecture reducing API latency by 40% and improving throughput by 3x', rewritten: '', accepted: false },
                    { id: 'b2', original: 'Mentored 4 junior engineers and established code review best practices adopted across the team', rewritten: '', accepted: false },
                    { id: 'b3', original: 'Designed and implemented real-time data pipeline processing 10M+ events daily using Kafka and Apache Flink', rewritten: '', accepted: false }
                ]
            },
            {
                id: 'exp2', role: 'Software Engineer', company: 'Stripe', startDate: 'Jun 2018', endDate: 'Dec 2020',
                bullets: [
                    { id: 'b4', original: 'Built payment processing features handling $500M+ in annual transaction volume', rewritten: '', accepted: false },
                    { id: 'b5', original: 'Reduced deployment time by 60% by implementing CI/CD pipelines with GitHub Actions', rewritten: '', accepted: false },
                    { id: 'b6', original: 'Developed React component library used by 15+ internal teams, improving UI consistency', rewritten: '', accepted: false }
                ]
            }
        ],
        education: [
            { id: 'edu1', degree: 'B.S. Computer Science', school: 'Stanford University', fieldOfStudy: 'Computer Science', startDate: '2014', endDate: '2018', gpa: '3.8' }
        ],
        projects: [
            { id: 'proj1', title: 'OpenAPI Dashboard', description: 'Built an open-source API monitoring dashboard with real-time metrics, alerting, and historical analysis. 2,500+ GitHub stars.', technologies: 'React, Go, PostgreSQL, WebSocket', link: 'github.com/alexj/openapi-dash', startDate: '2022', endDate: 'Present' },
            { id: 'proj2', title: 'CodeReview AI', description: 'AI-powered code review assistant that analyzes pull requests and suggests improvements using GPT-4.', technologies: 'Python, FastAPI, OpenAI, Docker', link: 'github.com/alexj/codereview-ai', startDate: '2023', endDate: '2023' }
        ],
        certifications: [
            { id: 'cert1', name: 'AWS Solutions Architect – Professional', issuer: 'Amazon Web Services', date: '2022', credentialId: 'AWS-SAP-12345', url: '' },
            { id: 'cert2', name: 'Google Cloud Professional Developer', issuer: 'Google Cloud', date: '2021', credentialId: 'GCP-PD-67890', url: '' }
        ],
        languages: [
            { id: 'lang1', language: 'English', proficiency: 'Native' },
            { id: 'lang2', language: 'Mandarin', proficiency: 'Fluent' }
        ],
        awards: [
            { id: 'award1', title: 'Hackathon Winner - Best AI Application', issuer: 'TechCrunch Disrupt', date: '2023', description: 'Won first place among 200+ teams for an AI-powered accessibility tool.' }
        ],
        skills: {
            technical: ['JavaScript', 'TypeScript', 'Python', 'Go', 'React', 'Node.js', 'GraphQL', 'REST APIs'],
            tools: ['AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'Redis', 'Kafka', 'Git', 'Jenkins'],
            soft: ['Technical Leadership', 'Mentoring', 'Problem Solving', 'Agile/Scrum']
        }
    },
    'marketing-manager': {
        personalInfo: {
            fullName: 'Sarah Mitchell',
            email: 'sarah.mitchell@email.com',
            phone: '(555) 987-6543',
            location: 'New York, NY',
            linkedin: 'linkedin.com/in/sarahmitchell',
            github: '',
            portfolio: 'sarahmitchell.co',
            summary: 'Results-driven marketing leader with 7+ years of experience in digital marketing, brand strategy, and campaign management. Proven track record of increasing brand awareness by 150% and driving $12M+ in revenue through data-driven marketing initiatives at Fortune 500 companies.'
        },
        experience: [
            {
                id: 'exp1', role: 'Marketing Director', company: 'Nike', startDate: 'Mar 2020', endDate: 'Present',
                bullets: [
                    { id: 'b1', original: 'Increased brand engagement by 65% through integrated digital campaigns across 8 markets', rewritten: '', accepted: false },
                    { id: 'b2', original: 'Managed $4.5M annual marketing budget, achieving 320% ROI on paid advertising spend', rewritten: '', accepted: false },
                    { id: 'b3', original: 'Led team of 12 marketers and 4 agencies to launch seasonal campaigns reaching 50M+ consumers', rewritten: '', accepted: false }
                ]
            },
            {
                id: 'exp2', role: 'Senior Marketing Manager', company: 'L\'Oreal', startDate: 'Jan 2017', endDate: 'Feb 2020',
                bullets: [
                    { id: 'b4', original: 'Developed influencer marketing program generating $8M in revenue with 12x ROI', rewritten: '', accepted: false },
                    { id: 'b5', original: 'Grew social media following from 200K to 1.2M through content strategy and community management', rewritten: '', accepted: false },
                    { id: 'b6', original: 'Launched e-commerce marketing funnel improving conversion rate from 2.1% to 4.8%', rewritten: '', accepted: false }
                ]
            }
        ],
        education: [
            { id: 'edu1', degree: 'MBA, Marketing', school: 'Columbia Business School', fieldOfStudy: 'Marketing', startDate: '2015', endDate: '2017', gpa: '3.9' },
            { id: 'edu2', degree: 'B.A. Communications', school: 'NYU', fieldOfStudy: 'Communications', startDate: '2011', endDate: '2015', gpa: '3.7' }
        ],
        projects: [
            { id: 'proj1', title: 'Brand Refresh Campaign', description: 'Led complete brand identity overhaul including visual design, messaging, and go-to-market strategy. Resulted in 40% increase in brand recall.', technologies: 'Adobe Creative Suite, Figma', link: '', startDate: '2022', endDate: '2022' }
        ],
        certifications: [
            { id: 'cert1', name: 'Google Analytics Certified', issuer: 'Google', date: '2023', credentialId: '', url: '' },
            { id: 'cert2', name: 'HubSpot Inbound Marketing', issuer: 'HubSpot Academy', date: '2022', credentialId: '', url: '' },
            { id: 'cert3', name: 'Meta Blueprint Certification', issuer: 'Meta', date: '2021', credentialId: '', url: '' }
        ],
        languages: [
            { id: 'lang1', language: 'English', proficiency: 'Native' },
            { id: 'lang2', language: 'French', proficiency: 'Advanced' },
            { id: 'lang3', language: 'Spanish', proficiency: 'Intermediate' }
        ],
        awards: [
            { id: 'award1', title: 'Cannes Lions Bronze Award', issuer: 'Cannes Lions International Festival', date: '2022', description: 'Recognized for innovative digital campaign "Move Your Way".' },
            { id: 'award2', title: 'Forbes 30 Under 30 - Marketing', issuer: 'Forbes', date: '2020', description: '' }
        ],
        skills: {
            technical: ['SEO/SEM', 'Google Analytics', 'Google Ads', 'Facebook Ads', 'A/B Testing', 'Marketing Automation'],
            tools: ['HubSpot', 'Salesforce', 'Hootsuite', 'Mailchimp', 'Canva', 'Adobe Creative Suite'],
            soft: ['Brand Strategy', 'Team Leadership', 'Public Speaking', 'Cross-functional Collaboration', 'Data-Driven Decision Making']
        }
    },
    'data-scientist': {
        personalInfo: {
            fullName: 'Michael Chen',
            email: 'michael.chen@email.com',
            phone: '(555) 456-7890',
            location: 'Seattle, WA',
            linkedin: 'linkedin.com/in/michaelchen',
            github: 'github.com/mchen-ds',
            portfolio: '',
            summary: 'Data scientist with 6+ years of expertise in machine learning, statistical modeling, and data-driven product development. Delivered ML solutions for Fortune 500 companies, improving revenue forecasting accuracy by 35% and reducing operational costs by $2.5M annually. Published researcher in NeurIPS and ICML.'
        },
        experience: [
            {
                id: 'exp1', role: 'Senior Data Scientist', company: 'Amazon', startDate: 'Jun 2019', endDate: 'Present',
                bullets: [
                    { id: 'b1', original: 'Built ML models improving demand forecasting accuracy by 35%, reducing overstock by $2.5M annually', rewritten: '', accepted: false },
                    { id: 'b2', original: 'Developed NLP-based customer sentiment analysis pipeline processing 5M+ reviews monthly', rewritten: '', accepted: false },
                    { id: 'b3', original: 'Led A/B testing framework redesign, increasing experiment velocity by 200% across 8 product teams', rewritten: '', accepted: false }
                ]
            },
            {
                id: 'exp2', role: 'Data Scientist', company: 'Microsoft', startDate: 'Aug 2017', endDate: 'May 2019',
                bullets: [
                    { id: 'b4', original: 'Implemented recommendation engine improving user engagement by 28% on Azure Marketplace', rewritten: '', accepted: false },
                    { id: 'b5', original: 'Built automated anomaly detection system reducing incident response time by 70%', rewritten: '', accepted: false },
                    { id: 'b6', original: 'Created interactive Tableau dashboards used by 50+ stakeholders for quarterly business reviews', rewritten: '', accepted: false }
                ]
            }
        ],
        education: [
            { id: 'edu1', degree: 'M.S. Data Science', school: 'University of Washington', fieldOfStudy: 'Data Science', startDate: '2015', endDate: '2017', gpa: '3.95' },
            { id: 'edu2', degree: 'B.S. Statistics & Mathematics', school: 'UC Berkeley', fieldOfStudy: 'Statistics', startDate: '2011', endDate: '2015', gpa: '3.8' }
        ],
        projects: [
            { id: 'proj1', title: 'DeepForecast', description: 'Open-source time series forecasting library using transformer architectures. 1,800+ GitHub stars, used by 50+ companies.', technologies: 'Python, PyTorch, Pandas', link: 'github.com/mchen/deepforecast', startDate: '2021', endDate: 'Present' },
            { id: 'proj2', title: 'COVID-19 Spread Predictor', description: 'Built epidemiological model predicting COVID-19 spread with 92% accuracy, featured in Seattle Times.', technologies: 'Python, scikit-learn, Streamlit', link: '', startDate: '2020', endDate: '2020' }
        ],
        certifications: [
            { id: 'cert1', name: 'TensorFlow Developer Certificate', issuer: 'Google', date: '2022', credentialId: 'TF-DEV-98765', url: '' },
            { id: 'cert2', name: 'AWS Machine Learning Specialty', issuer: 'Amazon Web Services', date: '2021', credentialId: 'AWS-MLS-54321', url: '' }
        ],
        languages: [
            { id: 'lang1', language: 'English', proficiency: 'Native' },
            { id: 'lang2', language: 'Mandarin', proficiency: 'Native' },
            { id: 'lang3', language: 'Japanese', proficiency: 'Basic' }
        ],
        awards: [
            { id: 'award1', title: 'NeurIPS Spotlight Paper', issuer: 'Neural Information Processing Systems', date: '2022', description: 'Published paper on transformer-based time series forecasting.' },
            { id: 'award2', title: 'Kaggle Grandmaster', issuer: 'Kaggle', date: '2021', description: 'Top 0.1% of data science competitors worldwide.' }
        ],
        skills: {
            technical: ['Python', 'R', 'SQL', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Spark', 'Statistical Modeling'],
            tools: ['Tableau', 'Jupyter', 'AWS SageMaker', 'MLflow', 'Docker', 'Airflow', 'dbt', 'Snowflake'],
            soft: ['Research & Analysis', 'Data Storytelling', 'Cross-functional Communication', 'Experiment Design']
        }
    }
};

// Load template into builder
function loadTemplate(templateName) {
    const template = resumeTemplates[templateName];
    if (!template) return;

    store.setState(state => {
        state.personalInfo = { ...template.personalInfo };
        state.experience = JSON.parse(JSON.stringify(template.experience));
        state.education = JSON.parse(JSON.stringify(template.education));
        state.projects = JSON.parse(JSON.stringify(template.projects));
        state.certifications = JSON.parse(JSON.stringify(template.certifications));
        state.languages = JSON.parse(JSON.stringify(template.languages));
        state.awards = JSON.parse(JSON.stringify(template.awards));
        state.skills = JSON.parse(JSON.stringify(template.skills));
        return state;
    });

    // Fill input fields
    Object.keys(template.personalInfo).forEach(key => {
        if (elements[key]) elements[key].value = template.personalInfo[key];
    });
    if (elements.technicalSkills) elements.technicalSkills.value = template.skills.technical.join(', ');
    if (elements.toolsSkills) elements.toolsSkills.value = template.skills.tools.join(', ');
    if (elements.softSkills) elements.softSkills.value = template.skills.soft.join(', ');

    showBuilder();
    showToast('Template loaded! Customize it with your details.', 'success');
}

// Template button listeners
document.querySelectorAll('.use-template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        loadTemplate(btn.dataset.template);
    });
});
elements.navBuilderBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showBuilder();
});
elements.navDashboardBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showDashboard();
});
elements.navLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (authToken) {
        showDashboard();
    } else {
        openAuthModal();
    }
});
elements.navSignupBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal(true);
});
elements.backToLanding?.addEventListener('click', showLanding);

// JD Analysis
elements.analyzeJdBtn?.addEventListener('click', analyzeJobDescription);

// Personal Info inputs
['fullName', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio', 'summary'].forEach(field => {
    elements[field]?.addEventListener('input', (e) => {
        updatePersonalInfo(field, e.target.value);
    });
});

// Skills
elements.technicalSkills?.addEventListener('input', (e) => {
    updateSkills('technical', e.target.value);
});
elements.toolsSkills?.addEventListener('input', (e) => {
    updateSkills('tools', e.target.value);
});
elements.softSkills?.addEventListener('input', (e) => {
    updateSkills('soft', e.target.value);
});

// Add buttons
elements.addExperienceBtn?.addEventListener('click', addExperience);
elements.addEducationBtn?.addEventListener('click', addEducation);
elements.addProjectBtn?.addEventListener('click', addProject);
elements.addCertificationBtn?.addEventListener('click', addCertification);
elements.addLanguageBtn?.addEventListener('click', addLanguage);
elements.addAwardBtn?.addEventListener('click', addAward);

// Magic Button
elements.magicBtn?.addEventListener('click', runMagicOptimization);

// Summary Generation
elements.generateSummaryBtn?.addEventListener('click', generateSummary);

// Optimization Modal
elements.closeOptimizationModal?.addEventListener('click', closeOptimizationModal);
elements.acceptAllBtn?.addEventListener('click', acceptAllOptimizations);
elements.reviewChangesBtn?.addEventListener('click', closeOptimizationModal);

// PDF Download buttons
elements.downloadBtn?.addEventListener('click', downloadPDF);
elements.downloadPdfBtn?.addEventListener('click', downloadPDF);
elements.saveResumeBtn?.addEventListener('click', saveResume);

// Cover Letter
elements.coverLetterBtn?.addEventListener('click', openCoverLetterModal);
elements.closeCLModal?.addEventListener('click', closeCoverLetterModal);
elements.generateCLBtn?.addEventListener('click', generateCoverLetter);
elements.regenerateCLBtn?.addEventListener('click', () => {
    elements.clResult.classList.add('hidden');
    elements.clForm.classList.remove('hidden');
});
elements.copyCLBtn?.addEventListener('click', copyCoverLetter);
elements.exportCLPdfBtn?.addEventListener('click', () => {
    showToast('Cover letter PDF export coming soon!', 'info');
});

// Auth Modal
elements.closeAuthModal?.addEventListener('click', closeAuthModal);
elements.showRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    elements.loginForm.classList.add('hidden');
    elements.registerForm.classList.remove('hidden');
});
elements.showLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    elements.registerForm.classList.add('hidden');
    elements.loginForm.classList.remove('hidden');
});
elements.loginSubmitBtn?.addEventListener('click', handleLogin);
elements.registerSubmitBtn?.addEventListener('click', handleRegister);

// Dashboard
elements.dashBuilderBtn?.addEventListener('click', showBuilder);
elements.dashBackBtn?.addEventListener('click', showLanding);
elements.dashLogoutBtn?.addEventListener('click', handleLogout);
elements.emptyCreateBtn?.addEventListener('click', showBuilder);
elements.saveProfileBtn?.addEventListener('click', async () => {
    const name = document.getElementById('account-name').value.trim();
    if (!name) { showToast('Name is required', 'error'); return; }
    try {
        const result = await api.updateProfile({ name });
        if (result.success) {
            currentUser.name = name;
            localStorage.setItem('cf_user', JSON.stringify(currentUser));
            updateAuthUI();
            showToast('Profile updated!', 'success');
        }
    } catch (err) {
        showToast('Failed to update profile', 'error');
    }
});

// Subscription
elements.upgradeBtn?.addEventListener('click', async () => {
    if (!authToken) { openAuthModal(); return; }
    try {
        const result = await api.createCheckout('monthly');
        if (result.success && result.data?.url) {
            window.location.href = result.data.url;
        } else {
            showToast('Stripe not configured. Add your Stripe keys to .env', 'info');
        }
    } catch (err) {
        showToast('Subscription setup not available yet', 'info');
    }
});
elements.proPlanBtn?.addEventListener('click', () => {
    if (!authToken) { openAuthModal(true); return; }
    elements.upgradeBtn?.click();
});

// Close modals on overlay click
elements.optimizationModal?.addEventListener('click', (e) => {
    if (e.target === elements.optimizationModal) closeOptimizationModal();
});
elements.authModal?.addEventListener('click', (e) => {
    if (e.target === elements.authModal) closeAuthModal();
});
elements.coverLetterModal?.addEventListener('click', (e) => {
    if (e.target === elements.coverLetterModal) closeCoverLetterModal();
});

// ============================================
// INITIALIZATION
// ============================================

console.log('CareerForge Pro loaded');
console.log('API:', API_BASE_URL);

// Initialize
render(store.getState());
initDashboardTabs();
updateAuthUI();
