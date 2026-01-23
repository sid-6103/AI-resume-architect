const model = require('../config/gemini');
const Resume = require('../models/Resume');

/**
 * AI RESUME OPTIMIZATION ENGINE
 * 
 * Features:
 * 1. JD Analysis with keyword extraction & ranking
 * 2. ATS Scoring with weighted formula
 * 3. Bullet rewriting with keyword injection
 * 4. Magic Button orchestration
 */

// ============================================
// PROMPT TEMPLATES
// ============================================

const PROMPTS = {
    analyzeJD: (jdText) => `
You are an expert ATS (Applicant Tracking System) analyzer.

Analyze this job description and extract keywords. Categorize them into:
1. technicalSkills - Programming languages, frameworks, technical abilities
2. tools - Software, platforms, tools mentioned
3. softSkills - Communication, leadership, interpersonal skills
4. methodologies - Agile, Scrum, DevOps, processes

For each category, rank keywords by importance (most important first).
Only include keywords that appear in the JD or are strongly implied.

Return ONLY valid JSON in this exact format:
{
  "technicalSkills": ["skill1", "skill2"],
  "tools": ["tool1", "tool2"],
  "softSkills": ["skill1", "skill2"],
  "methodologies": ["method1", "method2"],
  "seniorityLevel": "junior|mid|senior|lead",
  "roleType": "string describing the role"
}

Job Description:
"""
${jdText}
"""
`,

    rewriteBullet: (bulletPoint, keyword, context) => `
You are a professional resume writer specializing in ATS optimization.

TASK: Rewrite this resume bullet point to naturally include the keyword "${keyword}".

STRICT RULES:
1. Maximum 25 words
2. Start with a strong action verb (Led, Developed, Implemented, etc.)
3. Include quantifiable results if context allows (%, $, numbers)
4. Keep the original meaning - DO NOT fabricate experience
5. Professional tone, no buzzwords or fluff
6. The keyword must fit naturally, not forced

Original bullet: "${bulletPoint}"
${context ? `Context (role/company): ${context}` : ''}

Respond with ONLY the rewritten bullet point, nothing else.
`,

    generateSummary: (resumeData, targetKeywords) => `
You are a professional resume writer.

Write a compelling 2-3 sentence professional summary for this candidate.
Target these keywords if relevant: ${targetKeywords.join(', ')}

Candidate Info:
- Current/Recent Role: ${resumeData.experience?.[0]?.role || 'Professional'}
- Industry: ${resumeData.experience?.[0]?.company || 'Technology'}
- Key Skills: ${resumeData.skills?.technical?.slice(0, 5).join(', ') || 'Various'}
- Years Experience: ${resumeData.experience?.length || 1}+ roles

Rules:
- Maximum 50 words
- No first person ("I am")
- Include 1-2 target keywords naturally
- Focus on value proposition

Respond with ONLY the summary text.
`
};

// ============================================
// JOB DESCRIPTION ANALYSIS
// ============================================

// @desc    Analyze Job Description & Extract Keywords
// @route   POST /api/ai/analyze-jd
// @access  Public
exports.analyzeJD = async (req, res) => {
    try {
        const { jdText, resumeId } = req.body;

        if (!jdText) {
            return res.status(400).json({
                success: false,
                message: 'Please provide job description text'
            });
        }

        const result = await model.generateContent(PROMPTS.analyzeJD(jdText));
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const keywords = JSON.parse(jsonMatch[0]);

        // If resumeId provided, save to resume
        if (resumeId) {
            await Resume.findByIdAndUpdate(resumeId, {
                'atsData.targetJD': jdText,
                'atsData.extractedKeywords': {
                    technical: keywords.technicalSkills || [],
                    tools: keywords.tools || [],
                    soft: keywords.softSkills || [],
                    methodologies: keywords.methodologies || []
                },
                'atsData.lastAnalyzed': new Date()
            });
        }

        res.status(200).json({
            success: true,
            data: {
                keywords,
                totalKeywords: [
                    ...(keywords.technicalSkills || []),
                    ...(keywords.tools || []),
                    ...(keywords.softSkills || []),
                    ...(keywords.methodologies || [])
                ].length
            }
        });
    } catch (err) {
        console.error('JD Analysis Error:', err);
        res.status(400).json({
            success: false,
            message: err.message || 'Failed to analyze job description'
        });
    }
};

// ============================================
// ATS SCORING ENGINE
// ============================================

