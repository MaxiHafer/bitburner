
import {NS, Server} from "@ns";
import {JSONLogger} from "/lib/logger/logger";
import {Node} from "/lib/cluster/node";
import {Job, Script} from "/lib/cluster/job";

const home: string = "home";
const clusterConfig: string = "/data/cluster.txt";

export async function main(ns: NS): Promise<void> {
    let log = new JSONLogger(ns, {pretty: true, debug: true});

    let cluster = new Cluster(ns, log);
}

export class Cluster {
    private readonly ns: NS;
    private readonly log: JSONLogger;

    private nodes: Node[] = [];
    private isLocked = false;
    private home!: Node;

    constructor(ns: NS, log: JSONLogger) {
        this.ns = ns;
        this.log = log;
    }

    initialize(): void {
        if (this.ns.getHostname() !== home) {
            this.log.error(`cluster be created on ${home}`);
            this.ns.exit();
        }

        this.home = new Node(this.ns, this.log, home);
        if (this.ns.fileExists(clusterConfig)) {
            let data = this.ns.read(clusterConfig);
            this.nodes = JSON.parse(data);
        } else {
            this.log.info("initializing cluster from network");
            this.probe(this.home);
        }

        this.update();
    }

    getFilteredNodesForScheduling(): Node[] {
        return this.nodes.filter(node => node.schedulable).sort((a, b) => a.scheduleOrder - b.scheduleOrder );
    }

    getHomeNode(): Node {
        return this.home;
    }

    async getLock(handle: string) {
        if (this.isLocked) {
            let start = new Date();
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
        let releaseLock = await this.getLock(job.name);

        let jobSchedule: Map<Script, ScriptSchedule> = new Map<Script, Map<Node, number>>();

        let isSchedulable = true;
        for (let script of job.getScripts()) {
            let scriptSchedule = this.scheduleScript(script, nodes);

            if (!scriptSchedule){
                isSchedulable = false;
                break;
            }

            jobSchedule.set(script, scriptSchedule);
        }

        if (!isSchedulable) {
            this.log.error("job is not schedulable", {name: job.name});
            releaseLock();
            return undefined
        }

        return [jobSchedule, releaseLock];
    }

    scheduleScript(script: Script, nodes: Node[] = this.nodes): ScriptSchedule | undefined {
        let scriptSchedule = new Map<Node, number>;

        let remainingThreads = script.threads;
        for (let node of nodes) {
            if (remainingThreads > 0) {
                let threadsOnNode = node.getScriptThreads(script);
                scriptSchedule.set(node, threadsOnNode > remainingThreads ? remainingThreads : threadsOnNode);
                remainingThreads -= threadsOnNode;
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
        let nodes = this.getFilteredNodesForScheduling();
        let scheduleWithLock = await this.scheduleJob(job, nodes);

        if(!scheduleWithLock) {
            this.log.error("error while executing job", {name: job.name});
            return undefined;
        }

        let [jobSchedule, releaseLock] = scheduleWithLock;
        let jobMetrics = this.getJobMetrics(jobSchedule);

        this.log.info("dispatching job", {
            name: job.name,
            ram: this.ns.formatRam(jobMetrics.totalRAM, 2),
            threads: jobMetrics.totalThreads,
        })

        jobSchedule.forEach((scriptSchedule: ScriptSchedule, script: Script) => {
            scriptSchedule.forEach((threads: number, node: Node) => {
                script.exec(node, threads);
            })
        });

        releaseLock();
    }

    getJobMetrics(jobSchedule: Map<Script, ScriptSchedule>): JobMetrics {
        let metrics: JobMetrics = {
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