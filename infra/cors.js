// CORS middleware for handling cross-origin requests
export function corsMiddleware(req, res, next) {
  // Get the origin from the request
  const origin = req.headers.origin;
  
  // Define allowed origins based on environment
  const allowedOrigins = getAllowedOrigins();

  // Check if origin is allowed
  if (isOriginAllowed(origin, allowedOrigins)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // For same-origin requests (no Origin header)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // Set other CORS headers
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cookie",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true"); // Important for cookies
  res.setHeader("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
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
  
  // Check exact match first
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // In development, allow localhost with any port
  if (process.env.NODE_ENV === "development") {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (localhostPattern.test(origin)) {
      return true;
    }
  }
  
  // Allow Vercel preview deployments
  if (origin.includes('.vercel.app')) {
    // You can add more specific validation here if needed
    return true;
  }
  
  return false;
}

export default corsMiddleware;