/**
 * ATS Scoring Formula:
 * - Technical Skills: 40% weight
 * - Tools: 25% weight
 * - Soft Skills: 15% weight
 * - Methodologies: 20% weight
 */
const WEIGHTS = {
    technical: 0.40,
    tools: 0.25,
    soft: 0.15,
    methodologies: 0.20
};

function calculateCategoryScore(resumeText, keywords) {
    if (!keywords || keywords.length === 0) return { score: 100, matched: [], missing: [] };

    const matched = [];
    const missing = [];

    keywords.forEach(keyword => {
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (regex.test(resumeText)) {
            matched.push(keyword);
        } else {
            missing.push(keyword);
        }
    });

    const score = keywords.length > 0 ? (matched.length / keywords.length) * 100 : 100;
    return { score, matched, missing };
}

// @desc    Calculate ATS Score
// @route   POST /api/ai/score
// @access  Public
exports.calculateATSScore = async (req, res) => {
    try {
        const { resumeId, targetKeywords, resumeData } = req.body;

        let resume;
        let keywords = targetKeywords;

        // Get resume if ID provided
        if (resumeId) {
            resume = await Resume.findById(resumeId);
            if (!resume) {
                return res.status(404).json({ success: false, message: 'Resume not found' });
            }
            // Use stored keywords if not provided
            if (!keywords && resume.atsData?.extractedKeywords) {
                keywords = resume.atsData.extractedKeywords;
            }
        }

        if (!keywords) {
            return res.status(400).json({
                success: false,
                message: 'No keywords provided. Run JD analysis first.'
            });
        }

        // Build resume text for matching
        const data = resume || resumeData;
        const resumeText = buildResumeText(data);

        // Calculate scores by category
        const technicalResult = calculateCategoryScore(resumeText, keywords.technical || keywords.technicalSkills);
        const toolsResult = calculateCategoryScore(resumeText, keywords.tools);
        const softResult = calculateCategoryScore(resumeText, keywords.soft || keywords.softSkills);
        const methodResult = calculateCategoryScore(resumeText, keywords.methodologies);

        // Weighted final score
        const finalScore = Math.round(
            technicalResult.score * WEIGHTS.technical +
            toolsResult.score * WEIGHTS.tools +
            softResult.score * WEIGHTS.soft +
            methodResult.score * WEIGHTS.methodologies
        );

        // Combine results
        const allMatched = [
            ...technicalResult.matched,
            ...toolsResult.matched,
            ...softResult.matched,
            ...methodResult.matched
        ];
        const allMissing = [
            ...technicalResult.missing,
            ...toolsResult.missing,
            ...softResult.missing,
            ...methodResult.missing
        ];

        // Generate suggestions (prioritize high-weight missing keywords)
        const suggestions = [
            ...technicalResult.missing.slice(0, 3).map(k => `Add experience with "${k}" to boost technical match`),
            ...toolsResult.missing.slice(0, 2).map(k => `Include "${k}" tool proficiency`),
            ...methodResult.missing.slice(0, 2).map(k => `Mention experience with "${k}" methodology`)
        ].slice(0, 5);

        const atsData = {
            atsScore: finalScore,
            breakdown: {
                technical: Math.round(technicalResult.score),
                tools: Math.round(toolsResult.score),
                soft: Math.round(softResult.score),
                methodologies: Math.round(methodResult.score)
            },
            matchedKeywords: allMatched,
            missingKeywords: allMissing,
            suggestions
        };

        // Save to resume if ID provided
        if (resumeId && resume) {
            resume.atsData.previousScore = resume.atsData.atsScore;
            resume.atsData.atsScore = finalScore;
            resume.atsData.matchedKeywords = allMatched;
            resume.atsData.missingKeywords = allMissing;
            resume.atsData.suggestions = suggestions;
            await resume.save();
        }

        res.status(200).json({
            success: true,
            data: atsData
        });
    } catch (err) {
        console.error('ATS Scoring Error:', err);
        res.status(400).json({ success: false, message: err.message });
    }
};

