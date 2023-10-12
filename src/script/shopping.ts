import { NS } from "@ns";
import {Logger} from "/lib/logger/logger";

const serverHostnameTemplate = "srv"

export async function main(ns: NS): Promise<void> {
    let logger = new Logger(ns)
    let targetRam = (<number>ns.args[0])
    if (!(Math.log2(targetRam) % 1 === 0)) {
        ns.tprintf("ERROR - target ram must be 2^n");
        ns.exit();
    }

    ns.tprint(`starting shopping script, target RAM: ${ns.formatRam(targetRam)}`)
    let inProgress = true;

    while (inProgress) {
        let purchasedServers = ns.getPurchasedServers();

        if ( purchasedServers.length < ns.getPurchasedServerLimit() ) {

            if ( ns.getPlayer().money < ns.getPurchasedServerCost(targetRam)) {
                ns.print("not enough money to buy new server. sleeping for 1 minute");
                await ns.sleep(1000 * 60);
            } else {
                ns.print(`buying new server with ${ns.formatRam(targetRam)} RAM`);
                ns.purchaseServer(serverHostnameTemplate, targetRam);
            }
        } else {
            inProgress = false;
            for (let server of purchasedServers) {
                if (ns.getServerMaxRam(server) < targetRam) {
                    inProgress = true;
                    if ( ns.getPlayer().money < ns.getPurchasedServerUpgradeCost(server, targetRam)) {
                        ns.print(`not enough money to upgrade (${server}). sleeping for 1 minute`);
                        inProgress = true;
                        await ns.sleep(1000 * 60);
                    } else {
                        ns.print(`upgrading server (${server}) to ${ns.formatRam(targetRam)} RAM`);
                        inProgress = true;
                        ns.upgradePurchasedServer(server, targetRam);
                    }
                }
            }
            if (!inProgress) {
                ns.tprint(`all servers are at ${ns.formatRam(targetRam)} RAM, exiting`);
                return;
            } else {
                await ns.sleep(1000);
            }

        }
    }
}