import {NS} from "@ns";
import {RootingManager} from "/lib/netplan/rooting";
import {Logger} from "/lib/logger/logger";
import {Server} from "/lib/netplan/server";

export class Netplan {
  ns: NS;
  host: Server;
  network: Server[];
  rootingManager: RootingManager;
  logger: Logger;

  constructor(ns: NS, logger: Logger, hostname = "home", scheduleOnHome=false) {
    this.ns = ns;
    this.logger = logger;
    this.host = new Server(ns, hostname, scheduleOnHome);
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
        server.update();
        this.probe(server);
      }
    }
  }

  update(): void {
    this.network = [];
    this.probe(this.host);
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