// Helper: Build searchable resume text
function buildResumeText(resume) {
    if (!resume) return '';

    const parts = [];

    // Personal info & summary
    if (resume.personalInfo?.summary) parts.push(resume.personalInfo.summary);

    // Experience bullets
    resume.experience?.forEach(exp => {
        parts.push(exp.role, exp.company);
        exp.bullets?.forEach(b => {
            parts.push(b.accepted && b.rewritten ? b.rewritten : b.original);
        });
        // Legacy support for highlights array
        exp.highlights?.forEach(h => parts.push(h));
    });

    // Projects
    resume.projects?.forEach(proj => {
        parts.push(proj.title);
        proj.technologies?.forEach(t => parts.push(t));
        proj.bullets?.forEach(b => {
            parts.push(b.accepted && b.rewritten ? b.rewritten : b.original);
        });
    });

    // Skills
    if (resume.skills) {
        parts.push(...(resume.skills.technical || []));
        parts.push(...(resume.skills.tools || []));
        parts.push(...(resume.skills.soft || []));
    }

    return parts.filter(Boolean).join(' ').toLowerCase();
}

// ============================================
// AI BULLET REWRITER
// ============================================

// @desc    Rewrite a single bullet point with keyword injection
// @route   POST /api/ai/rewrite
// @access  Public
exports.rewriteBulletPoint = async (req, res) => {
    try {
        const { bulletPoint, keyword, keywords, context, resumeId, experienceIndex, bulletIndex } = req.body;

        if (!bulletPoint) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a bullet point to rewrite'
            });
        }

        // Use single keyword or first from array
        const targetKeyword = keyword || (keywords && keywords[0]) || '';

        const result = await model.generateContent(
            PROMPTS.rewriteBullet(bulletPoint, targetKeyword, context)
        );
        const response = await result.response;
        let rewrittenText = response.text().trim();

        // Clean up any quotes or extra formatting
        rewrittenText = rewrittenText.replace(/^["']|["']$/g, '').trim();

        // Validate word count
        const wordCount = rewrittenText.split(/\s+/).filter(w => w).length;
        if (wordCount > 30) {
            // If too long, try to truncate gracefully
            const words = rewrittenText.split(/\s+/);
            rewrittenText = words.slice(0, 25).join(' ');
        }

        // Update resume if IDs provided
        if (resumeId && experienceIndex !== undefined && bulletIndex !== undefined) {
            const resume = await Resume.findById(resumeId);
            if (resume && resume.experience[experienceIndex]?.bullets[bulletIndex]) {
                resume.experience[experienceIndex].bullets[bulletIndex].rewritten = rewrittenText;
                resume.experience[experienceIndex].bullets[bulletIndex].isAIRewritten = true;
                resume.experience[experienceIndex].bullets[bulletIndex].injectedKeywords = targetKeyword ? [targetKeyword] : [];
                await resume.save();
            }
        }

        res.status(200).json({
            success: true,
            data: {
                original: bulletPoint,
                rewritten: rewrittenText,
                injectedKeyword: targetKeyword,
                wordCount
            }
        });
    } catch (err) {
        console.error('Rewrite Error:', err);
        res.status(400).json({ success: false, message: err.message });
    }
};

// ============================================
// MAGIC BUTTON - FULL OPTIMIZATION
// ============================================

