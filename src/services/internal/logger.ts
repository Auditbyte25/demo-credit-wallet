type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

type Colors = {
  red: string;
  green: string;
  yellow: string;
  cyan: string;
  reset: string;
};

/**
 * Verify basic fake logger, uses console.log to format the log.
 */
class Logger {
  private readonly colors: Colors;

  constructor() {
    this.colors = {
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      cyan: "\x1b[36m",
      reset: "\x1b[0m",
    };
  }

  public error(
    message: string,
    className: string,
    extendedFields: Record<string, unknown> = {}
  ): void {
    this._writeLocal("ERROR", className, message, extendedFields, this.colors.red);
  }

  public warn(
    message: string,
    className: string,
    extendedFields: Record<string, unknown> = {}
  ): void {
    this._writeLocal("WARN", className, message, extendedFields, this.colors.yellow);
  }

  public info(
    message: string,
    className: string,
    extendedFields: Record<string, unknown> = {}
  ): void {
    this._writeLocal("INFO", className, message, extendedFields, this.colors.cyan);
  }

  public debug(
    message: string,
    className: string,
    extendedFields: Record<string, unknown> = {}
  ): void {
    this._writeLocal("DEBUG", className, message, extendedFields, this.colors.green);
  }

  private _writeLocal(
    level: LogLevel,
    className: string,
    message: string,
    extendedFields: Record<string, unknown>,
    color: string
  ): void {
    const formattedMessage =
      `\n-----\n${new Date().toLocaleString()} - ${level}\n` +
      `file: ${className}\n` +
      `message: ${message}\n` +
      `extendedFields: ${JSON.stringify(extendedFields)}\n-----\n`;
    console.log(color, formattedMessage, this.colors.reset);
  }
}

export default new Logger();