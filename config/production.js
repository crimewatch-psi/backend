/**
 * Production configuration
 */

module.exports = {
  // Cache configuration
  cache: {
    ttl: 60 * 60 * 1000, // 1 hour
    maxSize: 1000, // Maximum cache entries
    cleanupInterval: 30 * 60 * 1000, // 30 minutes
  },

  // API rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: true,
  },

  // Database query limits
  database: {
    maxCrimes: 1000,
    maxCrimesPerLocation: 50,
    maxLocations: 100,
    queryTimeout: 30000, // 30 seconds
  },

  // OpenAI configuration
  openai: {
    maxTokens: 1500,
    timeout: 30000, // 30 seconds
    temperature: 0.7,
    maxRetries: 3,
  },

  // CORS configuration
  cors: {
    origin: [
      "https://crimewatch-psi.vercel.app",
      "https://crimewatch-3yyf5ii8f-ameliazsabrinas-projects.vercel.app",
      "https://crimewatch-2ffzso28w-ameliazsabrinas-projects.vercel.app",
    ],
    credentials: true,
  },

  // Security headers
  security: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  },

  // Monitoring and health checks
  monitoring: {
    healthCheck: {
      enabled: true,
      interval: 60000, // 1 minute
    },
    metrics: {
      enabled: true,
      endpoint: "/api/metrics",
    },
  },
};