/**
 * AI RESUME ARCHITECT - Main Application
 * 
 * Architecture:
 * - Global state management with reactive updates
 * - Live preview rendering
 * - API integration for AI features
 * - User Tier Management (Free vs Pro)
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
        website: '',
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
    },
    templateId: 'professional',
    // User State from localStorage

    user: JSON.parse(localStorage.getItem('careerforge_user')) || null,
    isPro: false
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
    // Page Elements (Cleaned up)
    builderApp: document.getElementById('builder-app'),


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
    portfolio: document.getElementById('portfolio'),
    summary: document.getElementById('summary'),
    generateSummaryBtn: document.getElementById('generate-summary-btn'),
    generateCoverLetterBtn: document.getElementById('generate-cover-letter-btn'),

    // Upgrade
    upgradeBtn: document.getElementById('upgrade-btn'),

    // Sections
    experienceList: document.getElementById('experience-list'),
    educationList: document.getElementById('education-list'),
    addExperienceBtn: document.getElementById('add-experience-btn'),
    addEducationBtn: document.getElementById('add-education-btn'),

    // Templates
    templateOptions: document.querySelectorAll('.template-option'),
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
    toastContainer: document.getElementById('toast-container'),

    // Cover Letter Modal
    coverLetterModal: document.getElementById('cover-letter-modal'),
    closeCoverLetterModal: document.getElementById('close-cover-letter-modal'),
    coverLetterText: document.getElementById('cover-letter-text'),
    copyCoverLetterBtn: document.getElementById('copy-cover-letter-btn'),
    closeCoverLetterBtn: document.getElementById('close-cover-letter-btn')
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
    // Helper to get token
    getToken() {
        return localStorage.getItem('careerforge_token');
    },

    getHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    },

    async getResume(id) {
        const res = await fetch(`${API_BASE_URL}/resumes/${id}`, {
            headers: this.getHeaders()
        });
        return res.json();
    },

    async createResume(data) {
        // userId is handled by backend token
        const res = await fetch(`${API_BASE_URL}/resumes`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async updateResume(id, data) {
        const res = await fetch(`${API_BASE_URL}/resumes/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async analyzeJD(jdText, resumeId) {
        const res = await fetch(`${API_BASE_URL}/ai/analyze-jd`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ jdText, resumeId })
        });
        return res.json();
    },

    async calculateATSScore(resumeId, targetKeywords, resumeData) {
        // Ensure resumes ownership is valid in backend or handle 401
        const res = await fetch(`${API_BASE_URL}/ai/score`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ resumeId, targetKeywords, resumeData })
        });
        return res.json();
    },

    async rewriteBullet(bulletPoint, keyword, context) {
        const res = await fetch(`${API_BASE_URL}/ai/rewrite`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ bulletPoint, keyword, context })
        });
        return res.json();
    },

    async optimizeResume(resumeId, jdText) {
        const res = await fetch(`${API_BASE_URL}/ai/optimize`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ resumeId, jdText })
        });
        return res.json();
    },

    async generateSummary(resumeId, resumeData, targetKeywords) {
        const res = await fetch(`${API_BASE_URL}/ai/summary`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ resumeId, resumeData, targetKeywords })
        });
        return res.json();
    },

    async generateCoverLetter(resumeId, resumeData, jdText) {
        const res = await fetch(`${API_BASE_URL}/ai/cover-letter`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ resumeId, resumeData, jdText })
        });
        return res.json();
    },

    async checkATS(file, jdText) {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('jdText', jdText);

        const res = await fetch(`${API_BASE_URL}/ai/check-ats`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        });
        return res.json();
    },

    async searchJobs(query, type, location) {

        const res = await fetch(`${API_BASE_URL}/jobs/search?query=${encodeURIComponent(query)}&type=${type}&location=${encodeURIComponent(location)}`, {
            headers: this.getHeaders()
        });
        return res.json();
    },

    async createCheckoutSession() {

        // Redirect to dashboard after success
        const returnUrl = window.location.origin + '/dashboard.html';

        const res = await fetch(`${API_BASE_URL}/payment/create-checkout-session`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ planType: 'pro', returnUrl })
        });
        return res.json();
    },

    getPDFUrl(resumeId) {
        // Returns URL for direct access - simpler for now if download button is link
        // But for auth, we might need to fetch blob.
        // For now, let's keep it as string but we might need a fetch wrapper
        return `${API_BASE_URL}/pdf/generate/${resumeId}`;
    },

    async getPDFBlob(resumeId) {
        const res = await fetch(`${API_BASE_URL}/pdf/generate/${resumeId}`, {
            headers: this.getHeaders()
        });
        if (!res.ok) throw new Error('PDF Failed');
        return res.blob();
    },

    async confirmPayment(userId) {
        // userId might be redundant if using token, but keeping signature
        const res = await fetch(`${API_BASE_URL}/payment/success`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ userId })
        });
        return res.json();
    }
};

// ============================================
// PAGE NAVIGATION
// ============================================

// DELETED showBuilder and showLanding (Separate pages now)


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

function updateTemplate(templateId) {
    const state = store.getState();
    const proTemplates = ['modern', 'creative', 'executive'];

    // If pro template and not pro, show a "Preview Mode" toast
    if (proTemplates.includes(templateId) && !state.isPro) {
        showToast(`Previewing ${templateId.charAt(0).toUpperCase() + templateId.slice(1)} (PRO Feature). Upgrade to download!`, 'info');
    }

    store.setState(state => {
        state.templateId = templateId;
        return state;
    });

    // Update UI active state immediately
    if (elements.templateOptions) {
        elements.templateOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.template === templateId);
        });
    }
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
    if (data.skillsAdded && (data.skillsAdded.technical.length > 0 || data.skillsAdded.tools.length > 0)) {
        resultsHTML += `
            <div class="optimization-section skills-added">
                <h4>🎯 Skills Added to Your Resume</h4>
                <div class="added-skills-list">
                    ${data.skillsAdded.technical.map(s => `<span class="skill-tag technical">${s}</span>`).join('')}
                    ${data.skillsAdded.tools.map(s => `<span class="skill-tag tool">${s}</span>`).join('')}
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
    elements.optimizationModal.classList.add('active');

    // Update score display with color
    elements.atsScoreDisplay.textContent = data.newScore + '%';
    elements.atsScoreDisplay.style.color =
        data.newScore >= 70 ? '#10b981' :
            data.newScore >= 40 ? '#f59e0b' : '#ef4444';

    // Show success message
    showToast(`🎯 ATS Score improved from ${data.initialScore}% to ${data.newScore}% (+${improvement}%)`, 'success');
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

function renderResumePreview(state) {
    const { personalInfo, experience, education, skills, templateId } = state;

    // Check if there's any content
    const hasContent = personalInfo.fullName || experience.some(e => e.role || e.company) || education.some(e => e.school);

    if (!hasContent) {
        elements.resumePreview.innerHTML = `
            <div class="preview-placeholder">
                <p>Start filling in your details to see the live preview Tag</p>
            </div>
        `;
        return;
    }

    // Set template class on parent for CSS scoping
    elements.resumePreview.className = `resume-preview template-${templateId || 'professional'}`;

    elements.resumePreview.innerHTML = `
        <div class="resume-document">
            <div class="resume-header">
                <h1>${personalInfo.fullName || 'Your Name'}</h1>
                <div class="resume-contact">
                    ${personalInfo.email ? `<span>📧 ${personalInfo.email}</span>` : ''}
                    ${personalInfo.phone ? `<span>📱 ${personalInfo.phone}</span>` : ''}
                    ${personalInfo.location ? `<span>📍 ${personalInfo.location}</span>` : ''}
                    ${personalInfo.linkedin ? `<span>🔗 <a href="${personalInfo.linkedin}" target="_blank" rel="noopener">LinkedIn</a></span>` : ''}
                    ${personalInfo.github ? `<span>💻 <a href="${personalInfo.github}" target="_blank" rel="noopener">GitHub</a></span>` : ''}
                    ${personalInfo.website ? `<span>🌐 <a href="${personalInfo.website}" target="_blank" rel="noopener">Portfolio</a></span>` : ''}
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
    if (elements.experienceList) renderExperienceList(state.experience);
    if (elements.educationList) renderEducationList(state.education);
    if (elements.resumePreview) renderResumePreview(state);

    // Update ATS Score in header if exists
    if (elements.atsScoreDisplay) {
        const score = state.atsData.atsScore || 0;
        elements.atsScoreDisplay.textContent = score > 0 ? `${score}%` : '--';

        // Color coding
        const badge = document.getElementById('ats-badge');
        if (badge) {
            badge.className = 'ats-score-badge ' + (score > 75 ? 'high' : score > 50 ? 'mid' : 'low');
        }
    }
}


// Subscribe to state changes
store.subscribe(render);

// ============================================
// EVENT LISTENERS
// ============================================

// ============================================
// COVER LETTER GENERATION
// ============================================

async function generateCoverLetter() {
    const state = store.getState();

    if (!state.atsData.targetJD) {
        showToast('Please analyze a job description first', 'error');
        return;
    }

    setLoading(elements.generateCoverLetterBtn, true);

    try {
        const result = await api.generateCoverLetter(state.resumeId, state, state.atsData.targetJD);

        if (result.success) {
            elements.coverLetterText.value = result.data.coverLetter;
            elements.coverLetterModal.classList.add('active');
            showToast('Cover Letter generated!', 'success');
        } else {
            showToast(result.message || 'Generation failed', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Cover Letter generation failed (Backend error)', 'error');
    } finally {
        setLoading(elements.generateCoverLetterBtn, false);
    }
}

function handleCopyCoverLetter() {
    elements.coverLetterText.select();
    document.execCommand('copy');
    showToast('Copied to clipboard!', 'success');
}

function closeCoverLetter() {
    elements.coverLetterModal.classList.remove('active');
}

// ============================================
// PDF DOWNLOAD
// ============================================

async function handleDownloadPDF() {
    const state = store.getState();
    const proTemplates = ['modern', 'creative', 'executive'];

    if (!state.resumeId) {
        showToast('Please create/edit resume first.', 'error');
        return;
    }

    // Block download if pro template selected by free user
    if (proTemplates.includes(state.templateId) && !state.isPro) {
        showToast('This is a Premium Template. Please upgrade to Pro to download!', 'warning');
        return;
    }

    setLoading(elements.downloadBtn, true);

    try {
        const blob = await api.getPDFBlob(state.resumeId);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `resume-${state.personalInfo.fullName || 'expert'}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast('Download started!', 'success');
    } catch (err) {
        console.error(err);
        showToast('Download failed', 'error');
    } finally {
        setLoading(elements.downloadBtn, false);
    }
}

function handleLogout() {
    localStorage.removeItem('careerforge_token');
    localStorage.removeItem('careerforge_user');
    window.location.href = 'login.html';
}


// ============================================
// PAYMENT / UPGRADE
// ============================================

async function handleUpgrade() {
    setLoading(elements.upgradeBtn, true);
    const state = store.getState();

    try {
        const result = await api.createCheckoutSession();
        if (result.url) {
            // Include userId in success URL via backend or local handling
            // For now, backend handles session creation. 
            // We just redirect.
            window.location.href = result.url;
        } else {
            showToast('Failed to start checkout', 'error');
        }
    } catch (err) {
        showToast('Payment service unavailable', 'error');
    } finally {
        setLoading(elements.upgradeBtn, false);
    }
}

// Check for payment success on load
async function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
        const state = store.getState();
        // Call backend to confirm and upgrade user
        const result = await api.confirmPayment(state.userId);

        if (result.success) {
            showToast('🎉 Upgrade Successful! You are now a PRO member.', 'success');
            store.setState({ isPro: true });
            // Remove query param
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

// Run on load
checkPaymentStatus();

// ============================================
// INITIALIZATION
// ============================================


async function init() {
    // 1. Auth Check (Only if not on landing page)
    const isLandingPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');

    const token = api.getToken();

    if (!token && !isLandingPage) {
        window.location.href = 'login.html';
        return;
    }

    // If on landing and has token, maybe redirect to dashboard? 
    // Let's keep it simple for now as per user request.
    if (isLandingPage) {
        // Landing page specific listeners
        setupLandingListeners();
        return;
    }


    // 2. Load Resume ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const resumeId = urlParams.get('id');

    if (resumeId) {
        showToast('Loading your resume...', 'info');
        try {
            const result = await api.getResume(resumeId);
            if (result.success) {
                // Populate state
                store.setState({
                    ...initialState,
                    resumeId: result.data._id,
                    personalInfo: result.data.personalInfo || initialState.personalInfo,
                    experience: result.data.experience || [],
                    education: result.data.education || [],
                    skills: result.data.skills || initialState.skills,
                    atsData: result.data.atsData || initialState.atsData,
                    templateId: result.data.templateId || 'professional',
                    isPro: store.getState().user?.isPro || false
                });


                // Update form fields
                syncFieldsWithState();
                showToast('Resume loaded!', 'success');
            } else {
                showToast('Failed to load resume', 'error');
            }
        } catch (err) {
            showToast('Error loading resume', 'error');
        }
    } else {
        // New Resume
        if (store.getState().experience.length === 0) addExperience();
        if (store.getState().education.length === 0) addEducation();
    }

    // AI Actions
    elements.analyzeJdBtn?.addEventListener('click', analyzeJobDescription);
    elements.magicBtn?.addEventListener('click', runMagicOptimization);
    elements.generateSummaryBtn?.addEventListener('click', generateSummary);
    elements.generateCoverLetterBtn?.addEventListener('click', generateCoverLetter);

    // PDF 
    elements.downloadBtn?.addEventListener('click', handleDownloadPDF);

    // Modals
    elements.closeOptimizationModal?.addEventListener('click', closeOptimizationModal);
    elements.acceptAllBtn?.addEventListener('click', acceptAllOptimizations);
    elements.reviewChangesBtn?.addEventListener('click', closeOptimizationModal);

    // Cover Letter Modal
    elements.closeCoverLetterModal?.addEventListener('click', closeCoverLetter);
    elements.closeCoverLetterBtn?.addEventListener('click', closeCoverLetter);
    elements.copyCoverLetterBtn?.addEventListener('click', handleCopyCoverLetter);

    // Navigation
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // Section Management
    elements.addExperienceBtn?.addEventListener('click', () => {
        addExperience();
        renderExperienceList(store.getState().experience);
    });
    elements.addEducationBtn?.addEventListener('click', () => {
        addEducation();
        renderEducationList(store.getState().education);
    });

    // Input Listeners
    setupInputListeners();

    // Auto Save
    setupAutoSave();

    // Template Selector
    elements.templateOptions?.forEach(opt => {
        opt.addEventListener('click', () => {
            updateTemplate(opt.dataset.template);
        });
    });

    // Initial Render
    if (elements.resumePreview) {
        render(store.getState());
    }
}



function syncFieldsWithState() {
    const s = store.getState();
    const p = s.personalInfo;

    // Personal Info
    if (elements.fullName) elements.fullName.value = p.fullName || '';
    if (elements.email) elements.email.value = p.email || '';
    if (elements.phone) elements.phone.value = p.phone || '';
    if (elements.location) elements.location.value = p.location || '';
    if (elements.linkedin) elements.linkedin.value = p.linkedin || '';
    if (elements.github) elements.github.value = p.github || '';
    if (elements.portfolio) elements.portfolio.value = p.website || '';
    if (elements.summary) elements.summary.value = p.summary || '';

    // Skills
    if (elements.technicalSkills) elements.technicalSkills.value = (s.skills?.technical || []).join(', ');
    if (elements.toolsSkills) elements.toolsSkills.value = (s.skills?.tools || []).join(', ');

    // Template Selector
    if (elements.templateOptions) {
        elements.templateOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.template === s.templateId);
        });
    }

    // JD
    if (elements.jdInput) elements.jdInput.value = s.atsData.targetJD || '';

    render(s);
}

function setupAutoSave() {
    let timeout;
    store.subscribe((state) => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            if (state.resumeId) {
                // Update
                await api.updateResume(state.resumeId, state);
            } else {
                // Create (only if has content)
                if (state.personalInfo.fullName || state.experience.length > 0) {
                    const res = await api.createResume(state);
                    if (res.success) {
                        store.setState({ resumeId: res.data._id });
                        // Update URL without reload
                        const newUrl = window.location.pathname + '?id=' + res.data._id;
                        window.history.replaceState({ path: newUrl }, '', newUrl);
                    } else if (res.message && res.message.includes('Limit reached')) {
                        showToast(res.message, 'error');
                        // Stop trying to auto-save if limit reached
                        clearTimeout(timeout);
                    }
                }
            }
        }, 2000); // Save after 2s of inactivity
    });

}

function setupInputListeners() {
    // Personal Info
    ['fullName', 'email', 'phone', 'location', 'linkedin', 'github', 'website', 'summary'].forEach(id => {
        if (elements[id]) {
            elements[id].addEventListener('input', (e) => {
                updatePersonalInfo(id, e.target.value);
            });
        }
    });

    // Skills
    if (elements.technicalSkills) {
        elements.technicalSkills.addEventListener('input', (e) => updateSkills('technical', e.target.value));
    }
    if (elements.toolsSkills) {
        elements.toolsSkills.addEventListener('input', (e) => updateSkills('tools', e.target.value));
    }

    // Template Selector
    if (elements.templateOptions) {
        elements.templateOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                const templateId = opt.dataset.template;
                updateTemplate(templateId);
            });
        });
    }
}


function setupLandingListeners() {
    document.getElementById('start-btn')?.addEventListener('click', () => {
        window.location.href = api.getToken() ? 'dashboard.html' : 'signup.html';
    });
    document.getElementById('nav-builder-btn')?.addEventListener('click', () => {
        window.location.href = api.getToken() ? 'builder.html' : 'login.html';
    });
    document.getElementById('demo-btn')?.addEventListener('click', () => {
        window.location.href = 'signup.html';
    });
}

// Start App
init();

// Assign to window for global access across all pages
window.api = api;
window.showToast = showToast;
window.setLoading = setLoading;
window.elements = elements;
window.store = store;



