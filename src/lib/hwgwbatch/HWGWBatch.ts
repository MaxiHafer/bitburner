import {NS} from "@ns";
import {JSONLogger, Logger} from "/lib/logger/logger";

import {Server} from "/lib/netplan/server";
import {Job, Script} from "/lib/cluster/job";
import {Node} from "/lib/cluster/node";

const securityDecreasePerWeaken = 0.05;
const scriptDelay = 200;

const scripts = {
    weaken: "/lib/hwgwbatch/scripts/weaken.js",
    grow: "/lib/hwgwbatch/scripts/grow.js",
    hack: "/lib/hwgwbatch/scripts/hack.js",
}

export class HWGWBatch {
    private readonly ns: NS
    private readonly log: JSONLogger;
    private readonly source: Node;
    private readonly extractionFactor: number;

    private target: Node;

    constructor(ns: NS, log: JSONLogger, target: Node, source: Node, extractionFactor: number = 0.25) {
        this.ns = ns;
        this.log = log;
        this.target = target;
        this.source = source;
        this.extractionFactor = extractionFactor;
    }

    getJob(): Job {
        // TIMING
        let hackWeakenFinish = this.target.getWeakenTime();

        let hackFinish = hackWeakenFinish - scriptDelay;
        let hackDelay = hackFinish - this.target.getHackTime();

        let growFinish = hackWeakenFinish + scriptDelay;
        let growDelay = growFinish - this.target.getGrowTime();

        let growWeakenFinish = growFinish + scriptDelay;
        let growWeakenDelay = growWeakenFinish - this.target.getWeakenTime();

        // THREADS
        let weakenRamCost = this.ns.getScriptRam(scripts.weaken);
        let growRAMCost = this.ns.getScriptRam(scripts.grow);
        let hackRAMCost = this.ns.getScriptRam(scripts.hack);

        //hack
        let targetExtract = this.target.getMaxMoney() * this.extractionFactor;

        let hackThreads = Math.floor(this.ns.hackAnalyzeThreads(this.target.getHostname(), targetExtract));
        let hackSecurityIncrease = this.ns.hackAnalyzeSecurity(hackThreads);

        // hack weaken
        let hackWeakenThreads = Math.ceil( hackSecurityIncrease / securityDecreasePerWeaken );

        // grow
        let growFactor = this.target.getMaxMoney() / targetExtract;
        let growThreads = Math.ceil( this.ns.growthAnalyze(this.target.getHostname(), growFactor) );

        //grow weaken

        let growSecurityIncrease = this.ns.growthAnalyzeSecurity(growThreads);
        let growWeakenThreads = Math.ceil( growSecurityIncrease / securityDecreasePerWeaken );

        //total
        let totalThreads = hackThreads + hackWeakenThreads + growThreads + growWeakenThreads;

        this.log.debug("calculated timings for new batch", {
            totalThreads: totalThreads,
            hackThreads: hackThreads,
            growThreads: growThreads,
            weakenThreads: growWeakenThreads + hackWeakenThreads
        });

        //job creation

        let hackWeakenScript = new Script(this.ns, this.log, this.source, scripts.weaken, hackWeakenThreads, this.target.getHostname(), 0);
        let hackScript = new Script(this.ns, this.log, this.source, scripts.hack, hackThreads, this.target.getHostname(), hackDelay);
        let growScript = new Script(this.ns, this.log, this.source, scripts.grow, growThreads, this.target.getHostname(), growDelay);
        let growWeakenScript = new Script(this.ns, this.log, this.source, scripts.weaken, growWeakenThreads, this.target.getHostname(), growWeakenDelay)

        let job = new Job(this.ns, this.log, `hwgw-${this.target.getHostname()}`);

        job.addScripts(
            hackWeakenScript,
            hackScript,
            growScript,
            growWeakenScript
        )

        return job;

    }
}