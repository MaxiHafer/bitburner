import {JSONLogger} from "/lib/logger/logger";
import {NS} from "@ns";
import {Node} from "/lib/cluster/node";
import {HWGWBatch} from "/lib/hwgwbatch/HWGWBatch.js";
import {Job} from "/lib/cluster/job";
import {Cluster} from "/lib/cluster/cluster";

const targets: string[] = [
    "omega-net"
];

export async function main(ns: NS) {
    let log = new JSONLogger(ns, {pretty: true, debug: true});
    let targetNodes: Node[] = [];

    targets.forEach(hostname => targetNodes.push(new Node(ns, log, hostname)));

    let manager = new HWGWManager(ns, log, targetNodes);

    manager.run();
}

const extractionFactor: number = 0.25;

class HWGWManager {
    private ns: NS
    private log: JSONLogger
    private targets: Node[];
    private cluster: Cluster;


    constructor(ns: NS, log: JSONLogger,cluster: Cluster, targets: Node[]) {
        this.ns = ns;
        this.log = log;
        this.targets = targets;
        this.cluster = cluster;
    }

    async run() {
        let batches: HWGWBatch[] = [];
        this.targets.forEach(target => batches.push(new HWGWBatch(this.ns, this.log, node, this.cluster.getHomeNode())));

        while(true) {
            for

            for (let node of this.targets) {
                let batch = new HWGWBatch(this.ns, this.log, node, this.cluster.getHomeNode());
                await this.cluster.execute(batch.getJob());
            }

        }
    }

    newHWGWBatch(target: Node, extractionFactor: number): Job {
        new HWGWBatch(this.ns, this.log, target, extractionFactor)
    }



}