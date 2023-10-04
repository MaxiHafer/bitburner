import { NS } from "@ns";
import { RootingManager } from "scripts/rooting"

export class Netplan {
  ns: NS;
  host: Server;
  network: Server[];
  rootingManager: RootingManager;

  constructor(ns: NS, hostname = "home") {
    this.ns = ns;
    this.host = new Server(ns, hostname);
    this.network = [];
    this.rootingManager = new RootingManager(ns);
  }

  initialize(): void {
    this.ns.tprint(`initializing netplan on host (${this.host.name})`)
    this.probe(this.host);
  }

  probe(host: Server): void {
    let neighbours = host.scan();
    this.ns.tprintRaw(`Probing server (${host.name}) with ${neighbours.length} direct neighbour(s)`);
    for (let i = 0; i < neighbours.length; i++) {
      let known = this.network.some((e: Server) => neighbours[i].name === e.name);

      if (!known) {
        this.rootingManager.tryRoot(host);
        this.network.push(neighbours[i]);
        this.probe(neighbours[i]);
      }
    }
  }
}

export class Server {
  ns: NS;
  name: string;
  ram: number;
  currentSecurity: number;
  minimumSecurity: number;
  minimumHackingLevel: number;
  currentMoney: number;
  maximumMoney: number;
  growthFactor: number;
  isRooted: boolean;
  neededOpenPorts: number;

  constructor(ns: NS, host: string) {
    this.ns = ns;
    this.name = host;

    this.ram = ns.getServerMaxRam(this.name);
    this.minimumSecurity = ns.getServerMinSecurityLevel(this.name);
    this.currentSecurity = ns.getServerSecurityLevel(this.name);
    this.currentMoney = ns.getServerMoneyAvailable(this.name);
    this.maximumMoney = ns.getServerMaxMoney(this.name);
    this.growthFactor = ns.getServerGrowth(this.name);
    this.isRooted = ns.hasRootAccess(this.name);
    this.minimumHackingLevel = ns.getServerRequiredHackingLevel(this.name);
    this.neededOpenPorts = ns.getServerNumPortsRequired(this.name)
  }

  scan(): Server[] {
    let neighbours = this.ns.scan(this.name)
    return neighbours.map<Server>((host: string) => new Server(this.ns, host))
  }
}

export async function main(ns: NS): Promise<void> {
  ns.tprint("Starting Netplan1.0...");

  let netplan = new Netplan(ns)

  netplan.initialize();

  ns.tprint("Network was analyzed successfully.");
  netplan.network.forEach((server: Server) => {
    ns.tprintf(`${server.name}:
        RAM: ${server.ram}
        Minimum SecurityLevel: ${server.minimumSecurity}
        Current SecurityLevel: ${server.currentSecurity}
        Maximum Money: ${server.maximumMoney}
        Current Money: ${server.currentMoney}
        Growth Factor: ${server.growthFactor}
        Root Access: ${server.isRooted}
        Minimum hacking level: ${server.minimumHackingLevel}
        Needed open ports: ${server.neededOpenPorts}
    `);
  });
}

