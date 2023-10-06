import {NS} from "@ns";
import {JSONLogger} from "/lib/logger/logger";
import {Cluster} from "/lib/cluster/cluster";
import {Job, Script} from "/lib/cluster/job";
import {Node} from "/lib/cluster/node";


export async function main(ns:NS): Promise<void> {
    let log = new JSONLogger(ns, {debug: true, pretty: true})
    let cluster = new Cluster(ns, log)

    cluster.initialize();

    let home = new Node(ns, log, "home")

    let script = new Script(ns, log, home,"/scripts/testExec.js");

    let job = new Job(ns, log, "test new cluster library");
    job.addScript(script);

    await cluster.execute(job);
}