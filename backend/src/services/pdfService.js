const path = require('path');
const fs = require('fs');
const { renderResumeHTML, renderCoverLetterHTML } = require('./templateRenderer');

/**
 * PDF GENERATION SERVICE
 * Uses Puppeteer (Headless Chrome) for pixel-perfect PDF rendering
 * 
 * Features:
 * - A4 page format with exact margins
 * - Multi-page resume support
 * - Embedded fonts
 * - Local storage with download URLs
 */

// PDF Output directory
const PDF_OUTPUT_DIR = path.join(__dirname, '../../pdfs');

// Ensure output directory exists
if (!fs.existsSync(PDF_OUTPUT_DIR)) {
    fs.mkdirSync(PDF_OUTPUT_DIR, { recursive: true });
}

// Lazy-load puppeteer to avoid startup delays
let puppeteer;
const getPuppeteer = () => {
    if (!puppeteer) {
        try {
            puppeteer = require('puppeteer');
        } catch (e) {
            console.warn('⚠️ Puppeteer not installed. PDF generation will use fallback.');
            return null;
        }
    }
    return puppeteer;
};

/**
 * Generate PDF from resume data
 * @param {Object} resumeData - Resume JSON from database
 * @param {String} templateId - Template to render
 * @param {String} filename - Optional custom filename
 * @returns {Object} { filePath, fileName, downloadUrl }
 */
const generateResumePDF = async (resumeData, templateId = 'professional', filename = null) => {
    const pup = getPuppeteer();

    // Generate HTML
    const html = renderResumeHTML(resumeData, templateId);

    // Create unique filename
    const safeName = (resumeData.personalInfo?.fullName || 'Resume')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50);
    const timestamp = Date.now();
    const fileName = filename || `${safeName}_${timestamp}.pdf`;
    const filePath = path.join(PDF_OUTPUT_DIR, fileName);

    if (!pup) {
        // Fallback: save HTML file if Puppeteer is not available
        const htmlPath = filePath.replace('.pdf', '.html');
        fs.writeFileSync(htmlPath, html, 'utf-8');
        return {
            filePath: htmlPath,
            fileName: fileName.replace('.pdf', '.html'),
            downloadUrl: `/api/resume/download/${fileName.replace('.pdf', '.html')}`,
            format: 'html'
        };
    }

    let browser;
    try {
        // Launch headless browser
        browser = await pup.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=none'
            ]
        });

        const page = await browser.newPage();

        // Set content with network idle wait for font loading
        await page.setContent(html, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 30000
        });

        // Wait extra time for Google Fonts to load
        await page.waitForFunction(() => document.fonts.ready, { timeout: 10000 })
            .catch(() => console.log('Font loading timeout, proceeding...'));

        // Generate PDF
        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: '0',
                right: '0',
                bottom: '0',
                left: '0'
            },
            displayHeaderFooter: false,
            scale: 1
        });

        console.log(`✅ PDF generated: ${fileName}`);

        return {
            filePath,
            fileName,
            downloadUrl: `/api/resume/download/${fileName}`,
            format: 'pdf'
        };
    } catch (error) {
        console.error('PDF generation error:', error.message);
        throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

/**
 * Generate PDF from cover letter data
 */
const generateCoverLetterPDF = async (coverLetterData) => {
    const pup = getPuppeteer();
    const html = renderCoverLetterHTML(coverLetterData);

    const safeName = (coverLetterData.companyName || 'CoverLetter')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50);
    const timestamp = Date.now();
    const fileName = `CoverLetter_${safeName}_${timestamp}.pdf`;
    const filePath = path.join(PDF_OUTPUT_DIR, fileName);

    if (!pup) {
        const htmlPath = filePath.replace('.pdf', '.html');
        fs.writeFileSync(htmlPath, html, 'utf-8');
        return {
            filePath: htmlPath,
            fileName: fileName.replace('.pdf', '.html'),
            downloadUrl: `/api/resume/download/${fileName.replace('.pdf', '.html')}`,
            format: 'html'
        };
    }

    let browser;
    try {
        browser = await pup.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setContent(html, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 30000
        });

        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        return {
            filePath,
            fileName,
            downloadUrl: `/api/resume/download/${fileName}`,
            format: 'pdf'
        };
    } catch (error) {
        throw new Error(`Cover letter PDF generation failed: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
};

/**
 * Get file path for download
 */
const getFilePath = (fileName) => {
    const filePath = path.join(PDF_OUTPUT_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return filePath;
};

/**
 * Delete a PDF file
 */
const deletePDF = (fileName) => {
    const filePath = path.join(PDF_OUTPUT_DIR, fileName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
};

/**
 * Clean up old PDFs (for cron/maintenance)
 */
const cleanupOldPDFs = (maxAgeDays = 7) => {
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

    const files = fs.readdirSync(PDF_OUTPUT_DIR);
    let cleaned = 0;

    files.forEach(file => {
        const filePath = path.join(PDF_OUTPUT_DIR, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            cleaned++;
        }
    });

    console.log(`🧹 Cleaned up ${cleaned} old PDF files`);
    return cleaned;
};

module.exports = {
    generateResumePDF,
    generateCoverLetterPDF,
    getFilePath,
    deletePDF,
    cleanupOldPDFs,
    PDF_OUTPUT_DIR
};
