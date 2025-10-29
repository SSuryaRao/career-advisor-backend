const roadmapController = {
  generateRoadmap: async (req, res) => {
    try {
      const { career_domain, skill_level } = req.body;

      if (!career_domain || !skill_level) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'career_domain and skill_level are required'
        });
      }

      // Generate roadmap based on career domain and skill level
      const roadmap = generateRoadmapData(career_domain, skill_level);

      // Increment usage BEFORE sending response
      const { incrementUsageForRequest } = require('../middleware/usageLimits');
      await incrementUsageForRequest(req);

      res.status(200).json(roadmap);
    } catch (error) {
      console.error('Error generating roadmap:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate roadmap'
      });
    }
  }
};

// ROI calculation helper function
function calculateROI(domain, skillLevel, timeInWeeks) {
  const roiData = {
    'web-development': {
      beginner: {
        averageCourseFees: 25000,
        expectedSalaryMin: 400000,
        expectedSalaryMax: 800000,
        currentMarketDemand: "High",
        jobGrowthRate: "22%",
        avgTimeToJob: 4,
        skills: ['HTML/CSS', 'JavaScript', 'React', 'Node.js']
      },
      intermediate: {
        averageCourseFees: 35000,
        expectedSalaryMin: 600000,
        expectedSalaryMax: 1200000,
        currentMarketDemand: "Very High",
        jobGrowthRate: "25%",
        avgTimeToJob: 3,
        skills: ['Advanced React', 'State Management', 'APIs', 'Testing']
      },
      advanced: {
        averageCourseFees: 45000,
        expectedSalaryMin: 1000000,
        expectedSalaryMax: 2000000,
        currentMarketDemand: "Very High",
        jobGrowthRate: "28%",
        avgTimeToJob: 2,
        skills: ['System Design', 'Microservices', 'Cloud Architecture']
      }
    },
    'data-science': {
      beginner: {
        averageCourseFees: 40000,
        expectedSalaryMin: 600000,
        expectedSalaryMax: 1200000,
        currentMarketDemand: "Very High",
        jobGrowthRate: "31%",
        avgTimeToJob: 5,
        skills: ['Python', 'Statistics', 'Pandas', 'Machine Learning']
      },
      intermediate: {
        averageCourseFees: 55000,
        expectedSalaryMin: 800000,
        expectedSalaryMax: 1600000,
        currentMarketDemand: "Extremely High",
        jobGrowthRate: "35%",
        avgTimeToJob: 3,
        skills: ['Advanced ML', 'Deep Learning', 'MLOps', 'Feature Engineering']
      },
      advanced: {
        averageCourseFees: 70000,
        expectedSalaryMin: 1200000,
        expectedSalaryMax: 2500000,
        currentMarketDemand: "Extremely High",
        jobGrowthRate: "38%",
        avgTimeToJob: 2,
        skills: ['Research', 'Advanced Analytics', 'AI Systems', 'Leadership']
      }
    },
    'mobile-development': {
      beginner: {
        averageCourseFees: 30000,
        expectedSalaryMin: 500000,
        expectedSalaryMax: 1000000,
        currentMarketDemand: "High",
        jobGrowthRate: "24%",
        avgTimeToJob: 4,
        skills: ['Flutter/React Native', 'Mobile UI/UX', 'APIs', 'App Store']
      },
      intermediate: {
        averageCourseFees: 40000,
        expectedSalaryMin: 700000,
        expectedSalaryMax: 1400000,
        currentMarketDemand: "High",
        jobGrowthRate: "26%",
        avgTimeToJob: 3,
        skills: ['Native Development', 'Performance', 'Advanced Features']
      },
      advanced: {
        averageCourseFees: 50000,
        expectedSalaryMin: 1000000,
        expectedSalaryMax: 2000000,
        currentMarketDemand: "High",
        jobGrowthRate: "28%",
        avgTimeToJob: 2,
        skills: ['Architecture', 'Team Leadership', 'Cross-platform']
      }
    },
    'cybersecurity': {
      beginner: {
        averageCourseFees: 45000,
        expectedSalaryMin: 700000,
        expectedSalaryMax: 1300000,
        currentMarketDemand: "Extremely High",
        jobGrowthRate: "33%",
        avgTimeToJob: 5,
        skills: ['Network Security', 'Ethical Hacking', 'Risk Assessment']
      },
      intermediate: {
        averageCourseFees: 60000,
        expectedSalaryMin: 900000,
        expectedSalaryMax: 1800000,
        currentMarketDemand: "Extremely High",
        jobGrowthRate: "35%",
        avgTimeToJob: 3,
        skills: ['Advanced Security', 'Incident Response', 'Compliance']
      },
      advanced: {
        averageCourseFees: 75000,
        expectedSalaryMin: 1300000,
        expectedSalaryMax: 2800000,
        currentMarketDemand: "Extremely High",
        jobGrowthRate: "38%",
        avgTimeToJob: 2,
        skills: ['Security Architecture', 'Leadership', 'Strategy']
      }
    },
    'cloud-computing': {
      beginner: {
        averageCourseFees: 35000,
        expectedSalaryMin: 600000,
        expectedSalaryMax: 1200000,
        currentMarketDemand: "Very High",
        jobGrowthRate: "30%",
        avgTimeToJob: 4,
        skills: ['AWS/Azure', 'Linux', 'Containers', 'Infrastructure']
      },
      intermediate: {
        averageCourseFees: 50000,
        expectedSalaryMin: 800000,
        expectedSalaryMax: 1600000,
        currentMarketDemand: "Very High",
        jobGrowthRate: "32%",
        avgTimeToJob: 3,
        skills: ['Advanced Cloud', 'Kubernetes', 'DevOps', 'Architecture']
      },
      advanced: {
        averageCourseFees: 65000,
        expectedSalaryMin: 1200000,
        expectedSalaryMax: 2400000,
        currentMarketDemand: "Very High",
        jobGrowthRate: "35%",
        avgTimeToJob: 2,
        skills: ['Cloud Strategy', 'Multi-cloud', 'Team Leadership']
      }
    },
    'artificial-intelligence': {
      beginner: {
        averageCourseFees: 50000,
        expectedSalaryMin: 800000,
        expectedSalaryMax: 1500000,
        currentMarketDemand: "Extremely High",
        jobGrowthRate: "40%",
        avgTimeToJob: 6,
        skills: ['Python', 'ML Fundamentals', 'Neural Networks', 'NLP']
      },
      intermediate: {
        averageCourseFees: 70000,
        expectedSalaryMin: 1000000,
        expectedSalaryMax: 2000000,
        currentMarketDemand: "Extremely High",
        jobGrowthRate: "42%",
        avgTimeToJob: 4,
        skills: ['Deep Learning', 'Computer Vision', 'Reinforcement Learning']
      },
      advanced: {
        averageCourseFees: 90000,
        expectedSalaryMin: 1500000,
        expectedSalaryMax: 3500000,
        currentMarketDemand: "Extremely High",
        jobGrowthRate: "45%",
        avgTimeToJob: 2,
        skills: ['AI Research', 'Model Architecture', 'AI Strategy', 'Leadership']
      }
    },
    'devops': {
      beginner: {
        averageCourseFees: 40000,
        expectedSalaryMin: 700000,
        expectedSalaryMax: 1300000,
        currentMarketDemand: "Very High",
        jobGrowthRate: "29%",
        avgTimeToJob: 4,
        skills: ['CI/CD', 'Docker', 'Kubernetes', 'Automation']
      },
      intermediate: {
        averageCourseFees: 55000,
        expectedSalaryMin: 900000,
        expectedSalaryMax: 1800000,
        currentMarketDemand: "Very High",
        jobGrowthRate: "32%",
        avgTimeToJob: 3,
        skills: ['Advanced DevOps', 'Monitoring', 'Security', 'Scale']
      },
      advanced: {
        averageCourseFees: 70000,
        expectedSalaryMin: 1300000,
        expectedSalaryMax: 2600000,
        currentMarketDemand: "Very High",
        jobGrowthRate: "35%",
        avgTimeToJob: 2,
        skills: ['Platform Engineering', 'Strategy', 'Team Leadership']
      }
    },
    'blockchain': {
      beginner: {
        averageCourseFees: 50000,
        expectedSalaryMin: 800000,
        expectedSalaryMax: 1600000,
        currentMarketDemand: "High",
        jobGrowthRate: "27%",
        avgTimeToJob: 5,
        skills: ['Solidity', 'Web3', 'Smart Contracts', 'DeFi']
      },
      intermediate: {
        averageCourseFees: 70000,
        expectedSalaryMin: 1000000,
        expectedSalaryMax: 2000000,
        currentMarketDemand: "High",
        jobGrowthRate: "30%",
        avgTimeToJob: 4,
        skills: ['Advanced Blockchain', 'Security', 'Protocols']
      },
      advanced: {
        averageCourseFees: 90000,
        expectedSalaryMin: 1400000,
        expectedSalaryMax: 3000000,
        currentMarketDemand: "High",
        jobGrowthRate: "33%",
        avgTimeToJob: 3,
        skills: ['Blockchain Architecture', 'Research', 'Leadership']
      }
    }
  };

  const data = roiData[domain]?.[skillLevel];
  if (!data) return null;

  const avgSalary = (data.expectedSalaryMin + data.expectedSalaryMax) / 2;
  const investmentPeriodMonths = Math.ceil(timeInWeeks / 4.33); // Convert weeks to months
  const paybackPeriodMonths = Math.ceil((data.averageCourseFees / (avgSalary / 12)));
  const roiMultiplier = Math.round((avgSalary * 2) / data.averageCourseFees * 10) / 10; // 2-year ROI
  
  return {
    estimatedTimeWeeks: timeInWeeks,
    estimatedInvestment: data.averageCourseFees,
    expectedSalaryRange: {
      min: data.expectedSalaryMin,
      max: data.expectedSalaryMax,
      average: Math.round(avgSalary)
    },
    roiSummary: {
      multiplier: roiMultiplier,
      paybackPeriodMonths: paybackPeriodMonths,
      description: `${roiMultiplier}x return in 2 years`
    },
    marketInsights: {
      demand: data.currentMarketDemand,
      growthRate: data.jobGrowthRate,
      avgTimeToJob: data.avgTimeToJob
    },
    keySkills: data.skills,
    explanation: `By investing ~${investmentPeriodMonths} months of learning and ₹${(data.averageCourseFees/1000).toFixed(0)}K, you can reach ₹${(data.expectedSalaryMin/100000).toFixed(0)}-${(data.expectedSalaryMax/100000).toFixed(0)} LPA, achieving a ${roiMultiplier}x ROI in 2 years with ${data.currentMarketDemand.toLowerCase()} market demand.`
  };
}

