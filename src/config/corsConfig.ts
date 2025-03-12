const corsConfig = {
  dev: {
    origin: "http://localhost:5173", // Allow local development frontend
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Added OPTIONS for preflight
    credentials: true, // Allow credentials to be included
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"], // Ensure consistent casing
    exposedHeaders: ["X-Request-ID"],
  },
  production: {
    origin: [
      "https://jonathanmau.com",
      "https://www.jonathanmau.com",
      "https://ai.jonathanmau.com",
      "https://www.ai.jonathanmau.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Added OPTIONS for preflight
    credentials: true, // Enable credentials for cookies
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"], // Ensure consistent casing
    exposedHeaders: ["X-Request-ID"],
  },
};

export default corsConfig;