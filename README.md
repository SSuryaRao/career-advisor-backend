# Career Advisor Backend API

A Node.js backend API that fetches remote job listings from RemoteOK API and serves them through a RESTful API using Express.js and MongoDB Atlas.

## Features

- 🚀 RESTful API for job listings
- 📊 Job data fetched from RemoteOK API
- 🗄️ MongoDB Atlas cloud database
- ⚡ Automated job synchronization every 6 hours
- 🔍 Advanced search and filtering
- 📈 Job statistics and analytics
- 🛡️ Security middleware (Helmet, CORS, Rate Limiting)
- 🧹 Automatic cleanup of old job postings

## Folder Structure

```
backend2/
├── src/
│   ├── controllers/         # Request handlers
│   │   └── jobController.js
│   ├── models/             # Database models
│   │   └── Job.js
│   ├── routes/             # API routes
│   │   └── jobRoutes.js
│   ├── services/           # Business logic
│   │   ├── remoteOkService.js
│   │   └── jobSyncService.js
│   ├── config/             # Configuration files
│   │   └── database.js
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utility functions
│   └── server.js          # Main server file
├── tests/                  # Test files
├── public/                # Static files
├── package.json
├── .env.example
└── README.md
```

## API Endpoints

### Jobs
- `GET /api/jobs` - Get all jobs with pagination and filtering
- `GET /api/jobs/:id` - Get a specific job by ID
- `GET /api/jobs/featured` - Get featured jobs
- `GET /api/jobs/stats` - Get job statistics
- `GET /api/jobs/search` - Search jobs by query

### Query Parameters for `/api/jobs`
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Text search
- `tags` - Filter by technology tags
- `company` - Filter by company name
- `jobType` - Filter by job type (full-time, part-time, contract, etc.)
- `experienceLevel` - Filter by experience level
- `sortBy` - Sort field (default: postedAt)
- `sortOrder` - Sort order (asc/desc, default: desc)

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend2
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/career-advisor?retryWrites=true&w=majority
PORT=5000
NODE_ENV=development
REMOTEOK_API_URL=https://remoteok.io/api
```

### 3. MongoDB Atlas Setup
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address
5. Get your connection string and add it to `.env`

### 4. Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## Job Synchronization

The system automatically:
- Fetches jobs from RemoteOK API every 6 hours
- Processes and normalizes job data
- Updates existing jobs if changes are detected
- Deactivates jobs older than 30 days
- Performs weekly cleanup of inactive jobs

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Prevents API abuse
- **Input Validation** - Validates request parameters
- **Error Handling** - Comprehensive error responses

## Frontend Integration

To connect your frontend to this backend:

```javascript
// Example: Fetch jobs in your React component
const fetchJobs = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/jobs?page=1&limit=10');
    const data = await response.json();
    
    if (data.success) {
      setJobs(data.data.jobs);
    }
  } catch (error) {
    console.error('Error fetching jobs:', error);
  }
};
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## Health Check

Visit `http://localhost:5000/api/health` to check if the API is running.

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Update CORS origins in `src/server.js`
3. Use process manager like PM2
4. Set up reverse proxy with Nginx
5. Enable HTTPS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request