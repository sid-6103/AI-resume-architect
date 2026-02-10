const model = require('../config/gemini');

/**
 * JOB SEARCH CONTROLLER
 */

// @desc    Search for jobs/internships
// @route   GET /api/jobs/search
// @access  Private
exports.searchJobs = async (req, res) => {
    try {
        const { query, type = 'job', location = '' } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a search query'
            });
        }

        console.log(`🔍 Searching for ${type}s: ${query} in ${location}`);

        // 1. Keyword Expansion via Gemini
        const expansionPrompt = `
        You are a job search expert. Expand the following job query into 3-4 highly relevant search terms.
        Focus on: ${type === 'internship' ? 'internships and entry-level roles' : 'core professional titles'}.
        If tech-focused, include the stack (e.g. MERN -> React, Node.js).
        Target Location: ${location || 'Global/Remote'}.
        CRITICAL: If the location is "India", ensure search terms are common in the Indian job market.

        
        Original Query: "${query}"
        
        Return ONLY a JSON array of strings.
        `;

        let expandedTerms = [];
        try {
            const result = await model.generateContent(expansionPrompt);
            const response = await result.response;
            const match = response.text().match(/\[[\s\S]*\]/);
            if (match) {
                expandedTerms = JSON.parse(match[0]);
            }
        } catch (err) {
            console.error('Gemini expansion failed');
        }

        // 2. Fetch from Public APIs
        const searchTerms = [query, ...expandedTerms.slice(0, 1)];
        let allJobs = [];

        // Concurrent Fetching from multiple sources
        const fetchPromises = [];

        searchTerms.forEach(term => {
            // Source 1: Arbeitnow (Germany/EU/Remote)
            fetchPromises.push((async () => {
                try {
                    const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(term)}${location ? `&location=${encodeURIComponent(location)}` : ''}`;
                    const res = await fetch(url);
                    const data = await res.json();
                    return (data.data || []).map(j => ({
                        id: j.slug,
                        title: j.title,
                        company: j.company_name,
                        location: j.location,
                        url: j.url,
                        tags: j.tags,
                        createdAt: j.created_at,
                        remote: j.remote || false,
                        description: j.description
                    }));
                } catch (e) { return []; }
            })());

            // Source 2: The Muse (Global/USA/USA) - Good for Remote/Global
            fetchPromises.push((async () => {
                try {
                    const url = `https://www.themuse.com/api/public/jobs?category=${encodeURIComponent(term)}&location=${encodeURIComponent(location)}&page=1`;
                    const res = await fetch(url);
                    const data = await res.json();
                    return (data.results || []).map(j => ({
                        id: j.id.toString(),
                        title: j.name,
                        company: j.company.name,
                        location: j.locations.map(l => l.name).join(', '),
                        url: j.refs.landing_page,
                        tags: [j.type],
                        createdAt: j.publication_date,
                        remote: j.locations.some(l => l.name.toLowerCase().includes('remote')),
                        description: j.contents
                    }));
                } catch (e) { return []; }
            })());
        });

        const results = await Promise.all(fetchPromises);
        allJobs = results.flat();

        // 3. Deduplicate
        const uniqueJobs = Array.from(new Map(allJobs.map(job => [job.id, job])).values());

        // 4. Stricter Filtering & Priority for Location
        const queryLower = query.toLowerCase();
        const locLower = location.toLowerCase();
        const isIndiaSearch = locLower.includes('india') || locLower.includes('ind');

        let filteredJobs = uniqueJobs.filter(job => {
            const title = (job.title || '').toLowerCase();
            const jobLoc = (job.location || '').toLowerCase();
            const desc = (job.description || '').toLowerCase();

            // a. Regional Filtering (e.g. India)
            if (isIndiaSearch) {
                const isIndiaMatch = jobLoc.includes('india') || jobLoc.includes(', in') ||
                    jobLoc.includes('bengaluru') || jobLoc.includes('bangalore') ||
                    jobLoc.includes('delhi') || jobLoc.includes('mumbai') ||
                    jobLoc.includes('hyderabad') || jobLoc.includes('pune') ||
                    jobLoc.includes('chennai') || jobLoc.includes('gurgaon') ||
                    jobLoc.includes('noida');

                const isRemoteAndSafe = job.remote && !jobLoc.includes('germany') && !jobLoc.includes('usa') && !jobLoc.includes('united states') && !jobLoc.includes('berlin');

                // If specialized for India, skip obvious non-India results if they don't seem like global remote roles
                if (!isIndiaMatch && !isRemoteAndSafe) return false;
            }

            // b. Avoid "Lead" if not explicitly asked
            if (!queryLower.includes('lead') && !queryLower.includes('senior')) {
                if (title.includes('lead') || title.includes('senior') || title.includes('principal')) return false;
            }

            if (type === 'internship') {
                return title.includes('intern') || desc.includes('internship');
            }

            return true;
        });



        // 5. Ranking with Location Priority
        filteredJobs.sort((a, b) => {
            let aScore = 0;
            let bScore = 0;

            const aLoc = (a.location || '').toLowerCase();
            const bLoc = (b.location || '').toLowerCase();
            const aTitle = a.title.toLowerCase();
            const bTitle = b.title.toLowerCase();

            // Strict Location Match
            if (location) {
                if (aLoc.includes(locLower)) aScore += 100;
                if (bLoc.includes(locLower)) bScore += 100;

                // India specific indicators
                if (isIndiaSearch) {
                    if (aLoc.includes('india') || aLoc.includes(', in')) aScore += 50;
                    if (bLoc.includes('india') || bLoc.includes(', in')) bScore += 50;
                }
            }

            // Title match
            if (aTitle.includes(queryLower)) aScore += 30;
            if (bTitle.includes(queryLower)) bScore += 30;

            // Remote priority
            if (a.remote) aScore += 10;
            if (b.remote) bScore += 10;

            return bScore - aScore;
        });

        const formattedJobs = filteredJobs.map(j => ({
            id: j.id,
            title: j.title,
            company: j.company,
            location: j.location,
            url: j.url,
            tags: j.tags,
            createdAt: j.createdAt,
            remote: j.remote,
            descriptionSnippet: j.description.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...'
        })).slice(0, 20);


        res.status(200).json({
            success: true,
            expandedTerms,
            data: formattedJobs
        });

    } catch (err) {
        console.error('Job Search Error:', err);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};
