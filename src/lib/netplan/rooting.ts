import { NS } from "@ns";
import {Logger} from "/lib/logger/logger";
import {Server} from "/lib/netplan/server";

export class RootingManager {
    ns: NS
    crackers: ((host: string) => void)[] = [];
    logger: Logger

    constructor(ns: NS, logger: Logger) {
        this.ns = ns;
        this.logger = logger;

        if (ns.fileExists("relaySMTP.exe", "home")) {
            this.crackers.push(ns.relaysmtp);
        }

        if (ns.fileExists("HTTPWorm.exe", "home")) {
            this.crackers.push(ns.httpworm);
        }

        if (ns.fileExists("SQLInject.exe", "home")) {
            this.crackers.push(ns.sqlinject);
        }

        if (ns.fileExists("BruteSSH.exe", "home")) {
            this.crackers.push(ns.brutessh);
        }

        if (ns.fileExists("FTPCrack.exe", "home")) {
            this.crackers.push(ns.ftpcrack);
        }

        this.logger.debug(`initialized RootingManager with ${this.crackers.length} crackers`)
    }

    tryRoot(server: Server): boolean {
        if (server.isRooted) {
            this.logger.debug(`server (${server.name}) is already rooted`)
            return true
        }

        if (server.minimumHackingLevel > this.ns.getHackingLevel()) {
            this.logger.debug(`security level of (${server.name}) is too high`)
            return false
        }

        if (server.neededOpenPorts > this.crackers.length) {
            this.logger.debug(`cannot open enough ports on (${server.name})`);
            return false
        }

        this.crackers.forEach(fn => fn(server.name));

        this.ns.nuke(server.name);

        this.logger.success(`rooted new server (${server.name})`);

        return true
    }
}