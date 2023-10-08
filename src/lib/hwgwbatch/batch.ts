import {NS} from "@ns";
import {JSONLogger} from "/lib/logger/logger";
import {Job, Script} from "/lib/cluster/job";
import {Node} from "/lib/cluster/node";
import {Cluster} from "/lib/cluster/cluster";

const securityDecreasePerWeaken = 0.05;
const scriptDelay = 200;

const scripts = {
    weaken: "/lib/hwgwbatch/scripts/weaken.js",
    grow: "/lib/hwgwbatch/scripts/grow.js",
    hack: "/lib/hwgwbatch/scripts/hack.js",
}

export class Batch {
    private readonly ns: NS
    private readonly log: JSONLogger;
    private readonly source: Node;
    private target: Node;
    private cluster: Cluster;

    private readonly targetExtract: number;

    private hackWeakenDelay = 0;
    private growDelay: number;
    private hackDelay: number;
    private growWeakenDelay: number;
    private growWeakenFinish: number;

    constructor(ns: NS, log: JSONLogger,cluster: Cluster, target: Node, source: Node, extractionFactor = 0.25) {
        this.ns = ns;
        this.log = log;
        this.target = target;
        this.source = source;
        this.cluster = cluster;

        const hackWeakenFinish = target.getWeakenTime();
        const hackFinish = hackWeakenFinish - scriptDelay;
        this.hackDelay = hackFinish - target.getHackTime();

        const growFinish = hackWeakenFinish + scriptDelay;
        this.growDelay = growFinish - target.getGrowTime();

        this.growWeakenFinish = growFinish + scriptDelay;
        this.growWeakenDelay = this.growWeakenFinish - target.getWeakenTime();

        log.info("extraction factor", {extractionFactor: extractionFactor})

        this.targetExtract = target.getMaxMoney() * extractionFactor;
    }

    async run(): Promise<number> {
        this.target.update();

        const hackThreads = Math.floor(this.ns.hackAnalyzeThreads(this.target.getHostname(), this.targetExtract));
        const hackSecurityIncrease = this.ns.hackAnalyzeSecurity(hackThreads);

        // hack weaken
        const hackWeakenThreads = Math.ceil( hackSecurityIncrease / securityDecreasePerWeaken );

        // grow
        const growFactor = this.target.getMaxMoney() / this.targetExtract;
        const growThreads = Math.ceil( this.ns.growthAnalyze(this.target.getHostname(), growFactor) );

        //grow weaken

        const growSecurityIncrease = this.ns.growthAnalyzeSecurity(growThreads);
        const growWeakenThreads = Math.ceil( growSecurityIncrease / securityDecreasePerWeaken );

        //total
        const totalThreads = hackThreads + hackWeakenThreads + growThreads + growWeakenThreads;

        this.log.info("creating new batch", {
            target: this.target.getHostname(),
            extractionAmount: this.targetExtract,
            threads: {
                total: totalThreads,
                hack: hackThreads,
                grow: growThreads,
                weaken: growWeakenThreads + hackWeakenThreads
            },
        });

        const hackWeakenScript = new Script(this.ns, this.log, this.source, scripts.weaken, hackWeakenThreads, this.target.getHostname(), 0);
        const hackScript = new Script(this.ns, this.log, this.source, scripts.hack, hackThreads, this.target.getHostname(), this.hackDelay);
        const growScript = new Script(this.ns, this.log, this.source, scripts.grow, growThreads, this.target.getHostname(), this.growDelay);
        const growWeakenScript = new Script(this.ns, this.log, this.source, scripts.weaken, growWeakenThreads, this.target.getHostname(), this.growWeakenDelay)

        const job = new Job(this.ns, this.log, `batch-${this.target.getHostname()}`);

        job.addScripts(
            hackWeakenScript,
            hackScript,
            growScript,
            growWeakenScript
        )

        await this.cluster.execute(job)

        return this.growWeakenFinish + scriptDelay

    }
}

export async function main(ns: NS){
    const log = new JSONLogger(ns, {pretty:true, debug:true});
    const target = new Node(ns, log, ns.args[0].toString());
    const node = new Node(ns, log, "home", {reservedRAM: 2**5, scheduleOrder: 1})
    const cluster = new Cluster(ns, log, node);

    const isPrepared = target.getAvailableMoney() == target.getMaxMoney() && target.getS

    while (target.getAvailableMoney() < target.getMaxMoney()) {

    }

    const batch = new Batch(ns, log, cluster, target, node, <number>ns.args[1]);

    // eslint-disable-next-line no-constant-condition
    while(true) {
        const nextDelay = await batch.run();
        await ns.sleep(nextDelay);
    }
}