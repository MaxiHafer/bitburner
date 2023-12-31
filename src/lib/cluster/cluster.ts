
import {NS} from "@ns";
import {JSONLogger} from "/lib/logger/logger";
import {Node} from "/lib/cluster/node";
import {Job, Script} from "/lib/cluster/job";

const clusterConfig = "/data/cluster.txt";

export class Cluster {
    private readonly ns: NS;
    private readonly log: JSONLogger;

    private nodes: Node[] = [];
    private isLocked = false;
    private readonly node: Node;

    constructor(ns: NS, log: JSONLogger, node: Node) {
        this.ns = ns;
        this.log = log;
        this.node = node;

        this.initialize();
    }

    initialize(): void {
        if (this.ns.fileExists(clusterConfig, this.node.getHostname())) {
            const data = this.ns.read(clusterConfig);
            this.nodes = JSON.parse(data);
        } else {
            this.log.info("initializing cluster from network");
            this.probe(this.node);
        }

        this.update();
    }

    getHackableNodes(): Node[] {
        return this.nodes.filter(node => {return (
            node.isRooted() &&
            node.getHostname() !== "home" &&
            !node.getHostname().startsWith("srv") &&
            node.getRequiredHackingLevel() < this.ns.getHackingLevel() &&
            node.getMaxMoney() > 0
        )});
    }

    getAllNodes(): Node[] {
        return this.nodes;
    }

    getFilteredNodesForScheduling(): Node[] {
       return this.nodes.filter(node => node.isRooted() && node.getSchedulableRAM() > 0).sort((a, b) => a.scheduleOrder - b.scheduleOrder );
    }

    async getLock(handle: string) {
        if (this.isLocked) {
            const start = new Date();
            this.log.warn(`scheduler is locked`, {handle: handle});
            while(this.isLocked) {
                await this.ns.sleep(1000);
            }
            this.log.warn(`scheduler lock released`, {handle: handle, waitDuration: `${Math.round((start.getTime() - new Date().getTime()) / 1000)}s`});
        }

        this.isLocked = true;
        return () => { this.isLocked = false};
    }

    async scheduleJob(job: Job, nodes: Node[] = this.nodes): Promise<JobScheduleWithLockRelease | undefined> {
        const releaseLock = await this.getLock(job.name);

        const jobSchedule: Map<Script, ScriptSchedule> = new Map<Script, Map<Node, number>>();

        let isSchedulable = true;
        for (const script of job.getScripts()) {
            const scriptSchedule = this.scheduleScript(script, nodes);

            if (!scriptSchedule){
                isSchedulable = false;
                break;
            }

            jobSchedule.set(script, scriptSchedule);
        }

        if (!isSchedulable) {
            this.log.error("job is not schedulable", {name: job.name});
            releaseLock();
            return undefined;
        }

        return [jobSchedule, releaseLock];
    }

    scheduleScript(script: Script, nodes: Node[] = this.nodes): ScriptSchedule | undefined {
        const scriptSchedule = new Map<Node, number>;

        let remainingThreads = script.threads;
        for (const node of nodes) {
            if (remainingThreads > 0) {
                let threadsOnNode = node.getScriptThreads(script);
                if (threadsOnNode > 0) {
                    scriptSchedule.set(node, threadsOnNode > remainingThreads ? remainingThreads : threadsOnNode);
                    remainingThreads -= threadsOnNode;
                }
                continue;
            }
            break;
        }
        if (remainingThreads > 0) {
            this.log.error(`not enough RAM for scheduling`, {script: script.getName(), remainingThreads: remainingThreads})
            return undefined;
        }

        return scriptSchedule;
    }

    probe(node: Node): void {
        if (!this.nodes.some((e => e.getHostname() == node.getHostname()))) {
            this.nodes.push(node);
            node.scan().forEach((node: Node) => this.probe(node));
        }
    }

    update(): void {
        this.nodes.forEach(node => node.update() )
    }

    async execute(job: Job): Promise<void> {
        this.update();
        const nodes = this.getFilteredNodesForScheduling();
        const scheduleWithLock = await this.scheduleJob(job, nodes);

        if(!scheduleWithLock) {
            this.log.error("error while executing job", {name: job.name});
            return undefined;
        }

        const [jobSchedule, releaseLock] = scheduleWithLock;
        const jobMetrics = this.getJobMetrics(jobSchedule);

        this.log.info("dispatching job", {
            name: job.name,
            ram: this.ns.formatRam(jobMetrics.totalRAM, 2),
            threads: jobMetrics.totalThreads,
        });

        jobSchedule.forEach((scriptSchedule: ScriptSchedule, script: Script) => {
            scriptSchedule.forEach((threads: number, node: Node) => {
                script.exec(node, threads);
            })
        });

        releaseLock();
    }

    getJobMetrics(jobSchedule: Map<Script, ScriptSchedule>): JobMetrics {
        const metrics: JobMetrics = {
            totalRAM: 0,
            totalThreads: 0
        }

        jobSchedule.forEach((scriptSchedule: ScriptSchedule, script: Script) => {
            scriptSchedule.forEach((threads: number, node: Node) => {
                metrics.totalThreads += threads;
                metrics.totalRAM += script.getScriptRamOn(node);
            })
        })

        return metrics;
    }
}

type JobMetrics = {
    totalRAM: number,
    totalThreads: number
}

type ScriptSchedule = Map<Node,number>;
type JobScheduleWithLockRelease = [schedule: Map<Script, ScriptSchedule>,lockReleaseCb: () => void];