/**
 * RESUME HTML TEMPLATE RENDERER
 * Converts resume JSON data into pixel-perfect HTML for PDF generation
 * 
 * Design decisions:
 * - Inline styles for PDF rendering consistency
 * - A4 page format (210mm × 297mm)
 * - Embedded Google Fonts via @import
 * - Multi-page support with page-break-inside: avoid
 */

/**
 * Generate complete HTML document from resume data
 * @param {Object} resumeData - The resume JSON from database
 * @param {String} templateId - Template style to use
 * @returns {String} Complete HTML string
 */
const renderResumeHTML = (resumeData, templateId = 'professional') => {
    const templates = {
        professional: renderProfessionalTemplate,
        modern: renderModernTemplate,
        minimal: renderMinimalTemplate
    };

    const renderer = templates[templateId] || templates.professional;
    return renderer(resumeData);
};

/**
 * Professional Template - Clean, ATS-friendly format
 */
const renderProfessionalTemplate = (data) => {
    const { personalInfo = {}, experience = [], education = [], projects = [], skills = {} } = data;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 10pt;
            line-height: 1.45;
            color: #1a1a2e;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 18mm 20mm 15mm 20mm;
            margin: 0 auto;
            background: white;
        }

        /* Header */
        .header {
            text-align: center;
            margin-bottom: 12pt;
            padding-bottom: 10pt;
            border-bottom: 2px solid #2563eb;
        }

        .header h1 {
            font-size: 22pt;
            font-weight: 700;
            color: #1a1a2e;
            letter-spacing: 0.5pt;
            margin-bottom: 6pt;
        }

        .contact-info {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 6pt 16pt;
            font-size: 9pt;
            color: #4a5568;
        }

        .contact-info a {
            color: #2563eb;
            text-decoration: none;
        }

        .contact-item {
            display: inline-flex;
            align-items: center;
            gap: 4pt;
        }

        /* Summary */
        .summary {
            margin-bottom: 12pt;
            font-size: 9.5pt;
            color: #374151;
            text-align: justify;
            line-height: 1.5;
        }

        /* Section */
        .section {
            margin-bottom: 12pt;
            page-break-inside: avoid;
        }

        .section-title {
            font-size: 12pt;
            font-weight: 700;
            color: #1a1a2e;
            text-transform: uppercase;
            letter-spacing: 1pt;
            border-bottom: 1.5px solid #e5e7eb;
            padding-bottom: 3pt;
            margin-bottom: 8pt;
        }

        /* Experience Entry */
        .entry {
            margin-bottom: 10pt;
            page-break-inside: avoid;
        }

        .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 2pt;
        }

        .entry-title {
            font-size: 10.5pt;
            font-weight: 600;
            color: #1a1a2e;
        }

        .entry-subtitle {
            font-size: 10pt;
            color: #2563eb;
            font-weight: 500;
        }

        .entry-date {
            font-size: 9pt;
            color: #6b7280;
            font-style: italic;
            white-space: nowrap;
        }

        .entry-location {
            font-size: 9pt;
            color: #6b7280;
        }

        .bullets {
            list-style: none;
            padding-left: 0;
            margin-top: 4pt;
        }

        .bullets li {
            position: relative;
            padding-left: 14pt;
            margin-bottom: 3pt;
            font-size: 9.5pt;
            color: #374151;
            line-height: 1.45;
        }

        .bullets li::before {
            content: "▸";
            position: absolute;
            left: 0;
            color: #2563eb;
            font-weight: bold;
        }

        /* Skills */
        .skills-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 4pt;
        }

        .skill-row {
            display: flex;
            gap: 6pt;
            font-size: 9.5pt;
        }

        .skill-label {
            font-weight: 600;
            color: #1a1a2e;
            min-width: 110pt;
        }

        .skill-value {
            color: #374151;
        }

        /* Projects */
        .project-tech {
            font-size: 8.5pt;
            color: #6b7280;
            margin-top: 2pt;
        }

        .project-tech span {
            background: #f1f5f9;
            padding: 1pt 5pt;
            border-radius: 2pt;
            margin-right: 4pt;
            font-size: 8pt;
        }
    </style>
