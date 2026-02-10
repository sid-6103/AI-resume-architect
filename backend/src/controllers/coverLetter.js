const model = require('../config/gemini');
const CoverLetter = require('../models/CoverLetter');
const Resume = require('../models/Resume');
const { generateCoverLetterPDF } = require('../services/pdfService');

/**
 * COVER LETTER CONTROLLER
 * AI-powered cover letter generation with editing and export
 */

// Cover Letter Generation Prompt
const COVER_LETTER_PROMPT = (resumeData, jobDescription, tone, companyName, jobTitle) => `
You are an expert career coach and cover letter writer. Generate a compelling, professional cover letter.

CANDIDATE INFORMATION:
- Name: ${resumeData.personalInfo?.fullName || 'Candidate'}
- Current Role: ${resumeData.experience?.[0]?.role || 'Professional'}
- Company: ${resumeData.experience?.[0]?.company || ''}
- Skills: ${[...(resumeData.skills?.technical || []), ...(resumeData.skills?.tools || [])].join(', ')}
- Summary: ${resumeData.personalInfo?.summary || ''}

JOB DETAILS:
- Job Title: ${jobTitle || 'the position'}
- Company: ${companyName || 'the company'}
- Job Description: ${jobDescription}

TONE: ${tone || 'professional'}

INSTRUCTIONS:
1. Write a complete cover letter with these sections:
   - greeting: A professional greeting (e.g., "Dear Hiring Manager,")
   - opening: A compelling opening paragraph (2-3 sentences) that hooks the reader
   - body: 2-3 paragraphs highlighting relevant experience and skills that match the JD
   - closing: A strong closing paragraph with call to action
   - signature: "Sincerely,\\n${resumeData.personalInfo?.fullName || 'Candidate'}"

2. Match the tone specified
3. Reference specific skills that match the job description
4. Include quantifiable achievements from the resume where applicable
5. Keep it concise (250-400 words total)

Return ONLY valid JSON in this exact format:
{
    "greeting": "Dear ...",
    "opening": "...",
    "body": "...",
    "closing": "...",
    "signature": "Sincerely,\\n..."
}
`;

// @desc    Generate AI cover letter
// @route   POST /api/ai/generate-cover-letter
// @access  Public (will be Pro-restricted in production)
exports.generateCoverLetter = async (req, res) => {
    try {
        const { resumeId, resumeData, jobDescription, jobTitle, companyName, tone } = req.body;

        if (!jobDescription) {
            return res.status(400).json({
                success: false,
                message: 'Job description is required'
            });
        }

        // Get resume data
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
            return res.status(400).json({
                success: false,
                message: 'Please provide resumeId or resumeData'
            });
        }

        // Generate with AI
        const prompt = COVER_LETTER_PROMPT(data, jobDescription, tone, companyName, jobTitle);

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON response
        let coverLetterContent;
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                coverLetterContent = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in AI response');
            }
        } catch (parseError) {
            console.error('AI response parse error:', parseError);
            // Fallback: treat entire response as body
            coverLetterContent = {
                greeting: 'Dear Hiring Manager,',
                opening: responseText.substring(0, 200),
                body: responseText,
                closing: 'I look forward to discussing this opportunity further.',
                signature: `Sincerely,\n${data.personalInfo?.fullName || 'Candidate'}`
            };
        }

        // Build full text
        const fullText = [
            coverLetterContent.greeting,
            '',
            coverLetterContent.opening,
            '',
            coverLetterContent.body,
            '',
            coverLetterContent.closing,
            '',
            coverLetterContent.signature
        ].join('\n');

        // Save to database if user is authenticated
        let savedCoverLetter = null;
        const userId = req.user?.id;

        if (userId) {
            savedCoverLetter = await CoverLetter.create({
                user: userId,
                resume: resumeId || null,
                jobTitle: jobTitle || '',
                companyName: companyName || '',
                jobDescription,
                content: {
                    ...coverLetterContent,
                    fullText
                },
                tone: tone || 'professional',
                title: `Cover Letter - ${companyName || jobTitle || 'Untitled'}`,
                status: 'generated'
            });

            // Add to user's cover letters
            const User = require('../models/User');
            await User.findByIdAndUpdate(userId, {
                $push: { coverLetters: savedCoverLetter._id }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                content: {
                    ...coverLetterContent,
                    fullText
                },
                coverLetterId: savedCoverLetter?._id,
                message: 'Cover letter generated successfully'
            }
        });
    } catch (err) {
        console.error('Cover letter generation error:', err);
        res.status(500).json({
            success: false,
            message: `Cover letter generation failed: ${err.message}`
        });
    }
};

// @desc    Update cover letter content
// @route   PUT /api/cover-letter/:id
// @access  Private
exports.updateCoverLetter = async (req, res) => {
    try {
        const { content, title } = req.body;

        let coverLetter = await CoverLetter.findById(req.params.id);
        if (!coverLetter) {
            return res.status(404).json({ success: false, message: 'Cover letter not found' });
        }

        if (content) {
            coverLetter.content = {
                ...coverLetter.content,
                ...content,
                fullText: [
                    content.greeting || coverLetter.content.greeting,
                    '', content.opening || coverLetter.content.opening,
                    '', content.body || coverLetter.content.body,
                    '', content.closing || coverLetter.content.closing,
                    '', content.signature || coverLetter.content.signature
                ].join('\n')
            };
            coverLetter.status = 'edited';
        }

        if (title) coverLetter.title = title;

        await coverLetter.save();

        res.status(200).json({
            success: true,
            data: coverLetter
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Export cover letter as PDF
// @route   POST /api/cover-letter/:id/export-pdf
// @access  Private
exports.exportCoverLetterPDF = async (req, res) => {
    try {
        const coverLetter = await CoverLetter.findById(req.params.id);
        if (!coverLetter) {
            return res.status(404).json({ success: false, message: 'Cover letter not found' });
        }

        const pdfResult = await generateCoverLetterPDF(coverLetter.toObject());

        coverLetter.pdfUrl = pdfResult.downloadUrl;
        coverLetter.status = 'exported';
        await coverLetter.save();

        res.status(200).json({
            success: true,
            data: {
                downloadUrl: pdfResult.downloadUrl,
                fileName: pdfResult.fileName
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get user's cover letters
// @route   GET /api/cover-letter
// @access  Private
exports.getCoverLetters = async (req, res) => {
    try {
        const coverLetters = await CoverLetter.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate('resume', 'personalInfo.fullName templateId');

        res.status(200).json({
            success: true,
            count: coverLetters.length,
            data: coverLetters
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get single cover letter
// @route   GET /api/cover-letter/:id
// @access  Private
exports.getCoverLetter = async (req, res) => {
    try {
        const coverLetter = await CoverLetter.findById(req.params.id)
            .populate('resume');

        if (!coverLetter) {
            return res.status(404).json({ success: false, message: 'Cover letter not found' });
        }

        res.status(200).json({
            success: true,
            data: coverLetter
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete cover letter
// @route   DELETE /api/cover-letter/:id
// @access  Private
exports.deleteCoverLetter = async (req, res) => {
    try {
        const coverLetter = await CoverLetter.findById(req.params.id);
        if (!coverLetter) {
            return res.status(404).json({ success: false, message: 'Cover letter not found' });
        }

        await coverLetter.deleteOne();

        // Remove from user's cover letters
        const User = require('../models/User');
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { coverLetters: coverLetter._id }
        });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
