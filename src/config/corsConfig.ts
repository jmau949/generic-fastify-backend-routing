const corsConfig = {
  dev: {
    origin: "http://localhost:5173", // Allow local development frontend
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Added OPTIONS for preflight
    credentials: true, // Allow credentials to be included
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  production: {
    origin: ["https://jonathanmau.com", "https://www.jonathanmau.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Added OPTIONS for preflight
    credentials: true, // Enable credentials for cookies
    allowedHeaders: ["Content-Type", "Authorization"],
  },
};

export default corsConfig;