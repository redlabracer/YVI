import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { is } from '@electron-toolkit/utils';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private logStream: fs.WriteStream | null = null;
  private currentLevel: LogLevel;
  private logFilePath: string;
  private initialized: boolean = false;
  // private buffer: string[] = [];
  // private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // In production, limit logging to INFO or ERROR to save performance
    // In development, show DEBUG
    this.currentLevel = is.dev ? LogLevel.DEBUG : LogLevel.INFO;
    
    // We defer initialization to ensure 'app' is ready if needed, 
    // although app.getPath usually works early.
    this.logFilePath = '';
  }

  public init() {
    if (this.initialized) return;

    try {
      const userDataPath = app.getPath('userData');
      const logDir = path.join(userDataPath, 'logs');

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      this.logFilePath = path.join(logDir, `app-${dateStr}.log`);

      // 'a' flag for appending
      this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });

      this.logStream.on('error', (err) => {
        console.error('Logger stream error:', err);
      });

      this.initialized = true;
      this.info('Logger initialized', { path: this.logFilePath });
    } catch (error) {
      console.error('Failed to initialize logger:', error);
    }
  }

  public setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const levelString = LogLevel[level];
    
    let metaString = '';
    if (meta !== undefined) {
      try {
        if (meta instanceof Error) {
            metaString = `\nStack: ${meta.stack}`;
        } else if (typeof meta === 'object') {
            metaString = ` ${JSON.stringify(meta)}`;
        } else {
            metaString = ` ${String(meta)}`;
        }
      } catch (e) {
        metaString = ' [Circular/Invalid]';
      }
    }

    return `[${timestamp}] [${levelString}] ${message}${metaString}\n`;
  }

  private write(level: LogLevel, message: string, meta?: any) {
    if (level < this.currentLevel) return;

    // Output to console in dev for immediate feedback
    if (is.dev) {
       const consoleMsg = `[${LogLevel[level]}] ${message}`;
       if (level === LogLevel.ERROR) console.error(consoleMsg, meta);
       else if (level === LogLevel.WARN) console.warn(consoleMsg, meta);
       else console.log(consoleMsg, meta || '');
    }

    if (!this.initialized) {
        // Fallback or early init
        this.init();
    }

    const logEntry = this.formatMessage(level, message, meta);

    if (this.logStream && this.logStream.writable) {
      // Write directly to stream usually handles buffering efficiently in Node
      this.logStream.write(logEntry);
    }
  }

  public debug(message: string, meta?: any) { this.write(LogLevel.DEBUG, message, meta); }
  public info(message: string, meta?: any) { this.write(LogLevel.INFO, message, meta); }
  public warn(message: string, meta?: any) { this.write(LogLevel.WARN, message, meta); }
  public error(message: string, meta?: any) { this.write(LogLevel.ERROR, message, meta); }
}

export const logger = new Logger();

// Setup IPC handlers so Renderer can log too
export function setupLoggerIPC() {
    ipcMain.on('log-message', (_event, { level, message, meta }) => {
        // Map string level to enum if needed, or assume number/matching string
        // Assuming renderer sends proper level identifier or we map it
        
        switch (level) {
            case 'debug': logger.debug(`[Renderer] ${message}`, meta); break;
            case 'info': logger.info(`[Renderer] ${message}`, meta); break;
            case 'warn': logger.warn(`[Renderer] ${message}`, meta); break;
            case 'error': logger.error(`[Renderer] ${message}`, meta); break;
            default: logger.info(`[Renderer] ${message}`, meta);
        }
    });
}
