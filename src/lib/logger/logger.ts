import {NS} from "@ns";

const colors = {
    CYAN: "\u001b[36m",
    BLUE: "\u001b[34m",
    GREEN: "\u001b[32m",
    RED: "\u001b[31m",
    YELLOW: "\u001b[33m",
    RESET: "\u001b[0m"
}

export class Logger {
    ns: NS
    debugMode: boolean

    constructor(ns: NS, debug: boolean = false) {
        this.ns = ns;
        this.debugMode = debug;

        this.ns.disableLog("ALL");
    }

    tinfo(msg: string): void {
        this.ns.tprintf("INFO - %s", msg);
    }

    info(msg: string): void {
        this.ns.printf("INFO - %s", msg);
    }

    tsuccess(msg: string): void {
        this.ns.tprintf("SUCC - %s", msg);
    }

    success(msg: string): void {
        this.ns.printf("SUCC - %s", msg);
    }

    twarn(msg: string): void {
        this.ns.tprintf("WARN - %s", msg);
    }

    warn(msg: string): void {
        this.ns.printf("WARN - %s", msg);
    }

    terror(msg: string): void {
        this.ns.tprintf("ERROR - %s", msg);
    }

    error(msg: string): void {
        this.ns.printf("ERROR - %s", msg);
    }

    tdebug(msg: string): void {
        if (this.debugMode) {
            this.ns.tprintf("DEBUG - %s", msg)
        }
    }

    debug(msg: string): void {
        if (this.debugMode) {
            this.ns.printf("DEBUG - %s", msg)
        }
    }

    infoJSON(text: string, fields: object) {
        let message: LogMessage = {
            level: LogLevel.INFO,
            msg: text,
            fields: fields
        }

        this.ns.print(`${getLogColor(message.level)}${JSON.stringify(message)}${colors.RESET}`);
    }

}

type JSONLoggerOpts = {
    debug?: boolean;
    pretty?: boolean;
}

export class JSONLogger {
    private ns: NS;
    private opts: JSONLoggerOpts

    constructor(ns: NS, opts: JSONLoggerOpts | undefined) {
        this.ns = ns;
        this.opts = opts ?? {};
        this.ns.disableLog("ALL");
    }

    tinfo(msg: string, fields?: object): void {
        this.tprint(new LogMessage(LogLevel.INFO, msg, fields));
    }

    info(msg: string, fields?: object): void {
        this.print(new LogMessage(LogLevel.INFO, msg, fields))
    }

    warn(msg: string, fields?: object): void {
        this.print(new LogMessage(LogLevel.WARN, msg, fields));
    }

    error(msg: string, fields?: object): void {
        this.print(new LogMessage(LogLevel.ERROR, msg, fields));
    }

    debug(msg: string, fields?: object): void {
        this.print(new LogMessage(LogLevel.DEBUG, msg, fields));
    }


    tprint(msg: LogMessage): void {
        if (this.opts.debug || (!(msg.level === LogLevel.DEBUG))) {
            this.ns.tprintf("%s",msg.toString(this.opts.pretty ? "\t" : undefined))
        }
    }

    print(msg: LogMessage): void {
        if (this.opts.debug || (!(msg.level === LogLevel.DEBUG))) {
            this.ns.printf(msg.toString(this.opts.pretty ? "\t" : undefined))
        }
    }
}

enum LogLevel {
    INFO = "info",
    WARN = "warning",
    ERROR = "error",
    DEBUG = "debug",
}

function getLogColor(level: LogLevel) {
    switch (level) {
        case LogLevel.DEBUG:
            return colors.CYAN
        case LogLevel.ERROR:
            return colors.RED
        case LogLevel.INFO:
            return colors.BLUE
        case LogLevel.WARN:
            return colors.YELLOW
    }
}

class LogMessage {
    level: LogLevel;
    msg: string;
    fields: object | undefined;

    constructor(level: LogLevel, msg: string, fields?: object) {
        this.level = level;
        this.msg = msg;
        this.fields = fields;
    }

    toString(indent?: string | number | undefined): string {
        return `${getLogColor(this.level)}${
            JSON.stringify({
                "level": this.level.toString(),
                "msg": this.msg,
                ...this.fields,
            }, undefined, indent)
        }${colors.RESET}`
    }
}