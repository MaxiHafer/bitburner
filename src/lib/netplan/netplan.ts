import { NS } from "@ns";
import {RootingManager} from "/lib/netplan/rooting";
import {Logger} from "/lib/logger/logger";

export class Netplan {
  ns: NS;
  host: Server;
  network: Server[];
  rootingManager: RootingManager;
  logger: Logger;

  constructor(ns: NS, logger: Logger, hostname = "home") {
    this.ns = ns;
    this.logger = logger;
    this.host = new Server(ns, hostname, false);
    this.network = [];
    this.rootingManager = new RootingManager(ns, logger);
    this.probe(this.host);
  }

  probe(host: Server): void {
    let known = this.network.some((e: Server) => host.name == e.name);

    if (!known) {
      this.logger.debug(`probing server (${host.name})`)
      this.rootingManager.tryRoot(host);
      this.network.push(host);

      for (let server of host.scan()) {
        this.probe(server);
      }
    }
  }

  getSchedulableServers(): Server[] {
    return this.network.filter(server => server.schedule && server.isRooted );
  }

  schedule(script: string, threads: number, ...args: (string | number | boolean)[]): Map<Server, number> {
   let res = new Map<Server, number>();
   let remainingThreadsToSchedule = threads;

    let ramCost = this.ns.getScriptRam(script);
    if ( ramCost == 0 ) {
      this.logger.terror(`the script '${script}' does not exist, exiting`)
      this.ns.exit()
    }

    for (let server of this.getSchedulableServers()) {

      if ( remainingThreadsToSchedule > 0) {
        server.update();
        let schedulableThreadsOnServer = server.getSchedulableThreads(ramCost);
        if (schedulableThreadsOnServer == 0) {
          continue;
        }

        remainingThreadsToSchedule -= schedulableThreadsOnServer;
        res.set(server, schedulableThreadsOnServer);

      } else {
        break;
      }
    }

    if (remainingThreadsToSchedule > 0 ) {
      this.logger.terror(`scheduler finished with ${remainingThreadsToSchedule} remaining threads.`)
      this.logger.terror(`network has not enough ram capacity to schedule ${script} on ${threads} threads`)
      this.ns.exit()
    }

    res.forEach( (threads: number, server: Server,): void => {
      this.ns.scp(script, server.name);
      this.ns.exec(script, server.name, threads, ...args);
    })

    return res;
  }

  getMaxThreads(script: string): number {
    let maxThreads = 0;
    let scriptRamRequirements = this.ns.getScriptRam(script);

    this.getSchedulableServers().forEach(server => maxThreads += server.getSchedulableThreads(scriptRamRequirements));

    return maxThreads;
  }

  pretty(): any[] {
    return this.network.map(value => value.pretty());
  }

  toString(): string {
    return JSON.stringify(this.pretty(), undefined, "\t");
  }
}

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

