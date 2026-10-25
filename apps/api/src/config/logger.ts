import winston from "winston";

const transports: winston.transport[] = [
  new winston.transports.Console(),
];

// File logging hanya digunakan di lingkungan lokal.
// Vercel production menggunakan Console Runtime Logs.
if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  );
}

export const logger = winston.createLogger({
  level: "info",

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({
      stack: true,
    }),
    winston.format.json(),
  ),

  transports,
});
