const axios = require('axios');

class RemoteOkService {
  constructor() {
    this.baseUrl = process.env.REMOTEOK_API_URL || 'https://remoteok.io/api';
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Career-Advisor-Backend/1.0',
        'Accept': 'application/json'
      }
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`📡 RemoteOK API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ RemoteOK API Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ RemoteOK API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ RemoteOK API Response Error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  async fetchJobs(limit = 100) {
    try {
      const response = await this.axiosInstance.get('');
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from RemoteOK API');
      }

      let jobs = response.data;
      
      jobs = jobs.filter(job => job && typeof job === 'object' && job.id);

      if (limit) {
        jobs = jobs.slice(0, limit);
      }

      const normalizedJobs = jobs.map(job => this.normalizeJob(job));
      
      console.log(`📊 Fetched ${normalizedJobs.length} jobs from RemoteOK`);
      return normalizedJobs;

    } catch (error) {
      console.error('❌ Error fetching jobs from RemoteOK:', error.message);
      
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
      }
      
      throw new Error(`Failed to fetch jobs from RemoteOK: ${error.message}`);
    }
  }

  normalizeJob(job) {
    const now = new Date();
    // Better date handling - fallback to current date if invalid
    let postedDate = now;
    if (job.date) {
      const dateTimestamp = typeof job.date === 'number' ? job.date * 1000 : job.date;
      const parsedDate = new Date(dateTimestamp);
      if (!isNaN(parsedDate.getTime())) {
        postedDate = parsedDate;
      }
    }
    
    const extractSalary = () => {
      if (!job.salary) return { min: null, max: null, currency: 'USD' };
      
      const salaryStr = job.salary.toString();
      const salaryMatch = salaryStr.match(/(\$|\€|\£)?(\d{1,3}(?:,?\d{3})*(?:k|K)?)\s*(?:-|to)\s*(\$|\€|\£)?(\d{1,3}(?:,?\d{3})*(?:k|K)?)/);
      
      if (salaryMatch) {
        const min = this.parseSalaryValue(salaryMatch[2]);
        const max = this.parseSalaryValue(salaryMatch[4]);
        return { min, max, currency: 'USD' };
      }
      
      const singleMatch = salaryStr.match(/(\$|\€|\£)?(\d{1,3}(?:,?\d{3})*(?:k|K)?)/);
      if (singleMatch) {
        const value = this.parseSalaryValue(singleMatch[2]);
        return { min: value, max: null, currency: 'USD' };
      }
      
      return { min: null, max: null, currency: 'USD' };
    };

    const extractTags = () => {
      let tags = [];
      
      if (job.tags && Array.isArray(job.tags)) {
        tags = [...job.tags];
      }
      
      if (job.position) {
        const positionTags = job.position.toLowerCase().match(/\b(react|vue|angular|node|python|java|javascript|typescript|php|ruby|go|rust|swift|kotlin)\b/g);
        if (positionTags) {
          tags = [...tags, ...positionTags];
        }
      }
      
      return [...new Set(tags.filter(tag => tag && typeof tag === 'string'))];
    };

    const salary = extractSalary();
    
    return {
      remoteId: job.id.toString(),
      title: job.position || 'Remote Job',
      company: job.company || 'Unknown Company',
      companyLogo: job.company_logo || null,
      location: job.location || 'Remote',
      description: (job.description || '').slice(0, 4900), // Truncate to fit within 5000 char limit
      tags: extractTags(),
      salary,
      jobType: this.determineJobType(job.position),
      experienceLevel: this.determineExperienceLevel(job.position),
      applicationUrl: job.url || `https://remoteok.io/remote-jobs/${job.slug || job.id}`,
      postedAt: postedDate,
      expiresAt: null,
      isActive: true,
      featured: false,
      remoteLevel: 'fully-remote',
      sourceApi: 'remoteok'
    };
  }

  parseSalaryValue(value) {
    if (!value) return null;
    
    const cleanValue = value.replace(/,/g, '');
    
    if (cleanValue.toLowerCase().includes('k')) {
      return parseInt(cleanValue) * 1000;
    }
    
    return parseInt(cleanValue);
  }

  determineJobType(position = '') {
    const positionLower = position.toLowerCase();
    
    if (positionLower.includes('intern')) return 'internship';
    if (positionLower.includes('contract') || positionLower.includes('freelance')) return 'contract';
    if (positionLower.includes('part-time') || positionLower.includes('part time')) return 'part-time';
    
    return 'full-time';
  }

  determineExperienceLevel(position = '') {
    const positionLower = position.toLowerCase();
    
    if (positionLower.includes('senior') || positionLower.includes('sr.')) return 'senior';
    if (positionLower.includes('lead') || positionLower.includes('principal') || positionLower.includes('staff')) return 'lead';
    if (positionLower.includes('junior') || positionLower.includes('jr.') || positionLower.includes('entry')) return 'entry';
    if (positionLower.includes('director') || positionLower.includes('vp') || positionLower.includes('head of')) return 'executive';
    
    return 'mid';
  }
}

module.exports = new RemoteOkService();