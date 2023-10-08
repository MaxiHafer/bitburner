import {JSONLogger} from "/lib/logger/logger";
import {NS} from "@ns";
import {Node} from "/lib/cluster/node";
import {Batch} from "/lib/hwgwbatch/batch.js";
import {Job} from "/lib/cluster/job";
import {Cluster} from "/lib/cluster/cluster";

export class HWGWManager {
    private readonly ns: NS
    private readonly log: JSONLogger
    private readonly target: Node;
    private node: Node;
    private cluster: Cluster;
    private extractionFactor: number;

    constructor(ns: NS, log: JSONLogger,cluster: Cluster, target: Node, source: Node, extractionFactor = 0.25) {
        this.ns = ns;
        this.log = log;
        this.target = target;
        this.cluster = cluster;
        this.node = source;
        this.extractionFactor = extractionFactor
    }

    async run() {
        const job = new Batch(this.ns, this.log, this.target, this.node, this.extractionFactor).getJob();
        const jobFinishDelay = job.getExecutionTime();

        if (!jobFinishDelay) {
            this.log.error("no finish time set on job.");
            this.ns.exit();
        }

        while(true) {
            await this.cluster.execute(job);
            await this.ns.sleep(jobFinishDelay + 200);
        }
    }
}