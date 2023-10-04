import { NS } from "@ns";
import { Netplan, Server } from "scripts/netplan"

export class RootingManager {
    ns: NS
    crackers: ((host: string) => void)[] = [];

    constructor(ns: NS) {
        this.ns = ns;

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

        this.crackers.push(ns.nuke);
    }

    tryRoot(server: Server): boolean {
        if (server.isRooted) {
            return true
        }

        if (server.minimumHackingLevel > this.ns.getHackingLevel()) {
            return false
        }

        if (server.neededOpenPorts > this.crackers.length) {
            return false
        }

        this.crackers.forEach(fn => fn(server.name));

        this.ns.tprintf(`rooted new server (${server.name}), hurray!`);

        return true
    }
}