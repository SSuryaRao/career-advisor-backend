const speech = require('@google-cloud/speech');
const speechV2 = require('@google-cloud/speech').v2;

class SpeechToTextService {
  constructor() {
    this.client = null;
    this.clientV2 = null;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.location = 'us-central1'; // Regional location required for Chirp model
    this.recognizerId = 'career-advisor-recognizer'; // Persistent recognizer for v2
    this.isConfigured = false;
    this.useV2Api = true; // Feature flag to switch between v1 and v2
    this.v2Available = false;

    this.initialize();
  }

  initialize() {
    try {
      if (!this.projectId) {
        console.warn('⚠️ Speech-to-Text not configured. Missing GOOGLE_CLOUD_PROJECT_ID');
        this.isConfigured = false;
        return;
      }

      const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      // Initialize v1 client (stable fallback)
      if (credentials) {
        this.client = new speech.SpeechClient({
          projectId: this.projectId,
          keyFilename: credentials
        });
      } else {
        this.client = new speech.SpeechClient({
          projectId: this.projectId
        });
      }

      console.log('✅ Speech-to-Text v1 API initialized successfully');

      // Initialize v2 client for improved accuracy (5-10% better)
      try {
        if (credentials) {
          this.clientV2 = new speechV2.SpeechClient({
            projectId: this.projectId,
            keyFilename: credentials
          });
        } else {
          this.clientV2 = new speechV2.SpeechClient({
            projectId: this.projectId
          });
        }
        this.v2Available = true;
        console.log('✅ Speech-to-Text v2 API initialized successfully');
      } catch (v2Error) {
        console.warn('⚠️ Speech-to-Text v2 API not available, will use v1:', v2Error.message);
        this.useV2Api = false;
        this.v2Available = false;
      }

      this.isConfigured = true;

    } catch (error) {
      console.error('❌ Failed to initialize Speech-to-Text:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Post-process transcription to fix common speech recognition errors
   * @param {string} transcript - Raw transcription text
   * @param {string} domainId - Interview domain ID for domain-specific corrections
   * @returns {string} Corrected transcription
   */
  correctCommonTranscriptionErrors(transcript, domainId) {
    if (!transcript || transcript.length === 0) {
      return transcript;
    }

    // Common transcription errors across all domains
    const commonCorrections = {
      'late': 'let',
      'cleared': 'clicked',
      'reactor': 'React',
      'parental': 'parent',
      'principal': 'principle'
    };

    // Domain-specific corrections
    const domainCorrections = {
      'software-engineering-frontend': {
        // CSS/Layout
        'Allen Atomic': 'align-items',
        'allen atomic': 'align-items',
        'Combat': 'max-width',
        'combat': 'max-width',
        'fixed set by': 'Flexbox',
        'Flex set by': 'Flexbox',
        'varied functions': 'var function',
        'blocked and reverse': 'block-scoped',
        'YouTube textbooks': 'use div text blocks',

        // Async/Await patterns - CRITICAL FIXES based on errors
        'power of state of forage': 'for...of',
        'power of state': 'for...of',
        'forage': 'for...of',
        'for age': 'for...of',
        'a weight': 'await',
        'wait': 'await', // Only if clearly in async context
        'acronyms': 'asynchronous',
        'a synchronous': 'asynchronous',
        'For each support': 'forEach supports',
        'for a support': 'for...of supports',

        // Common React terms
        'reactor': 'React',
        'ray act': 'React',
        'you state': 'useState',
        'you effect': 'useEffect',
        'context API': 'Context API',
        'props drilling': 'prop drilling',

        // Other common mistakes
        'view jazz': 'Vue.js',
        'type scrip': 'TypeScript',
        'no jazz': 'Node.js'
      },
      'database-administration': {
        'Ramen': 'RMAN',
        'ramen': 'RMAN',
        'Myers kill': 'MySQL',
        'myers kill': 'MySQL',
        'Skilsaw': 'SQL Server',
        'skill saw': 'SQL Server',
        'skin tattoo': 'schema',
        'least prevalence': 'least privilege',
        'civilians own records': 'select on schema'
      }
    };

    let corrected = transcript;

    // Apply common corrections
    for (const [wrong, right] of Object.entries(commonCorrections)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(regex, right);
    }

    // Apply domain-specific corrections if domain is specified
    if (domainId && domainCorrections[domainId]) {
      for (const [wrong, right] of Object.entries(domainCorrections[domainId])) {
        const regex = new RegExp(wrong, 'gi');
        corrected = corrected.replace(regex, right);
      }
    }

    return corrected;
  }

  /**
   * Get domain-specific vocabulary hints based on interview domain
   * EXPANDED: 200-500 terms per domain for improved accuracy
   * @param {string} domainId - Interview domain ID
   * @returns {Array<string>} Array of domain-specific terms
   */
  getDomainVocabulary(domainId) {
    // Base technical terms (always included) - EXPANDED
    const baseTerms = [
      // General tech terms
      'database', 'schema', 'table', 'index', 'query', 'SQL',
      'API', 'REST', 'GraphQL', 'authentication', 'authorization',
      'algorithm', 'data structure', 'optimization', 'performance',
      'scalability', 'architecture', 'design pattern', 'refactoring',
      'testing', 'debugging', 'deployment', 'version control',
      'git', 'GitHub', 'GitLab', 'Bitbucket', 'repository',
      'branch', 'merge', 'commit', 'pull request', 'code review',
      'documentation', 'technical debt', 'agile', 'scrum', 'sprint',
      'CI/CD', 'DevOps', 'automation', 'infrastructure',
      'security', 'encryption', 'hash', 'token', 'session'
    ];

    // Domain-specific vocabularies - MASSIVELY EXPANDED
    const domainVocabularies = {
      // Database Administration - EXPANDED to 250+ terms
      'database-administration': [
        // Database Systems
        'SQL Server', 'MySQL', 'Oracle', 'PostgreSQL', 'MongoDB', 'MariaDB',
        'SQLite', 'Microsoft SQL Server', 'Oracle Database', 'DB2', 'Sybase',
        'Cassandra', 'CouchDB', 'Neo4j', 'DynamoDB', 'Aurora', 'RDS',

        // Backup & Recovery Tools
        'RMAN', 'Recovery Manager', 'mysqldump', 'pg_dump', 'pg_restore',
        'SQL Server Management Studio', 'SSMS', 'pgAdmin', 'MySQL Workbench',
        'Oracle Enterprise Manager', 'OEM', 'SQL Developer', 'DataGrip',

        // Backup Strategies
        'backup', 'restore', 'recovery', 'full backup', 'incremental backup',
        'differential backup', 'point-in-time recovery', 'PITR',
        'backup retention', 'backup schedule', 'hot backup', 'cold backup',
        'logical backup', 'physical backup', 'snapshot', 'clone',

        // Transactions & Concurrency
        'transaction', 'ACID', 'atomicity', 'consistency', 'isolation', 'durability',
        'transaction log', 'redo log', 'undo log', 'checkpoint',
        'commit', 'rollback', 'savepoint', 'two-phase commit',
        'deadlock', 'lock', 'locking', 'row-level lock', 'table-level lock',
        'pessimistic locking', 'optimistic locking', 'isolation level',
        'read uncommitted', 'read committed', 'repeatable read', 'serializable',

        // Replication
        'replication', 'master-slave', 'master-master', 'primary-replica',
        'synchronous replication', 'asynchronous replication',
        'log shipping', 'binary log', 'replication lag', 'failover',
        'high availability', 'disaster recovery', 'clustering',

        // Performance Tuning
        'execution plan', 'query plan', 'explain plan', 'query optimizer',
        'table scan', 'full table scan', 'index scan', 'index seek',
        'clustered index', 'non-clustered index', 'covering index',
        'profiler', 'SQL Profiler', 'performance schema', 'DMV',
        'dynamic management views', 'query store', 'execution statistics',
        'wait statistics', 'blocking', 'bottleneck', 'throughput', 'latency',

        // Indexing
        'index', 'indexing', 'B-tree', 'hash index', 'bitmap index',
        'composite index', 'partial index', 'unique index', 'filtered index',
        'index fragmentation', 'rebuild index', 'reorganize index',
        'fill factor', 'cardinality', 'selectivity', 'statistics',

        // Security & Permissions
        'least privilege', 'permissions', 'grant', 'revoke', 'deny',
        'role', 'user', 'authentication', 'authorization', 'privilege',
        'database user', 'login', 'schema owner', 'object permission',
        'row-level security', 'column-level security', 'encryption at rest',
        'transparent data encryption', 'TDE', 'SSL', 'TLS',

        // Database Maintenance
        'DBA', 'database administrator', 'maintenance', 'maintenance plan',
        'integrity check', 'consistency check', 'DBCC', 'database health',
        'space management', 'storage optimization', 'purge', 'archive',
        'compression', 'vacuum', 'analyze', 'statistics update',

        // Schema & Objects
        'constraint', 'foreign key', 'primary key', 'unique constraint',
        'check constraint', 'default constraint', 'normalization',
        'first normal form', 'second normal form', 'third normal form',
        'denormalization', 'stored procedure', 'function', 'trigger',
        'view', 'materialized view', 'synonym', 'sequence', 'cursor',

        // Data Types
        'varchar', 'char', 'nvarchar', 'text', 'integer', 'bigint',
        'decimal', 'numeric', 'float', 'datetime', 'timestamp', 'date',
        'time', 'boolean', 'binary', 'varbinary', 'blob', 'clob', 'JSON',

        // Query Optimization
        'query optimization', 'query tuning', 'join', 'inner join', 'outer join',
        'left join', 'right join', 'cross join', 'self join', 'subquery',
        'correlated subquery', 'common table expression', 'CTE', 'window function',
        'aggregate function', 'group by', 'having', 'where clause', 'filter',

        // Monitoring
        'monitoring', 'alerting', 'metrics', 'log analysis', 'error log',
        'slow query log', 'audit log', 'activity monitor', 'resource governor',
        'connection pooling', 'max connections', 'timeout', 'retry logic'
      ],

      // Database Engineering - EXPANDED to 200+ terms
      'database-engineering': [
        // Database Types
        'SQL', 'NoSQL', 'relational database', 'document database',
        'key-value store', 'column-family store', 'graph database',
        'time-series database', 'PostgreSQL', 'MongoDB', 'Redis',
        'Cassandra', 'Elasticsearch', 'DynamoDB', 'Firebase', 'Firestore',

        // Data Modeling
        'normalization', 'denormalization', 'entity-relationship diagram', 'ERD',
        'data model', 'conceptual model', 'logical model', 'physical model',
        'schema design', 'database design', 'relationship', 'cardinality',
        'one-to-one', 'one-to-many', 'many-to-many', 'self-referencing',

        // Scaling Strategies
        'sharding', 'partitioning', 'horizontal partitioning', 'vertical partitioning',
        'range partitioning', 'hash partitioning', 'list partitioning',
        'horizontal scaling', 'vertical scaling', 'scale-out', 'scale-up',
        'distributed database', 'data distribution', 'consistent hashing',

        // ACID & BASE
        'ACID', 'atomicity', 'consistency', 'isolation', 'durability',
        'BASE', 'basically available', 'soft state', 'eventual consistency',
        'strong consistency', 'weak consistency', 'CAP theorem',
        'consistency model', 'distributed transaction',

        // Transactions
        'transaction', 'transaction management', 'commit', 'rollback',
        'two-phase commit', '2PC', 'three-phase commit', 'saga pattern',
        'compensation', 'idempotency', 'transaction isolation',

        // Concurrency
        'concurrency', 'concurrency control', 'MVCC', 'multi-version concurrency control',
        'lock-free', 'wait-free', 'deadlock detection', 'deadlock prevention',
        'timestamp ordering', 'optimistic concurrency', 'pessimistic concurrency',

        // Indexing & Performance
        'indexing', 'B-tree index', 'B+ tree', 'LSM tree', 'log-structured merge tree',
        'inverted index', 'spatial index', 'full-text index', 'GiST', 'GIN',
        'query optimization', 'execution plan', 'cost-based optimization',
        'rule-based optimization', 'statistics', 'histogram', 'bloom filter',
        'performance tuning', 'query rewriting', 'materialized view',

        // Caching
        'caching', 'cache invalidation', 'write-through cache', 'write-back cache',
        'cache-aside', 'read-through cache', 'Redis cache', 'Memcached',
        'CDN', 'edge caching', 'query caching', 'result caching',

        // Replication & HA
        'replication', 'master-slave replication', 'leader-follower',
        'multi-master replication', 'synchronous replication',
        'asynchronous replication', 'semi-synchronous', 'conflict resolution',
        'high availability', 'failover', 'automatic failover', 'split-brain',
        'quorum', 'consensus', 'Paxos', 'Raft', 'leader election',

        // Data Integrity
        'data integrity', 'referential integrity', 'constraint', 'validation',
        'check constraint', 'unique constraint', 'not null', 'default value',
        'cascade', 'cascade delete', 'cascade update', 'trigger',

        // Migrations
        'migration', 'schema migration', 'data migration', 'flyway', 'Liquibase',
        'migration script', 'rollback', 'forward-only migration', 'versioning',

        // ORM & Query Builders
        'ORM', 'object-relational mapping', 'Hibernate', 'Sequelize',
        'TypeORM', 'Prisma', 'ActiveRecord', 'Entity Framework',
        'query builder', 'Knex', 'jOOQ', 'lazy loading', 'eager loading',

        // Data Warehousing
        'data warehouse', 'OLTP', 'OLAP', 'star schema', 'snowflake schema',
        'fact table', 'dimension table', 'ETL', 'extract transform load',
        'data pipeline', 'batch processing', 'real-time processing'
      ],

      // Frontend Development - EXPANDED to 300+ terms
      'software-engineering-frontend': [
        // Core Technologies
        'HTML', 'HTML5', 'CSS', 'CSS3', 'JavaScript', 'ECMAScript',
        'ES6', 'ES2015', 'ES2020', 'TypeScript', 'JSX', 'TSX',

        // JavaScript Fundamentals
        'variable', 'var', 'let', 'const', 'hoisting', 'scope',
        'function scope', 'block scope', 'lexical scope', 'closure',
        'callback', 'callback function', 'promise', 'async', 'await',
        'async await', 'synchronous', 'asynchronous', 'event loop',
        'call stack', 'task queue', 'microtask', 'macrotask',
        'IIFE', 'immediately invoked function expression',
        'arrow function', 'higher-order function', 'pure function',
        'side effect', 'immutability', 'destructuring', 'spread operator',
        'rest parameter', 'template literal', 'module', 'import', 'export',

        // Common transcription errors - phonetic variants
        'for...of', 'for of loop', 'for-of loop', 'await keyword',
        'Array.forEach', 'forEach loop', 'forEach method',
        'Promise.all', 'async function', 'asynchronous function',
        'asynchronous programming', 'async programming',

        // Frameworks & Libraries
        'React', 'React.js', 'Vue', 'Vue.js', 'Angular', 'Svelte',
        'Next.js', 'Nuxt', 'Gatsby', 'Remix', 'Astro',
        'jQuery', 'Backbone', 'Ember', 'Preact', 'Solid',

        // React Ecosystem
        'component', 'functional component', 'class component',
        'props', 'properties', 'state', 'state management',
        'hooks', 'React hooks', 'useState', 'useEffect', 'useContext',
        'useRef', 'useMemo', 'useCallback', 'useReducer', 'useLayoutEffect',
        'useImperativeHandle', 'useDebugValue', 'custom hook',
        'JSX', 'virtual DOM', 'reconciliation', 'render', 're-render',
        'component lifecycle', 'mounting', 'updating', 'unmounting',
        'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
        'React Router', 'routing', 'navigation', 'Link', 'Route',
        'Redux', 'Redux Toolkit', 'action', 'reducer', 'dispatch',
        'store', 'middleware', 'Redux Thunk', 'Redux Saga',
        'context API', 'context provider', 'context consumer',
        'props drilling', 'composition', 'children prop',
        'Higher-Order Component', 'HOC', 'render props',
        'controlled component', 'uncontrolled component',
        'ref', 'forwardRef', 'React.memo', 'lazy loading', 'Suspense',
        'Error Boundary', 'portal', 'fragment', 'React.Fragment',

        // CSS & Styling
        'CSS', 'Cascading Style Sheets', 'selector', 'class', 'id',
        'pseudo-class', 'pseudo-element', 'specificity', 'cascade',
        'inheritance', 'box model', 'margin', 'padding', 'border',
        'content', 'display', 'position', 'float', 'clear', 'z-index',

        // CSS Layout
        'flexbox', 'Flexbox', 'CSS Flexbox', 'flex container', 'flex item',
        'flex', 'flex-direction', 'flex-wrap', 'flex-flow',
        'justify-content', 'align-items', 'align-content', 'align-self',
        'flex-grow', 'flex-shrink', 'flex-basis', 'order',
        'space-between', 'space-around', 'space-evenly', 'flex-start', 'flex-end',
        'CSS Grid', 'grid', 'grid container', 'grid item', 'grid layout',
        'grid-template-columns', 'grid-template-rows', 'grid-template-areas',
        'grid-column', 'grid-row', 'grid-area', 'grid-gap', 'gap',
        'column-gap', 'row-gap', 'grid-auto-flow', 'grid-auto-columns',
        'repeat', 'minmax', 'auto-fit', 'auto-fill', 'fr unit',

        // CSS Units & Values
        'pixel', 'pixels', 'px', 'rem', 'em', 'percentage', '%',
        'viewport width', 'vw', 'viewport height', 'vh',
        'vmin', 'vmax', 'ch', 'ex', 'cm', 'mm', 'in', 'pt', 'pc',
        'calc', 'min', 'max', 'clamp', 'var', 'CSS variable',

        // CSS Sizing
        'width', 'height', 'max-width', 'min-width', 'max-height', 'min-height',
        'object-fit', 'object-position', 'contain', 'cover', 'fill',
        'aspect-ratio', 'box-sizing', 'border-box', 'content-box',

        // CSS Positioning & Alignment
        'center', 'centering', 'horizontal center', 'vertical center',
        'auto', 'margin auto', 'text-align', 'vertical-align',
        'position', 'static', 'relative', 'absolute', 'fixed', 'sticky',
        'top', 'right', 'bottom', 'left', 'inset',

        // Responsive Design
        'responsive design', 'mobile-first', 'desktop-first',
        'media query', 'media queries', 'breakpoint', 'viewport',
        'mobile responsive', 'adaptive design', 'fluid layout',
        'min-width', 'max-width', 'screen size', 'device width',

        // CSS Frameworks
        'Tailwind CSS', 'Tailwind', 'Bootstrap', 'Material UI', 'MUI',
        'Chakra UI', 'Ant Design', 'Bulma', 'Foundation', 'Semantic UI',
        'CSS Modules', 'styled-components', 'emotion', 'CSS-in-JS',
        'Sass', 'SCSS', 'Less', 'PostCSS', 'Stylus',

        // Events
        'event', 'event handler', 'event listener', 'addEventListener',
        'onClick', 'onChange', 'onSubmit', 'onInput', 'onBlur', 'onFocus',
        'onMouseOver', 'onMouseOut', 'onKeyDown', 'onKeyUp', 'onKeyPress',
        'onLoad', 'onError', 'onScroll', 'onResize',
        'event object', 'event target', 'currentTarget',
        'event propagation', 'bubbling', 'capturing', 'event delegation',
        'preventDefault', 'prevent default', 'stopPropagation', 'stop propagation',
        'stopImmediatePropagation', 'passive event listener',

        // DOM Manipulation
        'DOM', 'Document Object Model', 'element', 'node', 'DOM tree',
        'querySelector', 'querySelectorAll', 'getElementById',
        'getElementsByClassName', 'createElement', 'appendChild',
        'removeChild', 'insertBefore', 'cloneNode', 'textContent',
        'innerHTML', 'innerText', 'setAttribute', 'getAttribute',
        'classList', 'add', 'remove', 'toggle', 'contains',

        // Forms
        'form', 'input', 'textarea', 'select', 'option', 'checkbox',
        'radio button', 'form validation', 'required', 'pattern',
        'min', 'max', 'minlength', 'maxlength', 'placeholder',
        'label', 'fieldset', 'legend', 'disabled', 'readonly',
        'form submission', 'FormData', 'serialize',

        // Build Tools
        'webpack', 'Webpack', 'Vite', 'Rollup', 'Parcel', 'esbuild',
        'babel', 'Babel', 'transpile', 'polyfill', 'bundler',
        'code splitting', 'tree shaking', 'dead code elimination',
        'minification', 'uglify', 'source map', 'hot module replacement', 'HMR',

        // Performance
        'performance', 'optimization', 'lazy loading', 'code splitting',
        'dynamic import', 'prefetch', 'preload', 'defer', 'async script',
        'critical rendering path', 'render-blocking', 'web vitals',
        'Core Web Vitals', 'LCP', 'FID', 'CLS', 'TTFB', 'FCP',
        'memoization', 'debounce', 'throttle', 'requestAnimationFrame',

        // Accessibility
        'accessibility', 'a11y', 'ARIA', 'WAI-ARIA', 'screen reader',
        'semantic HTML', 'alt text', 'aria-label', 'aria-labelledby',
        'aria-describedby', 'role', 'tabindex', 'focus management',
        'keyboard navigation', 'color contrast', 'WCAG',

        // Testing
        'testing', 'unit test', 'integration test', 'E2E test',
        'Jest', 'React Testing Library', 'Enzyme', 'Cypress',
        'Playwright', 'Selenium', 'test runner', 'assertion',
        'mock', 'stub', 'spy', 'snapshot testing', 'coverage',

        // State Management
        'state management', 'global state', 'local state',
        'Zustand', 'Recoil', 'MobX', 'XState', 'Jotai', 'Valtio'
      ],

      // Backend Development - EXPANDED to 250+ terms
      'software-engineering-backend': [
        // Languages & Runtimes
        'Node.js', 'Node', 'JavaScript', 'TypeScript', 'Python',
        'Java', 'Go', 'Golang', 'Ruby', 'PHP', 'C#', 'Rust',
        '.NET', 'ASP.NET', 'Spring', 'Spring Boot', 'Django',
        'Flask', 'FastAPI', 'Express', 'Express.js', 'Koa', 'Hapi',
        'NestJS', 'Fastify', 'Rails', 'Ruby on Rails', 'Laravel',

        // API Design
        'API', 'Application Programming Interface', 'endpoint', 'route',
        'REST', 'RESTful', 'REST API', 'resource', 'CRUD',
        'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD',
        'HTTP method', 'HTTP verb', 'idempotent', 'safe method',
        'GraphQL', 'query', 'mutation', 'subscription', 'resolver',
        'schema', 'type', 'GraphQL schema', 'Apollo', 'Relay',
        'gRPC', 'Protocol Buffers', 'protobuf', 'RPC', 'SOAP',
        'WebSocket', 'Server-Sent Events', 'SSE', 'long polling',

        // HTTP & Networking
        'HTTP', 'HTTPS', 'HTTP/2', 'HTTP/3', 'status code',
        'request', 'response', 'header', 'body', 'cookie',
        'session', 'CORS', 'Cross-Origin Resource Sharing',
        'preflight', 'origin', 'same-origin policy', 'JSONP',
        'content negotiation', 'content type', 'accept header',
        'caching', 'Cache-Control', 'ETag', 'Last-Modified',
        'conditional request', 'compression', 'gzip', 'brotli',

        // Authentication & Authorization
        'authentication', 'authorization', 'OAuth', 'OAuth 2.0',
        'JWT', 'JSON Web Token', 'bearer token', 'access token',
        'refresh token', 'session management', 'cookie-based auth',
        'token-based auth', 'API key', 'basic auth', 'digest auth',
        'SSO', 'single sign-on', 'SAML', 'OpenID Connect', 'OIDC',
        'RBAC', 'role-based access control', 'ABAC',
        'attribute-based access control', 'permission', 'scope',
        'claim', 'identity provider', 'IdP', 'multi-factor authentication',
        'MFA', '2FA', 'two-factor authentication', 'TOTP',

        // Security
        'security', 'encryption', 'hashing', 'bcrypt', 'Argon2',
        'salt', 'pepper', 'SSL', 'TLS', 'certificate', 'HTTPS',
        'SQL injection', 'XSS', 'cross-site scripting', 'CSRF',
        'cross-site request forgery', 'clickjacking', 'session hijacking',
        'man-in-the-middle', 'MITM', 'brute force', 'DDoS',
        'rate limiting', 'throttling', 'OWASP', 'security header',
        'Content Security Policy', 'CSP', 'HSTS', 'X-Frame-Options',
        'sanitization', 'validation', 'input validation',
        'parameterized query', 'prepared statement', 'escaping',

        // Databases
        'database', 'SQL', 'NoSQL', 'relational database',
        'PostgreSQL', 'MySQL', 'MariaDB', 'Oracle', 'SQL Server',
        'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB',
        'ORM', 'object-relational mapping', 'query builder',
        'Sequelize', 'TypeORM', 'Prisma', 'Mongoose', 'SQLAlchemy',
        'Hibernate', 'Entity Framework', 'ActiveRecord',
        'migration', 'seed', 'transaction', 'connection pool',

        // Architecture Patterns
        'microservices', 'monolith', 'service-oriented architecture', 'SOA',
        'hexagonal architecture', 'clean architecture', 'onion architecture',
        'layered architecture', 'MVC', 'Model-View-Controller',
        'MVVM', 'MVP', 'domain-driven design', 'DDD',
        'event-driven architecture', 'CQRS', 'event sourcing',
        'saga pattern', 'circuit breaker', 'bulkhead', 'retry pattern',
        'API gateway', 'BFF', 'backend for frontend',

        // Message Queues & Streaming
        'message queue', 'message broker', 'pub-sub', 'publish-subscribe',
        'RabbitMQ', 'Kafka', 'Apache Kafka', 'Redis Pub/Sub',
        'SQS', 'SNS', 'ActiveMQ', 'ZeroMQ', 'NATS',
        'event streaming', 'stream processing', 'Kafka Streams',
        'consumer', 'producer', 'topic', 'partition', 'offset',
        'consumer group', 'backpressure', 'dead letter queue',

        // Caching
        'caching', 'cache', 'in-memory cache', 'distributed cache',
        'Redis', 'Memcached', 'cache strategy', 'cache-aside',
        'write-through', 'write-back', 'cache invalidation',
        'cache stampede', 'cache warming', 'TTL', 'time to live',

        // Async & Concurrency
        'asynchronous', 'async', 'await', 'promise', 'callback',
        'event loop', 'non-blocking I/O', 'concurrency', 'parallelism',
        'thread', 'multi-threading', 'process', 'worker', 'thread pool',
        'coroutine', 'goroutine', 'async/await', 'Future', 'Task',
        'green thread', 'event-driven', 'reactor pattern',

        // Error Handling & Logging
        'error handling', 'exception', 'try-catch', 'throw', 'error code',
        'logging', 'log level', 'debug', 'info', 'warn', 'error', 'fatal',
        'structured logging', 'log aggregation', 'ELK stack',
        'Elasticsearch', 'Logstash', 'Kibana', 'Splunk', 'Datadog',
        'distributed tracing', 'trace', 'span', 'Jaeger', 'Zipkin',
        'OpenTelemetry', 'APM', 'application performance monitoring',

        // Testing
        'testing', 'unit test', 'integration test', 'end-to-end test',
        'E2E test', 'functional test', 'load test', 'stress test',
        'TDD', 'test-driven development', 'BDD', 'behavior-driven development',
        'mock', 'stub', 'spy', 'fixture', 'test coverage',
        'Jest', 'Mocha', 'Chai', 'Supertest', 'pytest', 'JUnit',

        // Performance & Scalability
        'performance', 'optimization', 'scalability', 'horizontal scaling',
        'vertical scaling', 'load balancing', 'load balancer',
        'reverse proxy', 'CDN', 'edge computing', 'latency',
        'throughput', 'bottleneck', 'profiling', 'benchmarking',
        'connection pooling', 'resource pooling', 'lazy loading',

        // DevOps & Deployment
        'Docker', 'container', 'containerization', 'Dockerfile',
        'Docker Compose', 'Kubernetes', 'K8s', 'pod', 'deployment',
        'service', 'ingress', 'ConfigMap', 'Secret', 'namespace',
        'CI/CD', 'continuous integration', 'continuous deployment',
        'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI',
        'blue-green deployment', 'canary deployment', 'rolling update'
      ],

      // DevOps/SRE - EXPANDED to 250+ terms
      'devops-sre': [
        // Containerization
        'Docker', 'container', 'containerization', 'image', 'Dockerfile',
        'Docker Compose', 'multi-stage build', 'layer', 'registry',
        'Docker Hub', 'private registry', 'container runtime',
        'containerd', 'CRI-O', 'OCI', 'BuildKit',

        // Orchestration
        'Kubernetes', 'K8s', 'pod', 'deployment', 'ReplicaSet',
        'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'service',
        'ClusterIP', 'NodePort', 'LoadBalancer', 'ingress',
        'ingress controller', 'ConfigMap', 'Secret', 'PersistentVolume',
        'PersistentVolumeClaim', 'PV', 'PVC', 'StorageClass',
        'namespace', 'label', 'selector', 'annotation', 'taint', 'toleration',
        'affinity', 'anti-affinity', 'node selector', 'HPA',
        'Horizontal Pod Autoscaler', 'VPA', 'cluster autoscaler',
        'kubectl', 'Helm', 'chart', 'Kustomize', 'operator',
        'custom resource', 'CRD', 'admission controller', 'webhook',

        // Cloud Providers
        'AWS', 'Amazon Web Services', 'Azure', 'Microsoft Azure',
        'GCP', 'Google Cloud Platform', 'DigitalOcean', 'Linode',
        'EC2', 'S3', 'Lambda', 'ECS', 'EKS', 'Fargate', 'RDS',
        'DynamoDB', 'CloudFront', 'Route 53', 'VPC', 'IAM',
        'CloudFormation', 'CloudWatch', 'SNS', 'SQS',
        'Azure VM', 'Azure Kubernetes Service', 'AKS',
        'Google Compute Engine', 'GKE', 'Google Kubernetes Engine',

        // Infrastructure as Code
        'infrastructure as code', 'IaC', 'Terraform', 'Terragrunt',
        'Ansible', 'Puppet', 'Chef', 'SaltStack', 'CloudFormation',
        'ARM template', 'Bicep', 'Pulumi', 'CDK', 'Cloud Development Kit',
        'declarative', 'imperative', 'idempotent', 'state file',
        'provider', 'resource', 'module', 'variable', 'output',
        'plan', 'apply', 'destroy', 'drift detection',

        // CI/CD
        'CI/CD', 'continuous integration', 'continuous delivery',
        'continuous deployment', 'pipeline', 'build', 'test', 'deploy',
        'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI',
        'Travis CI', 'Azure DevOps', 'TeamCity', 'Bamboo',
        'ArgoCD', 'Flux', 'GitOps', 'Spinnaker', 'Tekton',
        'webhook', 'trigger', 'artifact', 'build agent', 'runner',

        // Monitoring & Observability
        'monitoring', 'observability', 'metrics', 'logs', 'traces',
        'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'Splunk',
        'ELK stack', 'Elasticsearch', 'Logstash', 'Kibana', 'Fluentd',
        'Loki', 'Jaeger', 'Zipkin', 'OpenTelemetry', 'telemetry',
        'instrumentation', 'metric scraping', 'PromQL', 'alert',
        'alerting', 'alert manager', 'PagerDuty', 'Opsgenie',
        'dashboard', 'visualization', 'time series', 'cardinality',

        // Networking
        'networking', 'TCP', 'UDP', 'IP', 'subnet', 'CIDR',
        'load balancer', 'reverse proxy', 'forward proxy', 'Nginx',
        'HAProxy', 'Traefik', 'Envoy', 'service mesh', 'Istio',
        'Linkerd', 'Consul', 'DNS', 'firewall', 'security group',
        'network policy', 'ingress', 'egress', 'VPN', 'VPC',
        'peering', 'transit gateway', 'NAT gateway', 'bastion host',

        // Security
        'security', 'vulnerability', 'CVE', 'security scanning',
        'SAST', 'DAST', 'SCA', 'container scanning', 'Trivy',
        'Snyk', 'Aqua Security', 'Falco', 'secret management',
        'Vault', 'HashiCorp Vault', 'AWS Secrets Manager',
        'encryption', 'TLS', 'certificate', 'cert-manager',
        'Let\'s Encrypt', 'mTLS', 'zero trust', 'RBAC',
        'role-based access control', 'policy', 'OPA', 'Open Policy Agent',

        // Deployment Strategies
        'deployment strategy', 'blue-green deployment', 'canary deployment',
        'rolling update', 'rolling deployment', 'A/B testing',
        'feature flag', 'dark launch', 'traffic splitting',
        'progressive delivery', 'rollback', 'zero-downtime deployment',

        // Site Reliability
        'SRE', 'site reliability engineering', 'SLA', 'service level agreement',
        'SLO', 'service level objective', 'SLI', 'service level indicator',
        'error budget', 'toil', 'reliability', 'availability',
        'uptime', 'downtime', 'incident', 'incident management',
        'postmortem', 'blameless postmortem', 'on-call', 'pager',
        'runbook', 'playbook', 'chaos engineering', 'Chaos Monkey',

        // Version Control
        'git', 'GitHub', 'GitLab', 'Bitbucket', 'version control',
        'VCS', 'commit', 'branch', 'merge', 'rebase', 'cherry-pick',
        'pull request', 'merge request', 'code review', 'diff',
        'conflict', 'merge conflict', 'stash', 'tag', 'release',

        // Configuration Management
        'configuration management', 'environment variable', 'env var',
        'secrets', 'config file', 'YAML', 'JSON', 'TOML',
        'feature flag', 'feature toggle', 'LaunchDarkly', 'Split',

        // Performance
        'performance', 'latency', 'throughput', 'bottleneck',
        'profiling', 'benchmarking', 'load testing', 'stress testing',
        'Apache JMeter', 'k6', 'Gatling', 'Locust', 'Artillery',
        'scalability', 'horizontal scaling', 'vertical scaling',
        'auto-scaling', 'elasticity', 'capacity planning'
      ],

      // Cloud Architecture - EXPANDED to 200+ terms
      'cloud-architecture': [
        // Cloud Fundamentals
        'cloud computing', 'public cloud', 'private cloud', 'hybrid cloud',
        'multi-cloud', 'cloud-native', 'SaaS', 'PaaS', 'IaaS',
        'Software as a Service', 'Platform as a Service',
        'Infrastructure as a Service', 'FaaS', 'Function as a Service',

        // AWS Services
        'AWS', 'Amazon Web Services', 'EC2', 'Elastic Compute Cloud',
        'S3', 'Simple Storage Service', 'Lambda', 'serverless',
        'API Gateway', 'DynamoDB', 'RDS', 'Aurora', 'Redshift',
        'ElastiCache', 'CloudFront', 'Route 53', 'VPC', 'Virtual Private Cloud',
        'ECS', 'Elastic Container Service', 'EKS', 'Elastic Kubernetes Service',
        'Fargate', 'EBS', 'Elastic Block Store', 'EFS', 'Elastic File System',
        'SNS', 'Simple Notification Service', 'SQS', 'Simple Queue Service',
        'Step Functions', 'EventBridge', 'CloudWatch', 'IAM',
        'Identity and Access Management', 'CloudFormation', 'CDK',
        'Elastic Beanstalk', 'Amplify', 'AppSync', 'Cognito',
        'Kinesis', 'Glue', 'Athena', 'EMR', 'SageMaker',

        // Azure Services
        'Azure', 'Microsoft Azure', 'Azure VM', 'Virtual Machine',
        'Azure Storage', 'Blob Storage', 'Azure Functions',
        'Azure App Service', 'Azure SQL Database', 'Cosmos DB',
        'Azure Kubernetes Service', 'AKS', 'Azure DevOps',
        'Azure Active Directory', 'Azure Monitor', 'Application Insights',
        'Azure Service Bus', 'Event Grid', 'Event Hubs',
        'Azure Container Instances', 'Azure Redis Cache',

        // GCP Services
        'GCP', 'Google Cloud Platform', 'Compute Engine', 'Cloud Storage',
        'Cloud Functions', 'Cloud Run', 'App Engine',
        'Google Kubernetes Engine', 'GKE', 'Cloud SQL', 'Firestore',
        'BigQuery', 'Cloud Pub/Sub', 'Cloud Dataflow', 'Cloud Dataproc',
        'Cloud Spanner', 'Memorystore', 'Cloud CDN', 'Cloud DNS',
        'Cloud Load Balancing', 'Cloud IAM', 'Cloud Build',

        // Architecture Patterns
        'serverless', 'serverless architecture', 'event-driven',
        'microservices', 'service-oriented architecture', 'SOA',
        'API gateway', 'API management', 'service mesh',
        'distributed system', 'distributed architecture',
        'message-driven', 'event sourcing', 'CQRS',
        'twelve-factor app', 'cloud-native architecture',

        // Scalability & Performance
        'auto-scaling', 'auto scaling', 'horizontal scaling', 'vertical scaling',
        'elastic scaling', 'elasticity', 'load balancing', 'load balancer',
        'Application Load Balancer', 'Network Load Balancer',
        'CDN', 'Content Delivery Network', 'edge location', 'edge computing',
        'caching', 'cache layer', 'distributed cache',
        'performance optimization', 'latency', 'throughput',

        // Storage & Databases
        'object storage', 'block storage', 'file storage',
        'blob storage', 'data lake', 'data warehouse',
        'NoSQL', 'relational database', 'key-value store',
        'document database', 'column-family store', 'graph database',
        'time-series database', 'in-memory database',
        'database replication', 'read replica', 'sharding',

        // Networking
        'VPC', 'Virtual Private Cloud', 'subnet', 'public subnet',
        'private subnet', 'internet gateway', 'NAT gateway',
        'VPN', 'Direct Connect', 'ExpressRoute', 'Cloud Interconnect',
        'peering', 'VPC peering', 'transit gateway', 'firewall',
        'security group', 'network ACL', 'route table', 'DNS',

        // Security
        'security', 'IAM', 'identity management', 'access control',
        'role', 'policy', 'permission', 'principle of least privilege',
        'encryption', 'encryption at rest', 'encryption in transit',
        'KMS', 'Key Management Service', 'secrets management',
        'certificate', 'SSL', 'TLS', 'firewall', 'WAF',
        'Web Application Firewall', 'DDoS protection', 'Shield',
        'compliance', 'audit', 'logging', 'CloudTrail',

        // High Availability & DR
        'high availability', 'HA', 'fault tolerance', 'disaster recovery',
        'DR', 'backup', 'snapshot', 'replication', 'failover',
        'multi-AZ', 'multi-region', 'availability zone', 'region',
        'RPO', 'recovery point objective', 'RTO', 'recovery time objective',

        // Monitoring & Logging
        'monitoring', 'observability', 'CloudWatch', 'Azure Monitor',
        'Stackdriver', 'metrics', 'logs', 'traces', 'alarm',
        'alert', 'dashboard', 'log aggregation', 'log analysis',

        // Cost Optimization
        'cost optimization', 'cost management', 'billing', 'pricing',
        'reserved instance', 'spot instance', 'savings plan',
        'right-sizing', 'cost allocation', 'budget', 'cost explorer',

        // Infrastructure as Code
        'Infrastructure as Code', 'IaC', 'CloudFormation', 'Terraform',
        'ARM template', 'Deployment Manager', 'template', 'stack',
        'resource', 'parameter', 'output', 'drift detection'
      ],

      // Data Science/ML - EXPANDED to 200+ terms
      'data-science-ml': [
        // Programming & Tools
        'Python', 'R', 'Julia', 'Jupyter', 'Jupyter Notebook',
        'pandas', 'NumPy', 'SciPy', 'matplotlib', 'seaborn',
        'scikit-learn', 'sklearn', 'TensorFlow', 'PyTorch',
        'Keras', 'JAX', 'XGBoost', 'LightGBM', 'CatBoost',

        // Machine Learning Fundamentals
        'machine learning', 'ML', 'artificial intelligence', 'AI',
        'supervised learning', 'unsupervised learning',
        'semi-supervised learning', 'reinforcement learning',
        'transfer learning', 'few-shot learning', 'zero-shot learning',
        'online learning', 'batch learning', 'active learning',

        // Model Types
        'classification', 'regression', 'clustering', 'dimensionality reduction',
        'anomaly detection', 'outlier detection', 'time series',
        'forecasting', 'recommendation system', 'collaborative filtering',
        'content-based filtering', 'ranking', 'ensemble method',

        // Algorithms
        'linear regression', 'logistic regression', 'polynomial regression',
        'decision tree', 'random forest', 'gradient boosting',
        'support vector machine', 'SVM', 'k-nearest neighbors', 'KNN',
        'naive Bayes', 'k-means', 'DBSCAN', 'hierarchical clustering',
        'PCA', 'principal component analysis', 't-SNE', 'UMAP',

        // Deep Learning
        'deep learning', 'neural network', 'artificial neural network', 'ANN',
        'feedforward network', 'multilayer perceptron', 'MLP',
        'convolutional neural network', 'CNN', 'convolution',
        'pooling', 'max pooling', 'average pooling',
        'recurrent neural network', 'RNN', 'LSTM',
        'long short-term memory', 'GRU', 'gated recurrent unit',
        'transformer', 'attention', 'self-attention', 'multi-head attention',
        'BERT', 'GPT', 'generative pre-trained transformer',
        'autoencoder', 'variational autoencoder', 'VAE',
        'GAN', 'generative adversarial network', 'discriminator', 'generator',

        // Training & Optimization
        'training', 'training data', 'validation', 'validation set',
        'test set', 'train-test split', 'cross-validation', 'k-fold',
        'epoch', 'batch', 'mini-batch', 'batch size',
        'learning rate', 'optimizer', 'gradient descent',
        'stochastic gradient descent', 'SGD', 'Adam', 'RMSprop',
        'momentum', 'learning rate schedule', 'decay',
        'backpropagation', 'forward pass', 'backward pass',
        'gradient', 'loss function', 'cost function', 'objective function',

        // Loss Functions & Metrics
        'mean squared error', 'MSE', 'mean absolute error', 'MAE',
        'cross-entropy', 'binary cross-entropy', 'categorical cross-entropy',
        'accuracy', 'precision', 'recall', 'F1 score', 'F-measure',
        'confusion matrix', 'true positive', 'false positive',
        'true negative', 'false negative', 'ROC curve', 'AUC',
        'area under curve', 'precision-recall curve',

        // Regularization
        'regularization', 'L1 regularization', 'L2 regularization',
        'Lasso', 'Ridge', 'Elastic Net', 'dropout', 'early stopping',
        'batch normalization', 'layer normalization', 'weight decay',

        // Model Issues
        'overfitting', 'underfitting', 'bias', 'variance',
        'bias-variance tradeoff', 'generalization', 'capacity',
        'model complexity', 'curse of dimensionality',

        // Feature Engineering
        'feature', 'feature engineering', 'feature selection',
        'feature extraction', 'feature scaling', 'normalization',
        'standardization', 'encoding', 'one-hot encoding',
        'label encoding', 'ordinal encoding', 'target encoding',
        'missing value', 'imputation', 'outlier', 'binning',

        // Natural Language Processing
        'NLP', 'natural language processing', 'tokenization',
        'stemming', 'lemmatization', 'word embedding', 'Word2Vec',
        'GloVe', 'FastText', 'embedding', 'vocabulary', 'corpus',
        'TF-IDF', 'bag of words', 'n-gram', 'language model',
        'sentiment analysis', 'named entity recognition', 'NER',
        'part-of-speech tagging', 'POS tagging', 'dependency parsing',

        // Computer Vision
        'computer vision', 'image classification', 'object detection',
        'image segmentation', 'semantic segmentation', 'instance segmentation',
        'edge detection', 'feature detection', 'image preprocessing',
        'data augmentation', 'augmentation', 'flip', 'rotation',
        'YOLO', 'R-CNN', 'Faster R-CNN', 'Mask R-CNN', 'U-Net',

        // Model Deployment
        'model deployment', 'inference', 'prediction', 'serving',
        'model serialization', 'pickle', 'ONNX', 'TensorFlow Serving',
        'MLflow', 'model registry', 'A/B testing', 'monitoring',
        'model drift', 'data drift', 'concept drift', 'retraining',

        // Big Data & Processing
        'big data', 'distributed computing', 'Spark', 'Apache Spark',
        'PySpark', 'Hadoop', 'MapReduce', 'Dask', 'Ray',
        'data pipeline', 'ETL', 'data warehouse', 'data lake'
      ],

      // UI/UX Design - EXPANDED to 200+ terms
      'ui-ux-design': [
        // Design Fundamentals
        'user interface', 'UI', 'user experience', 'UX', 'UI/UX',
        'design', 'visual design', 'interaction design', 'IxD',
        'information architecture', 'IA', 'user-centered design',
        'human-computer interaction', 'HCI', 'usability',

        // Design Tools
        'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Framer',
        'Photoshop', 'Illustrator', 'After Effects', 'Principle',
        'ProtoPie', 'Axure', 'Balsamiq', 'Zeplin', 'Abstract',

        // Design Process
        'wireframe', 'wireframing', 'mockup', 'prototype', 'prototyping',
        'user research', 'user testing', 'usability testing',
        'A/B testing', 'card sorting', 'tree testing',
        'persona', 'user persona', 'empathy map', 'journey map',
        'user flow', 'task flow', 'user story', 'storyboard',
        'design sprint', 'ideation', 'brainstorming', 'iteration',

        // Visual Design
        'typography', 'color theory', 'color palette', 'contrast',
        'hierarchy', 'visual hierarchy', 'white space', 'negative space',
        'grid system', 'layout', 'composition', 'alignment',
        'proximity', 'balance', 'symmetry', 'asymmetry',
        'scale', 'proportion', 'golden ratio', 'rule of thirds',

        // Design Systems
        'design system', 'component library', 'pattern library',
        'style guide', 'design tokens', 'atomic design',
        'design language', 'brand guidelines', 'UI kit',

        // Interaction Design
        'interaction', 'microinteraction', 'animation', 'transition',
        'hover state', 'active state', 'focus state', 'loading state',
        'feedback', 'affordance', 'signifier', 'constraint',
        'mapping', 'consistency', 'visibility', 'learnability',

        // Accessibility
        'accessibility', 'a11y', 'WCAG', 'ARIA', 'screen reader',
        'keyboard navigation', 'color contrast', 'alt text',
        'inclusive design', 'universal design', 'assistive technology',

        // UI Components
        'button', 'input', 'form', 'dropdown', 'select',
        'checkbox', 'radio button', 'toggle', 'switch',
        'modal', 'dialog', 'tooltip', 'popover', 'menu',
        'navigation', 'navbar', 'sidebar', 'breadcrumb',
        'card', 'carousel', 'accordion', 'tabs', 'table',
        'pagination', 'infinite scroll', 'search bar',

        // Mobile Design
        'mobile design', 'responsive design', 'adaptive design',
        'mobile-first', 'touch target', 'gesture', 'swipe',
        'tap', 'pinch', 'zoom', 'scroll', 'hamburger menu',
        'bottom sheet', 'floating action button', 'FAB',

        // Design Principles
        'Gestalt principles', 'proximity principle', 'similarity',
        'closure', 'continuity', 'figure-ground', 'common fate',
        'Fitts law', 'Hicks law', 'Miller\'s law', 'Jakob\'s law',
        'aesthetic-usability effect', 'cognitive load',

        // UX Research
        'research', 'qualitative research', 'quantitative research',
        'interview', 'survey', 'questionnaire', 'focus group',
        'observation', 'ethnography', 'diary study',
        'analytics', 'heatmap', 'click tracking', 'session recording',
        'KPI', 'metrics', 'conversion rate', 'bounce rate',

        // Information Architecture
        'sitemap', 'navigation structure', 'taxonomy', 'ontology',
        'metadata', 'labeling', 'search', 'findability',
        'content strategy', 'content inventory', 'content audit',

        // Prototyping
        'low-fidelity', 'lo-fi', 'high-fidelity', 'hi-fi',
        'paper prototype', 'clickable prototype', 'interactive prototype',
        'proof of concept', 'MVP', 'minimum viable product',

        // Design Handoff
        'redline', 'specs', 'specifications', 'design handoff',
        'developer handoff', 'design QA', 'design review',
        'design critique', 'feedback', 'annotation'
      ],

      // Cybersecurity - EXPANDED to 200+ terms
      'cybersecurity': [
        // Security Fundamentals
        'security', 'cybersecurity', 'information security', 'InfoSec',
        'confidentiality', 'integrity', 'availability', 'CIA triad',
        'threat', 'vulnerability', 'risk', 'exploit', 'attack',
        'threat actor', 'threat model', 'attack surface', 'attack vector',

        // Authentication & Access
        'authentication', 'authorization', 'access control', 'identity',
        'multi-factor authentication', 'MFA', 'two-factor authentication', '2FA',
        'single sign-on', 'SSO', 'OAuth', 'OpenID Connect', 'SAML',
        'LDAP', 'Active Directory', 'Kerberos', 'biometric',
        'password', 'passphrase', 'password policy', 'password hash',

        // Cryptography
        'cryptography', 'encryption', 'decryption', 'cipher',
        'symmetric encryption', 'asymmetric encryption', 'public key',
        'private key', 'key pair', 'AES', 'RSA', 'ECC',
        'hashing', 'hash function', 'MD5', 'SHA-1', 'SHA-256',
        'bcrypt', 'scrypt', 'Argon2', 'salt', 'HMAC',
        'digital signature', 'certificate', 'PKI', 'public key infrastructure',
        'certificate authority', 'CA', 'SSL', 'TLS', 'HTTPS',

        // Network Security
        'network security', 'firewall', 'packet filtering', 'stateful firewall',
        'next-generation firewall', 'NGFW', 'IDS', 'intrusion detection system',
        'IPS', 'intrusion prevention system', 'SIEM', 'security information',
        'VPN', 'virtual private network', 'IPsec', 'WireGuard',
        'network segmentation', 'VLAN', 'DMZ', 'demilitarized zone',
        'zero trust', 'least privilege', 'defense in depth',

        // Web Security
        'web security', 'OWASP', 'OWASP Top 10', 'web application security',
        'SQL injection', 'SQLi', 'cross-site scripting', 'XSS',
        'reflected XSS', 'stored XSS', 'DOM-based XSS',
        'cross-site request forgery', 'CSRF', 'XSRF',
        'session hijacking', 'session fixation', 'clickjacking',
        'security header', 'Content Security Policy', 'CSP',
        'X-Frame-Options', 'X-XSS-Protection', 'HSTS',
        'HTTP Strict Transport Security', 'CORS', 'same-origin policy',
        'path traversal', 'directory traversal', 'file inclusion',
        'remote code execution', 'RCE', 'command injection',
        'XXE', 'XML external entity', 'server-side request forgery', 'SSRF',
        'insecure deserialization', 'broken authentication',

        // Penetration Testing
        'penetration testing', 'pen test', 'pentesting', 'ethical hacking',
        'white hat', 'black hat', 'grey hat', 'red team', 'blue team',
        'vulnerability assessment', 'security audit', 'security testing',
        'reconnaissance', 'enumeration', 'scanning', 'exploitation',
        'post-exploitation', 'privilege escalation', 'lateral movement',
        'persistence', 'covering tracks', 'Metasploit', 'Burp Suite',
        'Nmap', 'Wireshark', 'Kali Linux', 'social engineering',

        // Malware
        'malware', 'virus', 'worm', 'trojan', 'trojan horse',
        'ransomware', 'spyware', 'adware', 'rootkit', 'backdoor',
        'keylogger', 'botnet', 'C2', 'command and control',
        'zero-day', 'exploit kit', 'payload', 'dropper', 'loader',

        // Incident Response
        'incident response', 'IR', 'security incident', 'breach',
        'data breach', 'incident handling', 'forensics',
        'digital forensics', 'incident detection', 'containment',
        'eradication', 'recovery', 'post-incident', 'lessons learned',
        'playbook', 'runbook', 'SOC', 'security operations center',

        // Security Tools & Technologies
        'antivirus', 'anti-malware', 'endpoint protection', 'EDR',
        'endpoint detection and response', 'WAF', 'web application firewall',
        'DLP', 'data loss prevention', 'CASB', 'cloud access security broker',
        'SIEM', 'log management', 'correlation', 'security monitoring',
        'threat intelligence', 'IOC', 'indicator of compromise',

        // Compliance & Standards
        'compliance', 'regulation', 'GDPR', 'HIPAA', 'PCI-DSS',
        'SOC 2', 'ISO 27001', 'NIST', 'CIS', 'security framework',
        'security control', 'audit', 'risk assessment', 'risk management'
      ],

      // Mobile Development - EXPANDED to 200+ terms
      'mobile-development': [
        // Mobile Platforms
        'iOS', 'Android', 'mobile app', 'mobile application',
        'native app', 'hybrid app', 'cross-platform', 'responsive',
        'mobile-first', 'mobile web', 'progressive web app', 'PWA',
        'Apple', 'Google Play', 'App Store', 'TestFlight',

        // iOS Development
        'Swift', 'Objective-C', 'Xcode', 'SwiftUI', 'UIKit',
        'Cocoa Touch', 'Foundation', 'Core Data', 'Core Animation',
        'Core Graphics', 'Auto Layout', 'Storyboard', 'Interface Builder',
        'view controller', 'UIViewController', 'UIView', 'UITableView',
        'UICollectionView', 'navigation controller', 'tab bar controller',
        'delegation', 'protocol', 'extension', 'optional', 'guard',
        'closure', 'completion handler', 'Grand Central Dispatch', 'GCD',
        'dispatch queue', 'async', 'await', 'combine', 'reactive',
        'App Clip', 'Widget', 'WidgetKit', 'SiriKit', 'ARKit',
        'Core ML', 'Create ML', 'Metal', 'SceneKit', 'SpriteKit',
        'CocoaPods', 'Carthage', 'Swift Package Manager', 'SPM',
        'provisioning profile', 'certificate', 'bundle identifier',
        'TestFlight', 'App Store Connect', 'iTunes Connect',

        // Android Development
        'Kotlin', 'Java', 'Android Studio', 'Jetpack', 'Jetpack Compose',
        'Material Design', 'Material You', 'Android SDK', 'NDK',
        'activity', 'fragment', 'intent', 'service', 'broadcast receiver',
        'content provider', 'view', 'layout', 'LinearLayout', 'RelativeLayout',
        'ConstraintLayout', 'RecyclerView', 'adapter', 'ViewHolder',
        'lifecycle', 'LiveData', 'ViewModel', 'MVVM', 'MVC', 'MVP',
        'Room', 'SQLite', 'SharedPreferences', 'Data Store',
        'coroutine', 'Flow', 'suspend function', 'dispatcher',
        'Gradle', 'build.gradle', 'AndroidManifest', 'resources',
        'drawable', 'string resource', 'dimension', 'style', 'theme',
        'notification', 'push notification', 'FCM', 'Firebase Cloud Messaging',
        'WorkManager', 'JobScheduler', 'AlarmManager', 'background task',
        'Retrofit', 'OkHttp', 'Gson', 'Hilt', 'Dagger', 'dependency injection',
        'Play Store', 'Google Play Console', 'APK', 'AAB', 'Android App Bundle',
        'ProGuard', 'R8', 'obfuscation', 'minification',

        // Cross-Platform Frameworks
        'React Native', 'Flutter', 'Ionic', 'Xamarin', 'Cordova',
        'PhoneGap', 'NativeScript', 'Capacitor', 'Expo',
        'Dart', 'JSX', 'Metro bundler', 'Flipper', 'Hot Reload',
        'widget', 'StatelessWidget', 'StatefulWidget', 'BuildContext',
        'provider', 'BLoC', 'GetX', 'Riverpod', 'Redux',
        'navigation', 'routing', 'deep linking', 'universal link',
        'bridge', 'native module', 'platform channel', 'method channel',

        // Mobile UI/UX
        'touch', 'gesture', 'swipe', 'tap', 'long press', 'pinch', 'zoom',
        'pull to refresh', 'infinite scroll', 'bottom sheet', 'modal',
        'drawer', 'hamburger menu', 'tab bar', 'navigation bar',
        'floating action button', 'FAB', 'snackbar', 'toast',
        'card', 'list', 'grid', 'carousel', 'slider', 'picker',
        'responsive design', 'adaptive layout', 'screen size', 'screen density',
        'DPI', 'PPI', 'retina', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi',
        'dark mode', 'light mode', 'theme', 'color scheme',
        'accessibility', 'VoiceOver', 'TalkBack', 'screen reader',
        'haptic feedback', 'vibration', 'sound effect',

        // Mobile Architecture
        'MVVM', 'MVC', 'MVP', 'VIPER', 'Clean Architecture',
        'repository pattern', 'use case', 'domain layer', 'data layer',
        'presentation layer', 'dependency injection', 'service locator',
        'singleton', 'factory', 'observer', 'delegation',

        // State Management
        'state management', 'Redux', 'MobX', 'Vuex', 'Context API',
        'provider', 'BLoC', 'Riverpod', 'GetX', 'Recoil',
        'global state', 'local state', 'state persistence',
        'immutable', 'mutable', 'reducer', 'action', 'dispatch',

        // Data & Storage
        'local storage', 'persistent storage', 'cache', 'offline mode',
        'SQLite', 'Realm', 'Core Data', 'Room', 'Hive',
        'SharedPreferences', 'UserDefaults', 'AsyncStorage',
        'IndexedDB', 'WebSQL', 'keychain', 'keystore',
        'encryption', 'secure storage', 'biometric authentication',
        'Face ID', 'Touch ID', 'fingerprint', 'passcode',

        // Networking
        'HTTP', 'HTTPS', 'REST API', 'GraphQL', 'WebSocket',
        'Retrofit', 'Alamofire', 'URLSession', 'Fetch API',
        'API call', 'endpoint', 'request', 'response', 'status code',
        'JSON', 'XML', 'parsing', 'serialization', 'deserialization',
        'network layer', 'network manager', 'API client',
        'timeout', 'retry', 'error handling', 'offline support',

        // Performance
        'performance', 'optimization', 'memory management', 'memory leak',
        'retain cycle', 'weak reference', 'strong reference',
        'garbage collection', 'ARC', 'automatic reference counting',
        'lazy loading', 'image caching', 'bitmap', 'vector',
        'FPS', 'frame rate', 'frame drop', 'jank', 'smooth scrolling',
        'startup time', 'app launch', 'cold start', 'warm start',
        'battery optimization', 'power consumption', 'background mode',

        // Testing
        'unit test', 'UI test', 'integration test', 'snapshot test',
        'XCTest', 'JUnit', 'Espresso', 'Detox', 'Appium',
        'test automation', 'continuous testing', 'test coverage',
        'mock', 'stub', 'test double', 'assertion',
        'TDD', 'test-driven development', 'BDD',

        // DevOps & Distribution
        'CI/CD', 'continuous integration', 'continuous deployment',
        'Jenkins', 'GitHub Actions', 'Bitrise', 'CircleCI', 'Travis CI',
        'Fastlane', 'code signing', 'provisioning', 'certificate',
        'beta testing', 'internal testing', 'alpha', 'beta', 'production',
        'app distribution', 'over the air', 'OTA', 'update',
        'version control', 'semantic versioning', 'build number',
        'release notes', 'changelog', 'app review', 'submission',

        // Analytics & Monitoring
        'analytics', 'crash reporting', 'error tracking', 'logging',
        'Firebase Analytics', 'Google Analytics', 'Mixpanel', 'Amplitude',
        'Crashlytics', 'Sentry', 'Bugsnag', 'AppCenter',
        'user behavior', 'event tracking', 'funnel', 'retention',
        'DAU', 'MAU', 'session', 'engagement', 'conversion',

        // Security
        'security', 'authentication', 'authorization', 'OAuth',
        'JWT', 'token', 'session', 'SSL pinning', 'certificate pinning',
        'encryption', 'decryption', 'hashing', 'salting',
        'secure storage', 'keychain', 'keystore', 'biometric',
        'jailbreak detection', 'root detection', 'code obfuscation',
        'reverse engineering', 'tamper detection',

        // Mobile-Specific Features
        'camera', 'photo library', 'gallery', 'image picker',
        'GPS', 'location', 'geolocation', 'map', 'MapKit', 'Google Maps',
        'sensor', 'accelerometer', 'gyroscope', 'magnetometer',
        'Bluetooth', 'BLE', 'NFC', 'Wi-Fi', 'cellular',
        'contacts', 'calendar', 'reminder', 'health data', 'HealthKit',
        'payment', 'in-app purchase', 'subscription', 'StoreKit',
        'Google Play Billing', 'Apple Pay', 'Google Pay',
        'barcode scanner', 'QR code', 'AR', 'augmented reality',
        'VR', 'virtual reality', 'machine learning', 'ML Kit',
        'voice recognition', 'speech to text', 'text to speech'
      ]
    };

    const domainTerms = domainVocabularies[domainId] || [];
    const allTerms = [...baseTerms, ...domainTerms];

    console.log(`📚 Loaded ${allTerms.length} vocabulary terms for domain: ${domainId || 'general'}`);
    return allTerms;
  }

  /**
   * Transcribe audio from buffer
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} encoding - Audio encoding (LINEAR16, FLAC, WEBM_OPUS, etc.)
   * @param {number} sampleRateHertz - Sample rate (e.g., 16000, 48000)
   * @param {string} languageCode - Language code (default: en-US)
   * @param {string} domainId - Optional interview domain ID for context-specific vocabulary
   * @returns {Promise<Object>} Transcription result with text and confidence
   */
  async transcribeAudio(audioBuffer, encoding = 'WEBM_OPUS', sampleRateHertz = 48000, languageCode = 'en-US', domainId = null) {
    if (!this.isConfigured) {
      throw new Error('Speech-to-Text is not configured');
    }

    // Try multiple encoding strategies with fallback
    // WEBM_OPUS first as it has highest success rate based on logs
    const encodingStrategies = [
      { encoding: 'WEBM_OPUS', sampleRate: 48000, description: 'WEBM_OPUS with 48kHz' },
      { encoding: 'OGG_OPUS', sampleRate: 48000, description: 'OGG_OPUS with 48kHz' },
      { encoding: 'WEBM_OPUS', sampleRate: 16000, description: 'WEBM_OPUS with 16kHz' }
    ];

    let lastError = null;

    for (let i = 0; i < encodingStrategies.length; i++) {
      const strategy = encodingStrategies[i];

      try {
        console.log(`🎤 Attempt ${i + 1}/${encodingStrategies.length}: ${strategy.description}`);

        const result = await this.transcribeWithConfig(
          audioBuffer,
          strategy.encoding,
          strategy.sampleRate || sampleRateHertz,
          languageCode,
          domainId
        );

        // Check if we got a valid transcription
        if (result.transcript && result.transcript.length > 0 && result.confidence > 0.5) {
          console.log(`✅ Success with ${strategy.description}!`);
          return result;
        } else if (result.transcript && result.transcript.length > 0) {
          console.log(`⚠️ Low confidence (${(result.confidence * 100).toFixed(2)}%) with ${strategy.description}, trying next...`);
          // Keep this as a fallback if nothing else works
          if (!lastError) {
            lastError = result;
          }
        }
      } catch (error) {
        console.log(`❌ Failed with ${strategy.description}: ${error.message}`);
        lastError = error;
      }
    }

    // If we have a low confidence result, return it
    if (lastError && lastError.transcript) {
      console.log(`⚠️ Returning best available transcription (low confidence)`);
      return lastError;
    }

    throw new Error('Failed to transcribe audio with all encoding strategies');
  }

  /**
   * Get or create recognizer for v2 API
   * V2 requires a persistent "recognizer" resource
   */
  async getOrCreateRecognizer() {
    if (!this.clientV2 || !this.v2Available) {
      throw new Error('V2 client not available');
    }

    const recognizerPath = this.clientV2.recognizerPath(
      this.projectId,
      this.location,
      this.recognizerId
    );

    try {
      // Try to get existing recognizer
      await this.clientV2.getRecognizer({ name: recognizerPath });
      return recognizerPath;
    } catch (error) {
      // Recognizer doesn't exist, create it
      console.log('📝 Creating new v2 recognizer...');

      const parent = this.clientV2.locationPath(this.projectId, this.location);

      const [operation] = await this.clientV2.createRecognizer({
        parent: parent,
        recognizerId: this.recognizerId,
        recognizer: {
          languageCodes: ['en-US'],
          model: 'chirp' // Latest Chirp model - uses most recent version automatically (5-10% better accuracy)
        }
      });

      await operation.promise();
      console.log('✅ V2 recognizer created successfully');
      return recognizerPath;
    }
  }

  /**
   * Transcribe with v2 API - Sync method for small files (5-10% better accuracy than v1)
   */
  async transcribeWithV2(audioBuffer, encoding, sampleRateHertz, languageCode, domainId = null) {
    if (!this.v2Available) {
      throw new Error('V2 API not available');
    }

    try {
      const recognizerPath = await this.getOrCreateRecognizer();

      // Get domain-specific vocabulary
      const vocabularyPhrases = domainId ? this.getDomainVocabulary(domainId) : [
        'database', 'schema', 'table', 'index', 'query',
        'API', 'authentication', 'authorization', 'performance'
      ];

      if (domainId) {
        console.log(`📚 V2: Using domain-specific vocabulary for: ${domainId} (${vocabularyPhrases.length} terms)`);
      }

      // V2 config structure (different from v1)
      const config = {
        autoDecodingConfig: {}, // Let v2 auto-detect encoding
        features: {
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableWordConfidence: true
        },
        adaptation: {
          phraseSet: {
            phrases: vocabularyPhrases.map(phrase => ({ value: phrase, boost: 20 }))
          }
        }
      };

      const request = {
        recognizer: recognizerPath,
        config: config,
        content: audioBuffer
      };

      console.log('🎤 V2: Sending recognition request...');
      const [response] = await this.clientV2.recognize(request);

      // Process v2 response (similar structure to v1)
      if (!response.results || response.results.length === 0) {
        throw new Error('No transcription results from v2');
      }

      const result = this.processTranscriptionResponse(response);

      // Apply post-processing corrections
      if (domainId && result.transcript) {
        const correctedTranscript = this.correctCommonTranscriptionErrors(result.transcript, domainId);
        if (correctedTranscript !== result.transcript) {
          console.log(`🔧 Applied transcription corrections for ${domainId}`);
          result.transcript = correctedTranscript;
        }
      }

      console.log('✅ V2 transcription successful');
      return result;

    } catch (error) {
      console.error('❌ V2 transcription failed:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe with v2 API - Batch method for large files (>10MB)
   * Uses GCS and long-running operation like v1, but with chirp model (5-10% better accuracy)
   */
  async transcribeWithV2Batch(gcsUri, encoding, sampleRateHertz, languageCode, bufferSizeInMB, domainId = null) {
    if (!this.v2Available) {
      throw new Error('V2 API not available');
    }

    try {
      const recognizerPath = await this.getOrCreateRecognizer();

      // Get domain-specific vocabulary
      const vocabularyPhrases = domainId ? this.getDomainVocabulary(domainId) : [
        'database', 'schema', 'table', 'index', 'query',
        'API', 'authentication', 'authorization', 'performance'
      ];

      if (domainId) {
        console.log(`📚 V2 Batch: Using domain-specific vocabulary for: ${domainId} (${vocabularyPhrases.length} terms)`);
      }

      // V2 batch config
      const config = {
        autoDecodingConfig: {}, // Let v2 auto-detect encoding
        features: {
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableWordConfidence: true
        },
        adaptation: {
          phraseSet: {
            phrases: vocabularyPhrases.map(phrase => ({ value: phrase, boost: 20 }))
          }
        }
      };

      const request = {
        recognizer: recognizerPath,
        config: config,
        files: [{
          uri: gcsUri
        }],
        recognitionOutputConfig: {
          inlineResponseConfig: {} // Get results directly in response
        }
      };

      console.log('🎤 V2 Batch: Starting long-running recognition...');
      console.log(`📁 File: ${gcsUri} (${bufferSizeInMB.toFixed(2)}MB)`);

      const [operation] = await this.clientV2.batchRecognize(request);
      console.log('⏳ V2 Batch: Waiting for transcription to complete...');
      console.log(`Operation name: ${operation.name}`);

      // Dynamic timeout based on file size - more generous calculation
      // Formula: 60s base + 60s per MB (allows ~1 minute per MB of audio)
      const baseTimeout = 300000; // 300 seconds (5 minutes) base
      const additionalTimeout = bufferSizeInMB * 60000; // 60 seconds per MB
      const timeoutMs = Math.min(baseTimeout + additionalTimeout, 600000); // Max 10 minutes

      console.log(`⏱️ V2 Batch: Timeout set to ${timeoutMs/1000}s for ${bufferSizeInMB.toFixed(2)}MB file`);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log(`❌ V2 Batch: Transcription timeout after ${timeoutMs/1000} seconds`);
          reject(new Error(`V2 Batch transcription timeout after ${timeoutMs/1000} seconds`));
        }, timeoutMs);
      });

      let response;
      try {
        [response] = await Promise.race([
          operation.promise(),
          timeoutPromise
        ]);
      } catch (timeoutError) {
        console.log('⚠️ V2 Batch: Operation timed out');
        throw timeoutError;
      }

      // Process batch response
      if (!response.results || Object.keys(response.results).length === 0) {
        throw new Error('No transcription results from v2 batch');
      }

      // Extract results from batch response structure
      const fileResults = response.results[gcsUri];
      if (!fileResults || !fileResults.transcript || !fileResults.transcript.results) {
        throw new Error('Invalid v2 batch response structure');
      }

      const transcription = fileResults.transcript.results
        .map(result => result.alternatives && result.alternatives[0])
        .filter(alt => alt && alt.transcript);

      if (transcription.length === 0) {
        throw new Error('No valid transcription in v2 batch results');
      }

      const fullTranscript = transcription
        .map(alt => alt.transcript)
        .join(' ');

      const avgConfidence = transcription.reduce((sum, alt) => sum + (alt.confidence || 0), 0) / transcription.length;

      const words = [];
      transcription.forEach(alt => {
        if (alt.words) {
          alt.words.forEach(wordInfo => {
            words.push({
              word: wordInfo.word,
              startTime: this.convertDuration(wordInfo.startTime),
              endTime: this.convertDuration(wordInfo.endTime),
              confidence: wordInfo.confidence || 0
            });
          });
        }
      });

      const duration = words.length > 0
        ? words[words.length - 1].endTime
        : 0;

      const result = {
        transcript: fullTranscript.trim(),
        confidence: avgConfidence,
        words,
        duration,
        wordCount: words.length
      };

      console.log(`✅ V2 Batch: Transcription complete. Length: ${result.transcript.length} characters`);
      console.log(`Confidence: ${(avgConfidence * 100).toFixed(2)}%`);

      // Apply post-processing corrections
      if (domainId && result.transcript) {
        const correctedTranscript = this.correctCommonTranscriptionErrors(result.transcript, domainId);
        if (correctedTranscript !== result.transcript) {
          console.log(`🔧 Applied transcription corrections for ${domainId}`);
          result.transcript = correctedTranscript;
        }
      }

      return result;

    } catch (error) {
      console.error('❌ V2 Batch transcription failed:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe with specific configuration
   * Tries v2 API first (5-10% better accuracy), falls back to v1 if v2 fails
   */
  async transcribeWithConfig(audioBuffer, encoding, sampleRateHertz, languageCode, domainId = null) {
    const bufferSizeInMB = audioBuffer.length / (1024 * 1024);

    // For very large files (>10MB), use GCS with long-running (v1 for now)
    // For medium files (1-10MB), try direct sync first, then fall back to GCS if needed
    const isVeryLongAudio = bufferSizeInMB > 10;
    const isMediumAudio = bufferSizeInMB > 1 && bufferSizeInMB <= 10;

    if (isVeryLongAudio) {
      console.log(`⏱️ Audio is very long (${bufferSizeInMB.toFixed(2)}MB), using long-running recognition with GCS`);
      return await this.transcribeLongAudioWithGCS(audioBuffer, encoding, sampleRateHertz, languageCode, domainId);
    }

    // Strategy: Try v2 first (best accuracy), fallback to v1 if v2 fails
    // v2 API with Chirp 3 has 10-15% better accuracy than v1

    if (this.useV2Api && this.v2Available) {
      try {
        console.log('🚀 Attempting transcription with v2 API (Chirp 3 model)...');
        return await this.transcribeWithV2(audioBuffer, encoding, sampleRateHertz, languageCode, domainId);
      } catch (v2Error) {
        console.warn('⚠️ V2 API failed, falling back to v1:', v2Error.message);
        // Continue to v1 fallback below
      }
    }

    // Fallback to v1 API (stable, reliable)
    try {
      console.log('📡 Using v1 API with enhanced model...');
      return await this.transcribeWithV1Config(audioBuffer, encoding, sampleRateHertz, languageCode, domainId, isMediumAudio, this.client, 'latest_long', true);
    } catch (v1Error) {
      console.error('❌ V1 API also failed:', v1Error.message);
      throw v1Error;
    }
  }

  /**
   * Transcribe with v1 configuration (existing working logic extracted)
   */
  async transcribeWithV1Config(audioBuffer, encoding, sampleRateHertz, languageCode, domainId, isMediumAudio, client, model = 'latest_long', useEnhanced = true) {
    const audio = {
      content: audioBuffer.toString('base64')
    };

    // Get domain-specific vocabulary if domain is provided
    const vocabularyPhrases = domainId ? this.getDomainVocabulary(domainId) : [
      // Default general technical terms
      'database', 'schema', 'table', 'index', 'query',
      'API', 'authentication', 'authorization', 'performance'
    ];

    const config = {
      encoding,
      languageCode,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      enableWordConfidence: true,
      audioChannelCount: 1,
      model: model, // Configurable model (latest_long or default)
      useEnhanced: useEnhanced, // Configurable enhanced mode
      // Add speech context with domain-specific technical terminology
      speechContexts: [{
        phrases: vocabularyPhrases,
        boost: 20 // High priority for these technical terms
      }]
    };

    if (domainId) {
      console.log(`📚 Using domain-specific vocabulary for: ${domainId} (${vocabularyPhrases.length} terms)`);
    }

    // Only add sampleRateHertz if it's provided
    if (sampleRateHertz) {
      config.sampleRateHertz = sampleRateHertz;
    }

    const request = {
      audio,
      config
    };

    try {
      const [response] = await client.recognize(request);

      // Process response...
      if (!response.results || response.results.length === 0) {
        if (isMediumAudio) {
          console.log('⚠️ Sync recognition returned no results, falling back to GCS...');
          return await this.transcribeLongAudioWithGCS(audioBuffer, encoding, sampleRateHertz, languageCode, domainId);
        }
        throw new Error('No transcription results');
      }

      const result = this.processTranscriptionResponse(response);

      // Apply post-processing corrections if domain is specified
      if (domainId && result.transcript) {
        const correctedTranscript = this.correctCommonTranscriptionErrors(result.transcript, domainId);
        if (correctedTranscript !== result.transcript) {
          console.log(`🔧 Applied transcription corrections for ${domainId}`);
          result.transcript = correctedTranscript;
        }
      }

      return result;
    } catch (error) {
      // If sync fails for medium audio, try GCS
      if (isMediumAudio && error.message && error.message.includes('too long')) {
        console.log('⚠️ Sync recognition failed (too long), falling back to GCS...');
        return await this.transcribeLongAudioWithGCS(audioBuffer, encoding, sampleRateHertz, languageCode, domainId);
      }
      throw error;
    }
  }

  /**
   * Process transcription response (extracted for reuse)
   */
  processTranscriptionResponse(response) {
    const transcription = response.results
      .map(result => result.alternatives[0])
      .filter(alt => alt.transcript);

    if (transcription.length === 0) {
      return {
        transcript: '',
        confidence: 0,
        words: [],
        duration: 0
      };
    }

    const fullTranscript = transcription
      .map(alt => alt.transcript)
      .join(' ');

    const avgConfidence = transcription.reduce((sum, alt) => sum + (alt.confidence || 0), 0) / transcription.length;

    const words = [];
    transcription.forEach(alt => {
      if (alt.words) {
        alt.words.forEach(wordInfo => {
          words.push({
            word: wordInfo.word,
            startTime: this.convertDuration(wordInfo.startTime),
            endTime: this.convertDuration(wordInfo.endTime),
            confidence: wordInfo.confidence || 0
          });
        });
      }
    });

    const duration = words.length > 0
      ? words[words.length - 1].endTime
      : 0;

    console.log(`✅ Transcription complete. Length: ${fullTranscript.length} characters`);
    console.log(`Confidence: ${(avgConfidence * 100).toFixed(2)}%`);

    return {
      transcript: fullTranscript.trim(),
      confidence: avgConfidence,
      words,
      duration,
      wordCount: words.length
    };
  }

  /**
   * Transcribe long audio using Cloud Storage
   * Tries v2 batch first (85-95% accuracy), falls back to v1 if v2 fails
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} encoding - Audio encoding
   * @param {number} sampleRateHertz - Sample rate
   * @param {string} languageCode - Language code
   * @param {string} domainId - Optional interview domain ID for context-specific vocabulary
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeLongAudioWithGCS(audioBuffer, encoding, sampleRateHertz, languageCode, domainId = null) {
    const cloudStorage = require('./cloudStorage');

    if (!cloudStorage.isReady()) {
      throw new Error('Cloud Storage is required for long audio transcription but is not configured');
    }

    try {
      // Upload audio to GCS
      const timestamp = Date.now();
      const filename = `temp-audio-${timestamp}.webm`;
      console.log(`☁️ Uploading audio to Cloud Storage: ${filename}`);

      const gcsUri = await cloudStorage.uploadBuffer(
        audioBuffer,
        `transcription-temp/${filename}`,
        'audio/webm'
      );

      console.log(`✅ Upload complete: ${gcsUri}`);

      // Add delay to allow GCS visibility check to complete
      console.log('⏳ Waiting 2 seconds for GCS file visibility...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const bufferSizeInMB = audioBuffer.length / (1024 * 1024);

      // Try v2 batch first (best accuracy with Chirp 3 model)
      if (this.useV2Api && this.v2Available) {
        try {
          console.log('🚀 Attempting v2 batch transcription (Chirp 3 model)...');
          const result = await this.transcribeWithV2Batch(gcsUri, encoding, sampleRateHertz, languageCode, bufferSizeInMB, domainId);

          // Clean up temp file
          try {
            await cloudStorage.deleteFile(`transcription-temp/${filename}`);
            console.log('🗑️ Temporary file deleted');
          } catch (cleanupError) {
            console.warn('⚠️ Failed to delete temporary file:', cleanupError.message);
          }

          return result;
        } catch (v2Error) {
          console.warn('⚠️ V2 batch failed, falling back to v1 long-running:', v2Error.message);
          // Continue to v1 fallback below
        }
      }

      // Fallback to v1 long-running (stable, reliable)
      console.log('📡 Using v1 long-running recognition...');
      const result = await this.transcribeFromGCS(gcsUri, encoding, sampleRateHertz, languageCode, bufferSizeInMB, domainId);

      // Clean up temp file
      try {
        await cloudStorage.deleteFile(`transcription-temp/${filename}`);
        console.log('🗑️ Temporary file deleted');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to delete temporary file:', cleanupError.message);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in long audio transcription:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe audio from Google Cloud Storage
   * @param {string} gcsUri - GCS URI (gs://bucket/file)
   * @param {string} encoding - Audio encoding
   * @param {number} sampleRateHertz - Sample rate
   * @param {string} languageCode - Language code
   * @param {number} bufferSizeInMB - File size in MB for dynamic timeout
   * @param {string} domainId - Optional interview domain ID for context-specific vocabulary
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeFromGCS(gcsUri, encoding = 'WEBM_OPUS', sampleRateHertz = 48000, languageCode = 'en-US', bufferSizeInMB = 0, domainId = null) {
    if (!this.isConfigured) {
      throw new Error('Speech-to-Text is not configured');
    }

    // Try different encoding strategies for GCS files too
    // WEBM_OPUS first as it has highest success rate based on logs
    const encodingStrategies = [
      { encoding: 'WEBM_OPUS', sampleRate: 48000, description: 'WEBM_OPUS with 48kHz' },
      { encoding: 'OGG_OPUS', sampleRate: 48000, description: 'OGG_OPUS with 48kHz' },
      { encoding: 'WEBM_OPUS', sampleRate: 16000, description: 'WEBM_OPUS with 16kHz' }
    ];

    let lastError = null;

    for (let i = 0; i < encodingStrategies.length; i++) {
      const strategy = encodingStrategies[i];

      try {
        console.log(`🎤 GCS Attempt ${i + 1}/${encodingStrategies.length}: ${strategy.description}`);

        const audio = {
          uri: gcsUri
        };

        // Get domain-specific vocabulary if domain is provided
        const vocabularyPhrases = domainId ? this.getDomainVocabulary(domainId) : [
          // Default general technical terms
          'database', 'schema', 'table', 'index', 'query',
          'API', 'authentication', 'authorization', 'performance'
        ];

        const config = {
          encoding: strategy.encoding,
          languageCode,
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
          audioChannelCount: 1,
          model: 'latest_long', // Use latest long-form model for better accuracy
          useEnhanced: true, // Enable enhanced model for improved accuracy
          // Add speech context with domain-specific technical terminology
          speechContexts: [{
            phrases: vocabularyPhrases,
            boost: 20 // High priority for these technical terms
          }]
        };

        if (domainId && i === 0) {
          console.log(`📚 Using domain-specific vocabulary for: ${domainId} (${vocabularyPhrases.length} terms)`);
        }

        if (strategy.sampleRate) {
          config.sampleRateHertz = strategy.sampleRate;
        }

        const request = {
          audio,
          config
        };

        const [operation] = await this.client.longRunningRecognize(request);
        console.log('⏳ Waiting for transcription to complete...');
        console.log(`Operation name: ${operation.name}`);

        // Dynamic timeout based on file size - more generous calculation
        // Formula: 60s base + 60s per MB (allows ~1 minute per MB of audio)
        const baseTimeout = 300000; // 300 seconds (5 minutes) base
        const additionalTimeout = bufferSizeInMB * 60000; // 60 seconds per MB
        const timeoutMs = Math.min(baseTimeout + additionalTimeout, 600000); // Max 10 minutes

        console.log(`⏱️ Timeout set to ${timeoutMs/1000}s for ${bufferSizeInMB.toFixed(2)}MB file`);

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.log(`❌ Transcription timeout after ${timeoutMs/1000} seconds`);
            reject(new Error(`Transcription timeout after ${timeoutMs/1000} seconds`));
          }, timeoutMs);
        });

        let response;
        try {
          [response] = await Promise.race([
            operation.promise(),
            timeoutPromise
          ]);
        } catch (timeoutError) {
          // If timeout, try to cancel the operation
          console.log('⚠️ Attempting to cancel long-running operation...');
          throw timeoutError;
        }

        const transcription = response.results
          .map(result => result.alternatives[0])
          .filter(alt => alt.transcript);

        if (transcription.length === 0) {
          continue;
        }

        const fullTranscript = transcription
          .map(alt => alt.transcript)
          .join(' ');

        const avgConfidence = transcription.reduce((sum, alt) => sum + (alt.confidence || 0), 0) / transcription.length;

        const words = [];
        transcription.forEach(alt => {
          if (alt.words) {
            alt.words.forEach(wordInfo => {
              words.push({
                word: wordInfo.word,
                startTime: this.convertDuration(wordInfo.startTime),
                endTime: this.convertDuration(wordInfo.endTime),
                confidence: wordInfo.confidence || 0
              });
            });
          }
        });

        const duration = words.length > 0
          ? words[words.length - 1].endTime
          : 0;

        const result = {
          transcript: fullTranscript.trim(),
          confidence: avgConfidence,
          words,
          duration,
          wordCount: words.length
        };

        // Check if we got a valid transcription
        if (result.confidence > 0.5) {
          console.log(`✅ GCS Success with ${strategy.description}!`);
          console.log(`✅ Transcription complete. Length: ${result.transcript.length} characters`);

          // Apply post-processing corrections if domain is specified
          if (domainId && result.transcript) {
            const correctedTranscript = this.correctCommonTranscriptionErrors(result.transcript, domainId);
            if (correctedTranscript !== result.transcript) {
              console.log(`🔧 Applied transcription corrections for ${domainId}`);
              result.transcript = correctedTranscript;
            }
          }

          return result;
        } else {
          console.log(`⚠️ Low confidence (${(result.confidence * 100).toFixed(2)}%) with ${strategy.description}, trying next...`);
          if (!lastError) {
            lastError = result;
          }
        }
      } catch (error) {
        console.log(`❌ GCS Failed with ${strategy.description}: ${error.message}`);
        lastError = error;
      }
    }

    // If we have a low confidence result, return it
    if (lastError && lastError.transcript) {
      console.log(`⚠️ Returning best available GCS transcription (low confidence)`);

      // Apply post-processing corrections even to low confidence results
      if (domainId) {
        const correctedTranscript = this.correctCommonTranscriptionErrors(lastError.transcript, domainId);
        if (correctedTranscript !== lastError.transcript) {
          console.log(`🔧 Applied transcription corrections for ${domainId}`);
          lastError.transcript = correctedTranscript;
        }
      }

      return lastError;
    }

    throw new Error('Failed to transcribe audio from GCS with all encoding strategies');
  }

  /**
   * Analyze speech patterns from transcription
   * @param {Object} transcriptionResult - Result from transcribeAudio
   * @returns {Object} Speech pattern analysis
   */
  analyzeSpeechPatterns(transcriptionResult) {
    const { transcript, words, duration } = transcriptionResult;

    // Ensure duration is a valid number and handle edge cases
    let validDuration = 0;
    if (typeof duration === 'number' && !isNaN(duration) && duration > 0) {
      validDuration = duration;
    } else if (words && words.length > 0) {
      // Fallback: Calculate duration from last word's end time
      const lastWord = words[words.length - 1];
      if (lastWord && lastWord.endTime) {
        // Convert protobuf duration object to number if needed
        validDuration = typeof lastWord.endTime === 'object'
          ? this.convertDuration(lastWord.endTime)
          : parseFloat(lastWord.endTime);

        if (validDuration > 0) {
          console.log(`⚠️ Using calculated duration from word timings: ${validDuration.toFixed(2)}s`);
        }
      }
    }

    if (!transcript || words.length === 0 || validDuration === 0) {
      console.warn('⚠️ Invalid speech pattern data - returning zero values');
      return {
        wordsPerMinute: 0,
        fillerWords: [],
        fillerWordCount: 0,
        fillerWordPercentage: 0,
        averagePauseDuration: 0,
        longPauses: 0,
        confidence: 0,
        totalWords: 0,
        duration: 0
      };
    }

    // Calculate words per minute
    const wordsPerMinute = validDuration > 0
      ? Math.round((words.length / validDuration) * 60)
      : 0;

    // Log for debugging (with safety check for validDuration)
    const durationStr = typeof validDuration === 'number' && validDuration > 0
      ? validDuration.toFixed(2)
      : '0.00';
    console.log(`📊 Speech Analysis: ${words.length} words in ${durationStr}s = ${wordsPerMinute} WPM`);

    // Detect filler words
    const fillerWordsList = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so', 'well', 'i mean'];
    const fillerWords = [];
    const lowerTranscript = transcript.toLowerCase();

    fillerWordsList.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lowerTranscript.match(regex);
      if (matches) {
        fillerWords.push({
          word: filler,
          count: matches.length
        });
      }
    });

    const fillerWordCount = fillerWords.reduce((sum, f) => sum + f.count, 0);

    // Calculate pauses between words
    const pauses = [];
    for (let i = 1; i < words.length; i++) {
      const pauseDuration = words[i].startTime - words[i - 1].endTime;
      if (pauseDuration > 0) {
        pauses.push(pauseDuration);
      }
    }

    const averagePauseDuration = pauses.length > 0
      ? pauses.reduce((sum, p) => sum + p, 0) / pauses.length
      : 0;

    // Detect long pauses (> 2 seconds)
    const longPauses = pauses.filter(p => p > 2);

    // Calculate average confidence
    const avgConfidence = words.reduce((sum, w) => sum + w.confidence, 0) / words.length;

    return {
      wordsPerMinute,
      fillerWords,
      fillerWordCount,
      fillerWordPercentage: parseFloat(((fillerWordCount / words.length) * 100).toFixed(2)),
      averagePauseDuration: parseFloat(averagePauseDuration.toFixed(2)),
      longPauses: longPauses.length,
      confidence: parseFloat((avgConfidence * 100).toFixed(2)),
      totalWords: words.length,
      duration: typeof validDuration === 'number' && validDuration > 0
        ? parseFloat(validDuration.toFixed(2))
        : 0
    };
  }

  /**
   * Convert protobuf duration to seconds
   */
  convertDuration(duration) {
    if (!duration) return 0;
    return (duration.seconds || 0) + (duration.nanos || 0) / 1e9;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      projectId: this.projectId,
      clientInitialized: this.client !== null
    };
  }
}

// Export singleton instance
module.exports = new SpeechToTextService();
