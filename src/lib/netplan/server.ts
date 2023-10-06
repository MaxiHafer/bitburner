import {NS} from "@ns";

export class Server {
    ns: NS;
    name: string;
    schedule: boolean;
    totalRam: number;
    currentRam!: number;
    currentSecurity!: number;
    minimumSecurity: number;
    minimumHackingLevel: number;
    currentMoney!: number;
    maximumMoney: number;
    growthFactor: number;
    isRooted: boolean;
    neededOpenPorts: number;

    constructor(ns: NS, host: string, schedule: boolean = true) {
        this.ns = ns;
        this.name = host;
        this.schedule = schedule;

        this.totalRam = ns.getServerMaxRam(this.name);
        this.minimumSecurity = ns.getServerMinSecurityLevel(this.name);
        this.maximumMoney = ns.getServerMaxMoney(this.name);
        this.growthFactor = ns.getServerGrowth(this.name);
        this.isRooted = ns.hasRootAccess(this.name);
        this.minimumHackingLevel = ns.getServerRequiredHackingLevel(this.name);
        this.neededOpenPorts = ns.getServerNumPortsRequired(this.name)

        this.update();
    }

    getWeakenTime(): number {
      return this.ns.getWeakenTime(this.name);
    }

    getGrowTime(): number {
      return this.ns.getGrowTime(this.name);
    }

    getHackTime(): number {
      return this.ns.getHackTime(this.name);
    }

    scan(): Server[] {
        let neighbours = this.ns.scan(this.name)
        return neighbours.map<Server>((host: string) => new Server(this.ns, host))
    }

    getFreeRAM(): number {
        return this.totalRam - this.currentRam
    }

    getSchedulableThreads(scriptRam: number): number {
        return Math.floor(this.getFreeRAM() / scriptRam);
    }

    update(): void {
        this.currentSecurity = this.ns.getServerSecurityLevel(this.name);
        this.currentMoney = this.ns.getServerMoneyAvailable(this.name);
        this.currentRam = this.ns.getServerUsedRam((this.name));
        this.isRooted = this.ns.hasRootAccess(this.name);
    }

    pretty(): any {
        return {
            "Name": this.name,
            "Root access": this.isRooted,
            "Total RAM": this.ns.formatRam(this.totalRam),
            "Used RAM": this.ns.formatRam(this.currentRam),
            "Minimum hacking level": this.minimumHackingLevel,
            "Current security level": this.currentSecurity,
            "Minimum security level": this.minimumSecurity,
            "Current money": this.ns.formatNumber(this.currentMoney),
            "Maximum money": this.ns.formatNumber(this.maximumMoney),
            "Growth factor": this.growthFactor,
            "Needed open Ports": this.neededOpenPorts,
        }
    }

    toString(): string {
        return JSON.stringify(this.pretty(), undefined, '\t');
    }
}