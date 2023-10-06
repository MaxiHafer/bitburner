import {NS} from "@ns";
import {JSONLogger, Logger} from "/lib/logger/logger";

export async function main(ns: NS) {
    let log = new JSONLogger(ns, {pretty: true});
    log.info("Hello from managed script!");
}