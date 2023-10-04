import {NS} from "@ns";

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


}