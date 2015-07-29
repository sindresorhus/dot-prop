'use strict';
var isObj = require('is-obj');

module.exports.get = function (obj, path) {
	if (!isObj(obj) || typeof path !== 'string') {
		return obj;
	}

	var pathArr = path.split('.');

	for (var i = 0; i < pathArr.length; i++) {
		var p = pathArr[i];

		while (p[p.length - 1] === '\\') {
			p = p.slice(0, -1) + '.';
			p += pathArr[++i];
		}

		obj = obj[p];

		if (obj === undefined) {
			break;
		}
	}

	return obj;
};

module.exports.set = function (obj, path, value) {
	if (!isObj(obj) || typeof path !== 'string') {
		return;
	}

	var pathArr = path.split('.');

	for (var i = 0; i < pathArr.length; i++) {
		var p = pathArr[i];

		while (p[p.length - 1] === '\\') {
			p = p.slice(0, -1) + '.';
			p += pathArr[++i];
		}

		if (!isObj(obj[p])) {
			obj[p] = {};
		}

		if (i === pathArr.length - 1) {
			obj[p] = value;
		}

		obj = obj[p];
	}
};
