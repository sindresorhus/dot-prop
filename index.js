'use strict';

function isObjOrFn(x) {
	return (typeof x === 'object' || typeof x === 'function') && x !== null;
}

module.exports.get = function (obj, path) {
	if (!isObjOrFn(obj) || typeof path !== 'string') {
		return obj;
	}

	var pathArr = path.split('.');
	for (var index = 0; index < pathArr.length; index++) {
		var p = pathArr[index];
		while (p[p.length - 1] === '\\') {
			p = p.slice(0, -1) + '.';
			index ++;
			p += pathArr[index];
		}

		obj = obj[p];

		if (obj === undefined) {
			break;
		}
	}

	return obj;
};

module.exports.set = function (obj, path, value) {
	if (!isObjOrFn(obj) || typeof path !== 'string') {
		return;
	}

	var pathArr = path.split('.');
	for (var index = 0; index < pathArr.length; index++) {
		var p = pathArr[index];
		while (p[p.length - 1] === '\\') {
			p = p.slice(0, -1) + '.';
			index ++;
			p += pathArr[index];
		}

		if (!isObjOrFn(obj[p])) {
			obj[p] = {};
		}

		if (index === pathArr.length - 1) {
			obj[p] = value;
		}

		obj = obj[p];
	}
};
