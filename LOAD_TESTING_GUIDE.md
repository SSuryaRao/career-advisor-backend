# Load & Performance Testing Guide

## Overview
This guide covers load and performance testing for the Career Advisor Backend API using Artillery.

## Prerequisites

1. **Start the Backend Server:**
   ```bash
   npm run dev
   # Server should be running on http://localhost:5000
   ```

2. **Verify Server is Running:**
   ```bash
   curl http://localhost:5000/api/health
   # Should return: {"status":"OK","message":"Career Advisor API is running"}
   ```

## Test Scenarios

### 1. Quick Test (30 seconds)
For rapid testing during development.

```bash
npx artillery run artillery-quick-test.yml
```

**What it does:**
- 10 users/second for 30 seconds
- Tests basic endpoints: health, jobs, scholarships, internships
- Total requests: ~300

**Use when:**
- Testing after code changes
- Quick validation before commits
- Development iterations

---

### 2. Standard Load Test (10 minutes)
Comprehensive test simulating real-world traffic patterns.

```bash
npx artillery run artillery-config.yml
```

**What it does:**
- Warm-up: 5 users/sec (1 min)
- Ramp-up: 10→50 users/sec (2 min)
- Sustained: 50 users/sec (5 min)
- Peak: 100 users/sec (1 min)
- Cool-down: 10 users/sec (1 min)
- Total requests: ~18,000+

**Performance Thresholds:**
- Max error rate: 1%
- P95 response time: < 2 seconds
- P99 response time: < 5 seconds

**Use when:**
- Pre-production validation
- Before major deployments
- Performance baseline establishment

---

### 3. Stress Test (8 minutes)
Push the system to find breaking points.

```bash
npx artillery run artillery-stress-test.yml
```

**What it does:**
- Ramp 10→100 users/sec (1 min)
- Sustain 100 users/sec (3 min)
- Push to 300 users/sec (1 min)
- Extreme: 500 users/sec (1 min)
- Total requests: ~60,000+

**⚠️ WARNING:**
- High CPU/memory usage
- May cause system instability
- Only run in controlled environments
- Monitor system resources

**Use when:**
- Capacity planning
- Finding system limits
- Infrastructure sizing
- Disaster scenario testing

---

## Understanding Artillery Reports

### Key Metrics

**Scenarios launched:** Number of virtual users created
**Scenarios completed:** Number of users who finished their journey
**Requests completed:** Total HTTP requests sent

**Response time metrics:**
- `min`: Fastest response
- `max`: Slowest response
- `median`: Middle value (50th percentile)
- `p95`: 95% of requests were faster than this
- `p99`: 99% of requests were faster than this

**HTTP codes:**
- `200`: Successful requests
- `4xx`: Client errors (bad requests, auth failures)
- `5xx`: Server errors (crashes, timeouts)

### Sample Report
```
Summary report @ 13:45:30(+0000)
  Scenarios launched:  3000
  Scenarios completed: 2950
  Requests completed:  11800
  Mean response/sec: 19.67
  Response time (msec):
    min: 45
    max: 2345
    median: 167
    p95: 890
    p99: 1456
  Scenario counts:
    Health Check: 300 (10%)
    Job Search: 900 (30%)
    Scholarship Search: 600 (20%)
  Codes:
    200: 11750
    500: 50
  Errors:
    ETIMEDOUT: 50
```

### What to Look For

**✅ Good Performance:**
- p95 < 1 second
- p99 < 2 seconds
- Error rate < 0.5%
- All scenarios completed

**⚠️ Concerning:**
- p95 > 2 seconds
- p99 > 5 seconds
- Error rate 1-5%
- Some scenarios incomplete

**❌ Poor Performance:**
- p95 > 5 seconds
- p99 > 10 seconds
- Error rate > 5%
- Many incomplete scenarios
- ETIMEDOUT errors

---

## Advanced Testing

### Testing Specific Endpoints

Create custom test for specific routes:

