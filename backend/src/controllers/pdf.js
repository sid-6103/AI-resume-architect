const Resume = require('../models/Resume');
const { generateResumePDF, getFilePath } = require('../services/pdfService');

/**
 * PDF CONTROLLER
 * Handles PDF generation and download endpoints
 */

// @desc    Generate PDF from resume
// @route   POST /api/resume/generate-pdf
// @access  Public (will be protected in production)
exports.generatePDF = async (req, res) => {
    try {
        const { resumeId, resumeData, templateId } = req.body;

        let data;

        if (resumeId) {
            // Fetch from database
            const resume = await Resume.findById(resumeId);
            if (!resume) {
                return res.status(404).json({
                    success: false,
                    message: 'Resume not found'
                });
            }
            data = resume.toObject();
        } else if (resumeData) {
            // Use provided data directly
            data = resumeData;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Please provide resumeId or resumeData'
            });
        }

        const result = await generateResumePDF(data, templateId || data.templateId);

        res.status(200).json({
            success: true,
            data: {
                fileName: result.fileName,
                downloadUrl: result.downloadUrl,
                format: result.format
            }
        });
    } catch (err) {
        console.error('PDF generation error:', err);
        res.status(500).json({
            success: false,
            message: `PDF generation failed: ${err.message}`
        });
    }
};

// @desc    Download PDF file
// @route   GET /api/resume/download/:fileName
// @access  Public
exports.downloadPDF = async (req, res) => {
    try {
        const { fileName } = req.params;

        // Sanitize filename to prevent path traversal
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
        const filePath = getFilePath(sanitizedName);

        if (!filePath) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Set appropriate content type
        const isPDF = sanitizedName.endsWith('.pdf');
        const contentType = isPDF ? 'application/pdf' : 'text/html';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}"`);
        res.sendFile(filePath);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Generate PDF and return as stream (for inline preview)
// @route   POST /api/resume/preview-pdf
// @access  Public
exports.previewPDF = async (req, res) => {
    try {
        const { resumeId, resumeData, templateId } = req.body;

        let data;
        if (resumeId) {
            const resume = await Resume.findById(resumeId);
            if (!resume) {
                return res.status(404).json({ success: false, message: 'Resume not found' });
            }
            data = resume.toObject();
        } else if (resumeData) {
            data = resumeData;
        } else {
            return res.status(400).json({ success: false, message: 'Provide resumeId or resumeData' });
        }

        const result = await generateResumePDF(data, templateId || data.templateId);

        const isPDF = result.format === 'pdf';
        res.setHeader('Content-Type', isPDF ? 'application/pdf' : 'text/html');
        res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
        res.sendFile(result.filePath);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
