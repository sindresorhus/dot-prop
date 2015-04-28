'use strict';

function isObject(x) {
	return typeof x === 'object' && x !== null;
}

module.exports.get = function (obj, path) {
	if (!isObject(obj) || typeof path !== 'string') {
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
	if (!isObject(obj) || typeof path !== 'string') {
		return;
	}

	var pathArr = path.split('.');
	pathArr.forEach(function (path, index) {
		if (!isObject(obj[path])) {
			obj[path] = {};
		}

		if (index === pathArr.length - 1) {
			obj[path] = value;
		}

		obj = obj[path];
	});
};
