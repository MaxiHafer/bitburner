import {NS} from "@ns";
import {ProtoBatcher} from "/lib/protobatch/manager";
import {Logger} from "/lib/logger/logger";
import {Server} from "/lib/netplan/server";

export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    let target = new Server(ns, ns.args[0].toString());
    let logger = new Logger(ns, false);

    let manager = new ProtoBatcher(ns, target, logger, 0.25, "home", false);

    await manager.run();
}