// @desc    Magic Button - Full resume optimization workflow
// @route   POST /api/ai/optimize
// @access  Public
exports.optimizeResume = async (req, res) => {
    try {
        const { resumeId, jdText } = req.body;

        if (!resumeId || !jdText) {
            return res.status(400).json({
                success: false,
                message: 'Please provide resumeId and job description'
            });
        }

        const resume = await Resume.findById(resumeId);
        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        // Step 1: Analyze JD
        const jdResult = await model.generateContent(PROMPTS.analyzeJD(jdText));
        const jdResponse = await jdResult.response;
        const jdText2 = jdResponse.text();
        const jsonMatch = jdText2.match(/\{[\s\S]*\}/);
        const keywords = JSON.parse(jsonMatch[0]);

        // Step 2: Calculate initial ATS score
        const resumeText = buildResumeText(resume);
        const allKeywords = [
            ...(keywords.technicalSkills || []),
            ...(keywords.tools || []),
            ...(keywords.softSkills || []),
            ...(keywords.methodologies || [])
        ];

        let matched = [];
        let missing = [];
        allKeywords.forEach(kw => {
            if (resumeText.includes(kw.toLowerCase())) {
                matched.push(kw);
            } else {
                missing.push(kw);
            }
        });

        const initialScore = Math.round((matched.length / allKeywords.length) * 100);

        // Step 3: Rewrite bullets with missing keywords
        const optimizedBullets = [];
        const keywordsToInject = missing.slice(0, 5); // Top 5 missing keywords

        for (let i = 0; i < Math.min(resume.experience.length, 3); i++) {
            const exp = resume.experience[i];
            for (let j = 0; j < Math.min(exp.bullets?.length || 0, 2); j++) {
                const bullet = exp.bullets[j];
                const keyword = keywordsToInject[optimizedBullets.length % keywordsToInject.length];

                if (keyword && bullet.original) {
                    try {
                        const rewriteResult = await model.generateContent(
                            PROMPTS.rewriteBullet(bullet.original, keyword, `${exp.role} at ${exp.company}`)
                        );
                        const rewriteResponse = await rewriteResult.response;
                        const rewritten = rewriteResponse.text().trim().replace(/^["']|["']$/g, '');

                        optimizedBullets.push({
                            experienceIndex: i,
                            bulletIndex: j,
                            original: bullet.original,
                            rewritten,
                            injectedKeyword: keyword
                        });

                        // Update in resume
                        resume.experience[i].bullets[j].rewritten = rewritten;
                        resume.experience[i].bullets[j].isAIRewritten = true;
                        resume.experience[i].bullets[j].injectedKeywords = [keyword];
                    } catch (e) {
                        console.error('Bullet rewrite failed:', e.message);
                    }
                }
            }
        }

        // Step 4: Recalculate ATS score
        const newResumeText = buildResumeText(resume);
        let newMatched = [];
        allKeywords.forEach(kw => {
            if (newResumeText.includes(kw.toLowerCase())) {
                newMatched.push(kw);
            }
        });
        const newScore = Math.round((newMatched.length / allKeywords.length) * 100);

        // Save resume with all updates
        resume.atsData = {
            targetJD: jdText,
            extractedKeywords: {
                technical: keywords.technicalSkills || [],
                tools: keywords.tools || [],
                soft: keywords.softSkills || [],
                methodologies: keywords.methodologies || []
            },
            atsScore: newScore,
            previousScore: initialScore,
            matchedKeywords: newMatched,
            missingKeywords: allKeywords.filter(k => !newMatched.includes(k)),
            lastAnalyzed: new Date()
        };
        resume.status = 'optimizing';
        await resume.save();

        res.status(200).json({
            success: true,
            data: {
                initialScore,
                newScore,
                improvement: newScore - initialScore,
                optimizedBullets,
                keywords,
                message: `ATS score improved from ${initialScore}% to ${newScore}%`
            }
        });
    } catch (err) {
        console.error('Magic Button Error:', err);
        res.status(400).json({ success: false, message: err.message });
    }
};

// ============================================
// ACCEPT/REJECT REWRITTEN BULLETS
// ============================================

// @desc    Accept or reject AI rewritten bullet
// @route   POST /api/ai/bullet-decision
// @access  Public
exports.bulletDecision = async (req, res) => {
    try {
        const { resumeId, experienceIndex, bulletIndex, accept } = req.body;

        const resume = await Resume.findById(resumeId);
        if (!resume) {
            return res.status(404).json({ success: false, message: 'Resume not found' });
        }

        const bullet = resume.experience[experienceIndex]?.bullets[bulletIndex];
        if (!bullet) {
            return res.status(404).json({ success: false, message: 'Bullet not found' });
        }

        bullet.accepted = accept;

        // If rejected, clear the rewritten version
        if (!accept) {
            bullet.rewritten = null;
            bullet.isAIRewritten = false;
            bullet.injectedKeywords = [];
        }

        await resume.save();

        res.status(200).json({
            success: true,
            data: { accepted: accept }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// ============================================
// GENERATE PROFESSIONAL SUMMARY
// ============================================

// @desc    Generate AI professional summary
// @route   POST /api/ai/summary
// @access  Public
exports.generateSummary = async (req, res) => {
    try {
        const { resumeId, resumeData, targetKeywords } = req.body;

        let resume = resumeData;
        let keywords = targetKeywords || [];

        if (resumeId) {
            resume = await Resume.findById(resumeId);
            if (!resume) {
                return res.status(404).json({ success: false, message: 'Resume not found' });
            }
            if (resume.atsData?.extractedKeywords?.technical) {
                keywords = [
                    ...resume.atsData.extractedKeywords.technical.slice(0, 3),
                    ...resume.atsData.extractedKeywords.tools.slice(0, 2)
                ];
            }
        }

        const result = await model.generateContent(
            PROMPTS.generateSummary(resume, keywords)
        );
        const response = await result.response;
        const summary = response.text().trim().replace(/^["']|["']$/g, '');

        if (resumeId) {
            await Resume.findByIdAndUpdate(resumeId, {
                'personalInfo.summary': summary
            });
        }

        res.status(200).json({
            success: true,
            data: { summary }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
