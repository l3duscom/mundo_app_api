// CORS middleware for handling cross-origin requests
export function corsMiddleware(req, res, next) {
  // Get the origin from the request
  const origin = req.headers.origin;
  
  // Define allowed origins based on environment
  const allowedOrigins = getAllowedOrigins();

  // Always set CORS headers first
  // Check if origin is allowed and set appropriate header
  if (isOriginAllowed(origin, allowedOrigins)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // For same-origin requests (no Origin header)
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    // For debugging: log rejected origins in development
    if (process.env.NODE_ENV === "development") {
      console.log(`CORS: Rejected origin: ${origin}`);
      console.log(`CORS: Allowed origins:`, allowedOrigins);
    }
    // Still set header for proper CORS error response
    res.setHeader("Access-Control-Allow-Origin", "null");
  }

  // Set other CORS headers
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cookie, X-Requested-With",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true"); // Important for cookies
  res.setHeader("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    // Ensure the origin header is set for OPTIONS requests
    if (isOriginAllowed(origin, allowedOrigins)) {
      res.status(200).end();
      return;
    } else {
      // Reject preflight for non-allowed origins
      res.status(403).json({ error: "CORS: Origin not allowed" });
      return;
    }
  }

  // Continue to next middleware
  if (next) {
    next();
  }
}

// Helper function to get allowed origins based on environment
function getAllowedOrigins() {
  const baseOrigins = [
    // Development origins
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    
    // Production origins
    "https://ticketmd-wx96.vercel.app",
    "https://mundo-app-api.vercel.app",
    "https://mundo-app.vercel.app",
  ];

  // Add custom origins from environment variables
  const customOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  return [...baseOrigins, ...customOrigins];
}

// Helper function to check if origin is allowed
function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return false;
  
  // Debug logging in development
  if (process.env.NODE_ENV === "development") {
    console.log(`CORS: Checking origin: ${origin}`);
    console.log(`CORS: Allowed origins list:`, allowedOrigins);
  }
  
  // Check exact match first
  if (allowedOrigins.includes(origin)) {
    if (process.env.NODE_ENV === "development") {
      console.log(`CORS: Origin allowed by exact match: ${origin}`);
    }
    return true;
  }
  
  // In development, allow localhost with any port
  if (process.env.NODE_ENV === "development") {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (localhostPattern.test(origin)) {
      console.log(`CORS: Origin allowed by localhost pattern: ${origin}`);
      return true;
    }
  }
  
  // Allow Vercel preview deployments
  if (origin.includes('.vercel.app')) {
    // More flexible validation for Vercel domains (supports hyphens and numbers)
    const vercelPattern = /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.vercel\.app$/;
    if (vercelPattern.test(origin) || origin.endsWith('.vercel.app')) {
      if (process.env.NODE_ENV === "development") {
        console.log(`CORS: Origin allowed by Vercel pattern: ${origin}`);
      }
      return true;
    }
  }
  
  if (process.env.NODE_ENV === "development") {
    console.log(`CORS: Origin rejected: ${origin}`);
  }
  
  return false;
}

export default corsMiddleware;
