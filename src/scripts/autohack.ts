import {NS} from "@ns";
import {Logger} from "/lib/logger/logger";
import {Netplan} from "/lib/netplan/netplan";
import {Server} from "/lib/netplan/server";
import {ProtoBatcher} from "/lib/protobatch/manager";

export async function main(ns: NS): Promise<void> {
    let logger = new Logger(ns);
    let netplan = new Netplan(ns, logger);

    let valuableServers = netplan.network.filter((server: Server) => (
        server.maximumMoney >= 500000000 && server.growthFactor >= 20 && server.isRooted
    ));

    let projection = valuableServers.map((server: Server) => {
        return {
            "name": server.name,
            "growth": server.growthFactor,
            "maxMoney": server.maximumMoney
        }
    })

    logger.tinfo("Selected servers: " + JSON.stringify(projection, undefined, "\t"));

    if (! ns.args.includes("--dry-run")) {
        valuableServers.forEach((server: Server) => {
            ns.exec("/scripts/proto.js", "home", 1, server.name);
        });
    }
}