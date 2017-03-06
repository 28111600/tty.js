/**
 * tty.js: logger.js
 * Copyright (c) 2012-2014, Christopher Jeffrey (MIT License)
 */

var slice = Array.prototype.slice,
    isatty = require('tty').isatty;

/**
 * Logger
 */

var fmtDate = function(date, format) {
    var o = {
        "M+": date.getMonth() + 1, //month 
        "d+": date.getDate(), //day 
        "h+": date.getHours(), //hour 
        "m+": date.getMinutes(), //minute 
        "s+": date.getSeconds(), //second 
        "q+": Math.floor((date.getMonth() + 3) / 3), //quarter 
        "S": date.getMilliseconds() //millisecond 
    }

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
}

function logger(level) {
    var args = slice.call(arguments, 1);

    if (typeof args[0] !== 'string') args.unshift('');

    level = logger.levels[level];
    var date = fmtDate(new Date(), "yyyy-MM-dd hh:mm:ss");
    args[0] = '\x1b[' +
        level[0] +
        'm[' +
        date +
        ']\x1b[m ' +
        args[0];

    if ((level[1] === 'log' && !logger.isatty[1]) ||
        (level[1] === 'error' && !logger.isatty[2])) {
        args[0] = args[0].replace(/\x1b\[(?:\d+(?:;\d+)*)?m/g, '');
    }

    return console[level[1]].apply(console, args);
}

logger.isatty = [isatty(0), isatty(1), isatty(2)];

logger.levels = {
    'log': [34, 'log'],
    'error': [41, 'error'],
    'warning': [31, 'error']
};

logger.prefix = 'tty.js';

logger.log = function() {
    return logger.apply(null, ['log'].concat(slice.call(arguments)));
};

logger.warning = function() {
    return logger.apply(null, ['warning'].concat(slice.call(arguments)));
};

logger.error = function() {
    return logger.apply(null, ['error'].concat(slice.call(arguments)));
};

/**
 * Expose
 */

module.exports = logger;