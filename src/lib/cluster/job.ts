import {JSONLogger} from "/lib/logger/logger";
import {NS} from "@ns";
import {Node} from "/lib/cluster/node";

export class Script {
    private ns: NS;
    private log: JSONLogger;

    private readonly file: string;
    private readonly args: any[];
    readonly threads: number;
    private source: Node;

    constructor(ns: NS, log: JSONLogger, source: Node, file: string, threads: number = 1,  ...args: any[]) {
        this.ns = ns;
        this.log = log;

        this.file = file;
        this.source = source;
        this.args = args;
        this.threads = threads;
    }

    getName(): string {
        return this.file.slice(this.file.lastIndexOf("/") +1);
    }

    exec(target: Node, threads: number): number {
        this.assertPresentOn(target);
        this.log.debug("executing script", {file: this.file, executor: target.getHostname(), threads: this.threads, args: this.args});
        return this.ns.exec(this.file, target.getHostname(), this.threads, ...this.args);
    }

    assertPresentOn(target: Node) {
        if (!this.ns.fileExists(this.file, target.getHostname())) {
            this.ns.scp(this.file, target.getHostname(), this.source.getHostname());
        }
    }

    getScriptRamOn(target?: Node): number {
        return this.ns.getScriptRam(this.file, target?.getHostname());
    }

    pretty(): any {
        return {
            "File": this.file,
            "Source": this.source.getHostname(),
            "Threads":  this.threads,
            "Args": this.args,
        }
    }
}

export class Job {
    private ns: NS;
    private log: JSONLogger;
    readonly name: string;

    private scripts: Script[] = [];
    private executionTime?: number

    constructor(ns: NS, log: JSONLogger, name: string) {
        this.ns = ns;
        this.log = log;
        this.name = name;
    }

    forEachScript(fn: (script: Script, index: number, array: Script[]) => void ) {
        this.scripts.forEach(fn)
    }

    setExecutionTime(time: number) {
        this.executionTime = time;
    }

    getExecutionTime(): number | undefined {
        return this.executionTime;
    }

    getScripts(): Script[] {
        return this.scripts;
    }

    getThreadsToSchedule(): Map<Script, number> {
        let threadMap = new Map<Script, number>();
        this.scripts.forEach(script => threadMap.set(script, script.getScriptRamOn()))

        return threadMap
    }

    addScripts(...scripts: Script[]) {
        this.scripts.push(...scripts)
    }
}

export type NodeSelector = (scriptRam: number) => Node