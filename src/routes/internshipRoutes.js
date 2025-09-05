const express = require('express');

const router = express.Router();

// Sample internship data (placeholder for now)
const sampleInternships = [
  {
    id: 1,
    title: "Software Developer Intern",
    company: "TCS",
    location: "Bangalore, India",
    stipend: "₹15,000 - ₹25,000 per month",
    duration: "6 months",
    type: "Full-time",
    domain: "Engineering",
    description: "Work on cutting-edge software development projects with industry mentors.",
    requirements: "Computer Science students, Knowledge of Java/Python",
    link: "https://careers.tcs.com/internships",
    trending: true,
    postedDate: new Date("2024-08-15"),
    deadline: new Date("2024-10-30")
  },
  {
    id: 2,
    title: "Data Science Intern",
    company: "Flipkart",
    location: "Hyderabad, India",
    stipend: "₹20,000 - ₹30,000 per month",
    duration: "4-6 months",
    type: "Full-time",
    domain: "Data Science",
    description: "Analyze large datasets and build predictive models for e-commerce platform.",
    requirements: "Statistics/Data Science background, Python, SQL, Machine Learning",
    link: "https://www.flipkartcareers.com/internships",
    trending: true,
    postedDate: new Date("2024-08-20"),
    deadline: new Date("2024-11-15")
  },
  {
    id: 3,
    title: "UI/UX Design Intern",
    company: "Zomato",
    location: "Gurugram, India",
    stipend: "₹12,000 - ₹18,000 per month",
    duration: "3-6 months",
    type: "Full-time",
    domain: "Design",
    description: "Design user-friendly interfaces and improve user experience across mobile and web platforms.",
    requirements: "Design background, Figma, Adobe Creative Suite, Portfolio required",
    link: "https://www.zomato.com/careers/internships",
    trending: false,
    postedDate: new Date("2024-08-25"),
    deadline: new Date("2024-12-01")
  },
  {
    id: 4,
    title: "Digital Marketing Intern",
    company: "Byju's",
    location: "Mumbai, India",
    stipend: "₹10,000 - ₹15,000 per month",
    duration: "3-4 months",
    type: "Full-time",
    domain: "Marketing",
    description: "Assist in digital marketing campaigns, content creation, and social media management.",
    requirements: "Marketing/Business background, Social media knowledge, Content writing skills",
    link: "https://byjus.com/careers/internships",
    trending: false,
    postedDate: new Date("2024-09-01"),
    deadline: new Date("2024-11-30")
  },
  {
    id: 5,
    title: "Finance Analyst Intern",
    company: "ICICI Bank",
    location: "Delhi, India",
    stipend: "₹18,000 - ₹22,000 per month",
    duration: "6 months",
    type: "Full-time",
    domain: "Finance",
    description: "Support financial analysis, reporting, and risk assessment activities.",
    requirements: "Finance/Economics background, Excel proficiency, Analytical skills",
    link: "https://www.icicibank.com/careers/internships",
    trending: true,
    postedDate: new Date("2024-08-18"),
    deadline: new Date("2024-10-25")
  },
  {
    id: 6,
    title: "Content Writer Intern",
    company: "Times Internet",
    location: "Noida, India",
    stipend: "₹8,000 - ₹12,000 per month",
    duration: "3-6 months",
    type: "Part-time",
    domain: "Media",
    description: "Create engaging content for various digital platforms and publications.",
    requirements: "English/Journalism background, Excellent writing skills, SEO knowledge",
    link: "https://timesinternet.in/careers/internships",
    trending: false,
    postedDate: new Date("2024-09-05"),
    deadline: new Date("2024-12-15")
  }
];

// GET /api/internships - Get all internships with optional filters
router.get('/', async (req, res) => {
  try {
    const {
      domain,
      location,
      type,
      trending,
      limit = 20,
      page = 1
    } = req.query;

    let filteredInternships = [...sampleInternships];

    // Apply filters
    if (domain && domain !== 'all') {
      filteredInternships = filteredInternships.filter(
        internship => internship.domain.toLowerCase().includes(domain.toLowerCase())
      );
    }

    if (location && location !== 'all') {
      filteredInternships = filteredInternships.filter(
        internship => internship.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (type && type !== 'all') {
      filteredInternships = filteredInternships.filter(
        internship => internship.type.toLowerCase() === type.toLowerCase()
      );
    }

    if (trending === 'true') {
      filteredInternships = filteredInternships.filter(
        internship => internship.trending === true
      );
    }

    // Sort by trending first, then by posted date
    filteredInternships.sort((a, b) => {
      if (a.trending && !b.trending) return -1;
      if (!a.trending && b.trending) return 1;
      return new Date(b.postedDate) - new Date(a.postedDate);
    });

    // Apply pagination
    const startIndex = (page - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedInternships = filteredInternships.slice(startIndex, endIndex);

    const totalPages = Math.ceil(filteredInternships.length / parseInt(limit));

    res.json({
      success: true,
      data: paginatedInternships,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: filteredInternships.length,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching internships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching internships',
      error: error.message
    });
  }
});

// GET /api/internships/trending - Get trending internships
router.get('/trending', async (req, res) => {
  try {
    const trendingInternships = sampleInternships
      .filter(internship => internship.trending)
      .sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate))
      .slice(0, 6);

    res.json({
      success: true,
      data: trendingInternships
    });
  } catch (error) {
    console.error('Error fetching trending internships:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending internships',
      error: error.message
    });
  }
});

// GET /api/internships/:id - Get single internship
router.get('/:id', async (req, res) => {
  try {
    const internship = sampleInternships.find(
      internship => internship.id === parseInt(req.params.id)
    );

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    res.json({
      success: true,
      data: internship
    });
  } catch (error) {
    console.error('Error fetching internship:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching internship',
      error: error.message
    });
  }
});

module.exports = router;