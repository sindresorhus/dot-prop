'use strict';

function isObjOrFn(x) {
	return (typeof x === 'object' || typeof x === 'function') && x !== null;
}

module.exports.get = function (obj, path) {
	if (!isObjOrFn(obj) || typeof path !== 'string') {
		return obj;
	}

	var pathArr = path.split('.');
	pathArr.some(function (path, index) {
		obj = obj[path];

		if (obj === undefined) {
			return true;
		}
	});

	return obj;
};

module.exports.set = function (obj, path, value) {
	if (!isObjOrFn(obj) || typeof path !== 'string') {
		return;
	}

	var pathArr = path.split('.');
	pathArr.forEach(function (path, index) {
		if (!isObjOrFn(obj[path])) {
			obj[path] = {};
		}

		if (index === pathArr.length - 1) {
			obj[path] = value;
		}

		obj = obj[path];
	});
};
