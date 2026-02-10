const pdf = require('pdf-parse');
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
You are an expert ATS (Applicant Tracking System) analyzer with deep knowledge of how ATS systems parse and score resumes.

Analyze this job description and extract ALL relevant keywords. Be thorough - ATS systems look for exact matches.

Categorize keywords into:
1. technicalSkills - Programming languages, frameworks, libraries, technical abilities, APIs, databases
2. tools - Software, platforms, IDEs, cloud services, monitoring tools, version control
3. softSkills - Communication, leadership, collaboration, problem-solving, interpersonal skills
4. methodologies - Agile, Scrum, DevOps, CI/CD, TDD, processes, frameworks

IMPORTANT: 
- Rank keywords by importance (most critical for the role first)
- Include both explicit mentions AND strongly implied requirements
- Include variations (e.g., "JavaScript" and "JS", "React" and "ReactJS")
- Extract at least 10 technical skills if present

Return ONLY valid JSON in this exact format:
{
  "technicalSkills": ["skill1", "skill2", ...],
  "tools": ["tool1", "tool2", ...],
  "softSkills": ["skill1", "skill2", ...],
  "methodologies": ["method1", "method2", ...],
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
2. Start with a strong action verb (Led, Developed, Implemented, Architected, Optimized, etc.)
3. Include quantifiable results if context allows (%, $, numbers)
4. Keep the original meaning - DO NOT fabricate experience
5. Professional tone, no buzzwords or fluff
6. The keyword must fit naturally, not forced

Original bullet: "${bulletPoint}"
${context ? `Context (role/company): ${context}` : ''}

Respond with ONLY the rewritten bullet point, nothing else.
`,

    optimizeBulletAggressive: (bulletPoint, keywords, context) => `
You are an expert ATS resume optimizer. Your goal is to maximize ATS score by naturally incorporating multiple relevant keywords.

TASK: Rewrite this bullet point to include AS MANY of these keywords as naturally fit: ${keywords.join(', ')}

Original bullet: "${bulletPoint}"
${context ? `Context: ${context}` : ''}

CRITICAL RULES:
1. Maximum 35 words
2. Start with POWERFUL action verb (Spearheaded, Architected, Engineered, Orchestrated, Transformed, Pioneered)
3. MUST include quantifiable metrics (%, $, time saved, users impacted, performance improvement)
4. YOU MUST USE THE EXACT KEYWORDS provided - do not change their spelling or form.
5. Naturally incorporate 2-4 keywords from the list.
6. Keep the core meaning - never fabricate experience
7. Sound impressive but professional - this is for a top-tier role

Example transformations:
- "Worked on website" → "Engineered scalable React web application serving 50K+ users with 99.9% uptime"
- "Fixed bugs" → "Optimized debugging workflows using Agile methodologies, reducing defect resolution time by 40%"
- "Made reports" → "Developed automated Python analytics pipeline generating real-time dashboards for stakeholder decision-making"

Respond with ONLY the optimized bullet point.
`,

    optimizeSummary: (resumeData, targetKeywords, jdText) => `
You are an expert resume writer specializing in ATS-optimized professional summaries.

Write a POWERFUL 4-5 sentence professional summary that will score highly on ATS systems.

Target Keywords to Include (use at least 6-8): ${targetKeywords.join(', ')}

Candidate Information:
- Current/Recent Role: ${resumeData.experience?.[0]?.role || 'Software Professional'}
- Company: ${resumeData.experience?.[0]?.company || 'Technology Company'}
- Key Skills: ${resumeData.skills?.technical?.join(', ') || 'Various technical skills'}
- Tools: ${resumeData.skills?.tools?.join(', ') || 'Modern development tools'}
- Number of Roles: ${resumeData.experience?.length || 1}

Job Context: ${jdText?.substring(0, 400) || 'Technical role'}

RULES:
1. 80-100 words maximum
2. NO first person ("I am", "I have")
3. Include 6+ target keywords naturally woven in. USE EXACT KEYWORDS.
4. Lead with years of experience and core expertise
5. Mention 3-4 key technologies/skills
6. End with value proposition or achievement
7. Sound confident and accomplished

Example format:
"Results-driven [Role] with X+ years of expertise in [Keywords]. Proven track record of [Achievement with metrics] leveraging [Technologies]. Skilled in [More keywords] with experience in [Methodology]. Passionate about [Value proposition]."

Respond with ONLY the summary text.
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
`,

    generateCoverLetter: (resumeData, jdText) => `
You are a professional career coach and expert copywriter.

TASK: Write a compelling, personalized cover letter for the following candidate applying to the job described.

CANDIDATE PROFILE:
- Name: ${resumeData.personalInfo?.fullName || 'Candidate'}
- Current Role: ${resumeData.experience?.[0]?.role || 'Professional'}
- Key Skills: ${resumeData.skills?.technical?.join(', ') || 'Various'}
- Top Achievement: ${resumeData.experience?.[0]?.bullets?.[0]?.original || 'Proven track record of success'}

JOB DESCRIPTION:
"""
${jdText?.substring(0, 1000) || 'Standard Industry Role'}
"""

GUIDELINES:
1. Professional yet engaging tone.
2. Structure:
   - Hook: Express enthusiasm for the specific role/company.
   - Body Paragraph 1: Highlight relevant experience that matches the JD.
   - Body Paragraph 2: Showcase soft skills/culture fit.
   - Closing: Call to action (interview request).
3. Use placeholders like [Hiring Manager Name] if unknown.
4. Keep it under 300 words.

Respond with ONLY the cover letter text, no markdown code blocks.
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
            const resume = await Resume.findById(resumeId);
            if (resume && resume.userId.toString() === req.user.id) {
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
    technical: 0.35,
    tools: 0.20,
    soft: 0.15,
    methodologies: 0.15,
    formatting: 0.15 // New criteria for formatting & metrics
};

function calculateCategoryScore(resumeText, keywords) {
    if (!keywords || keywords.length === 0) return { score: 0, matched: [], missing: [] }; // FIX: Return 0 if no keywords found in JD

    const matched = [];
    const missing = [];

    keywords.forEach(keyword => {
        // More strict matching: word boundary or start/end of string
        // This prevents "java" matching "javascript" if not careful, but we want to be generous for partial matches in some cases
        // Using simple case-insensitive match for now, but could be stricter
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (regex.test(resumeText)) {
            matched.push(keyword);
        } else {
            missing.push(keyword);
        }
    });

    const score = keywords.length > 0 ? (matched.length / keywords.length) * 100 : 0;
    return { score, matched, missing };
}

// Helper: Check for measurable results (metrics)
function calculateMetricsScore(resume) {
    let bulletCount = 0;
    let metricCount = 0;
    const metricRegex = /\d%|\$\d|\d+\+|\d+\s(users|clients|customers|revenue|reduced|increased|saved)/i;

    if (resume.experience) {
        resume.experience.forEach(exp => {
            exp.bullets?.forEach(b => {
                bulletCount++;
                const text = b.active ? b.rewritten || b.original : b.original;
                if (metricRegex.test(text)) metricCount++;
            });
        });
    }

    if (resume.projects) {
        resume.projects.forEach(proj => {
            proj.bullets?.forEach(b => {
                bulletCount++;
                const text = b.active ? b.rewritten || b.original : b.original;
                if (metricRegex.test(text)) metricCount++;
            });
        });
    }

    if (bulletCount === 0) return 0;

    // Target: 40% of bullets should have metrics for a perfect score
    const density = metricCount / bulletCount;
    return Math.min((density / 0.4) * 100, 100);
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
            // Check ownership
            if (resume.userId.toString() !== req.user.id) {
                return res.status(401).json({ success: false, message: 'Not authorized' });
            }

            // Use stored keywords if not provided
            if (!keywords && resume.atsData?.extractedKeywords) {
                keywords = resume.atsData.extractedKeywords;
            }
        } else {
            resume = resumeData; // If checking pending data
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

        // Calculate Metrics/Formatting Score
        const metricsScore = calculateMetricsScore(data);

        // Weighted final score
        let finalScore = Math.round(
            technicalResult.score * WEIGHTS.technical +
            toolsResult.score * WEIGHTS.tools +
            softResult.score * WEIGHTS.soft +
            methodResult.score * WEIGHTS.methodologies +
            metricsScore * WEIGHTS.formatting
        );

        // Cap at 100
        finalScore = Math.min(finalScore, 100);

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
// MAGIC BUTTON - FULL OPTIMIZATION (ENHANCED)
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

        // Check ownership
        if (resume.userId.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }

        console.log('🚀 Starting Magic Optimization...');

        // Step 1: Analyze JD thoroughly
        console.log('📋 Step 1: Analyzing Job Description...');
        const jdResult = await model.generateContent(PROMPTS.analyzeJD(jdText));
        const jdResponse = await jdResult.response;
        const jdText2 = jdResponse.text();
        const jsonMatch = jdText2.match(/\{[\s\S]*\}/);
        const keywords = JSON.parse(jsonMatch[0]);

        // Compile all keywords with priority
        const technicalSkills = keywords.technicalSkills || [];
        const tools = keywords.tools || [];
        const softSkills = keywords.softSkills || [];
        const methodologies = keywords.methodologies || [];

        const allKeywords = [...technicalSkills, ...tools, ...softSkills, ...methodologies];
        console.log(`📊 Extracted ${allKeywords.length} keywords from JD`);

        // Step 2: Calculate initial ATS score
        console.log('📈 Step 2: Calculating Initial ATS Score...');
        const resumeText = buildResumeText(resume);

        let matched = [];
        let missing = [];
        allKeywords.forEach(kw => {
            const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            if (regex.test(resumeText)) {
                matched.push(kw);
            } else {
                missing.push(kw);
            }
        });

        const initialScore = allKeywords.length > 0 ? Math.round((matched.length / allKeywords.length) * 100) : 0;
        console.log(`📉 Initial ATS Score: ${initialScore}% (${matched.length}/${allKeywords.length} keywords)`);

        // Step 3: AGGRESSIVE Optimization - Rewrite ALL bullets with multiple keywords
        console.log('✍️ Step 3: Optimizing ALL Bullet Points...');
        const optimizedBullets = [];

        // Prioritize missing keywords - technical first, then tools, then methodologies
        const prioritizedMissing = [
            ...missing.filter(k => technicalSkills.includes(k)),
            ...missing.filter(k => tools.includes(k)),
            ...missing.filter(k => methodologies.includes(k)),
            ...missing.filter(k => softSkills.includes(k))
        ];

        // Optimize ALL experiences and ALL bullets
        for (let i = 0; i < resume.experience.length; i++) {
            const exp = resume.experience[i];
            const context = `${exp.role} at ${exp.company}`;

            for (let j = 0; j < (exp.bullets?.length || 0); j++) {
                const bullet = exp.bullets[j];

                if (bullet.original && bullet.original.trim()) {
                    // Get keywords for this bullet (cycle through missing keywords)
                    const keywordIndex = optimizedBullets.length;
                    const keywordsForBullet = [];

                    // Assign 3-4 different keywords per bullet to maximize coverage
                    for (let k = 0; k < 4 && keywordIndex + k < prioritizedMissing.length; k++) {
                        keywordsForBullet.push(prioritizedMissing[(keywordIndex + k) % Math.max(prioritizedMissing.length, 1)]);
                    }

                    // If no missing keywords, use matched ones to reinforce
                    if (keywordsForBullet.length === 0 && matched.length > 0) {
                        keywordsForBullet.push(matched[keywordIndex % matched.length]);
                    }

                    if (keywordsForBullet.length > 0) {
                        try {
                            // Use aggressive optimization prompt for multiple keywords
                            const rewriteResult = await model.generateContent(
                                PROMPTS.optimizeBulletAggressive(bullet.original, keywordsForBullet, context)
                            );
                            const rewriteResponse = await rewriteResult.response;
                            let rewritten = rewriteResponse.text().trim().replace(/^["']|["']$/g, '');

                            // Ensure word limit
                            const words = rewritten.split(/\s+/);
                            if (words.length > 35) {
                                rewritten = words.slice(0, 30).join(' ');
                            }

                            optimizedBullets.push({
                                experienceIndex: i,
                                bulletIndex: j,
                                original: bullet.original,
                                rewritten,
                                injectedKeyword: keywordsForBullet[0],
                                allInjectedKeywords: keywordsForBullet
                            });

                            // Update in resume
                            resume.experience[i].bullets[j].rewritten = rewritten;
                            resume.experience[i].bullets[j].isAIRewritten = true;
                            resume.experience[i].bullets[j].injectedKeywords = keywordsForBullet;
                            resume.experience[i].bullets[j].accepted = true; // Auto-accept for magic optimize

                            console.log(`  ✅ Optimized bullet ${i + 1}.${j + 1} with keywords: ${keywordsForBullet.join(', ')}`);
                        } catch (e) {
                            console.error(`  ❌ Bullet ${i + 1}.${j + 1} rewrite failed:`, e.message);
                        }
                    }
                }
            }
        }

        // Step 4: Generate ATS-Optimized Summary
        console.log('📝 Step 4: Generating Optimized Summary...');
        try {
            const targetKeywordsForSummary = [
                ...technicalSkills.slice(0, 4),
                ...tools.slice(0, 2),
                ...methodologies.slice(0, 2)
            ];

            const summaryResult = await model.generateContent(
                PROMPTS.optimizeSummary(resume, targetKeywordsForSummary, jdText)
            );
            const summaryResponse = await summaryResult.response;
            const optimizedSummary = summaryResponse.text().trim().replace(/^["']|["']$/g, '');

            resume.personalInfo = resume.personalInfo || {};
            resume.personalInfo.summary = optimizedSummary;
            console.log('  ✅ Generated ATS-optimized summary');
        } catch (e) {
            console.error('  ❌ Summary generation failed:', e.message);
        }

        // Step 5: Auto-add missing skills to skills section
        console.log('🔧 Step 5: Enhancing Skills Section...');
        resume.skills = resume.skills || { technical: [], tools: [], soft: [] };

        // Add missing technical skills (MAX 15 to ensure high coverage)
        const currentTechnical = (resume.skills.technical || []).map(s => s.toLowerCase());
        const missingTechnical = technicalSkills.filter(s =>
            !currentTechnical.includes(s.toLowerCase())
        ).slice(0, 15);

        resume.skills.technical = [...(resume.skills.technical || []), ...missingTechnical];

        // Add missing tools (MAX 10)
        const currentTools = (resume.skills.tools || []).map(s => s.toLowerCase());
        const missingTools = tools.filter(s =>
            !currentTools.includes(s.toLowerCase())
        ).slice(0, 10);

        resume.skills.tools = [...(resume.skills.tools || []), ...missingTools];

        // Add missing soft skills (MAX 8)
        const currentSoft = (resume.skills.soft || []).map(s => s.toLowerCase());
        const missingSoft = softSkills.filter(s =>
            !currentSoft.includes(s.toLowerCase())
        ).slice(0, 8);

        resume.skills.soft = [...(resume.skills.soft || []), ...missingSoft];

        // Add missing methodologies to technical/soft (since strict schema doesn't have methodologies)
        const missingMethodologies = methodologies.filter(s =>
            !currentTechnical.includes(s.toLowerCase()) && !currentTools.includes(s.toLowerCase())
        ).slice(0, 5);

        // Add methodologies to technical
        resume.skills.technical = [...resume.skills.technical, ...missingMethodologies];

        // Deduplicate arrays
        resume.skills.technical = [...new Set(resume.skills.technical)];
        resume.skills.tools = [...new Set(resume.skills.tools)];
        resume.skills.soft = [...new Set(resume.skills.soft)];

        console.log(`  ✅ Added skills: ${missingTechnical.length} tech, ${missingTools.length} tools, ${missingSoft.length} soft, ${missingMethodologies.length} methods`);

        // Step 6: Recalculate ATS score with optimized content
        console.log('📊 Step 6: Calculating New ATS Score...');
        const newResumeText = buildResumeText(resume);

        let newMatched = [];
        let stillMissing = [];
        allKeywords.forEach(kw => {
            const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            if (regex.test(newResumeText)) {
                newMatched.push(kw);
            } else {
                stillMissing.push(kw);
            }
        });

        const newScore = allKeywords.length > 0 ? Math.round((newMatched.length / allKeywords.length) * 100) : 0;
        const improvement = newScore - initialScore;

        console.log(`📈 New ATS Score: ${newScore}% (+${improvement}%)`);
        console.log(`  Matched: ${newMatched.length}/${allKeywords.length} keywords`);

        // Save resume with all updates
        resume.atsData = {
            targetJD: jdText,
            extractedKeywords: {
                technical: technicalSkills,
                tools: tools,
                soft: softSkills,
                methodologies: methodologies
            },
            atsScore: newScore,
            previousScore: initialScore,
            matchedKeywords: newMatched,
            missingKeywords: stillMissing,
            lastAnalyzed: new Date()
        };
        resume.status = 'completed';
        await resume.save();

        console.log('🎉 Magic Optimization Complete!');

        res.status(200).json({
            success: true,
            data: {
                initialScore,
                newScore,
                improvement,
                optimizedBullets,
                keywords,
                skillsAdded: {
                    technical: missingTechnical,
                    tools: missingTools,
                    soft: missingSoft,
                    methodologies: missingMethodologies
                },
                summary: resume.personalInfo?.summary,
                matchedKeywords: newMatched,
                missingKeywords: stillMissing,
                message: `🎯 ATS score improved from ${initialScore}% to ${newScore}% (+${improvement}%)`
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

// ============================================
// GENERATE COVER LETTER
// ============================================

// @desc    Generate AI Cover Letter
// @route   POST /api/ai/cover-letter
// @access  Public
exports.generateCoverLetter = async (req, res) => {
    try {
        const { resumeId, resumeData, jdText } = req.body;

        let resume = resumeData;
        if (resumeId) {
            resume = await Resume.findById(resumeId);
            if (!resume) {
                return res.status(404).json({ success: false, message: 'Resume not found' });
            }
        }

        if (!jdText && !resume?.atsData?.targetJD) {
            return res.status(400).json({ success: false, message: 'Job Description is required' });
        }

        const targetJD = jdText || resume.atsData.targetJD;

        const result = await model.generateContent(
            PROMPTS.generateCoverLetter(resume, targetJD)
        );
        const response = await result.response;
        const coverLetter = response.text().trim();

        res.status(200).json({
            success: true,
            data: { coverLetter }
        });
    } catch (err) {
        console.error('Cover Letter Error:', err);
        res.status(400).json({ success: false, message: err.message });
    }
};


// @desc    Check ATS score for uploaded resume
// @route   POST /api/ai/check-ats
// @access  Private
exports.standaloneATSCheck = async (req, res) => {
    try {
        const { jdText } = req.body;
        const file = req.file;

        console.log('ATS Check Request Received:');
        console.log('- JD Text Length:', jdText ? jdText.length : 0);
        console.log('- File:', file ? file.originalname : 'MISSING');

        if (!jdText || !file) {
            return res.status(400).json({
                success: false,
                message: (!jdText && !file) ? 'Missing JD and File' : (!jdText ? 'Missing JD Text' : 'Missing Resume File')
            });
        }


        // 1. Extract text from PDF
        let data;
        try {
            // pdf-parse v2.4.5+ uses the PDFParse class
            const { PDFParse } = require('pdf-parse');
            const uint8Array = new Uint8Array(file.buffer);
            const parser = new PDFParse(uint8Array);
            const result = await parser.getText();

            // Robustly extract the text string from the result object
            let plainText = '';
            if (typeof result === 'string') {
                plainText = result;
            } else if (result && typeof result.text === 'string') {
                plainText = result.text;
            } else if (result && typeof result.toString === 'function') {
                plainText = result.toString();
            }

            if (!plainText) {
                throw new Error('No text extracted from PDF. Please check if the file is readable.');
            }
            data = { text: plainText };
        } catch (e) {

            console.error('PDF Parse Internal Error:', e);

            // Fallback for older versions or misconfigured environments
            try {
                const parseFn = (typeof pdf === 'function') ? pdf : (pdf.default || pdf);
                if (typeof parseFn === 'function') {
                    const fallback = await parseFn(file.buffer);
                    data = { text: fallback.text };
                } else {
                    throw e; // Re-throw if fallback is not available
                }
            } catch (fallbackError) {
                throw new Error(`Failed to parse PDF: ${e.message}`);
            }
        }

        const resumeText = data.text.toLowerCase();




        // 2. Analyze JD to get keywords (reusing PROMPTS.analyzeJD)
        const jdResult = await model.generateContent(PROMPTS.analyzeJD(jdText));
        const jdResponse = await jdResult.response;
        const jdJsonText = jdResponse.text().match(/\{[\s\S]*\}/)[0];
        const keywords = JSON.parse(jdJsonText);

        // 3. Calculate Score
        const technicalResult = calculateCategoryScore(resumeText, keywords.technicalSkills || []);
        const toolsResult = calculateCategoryScore(resumeText, keywords.tools || []);
        const softResult = calculateCategoryScore(resumeText, keywords.softSkills || []);
        const methodResult = calculateCategoryScore(resumeText, keywords.methodologies || []);

        const finalScore = Math.round(
            technicalResult.score * WEIGHTS.technical +
            toolsResult.score * WEIGHTS.tools +
            softResult.score * WEIGHTS.soft +
            methodResult.score * WEIGHTS.methodologies
        );

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

        const suggestions = [
            ...technicalResult.missing.slice(0, 3).map(k => `Add experience with "${k}"`),
            ...toolsResult.missing.slice(0, 2).map(k => `Mention "${k}" tools`),
            ...methodResult.missing.slice(0, 2).map(k => `Show expertise in "${k}"`)
        ].slice(0, 5);

        res.status(200).json({
            success: true,
            data: {
                atsScore: finalScore,
                breakdown: {
                    technical: Math.round(technicalResult.score),
                    tools: Math.round(toolsResult.score),
                    soft: Math.round(softResult.score),
                    methodologies: Math.round(methodResult.score)
                },
                matchedKeywords: allMatched,
                missingKeywords: allMissing,
                suggestions,
                extractedTextSnippet: resumeText.substring(0, 500) + '...'
            }
        });
    } catch (err) {
        console.error('Standalone ATS Check Error:', err);
        res.status(400).json({
            success: false,
            message: err.message || 'Failed to check ATS score'
        });
    }
};

