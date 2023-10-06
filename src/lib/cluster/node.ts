import {NS, Server} from "@ns";
import {JSONLogger} from "/lib/logger/logger";
import {Script} from "/lib/cluster/job";

export type NodeOpts = {
    schedulable: boolean,
    scheduleOrder: number,
}

export class Node {
    ns: NS;
    log: JSONLogger;

    private server: Server
    readonly schedulable: boolean;
    readonly scheduleOrder: number;

    constructor(ns: NS, logger: JSONLogger, host: string, opts?: NodeOpts) {
        this.ns = ns;
        this.log = logger;

        this.schedulable = opts?.schedulable ?? true;
        this.scheduleOrder = opts?.scheduleOrder ?? 0;

        this.server = ns.getServer(host);
    }

    scan(): Node[] {
        return this.ns.scan(this.server.hostname).map((hostname: string) => new Node(this.ns, this.log, hostname));
    }

    update(): void {
        if (!this.server.hasAdminRights && this.server.numOpenPortsRequired) {
            let crackers = this.getCrackers();

            if (crackers.length >= this.server.numOpenPortsRequired) {
                this.log.info("rooting new", {
                    hostname: this.server.hostname,
                    requiredOpenPorts: this.server.numOpenPortsRequired,
                    availableCrackers: crackers.length
                })

                this.getCrackers().forEach(fn => fn(this.server.hostname));
                this.ns.nuke(this.server.hostname);
            }
        }

        this.server = this.ns.getServer(this.server.hostname);
    }

    getWeakenTime(): number {
        return this.ns.getWeakenTime(this.server.hostname);
    }

    getHackTime(): number {
        return this.ns.getHackTime(this.server.hostname);
    }

    getGrowTime(): number {
        return this.ns.getGrowTime(this.server.hostname);
    }

    getMaxMoney(): number {
        return this.server.moneyMax ?? 0;
    }

    getHostname(): string {
        return this.server.hostname;
    }

    getScriptThreads(script: Script): number {
        return Math.floor( this.getFreeRAM() / script.getScriptRamOn(this) );
    }

    getUsedRAM(): number {
        return this.server.ramUsed;
    }

    getFreeRAM(): number {
        return this.server.maxRam - this.server.ramUsed;
    }

    getTotalRAM(): number {
        return this.server.maxRam;
    }

    private getCrackers(): ((host: string) => void)[] {
        let crackers: ((host: string) => void)[] = [];

        if (this.ns.fileExists("relaySMTP.exe", "home")) {
            crackers.push(this.ns.relaysmtp);
        }

        if (this.ns.fileExists("HTTPWorm.exe", "home")) {
            crackers.push(this.ns.httpworm);
        }

        if (this.ns.fileExists("SQLInject.exe", "home")) {
            crackers.push(this.ns.sqlinject);
        }

        if (this.ns.fileExists("BruteSSH.exe", "home")) {
            crackers.push(this.ns.brutessh);
        }

        if (this.ns.fileExists("FTPCrack.exe", "home")) {
            crackers.push(this.ns.ftpcrack);
        }

        return crackers
    }

}