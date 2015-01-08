'use strict';

function isObject(x) {
	return typeof x === 'object' && x !== null;
}

module.exports = function getProp(obj, path) {
	if (!isObject(obj) || typeof path !== 'string') {
		return obj;
	}

	path = path.split('.');

	return getProp(obj[path.shift()], path.join('.'));
};
