const model = require('../config/gemini');
const Resume = require('../models/Resume');

// @desc    Analyze Job Description
// @route   POST /api/ai/analyze-jd
// @access  Public
exports.analyzeJD = async (req, res, next) => {
    try {
        const { jdText } = req.body;

        if (!jdText) {
            return res.status(400).json({ success: false, message: 'Please provide JD text' });
        }

        const prompt = `
            Analyze the following Job Description and extract the most important keywords.
            Categorize them into technicalSkills, tools, and softSkills.
            Return the response ONLY as a valid JSON object.
            
            JD Text:
            "${jdText}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Find the first '{' and last '}' to extract JSON
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');

        if (startIndex === -1 || endIndex === -1) {
            throw new Error('AI failed to return a valid JSON format. Try again.');
        }

        const jsonString = text.substring(startIndex, endIndex + 1);
        const keywords = JSON.parse(jsonString);

        res.status(200).json({
            success: true,
            data: keywords
        });
    } catch (err) {
        console.error('AI Error:', err);
        let message = err.message;

        if (message.includes('404')) {
            message = 'AI Model not found. Please check your GOOGLE_API_KEY. ';

            try {
                // Try to help the user by listing models
                const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(process.env.GOOGLE_API_KEY);
                // The SDK doesn't have a simple listModels, but we can suggest looking at Google AI Studio
                message += 'Ensure your key has access to "gemini-1.5-flash" in Google AI Studio.';
            } catch (listErr) {
                // Ignore errors during helper message creation
            }
        }
        res.status(400).json({ success: false, message });
    }
};

// @desc    AI Rewrite Bullet Point
// @route   POST /api/ai/rewrite
// @access  Public
exports.rewriteBulletPoint = async (req, res, next) => {
    try {
        const { bulletPoint, keywords } = req.body;

        if (!bulletPoint) {
            return res.status(400).json({ success: false, message: 'Please provide a bullet point' });
        }

        const prompt = `
            You are a professional resume editor. Rewrite the following resume bullet point to sound authoritative and impactful.
            Include the following keywords if possible: ${keywords ? keywords.join(', ') : 'none'}.
            Use strong action verbs and quantify results if the context allows.
            Keep it concise (1-2 sentences).
            
            Original Bullet Point:
            "${bulletPoint}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rewrittenText = response.text().trim();

        res.status(200).json({
            success: true,
            data: {
                original: bulletPoint,
                rewritten: rewrittenText
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Calculate ATS Score
// @route   POST /api/ai/score
// @access  Public
exports.calculateATSScore = async (req, res, next) => {
    try {
        const { resumeId, targetKeywords } = req.body;

        if (!resumeId || !targetKeywords) {
            return res.status(400).json({ success: false, message: 'Please provide resumeId and targetKeywords' });
        }

        const resume = await Resume.findById(resumeId);
        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        // Combine all resume text for matching
        const resumeText = JSON.stringify(resume).toLowerCase();

        const allKeywords = [
            ...(targetKeywords.technicalSkills || []),
            ...(targetKeywords.tools || []),
            ...(targetKeywords.softSkills || [])
        ];

        if (allKeywords.length === 0) {
            return res.status(400).json({ success: false, message: 'No keywords found to match' });
        }

        const matched = [];
        const missing = [];

        allKeywords.forEach(kw => {
            if (resumeText.includes(kw.toLowerCase())) {
                matched.push(kw);
            } else {
                missing.push(kw);
            }
        });

        const score = Math.round((matched.length / allKeywords.length) * 100);

        // Update resume with ATS data
        resume.atsData = {
            targetJD: targetKeywords.originalJD || '',
            atsScore: score,
            matchedKeywords: matched,
            missingKeywords: missing,
            suggestions: missing.slice(0, 5).map(kw => `Try to include experience with ${kw}`)
        };

        await resume.save();

        res.status(200).json({
            success: true,
            data: resume.atsData
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
