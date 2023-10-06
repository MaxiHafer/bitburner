import {NS} from "@ns";
import {ProtoBatcher} from "/lib/protobatch/manager";
import {Logger} from "/lib/logger/logger";
import {Server} from "/lib/netplan/server";

export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    let target = new Server(ns, "iron-gym");
    let logger = new Logger(ns, true);

    let manager = new ProtoBatcher(ns, target, logger);

    await manager.run();
}