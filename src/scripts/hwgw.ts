import {NS} from "@ns";
import {HWGWManager} from "/lib/hwgwbatch/manager";
import {JSONLogger} from "/lib/logger/logger";
import {Node} from "/lib/cluster/node";
import {Cluster} from "/lib/cluster/cluster";

export async function main(ns: NS) {
    let log = new JSONLogger(ns, {pretty: true, debug: true});
    let source = new Node(ns, log, "home", {scheduleOrder: 1, reservedRAM: 2**5});
    let target = new Node(ns, log, ns.args[0].toString());
    let cluster = new Cluster(ns, log, source);

    let manager = new HWGWManager(ns, log, cluster, target, source, <number>ns.args[1]);

    await manager.run();
}