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

const API_BASE_URL = 'http://localhost:5000/api';

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
        summary: ''
    },
    experience: [],
    education: [],
    skills: {
        technical: [],
        tools: []
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

    // Navigation
    startBtn: document.getElementById('start-btn'),
    demoBtn: document.getElementById('demo-btn'),
    navBuilderBtn: document.getElementById('nav-builder-btn'),
    backToLanding: document.getElementById('back-to-landing'),

    // Builder Header
    atsScoreDisplay: document.getElementById('ats-score-display'),
    magicBtn: document.getElementById('magic-btn'),

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
    summary: document.getElementById('summary'),
    generateSummaryBtn: document.getElementById('generate-summary-btn'),

    // Sections
    experienceList: document.getElementById('experience-list'),
    educationList: document.getElementById('education-list'),
    addExperienceBtn: document.getElementById('add-experience-btn'),
    addEducationBtn: document.getElementById('add-education-btn'),
    technicalSkills: document.getElementById('technical-skills'),
    toolsSkills: document.getElementById('tools-skills'),

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

const api = {
    async createResume(data) {
        const res = await fetch(`${API_BASE_URL}/resumes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async updateResume(id, data) {
        const res = await fetch(`${API_BASE_URL}/resumes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async analyzeJD(jdText, resumeId) {
        const res = await fetch(`${API_BASE_URL}/ai/analyze-jd`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jdText, resumeId })
        });
        return res.json();
    },

    async calculateATSScore(resumeId, targetKeywords, resumeData) {
        const res = await fetch(`${API_BASE_URL}/ai/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeId, targetKeywords, resumeData })
        });
        return res.json();
    },

    async rewriteBullet(bulletPoint, keyword, context) {
        const res = await fetch(`${API_BASE_URL}/ai/rewrite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bulletPoint, keyword, context })
        });
        return res.json();
    },

    async optimizeResume(resumeId, jdText) {
        const res = await fetch(`${API_BASE_URL}/ai/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeId, jdText })
        });
        return res.json();
    },

    async generateSummary(resumeId, resumeData, targetKeywords) {
        const res = await fetch(`${API_BASE_URL}/ai/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeId, resumeData, targetKeywords })
        });
        return res.json();
    }
};

// ============================================
// PAGE NAVIGATION
// ============================================

function showBuilder() {
    elements.landingPage.classList.add('hidden');
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
    elements.builderApp.classList.add('hidden');
    elements.landingPage.classList.remove('hidden');
    document.body.style.overflow = '';
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
        const result = await api.analyzeJD(jdText);

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
// MAGIC BUTTON OPTIMIZATION
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
                skills: state.skills
            });

            if (createResult.success) {
                resumeId = createResult.data._id;
                store.setState(s => { s.resumeId = resumeId; return s; });
            }
        }

        // Run optimization
        const result = await api.optimizeResume(resumeId, state.atsData.targetJD);

        if (result.success) {
            // Update state with optimized bullets
            store.setState(s => {
                result.data.optimizedBullets.forEach(opt => {
                    const exp = s.experience[opt.experienceIndex];
                    if (exp && exp.bullets[opt.bulletIndex]) {
                        exp.bullets[opt.bulletIndex].rewritten = opt.rewritten;
                        exp.bullets[opt.bulletIndex].isAIRewritten = true;
                        exp.bullets[opt.bulletIndex].injectedKeywords = [opt.injectedKeyword];
                    }
                });
                s.atsData.atsScore = result.data.newScore;
                return s;
            });

            // Show optimization modal
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

    elements.optimizedBullets.innerHTML = data.optimizedBullets.map(opt => `
        <div class="optimized-bullet-item">
            <div class="bullet-version">
                <div class="bullet-version-label">Original</div>
                <div class="bullet-original">${opt.original}</div>
            </div>
            <div class="bullet-version">
                <div class="bullet-version-label">AI Optimized</div>
                <div class="bullet-rewritten">${opt.rewritten}</div>
                <span class="injected-keyword">+${opt.injectedKeyword}</span>
            </div>
        </div>
    `).join('');

    elements.optimizationModal.classList.add('active');
    elements.atsScoreDisplay.textContent = data.newScore + '%';
}

function closeOptimizationModal() {
    elements.optimizationModal.classList.remove('active');
}

function acceptAllOptimizations() {
    store.setState(state => {
        state.experience.forEach(exp => {
            exp.bullets.forEach(bullet => {
                if (bullet.rewritten && bullet.isAIRewritten) {
                    bullet.accepted = true;
                }
            });
        });
        return state;
    });
    closeOptimizationModal();
    showToast('All optimizations accepted!', 'success');
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

function renderResumePreview(state) {
    const { personalInfo, experience, education, skills } = state;

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

            ${skills.technical.length > 0 || skills.tools.length > 0 ? `
                <div class="resume-section">
                    <h2 class="resume-section-title">Skills</h2>
                    <div class="resume-skills-list">
                        ${[...skills.technical, ...skills.tools].map(skill => `
                            <span class="resume-skill-tag">${skill}</span>
                        `).join('')}
                    </div>
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
    renderResumePreview(state);
}

// Subscribe to state changes
store.subscribe(render);

// ============================================
// EVENT LISTENERS
// ============================================

// Navigation
elements.startBtn?.addEventListener('click', showBuilder);
elements.demoBtn?.addEventListener('click', () => {
    showToast('Demo mode coming soon!', 'info');
});
elements.navBuilderBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showBuilder();
});
elements.backToLanding?.addEventListener('click', showLanding);

// JD Analysis
elements.analyzeJdBtn?.addEventListener('click', analyzeJobDescription);

// Personal Info inputs
['fullName', 'email', 'phone', 'location', 'linkedin', 'github', 'summary'].forEach(field => {
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

// Add buttons
elements.addExperienceBtn?.addEventListener('click', addExperience);
elements.addEducationBtn?.addEventListener('click', addEducation);

// Magic Button
elements.magicBtn?.addEventListener('click', runMagicOptimization);

// Summary Generation
elements.generateSummaryBtn?.addEventListener('click', generateSummary);

// Optimization Modal
elements.closeOptimizationModal?.addEventListener('click', closeOptimizationModal);
elements.acceptAllBtn?.addEventListener('click', acceptAllOptimizations);
elements.reviewChangesBtn?.addEventListener('click', closeOptimizationModal);

// Download (placeholder)
elements.downloadBtn?.addEventListener('click', () => {
    showToast('PDF download coming soon!', 'info');
});

// Close modal on overlay click
elements.optimizationModal?.addEventListener('click', (e) => {
    if (e.target === elements.optimizationModal) {
        closeOptimizationModal();
    }
});

// ============================================
// INITIALIZATION
// ============================================

console.log('AI Resume Architect loaded');
console.log('API:', API_BASE_URL);

// Initial render
render(store.getState());