function generateRoadmapData(careerDomain, skillLevel) {
  const roadmaps = {
    'web-development': {
      beginner: {
        domain: "Web Development",
        total_estimated_time: "24 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "html_css",
                title: "HTML & CSS Fundamentals",
                description: "Learn the building blocks of web pages with HTML structure and CSS styling.",
                resources: ["freeCodeCamp HTML/CSS", "NPTEL Web Technologies", "MDN Web Docs"],
                estimated_time: "3 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "html_structure", name: "HTML Structure (Tags, Elements, Attributes)", optional: false },
                  { id: "semantic_html", name: "Semantic HTML5 Elements", optional: false },
                  { id: "css_basics", name: "CSS Basics (Selectors, Properties, Box Model)", optional: false },
                  { id: "css_layouts", name: "CSS Layouts (Flexbox, Grid)", optional: false },
                  { id: "forms", name: "Forms and Input Elements", optional: true }
                ]
              },
              {
                id: "javascript_basics",
                title: "JavaScript Fundamentals",
                description: "Master JavaScript basics, DOM manipulation, and event handling.",
                resources: ["JavaScript.info", "NPTEL JavaScript", "Codecademy JavaScript"],
                estimated_time: "4 weeks",
                prerequisites: ["html_css"],
                category: "Foundations",
                subtasks: [
                  { id: "js_syntax", name: "JavaScript Syntax & Variables", optional: false },
                  { id: "data_types", name: "Data Types & Operators", optional: false },
                  { id: "functions", name: "Functions & Scope", optional: false },
                  { id: "dom_manipulation", name: "DOM Manipulation", optional: false },
                  { id: "events", name: "Event Handling & Listeners", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "responsive_design",
                title: "Responsive Web Design",
                description: "Create websites that work on all devices using CSS Grid, Flexbox, and media queries.",
                resources: ["CSS-Tricks", "Responsive Web Design Course", "Bootstrap Documentation"],
                estimated_time: "2 weeks",
                prerequisites: ["html_css"],
                category: "Core Skills",
                subtasks: [
                  { id: "media_queries", name: "Media Queries & Breakpoints", optional: false },
                  { id: "mobile_first", name: "Mobile-First Design Approach", optional: false },
                  { id: "responsive_images", name: "Responsive Images & Videos", optional: false },
                  { id: "css_frameworks", name: "CSS Frameworks (Bootstrap/Tailwind)", optional: true }
                ]
              },
              {
                id: "version_control",
                title: "Git & Version Control",
                description: "Learn Git for tracking changes and collaborating on projects.",
                resources: ["Git Handbook", "NPTEL Software Engineering", "Atlassian Git Tutorials"],
                estimated_time: "2 weeks",
                prerequisites: [],
                category: "Core Skills",
                subtasks: [
                  { id: "git_basics", name: "Git Basics (Init, Add, Commit, Push)", optional: false },
                  { id: "branches", name: "Branching & Merging", optional: false },
                  { id: "github", name: "GitHub & Remote Repositories", optional: false },
                  { id: "pull_requests", name: "Pull Requests & Code Reviews", optional: true }
                ]
              },
              {
                id: "frontend_framework",
                title: "Frontend Framework (React)",
                description: "Build interactive user interfaces using React.js.",
                resources: ["React Official Tutorial", "Scrimba React Course", "NPTEL Web Development"],
                estimated_time: "5 weeks",
                prerequisites: ["javascript_basics"],
                category: "Core Skills",
                subtasks: [
                  { id: "react_components", name: "React Components & JSX Syntax", optional: false },
                  { id: "state_props", name: "State Management & Props", optional: false },
                  { id: "hooks_basics", name: "React Hooks (useState, useEffect)", optional: false },
                  { id: "event_handling", name: "Event Handling & Forms", optional: false },
                  { id: "react_router", name: "React Router for Navigation", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "backend_basics",
                title: "Backend Development with Node.js",
                description: "Learn server-side programming with Node.js and Express.js.",
                resources: ["Node.js Documentation", "Express.js Guide", "NPTEL Database Systems"],
                estimated_time: "4 weeks",
                prerequisites: ["javascript_basics"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "node_fundamentals", name: "Node.js Fundamentals & NPM", optional: false },
                  { id: "express_setup", name: "Express.js Server Setup & Routing", optional: false },
                  { id: "rest_apis", name: "RESTful API Design & Implementation", optional: false },
                  { id: "middleware", name: "Middleware & Error Handling", optional: false },
                  { id: "authentication", name: "JWT Authentication & Authorization", optional: true }
                ]
              },
              {
                id: "database_integration",
                title: "Database Integration",
                description: "Connect your applications to databases using MongoDB or SQL.",
                resources: ["MongoDB University", "SQL Tutorial", "Database Design Course"],
                estimated_time: "3 weeks",
                prerequisites: ["backend_basics"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "mongodb_setup", name: "MongoDB Setup & Schema Design", optional: false },
                  { id: "crud_operations", name: "CRUD Operations with Mongoose/ORM", optional: false },
                  { id: "database_queries", name: "Complex Queries & Aggregations", optional: false },
                  { id: "data_validation", name: "Data Validation & Sanitization", optional: false },
                  { id: "database_optimization", name: "Database Indexing & Performance Optimization", optional: true }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "portfolio_website",
                title: "Personal Portfolio Website",
                description: "Build a responsive portfolio to showcase your skills and projects.",
                resources: ["Portfolio Examples", "Netlify Hosting", "GitHub Pages"],
                estimated_time: "2 weeks",
                prerequisites: ["responsive_design", "frontend_framework"],
                category: "Projects",
                subtasks: [
                  { id: "portfolio_design", name: "UI/UX Design & Wireframing", optional: false },
                  { id: "responsive_layout", name: "Responsive Layout Implementation", optional: false },
                  { id: "project_showcase", name: "Project Showcase Section", optional: false },
                  { id: "contact_form", name: "Contact Form Integration", optional: false },
                  { id: "animations", name: "Animations & Interactive Elements", optional: true }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "interview_prep",
                title: "Technical Interview Preparation",
                description: "Prepare for coding interviews and technical assessments.",
                resources: ["LeetCode", "GeeksforGeeks", "InterviewBit"],
                estimated_time: "4 weeks",
                prerequisites: ["frontend_framework", "backend_basics"],
                category: "Career Preparation",
                subtasks: [
                  { id: "data_structures", name: "Data Structures Review (Arrays, Linked Lists, Trees)", optional: false },
                  { id: "algorithms", name: "Algorithm Problems (Sorting, Searching, Recursion)", optional: false },
                  { id: "coding_practice", name: "Coding Practice on LeetCode/HackerRank", optional: false },
                  { id: "behavioral_prep", name: "Behavioral Interview Preparation", optional: false },
                  { id: "system_design_intro", name: "System Design Interview Basics", optional: true }
                ]
              }
            ]
          }
        ]
      },
      intermediate: {
        domain: "Web Development",
        total_estimated_time: "20 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "advanced_js",
                title: "Advanced JavaScript Concepts",
                description: "Master closures, promises, async/await, and ES6+ features.",
                resources: ["You Don't Know JS", "JavaScript: The Definitive Guide", "NPTEL Advanced JavaScript"],
                estimated_time: "3 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "closures_scope", name: "Closures & Lexical Scope", optional: false },
                  { id: "promises_async", name: "Promises & Async/Await", optional: false },
                  { id: "es6_features", name: "ES6+ Features (Destructuring, Spread, Modules)", optional: false },
                  { id: "prototypes_inheritance", name: "Prototypes & Inheritance", optional: false },
                  { id: "event_loop", name: "Event Loop & Concurrency Model", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "state_management",
                title: "State Management (Redux/Context API)",
                description: "Manage complex application state in React applications.",
                resources: ["Redux Documentation", "React Context Guide", "State Management Patterns"],
                estimated_time: "3 weeks",
                prerequisites: ["advanced_js"],
                category: "Core Skills",
                subtasks: [
                  { id: "redux_basics", name: "Redux Store, Actions & Reducers", optional: false },
                  { id: "redux_toolkit", name: "Redux Toolkit & RTK Query", optional: false },
                  { id: "context_api", name: "React Context API & useContext Hook", optional: false },
                  { id: "state_patterns", name: "State Management Patterns & Best Practices", optional: false },
                  { id: "zustand_recoil", name: "Alternative Solutions (Zustand, Recoil)", optional: true }
                ]
              },
              {
                id: "api_development",
                title: "RESTful API Development",
                description: "Build robust APIs with proper authentication and validation.",
                resources: ["REST API Design", "API Security Best Practices", "Postman Learning"],
                estimated_time: "4 weeks",
                prerequisites: ["advanced_js"],
                category: "Core Skills",
                subtasks: [
                  { id: "rest_principles", name: "REST API Design Principles & Best Practices", optional: false },
                  { id: "express_nodejs", name: "Express.js & Node.js Backend Development", optional: false },
                  { id: "auth_jwt", name: "Authentication & JWT Implementation", optional: false },
                  { id: "validation_error", name: "Request Validation & Error Handling", optional: false },
                  { id: "api_docs", name: "API Documentation (Swagger/OpenAPI)", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "testing",
                title: "Testing & Test-Driven Development",
                description: "Write comprehensive tests for frontend and backend code.",
                resources: ["Jest Documentation", "React Testing Library", "Test Automation"],
                estimated_time: "3 weeks",
                prerequisites: ["state_management", "api_development"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "unit_testing", name: "Unit Testing with Jest", optional: false },
                  { id: "react_testing", name: "React Component Testing (React Testing Library)", optional: false },
                  { id: "integration_testing", name: "Integration & API Testing", optional: false },
                  { id: "tdd_approach", name: "Test-Driven Development (TDD) Approach", optional: false },
                  { id: "e2e_testing", name: "End-to-End Testing (Cypress/Playwright)", optional: true }
                ]
              },
              {
                id: "performance_optimization",
                title: "Performance Optimization",
                description: "Optimize web applications for speed and efficiency.",
                resources: ["Web Performance Optimization", "Lighthouse Guide", "Performance Monitoring"],
                estimated_time: "2 weeks",
                prerequisites: ["testing"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "react_optimization", name: "React Performance Optimization (Memoization, useMemo, useCallback)", optional: false },
                  { id: "code_splitting", name: "Code Splitting & Lazy Loading", optional: false },
                  { id: "bundle_optimization", name: "Bundle Size Optimization & Tree Shaking", optional: false },
                  { id: "lighthouse_metrics", name: "Lighthouse Metrics & Core Web Vitals", optional: false },
                  { id: "caching_cdn", name: "Caching Strategies & CDN Integration", optional: true }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "fullstack_app",
                title: "Full-Stack Application",
                description: "Build a complete web application with frontend and backend.",
                resources: ["MERN Stack Tutorial", "Full-Stack Project Ideas", "Deployment Guides"],
                estimated_time: "4 weeks",
                prerequisites: ["state_management", "api_development"],
                category: "Projects",
                subtasks: [
                  { id: "project_planning", name: "Project Planning & Architecture Design", optional: false },
                  { id: "frontend_development", name: "Frontend Development with React", optional: false },
                  { id: "backend_api", name: "Backend API Development with Node.js", optional: false },
                  { id: "database_integration", name: "Database Integration (MongoDB/PostgreSQL)", optional: false },
                  { id: "deployment", name: "Deployment & CI/CD Setup", optional: false }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "system_design",
                title: "System Design Fundamentals",
                description: "Learn to design scalable web systems and architectures.",
                resources: ["System Design Primer", "High Scalability", "System Design Interview"],
                estimated_time: "3 weeks",
                prerequisites: ["fullstack_app"],
                category: "Career Preparation",
                subtasks: [
                  { id: "scalability_concepts", name: "Scalability & Load Balancing Concepts", optional: false },
                  { id: "database_design", name: "Database Design & Sharding Strategies", optional: false },
                  { id: "caching_strategies", name: "Caching Strategies (Redis, Memcached)", optional: false },
                  { id: "microservices_basics", name: "Microservices Architecture Basics", optional: false },
                  { id: "system_design_practice", name: "System Design Interview Practice", optional: true }
                ]
              }
            ]
          }
        ]
      },
      advanced: {
        domain: "Web Development",
        total_estimated_time: "16 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "modern_js",
                title: "Modern JavaScript & TypeScript",
                description: "Master advanced JavaScript patterns and TypeScript for type-safe development.",
                resources: ["TypeScript Handbook", "Advanced JavaScript Patterns", "ES2023 Features"],
                estimated_time: "3 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "typescript_basics", name: "TypeScript Basics (Types, Interfaces, Generics)", optional: false },
                  { id: "advanced_types", name: "Advanced TypeScript (Utility Types, Conditional Types)", optional: false },
                  { id: "design_patterns", name: "JavaScript Design Patterns (Singleton, Factory, Observer)", optional: false },
                  { id: "functional_programming", name: "Functional Programming Patterns", optional: false },
                  { id: "metaprogramming", name: "Metaprogramming & Proxies", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "advanced_react",
                title: "Advanced React Patterns",
                description: "Master React hooks, context, performance optimization, and advanced patterns.",
                resources: ["React Advanced Patterns", "React Performance", "Custom Hooks"],
                estimated_time: "3 weeks",
                prerequisites: ["modern_js"],
                category: "Core Skills",
                subtasks: [
                  { id: "custom_hooks", name: "Custom Hooks & Hook Patterns", optional: false },
                  { id: "render_props", name: "Render Props & Higher-Order Components", optional: false },
                  { id: "compound_components", name: "Compound Components Pattern", optional: false },
                  { id: "react_performance", name: "React Performance Optimization Techniques", optional: false },
                  { id: "concurrent_react", name: "Concurrent React & Suspense", optional: true }
                ]
              },
              {
                id: "microservices",
                title: "Microservices Architecture",
                description: "Design and implement scalable microservices with Node.js.",
                resources: ["Microservices Patterns", "Docker & Kubernetes", "API Gateway"],
                estimated_time: "4 weeks",
                prerequisites: ["modern_js"],
                category: "Core Skills",
                subtasks: [
                  { id: "microservices_patterns", name: "Microservices Design Patterns", optional: false },
                  { id: "service_communication", name: "Service Communication (REST, gRPC, Message Queues)", optional: false },
                  { id: "api_gateway", name: "API Gateway & Service Mesh", optional: false },
                  { id: "distributed_systems", name: "Distributed Systems & CAP Theorem", optional: false },
                  { id: "service_discovery", name: "Service Discovery & Configuration Management", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "devops_deployment",
                title: "DevOps & Deployment",
                description: "Master CI/CD, containerization, and cloud deployment strategies.",
                resources: ["AWS/Azure Deployment", "Docker Mastery", "Jenkins/GitHub Actions"],
                estimated_time: "3 weeks",
                prerequisites: ["microservices"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "docker_containers", name: "Docker Containerization & Multi-Stage Builds", optional: false },
                  { id: "kubernetes_orchestration", name: "Kubernetes Orchestration & Deployment", optional: false },
                  { id: "cicd_pipelines", name: "CI/CD Pipelines (GitHub Actions, Jenkins)", optional: false },
                  { id: "cloud_deployment", name: "Cloud Deployment (AWS/Azure/GCP)", optional: false },
                  { id: "monitoring_logging", name: "Monitoring, Logging & Observability", optional: true }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "enterprise_app",
                title: "Enterprise-Scale Application",
                description: "Build a production-ready application with advanced architecture.",
                resources: ["System Design", "Scalability Patterns", "Production Best Practices"],
                estimated_time: "4 weeks",
                prerequisites: ["advanced_react", "devops_deployment"],
                category: "Projects",
                subtasks: [
                  { id: "architecture_design", name: "Enterprise Architecture Design", optional: false },
                  { id: "scalable_backend", name: "Scalable Backend with Microservices", optional: false },
                  { id: "advanced_frontend", name: "Advanced Frontend with Performance Optimization", optional: false },
                  { id: "security_best_practices", name: "Security Best Practices & Authentication", optional: false },
                  { id: "production_deployment", name: "Production Deployment & Monitoring", optional: false }
                ]
              }
            ]
          }
        ]
      }
    },
    'data-science': {
      beginner: {
        domain: "Data Science",
        total_estimated_time: "28 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "math_stats",
                title: "Mathematics & Statistics",
                description: "Master probability, statistics, and linear algebra for data science.",
                resources: ["Khan Academy Statistics", "NPTEL Probability", "MIT Linear Algebra"],
                estimated_time: "6 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "linear_algebra", name: "Linear Algebra (Vectors, Matrices, Eigenvalues)", optional: false },
                  { id: "probability", name: "Probability Theory (Distributions, Bayes Theorem)", optional: false },
                  { id: "descriptive_stats", name: "Descriptive Statistics (Mean, Median, Variance)", optional: false },
                  { id: "inferential_stats", name: "Inferential Statistics (Hypothesis Testing, Confidence Intervals)", optional: false },
                  { id: "calculus", name: "Basic Calculus (Derivatives, Gradients)", optional: true }
                ]
              },
              {
                id: "python_basics",
                title: "Python Programming",
                description: "Learn Python basics, data structures, and libraries.",
                resources: ["Python for Everybody (Coursera)", "NPTEL Python", "Automate the Boring Stuff"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "python_syntax", name: "Python Syntax & Data Types", optional: false },
                  { id: "control_flow", name: "Control Flow (Loops, Conditionals)", optional: false },
                  { id: "functions", name: "Functions & Lambda Expressions", optional: false },
                  { id: "data_structures", name: "Data Structures (Lists, Dictionaries, Sets)", optional: false },
                  { id: "oop", name: "Object-Oriented Programming Basics", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "data_manipulation",
                title: "Data Manipulation with Pandas",
                description: "Master data cleaning, transformation, and analysis with Pandas.",
                resources: ["Pandas Documentation", "Data Wrangling with Python", "NPTEL Data Analytics"],
                estimated_time: "3 weeks",
                prerequisites: ["python_basics"],
                category: "Core Skills",
                subtasks: [
                  { id: "pandas_basics", name: "Pandas Basics (DataFrames, Series)", optional: false },
                  { id: "data_cleaning", name: "Data Cleaning (Handling Missing Values, Duplicates)", optional: false },
                  { id: "data_filtering", name: "Data Filtering & Selection", optional: false },
                  { id: "groupby", name: "GroupBy Operations & Aggregations", optional: false },
                  { id: "merging", name: "Merging & Joining Datasets", optional: true }
                ]
              },
              {
                id: "data_visualization",
                title: "Data Visualization",
                description: "Create compelling visualizations using Matplotlib, Seaborn, and Plotly.",
                resources: ["Matplotlib Tutorial", "Seaborn Gallery", "Data Visualization Course"],
                estimated_time: "3 weeks",
                prerequisites: ["data_manipulation"],
                category: "Core Skills",
                subtasks: [
                  { id: "matplotlib_basics", name: "Matplotlib Fundamentals & Plot Types", optional: false },
                  { id: "seaborn_plots", name: "Seaborn Statistical Visualizations", optional: false },
                  { id: "customization", name: "Plot Customization & Styling", optional: false },
                  { id: "interactive_plots", name: "Interactive Plots with Plotly", optional: false },
                  { id: "dashboards", name: "Dashboard Creation with Plotly Dash", optional: true }
                ]
              },
              {
                id: "sql_databases",
                title: "SQL & Database Management",
                description: "Extract insights from databases using SQL queries.",
                resources: ["SQL Tutorial", "NPTEL Database Management", "SQLBolt"],
                estimated_time: "3 weeks",
                prerequisites: ["math_stats"],
                category: "Core Skills",
                subtasks: [
                  { id: "sql_basics", name: "SQL Basics (SELECT, WHERE, JOIN)", optional: false },
                  { id: "aggregations", name: "Aggregate Functions & GROUP BY", optional: false },
                  { id: "subqueries", name: "Subqueries & Complex Joins", optional: false },
                  { id: "window_functions", name: "Window Functions & CTEs", optional: false },
                  { id: "query_optimization", name: "Query Optimization & Indexing", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "machine_learning",
                title: "Machine Learning Fundamentals",
                description: "Learn supervised and unsupervised learning algorithms.",
                resources: ["Scikit-learn Tutorial", "Coursera ML Course", "NPTEL Machine Learning"],
                estimated_time: "5 weeks",
                prerequisites: ["math_stats", "data_manipulation"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "ml_concepts", name: "ML Concepts (Training, Testing, Validation)", optional: false },
                  { id: "linear_regression", name: "Linear & Logistic Regression", optional: false },
                  { id: "decision_trees", name: "Decision Trees & Random Forests", optional: false },
                  { id: "clustering", name: "Clustering (K-Means, DBSCAN)", optional: false },
                  { id: "feature_engineering", name: "Feature Engineering & Selection", optional: true }
                ]
              },
              {
                id: "model_evaluation",
                title: "Model Evaluation & Validation",
                description: "Assess model performance and avoid overfitting.",
                resources: ["Model Evaluation Techniques", "Cross-validation Guide", "Bias-Variance Tradeoff"],
                estimated_time: "2 weeks",
                prerequisites: ["machine_learning"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "metrics", name: "Evaluation Metrics (Accuracy, Precision, Recall, F1)", optional: false },
                  { id: "cross_validation", name: "Cross-Validation Techniques", optional: false },
                  { id: "confusion_matrix", name: "Confusion Matrix & ROC Curves", optional: false },
                  { id: "overfitting", name: "Overfitting Prevention & Regularization", optional: false },
                  { id: "hyperparameter_tuning", name: "Hyperparameter Tuning with Grid Search", optional: true }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "data_analysis_project",
                title: "End-to-End Data Analysis Project",
                description: "Complete a data science project from data collection to insights.",
                resources: ["Kaggle Datasets", "GitHub Data Projects", "Portfolio Examples"],
                estimated_time: "3 weeks",
                prerequisites: ["data_visualization", "machine_learning"],
                category: "Projects",
                subtasks: [
                  { id: "problem_definition", name: "Problem Definition & Dataset Selection", optional: false },
                  { id: "data_cleaning", name: "Data Cleaning & Preprocessing", optional: false },
                  { id: "eda", name: "Exploratory Data Analysis (EDA)", optional: false },
                  { id: "modeling", name: "Model Building & Evaluation", optional: false },
                  { id: "report_creation", name: "Report & Insights Documentation", optional: true }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "portfolio_showcase",
                title: "Data Science Portfolio",
                description: "Build a portfolio showcasing your data science projects.",
                resources: ["GitHub Pages", "Jupyter Notebooks", "Portfolio Templates"],
                estimated_time: "2 weeks",
                prerequisites: ["data_analysis_project"],
                category: "Career Preparation",
                subtasks: [
                  { id: "github_setup", name: "GitHub Repository Setup & Organization", optional: false },
                  { id: "jupyter_notebooks", name: "Jupyter Notebook Documentation", optional: false },
                  { id: "readme_creation", name: "README Files & Project Descriptions", optional: false },
                  { id: "portfolio_site", name: "Portfolio Website Deployment", optional: false },
                  { id: "blog_posts", name: "Technical Blog Posts & Articles", optional: true }
                ]
              }
            ]
          }
        ]
      },
      intermediate: {
        domain: "Data Science",
        total_estimated_time: "22 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "advanced_stats",
                title: "Advanced Statistics & Probability",
                description: "Master hypothesis testing, statistical inference, and advanced probability distributions.",
                resources: ["Statistical Inference Course", "Bayesian Statistics", "NPTEL Advanced Statistics"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "hypothesis_testing", name: "Hypothesis Testing & P-values", optional: false },
                  { id: "statistical_inference", name: "Statistical Inference & Confidence Intervals", optional: false },
                  { id: "probability_distributions", name: "Advanced Probability Distributions", optional: false },
                  { id: "bayesian_inference", name: "Bayesian Inference & Methods", optional: false },
                  { id: "multivariate_stats", name: "Multivariate Statistical Analysis", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "ml_algorithms",
                title: "Machine Learning Algorithms Deep Dive",
                description: "Implement and optimize ML algorithms from scratch, understand their mathematics.",
                resources: ["Elements of Statistical Learning", "ML Algorithm Implementation", "Scikit-learn Advanced"],
                estimated_time: "5 weeks",
                prerequisites: ["advanced_stats"],
                category: "Core Skills",
                subtasks: [
                  { id: "supervised_learning", name: "Supervised Learning Algorithms Implementation", optional: false },
                  { id: "unsupervised_learning", name: "Unsupervised Learning & Clustering", optional: false },
                  { id: "ensemble_methods", name: "Ensemble Methods (Bagging, Boosting)", optional: false },
                  { id: "algorithm_optimization", name: "Algorithm Optimization & Hyperparameter Tuning", optional: false },
                  { id: "custom_algorithms", name: "Custom Algorithm Development from Scratch", optional: true }
                ]
              },
              {
                id: "feature_engineering",
                title: "Advanced Feature Engineering",
                description: "Master feature selection, transformation, and engineering techniques.",
                resources: ["Feature Engineering Course", "Dimensionality Reduction", "Feature Selection Methods"],
                estimated_time: "3 weeks",
                prerequisites: ["ml_algorithms"],
                category: "Core Skills",
                subtasks: [
                  { id: "feature_selection", name: "Feature Selection Techniques", optional: false },
                  { id: "feature_transformation", name: "Feature Transformation & Encoding", optional: false },
                  { id: "dimensionality_reduction", name: "Dimensionality Reduction (PCA, t-SNE)", optional: false },
                  { id: "feature_creation", name: "Feature Creation & Domain Engineering", optional: false },
                  { id: "automated_feature_eng", name: "Automated Feature Engineering Tools", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "deep_learning",
                title: "Deep Learning Fundamentals",
                description: "Neural networks, CNNs, RNNs using TensorFlow/PyTorch.",
                resources: ["Deep Learning Specialization", "TensorFlow Certification", "PyTorch Tutorials"],
                estimated_time: "6 weeks",
                prerequisites: ["ml_algorithms"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "neural_networks", name: "Neural Networks & Backpropagation", optional: false },
                  { id: "cnn_implementation", name: "Convolutional Neural Networks (CNNs)", optional: false },
                  { id: "rnn_lstm", name: "Recurrent Neural Networks (RNNs & LSTMs)", optional: false },
                  { id: "pytorch_tensorflow", name: "TensorFlow & PyTorch Framework Mastery", optional: false },
                  { id: "transfer_learning", name: "Transfer Learning & Pre-trained Models", optional: true }
                ]
              },
              {
                id: "mlops",
                title: "MLOps and Model Deployment",
                description: "Deploy ML models to production with proper monitoring and versioning.",
                resources: ["MLOps Course", "Docker for ML", "Model Monitoring"],
                estimated_time: "3 weeks",
                prerequisites: ["deep_learning"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "model_deployment", name: "Model Deployment Strategies", optional: false },
                  { id: "containerization", name: "Docker & Kubernetes for ML", optional: false },
                  { id: "model_monitoring", name: "Model Monitoring & Performance Tracking", optional: false },
                  { id: "model_versioning", name: "Model Versioning & Experiment Tracking", optional: false },
                  { id: "ci_cd_ml", name: "CI/CD Pipelines for ML", optional: true }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "end_to_end_ml",
                title: "End-to-End ML Pipeline",
                description: "Build a complete ML system from data collection to deployment.",
                resources: ["Kaggle Competitions", "ML System Design", "Production ML"],
                estimated_time: "4 weeks",
                prerequisites: ["feature_engineering", "mlops"],
                category: "Projects",
                subtasks: [
                  { id: "data_collection", name: "Data Collection & Preprocessing Pipeline", optional: false },
                  { id: "model_training", name: "Model Training & Validation", optional: false },
                  { id: "production_deployment", name: "Production Deployment & API Development", optional: false },
                  { id: "monitoring_maintenance", name: "Monitoring & Maintenance System", optional: false },
                  { id: "ab_testing", name: "A/B Testing & Model Evaluation", optional: true }
                ]
              }
            ]
          }
        ]
      },
      advanced: {
        domain: "Data Science",
        total_estimated_time: "20 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "research_methods",
                title: "Research Methodology & Experimental Design",
                description: "Advanced experimental design, A/B testing, and causal inference.",
                resources: ["Causal Inference Course", "Experimental Design", "A/B Testing Mastery"],
                estimated_time: "3 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "experimental_design", name: "Experimental Design Principles", optional: false },
                  { id: "causal_inference", name: "Causal Inference & Causality", optional: false },
                  { id: "ab_testing_advanced", name: "Advanced A/B Testing & Multi-armed Bandits", optional: false },
                  { id: "statistical_power", name: "Statistical Power Analysis & Sample Size", optional: false },
                  { id: "quasi_experiments", name: "Quasi-Experimental Methods", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "advanced_dl",
                title: "Advanced Deep Learning Architectures",
                description: "Transformers, GANs, reinforcement learning, and cutting-edge architectures.",
                resources: ["Transformer Architecture", "GAN Implementation", "RL Specialization"],
                estimated_time: "5 weeks",
                prerequisites: ["research_methods"],
                category: "Core Skills",
                subtasks: [
                  { id: "transformers", name: "Transformer Architecture & Attention Mechanisms", optional: false },
                  { id: "gans", name: "Generative Adversarial Networks (GANs)", optional: false },
                  { id: "reinforcement_learning", name: "Reinforcement Learning & Deep Q-Networks", optional: false },
                  { id: "advanced_architectures", name: "Cutting-Edge Architectures (BERT, GPT, Vision Transformers)", optional: false },
                  { id: "graph_neural_networks", name: "Graph Neural Networks (GNNs)", optional: true }
                ]
              },
              {
                id: "big_data_ml",
                title: "Big Data & Distributed ML",
                description: "Spark MLlib, distributed computing, and large-scale ML systems.",
                resources: ["Spark MLlib", "Distributed ML", "Big Data Analytics"],
                estimated_time: "4 weeks",
                prerequisites: ["advanced_dl"],
                category: "Core Skills",
                subtasks: [
                  { id: "spark_mllib", name: "Apache Spark & MLlib", optional: false },
                  { id: "distributed_computing", name: "Distributed Computing Frameworks", optional: false },
                  { id: "large_scale_training", name: "Large-Scale Model Training", optional: false },
                  { id: "data_parallelism", name: "Data Parallelism & Model Parallelism", optional: false },
                  { id: "streaming_ml", name: "Streaming ML & Real-time Analytics", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "ml_engineering",
                title: "ML Engineering & System Design",
                description: "Design scalable ML systems, optimize for performance and cost.",
                resources: ["ML System Design", "Scalable ML", "Performance Optimization"],
                estimated_time: "4 weeks",
                prerequisites: ["big_data_ml"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "ml_system_design", name: "ML System Design Patterns", optional: false },
                  { id: "scalability", name: "Scalability & Performance Optimization", optional: false },
                  { id: "cost_optimization", name: "Cost Optimization & Resource Management", optional: false },
                  { id: "infrastructure", name: "ML Infrastructure & Platform Engineering", optional: false },
                  { id: "mlops_advanced", name: "Advanced MLOps & Automation", optional: true }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "research_publication",
                title: "Research & Publication",
                description: "Conduct original research and publish findings in conferences/journals.",
                resources: ["Research Paper Writing", "Conference Submissions", "Peer Review Process"],
                estimated_time: "4 weeks",
                prerequisites: ["ml_engineering"],
                category: "Career Preparation",
                subtasks: [
                  { id: "research_design", name: "Research Design & Hypothesis Formulation", optional: false },
                  { id: "paper_writing", name: "Academic Paper Writing & Structure", optional: false },
                  { id: "conference_submission", name: "Conference & Journal Submission Process", optional: false },
                  { id: "peer_review", name: "Peer Review & Revision Process", optional: false },
                  { id: "reproducibility", name: "Research Reproducibility & Open Science", optional: true }
                ]
              }
            ]
          }
        ]
      }
    },
    'mobile-development': {
      beginner: {
        domain: "Mobile Development",
        total_estimated_time: "26 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "mobile_fundamentals",
                title: "Mobile Development Fundamentals",
                description: "Understanding mobile platforms, app lifecycle, and development principles.",
                resources: ["Mobile Dev Basics", "iOS vs Android", "App Store Guidelines"],
                estimated_time: "2 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "mobile_platforms", name: "Mobile Platforms (iOS, Android, Cross-Platform)", optional: false },
                  { id: "app_lifecycle", name: "Application Lifecycle & States", optional: false },
                  { id: "mobile_design_principles", name: "Mobile Design Principles & Patterns", optional: false },
                  { id: "app_store_guidelines", name: "App Store & Play Store Guidelines", optional: false },
                  { id: "mobile_ecosystem", name: "Mobile Ecosystem & Market Trends", optional: true }
                ]
              },
              {
                id: "programming_basics_mobile",
                title: "Programming Language Basics",
                description: "Learn Dart for Flutter or JavaScript for React Native.",
                resources: ["Dart Programming", "JavaScript for Mobile", "Programming Fundamentals"],
                estimated_time: "4 weeks",
                prerequisites: ["mobile_fundamentals"],
                category: "Foundations",
                subtasks: [
                  { id: "dart_syntax", name: "Dart Syntax & Fundamentals", optional: false },
                  { id: "oop_mobile", name: "Object-Oriented Programming Concepts", optional: false },
                  { id: "async_programming", name: "Asynchronous Programming Basics", optional: false },
                  { id: "data_structures", name: "Data Structures & Collections", optional: false },
                  { id: "functional_programming", name: "Functional Programming Concepts", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "flutter_basics",
                title: "Flutter Development Basics",
                description: "Widgets, layouts, navigation, and state management in Flutter.",
                resources: ["Flutter Documentation", "Flutter Course", "Dart & Flutter Bootcamp"],
                estimated_time: "6 weeks",
                prerequisites: ["programming_basics_mobile"],
                category: "Core Skills",
                subtasks: [
                  { id: "flutter_widgets", name: "Flutter Widgets & Widget Tree", optional: false },
                  { id: "layouts", name: "Layouts & Responsive Design", optional: false },
                  { id: "navigation", name: "Navigation & Routing", optional: false },
                  { id: "state_management_basics", name: "State Management Basics (setState, Provider)", optional: false },
                  { id: "animations", name: "Basic Animations & Transitions", optional: true }
                ]
              },
              {
                id: "ui_ux_mobile",
                title: "Mobile UI/UX Design",
                description: "Material Design, Human Interface Guidelines, responsive design.",
                resources: ["Material Design", "iOS Design Guidelines", "Mobile UX Patterns"],
                estimated_time: "3 weeks",
                prerequisites: ["flutter_basics"],
                category: "Core Skills",
                subtasks: [
                  { id: "material_design", name: "Material Design Principles", optional: false },
                  { id: "ios_guidelines", name: "Human Interface Guidelines (iOS)", optional: false },
                  { id: "responsive_design", name: "Responsive & Adaptive Design", optional: false },
                  { id: "ux_patterns", name: "Mobile UX Patterns & Best Practices", optional: false },
                  { id: "accessibility", name: "Mobile Accessibility & Inclusive Design", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "data_storage_mobile",
                title: "Data Storage & Management",
                description: "Local databases, cloud storage, and data synchronization.",
                resources: ["SQLite Tutorial", "Firebase", "Local Storage Options"],
                estimated_time: "3 weeks",
                prerequisites: ["ui_ux_mobile"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "local_storage", name: "Local Storage (SharedPreferences, Hive)", optional: false },
                  { id: "sqlite_database", name: "SQLite & Local Databases", optional: false },
                  { id: "cloud_storage", name: "Cloud Storage (Firebase, Cloud Firestore)", optional: false },
                  { id: "data_sync", name: "Data Synchronization Strategies", optional: false },
                  { id: "offline_first", name: "Offline-First Architecture", optional: true }
                ]
              },
              {
                id: "api_integration_mobile",
                title: "API Integration & Networking",
                description: "REST APIs, HTTP requests, authentication, and error handling.",
                resources: ["REST API Course", "HTTP & Networking", "API Authentication"],
                estimated_time: "3 weeks",
                prerequisites: ["data_storage_mobile"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "http_requests", name: "HTTP Requests & Dio Package", optional: false },
                  { id: "rest_api", name: "REST API Integration", optional: false },
                  { id: "api_authentication", name: "API Authentication (OAuth, JWT)", optional: false },
                  { id: "error_handling", name: "Error Handling & Network Exceptions", optional: false },
                  { id: "json_parsing", name: "JSON Parsing & Serialization", optional: true }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "mobile_app_project",
                title: "Complete Mobile App",
                description: "Build and deploy a full-featured mobile application.",
                resources: ["App Store Deployment", "Google Play Publishing", "App Testing"],
                estimated_time: "4 weeks",
                prerequisites: ["api_integration_mobile"],
                category: "Projects",
                subtasks: [
                  { id: "app_planning", name: "App Planning & Requirements", optional: false },
                  { id: "ui_development", name: "UI Development & Implementation", optional: false },
                  { id: "feature_implementation", name: "Feature Implementation & Integration", optional: false },
                  { id: "testing_debugging", name: "Testing & Debugging", optional: false },
                  { id: "app_deployment", name: "App Store Deployment & Publishing", optional: true }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "portfolio_mobile",
                title: "Mobile Development Portfolio",
                description: "Create a portfolio showcasing your mobile apps and skills.",
                resources: ["Portfolio Examples", "GitHub Mobile Projects", "App Showcase"],
                estimated_time: "2 weeks",
                prerequisites: ["mobile_app_project"],
                category: "Career Preparation",
                subtasks: [
                  { id: "github_portfolio", name: "GitHub Portfolio Setup", optional: false },
                  { id: "app_showcase", name: "App Showcase & Screenshots", optional: false },
                  { id: "project_documentation", name: "Project Documentation & README", optional: false },
                  { id: "demo_videos", name: "Demo Videos & Presentations", optional: false },
                  { id: "portfolio_website", name: "Portfolio Website Development", optional: true }
                ]
              }
            ]
          }
        ]
      },
      intermediate: {
        domain: "Mobile Development",
        total_estimated_time: "22 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "advanced_dart",
                title: "Advanced Dart Programming",
                description: "Generics, async programming, streams, and advanced Dart features.",
                resources: ["Dart Advanced Guide", "Asynchronous Programming", "Dart Best Practices"],
                estimated_time: "3 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "generics", name: "Generics & Type Safety", optional: false },
                  { id: "async_await", name: "Async/Await & Futures", optional: false },
                  { id: "streams", name: "Streams & Stream Controllers", optional: false },
                  { id: "isolates", name: "Isolates & Concurrency", optional: false },
                  { id: "metaprogramming", name: "Metaprogramming & Reflection", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "state_management_mobile",
                title: "Advanced State Management",
                description: "Provider, Riverpod, BLoC pattern for complex app states.",
                resources: ["BLoC Pattern", "Provider Advanced", "State Management Comparison"],
                estimated_time: "4 weeks",
                prerequisites: ["advanced_dart"],
                category: "Core Skills",
                subtasks: [
                  { id: "provider_advanced", name: "Advanced Provider Pattern", optional: false },
                  { id: "riverpod", name: "Riverpod State Management", optional: false },
                  { id: "bloc_pattern", name: "BLoC Pattern & Architecture", optional: false },
                  { id: "state_comparison", name: "State Management Solutions Comparison", optional: false },
                  { id: "redux_mobx", name: "Redux & MobX Alternatives", optional: true }
                ]
              },
              {
                id: "native_features",
                title: "Native Features & Platform Integration",
                description: "Camera, location, push notifications, and platform channels.",
                resources: ["Platform Channels", "Native Integration", "Device Features"],
                estimated_time: "4 weeks",
                prerequisites: ["state_management_mobile"],
                category: "Core Skills",
                subtasks: [
                  { id: "camera_integration", name: "Camera & Image Picker Integration", optional: false },
                  { id: "location_services", name: "Location Services & Geolocation", optional: false },
                  { id: "push_notifications", name: "Push Notifications (FCM)", optional: false },
                  { id: "platform_channels", name: "Platform Channels & Native Code", optional: false },
                  { id: "sensors", name: "Device Sensors & Hardware Access", optional: true }
                ]
              },
              {
                id: "performance_optimization_mobile",
                title: "Performance Optimization",
                description: "Optimize app performance, reduce build size, and improve responsiveness.",
                resources: ["Flutter Performance", "Profiling Tools", "Optimization Techniques"],
                estimated_time: "3 weeks",
                prerequisites: ["native_features"],
                category: "Core Skills",
                subtasks: [
                  { id: "performance_profiling", name: "Performance Profiling & Analysis", optional: false },
                  { id: "build_optimization", name: "Build Size & Code Optimization", optional: false },
                  { id: "rendering_optimization", name: "Rendering & Frame Rate Optimization", optional: false },
                  { id: "memory_management", name: "Memory Management & Leak Prevention", optional: false },
                  { id: "lazy_loading", name: "Lazy Loading & Code Splitting", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "testing_mobile",
                title: "Testing & Quality Assurance",
                description: "Unit tests, widget tests, integration tests, and CI/CD.",
                resources: ["Flutter Testing", "Test Automation", "CI/CD for Mobile"],
                estimated_time: "3 weeks",
                prerequisites: ["performance_optimization_mobile"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "unit_testing", name: "Unit Testing & Test-Driven Development", optional: false },
                  { id: "widget_testing", name: "Widget Testing & UI Testing", optional: false },
                  { id: "integration_testing", name: "Integration & End-to-End Testing", optional: false },
                  { id: "ci_cd_pipeline", name: "CI/CD Pipeline Setup (GitHub Actions, Codemagic)", optional: false },
                  { id: "test_coverage", name: "Test Coverage & Quality Metrics", optional: true }
                ]
              },
              {
                id: "app_architecture",
                title: "App Architecture Patterns",
                description: "Clean architecture, MVVM, repository pattern for scalable apps.",
                resources: ["Clean Architecture", "Design Patterns", "App Architecture Guide"],
                estimated_time: "3 weeks",
                prerequisites: ["testing_mobile"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "clean_architecture", name: "Clean Architecture Principles", optional: false },
                  { id: "mvvm_pattern", name: "MVVM (Model-View-ViewModel) Pattern", optional: false },
                  { id: "repository_pattern", name: "Repository Pattern & Data Layer", optional: false },
                  { id: "dependency_injection", name: "Dependency Injection & Service Locator", optional: false },
                  { id: "solid_principles", name: "SOLID Principles in Mobile Development", optional: true }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "production_app",
                title: "Production-Ready App",
                description: "Build a complex app with advanced features and architecture.",
                resources: ["Production Checklist", "App Store Optimization", "User Analytics"],
                estimated_time: "4 weeks",
                prerequisites: ["app_architecture"],
                category: "Projects",
                subtasks: [
                  { id: "app_development", name: "Complex App Development with Clean Architecture", optional: false },
                  { id: "analytics_integration", name: "Analytics & Crash Reporting Integration", optional: false },
                  { id: "app_optimization", name: "App Store Optimization (ASO)", optional: false },
                  { id: "production_deployment", name: "Production Deployment & Release Management", optional: false },
                  { id: "user_feedback", name: "User Feedback & Iteration", optional: true }
                ]
              }
            ]
          }
        ]
      },
      advanced: {
        domain: "Mobile Development",
        total_estimated_time: "18 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "cross_platform_mastery",
                title: "Cross-Platform Architecture Mastery",
                description: "Advanced patterns for scalable cross-platform applications.",
                resources: ["Enterprise Mobile Architecture", "Cross-Platform Best Practices", "Scalability Patterns"],
                estimated_time: "3 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "cross_platform_patterns", name: "Cross-Platform Design Patterns", optional: false },
                  { id: "code_sharing", name: "Code Sharing Strategies & Reusability", optional: false },
                  { id: "platform_specific", name: "Platform-Specific Optimizations", optional: false },
                  { id: "architecture_scalability", name: "Scalable Architecture Design", optional: false },
                  { id: "multi_platform", name: "Multi-Platform Support (Web, Desktop)", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "custom_engine",
                title: "Custom Flutter Engine & Native Modules",
                description: "Build custom plugins, native modules, and engine modifications.",
                resources: ["Flutter Engine", "Plugin Development", "Native Bridges"],
                estimated_time: "4 weeks",
                prerequisites: ["cross_platform_mastery"],
                category: "Core Skills",
                subtasks: [
                  { id: "plugin_development", name: "Custom Plugin Development", optional: false },
                  { id: "native_bridges", name: "Native Bridges (iOS & Android)", optional: false },
                  { id: "engine_customization", name: "Flutter Engine Customization", optional: false },
                  { id: "native_modules", name: "Native Module Integration", optional: false },
                  { id: "ffi", name: "Foreign Function Interface (FFI) & C/C++ Integration", optional: true }
                ]
              },
              {
                id: "security_mobile",
                title: "Mobile Security & Encryption",
                description: "Implement advanced security, encryption, and secure storage.",
                resources: ["Mobile Security", "Encryption Best Practices", "Secure Coding"],
                estimated_time: "3 weeks",
                prerequisites: ["custom_engine"],
                category: "Core Skills",
                subtasks: [
                  { id: "encryption", name: "Data Encryption & Cryptography", optional: false },
                  { id: "secure_storage", name: "Secure Storage & KeyChain/KeyStore", optional: false },
                  { id: "authentication_security", name: "Biometric Authentication & Secure Auth", optional: false },
                  { id: "code_obfuscation", name: "Code Obfuscation & Anti-Tampering", optional: false },
                  { id: "penetration_testing", name: "Security Audits & Penetration Testing", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "scalability_mobile",
                title: "Scalability & Enterprise Solutions",
                description: "Design apps for millions of users with proper architecture.",
                resources: ["Mobile Scalability", "Enterprise Patterns", "System Design for Mobile"],
                estimated_time: "4 weeks",
                prerequisites: ["security_mobile"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "scalable_architecture", name: "Scalable Mobile Architecture Patterns", optional: false },
                  { id: "performance_at_scale", name: "Performance Optimization at Scale", optional: false },
                  { id: "backend_integration", name: "Backend Integration & API Design", optional: false },
                  { id: "caching_strategies", name: "Advanced Caching & Data Management", optional: false },
                  { id: "microservices", name: "Microservices & Distributed Systems", optional: true }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "enterprise_mobile_app",
                title: "Enterprise-Scale Mobile Application",
                description: "Build a large-scale app with advanced features and architecture.",
                resources: ["Enterprise Case Studies", "Large-Scale Architecture", "Team Collaboration"],
                estimated_time: "4 weeks",
                prerequisites: ["scalability_mobile"],
                category: "Projects",
                subtasks: [
                  { id: "enterprise_app_design", name: "Enterprise App Design & Planning", optional: false },
                  { id: "advanced_implementation", name: "Advanced Feature Implementation", optional: false },
                  { id: "team_collaboration", name: "Team Collaboration & Code Review", optional: false },
                  { id: "enterprise_deployment", name: "Enterprise Deployment & Distribution", optional: false },
                  { id: "maintenance_support", name: "Maintenance, Support & Analytics", optional: true }
                ]
              }
            ]
          }
        ]
      }
    },
    'cybersecurity': {
      beginner: {
        domain: "Cybersecurity",
        total_estimated_time: "32 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "security_fundamentals",
                title: "Information Security Fundamentals",
                description: "CIA triad, security principles, threat landscape, and risk management.",
                resources: ["Security+ Study Guide", "CISSP Concepts", "Security Fundamentals"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "cia_triad", name: "CIA Triad (Confidentiality, Integrity, Availability)", optional: false },
                  { id: "threat_landscape", name: "Threat Landscape & Attack Vectors", optional: false },
                  { id: "risk_management", name: "Risk Management & Assessment", optional: false },
                  { id: "security_policies", name: "Security Policies & Procedures", optional: false },
                  { id: "compliance", name: "Compliance & Regulations (GDPR, HIPAA)", optional: true }
                ]
              },
              {
                id: "networking_security",
                title: "Network Security Basics",
                description: "TCP/IP, firewalls, VPNs, network protocols, and security.",
                resources: ["Network+ Course", "Cisco Networking", "Network Security Essentials"],
                estimated_time: "5 weeks",
                prerequisites: ["security_fundamentals"],
                category: "Foundations",
                subtasks: [
                  { id: "tcp_ip", name: "TCP/IP Protocol Suite", optional: false },
                  { id: "firewalls", name: "Firewalls & Network Segmentation", optional: false },
                  { id: "vpn", name: "VPNs & Secure Communication", optional: false },
                  { id: "ids_ips", name: "IDS/IPS Systems", optional: false },
                  { id: "wireless_security", name: "Wireless Network Security", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "ethical_hacking",
                title: "Ethical Hacking & Penetration Testing",
                description: "Vulnerability assessment, penetration testing methodologies, and tools.",
                resources: ["CEH Course", "Kali Linux", "Penetration Testing Guide"],
                estimated_time: "8 weeks",
                prerequisites: ["networking_security"],
                category: "Core Skills",
                subtasks: [
                  { id: "reconnaissance", name: "Reconnaissance & Information Gathering", optional: false },
                  { id: "scanning", name: "Scanning & Enumeration", optional: false },
                  { id: "exploitation", name: "Exploitation Techniques", optional: false },
                  { id: "post_exploitation", name: "Post-Exploitation & Privilege Escalation", optional: false },
                  { id: "report_writing", name: "Penetration Testing Report Writing", optional: false }
                ]
              },
              {
                id: "incident_response",
                title: "Incident Response & Forensics",
                description: "Incident handling, digital forensics, and malware analysis.",
                resources: ["SANS Incident Response", "Digital Forensics", "Malware Analysis"],
                estimated_time: "6 weeks",
                prerequisites: ["ethical_hacking"],
                category: "Core Skills",
                subtasks: [
                  { id: "incident_handling", name: "Incident Handling Procedures", optional: false },
                  { id: "forensics_tools", name: "Digital Forensics Tools & Techniques", optional: false },
                  { id: "malware_analysis", name: "Malware Analysis Basics", optional: false },
                  { id: "evidence_collection", name: "Evidence Collection & Preservation", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "security_tools",
                title: "Security Tools & Technologies",
                description: "SIEM, vulnerability scanners, and security automation tools.",
                resources: ["Splunk Training", "Nessus Scanner", "Security Tool Mastery"],
                estimated_time: "4 weeks",
                prerequisites: ["incident_response"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "siem", name: "SIEM Configuration & Management (Splunk)", optional: false },
                  { id: "vuln_scanning", name: "Vulnerability Scanning (Nessus, OpenVAS)", optional: false },
                  { id: "automation", name: "Security Automation & Scripting", optional: false },
                  { id: "threat_intel", name: "Threat Intelligence Platforms", optional: true }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "security_lab",
                title: "Cybersecurity Lab Setup",
                description: "Build a home lab for practicing security skills and scenarios.",
                resources: ["Home Lab Guide", "Virtual Lab Setup", "Security Practice"],
                estimated_time: "3 weeks",
                prerequisites: ["security_tools"],
                category: "Projects",
                subtasks: [
                  { id: "virtualization", name: "Virtualization Setup (VirtualBox/VMware)", optional: false },
                  { id: "kali_setup", name: "Kali Linux Installation & Configuration", optional: false },
                  { id: "vulnerable_machines", name: "Vulnerable Machines Setup (Metasploitable, DVWA)", optional: false },
                  { id: "network_config", name: "Network Configuration & Segmentation", optional: false },
                  { id: "monitoring_tools", name: "Security Monitoring & Logging Tools", optional: true }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "security_certifications",
                title: "Security Certifications Preparation",
                description: "Prepare for industry certifications like Security+, CEH, or CISSP.",
                resources: ["Certification Study Guides", "Practice Exams", "Certification Roadmap"],
                estimated_time: "4 weeks",
                prerequisites: ["security_lab"],
                category: "Career Preparation",
                subtasks: [
                  { id: "cert_selection", name: "Certification Path Selection (CompTIA Security+/CEH)", optional: false },
                  { id: "study_plan", name: "Study Plan & Resource Organization", optional: false },
                  { id: "domain_review", name: "Domain Knowledge Review & Study", optional: false },
                  { id: "practice_exams", name: "Practice Exams & Question Banks", optional: false },
                  { id: "hands_on_labs", name: "Hands-on Lab Practice & Simulations", optional: true }
                ]
              }
            ]
          }
        ]
      },
      intermediate: {
        domain: "Cybersecurity",
        total_estimated_time: "26 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "advanced_networking",
                title: "Advanced Network Security",
                description: "Advanced network protocols, network architecture security, and defense strategies.",
                resources: ["Advanced Network Security", "Network Defense", "Security Architecture"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "advanced_protocols", name: "Advanced Network Protocols & Security", optional: false },
                  { id: "network_architecture", name: "Secure Network Architecture Design", optional: false },
                  { id: "defense_in_depth", name: "Defense in Depth Strategies", optional: false },
                  { id: "zero_trust", name: "Zero Trust Architecture", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "advanced_pentesting",
                title: "Advanced Penetration Testing",
                description: "Web application security, API testing, and advanced exploitation.",
                resources: ["OSCP Preparation", "Web Application Security", "Advanced Exploitation"],
                estimated_time: "6 weeks",
                prerequisites: ["advanced_networking"],
                category: "Core Skills",
                subtasks: [
                  { id: "web_app_security", name: "Web Application Penetration Testing", optional: false },
                  { id: "api_security", name: "API Security Testing", optional: false },
                  { id: "mobile_app_security", name: "Mobile Application Security", optional: false },
                  { id: "advanced_exploit", name: "Advanced Exploitation Techniques", optional: false }
                ]
              },
              {
                id: "security_engineering",
                title: "Security Engineering & Architecture",
                description: "Design and implement secure systems and infrastructure.",
                resources: ["Security Engineering", "Secure System Design", "Architecture Patterns"],
                estimated_time: "5 weeks",
                prerequisites: ["advanced_pentesting"],
                category: "Core Skills",
                subtasks: [
                  { id: "secure_sdlc", name: "Secure Software Development Lifecycle", optional: false },
                  { id: "threat_modeling", name: "Threat Modeling & Risk Analysis", optional: false },
                  { id: "secure_coding", name: "Secure Coding Practices", optional: false },
                  { id: "crypto", name: "Cryptography & PKI", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "cloud_security",
                title: "Cloud Security",
                description: "Secure cloud infrastructure, containers, and cloud-native applications.",
                resources: ["AWS Security", "Azure Security", "Cloud Security Alliance"],
                estimated_time: "4 weeks",
                prerequisites: ["security_engineering"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "cloud_infrastructure", name: "Cloud Infrastructure Security", optional: false },
                  { id: "container_security", name: "Container & Kubernetes Security", optional: false },
                  { id: "cloud_compliance", name: "Cloud Compliance & Governance", optional: false }
                ]
              },
              {
                id: "advanced_forensics",
                title: "Advanced Digital Forensics",
                description: "Memory forensics, network forensics, and advanced analysis techniques.",
                resources: ["Memory Forensics", "Network Forensics", "Advanced Analysis"],
                estimated_time: "4 weeks",
                prerequisites: ["cloud_security"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "memory_forensics", name: "Memory Forensics & Analysis", optional: false },
                  { id: "network_forensics", name: "Network Traffic Analysis", optional: false },
                  { id: "malware_reversing", name: "Malware Reverse Engineering", optional: false }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "security_assessment",
                title: "Complete Security Assessment Project",
                description: "Perform comprehensive security assessment of a complex system.",
                resources: ["Assessment Methodology", "Reporting Templates", "Industry Standards"],
                estimated_time: "3 weeks",
                prerequisites: ["advanced_forensics"],
                category: "Projects",
                subtasks: [
                  { id: "vulnerability_scanning", name: "Comprehensive Vulnerability Scanning & Assessment", optional: false },
                  { id: "penetration_testing", name: "Penetration Testing & Exploitation", optional: false },
                  { id: "risk_analysis", name: "Risk Analysis & Threat Modeling", optional: false },
                  { id: "security_report", name: "Security Assessment Report & Remediation Plan", optional: false },
                  { id: "compliance_audit", name: "Compliance Audit & Framework Mapping", optional: true }
                ]
              }
            ]
          }
        ]
      },
      advanced: {
        domain: "Cybersecurity",
        total_estimated_time: "22 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "security_research",
                title: "Security Research & Exploit Development",
                description: "Vulnerability research, exploit development, and 0-day discovery.",
                resources: ["Exploit Development", "Vulnerability Research", "0-day Hunting"],
                estimated_time: "5 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "vuln_research", name: "Vulnerability Research Methodologies", optional: false },
                  { id: "exploit_dev", name: "Exploit Development Techniques", optional: false },
                  { id: "fuzzing", name: "Fuzzing & Bug Hunting", optional: false },
                  { id: "binary_exploitation", name: "Binary Exploitation", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "red_team_ops",
                title: "Red Team Operations",
                description: "Advanced adversary simulation and red team techniques.",
                resources: ["Red Team Handbook", "Adversary Simulation", "Tactics & Techniques"],
                estimated_time: "6 weeks",
                prerequisites: ["security_research"],
                category: "Core Skills",
                subtasks: [
                  { id: "adversary_simulation", name: "Adversary Simulation & Emulation", optional: false },
                  { id: "c2_frameworks", name: "Command & Control Frameworks", optional: false },
                  { id: "evasion", name: "EDR Evasion & Anti-Forensics", optional: false },
                  { id: "social_engineering", name: "Advanced Social Engineering", optional: false }
                ]
              },
              {
                id: "security_leadership",
                title: "Security Program Management",
                description: "Build and manage enterprise security programs.",
                resources: ["Security Management", "Program Development", "Leadership Skills"],
                estimated_time: "4 weeks",
                prerequisites: ["red_team_ops"],
                category: "Core Skills",
                subtasks: [
                  { id: "program_development", name: "Security Program Development", optional: false },
                  { id: "risk_management_advanced", name: "Advanced Risk Management", optional: false },
                  { id: "compliance_frameworks", name: "Compliance Frameworks (ISO, NIST)", optional: false },
                  { id: "team_building", name: "Security Team Building & Leadership", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "threat_hunting",
                title: "Threat Hunting & Intelligence",
                description: "Proactive threat detection and threat intelligence operations.",
                resources: ["Threat Hunting", "Intelligence Operations", "Advanced Detection"],
                estimated_time: "4 weeks",
                prerequisites: ["security_leadership"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "hunting_methodologies", name: "Threat Hunting Methodologies", optional: false },
                  { id: "threat_intel", name: "Threat Intelligence Analysis", optional: false },
                  { id: "behavioral_analytics", name: "Behavioral Analytics & UEBA", optional: false }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "advanced_certifications",
                title: "Advanced Security Certifications",
                description: "Pursue advanced certifications like OSCP, OSCE, CISSP, CISM.",
                resources: ["OSCP Guide", "CISSP Preparation", "Advanced Certifications"],
                estimated_time: "3 weeks",
                prerequisites: ["threat_hunting"],
                category: "Career Preparation",
                subtasks: [
                  { id: "oscp_prep", name: "OSCP (Offensive Security Certified Professional) Preparation", optional: false },
                  { id: "cissp_study", name: "CISSP (Certified Information Systems Security Professional) Study", optional: false },
                  { id: "cism_training", name: "CISM (Certified Information Security Manager) Training", optional: false },
                  { id: "giac_certifications", name: "GIAC Advanced Security Certifications", optional: false },
                  { id: "osce_prep", name: "OSCE (Offensive Security Certified Expert) Preparation", optional: true }
                ]
              }
            ]
          }
        ]
      }
    },
    'cloud-computing': {
      beginner: {
        domain: "Cloud Computing",
        total_estimated_time: "24 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "cloud_fundamentals",
                title: "Cloud Computing Fundamentals",
                description: "Cloud service models, deployment models, and core concepts.",
                resources: ["AWS Cloud Practitioner", "Azure Fundamentals", "Cloud Computing Basics"],
                estimated_time: "3 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "cloud_models", name: "Cloud Service Models (IaaS, PaaS, SaaS)", optional: false },
                  { id: "deployment_models", name: "Deployment Models (Public, Private, Hybrid)", optional: false },
                  { id: "cloud_economics", name: "Cloud Economics & Cost Management", optional: false },
                  { id: "cloud_providers", name: "Major Cloud Providers Overview", optional: false }
                ]
              },
              {
                id: "linux_basics",
                title: "Linux System Administration",
                description: "Command line, shell scripting, and system administration basics.",
                resources: ["Linux Command Line", "Shell Scripting", "System Administration"],
                estimated_time: "4 weeks",
                prerequisites: ["cloud_fundamentals"],
                category: "Foundations",
                subtasks: [
                  { id: "linux_commands", name: "Linux Commands & File System", optional: false },
                  { id: "bash_scripting", name: "Bash Scripting Basics", optional: false },
                  { id: "user_management", name: "User & Permission Management", optional: false },
                  { id: "system_monitoring", name: "System Monitoring & Logs", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "aws_basics",
                title: "AWS Core Services",
                description: "EC2, S3, RDS, VPC, and other essential AWS services.",
                resources: ["AWS Solutions Architect", "AWS Hands-on Labs", "AWS Documentation"],
                estimated_time: "6 weeks",
                prerequisites: ["linux_basics"],
                category: "Core Skills",
                subtasks: [
                  { id: "ec2", name: "EC2 Instances & Auto Scaling", optional: false },
                  { id: "s3_storage", name: "S3 Storage & Data Management", optional: false },
                  { id: "vpc_networking", name: "VPC & Networking", optional: false },
                  { id: "rds", name: "RDS Database Services", optional: false },
                  { id: "iam", name: "IAM & Security", optional: false }
                ]
              },
              {
                id: "infrastructure_code",
                title: "Infrastructure as Code",
                description: "Terraform, CloudFormation, and infrastructure automation.",
                resources: ["Terraform Course", "CloudFormation Guide", "Infrastructure Automation"],
                estimated_time: "4 weeks",
                prerequisites: ["aws_basics"],
                category: "Core Skills",
                subtasks: [
                  { id: "terraform_basics", name: "Terraform Fundamentals", optional: false },
                  { id: "state_management", name: "State Management & Backends", optional: false },
                  { id: "modules", name: "Terraform Modules & Workspaces", optional: false },
                  { id: "cloudformation", name: "CloudFormation Templates", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "containerization",
                title: "Containers & Orchestration",
                description: "Docker, Kubernetes, and container orchestration platforms.",
                resources: ["Docker Mastery", "Kubernetes Course", "Container Security"],
                estimated_time: "5 weeks",
                prerequisites: ["infrastructure_code"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "docker", name: "Docker Containers & Images", optional: false },
                  { id: "docker_compose", name: "Docker Compose & Multi-container Apps", optional: false },
                  { id: "kubernetes_basics", name: "Kubernetes Basics (Pods, Deployments, Services)", optional: false },
                  { id: "k8s_storage", name: "Kubernetes Storage & ConfigMaps", optional: false }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "cloud_project",
                title: "Cloud Infrastructure Project",
                description: "Deploy a scalable application using cloud services and best practices.",
                resources: ["Cloud Architecture Patterns", "AWS Well-Architected", "Cloud Project Ideas"],
                estimated_time: "4 weeks",
                prerequisites: ["containerization"],
                category: "Projects",
                subtasks: [
                  { id: "architecture_design", name: "Cloud Architecture Design & Planning", optional: false },
                  { id: "infrastructure_setup", name: "Infrastructure Setup (VPC, Subnets, Security Groups)", optional: false },
                  { id: "app_deployment", name: "Application Deployment with Auto-Scaling", optional: false },
                  { id: "database_service", name: "Managed Database Service Integration", optional: false },
                  { id: "monitoring_alerts", name: "CloudWatch Monitoring & Alerting", optional: true }
                ]
              }
            ]
          }
        ]
      },
      intermediate: {
        domain: "Cloud Computing",
        total_estimated_time: "22 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "multi_cloud",
                title: "Multi-Cloud Architecture",
                description: "AWS, Azure, and GCP services comparison and multi-cloud strategies.",
                resources: ["Multi-Cloud Guide", "Azure Services", "GCP Fundamentals"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "azure_services", name: "Azure Core Services", optional: false },
                  { id: "gcp_services", name: "Google Cloud Platform Services", optional: false },
                  { id: "cloud_comparison", name: "Cloud Provider Comparison", optional: false },
                  { id: "multi_cloud_strategy", name: "Multi-Cloud Strategy Design", optional: true }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "advanced_networking",
                title: "Advanced Cloud Networking",
                description: "VPNs, Direct Connect, Transit Gateway, and hybrid architectures.",
                resources: ["Advanced Networking", "Hybrid Cloud", "Network Design"],
                estimated_time: "4 weeks",
                prerequisites: ["multi_cloud"],
                category: "Core Skills",
                subtasks: [
                  { id: "vpc_peering", name: "VPC Peering & Transit Gateway", optional: false },
                  { id: "direct_connect", name: "Direct Connect & VPN", optional: false },
                  { id: "load_balancing", name: "Advanced Load Balancing", optional: false },
                  { id: "cdn", name: "CDN & Edge Computing", optional: false }
                ]
              },
              {
                id: "kubernetes_advanced",
                title: "Advanced Kubernetes",
                description: "Helm, operators, service mesh, and production-grade clusters.",
                resources: ["Kubernetes Advanced", "Helm Charts", "Service Mesh"],
                estimated_time: "5 weeks",
                prerequisites: ["advanced_networking"],
                category: "Core Skills",
                subtasks: [
                  { id: "helm", name: "Helm Package Manager", optional: false },
                  { id: "operators", name: "Kubernetes Operators", optional: false },
                  { id: "service_mesh", name: "Service Mesh (Istio/Linkerd)", optional: false },
                  { id: "k8s_security", name: "Kubernetes Security Best Practices", optional: false }
                ]
              },
              {
                id: "serverless",
                title: "Serverless Architecture",
                description: "Lambda, API Gateway, serverless frameworks, and event-driven design.",
                resources: ["Serverless Framework", "AWS Lambda", "Event-Driven Architecture"],
                estimated_time: "3 weeks",
                prerequisites: ["kubernetes_advanced"],
                category: "Core Skills",
                subtasks: [
                  { id: "lambda", name: "AWS Lambda & Functions", optional: false },
                  { id: "api_gateway", name: "API Gateway & REST APIs", optional: false },
                  { id: "event_driven", name: "Event-Driven Architecture", optional: false },
                  { id: "serverless_framework", name: "Serverless Framework & SAM", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "cloud_security_advanced",
                title: "Advanced Cloud Security",
                description: "Cloud security posture management, compliance, and threat detection.",
                resources: ["Cloud Security", "Compliance Frameworks", "Security Automation"],
                estimated_time: "3 weeks",
                prerequisites: ["serverless"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "security_posture", name: "Cloud Security Posture Management", optional: false },
                  { id: "compliance", name: "Compliance & Governance (SOC2, ISO)", optional: false },
                  { id: "threat_detection", name: "Threat Detection & Response", optional: false }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "production_infrastructure",
                title: "Production-Grade Infrastructure",
                description: "Build a complete production infrastructure with HA and DR.",
                resources: ["Production Best Practices", "HA Architecture", "Disaster Recovery"],
                estimated_time: "3 weeks",
                prerequisites: ["cloud_security_advanced"],
                category: "Projects",
                subtasks: [
                  { id: "ha_architecture", name: "High Availability Architecture & Load Balancing", optional: false },
                  { id: "disaster_recovery", name: "Disaster Recovery & Backup Strategy", optional: false },
                  { id: "auto_scaling", name: "Auto-Scaling & Resource Optimization", optional: false },
                  { id: "monitoring_alerting", name: "Production Monitoring & Alerting Setup", optional: false },
                  { id: "multi_region", name: "Multi-Region Deployment & Failover", optional: true }
                ]
              }
            ]
          }
        ]
      },
      advanced: {
        domain: "Cloud Computing",
        total_estimated_time: "20 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "cloud_architecture",
                title: "Cloud Architecture Design",
                description: "Well-architected framework, design patterns, and architectural principles.",
                resources: ["AWS Well-Architected", "Architecture Patterns", "Design Principles"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "well_architected", name: "Well-Architected Framework Pillars", optional: false },
                  { id: "design_patterns", name: "Cloud Design Patterns", optional: false },
                  { id: "cost_optimization", name: "Cost Optimization Strategies", optional: false },
                  { id: "resilience", name: "Resilience & Fault Tolerance", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "platform_engineering",
                title: "Platform Engineering",
                description: "Build internal developer platforms and self-service infrastructure.",
                resources: ["Platform Engineering", "Internal Developer Platforms", "Self-Service"],
                estimated_time: "5 weeks",
                prerequisites: ["cloud_architecture"],
                category: "Core Skills",
                subtasks: [
                  { id: "developer_platform", name: "Internal Developer Platform Design", optional: false },
                  { id: "self_service", name: "Self-Service Infrastructure", optional: false },
                  { id: "developer_experience", name: "Developer Experience Optimization", optional: false },
                  { id: "platform_apis", name: "Platform APIs & Abstraction Layers", optional: false }
                ]
              },
              {
                id: "finops",
                title: "FinOps & Cloud Economics",
                description: "Cloud cost optimization, FinOps practices, and financial governance.",
                resources: ["FinOps Guide", "Cost Optimization", "Cloud Financial Management"],
                estimated_time: "3 weeks",
                prerequisites: ["platform_engineering"],
                category: "Core Skills",
                subtasks: [
                  { id: "cost_analysis", name: "Cost Analysis & Attribution", optional: false },
                  { id: "optimization_strategies", name: "Optimization Strategies", optional: false },
                  { id: "reserved_instances", name: "Reserved Instances & Savings Plans", optional: false },
                  { id: "finops_culture", name: "FinOps Culture & Governance", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "edge_computing",
                title: "Edge Computing & Distributed Systems",
                description: "Edge computing, IoT, and globally distributed architectures.",
                resources: ["Edge Computing", "Distributed Systems", "Global Architecture"],
                estimated_time: "4 weeks",
                prerequisites: ["finops"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "edge_architecture", name: "Edge Computing Architecture", optional: false },
                  { id: "iot_integration", name: "IoT & Edge Integration", optional: false },
                  { id: "global_distribution", name: "Global Distribution Strategies", optional: false }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "cloud_certifications",
                title: "Advanced Cloud Certifications",
                description: "Pursue AWS Solutions Architect Professional, Kubernetes CKA/CKAD.",
                resources: ["AWS Pro Cert", "CKA Preparation", "Advanced Certifications"],
                estimated_time: "4 weeks",
                prerequisites: ["edge_computing"],
                category: "Career Preparation",
                subtasks: [
                  { id: "aws_solutions_architect_pro", name: "AWS Solutions Architect Professional", optional: false },
                  { id: "cka_certification", name: "CKA (Certified Kubernetes Administrator)", optional: false },
                  { id: "ckad_certification", name: "CKAD (Certified Kubernetes Application Developer)", optional: false },
                  { id: "gcp_professional", name: "GCP Professional Cloud Architect", optional: false },
                  { id: "azure_solutions_architect", name: "Azure Solutions Architect Expert", optional: true }
                ]
              }
            ]
          }
        ]
      }
    },
    'artificial-intelligence': {
      beginner: {
        domain: "Artificial Intelligence",
        total_estimated_time: "30 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "ai_fundamentals",
                title: "AI & ML Fundamentals",
                description: "History of AI, types of AI, machine learning basics, and problem-solving approaches.",
                resources: ["AI for Everyone", "Machine Learning Course", "Introduction to AI"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "ai_history", name: "History & Evolution of AI", optional: false },
                  { id: "ai_types", name: "Types of AI (Narrow, General, Super)", optional: false },
                  { id: "ml_basics", name: "Machine Learning Basics & Types", optional: false },
                  { id: "problem_solving", name: "AI Problem-Solving Approaches", optional: false }
                ]
              },
              {
                id: "python_for_ai",
                title: "Python for AI/ML",
                description: "Python programming with NumPy, Pandas, and Matplotlib for data science.",
                resources: ["Python Data Science", "NumPy Tutorial", "Pandas Guide"],
                estimated_time: "5 weeks",
                prerequisites: ["ai_fundamentals"],
                category: "Foundations",
                subtasks: [
                  { id: "numpy", name: "NumPy for Numerical Computing", optional: false },
                  { id: "pandas", name: "Pandas for Data Manipulation", optional: false },
                  { id: "matplotlib", name: "Matplotlib & Seaborn for Visualization", optional: false },
                  { id: "jupyter", name: "Jupyter Notebooks & Data Analysis", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "supervised_learning",
                title: "Supervised Learning Algorithms",
                description: "Classification and regression algorithms, model evaluation, and selection.",
                resources: ["Scikit-learn Tutorial", "Supervised Learning Course", "ML Algorithms"],
                estimated_time: "6 weeks",
                prerequisites: ["python_for_ai"],
                category: "Core Skills",
                subtasks: [
                  { id: "regression", name: "Linear & Polynomial Regression", optional: false },
                  { id: "classification", name: "Classification Algorithms (Logistic Regression, SVM)", optional: false },
                  { id: "decision_trees", name: "Decision Trees & Random Forests", optional: false },
                  { id: "model_eval", name: "Model Evaluation & Metrics", optional: false }
                ]
              },
              {
                id: "unsupervised_learning",
                title: "Unsupervised Learning & Data Mining",
                description: "Clustering, dimensionality reduction, and association rule mining.",
                resources: ["Unsupervised Learning", "Clustering Algorithms", "PCA Tutorial"],
                estimated_time: "4 weeks",
                prerequisites: ["supervised_learning"],
                category: "Core Skills",
                subtasks: [
                  { id: "clustering", name: "Clustering Algorithms (K-Means, DBSCAN)", optional: false },
                  { id: "pca", name: "PCA & Dimensionality Reduction", optional: false },
                  { id: "association_rules", name: "Association Rule Mining", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "neural_networks",
                title: "Neural Networks & Deep Learning",
                description: "Fundamentals of neural networks, backpropagation, and deep learning.",
                resources: ["Deep Learning Course", "Neural Networks Basics", "TensorFlow Tutorial"],
                estimated_time: "7 weeks",
                prerequisites: ["unsupervised_learning"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "perceptron", name: "Perceptron & Neural Network Basics", optional: false },
                  { id: "backprop", name: "Backpropagation & Gradient Descent", optional: false },
                  { id: "cnns", name: "Convolutional Neural Networks (CNNs)", optional: false },
                  { id: "tensorflow", name: "TensorFlow/Keras for Deep Learning", optional: false }
                ]
              },
              {
                id: "nlp_basics",
                title: "Natural Language Processing",
                description: "Text processing, sentiment analysis, and language models.",
                resources: ["NLP Course", "spaCy Tutorial", "NLTK Guide"],
                estimated_time: "4 weeks",
                prerequisites: ["neural_networks"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "text_preprocessing", name: "Text Preprocessing & Tokenization", optional: false },
                  { id: "word_embeddings", name: "Word Embeddings (Word2Vec, GloVe)", optional: false },
                  { id: "sentiment_analysis", name: "Sentiment Analysis", optional: false },
                  { id: "rnns", name: "RNNs & LSTMs for NLP", optional: false }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "ai_project",
                title: "AI Application Project",
                description: "Build an end-to-end AI application solving a real-world problem.",
                resources: ["AI Project Ideas", "Model Deployment", "AI Ethics"],
                estimated_time: "4 weeks",
                prerequisites: ["nlp_basics"],
                category: "Projects",
                subtasks: [
                  { id: "project_scope", name: "Project Scope & Problem Definition", optional: false },
                  { id: "data_collection", name: "Data Collection & Preprocessing Pipeline", optional: false },
                  { id: "model_development", name: "Model Development & Training", optional: false },
                  { id: "api_integration", name: "API Development & Integration", optional: false },
                  { id: "ui_deployment", name: "User Interface & Deployment", optional: true }
                ]
              }
            ]
          }
        ]
      },
      intermediate: {
        domain: "Artificial Intelligence",
        total_estimated_time: "26 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "advanced_ml",
                title: "Advanced Machine Learning Techniques",
                description: "Ensemble methods, boosting, bagging, and advanced algorithms.",
                resources: ["Advanced ML Course", "Ensemble Methods", "Gradient Boosting"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "ensemble", name: "Ensemble Methods (Bagging, Boosting)", optional: false },
                  { id: "xgboost", name: "XGBoost & LightGBM", optional: false },
                  { id: "hyperparameter", name: "Hyperparameter Tuning & Optimization", optional: false },
                  { id: "feature_eng", name: "Advanced Feature Engineering", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "computer_vision",
                title: "Computer Vision",
                description: "Image processing, object detection, and image segmentation.",
                resources: ["Computer Vision Course", "OpenCV", "PyTorch Vision"],
                estimated_time: "6 weeks",
                prerequisites: ["advanced_ml"],
                category: "Core Skills",
                subtasks: [
                  { id: "image_processing", name: "Image Processing & OpenCV", optional: false },
                  { id: "object_detection", name: "Object Detection (YOLO, R-CNN)", optional: false },
                  { id: "segmentation", name: "Image Segmentation", optional: false },
                  { id: "transfer_learning", name: "Transfer Learning & Pre-trained Models", optional: false }
                ]
              },
              {
                id: "nlp_advanced",
                title: "Advanced NLP & Transformers",
                description: "Transformers, BERT, GPT, and modern NLP architectures.",
                resources: ["Transformers Course", "Hugging Face", "BERT Tutorial"],
                estimated_time: "5 weeks",
                prerequisites: ["computer_vision"],
                category: "Core Skills",
                subtasks: [
                  { id: "attention", name: "Attention Mechanisms", optional: false },
                  { id: "transformers", name: "Transformer Architecture", optional: false },
                  { id: "bert", name: "BERT & Fine-tuning", optional: false },
                  { id: "gpt", name: "GPT & Large Language Models", optional: false }
                ]
              },
              {
                id: "reinforcement_learning",
                title: "Reinforcement Learning",
                description: "Q-learning, policy gradients, and RL applications.",
                resources: ["RL Course", "OpenAI Gym", "Deep RL"],
                estimated_time: "5 weeks",
                prerequisites: ["nlp_advanced"],
                category: "Core Skills",
                subtasks: [
                  { id: "rl_fundamentals", name: "RL Fundamentals & Markov Decision Processes", optional: false },
                  { id: "q_learning", name: "Q-Learning & Deep Q-Networks (DQN)", optional: false },
                  { id: "policy_gradients", name: "Policy Gradients & Actor-Critic", optional: false },
                  { id: "openai_gym", name: "OpenAI Gym & RL Environments", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "model_deployment",
                title: "ML Model Deployment",
                description: "Deploy ML models to production with APIs and serving infrastructure.",
                resources: ["ML Deployment", "TensorFlow Serving", "FastAPI"],
                estimated_time: "3 weeks",
                prerequisites: ["reinforcement_learning"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "model_serving", name: "Model Serving (TensorFlow Serving, TorchServe)", optional: false },
                  { id: "api_development", name: "RESTful APIs for ML (FastAPI)", optional: false },
                  { id: "containerization", name: "Containerization & Docker for ML", optional: false }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "ml_system",
                title: "Production ML System",
                description: "Build and deploy a complete machine learning system.",
                resources: ["ML System Design", "End-to-End ML", "Production ML"],
                estimated_time: "3 weeks",
                prerequisites: ["model_deployment"],
                category: "Projects",
                subtasks: [
                  { id: "data_pipeline", name: "End-to-End Data Pipeline & Feature Engineering", optional: false },
                  { id: "model_training", name: "Model Training & Hyperparameter Optimization", optional: false },
                  { id: "model_serving", name: "Model Serving & API Development", optional: false },
                  { id: "monitoring_system", name: "Model Monitoring & Performance Tracking", optional: false },
                  { id: "mlops_automation", name: "MLOps Automation & CI/CD for ML", optional: true }
                ]
              }
            ]
          }
        ]
      },
      advanced: {
        domain: "Artificial Intelligence",
        total_estimated_time: "24 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "ai_research",
                title: "AI Research & Advanced Topics",
                description: "Research methodologies, paper reading, and cutting-edge AI topics.",
                resources: ["Research Methods", "Paper Reading", "AI Research"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "research_methods", name: "Research Methodologies in AI", optional: false },
                  { id: "paper_reading", name: "Reading & Implementing Research Papers", optional: false },
                  { id: "experiment_design", name: "Experiment Design & Reproducibility", optional: false },
                  { id: "sota", name: "State-of-the-Art (SOTA) Techniques", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "generative_ai",
                title: "Generative AI & GANs",
                description: "GANs, VAEs, diffusion models, and generative modeling.",
                resources: ["GAN Course", "Diffusion Models", "Generative AI"],
                estimated_time: "6 weeks",
                prerequisites: ["ai_research"],
                category: "Core Skills",
                subtasks: [
                  { id: "gans", name: "Generative Adversarial Networks (GANs)", optional: false },
                  { id: "vaes", name: "Variational Autoencoders (VAEs)", optional: false },
                  { id: "diffusion", name: "Diffusion Models (Stable Diffusion)", optional: false },
                  { id: "generative_apps", name: "Generative AI Applications", optional: false }
                ]
              },
              {
                id: "llm_engineering",
                title: "Large Language Model Engineering",
                description: "Fine-tuning LLMs, prompt engineering, and LLM applications.",
                resources: ["LLM Course", "Prompt Engineering", "GPT Fine-tuning"],
                estimated_time: "5 weeks",
                prerequisites: ["generative_ai"],
                category: "Core Skills",
                subtasks: [
                  { id: "llm_architecture", name: "LLM Architecture & Scaling Laws", optional: false },
                  { id: "fine_tuning", name: "Fine-tuning & PEFT (LoRA, QLoRA)", optional: false },
                  { id: "prompt_engineering", name: "Advanced Prompt Engineering", optional: false },
                  { id: "rag", name: "RAG (Retrieval-Augmented Generation)", optional: false }
                ]
              },
              {
                id: "mlops_advanced",
                title: "Advanced MLOps & ML Systems",
                description: "ML pipelines, monitoring, versioning, and production best practices.",
                resources: ["MLOps Best Practices", "ML Monitoring", "Feature Stores"],
                estimated_time: "4 weeks",
                prerequisites: ["llm_engineering"],
                category: "Core Skills",
                subtasks: [
                  { id: "ml_pipelines", name: "ML Pipelines (Kubeflow, MLflow)", optional: false },
                  { id: "model_monitoring", name: "Model Monitoring & Drift Detection", optional: false },
                  { id: "feature_stores", name: "Feature Stores & Data Versioning", optional: false },
                  { id: "ab_testing", name: "A/B Testing for ML Models", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "ai_ethics",
                title: "AI Ethics & Responsible AI",
                description: "Bias, fairness, interpretability, and responsible AI practices.",
                resources: ["AI Ethics Course", "Responsible AI", "Fairness in ML"],
                estimated_time: "2 weeks",
                prerequisites: ["mlops_advanced"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "bias_fairness", name: "Bias & Fairness in AI", optional: false },
                  { id: "interpretability", name: "Model Interpretability & Explainability", optional: false },
                  { id: "responsible_ai", name: "Responsible AI Practices", optional: false }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "ai_leadership",
                title: "AI Leadership & Strategy",
                description: "Leading AI teams, building AI strategy, and AI product management.",
                resources: ["AI Leadership", "AI Strategy", "AI Product Management"],
                estimated_time: "3 weeks",
                prerequisites: ["ai_ethics"],
                category: "Career Preparation",
                subtasks: [
                  { id: "ai_team_leadership", name: "Leading AI & ML Engineering Teams", optional: false },
                  { id: "ai_strategy", name: "AI Strategy & Roadmap Development", optional: false },
                  { id: "ai_product_management", name: "AI Product Management & Vision", optional: false },
                  { id: "stakeholder_communication", name: "Stakeholder Communication & Executive Buy-In", optional: false },
                  { id: "ai_transformation", name: "AI Transformation & Organizational Change", optional: true }
                ]
              }
            ]
          }
        ]
      }
    },
    'devops': {
      beginner: {
        domain: "DevOps",
        total_estimated_time: "28 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "devops_culture",
                title: "DevOps Culture & Principles",
                description: "Understanding DevOps philosophy, culture, and collaboration practices.",
                resources: ["DevOps Handbook", "DevOps Culture Guide", "Agile & DevOps"],
                estimated_time: "2 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "devops_principles", name: "DevOps Principles & Philosophy", optional: false },
                  { id: "agile_practices", name: "Agile & Lean Practices", optional: false },
                  { id: "collaboration", name: "Dev & Ops Collaboration", optional: false }
                ]
              },
              {
                id: "linux_devops",
                title: "Linux & Command Line Mastery",
                description: "Advanced Linux administration, shell scripting, and automation.",
                resources: ["Linux Administration", "Bash Scripting", "System Performance"],
                estimated_time: "4 weeks",
                prerequisites: ["devops_culture"],
                category: "Foundations",
                subtasks: [
                  { id: "linux_admin", name: "Linux System Administration", optional: false },
                  { id: "bash_scripting", name: "Bash Scripting & Automation", optional: false },
                  { id: "sys_performance", name: "System Performance & Monitoring", optional: false },
                  { id: "networking", name: "Networking Basics", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "version_control_advanced",
                title: "Advanced Version Control",
                description: "Git workflows, branching strategies, and collaborative development.",
                resources: ["Git Advanced", "GitHub Actions", "GitLab CI"],
                estimated_time: "3 weeks",
                prerequisites: ["linux_devops"],
                category: "Core Skills",
                subtasks: [
                  { id: "git_workflows", name: "Git Workflows (GitFlow, Trunk-Based)", optional: false },
                  { id: "branching", name: "Branching Strategies", optional: false },
                  { id: "code_review", name: "Code Review & Pull Requests", optional: false }
                ]
              },
              {
                id: "ci_cd_pipelines",
                title: "CI/CD Pipeline Development",
                description: "Build automated testing, integration, and deployment pipelines.",
                resources: ["Jenkins Mastery", "GitHub Actions", "CI/CD Best Practices"],
                estimated_time: "6 weeks",
                prerequisites: ["version_control_advanced"],
                category: "Core Skills",
                subtasks: [
                  { id: "jenkins", name: "Jenkins Pipeline Development", optional: false },
                  { id: "github_actions", name: "GitHub Actions CI/CD", optional: false },
                  { id: "automated_testing", name: "Automated Testing in Pipelines", optional: false },
                  { id: "deployment_strategies", name: "Deployment Strategies (Blue-Green, Canary)", optional: false }
                ]
              },
              {
                id: "infrastructure_automation",
                title: "Infrastructure Automation",
                description: "Ansible, Terraform, and infrastructure provisioning automation.",
                resources: ["Ansible Playbooks", "Terraform Infrastructure", "Configuration Management"],
                estimated_time: "5 weeks",
                prerequisites: ["ci_cd_pipelines"],
                category: "Core Skills",
                subtasks: [
                  { id: "ansible", name: "Ansible Configuration Management", optional: false },
                  { id: "terraform", name: "Terraform Infrastructure as Code", optional: false },
                  { id: "state_mgmt", name: "State Management & Remote Backends", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "container_orchestration",
                title: "Container Orchestration",
                description: "Docker, Kubernetes, and container management at scale.",
                resources: ["Kubernetes Administration", "Docker Swarm", "Container Security"],
                estimated_time: "6 weeks",
                prerequisites: ["infrastructure_automation"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "docker_adv", name: "Advanced Docker & Multi-stage Builds", optional: false },
                  { id: "k8s_admin", name: "Kubernetes Administration", optional: false },
                  { id: "k8s_deployments", name: "Kubernetes Deployments & Services", optional: false },
                  { id: "helm_charts", name: "Helm Charts & Package Management", optional: false }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "devops_project",
                title: "End-to-End DevOps Pipeline",
                description: "Implement a complete DevOps pipeline for a real application.",
                resources: ["DevOps Project Ideas", "Pipeline Templates", "Best Practices"],
                estimated_time: "4 weeks",
                prerequisites: ["container_orchestration"],
                category: "Projects",
                subtasks: [
                  { id: "pipeline_design", name: "CI/CD Pipeline Design & Architecture", optional: false },
                  { id: "source_control", name: "Source Control & Branching Strategy", optional: false },
                  { id: "automated_testing", name: "Automated Testing & Quality Gates", optional: false },
                  { id: "container_deployment", name: "Containerized Deployment to Kubernetes", optional: false },
                  { id: "monitoring_logging", name: "Monitoring, Logging & Alerting Setup", optional: true }
                ]
              }
            ]
          }
        ]
      },
      intermediate: {
        domain: "DevOps",
        total_estimated_time: "24 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "advanced_cicd",
                title: "Advanced CI/CD Patterns",
                description: "Advanced pipeline patterns, testing strategies, and deployment automation.",
                resources: ["Advanced CI/CD", "Testing Strategies", "Pipeline Optimization"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "pipeline_optimization", name: "Pipeline Optimization & Caching", optional: false },
                  { id: "test_automation", name: "Advanced Test Automation", optional: false },
                  { id: "artifact_mgmt", name: "Artifact Management & Registries", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "observability",
                title: "Monitoring & Observability",
                description: "Prometheus, Grafana, ELK stack, and distributed tracing.",
                resources: ["Prometheus & Grafana", "ELK Stack", "Distributed Tracing"],
                estimated_time: "5 weeks",
                prerequisites: ["advanced_cicd"],
                category: "Core Skills",
                subtasks: [
                  { id: "prometheus", name: "Prometheus Monitoring & Alerting", optional: false },
                  { id: "grafana", name: "Grafana Dashboards & Visualization", optional: false },
                  { id: "elk", name: "ELK Stack (Elasticsearch, Logstash, Kibana)", optional: false },
                  { id: "tracing", name: "Distributed Tracing (Jaeger, Zipkin)", optional: false }
                ]
              },
              {
                id: "security_devops",
                title: "DevSecOps & Security Automation",
                description: "Security scanning, vulnerability management, and compliance automation.",
                resources: ["DevSecOps", "Security Scanning", "Compliance Automation"],
                estimated_time: "4 weeks",
                prerequisites: ["observability"],
                category: "Core Skills",
                subtasks: [
                  { id: "sec_scanning", name: "Security Scanning (SAST, DAST)", optional: false },
                  { id: "vuln_mgmt", name: "Vulnerability Management", optional: false },
                  { id: "secrets_mgmt", name: "Secrets Management (Vault)", optional: false },
                  { id: "compliance", name: "Compliance as Code", optional: false }
                ]
              },
              {
                id: "gitops",
                title: "GitOps & Declarative Deployments",
                description: "GitOps workflows, ArgoCD, and Flux for continuous delivery.",
                resources: ["GitOps Guide", "ArgoCD", "Flux CD"],
                estimated_time: "3 weeks",
                prerequisites: ["security_devops"],
                category: "Core Skills",
                subtasks: [
                  { id: "gitops_principles", name: "GitOps Principles & Workflows", optional: false },
                  { id: "argocd", name: "ArgoCD for Continuous Delivery", optional: false },
                  { id: "progressive_delivery", name: "Progressive Delivery Strategies", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "chaos_engineering",
                title: "Chaos Engineering & Resilience",
                description: "Chaos testing, failure injection, and building resilient systems.",
                resources: ["Chaos Engineering", "Resilience Testing", "Fault Injection"],
                estimated_time: "3 weeks",
                prerequisites: ["gitops"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "chaos_fundamentals", name: "Chaos Engineering Fundamentals", optional: false },
                  { id: "chaos_tools", name: "Chaos Tools (Chaos Mesh, Litmus)", optional: false },
                  { id: "resilience_testing", name: "Resilience Testing & Game Days", optional: false }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "production_devops",
                title: "Production-Grade DevOps Platform",
                description: "Build a complete production DevOps platform with observability.",
                resources: ["Platform Engineering", "Production Best Practices", "SRE Principles"],
                estimated_time: "5 weeks",
                prerequisites: ["chaos_engineering"],
                category: "Projects",
                subtasks: [
                  { id: "cicd_platform", name: "Enterprise CI/CD Platform Setup", optional: false },
                  { id: "observability_stack", name: "Complete Observability Stack (Metrics, Logs, Traces)", optional: false },
                  { id: "infrastructure_automation", name: "Infrastructure as Code & Automation", optional: false },
                  { id: "sre_practices", name: "SRE Practices (SLOs, Error Budgets, Runbooks)", optional: false },
                  { id: "self_service_platform", name: "Self-Service Developer Platform", optional: true }
                ]
              }
            ]
          }
        ]
      },
      advanced: {
        domain: "DevOps",
        total_estimated_time: "20 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "sre_practices",
                title: "Site Reliability Engineering (SRE)",
                description: "SRE principles, SLOs, error budgets, and reliability engineering.",
                resources: ["SRE Book", "SLO Design", "Error Budgets"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "sre_principles", name: "SRE Principles & Practices", optional: false },
                  { id: "slos_slis", name: "SLOs, SLIs, & SLAs", optional: false },
                  { id: "error_budgets", name: "Error Budgets & Reliability Targets", optional: false },
                  { id: "on_call", name: "On-Call Management & Incident Response", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "platform_engineering_devops",
                title: "Platform Engineering",
                description: "Build internal developer platforms and self-service infrastructure.",
                resources: ["Platform Engineering", "Internal Platforms", "Developer Experience"],
                estimated_time: "5 weeks",
                prerequisites: ["sre_practices"],
                category: "Core Skills",
                subtasks: [
                  { id: "platform_design", name: "Platform Architecture Design", optional: false },
                  { id: "self_service", name: "Self-Service Capabilities", optional: false },
                  { id: "dev_portal", name: "Developer Portal & Documentation", optional: false },
                  { id: "golden_paths", name: "Golden Paths & Standards", optional: false }
                ]
              },
              {
                id: "cost_optimization_devops",
                title: "Cost Optimization & FinOps",
                description: "Infrastructure cost optimization and FinOps practices.",
                resources: ["FinOps for Engineers", "Cost Optimization", "Resource Management"],
                estimated_time: "3 weeks",
                prerequisites: ["platform_engineering_devops"],
                category: "Core Skills",
                subtasks: [
                  { id: "cost_monitoring", name: "Cost Monitoring & Attribution", optional: false },
                  { id: "resource_optimization", name: "Resource Optimization Strategies", optional: false },
                  { id: "autoscaling", name: "Advanced Autoscaling", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "multi_cloud_devops",
                title: "Multi-Cloud & Hybrid Strategies",
                description: "Multi-cloud deployments, cloud abstraction, and portability.",
                resources: ["Multi-Cloud Strategies", "Cloud Abstraction", "Hybrid Cloud"],
                estimated_time: "4 weeks",
                prerequisites: ["cost_optimization_devops"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "multi_cloud_architecture", name: "Multi-Cloud Architecture Patterns", optional: false },
                  { id: "cloud_abstraction", name: "Cloud Abstraction Layers", optional: false },
                  { id: "data_portability", name: "Data & Workload Portability", optional: false }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "devops_leadership",
                title: "DevOps Leadership & Strategy",
                description: "Leading DevOps teams, transformation, and building culture.",
                resources: ["DevOps Leadership", "Organizational Change", "Team Building"],
                estimated_time: "4 weeks",
                prerequisites: ["multi_cloud_devops"],
                category: "Career Preparation",
                subtasks: [
                  { id: "team_leadership", name: "Leading DevOps & Platform Engineering Teams", optional: false },
                  { id: "devops_transformation", name: "DevOps Transformation & Cultural Change", optional: false },
                  { id: "devops_strategy", name: "DevOps Strategy & Roadmap Planning", optional: false },
                  { id: "metrics_kpis", name: "DevOps Metrics & KPIs (DORA Metrics)", optional: false },
                  { id: "executive_communication", name: "Executive Communication & Business Value", optional: true }
                ]
              }
            ]
          }
        ]
      }
    },
    'blockchain': {
      beginner: {
        domain: "Blockchain Development",
        total_estimated_time: "30 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "blockchain_fundamentals",
                title: "Blockchain Technology Fundamentals",
                description: "Understand blockchain concepts, cryptocurrencies, and decentralized systems.",
                resources: ["Blockchain Basics", "Bitcoin Whitepaper", "Cryptocurrency Guide"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "blockchain_basics", name: "Blockchain Basics & Architecture", optional: false },
                  { id: "consensus", name: "Consensus Mechanisms (PoW, PoS)", optional: false },
                  { id: "crypto_basics", name: "Cryptocurrency Fundamentals", optional: false },
                  { id: "distributed_systems", name: "Distributed Systems Concepts", optional: false }
                ]
              },
              {
                id: "solidity_basics",
                title: "Solidity Programming Basics",
                description: "Learn Solidity language for Ethereum smart contract development.",
                resources: ["Solidity Documentation", "Smart Contract Tutorial", "Ethereum Guide"],
                estimated_time: "6 weeks",
                prerequisites: ["blockchain_fundamentals"],
                category: "Foundations",
                subtasks: [
                  { id: "solidity_syntax", name: "Solidity Syntax & Data Types", optional: false },
                  { id: "functions_modifiers", name: "Functions, Modifiers, & Events", optional: false },
                  { id: "contracts_inheritance", name: "Contracts & Inheritance", optional: false },
                  { id: "storage_memory", name: "Storage, Memory, & Calldata", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "smart_contracts",
                title: "Smart Contract Development",
                description: "Build, test, and deploy smart contracts on Ethereum.",
                resources: ["Smart Contract Patterns", "Testing Framework", "Contract Security"],
                estimated_time: "6 weeks",
                prerequisites: ["solidity_basics"],
                category: "Core Skills",
                subtasks: [
                  { id: "contract_patterns", name: "Smart Contract Design Patterns", optional: false },
                  { id: "testing", name: "Testing with Hardhat/Truffle", optional: false },
                  { id: "deployment", name: "Deployment to Test Networks", optional: false },
                  { id: "gas_optimization", name: "Gas Optimization Techniques", optional: false }
                ]
              },
              {
                id: "web3_integration",
                title: "Web3 & DApp Development",
                description: "Build decentralized applications with Web3 integration.",
                resources: ["Web3.js Guide", "React DApp Tutorial", "MetaMask Integration"],
                estimated_time: "5 weeks",
                prerequisites: ["smart_contracts"],
                category: "Core Skills",
                subtasks: [
                  { id: "web3js", name: "Web3.js & ethers.js", optional: false },
                  { id: "wallet_integration", name: "Wallet Integration (MetaMask)", optional: false },
                  { id: "frontend_integration", name: "Frontend Integration with React", optional: false },
                  { id: "ipfs", name: "IPFS for Decentralized Storage", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "defi_protocols",
                title: "DeFi Protocols & Standards",
                description: "Understand and implement DeFi protocols, tokens, and standards.",
                resources: ["DeFi Protocol Guide", "ERC Standards", "Liquidity Pools"],
                estimated_time: "5 weeks",
                prerequisites: ["web3_integration"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "erc_standards", name: "ERC-20, ERC-721, ERC-1155 Tokens", optional: false },
                  { id: "defi_protocols", name: "DeFi Protocols (DEX, Lending, Staking)", optional: false },
                  { id: "liquidity", name: "Liquidity Pools & AMMs", optional: false },
                  { id: "oracles", name: "Oracles & Price Feeds (Chainlink)", optional: false }
                ]
              },
              {
                id: "blockchain_security",
                title: "Blockchain Security & Auditing",
                description: "Smart contract security, common vulnerabilities, and audit practices.",
                resources: ["Smart Contract Security", "Audit Checklist", "Security Tools"],
                estimated_time: "4 weeks",
                prerequisites: ["defi_protocols"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "vulnerabilities", name: "Common Vulnerabilities (Reentrancy, etc.)", optional: false },
                  { id: "security_tools", name: "Security Tools (Slither, Mythril)", optional: false },
                  { id: "audit_process", name: "Smart Contract Audit Process", optional: false }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "blockchain_project",
                title: "Complete Blockchain Project",
                description: "Build a full DApp with smart contracts and frontend integration.",
                resources: ["DApp Project Ideas", "Deployment Guide", "User Experience"],
                estimated_time: "4 weeks",
                prerequisites: ["blockchain_security"],
                category: "Projects",
                subtasks: [
                  { id: "smart_contract_dev", name: "Smart Contract Development & Testing", optional: false },
                  { id: "contract_deployment", name: "Contract Deployment to Testnet", optional: false },
                  { id: "web3_integration", name: "Web3.js/Ethers.js Frontend Integration", optional: false },
                  { id: "wallet_connection", name: "Wallet Connection (MetaMask) Setup", optional: false },
                  { id: "mainnet_deployment", name: "Mainnet Deployment & Gas Optimization", optional: true }
                ]
              }
            ]
          }
        ]
      },
      intermediate: {
        domain: "Blockchain Development",
        total_estimated_time: "26 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "advanced_solidity",
                title: "Advanced Solidity & EVM",
                description: "Deep dive into Solidity, EVM internals, and assembly.",
                resources: ["Advanced Solidity", "EVM Deep Dive", "Yul Assembly"],
                estimated_time: "5 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "evm_internals", name: "EVM Internals & Opcodes", optional: false },
                  { id: "assembly", name: "Solidity Assembly (Yul)", optional: false },
                  { id: "advanced_patterns", name: "Advanced Contract Patterns", optional: false },
                  { id: "upgradeable", name: "Upgradeable Contracts (Proxy Patterns)", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "layer2_solutions",
                title: "Layer 2 Solutions & Scaling",
                description: "Optimistic rollups, ZK-rollups, and layer 2 development.",
                resources: ["Layer 2 Guide", "Optimism", "Arbitrum", "zkSync"],
                estimated_time: "5 weeks",
                prerequisites: ["advanced_solidity"],
                category: "Core Skills",
                subtasks: [
                  { id: "layer2_fundamentals", name: "Layer 2 Fundamentals & Types", optional: false },
                  { id: "optimistic_rollups", name: "Optimistic Rollups (Optimism, Arbitrum)", optional: false },
                  { id: "zk_rollups", name: "ZK-Rollups & Zero-Knowledge Proofs", optional: false },
                  { id: "bridge_development", name: "Bridge Development & Cross-chain", optional: false }
                ]
              },
              {
                id: "defi_advanced",
                title: "Advanced DeFi Development",
                description: "Build complex DeFi protocols, yield farming, and flash loans.",
                resources: ["Advanced DeFi", "Flash Loans", "Yield Strategies"],
                estimated_time: "5 weeks",
                prerequisites: ["layer2_solutions"],
                category: "Core Skills",
                subtasks: [
                  { id: "flash_loans", name: "Flash Loans Implementation", optional: false },
                  { id: "yield_farming", name: "Yield Farming & Liquidity Mining", optional: false },
                  { id: "dao_governance", name: "DAO & Governance Mechanisms", optional: false },
                  { id: "derivatives", name: "Derivatives & Options Protocols", optional: false }
                ]
              },
              {
                id: "nft_advanced",
                title: "Advanced NFT Development",
                description: "NFT marketplaces, dynamic NFTs, and on-chain metadata.",
                resources: ["NFT Advanced", "Marketplace Development", "Dynamic NFTs"],
                estimated_time: "4 weeks",
                prerequisites: ["defi_advanced"],
                category: "Core Skills",
                subtasks: [
                  { id: "nft_marketplace", name: "NFT Marketplace Development", optional: false },
                  { id: "dynamic_nfts", name: "Dynamic & Evolving NFTs", optional: false },
                  { id: "nft_royalties", name: "NFT Royalties & Standards", optional: false },
                  { id: "fractional_nfts", name: "Fractional NFTs", optional: true }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "mev_frontrunning",
                title: "MEV & Frontrunning Protection",
                description: "Maximal Extractable Value, flashbots, and protection mechanisms.",
                resources: ["MEV Guide", "Flashbots", "Frontrunning Protection"],
                estimated_time: "3 weeks",
                prerequisites: ["nft_advanced"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "mev_concepts", name: "MEV Concepts & Strategies", optional: false },
                  { id: "flashbots", name: "Flashbots & Private Transactions", optional: false },
                  { id: "protection", name: "Frontrunning Protection Techniques", optional: false }
                ]
              }
            ]
          },
          {
            category: "Projects",
            milestones: [
              {
                id: "defi_protocol",
                title: "Complex DeFi Protocol",
                description: "Build a production-ready DeFi protocol with multiple features.",
                resources: ["Protocol Development", "Security Best Practices", "Tokenomics"],
                estimated_time: "4 weeks",
                prerequisites: ["mev_frontrunning"],
                category: "Projects",
                subtasks: [
                  { id: "protocol_design", name: "DeFi Protocol Architecture & Design", optional: false },
                  { id: "smart_contracts", name: "Multi-Contract Smart Contract Development", optional: false },
                  { id: "tokenomics_design", name: "Tokenomics & Economic Model Design", optional: false },
                  { id: "security_audit", name: "Security Audit & Testing", optional: false },
                  { id: "frontend_integration", name: "Web3 Frontend Integration & UX", optional: true }
                ]
              }
            ]
          }
        ]
      },
      advanced: {
        domain: "Blockchain Development",
        total_estimated_time: "24 weeks",
        stages: [
          {
            category: "Foundations",
            milestones: [
              {
                id: "blockchain_architecture",
                title: "Blockchain Architecture Design",
                description: "Design custom blockchains, consensus mechanisms, and network architecture.",
                resources: ["Blockchain Architecture", "Consensus Design", "Network Protocols"],
                estimated_time: "5 weeks",
                prerequisites: [],
                category: "Foundations",
                subtasks: [
                  { id: "custom_blockchain", name: "Custom Blockchain Development", optional: false },
                  { id: "consensus_design", name: "Consensus Mechanism Design", optional: false },
                  { id: "network_architecture", name: "P2P Network Architecture", optional: false },
                  { id: "blockchain_optimization", name: "Blockchain Performance Optimization", optional: false }
                ]
              }
            ]
          },
          {
            category: "Core Skills",
            milestones: [
              {
                id: "cross_chain",
                title: "Cross-Chain & Interoperability",
                description: "Build cross-chain bridges, interoperability protocols, and multi-chain apps.",
                resources: ["Cross-Chain Development", "Interoperability", "Bridge Protocols"],
                estimated_time: "6 weeks",
                prerequisites: ["blockchain_architecture"],
                category: "Core Skills",
                subtasks: [
                  { id: "bridge_protocols", name: "Bridge Protocol Development", optional: false },
                  { id: "interoperability", name: "Interoperability Standards (IBC, XCMP)", optional: false },
                  { id: "multi_chain", name: "Multi-Chain Application Development", optional: false },
                  { id: "atomic_swaps", name: "Atomic Swaps & Cross-Chain DEX", optional: false }
                ]
              },
              {
                id: "zk_tech",
                title: "Zero-Knowledge Technology",
                description: "ZK-SNARKs, ZK-STARKs, and privacy-preserving applications.",
                resources: ["ZK Technology", "Privacy Protocols", "ZK Development"],
                estimated_time: "5 weeks",
                prerequisites: ["cross_chain"],
                category: "Core Skills",
                subtasks: [
                  { id: "zk_proofs", name: "Zero-Knowledge Proofs Fundamentals", optional: false },
                  { id: "zk_snarks", name: "ZK-SNARKs Implementation", optional: false },
                  { id: "privacy_protocols", name: "Privacy-Preserving Protocols", optional: false },
                  { id: "zk_applications", name: "ZK Applications Development", optional: false }
                ]
              },
              {
                id: "tokenomics_design",
                title: "Tokenomics & Economic Design",
                description: "Design token economies, incentive mechanisms, and economic models.",
                resources: ["Tokenomics Design", "Mechanism Design", "Economic Modeling"],
                estimated_time: "3 weeks",
                prerequisites: ["zk_tech"],
                category: "Core Skills",
                subtasks: [
                  { id: "token_design", name: "Token Economic Design", optional: false },
                  { id: "incentive_mechanisms", name: "Incentive Mechanism Design", optional: false },
                  { id: "game_theory", name: "Game Theory in Blockchain", optional: false },
                  { id: "economic_modeling", name: "Economic Modeling & Simulation", optional: false }
                ]
              }
            ]
          },
          {
            category: "Advanced Topics",
            milestones: [
              {
                id: "security_research",
                title: "Security Research & Formal Verification",
                description: "Advanced security research, formal verification, and audit techniques.",
                resources: ["Formal Verification", "Security Research", "Auditing Mastery"],
                estimated_time: "3 weeks",
                prerequisites: ["tokenomics_design"],
                category: "Advanced Topics",
                subtasks: [
                  { id: "formal_verification", name: "Formal Verification Tools", optional: false },
                  { id: "security_research", name: "Security Vulnerability Research", optional: false },
                  { id: "advanced_auditing", name: "Advanced Smart Contract Auditing", optional: false }
                ]
              }
            ]
          },
          {
            category: "Career Preparation",
            milestones: [
              {
                id: "blockchain_leadership",
                title: "Blockchain Leadership & Strategy",
                description: "Leading blockchain projects, protocol design, and ecosystem building.",
                resources: ["Blockchain Leadership", "Protocol Design", "Ecosystem Development"],
                estimated_time: "2 weeks",
                prerequisites: ["security_research"],
                category: "Career Preparation",
                subtasks: [
                  { id: "protocol_leadership", name: "Protocol Design & Technical Leadership", optional: false },
                  { id: "ecosystem_building", name: "Ecosystem Building & Community Development", optional: false },
                  { id: "blockchain_strategy", name: "Blockchain Strategy & Architecture Decisions", optional: false },
                  { id: "web3_product", name: "Web3 Product Strategy & Market Positioning", optional: false },
                  { id: "regulatory_compliance", name: "Regulatory Compliance & Legal Strategy", optional: true }
                ]
              }
            ]
          }
        ]
      }
    }
  };

  // Generate roadmap based on inputs
  const roadmapTemplate = roadmaps[careerDomain.toLowerCase().replace(/\s+/g, '-')] || roadmaps['web-development'];
  const skillLevelData = roadmapTemplate[skillLevel] || roadmapTemplate.beginner;

  // Calculate ROI data
  const timeInWeeks = parseInt(skillLevelData.total_estimated_time.replace(' weeks', ''));
  const roiData = calculateROI(careerDomain.toLowerCase().replace(/\s+/g, '-'), skillLevel, timeInWeeks);

  // Add ROI data to the response
  return {
    ...skillLevelData,
    roiCalculator: roiData
  };
}

module.exports = roadmapController;