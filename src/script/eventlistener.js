function wrapEventListeners(doc) {
    if (!doc._addEventListener) {
        doc._addEventListener = doc.addEventListener;

        doc.addEventListener = function (type, callback, options) {
            if ("undefined" === typeof options) {
                options = false;
            }

            let handler = function (...args) {
                if (!args[0].isTrusted) {
                    const hackedEv = {};

                    for (const key in args[0]) {
                        if ("isTrusted" === key) {
                            hackedEv.isTrusted = true;
                        } else if ("function" === typeof args[0][key]) {
                            hackedEv[key] = args[0][key].bind(args[0]);
                        } else {
                            hackedEv[key] = args[0][key];
                        }
                    }

                    args[0] = hackedEv;
                }

                return callback.apply(callback, args);
            };

            for (const prop in callback) {
                if ("function" === typeof callback[prop]) {
                    handler[prop] = callback[prop].bind(callback);
                } else {
                    handler[prop] = callback[prop];
                }
            }

            if (!this.eventListeners) {
                this.eventListeners = {};
            }
            if (!this.eventListeners[type]) {
                this.eventListeners[type] = [];
            }
            this.eventListeners[type].push({
                listener: callback,
                useCapture: options,
                wrapped: handler,
            });

            return this._addEventListener(
                type,
                handler ? handler : callback,
                options
            );
        };
    }

    if (!doc._removeEventListener) {
        doc._removeEventListener = doc.removeEventListener;

        doc.removeEventListener = function (type, callback, options) {
            if ("undefined" === typeof options) {
                options = false;
            }

            if (!this.eventListeners) {
                this.eventListeners = {};
            }
            if (!this.eventListeners[type]) {
                this.eventListeners[type] = [];
            }

            for (let i = 0; i < this.eventListeners[type].length; i++) {
                if (
                    this.eventListeners[type][i].listener === callback &&
                    this.eventListeners[type][i].useCapture === options
                ) {
                    if (this.eventListeners[type][i].wrapped) {
                        callback = this.eventListeners[type][i].wrapped;
                    }

                    this.eventListeners[type].splice(i, 1);
                    break;
                }
            }

            if (this.eventListeners[type].length == 0) {
                delete this.eventListeners[type];
            }

            return this._removeEventListener(type, callback, options);
        };
    }
}

/**
 * Revert the "wrapEventListeners" changes.
 */
function unwrapEventListeners(doc) {
    if (doc._addEventListener) {
        doc.addEventListener = doc._addEventListener;
        delete doc._addEventListener;
    }
    if (doc._removeEventListener) {
        doc.removeEventListener = doc._removeEventListener;
        delete doc._removeEventListener;
    }
    delete doc.eventListeners;
}

export async function main(ns) {
    let doc = eval("document");

    wrapEventListeners(doc);

    let unclick = doc.getElementById("unclickable");
    unclick.click();

    unwrapEventListeners(doc);
}

