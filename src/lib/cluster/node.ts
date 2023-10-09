import {NS, Server} from "@ns";
import {JSONLogger} from "/lib/logger/logger";
import {Script} from "/lib/cluster/job";

export type NodeOpts = {
    schedulable?: boolean,
    reservedRAM?: number,
    scheduleOrder?: number,
}

export class Node {
    ns: NS;
    log: JSONLogger;

    readonly reservedRAM: number;
    readonly scheduleOrder: number;
    private readonly hostname: string;

    constructor(ns: NS, logger: JSONLogger, host: string, opts?: NodeOpts) {
        this.ns = ns;
        this.log = logger;
        this.hostname = host;

        this.scheduleOrder = opts?.scheduleOrder ?? 0;
        this.reservedRAM = (!(opts?.schedulable ?? true)) ? this.getTotalRAM() : opts?.reservedRAM ?? 0;
    }

    scan(): Node[] {
        return this.ns.scan(this.getHostname()).map((hostname: string) => new Node(this.ns, this.log, hostname));
    }

    update(): void {
        const crackers = this.getCrackers();
        if (!this.isRooted() && this.getOpenPortsRequired() <= crackers.length) {

            this.log.info("rooting new server", {
                hostname: this.getHostname(),
                requiredOpenPorts: this.getOpenPortsRequired(),
                availableCrackers: crackers.length
            })

            this.getCrackers().forEach(fn => fn(this.getHostname()));
            this.ns.nuke(this.getHostname());
        }
    }

    getOpenPortsRequired(): number {
        return this.ns.getServerNumPortsRequired(this.getHostname());
    }

    isRooted(): boolean {
        return this.ns.hasRootAccess(this.getHostname());
    }

    getSecurityLevel(): number {
        return this.ns.getServerSecurityLevel(this.getHostname());
    }

    getMoneyAvailable(): number {
        return this.ns.getServerMoneyAvailable(this.getHostname());
    }

    isMinimumSecurity(): boolean {
        return this.getSecurityLevel() == this.getMinSecurityLevel();
    }

    getMinSecurityLevel() {
        return this.ns.getServerMinSecurityLevel(this.getHostname());
    }

    isMaximumMoney(): boolean {
        return this.getMaxMoney() == this.getMoneyAvailable();
    }

    getWeakenTime(): number {
        return this.ns.getWeakenTime(this.getHostname());
    }

    getHackTime(): number {
        return this.ns.getHackTime(this.getHostname());
    }

    getGrowTime(): number {
        return this.ns.getGrowTime(this.getHostname());
    }

    getAvailableMoney(): number {
        return this.ns.getServerMoneyAvailable(this.getHostname());
    }

    getMaxMoney(): number {
        return this.ns.getServerMaxMoney(this.getHostname());
    }

    getHostname(): string {
        return this.hostname;
    }

    getScriptThreads(script: Script): number {
        let schedulableRam = this.getSchedulableRAM();
        let scriptRam = script.getScriptRamOn();
        return Math.floor( schedulableRam / scriptRam );
    }

    getSchedulableRAM(): number {
        return (this.getFreeRAM() - this.reservedRAM) > 0 ? this.getFreeRAM() - this.reservedRAM  : 0
    }

    getUsedRAM(): number {
        return this.ns.getServerUsedRam(this.getHostname());
    }

    getFreeRAM(): number {
        return this.getTotalRAM() - this.getUsedRAM();
    }

    getTotalRAM(): number {
        return this.ns.getServerMaxRam(this.getHostname());
    }

    getRequiredHackingLevel(): number {
        return this.ns.getServerRequiredHackingLevel(this.getHostname());
    }

    getServerGrowth(): number {
        return this.ns.getServerGrowth(this.getHostname());
    }

    private getCrackers(): ((host: string) => void)[] {
        const crackers: ((host: string) => void)[] = [];

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

    pretty(): any {
        return {
            "hostname": this.hostname,
            "isRooted": this.isRooted(),
            "Total RAM": this.ns.formatRam(this.getTotalRAM()),
            "Reserved RAM": this.ns.formatRam(this.reservedRAM),
            "Schedulable RAM": this.ns.formatRam(this.getSchedulableRAM()),
            "Used RAM": this.ns.formatRam(this.getUsedRAM()),
            "Minimum hacking level": this.getRequiredHackingLevel(),
            "Current security level": this.getSecurityLevel(),
            "Minimum security level": this.getMinSecurityLevel(),
            "Current money": this.ns.formatNumber(this.getAvailableMoney()),
            "Maximum money": this.ns.formatNumber(this.getMaxMoney()),
            "Growth factor": this.getServerGrowth(),
            "Needed open Ports": this.getOpenPortsRequired(),
        }
    }
}