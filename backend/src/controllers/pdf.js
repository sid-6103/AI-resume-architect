const puppeteer = require('puppeteer');
const Resume = require('../models/Resume');
const fs = require('fs');
const path = require('path');

// Helper to load CSS
const getStyles = (templateId = 'professional') => {
    try {
        const templateMap = {
            'professional': 'pdfStyles.css',
            'modern': 'modernStyles.css',
            'minimalist': 'minimalist.css',
            'compact': 'compact.css',
            'classic': 'classic.css',
            'creative': 'creative.css',
            'executive': 'executive.css'
        };
        const fileName = templateMap[templateId] || 'pdfStyles.css';
        const stylePath = path.join(__dirname, `../utils/${fileName}`);
        return fs.readFileSync(stylePath, 'utf8');
    } catch (e) {
        console.error('CSS Load Error:', e);
        return '';
    }
};



// Helper: Generate HTML from Resume Data
const generateHTML = (resume) => {
    const templateId = resume.templateId || 'professional';
    const styles = getStyles(templateId);

    // safe getters
    const p = resume.personalInfo || {};
    const exp = resume.experience || [];
    const edu = resume.education || [];
    const proj = resume.projects || [];
    const skills = resume.skills || {};

    const contact = [
        p.email,
        p.phone,
        p.location,
        p.linkedin ? `<a href="${p.linkedin}">LinkedIn</a>` : '',
        p.github ? `<a href="${p.github}">GitHub</a>` : '',
        p.website ? `<a href="${p.website}">Portfolio</a>` : ''
    ].filter(Boolean).join(' | ');

    const technicalSkills = (skills.technical || []).join(', ');
    const toolsSkills = (skills.tools || []).join(', ');
    const softSkills = (skills.soft || []).join(', ');

    const headerHTML = `
        <div class="header">
            <h1>${p.fullName || 'Candidate Name'}</h1>
            <div class="contact-info">${contact}</div>
            ${p.summary ? `<p style="font-size: 12px; margin: 10px 0;">${p.summary}</p>` : ''}
        </div>
    `;

    const experienceHTML = exp.length > 0 ? `
        <div class="section">
            <div class="section-title">Experience</div>
            ${exp.map(e => `
                <div class="experience-item">
                    <div class="item-header">
                        <span>${e.company}</span>
                        <span>${e.startDate} - ${e.current ? 'Present' : e.endDate}</span>
                    </div>
                    <div class="item-sub">${e.role} ${e.location ? `| ${e.location}` : ''}</div>
                    <ul>
                        ${(e.bullets || []).map(b => `
                            <li>${b.accepted && b.rewritten ? b.rewritten : b.original}</li>
                        `).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
    ` : '';

    const projectsHTML = proj.length > 0 ? `
        <div class="section">
            <div class="section-title">Projects</div>
            ${proj.map(pr => `
                <div class="project-item">
                    <div class="item-header">
                        <span>${pr.link ? `<a href="${pr.link}" target="_blank" rel="noopener">${pr.title}</a>` : pr.title}</span>
                    </div>
                    <div class="item-sub">${(pr.technologies || []).join(', ')}</div>
                    <ul>
                        ${(pr.bullets || []).map(b => `
                             <li>${b.accepted && b.rewritten ? b.rewritten : b.original}</li>
                        `).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
    ` : '';

    const educationHTML = edu.length > 0 ? `
        <div class="section">
            <div class="section-title">Education</div>
            ${edu.map(ed => `
                <div class="education-item">
                    <div class="item-header">
                        <span>${ed.school}</span>
                        <span>${ed.startDate} - ${ed.endDate}</span>
                    </div>
                    <div class="item-sub">${ed.degree} ${ed.fieldOfStudy ? `in ${ed.fieldOfStudy}` : ''} ${ed.gpa ? `(GPA: ${ed.gpa})` : ''}</div>
                </div>
            `).join('')}
        </div>
    ` : '';

    const skillsHTML = `
        <div class="section">
            <div class="section-title">Skills</div>
            <div class="skills-list">
                ${technicalSkills ? `<div><strong>Technical:</strong> ${technicalSkills}</div>` : ''}
                ${toolsSkills ? `<div><strong>Tools:</strong> ${toolsSkills}</div>` : ''}
                ${softSkills ? `<div><strong>Soft Skills:</strong> ${softSkills}</div>` : ''}
            </div>
        </div>
    `;

    let mainContent;
    if (templateId === 'creative') {
        mainContent = `
            <div class="sidebar">
                <div class="contact-sidebar">
                    <div class="section-title">Contact</div>
                    <div style="font-size: 11px; word-break: break-all;">
                        ${p.email ? `<div>${p.email}</div>` : ''}
                        ${p.phone ? `<div>${p.phone}</div>` : ''}
                        ${p.location ? `<div>${p.location}</div>` : ''}
                    </div>
                </div>
                ${skillsHTML}
                ${educationHTML}
            </div>
            <div class="main-content">
                <div class="header">
                    <h1>${p.fullName || 'Candidate Name'}</h1>
                    ${p.summary ? `<p style="font-size: 13px; line-height: 1.6; margin: 10px 0;">${p.summary}</p>` : ''}
                </div>
                ${experienceHTML}
                ${projectsHTML}
            </div>
        `;
    } else {
        mainContent = `
            ${headerHTML}
            ${experienceHTML}
            ${projectsHTML}
            ${educationHTML}
            ${skillsHTML}
        `;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            ${styles}
        </style>
    </head>
    <body class="template-${templateId}">
        ${mainContent}
    </body>
    </html>
    `;
};


// @desc    Generate PDF from Resume
// @route   GET /api/pdf/generate/:id
// @access  Public
exports.generatePDF = async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);

        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        // Check ownership
        if (resume.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        const html = generateHTML(resume);

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: '0px', // Handled by CSS for more control
                bottom: '0px',
                left: '0px',
                right: '0px'
            }
        });


        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename="resume-${resume.personalInfo.fullName ? resume.personalInfo.fullName.replace(/\s+/g, '_') : 'expert'}.pdf"`,
        });

        res.send(pdfBuffer);

    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ success: false, message: 'Failed to generate PDF', error: err.message });
    }
};
