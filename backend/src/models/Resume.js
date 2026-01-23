const mongoose = require('mongoose');

/**
 * RESUME DATA SCHEMA
 * 
 * Design Decisions:
 * 1. Bullets are objects (not strings) to support individual AI rewrites and tracking
 * 2. Each bullet has original/rewritten versions for accept/reject workflow
 * 3. Keywords embedded at bullet level for granular ATS optimization
 * 4. Field constraints enforced via validation
 */

// Bullet Point Sub-Schema (individually editable and AI-rewritable)
const bulletPointSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    original: {
        type: String,
        maxlength: [500, 'Bullet point cannot exceed 500 characters']
    },
    rewritten: {
        type: String,
        maxlength: [500, 'Rewritten bullet cannot exceed 500 characters']
    },
    isAIRewritten: {
        type: Boolean,
        default: false
    },
    accepted: {
        type: Boolean,
        default: false
    },
    injectedKeywords: [String], // Keywords added via AI
    wordCount: Number
}, { _id: false });

// Education Sub-Schema
const educationSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    school: {
        type: String,
        maxlength: [100, 'School name cannot exceed 100 characters']
    },
    degree: {
        type: String,
        maxlength: [100, 'Degree cannot exceed 100 characters']
    },
    fieldOfStudy: {
        type: String,
        maxlength: [100, 'Field of study cannot exceed 100 characters']
    },
    startDate: String,
    endDate: String,
    gpa: String,
    highlights: [bulletPointSchema]
}, { _id: false });

// Experience Sub-Schema
const experienceSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    company: {
        type: String,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    role: {
        type: String,
        maxlength: [100, 'Role cannot exceed 100 characters']
    },
    location: String,
    startDate: String,
    endDate: String,
    current: {
        type: Boolean,
        default: false
    },
    bullets: {
        type: [bulletPointSchema],
        validate: [arr => arr.length <= 8, 'Maximum 8 bullet points per experience']
    }
}, { _id: false });

// Project Sub-Schema
const projectSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    title: {
        type: String,
        maxlength: [100, 'Project title cannot exceed 100 characters']
    },
    link: String,
    technologies: [String],
    bullets: {
        type: [bulletPointSchema],
        validate: [arr => arr.length <= 5, 'Maximum 5 bullet points per project']
    }
}, { _id: false });

// Skills Sub-Schema
const skillsSchema = new mongoose.Schema({
    technical: {
        type: [String],
        validate: [arr => arr.length <= 20, 'Maximum 20 technical skills']
    },
    tools: {
        type: [String],
        validate: [arr => arr.length <= 15, 'Maximum 15 tools']
    },
    soft: {
        type: [String],
        validate: [arr => arr.length <= 10, 'Maximum 10 soft skills']
    },
    languages: [String],
    certifications: [String]
}, { _id: false });

// ATS Data Sub-Schema
const atsDataSchema = new mongoose.Schema({
    targetJD: String,
    extractedKeywords: {
        technical: [String],
        tools: [String],
        soft: [String],
        methodologies: [String]
    },
    atsScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    previousScore: Number,
    matchedKeywords: [String],
    missingKeywords: [String],
    suggestions: [String],
    lastAnalyzed: Date
}, { _id: false });

// Main Resume Schema
const resumeSchema = new mongoose.Schema({
    // Personal Information
    personalInfo: {
        fullName: {
            type: String,
            maxlength: [100, 'Name cannot exceed 100 characters']
        },
        email: {
            type: String,
            match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
        },
        phone: String,
        location: String,
        website: String,
        linkedin: String,
        github: String,
        summary: {
            type: String,
            maxlength: [500, 'Summary cannot exceed 500 characters']
        }
    },

    // Resume Sections
    education: {
        type: [educationSchema],
        validate: [arr => arr.length <= 5, 'Maximum 5 education entries']
    },
    experience: {
        type: [experienceSchema],
        validate: [arr => arr.length <= 10, 'Maximum 10 experience entries']
    },
    projects: {
        type: [projectSchema],
        validate: [arr => arr.length <= 8, 'Maximum 8 projects']
    },
    skills: skillsSchema,

    // ATS Optimization Data
    atsData: atsDataSchema,

    // Metadata
    templateId: {
        type: String,
        default: 'professional'
    },
    status: {
        type: String,
        enum: ['draft', 'optimizing', 'completed'],
        default: 'draft'
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate word counts
resumeSchema.pre('save', async function () {
    // Calculate word count for each bullet
    const calculateWordCount = (bullet) => {
        if (bullet.rewritten) {
            bullet.wordCount = bullet.rewritten.split(/\s+/).filter(w => w).length;
        } else if (bullet.original) {
            bullet.wordCount = bullet.original.split(/\s+/).filter(w => w).length;
        }
    };

    if (this.experience) {
        this.experience.forEach(exp => {
            if (exp.bullets) exp.bullets.forEach(calculateWordCount);
        });
    }

    if (this.projects) {
        this.projects.forEach(proj => {
            if (proj.bullets) proj.bullets.forEach(calculateWordCount);
        });
    }
});

module.exports = mongoose.model('Resume', resumeSchema);
