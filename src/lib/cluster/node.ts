import {NS, Server} from "@ns";
import {JSONLogger} from "/lib/logger/logger";
import {Script} from "/lib/cluster/job";

export type NodeOpts = {
    schedulable?: boolean,
    reservedRAM?: number,
    scheduleOrder?: number,
}

export interface INode {
    getOpenPortsRequired(): number
    isRooted(): boolean
    getMinSecurityLevel(): number
    getSecurityLevel(): number
    getMoneyAvailable(): number
    getMaxMoney(): number
    getWeakenTime(): number
    getHackTime(): number
    getGrowTime(): number
    getHostname(): string
    getRequiredHackingLevel(): number
    getServerGrowth(): number
}

export class MockNode implements INode {
    private hostname: string;
    private rootAccess: boolean;
    private numOpenPorts: number;
    private minSecurityLevel: number;
    private currentSecurityLevel: number;
    private currentMoney: number;
    private maxMoney: number;
    private requiredHackingLevel: number;
    private growth: number;

    constructor(
        hostname: string,
        isRooted: boolean,
        numOpenPorts: number,
        minSecurityLevel: number,
        currentSecurityLevel: number,
        currentMoney: number,
        maxMoney: number,
        requiredHackingLevel: number,
        growth: number
    ) {
        this.hostname = hostname;
        this.rootAccess = isRooted;
        this.numOpenPorts = numOpenPorts;
        this.minSecurityLevel = minSecurityLevel;
        this.currentSecurityLevel = currentSecurityLevel;
        this.currentMoney = currentMoney;
        this.maxMoney = maxMoney;
        this.requiredHackingLevel = requiredHackingLevel;
        this.growth = growth;
    }

    getOpenPortsRequired(): number {
        return this.numOpenPorts;
    }
    isRooted(): boolean {
        return this.rootAccess;
    }
    getMinSecurityLevel(): number {
        return this.minSecurityLevel;
    }
    getSecurityLevel(): number {
        return this.currentSecurityLevel;
    }
    getMoneyAvailable(): number {
        return this.currentMoney;
    }
    getMaxMoney(): number {
        return this.maxMoney;
    }
    getWeakenTime(): number {
        throw new Error("Method not implemented.");
    }
    getHackTime(): number {
        throw new Error("Method not implemented.");
    }
    getGrowTime(): number {
        throw new Error("Method not implemented.");
    }
    getHostname(): string {
        return this.hostname;
    }
    getRequiredHackingLevel(): number {
       return this.requiredHackingLevel;
    }
    getServerGrowth(): number {
        return this.growth;
    }


}

export class Node implements INode {
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

    getMaxMoney(): number {
        return this.ns.getServerMaxMoney(this.getHostname());
    }

    getHostname(): string {
        return this.hostname;
    }

    getScriptThreads(script: Script): number {
        const schedulableRam = this.getSchedulableRAM();
        const scriptRam = script.getScriptRamOn();
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
            "Current money": this.ns.formatNumber(this.getMoneyAvailable()),
            "Maximum money": this.ns.formatNumber(this.getMaxMoney()),
            "Growth factor": this.getServerGrowth(),
            "Needed open Ports": this.getOpenPortsRequired(),
        }
    }
}