```yaml
# test-roadmap-api.yml
config:
  target: "http://localhost:5000"
  phases:
    - duration: 60
      arrivalRate: 20

scenarios:
  - name: "Roadmap Generation"
    flow:
      - post:
          url: "/api/roadmap/generate"
          headers:
            Authorization: "Bearer YOUR_TOKEN_HERE"
          json:
            role: "Full Stack Developer"
            experience: "2 years"
            skills: ["JavaScript", "React"]
```

Run with:
```bash
npx artillery run test-roadmap-api.yml
```

### Testing with Authentication

1. **Get a valid JWT token:**
   - Login through frontend
   - Copy token from browser DevTools → Application → Local Storage

2. **Create authenticated test:**
```yaml
config:
  target: "http://localhost:5000"
  variables:
    authToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

scenarios:
  - flow:
      - get:
          url: "/api/user/profile"
          headers:
            Authorization: "Bearer {{ authToken }}"
```

### Generate HTML Reports

```bash
npx artillery run artillery-config.yml --output report.json
npx artillery report report.json --output report.html
```

Open `report.html` in browser for interactive charts.

---

## Monitoring During Tests

### 1. Server Logs
```bash
# Terminal 1: Run server with verbose logging
npm run dev

# Watch for errors, slow queries, crashes
```

### 2. System Resources (Windows)
```powershell
# CPU & Memory
Get-Counter '\Processor(_Total)\% Processor Time'
Get-Counter '\Memory\Available MBytes'

# Or use Task Manager
```

### 3. Database Monitoring
```bash
# MongoDB stats
mongosh
> db.currentOp()
> db.serverStatus().connections
```

### 4. Real-time Artillery Output
Artillery shows live metrics during test execution:
```
Summary report @ 13:45:15(+0000) [+15s]
  Scenarios launched:  150
  Scenarios completed: 145
  Requests completed:  580
  Mean response/sec: 38.67
```

---

## Optimization Tips

### If Response Times are High:

1. **Add Database Indexes:**
```javascript
// In your models
schema.index({ userId: 1, createdAt: -1 });
```

2. **Enable Caching:**
```javascript
const cache = new Map();
// Cache frequently accessed data
```

3. **Optimize Queries:**
```javascript
// Use lean() for read-only data
const jobs = await Job.find({}).lean();

// Select only needed fields
const users = await User.find({}).select('name email');
```

4. **Add Pagination:**
```javascript
const page = req.query.page || 1;
const limit = 20;
const jobs = await Job.find()
  .limit(limit)
  .skip((page - 1) * limit);
```

### If Error Rate is High:

1. **Check rate limiting** (server.js:42)
2. **Verify database connections**
3. **Check external API limits** (Google Cloud, etc.)
4. **Review error logs**

### If Server Crashes:

1. **Increase Node.js memory:**
```bash
node --max-old-space-size=4096 src/server.js
```

2. **Use PM2 for auto-restart:**
```bash
npm install -g pm2
pm2 start src/server.js --name career-advisor
```

---

## CI/CD Integration

Add to GitHub Actions:

```yaml
# .github/workflows/load-test.yml
name: Load Test
on:
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: cd Backend && npm install
      - name: Start server
        run: cd Backend && npm start &
      - name: Wait for server
        run: sleep 10
      - name: Run quick load test
        run: cd Backend && npx artillery run artillery-quick-test.yml
```

---

## Troubleshooting

### Artillery not found
```bash
npm install -g artillery
# Or use npx
npx artillery run artillery-config.yml
```

### Connection refused
```bash
# Ensure server is running
curl http://localhost:5000/api/health
# Check PORT in .env
```

### High error rates
```bash
# Check server logs
# Verify database connection
# Check rate limiting settings
```

### Out of memory
```bash
# Reduce arrivalRate in config
# Reduce test duration
# Increase Node.js memory limit
```

---

## Next Steps

1. ✅ Run quick test to verify setup
2. ✅ Establish baseline metrics
3. ✅ Run standard load test
4. ✅ Optimize based on results
5. ✅ Run stress test to find limits
6. ✅ Document performance characteristics
7. ✅ Set up monitoring alerts

## Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Performance Testing Best Practices](https://www.artillery.io/docs/guides/getting-started/writing-your-first-test)
- [MongoDB Performance](https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/)
