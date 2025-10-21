/**
 * Interview Domain Configuration
 * Comprehensive list of professional domains for intelligent mock interviews
 */

const interviewDomains = {
  // Technical Domains
  technical: {
    label: 'Technical',
    domains: [
      {
        id: 'software-engineering-frontend',
        name: 'Software Engineering - Frontend',
        description: 'Frontend development with React, Vue, Angular, etc.',
        keywords: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular', 'TypeScript', 'UI/UX', 'Responsive Design'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'HTML/CSS fundamentals',
          'JavaScript/TypeScript concepts',
          'Frontend frameworks (React/Vue/Angular)',
          'State management',
          'Performance optimization',
          'Browser APIs',
          'Testing and debugging',
          'Web accessibility',
          'Build tools and bundlers'
        ]
      },
      {
        id: 'software-engineering-backend',
        name: 'Software Engineering - Backend',
        description: 'Backend development with Node.js, Python, Java, etc.',
        keywords: ['Node.js', 'Python', 'Java', 'API', 'Database', 'Microservices', 'REST', 'GraphQL'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Server-side programming',
          'Database design and optimization',
          'API development (REST/GraphQL)',
          'Authentication and authorization',
          'Caching strategies',
          'Message queues',
          'Microservices architecture',
          'Security best practices',
          'Scalability and performance'
        ]
      },
      {
        id: 'software-engineering-fullstack',
        name: 'Software Engineering - Full-Stack',
        description: 'Full-stack development across frontend and backend',
        keywords: ['MERN', 'MEAN', 'Full-Stack', 'JavaScript', 'TypeScript', 'Database', 'API'],
        levels: ['Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Frontend and backend integration',
          'End-to-end application development',
          'Database selection and design',
          'API design and implementation',
          'DevOps basics',
          'Version control and CI/CD',
          'System architecture',
          'Performance optimization',
          'Security across the stack'
        ]
      },
      {
        id: 'data-science-ml',
        name: 'Data Science & Machine Learning',
        description: 'Data analysis, ML models, and AI applications',
        keywords: ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Data Analysis', 'Statistics'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Statistical analysis',
          'Machine learning algorithms',
          'Deep learning frameworks',
          'Feature engineering',
          'Model evaluation and optimization',
          'Data preprocessing',
          'Big data technologies',
          'MLOps and deployment',
          'AI ethics and bias'
        ]
      },
      {
        id: 'devops-sre',
        name: 'DevOps & Site Reliability Engineering',
        description: 'Infrastructure, automation, and reliability',
        keywords: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform', 'Monitoring', 'Linux'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Containerization (Docker, Kubernetes)',
          'CI/CD pipelines',
          'Infrastructure as Code',
          'Monitoring and logging',
          'Incident management',
          'Automation and scripting',
          'Cloud platforms',
          'Performance tuning',
          'Disaster recovery'
        ]
      },
      {
        id: 'cloud-architecture',
        name: 'Cloud Architecture',
        description: 'Designing and implementing cloud solutions',
        keywords: ['AWS', 'Azure', 'GCP', 'Cloud Architecture', 'Serverless', 'Cloud Security'],
        levels: ['Mid-Level', 'Senior', 'Lead', 'Architect'],
        questionAreas: [
          'Cloud service models (IaaS, PaaS, SaaS)',
          'Multi-cloud strategies',
          'Serverless architecture',
          'Cloud cost optimization',
          'Cloud security and compliance',
          'Migration strategies',
          'High availability and disaster recovery',
          'Cloud-native design patterns',
          'Networking in the cloud'
        ]
      },
      {
        id: 'cybersecurity',
        name: 'Cybersecurity & Ethical Hacking',
        description: 'Security testing, penetration testing, and defense',
        keywords: ['Security', 'Penetration Testing', 'Cryptography', 'Network Security', 'OWASP'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Network security',
          'Web application security',
          'Cryptography fundamentals',
          'Penetration testing methodologies',
          'Security frameworks and compliance',
          'Incident response',
          'Vulnerability assessment',
          'Security tools and technologies',
          'Threat modeling'
        ]
      },
      {
        id: 'mobile-development',
        name: 'Mobile Development',
        description: 'iOS, Android, and cross-platform mobile apps',
        keywords: ['iOS', 'Android', 'React Native', 'Flutter', 'Mobile', 'Swift', 'Kotlin'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Platform-specific development (iOS/Android)',
          'Cross-platform frameworks',
          'Mobile UI/UX patterns',
          'State management in mobile apps',
          'Mobile performance optimization',
          'Push notifications',
          'Offline functionality',
          'App store deployment',
          'Mobile testing strategies'
        ]
      },
      {
        id: 'database-engineering',
        name: 'Database Engineering',
        description: 'Database design, optimization, and administration',
        keywords: ['SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Database Design', 'Query Optimization'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Database design and normalization',
          'SQL query optimization',
          'NoSQL databases',
          'Indexing strategies',
          'Transactions and concurrency',
          'Replication and sharding',
          'Backup and recovery',
          'Performance tuning',
          'Data modeling'
        ]
      }
    ]
  },

  // IT-Related Domains
  it: {
    label: 'IT & Infrastructure',
    domains: [
      {
        id: 'it-support',
        name: 'IT Support & Help Desk',
        description: 'Technical support and troubleshooting',
        keywords: ['Help Desk', 'Troubleshooting', 'Customer Service', 'Windows', 'Support'],
        levels: ['Entry-Level', 'Level 1', 'Level 2', 'Level 3'],
        questionAreas: [
          'Hardware troubleshooting',
          'Software installation and configuration',
          'Network connectivity issues',
          'Customer service skills',
          'Ticketing systems',
          'Active Directory',
          'Email systems',
          'Remote support tools',
          'Documentation practices'
        ]
      },
      {
        id: 'network-administration',
        name: 'Network Administration',
        description: 'Network management and configuration',
        keywords: ['Networking', 'Cisco', 'TCP/IP', 'Routing', 'Switching', 'Firewall'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Network protocols (TCP/IP, DNS, DHCP)',
          'Routing and switching',
          'Network security',
          'VPN and remote access',
          'Network monitoring tools',
          'Wireless networking',
          'Network troubleshooting',
          'Firewall configuration',
          'Network design'
        ]
      },
      {
        id: 'systems-administration',
        name: 'Systems Administration',
        description: 'Server and system management',
        keywords: ['Linux', 'Windows Server', 'System Administration', 'Active Directory', 'PowerShell'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Operating system management',
          'Server configuration',
          'User and group management',
          'Backup and recovery',
          'System monitoring',
          'Scripting and automation',
          'Patch management',
          'Virtualization',
          'Capacity planning'
        ]
      },
      {
        id: 'database-administration',
        name: 'Database Administration',
        description: 'Database management and maintenance',
        keywords: ['DBA', 'SQL Server', 'Oracle', 'MySQL', 'Database', 'Backup'],
        levels: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
        questionAreas: [
          'Database installation and configuration',
          'Backup and recovery strategies',
          'Performance monitoring',
          'Security and access control',
          'Database maintenance',
          'High availability solutions',
          'Disaster recovery',
          'Query optimization',
          'Database upgrades'
        ]
      },
      {
        id: 'it-project-management',
        name: 'IT Project Management',
        description: 'Managing IT projects and teams',
        keywords: ['Project Management', 'Agile', 'Scrum', 'JIRA', 'Leadership'],
        levels: ['Junior PM', 'PM', 'Senior PM', 'Program Manager'],
        questionAreas: [
          'Project planning and scheduling',
          'Agile and Scrum methodologies',
          'Risk management',
          'Stakeholder communication',
          'Resource allocation',
          'Budget management',
          'Team leadership',
          'Project tracking tools',
          'Change management'
        ]
      },
      {
        id: 'business-analysis',
        name: 'Business Analysis',
        description: 'Requirements gathering and business processes',
        keywords: ['Business Analysis', 'Requirements', 'Process Improvement', 'Documentation'],
        levels: ['Junior BA', 'BA', 'Senior BA', 'Lead BA'],
        questionAreas: [
          'Requirements gathering',
          'Stakeholder analysis',
          'Process modeling',
          'Gap analysis',
          'User stories and use cases',
          'Data analysis',
          'Business process improvement',
          'Documentation',
          'Communication skills'
        ]
      },
      {
        id: 'qa-testing',
        name: 'Quality Assurance & Testing',
        description: 'Software testing and quality assurance',
        keywords: ['QA', 'Testing', 'Automation', 'Selenium', 'Test Cases', 'Bug Tracking'],
        levels: ['Junior QA', 'QA Engineer', 'Senior QA', 'QA Lead'],
        questionAreas: [
          'Manual testing techniques',
          'Test automation',
          'Test case design',
          'Bug tracking and reporting',
          'Performance testing',
          'API testing',
          'Test frameworks',
          'CI/CD integration',
          'Quality metrics'
        ]
      }
    ]
  },

  // Business & Professional
  business: {
    label: 'Business & Management',
    domains: [
      {
        id: 'product-management',
        name: 'Product Management',
        description: 'Product strategy and roadmap planning',
        keywords: ['Product Management', 'Product Strategy', 'Roadmap', 'User Research', 'Analytics'],
        levels: ['Associate PM', 'PM', 'Senior PM', 'Director'],
        questionAreas: [
          'Product strategy',
          'Market research',
          'User research and personas',
          'Product roadmap planning',
          'Feature prioritization',
          'Metrics and analytics',
          'Stakeholder management',
          'Go-to-market strategy',
          'Product lifecycle management'
        ]
      },
      {
        id: 'ui-ux-design',
        name: 'UI/UX Design',
        description: 'User interface and experience design',
        keywords: ['UI Design', 'UX Design', 'Figma', 'User Research', 'Prototyping', 'Wireframing'],
        levels: ['Junior Designer', 'Designer', 'Senior Designer', 'Lead Designer'],
        questionAreas: [
          'User research methodologies',
          'Wireframing and prototyping',
          'Design systems',
          'Usability testing',
          'Interaction design',
          'Visual design principles',
          'Accessibility',
          'Design tools (Figma, Sketch, Adobe XD)',
          'Design thinking process'
        ]
      }
    ]
  }
};

/**
 * Get all domains flattened
 */
const getAllDomains = () => {
  const allDomains = [];
  Object.values(interviewDomains).forEach(category => {
    allDomains.push(...category.domains);
  });
  return allDomains;
};

/**
 * Get domain by ID
 */
const getDomainById = (domainId) => {
  const allDomains = getAllDomains();
  return allDomains.find(domain => domain.id === domainId);
};

/**
 * Get domains by category
 */
const getDomainsByCategory = (category) => {
  return interviewDomains[category]?.domains || [];
};

/**
 * Search domains by keyword
 */
const searchDomains = (keyword) => {
  const allDomains = getAllDomains();
  const lowerKeyword = keyword.toLowerCase();

  return allDomains.filter(domain =>
    domain.name.toLowerCase().includes(lowerKeyword) ||
    domain.description.toLowerCase().includes(lowerKeyword) ||
    domain.keywords.some(k => k.toLowerCase().includes(lowerKeyword))
  );
};

module.exports = {
  interviewDomains,
  getAllDomains,
  getDomainById,
  getDomainsByCategory,
  searchDomains
};
