import {NS} from "@ns";
import {Netplan, Server} from "/lib/netplan/netplan";
import {Logger} from "/lib/logger/logger";

export async function main(ns: NS): Promise<void> {
    let logger = new Logger(ns);

    logger.tinfo("Starting Nmap...");

    let netplan: Netplan = new Netplan(ns, logger);

    logger.tsuccess("network was successfully analyzed");

    let includeOwned = ns.args.includes("--include-owned") || ns.args.includes("-o");
    let verbose = ns.args.includes("--verbose") || ns.args.includes("-v");
    let schedulable = ns.args.includes("--schedulable") || ns.args.includes("-s");

    let servers = netplan.network.filter(server => {
        return (
            (includeOwned || !server.name.startsWith("srv")) &&
            (!schedulable || server.schedule)
        )
    })

    if (verbose) {
        servers.forEach(server => logger.tinfo(server.toString()))
    }

   let totalRam: number = 0;
   let usedRam: number = 0;
   let serverCount: number = 0;

   servers.forEach(server => {
       totalRam += server.totalRam;
       usedRam += server.currentRam;
       serverCount += 1;
   })

    logger.tsuccess(JSON.stringify({
        "Filters": {
            "Schedulable": schedulable,
            "Include-Owned": includeOwned,
        },
        "Total Servers": serverCount,
        "Total RAM": ns.formatRam(totalRam),
        "Used RAM": ns.formatRam(usedRam),
        "Used RAM %": ns.formatPercent(usedRam / totalRam),
    }, undefined, "\t"))
}