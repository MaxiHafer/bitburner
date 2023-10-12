import {NS} from "@ns";
import {Netplan} from "/lib/netplan/netplan";
import {JSONLogger, Logger} from "/lib/logger/logger";
import {Server} from "/lib/netplan/server";
import {Cluster} from "/lib/cluster/cluster";
import {Node} from "/lib/cluster/node";

export async function main(ns: NS): Promise<void> {
    const args = ns.flags([
        ["hackable", false],
        ["cluster", false],
    ]);

    const log = new JSONLogger(ns,{pretty: true});

    const homeNode = new Node(ns, log, "home");

    const cluster = new Cluster(ns, log, homeNode);

    if (args.hackable) {
        cluster.getHackableNodes().sort((a, b) => a.getRequiredHackingLevel() - b.getRequiredHackingLevel()).forEach( node => {
            node.update();
            log.tinfo("", node.pretty());
        })
    }

    if (args.cluster) {
        let totalRAM = 0;
        let usedRAM = 0;
        let freeRAM = 0;
        const nodes = cluster.getAllNodes();
        nodes.forEach(node => {
            totalRAM += node.getTotalRAM();
            usedRAM += node.getUsedRAM();
            freeRAM += node.getFreeRAM();
        });
        const totalRAMFormat = ns.formatRam(totalRAM);
        const usedRAMFormat = ns.formatRam(usedRAM);
        const ramUsage =  usedRAM / totalRAM;
        log.tinfo("Cluster summary", {
            "Total Servers": nodes.length,
            "RAM (used/total)": usedRAMFormat + " / " + totalRAMFormat,
            "RAM usage": ns.formatPercent(ramUsage),
        })
    }
}