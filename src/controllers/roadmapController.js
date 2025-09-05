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
                category: "Foundations"
              },
              {
                id: "javascript_basics",
                title: "JavaScript Fundamentals",
                description: "Master JavaScript basics, DOM manipulation, and event handling.",
                resources: ["JavaScript.info", "NPTEL JavaScript", "Codecademy JavaScript"],
                estimated_time: "4 weeks",
                prerequisites: ["html_css"],
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "version_control",
                title: "Git & Version Control",
                description: "Learn Git for tracking changes and collaborating on projects.",
                resources: ["Git Handbook", "NPTEL Software Engineering", "Atlassian Git Tutorials"],
                estimated_time: "2 weeks",
                prerequisites: [],
                category: "Core Skills"
              },
              {
                id: "frontend_framework",
                title: "Frontend Framework (React)",
                description: "Build interactive user interfaces using React.js.",
                resources: ["React Official Tutorial", "Scrimba React Course", "NPTEL Web Development"],
                estimated_time: "5 weeks",
                prerequisites: ["javascript_basics"],
                category: "Core Skills"
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
                category: "Advanced Topics"
              },
              {
                id: "database_integration",
                title: "Database Integration",
                description: "Connect your applications to databases using MongoDB or SQL.",
                resources: ["MongoDB University", "SQL Tutorial", "Database Design Course"],
                estimated_time: "3 weeks",
                prerequisites: ["backend_basics"],
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Career Preparation"
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
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "api_development",
                title: "RESTful API Development",
                description: "Build robust APIs with proper authentication and validation.",
                resources: ["REST API Design", "API Security Best Practices", "Postman Learning"],
                estimated_time: "4 weeks",
                prerequisites: ["advanced_js"],
                category: "Core Skills"
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
                category: "Advanced Topics"
              },
              {
                id: "performance_optimization",
                title: "Performance Optimization",
                description: "Optimize web applications for speed and efficiency.",
                resources: ["Web Performance Optimization", "Lighthouse Guide", "Performance Monitoring"],
                estimated_time: "2 weeks",
                prerequisites: ["testing"],
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Career Preparation"
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
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "microservices",
                title: "Microservices Architecture",
                description: "Design and implement scalable microservices with Node.js.",
                resources: ["Microservices Patterns", "Docker & Kubernetes", "API Gateway"],
                estimated_time: "4 weeks",
                prerequisites: ["modern_js"],
                category: "Core Skills"
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
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Foundations"
              },
              {
                id: "python_basics",
                title: "Python Programming",
                description: "Learn Python basics, data structures, and libraries.",
                resources: ["Python for Everybody (Coursera)", "NPTEL Python", "Automate the Boring Stuff"],
                estimated_time: "4 weeks",
                prerequisites: [],
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "data_visualization",
                title: "Data Visualization",
                description: "Create compelling visualizations using Matplotlib, Seaborn, and Plotly.",
                resources: ["Matplotlib Tutorial", "Seaborn Gallery", "Data Visualization Course"],
                estimated_time: "3 weeks",
                prerequisites: ["data_manipulation"],
                category: "Core Skills"
              },
              {
                id: "sql_databases",
                title: "SQL & Database Management",
                description: "Extract insights from databases using SQL queries.",
                resources: ["SQL Tutorial", "NPTEL Database Management", "SQLBolt"],
                estimated_time: "3 weeks",
                prerequisites: ["math_stats"],
                category: "Core Skills"
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
                category: "Advanced Topics"
              },
              {
                id: "model_evaluation",
                title: "Model Evaluation & Validation",
                description: "Assess model performance and avoid overfitting.",
                resources: ["Model Evaluation Techniques", "Cross-validation Guide", "Bias-Variance Tradeoff"],
                estimated_time: "2 weeks",
                prerequisites: ["machine_learning"],
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Career Preparation"
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
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "feature_engineering",
                title: "Advanced Feature Engineering",
                description: "Master feature selection, transformation, and engineering techniques.",
                resources: ["Feature Engineering Course", "Dimensionality Reduction", "Feature Selection Methods"],
                estimated_time: "3 weeks",
                prerequisites: ["ml_algorithms"],
                category: "Core Skills"
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
                category: "Advanced Topics"
              },
              {
                id: "mlops",
                title: "MLOps and Model Deployment",
                description: "Deploy ML models to production with proper monitoring and versioning.",
                resources: ["MLOps Course", "Docker for ML", "Model Monitoring"],
                estimated_time: "3 weeks",
                prerequisites: ["deep_learning"],
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "big_data_ml",
                title: "Big Data & Distributed ML",
                description: "Spark MLlib, distributed computing, and large-scale ML systems.",
                resources: ["Spark MLlib", "Distributed ML", "Big Data Analytics"],
                estimated_time: "4 weeks",
                prerequisites: ["advanced_dl"],
                category: "Core Skills"
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
                category: "Advanced Topics"
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
                category: "Career Preparation"
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
                category: "Foundations"
              },
              {
                id: "programming_basics_mobile",
                title: "Programming Language Basics",
                description: "Learn Dart for Flutter or JavaScript for React Native.",
                resources: ["Dart Programming", "JavaScript for Mobile", "Programming Fundamentals"],
                estimated_time: "4 weeks",
                prerequisites: ["mobile_fundamentals"],
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "ui_ux_mobile",
                title: "Mobile UI/UX Design",
                description: "Material Design, Human Interface Guidelines, responsive design.",
                resources: ["Material Design", "iOS Design Guidelines", "Mobile UX Patterns"],
                estimated_time: "3 weeks",
                prerequisites: ["flutter_basics"],
                category: "Core Skills"
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
                category: "Advanced Topics"
              },
              {
                id: "api_integration_mobile",
                title: "API Integration & Networking",
                description: "REST APIs, HTTP requests, authentication, and error handling.",
                resources: ["REST API Course", "HTTP & Networking", "API Authentication"],
                estimated_time: "3 weeks",
                prerequisites: ["data_storage_mobile"],
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Career Preparation"
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
                category: "Foundations"
              },
              {
                id: "networking_security",
                title: "Network Security Basics",
                description: "TCP/IP, firewalls, VPNs, network protocols, and security.",
                resources: ["Network+ Course", "Cisco Networking", "Network Security Essentials"],
                estimated_time: "5 weeks",
                prerequisites: ["security_fundamentals"],
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "incident_response",
                title: "Incident Response & Forensics",
                description: "Incident handling, digital forensics, and malware analysis.",
                resources: ["SANS Incident Response", "Digital Forensics", "Malware Analysis"],
                estimated_time: "6 weeks",
                prerequisites: ["ethical_hacking"],
                category: "Core Skills"
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
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Career Preparation"
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
                category: "Foundations"
              },
              {
                id: "linux_basics",
                title: "Linux System Administration",
                description: "Command line, shell scripting, and system administration basics.",
                resources: ["Linux Command Line", "Shell Scripting", "System Administration"],
                estimated_time: "4 weeks",
                prerequisites: ["cloud_fundamentals"],
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "infrastructure_code",
                title: "Infrastructure as Code",
                description: "Terraform, CloudFormation, and infrastructure automation.",
                resources: ["Terraform Course", "CloudFormation Guide", "Infrastructure Automation"],
                estimated_time: "4 weeks",
                prerequisites: ["aws_basics"],
                category: "Core Skills"
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
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Foundations"
              },
              {
                id: "python_for_ai",
                title: "Python for AI/ML",
                description: "Python programming with NumPy, Pandas, and Matplotlib for data science.",
                resources: ["Python Data Science", "NumPy Tutorial", "Pandas Guide"],
                estimated_time: "5 weeks",
                prerequisites: ["ai_fundamentals"],
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "unsupervised_learning",
                title: "Unsupervised Learning & Data Mining",
                description: "Clustering, dimensionality reduction, and association rule mining.",
                resources: ["Unsupervised Learning", "Clustering Algorithms", "PCA Tutorial"],
                estimated_time: "4 weeks",
                prerequisites: ["supervised_learning"],
                category: "Core Skills"
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
                category: "Advanced Topics"
              },
              {
                id: "nlp_basics",
                title: "Natural Language Processing",
                description: "Text processing, sentiment analysis, and language models.",
                resources: ["NLP Course", "spaCy Tutorial", "NLTK Guide"],
                estimated_time: "4 weeks",
                prerequisites: ["neural_networks"],
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Foundations"
              },
              {
                id: "linux_devops",
                title: "Linux & Command Line Mastery",
                description: "Advanced Linux administration, shell scripting, and automation.",
                resources: ["Linux Administration", "Bash Scripting", "System Performance"],
                estimated_time: "4 weeks",
                prerequisites: ["devops_culture"],
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "ci_cd_pipelines",
                title: "CI/CD Pipeline Development",
                description: "Build automated testing, integration, and deployment pipelines.",
                resources: ["Jenkins Mastery", "GitHub Actions", "CI/CD Best Practices"],
                estimated_time: "6 weeks",
                prerequisites: ["version_control_advanced"],
                category: "Core Skills"
              },
              {
                id: "infrastructure_automation",
                title: "Infrastructure Automation",
                description: "Ansible, Terraform, and infrastructure provisioning automation.",
                resources: ["Ansible Playbooks", "Terraform Infrastructure", "Configuration Management"],
                estimated_time: "5 weeks",
                prerequisites: ["ci_cd_pipelines"],
                category: "Core Skills"
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
                category: "Advanced Topics"
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
                category: "Projects"
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
                category: "Foundations"
              },
              {
                id: "solidity_basics",
                title: "Solidity Programming Basics",
                description: "Learn Solidity language for Ethereum smart contract development.",
                resources: ["Solidity Documentation", "Smart Contract Tutorial", "Ethereum Guide"],
                estimated_time: "6 weeks",
                prerequisites: ["blockchain_fundamentals"],
                category: "Foundations"
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
                category: "Core Skills"
              },
              {
                id: "web3_integration",
                title: "Web3 & DApp Development",
                description: "Build decentralized applications with Web3 integration.",
                resources: ["Web3.js Guide", "React DApp Tutorial", "MetaMask Integration"],
                estimated_time: "5 weeks",
                prerequisites: ["smart_contracts"],
                category: "Core Skills"
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
                category: "Advanced Topics"
              },
              {
                id: "blockchain_security",
                title: "Blockchain Security & Auditing",
                description: "Smart contract security, common vulnerabilities, and audit practices.",
                resources: ["Smart Contract Security", "Audit Checklist", "Security Tools"],
                estimated_time: "4 weeks",
                prerequisites: ["defi_protocols"],
                category: "Advanced Topics"
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
                category: "Projects"
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