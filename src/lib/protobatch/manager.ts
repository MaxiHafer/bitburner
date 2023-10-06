import {Netplan} from "/lib/netplan/netplan";
import {NS} from "@ns";
import {Logger} from "/lib/logger/logger";
import {formatTime} from "/lib/time/time";
import {Server} from "/lib/netplan/server";

const secPerThread: number = 0.05;
const weakenScript: string = "/lib/protobatch/basicScripts/weaken.js"
const growScript: string = "/lib/protobatch/basicScripts/grow.js"
const hackScript: string = "/lib/protobatch/basicScripts/hack.js"
const schedulerGracePeriod: number = 10000;

export class ProtoBatcher {
    ns: NS
    target: Server
    netplan: Netplan
    extractionFactor: number;
    logger: Logger;

    constructor(ns: NS, target: Server, logger: Logger, extractionFactor: number = 0.25, host: string = "home", scheduleOnHome = true) {
        this.ns = ns;
        this.logger = logger;
        this.target = target;
        this.netplan = new Netplan(ns, logger, host, scheduleOnHome);
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
        this.logger.info(`starting ProtoBatcher targeting ${this.target.name} ${this.target.toString()}`)

        while (true) {
            this.target.update();
            this.netplan.update();

            let deltaSecurity = this.target.currentSecurity - this.target.minimumSecurity;
            let growthFactor = this.target.maximumMoney / this.target.currentMoney;
            let extractionAmount = this.target.maximumMoney * this.extractionFactor;

            this.logger.info("Current status: " + JSON.stringify({
                "Delta security": `${this.ns.formatNumber(deltaSecurity, 2)}`,
                "Growth to target": `${this.ns.formatNumber(growthFactor, 2)}x`,
                "Targeted extraction": `${this.ns.formatNumber(extractionAmount, 2)}$`,
                "Server status": {
                    "Hostname": this.target.name,
                    "Security level": this.ns.formatNumber(this.target.currentSecurity, 2),
                    "Current Money": `${this.ns.formatNumber(this.target.currentMoney,2)}$`,
                },
            }, undefined, "\t"));

            if (deltaSecurity !== 0) {
                let requestedThreads = Math.ceil(deltaSecurity / secPerThread);
                let threads = this.limitThreads(weakenScript, requestedThreads);

                this.logger.debug(`deltaSecurity is ${deltaSecurity}, weakening server on ${threads} threads`)
                this.netplan.schedule(weakenScript, threads, this.target.name);

                let sleepTime = this.ns.getWeakenTime(this.target.name);

                this.logger.info("Now running: " + JSON.stringify({
                    "Duration": formatTime(sleepTime + schedulerGracePeriod),
                    "Operation": "weaken",
                    "Threads (actual/requested)": `${threads}/${requestedThreads}`,
                }, undefined, "\t"));

                await this.ns.sleep(sleepTime + schedulerGracePeriod);

            } else if (growthFactor > 1) {
                let requestedThreads = Math.ceil(this.ns.growthAnalyze(this.target.name, growthFactor));
                let threads = this.limitThreads(growScript, requestedThreads);

                this.logger.debug(`growthFactor is ${growthFactor}, growing server on ${threads} threads`)
                this.netplan.schedule(growScript, threads, this.target.name);

                let sleepTime = this.ns.getGrowTime(this.target.name);

                this.logger.info("Now running: " + JSON.stringify({
                    "Duration": formatTime(sleepTime + schedulerGracePeriod),
                    "Operation": "grow",
                    "Threads (actual/requested)": `${threads}/${requestedThreads}`,
                }, undefined, "\t"));

                await this.ns.sleep(sleepTime + schedulerGracePeriod);

            } else {

                let requestedThreads = Math.floor(this.ns.hackAnalyzeThreads(this.target.name, extractionAmount));
                let threads = this.limitThreads(hackScript, requestedThreads);

                let actualExtractionAmount = this.ns.hackAnalyze(this.target.name) * threads;

                this.logger.debug(`hacking the server for ${this.ns.formatNumber(actualExtractionAmount)}$ on ${threads} threads`)
                this.netplan.schedule(hackScript, threads, this.target.name);

                let sleepTime = this.ns.getHackTime(this.target.name);

                this.logger.info("Now running: " + JSON.stringify({
                    "Duration": formatTime(sleepTime + schedulerGracePeriod),
                    "Operation": "hack",
                    "Threads (actual/requested)": `${threads}/${requestedThreads}`,
                }, undefined, "\t"));

                await this.ns.sleep(sleepTime +schedulerGracePeriod);
            }
        }
    }

}