</head>
<body>
    <div class="page">
        <!-- Header -->
        <div class="header">
            <h1>${escapeHtml(personalInfo.fullName || 'Your Name')}</h1>
            <div class="contact-info">
                ${personalInfo.email ? `<span class="contact-item">📧 ${escapeHtml(personalInfo.email)}</span>` : ''}
                ${personalInfo.phone ? `<span class="contact-item">📱 ${escapeHtml(personalInfo.phone)}</span>` : ''}
                ${personalInfo.location ? `<span class="contact-item">📍 ${escapeHtml(personalInfo.location)}</span>` : ''}
                ${personalInfo.linkedin ? `<span class="contact-item"><a href="${escapeHtml(personalInfo.linkedin)}">LinkedIn</a></span>` : ''}
                ${personalInfo.github ? `<span class="contact-item"><a href="${escapeHtml(personalInfo.github)}">GitHub</a></span>` : ''}
                ${personalInfo.website ? `<span class="contact-item"><a href="${escapeHtml(personalInfo.website)}">Portfolio</a></span>` : ''}
            </div>
        </div>

        <!-- Summary -->
        ${personalInfo.summary ? `
        <div class="summary">
            ${escapeHtml(personalInfo.summary)}
        </div>
        ` : ''}

        <!-- Experience -->
        ${experience.length > 0 ? `
        <div class="section">
            <div class="section-title">Experience</div>
            ${experience.map(exp => `
            <div class="entry">
                <div class="entry-header">
                    <div>
                        <div class="entry-title">${escapeHtml(exp.role || '')}</div>
                        <div class="entry-subtitle">${escapeHtml(exp.company || '')}${exp.location ? ` · ${escapeHtml(exp.location)}` : ''}</div>
                    </div>
                    <div class="entry-date">${escapeHtml(exp.startDate || '')} — ${exp.current ? 'Present' : escapeHtml(exp.endDate || '')}</div>
                </div>
                ${(exp.bullets && exp.bullets.length > 0) ? `
                <ul class="bullets">
                    ${exp.bullets.map(b => `<li>${escapeHtml(getBulletText(b))}</li>`).join('')}
                </ul>
                ` : ''}
            </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Projects -->
        ${projects.length > 0 ? `
        <div class="section">
            <div class="section-title">Projects</div>
            ${projects.map(proj => `
            <div class="entry">
                <div class="entry-header">
                    <div class="entry-title">${escapeHtml(proj.title || '')}${proj.link ? ` <a href="${escapeHtml(proj.link)}" style="font-size:8.5pt;color:#2563eb;">↗</a>` : ''}</div>
                </div>
                ${(proj.technologies && proj.technologies.length > 0) ? `
                <div class="project-tech">${proj.technologies.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
                ` : ''}
                ${(proj.bullets && proj.bullets.length > 0) ? `
                <ul class="bullets">
                    ${proj.bullets.map(b => `<li>${escapeHtml(getBulletText(b))}</li>`).join('')}
                </ul>
                ` : ''}
            </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Education -->
        ${education.length > 0 ? `
        <div class="section">
            <div class="section-title">Education</div>
            ${education.map(edu => `
            <div class="entry">
                <div class="entry-header">
                    <div>
                        <div class="entry-title">${escapeHtml(edu.degree || '')}${edu.fieldOfStudy ? ` in ${escapeHtml(edu.fieldOfStudy)}` : ''}</div>
                        <div class="entry-subtitle">${escapeHtml(edu.school || '')}${edu.gpa ? ` · GPA: ${escapeHtml(edu.gpa)}` : ''}</div>
                    </div>
                    <div class="entry-date">${escapeHtml(edu.startDate || '')} — ${escapeHtml(edu.endDate || '')}</div>
                </div>
            </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Skills -->
        ${(skills && (skills.technical?.length || skills.tools?.length || skills.soft?.length || skills.languages?.length || skills.certifications?.length)) ? `
        <div class="section">
            <div class="section-title">Skills</div>
            <div class="skills-grid">
                ${skills.technical?.length ? `<div class="skill-row"><span class="skill-label">Technical:</span><span class="skill-value">${skills.technical.map(s => escapeHtml(s)).join(', ')}</span></div>` : ''}
                ${skills.tools?.length ? `<div class="skill-row"><span class="skill-label">Tools & Frameworks:</span><span class="skill-value">${skills.tools.map(s => escapeHtml(s)).join(', ')}</span></div>` : ''}
                ${skills.soft?.length ? `<div class="skill-row"><span class="skill-label">Soft Skills:</span><span class="skill-value">${skills.soft.map(s => escapeHtml(s)).join(', ')}</span></div>` : ''}
                ${skills.languages?.length ? `<div class="skill-row"><span class="skill-label">Languages:</span><span class="skill-value">${skills.languages.map(s => escapeHtml(s)).join(', ')}</span></div>` : ''}
                ${skills.certifications?.length ? `<div class="skill-row"><span class="skill-label">Certifications:</span><span class="skill-value">${skills.certifications.map(s => escapeHtml(s)).join(', ')}</span></div>` : ''}
            </div>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
};

/**
 * Modern Template - Bold accent, sidebar-style 
 */
const renderModernTemplate = (data) => {
    const { personalInfo = {}, experience = [], education = [], projects = [], skills = {} } = data;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 0; }

        body {
            font-family: 'Outfit', sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            color: #1e293b;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            display: grid;
            grid-template-columns: 68mm 1fr;
        }

        /* Sidebar */
        .sidebar {
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 24pt 14pt;
        }

        .sidebar h1 {
            font-size: 18pt;
            font-weight: 700;
            margin-bottom: 4pt;
            line-height: 1.2;
        }

        .sidebar .tagline {
            font-size: 9pt;
            color: #94a3b8;
            margin-bottom: 20pt;
        }

        .sidebar-section {
            margin-bottom: 16pt;
        }

        .sidebar-title {
            font-size: 8.5pt;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5pt;
            color: #7dd3fc;
            margin-bottom: 8pt;
            border-bottom: 1px solid rgba(255,255,255,0.15);
            padding-bottom: 3pt;
        }

        .sidebar-item {
            font-size: 9pt;
            color: #cbd5e1;
            margin-bottom: 4pt;
            line-height: 1.4;
        }

        .sidebar-item a {
            color: #7dd3fc;
            text-decoration: none;
        }

        .skill-tag {
            display: inline-block;
            background: rgba(125, 211, 252, 0.15);
            color: #bae6fd;
            padding: 2pt 6pt;
            border-radius: 3pt;
            font-size: 8pt;
            margin: 1.5pt 1pt;
        }

        /* Main Content */
        .main {
            padding: 24pt 20pt 18pt 18pt;
        }

        .section {
            margin-bottom: 14pt;
            page-break-inside: avoid;
        }

        .section-title {
            font-size: 12pt;
            font-weight: 700;
            color: #0f172a;
            letter-spacing: 0.5pt;
            border-left: 3pt solid #2563eb;
            padding-left: 8pt;
            margin-bottom: 8pt;
        }

        .summary-text {
            font-size: 9.5pt;
            color: #475569;
            line-height: 1.55;
            margin-bottom: 4pt;
        }

        .entry { margin-bottom: 10pt; page-break-inside: avoid; }

        .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }

        .entry-role {
            font-weight: 600;
            font-size: 10.5pt;
            color: #0f172a;
        }

        .entry-company {
            font-size: 9.5pt;
            color: #2563eb;
            font-weight: 500;
        }

        .entry-date {
            font-size: 8.5pt;
            color: #94a3b8;
            font-style: italic;
        }

        .bullets { list-style: none; padding-left: 0; margin-top: 3pt; }

        .bullets li {
            padding-left: 12pt;
            position: relative;
            font-size: 9pt;
            color: #475569;
            margin-bottom: 2pt;
        }

        .bullets li::before {
            content: "●";
            position: absolute;
            left: 0;
            color: #2563eb;
            font-size: 6pt;
            top: 3pt;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="sidebar">
            <h1>${escapeHtml(personalInfo.fullName || 'Your Name')}</h1>
            ${personalInfo.summary ? `<p class="tagline">${escapeHtml(personalInfo.summary).substring(0, 100)}...</p>` : ''}

            <div class="sidebar-section">
                <div class="sidebar-title">Contact</div>
                ${personalInfo.email ? `<div class="sidebar-item">📧 ${escapeHtml(personalInfo.email)}</div>` : ''}
                ${personalInfo.phone ? `<div class="sidebar-item">📱 ${escapeHtml(personalInfo.phone)}</div>` : ''}
                ${personalInfo.location ? `<div class="sidebar-item">📍 ${escapeHtml(personalInfo.location)}</div>` : ''}
                ${personalInfo.linkedin ? `<div class="sidebar-item"><a href="${escapeHtml(personalInfo.linkedin)}">LinkedIn ↗</a></div>` : ''}
                ${personalInfo.github ? `<div class="sidebar-item"><a href="${escapeHtml(personalInfo.github)}">GitHub ↗</a></div>` : ''}
            </div>

            ${(skills && (skills.technical?.length || skills.tools?.length)) ? `
            <div class="sidebar-section">
                <div class="sidebar-title">Skills</div>
                ${(skills.technical || []).map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}
                ${(skills.tools || []).map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}
            </div>
            ` : ''}

            ${education.length > 0 ? `
            <div class="sidebar-section">
                <div class="sidebar-title">Education</div>
                ${education.map(edu => `
                <div style="margin-bottom: 8pt;">
                    <div class="sidebar-item" style="color: white; font-weight: 500;">${escapeHtml(edu.degree || '')}</div>
                    <div class="sidebar-item">${escapeHtml(edu.school || '')}</div>
                    <div class="sidebar-item" style="font-size: 8pt;">${escapeHtml(edu.startDate || '')} — ${escapeHtml(edu.endDate || '')}</div>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>

        <div class="main">
            ${personalInfo.summary ? `
            <div class="section">
                <div class="section-title">Professional Summary</div>
                <p class="summary-text">${escapeHtml(personalInfo.summary)}</p>
            </div>
            ` : ''}

            ${experience.length > 0 ? `
            <div class="section">
                <div class="section-title">Experience</div>
                ${experience.map(exp => `
                <div class="entry">
                    <div class="entry-header">
                        <div>
                            <div class="entry-role">${escapeHtml(exp.role || '')}</div>
                            <div class="entry-company">${escapeHtml(exp.company || '')}${exp.location ? ` · ${escapeHtml(exp.location)}` : ''}</div>
                        </div>
                        <div class="entry-date">${escapeHtml(exp.startDate || '')} — ${exp.current ? 'Present' : escapeHtml(exp.endDate || '')}</div>
                    </div>
                    ${(exp.bullets && exp.bullets.length) ? `
                    <ul class="bullets">
                        ${exp.bullets.map(b => `<li>${escapeHtml(getBulletText(b))}</li>`).join('')}
                    </ul>
                    ` : ''}
                </div>
                `).join('')}
            </div>
            ` : ''}

            ${projects.length > 0 ? `
            <div class="section">
                <div class="section-title">Projects</div>
                ${projects.map(proj => `
                <div class="entry">
                    <div class="entry-role">${escapeHtml(proj.title || '')}</div>
                    ${(proj.bullets && proj.bullets.length) ? `
                    <ul class="bullets">
                        ${proj.bullets.map(b => `<li>${escapeHtml(getBulletText(b))}</li>`).join('')}
                    </ul>
                    ` : ''}
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
};

/**
 * Minimal Template - Ultra-clean, no frills
 */
const renderMinimalTemplate = (data) => {
    // Falls back to professional template with minimal styling
    return renderProfessionalTemplate(data);
};

// ============================================
// HELPER UTILITIES
// ============================================

/**
 * Get the display text for a bullet point
 * Prefers accepted rewritten text, then rewritten, then original
 */
const getBulletText = (bullet) => {
    if (!bullet) return '';
    if (typeof bullet === 'string') return bullet;
    if (bullet.accepted && bullet.rewritten) return bullet.rewritten;
    if (bullet.rewritten) return bullet.rewritten;
    return bullet.original || '';
};

/**
 * Escape HTML entities to prevent XSS
 */
const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Render Cover Letter HTML
 */
const renderCoverLetterHTML = (coverLetterData) => {
    const { content = {}, jobTitle = '', companyName = '' } = coverLetterData;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 0; }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 11pt;
            line-height: 1.65;
            color: #1a1a2e;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 30mm 25mm;
            margin: 0 auto;
        }

        .date {
            font-size: 10pt;
            color: #6b7280;
            margin-bottom: 20pt;
        }

        .greeting {
            font-size: 11pt;
            font-weight: 500;
            margin-bottom: 12pt;
        }

        .body-paragraph {
            font-size: 10.5pt;
            margin-bottom: 12pt;
            text-align: justify;
            color: #374151;
        }

        .closing {
            margin-top: 20pt;
            font-size: 10.5pt;
        }

        .signature {
            margin-top: 24pt;
            font-size: 11pt;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        
        <div class="greeting">${escapeHtml(content.greeting || 'Dear Hiring Manager,')}</div>
        
        <div class="body-paragraph">${escapeHtml(content.opening || '')}</div>
        
        <div class="body-paragraph">${escapeHtml(content.body || '')}</div>
        
        <div class="body-paragraph closing">${escapeHtml(content.closing || '')}</div>
        
        <div class="signature">${escapeHtml(content.signature || '')}</div>
    </div>
</body>
</html>`;
};

module.exports = {
    renderResumeHTML,
    renderCoverLetterHTML,
    escapeHtml,
    getBulletText
};
