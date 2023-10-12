import {NS} from "@ns";
import {JSONLogger} from "/lib/logger/logger";
import {Job, Script} from "/lib/cluster/job";
import {Node} from "/lib/cluster/node";
import {Cluster} from "/lib/cluster/cluster";
import {formatTime} from "/lib/time/time";

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

    constructor(ns: NS, log: JSONLogger,cluster: Cluster, target: Node, source: Node, extractionFactor = 0.25) {
        this.ns = ns;
        this.log = log;
        this.target = target;
        this.source = source;
        this.cluster = cluster;
        this.targetExtract = target.getMaxMoney() * extractionFactor;
    }

    getTargetExtract(): number {
        return this.targetExtract;
    }

    getTotalBatchTime(): number {
        return this.target.getWeakenTime() + (this.target.getGrowTime() * 2) + this.target.getHackTime() + (scriptDelay * 4)
    }

    async run(): Promise<number> {
        this.target.update();

        const hackWeakenFinish = this.target.getWeakenTime();
        const hackFinish = hackWeakenFinish - scriptDelay;
        const hackDelay = hackFinish - this.target.getHackTime();

        const growFinish = hackWeakenFinish + scriptDelay;
        const growDelay = growFinish - this.target.getGrowTime();

        const growWeakenFinish = growFinish + scriptDelay;
        const growWeakenDelay = growWeakenFinish - this.target.getWeakenTime();

        const hackThreads = Math.floor(this.ns.hackAnalyzeThreads(this.target.getHostname(), this.targetExtract));
        const hackSecurityIncrease = this.ns.hackAnalyzeSecurity(hackThreads, this.target.getHostname());

        // hack weaken
        const hackWeakenThreads = Math.ceil( hackSecurityIncrease / securityDecreasePerWeaken );

        // grow
        const growFactor = this.target.getMaxMoney() / this.targetExtract;
        const growThreads = Math.ceil( this.ns.growthAnalyze(this.target.getHostname(), growFactor) );

        //grow weaken

        const growSecurityIncrease = this.ns.growthAnalyzeSecurity(growThreads, this.target.getHostname());
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
        const hackScript = new Script(this.ns, this.log, this.source, scripts.hack, hackThreads, this.target.getHostname(), hackDelay);
        const growScript = new Script(this.ns, this.log, this.source, scripts.grow, growThreads, this.target.getHostname(), growDelay);
        const growWeakenScript = new Script(this.ns, this.log, this.source, scripts.weaken, growWeakenThreads, this.target.getHostname(), growWeakenDelay)

        const job = new Job(this.ns, this.log, `batch-${this.target.getHostname()}`);

        job.addScripts(
            hackWeakenScript,
            hackScript,
            growScript,
            growWeakenScript
        )

        await this.cluster.execute(job)

        return growWeakenFinish + scriptDelay

    }
}

export async function main(ns: NS){
    const log = new JSONLogger(ns, {pretty:true, debug:true});
    const target = new Node(ns, log, ns.args[0].toString());
    const node = new Node(ns, log, "home", {reservedRAM: 2**5, scheduleOrder: 1})
    const cluster = new Cluster(ns, log, node);
    const batch = new Batch(ns, log, cluster, target, node, <number>ns.args[1]);

    // eslint-disable-next-line no-constant-condition
    while(true) {
        if (!target.isMinimumSecurity()) {
            const deltaSecurity = target.getSecurityLevel() - target.getMinSecurityLevel();
            const weakenThreads = Math.ceil(deltaSecurity / securityDecreasePerWeaken);
            const weakenTime = ns.getWeakenTime(target.getHostname());

            log.info(`target is not at minimum security, waiting for weaken to complete, ${formatTime(weakenTime)}`, {node: target.getHostname(), deltaSecurity: deltaSecurity})

            const weakenScript = new Script(ns, log, node, scripts.weaken, weakenThreads, target.getHostname(), 0);
            const weakenJob = new Job(ns, log, `prepare-batch-weaken-${target.getHostname()}`);
            weakenJob.addScripts(weakenScript);

            await cluster.execute(weakenJob);

            await ns.sleep(weakenTime + scriptDelay);
            continue;
        }

        if (!target.isMaximumMoney()) {
            const growthFactor = target.getMaxMoney() / target.getMoneyAvailable();
            const growThreads = Math.ceil(ns.growthAnalyze(target.getHostname(), growthFactor));
            const growSecurityIncrease = ns.growthAnalyzeSecurity(growThreads, target.getHostname());
            const growWeakenThreads = Math.ceil(growSecurityIncrease / securityDecreasePerWeaken);

            const growTime = ns.getGrowTime(target.getHostname());
            const weakenTime = ns.getWeakenTime(target.getHostname());

            const weakenDelay = growTime + scriptDelay - weakenTime;

            log.info(`target is not at maximum money, waiting for grow and weaken to complete, ${formatTime(weakenTime + weakenDelay +scriptDelay)}`, {node: target.getHostname(), growthFactor: growthFactor});

            const growScript = new Script(ns, log, node, scripts.grow, growThreads, target.getHostname(), 0);
            const growWeakenScript = new Script(ns, log, node, scripts.weaken, growWeakenThreads, target.getHostname(), weakenDelay);

            const job = new Job(ns, log, `prepare-batch-grow-${target.getHostname()}`);
            job.addScripts(growScript, growWeakenScript);

            await cluster.execute(job);
            await ns.sleep(weakenTime + weakenDelay + scriptDelay);
            continue;
        }

        const nextDelay = await batch.run();

        log.info("starting new batch", {duration: formatTime(nextDelay + scriptDelay), expectedExtraction: `${ns.formatNumber(batch.getTargetExtract())}$`})

        await ns.sleep(nextDelay + scriptDelay);
        cluster.update();
        target.update();
    }
}