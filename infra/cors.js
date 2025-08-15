// CORS middleware for handling cross-origin requests
export function corsMiddleware(req, res, next) {
  // Define allowed origins based on environment
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "https://ticketmd-wx96.vercel.app",
    "https://mundo-app-api.vercel.app",
    "https://mundo-app.vercel.app", // Assuming frontend might be on different domain
  ];

  // Get the origin from the request
  const origin = req.headers.origin;

  // Check if origin is allowed
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
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

export default corsMiddleware;
