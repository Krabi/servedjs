/*!
 * MIT License
 *
 * Copyright (c) 2017-2019 Imre Tabur <imre.tabur@eesti.ee>
 */
"use strict";

(function (global) {

    var jsdi = global.jsdi = global.jsdi || {};

    jsdi.service("$log", function () {

        //https://www.tutorialspoint.com/log4j/log4j_logging_levels.htm
        //ALL > TRACE > DEBUG > INFO > WARN > ERROR > OFF
        var log = {
            OFF: 0,
            ERROR: 1,
            WARN: 2,
            INFO: 3,
            DEBUG: 4,
            TRACE: 5,
            ALL: 6,
            currentLevel: 0
        };

        log.setLevel = function (level) {
            if (log.levelIsInRange(level)) {
                log.currentLevel = level;
            }
        };

        log.levelIsInRange = function (level) {
            return (log.OFF <= level && level <= log.ALL);
        };

        log.shouldLog = function (level) {
            return (log.currentLevel >= level);
        };

        log.error = function () {
            if (console && log.shouldLog(log.ERROR)) {
                console.error.apply(console, arguments);
            }
        };

        log.warn = function () {
            if (console && log.shouldLog(log.WARN)) {
                console.warn.apply(console, arguments);
            }
        };

        log.info = function () {
            if (console && log.shouldLog(log.INFO)) {
                console.info.apply(console, arguments);
            }
        };

        log.log = function () {
            if (console && log.shouldLog(log.INFO)) {
                console.log.apply(console, arguments);
            }
        };

        log.debug = function () {
            if (console && log.shouldLog(log.DEBUG)) {
                console.log.apply(console, arguments);
            }
        };

        log.trace = function () {
            if (console && log.shouldLog(log.TRACE)) {
                console.trace.apply(console, arguments);
            }
        };

        return log;
    });

    jsdi.service("$browser", function () {

        var browser = {
        };

        browser.init = function () {
        };

        browser.forward = function () {
            if (global) {
                global.history.forward();
            }
        };

        browser.back = function () {
            if (global) {
                global.history.back();
            }
        };

        browser.go = function (positions) {
            if (global) {
                if (typeof positions === 'number') {
                    global.history.go(positions);
                } else {
                    global.location.hash = '#' + positions;
                }
            }
        };

        return browser;
    });

    var buildStorage = function (storage) {
        var storageService = {storage: storage};

        storageService.get = function (key) {
            if (key) {
                var storageValue = this.storage.getItem(key);
                if (storageValue) {
                    return JSON.parse(storageValue);
                }
            }
            return null;
        };

        storageService.set = function (key, object) {
            if (key && object) {
                this.storage.setItem(key, JSON.stringify(object));
            }
        };

        storageService.removeItem = function (key) {
            if (key) {
                this.storage.removeItem(key);
            }
        };

        return storageService;
    }, addSupported = function () {
        var supported, supportedList = [
            {globalName: "_", serviceName: "$lodash"}, //underscore (http://underscorejs.org/) or lodash (https://lodash.com)
            {globalName: "S", serviceName: "$strings"} //http://stringjs.com/
            //{globalName: "axios", serviceName: "$axios"} // not working! https://github.com/axios/axios
            //{globalName: "History", serviceName: "history"}//, //https://github.com/browserstate/history.js
            //{globalName: "$$", serviceName: "moo"} //https://mootools.net/
            //http://sylvester.jcoglan.com/ , https://johnresig.com/projects/javascript-pretty-date/, http://www.datejs.com/, http://www.jscharts.com/examples, https://johnresig.com/blog/processingjs/
            // DB, Active records
        ], i;
        for (i = 0; i < supportedList.length; i++) {
            supported = supportedList[i];
            if (global[supported.globalName]) {
                jsdi.service(supported.serviceName, global[supported.globalName]);
            }
        }
    };

    addSupported();
    jsdi.service("$localStorage", buildStorage(localStorage));
    jsdi.service("$sessionStorage", buildStorage(sessionStorage));

    jsdi.service("$placeholders", function () {
        var strings = {
            replace: function (string, object) {
                if (string && object) {
                    var objPropertyName, replacable, regExp;
                    for (objPropertyName in object) {
                        replacable = "\\$\\{" + objPropertyName + "\\}";
                        regExp = new RegExp(replacable, 'g');
                        string = string.replace(regExp, object[objPropertyName]);
                    }
                }
                return string;
            }
        };
        return strings;
    });

    jsdi.service("$timer", function () {
        var timer = {
            newTimer: function (callback, millis) {
                var result = {
                    millis: millis,
                    timer: null,
                    start: function () {
                        this.timer = setTimeout(callback, this.millis);
                    },
                    stop: function () {
                        clearTimeout(this.timer);
                    }
                };
                return result;
            },
            newInterval: function (callback, millis) {
                var result = {
                    millis: millis,
                    timer: null,
                    start: function () {
                        this.timer = setInterval(callback, this.millis);
                    },
                    stop: function () {
                        clearTimeout(this.timer);
                    }
                };
                return result;
            }
        };
        return timer;
    });

    jsdi.service("$router", function () {
        var ifBoolean = function (value) {
            if (value === true || value === false) {
                return value;
            }
            var lowerCase = value.toLowerCase();
            if (lowerCase === 'true' || lowerCase === 'yes') {
                return true;
            } else if (lowerCase === 'false' || lowerCase === 'no') {
                return false;
            }
            return value;
        };
        var ifNumber = function (value) {
            if (isNumber(value)) {
                return parseInt(value);
            }
            return value;
        };
        var isNumber = function (value) {
            return !isNaN(value);
        };
        var i,
                VARIABLE_NAME = 0,
                VARIABLE_VALUE = 1,
                varVal,
                parametersValues,
                hash = window.location.hash,
                hashPath = hash.substring(1),
                hashSides = hashPath.split('?'),
                hashRouteSide = hashSides[0],
                hashParametersSide = hashSides.length > 1 ? hashSides[1] : "",
                router = {
                    hash: hash,
                    hashPath: hashPath,
                    parts: hashRouteSide.split('/').filter(function (element) {//1. remove # 2. split by ? 3. split by /
                        return (!!element);
                    }),
                    parameters: {
                    }
                };
        parametersValues = hashParametersSide.split('&');
        for (i = 0; i < parametersValues.length; i++) {
            varVal = parametersValues[i].split('=');
            router.parameters[varVal[VARIABLE_NAME]] = (varVal.length === 2) ? ifBoolean(ifNumber(varVal[VARIABLE_VALUE])) : null;
        }
        return router;
    });

})(typeof window === 'undefined' ? global : window);
