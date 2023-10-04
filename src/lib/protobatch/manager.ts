import {Netplan, Server} from "/lib/netplan/netplan";
import {NS} from "@ns";
import {Logger} from "/lib/logger/logger";

const secPerThread: number = 0.05;
const weakenScript: string = "/lib/protobatch/basicScripts/weaken.js"
const growScript: string = "/lib/protobatch/basicScripts/grow.js"
const hackScript: string = "/lib/protobatch/basicScripts/hack.js"

export class ProtoBatcher {
    ns: NS
    target: Server
    netplan: Netplan
    extractionFactor: number;
    logger: Logger;

    constructor(ns: NS, target: Server, logger: Logger, extractionFactor: number = 0.25, host: string = "home") {
        this.ns = ns;
        this.logger = logger;
        this.target = target;
        this.netplan = new Netplan(ns, logger, host);
        this.extractionFactor = extractionFactor
    }

    limitThreads(script: string, requestedThreads: number): number {
        let maxThreads = this.netplan.getMaxThreads(script);
        if (requestedThreads > maxThreads) {
            this.logger.debug(`thread limit exceeded, ${requestedThreads} exceeds cluster capacity for 'weaken' of ${maxThreads}`)
            return maxThreads;
        }

        return requestedThreads;
    }

    async run(): Promise<void> {
        this.logger.tinfo(`starting ProtoBatcher targeting ${this.target.name} ${this.target.toString()}`)

        while (true) {
            this.target.update();

            let deltaSecurity = this.target.currentSecurity - this.target.minimumSecurity;
            let growthFactor = this.target.maximumMoney / this.target.currentMoney;
            let extractionAmount = this.target.maximumMoney * this.extractionFactor;

            if (deltaSecurity !== 0) {
                let requestedThreads = Math.ceil(deltaSecurity / secPerThread);
                let threads = this.limitThreads(weakenScript, requestedThreads);

                this.logger.debug(`deltaSecurity is ${deltaSecurity}, weakening server on ${threads} threads`)
                this.netplan.schedule(weakenScript, threads, this.target.name);

                let sleepTime = this.ns.getWeakenTime(this.target.name);
                this.logger.debug(`waiting for ${sleepTime / 1000} seconds for 'weaken' to complete...`)

                await this.ns.sleep(sleepTime);

            } else if (growthFactor > 1) {
                let requestedThreads = Math.ceil(this.ns.growthAnalyze(this.target.name, growthFactor));
                let threads = this.limitThreads(growScript, requestedThreads);

                this.logger.debug(`growthFactor is ${growthFactor}, growing server on ${threads} threads`)
                this.netplan.schedule(growScript, threads, this.target.name);

                let sleepTime = this.ns.getGrowTime(this.target.name);
                this.logger.debug(`waiting for ${sleepTime / 1000} seconds for 'grow' to complete...`)

                await this.ns.sleep(sleepTime);

            } else {

                let requestedThreads = Math.floor(this.ns.hackAnalyzeThreads(this.target.name, extractionAmount));
                let threads = this.limitThreads(hackScript, requestedThreads);

                let actualExtractionAmount = this.ns.hackAnalyze(this.target.name) * threads;

                this.logger.debug(`hacking the server for ${this.ns.formatNumber(actualExtractionAmount)}$ on ${threads} threads`)
                this.netplan.schedule(hackScript, threads, this.target.name);

                let sleepTime = this.ns.getHackTime(this.target.name);

                this.logger.debug(`waiting for ${sleepTime / 1000} seconds for 'hack' to complete...`)
                await this.ns.sleep(sleepTime);
            }
        }
    }

}
