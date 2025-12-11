import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, '../../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ level: lvl, message, timestamp, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${lvl}: ${message}${metaString}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    level,
    format: consoleFormat
  }),
  new DailyRotateFile({
    dirname: logDir,
    filename: 'application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level,
    format: fileFormat
  })
];

const logger = winston.createLogger({
  level,
  transports
});

export default logger;
