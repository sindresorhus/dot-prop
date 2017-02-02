'use strict';
const isObj = require('is-obj');

function isArr(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return Object.prototype.toString.call(arr) === '[object Array]';
}

function getPathSegments(path) {
	const pathArr = path.split('.');
	const parts = [];

	for (let i = 0; i < pathArr.length; i++) {
		let p = pathArr[i];

		while (p[p.length - 1] === '\\' && pathArr[i + 1] !== undefined) {
			p = p.slice(0, -1) + '.';
			p += pathArr[++i];
		}

		parts.push(p);
	}

	return parts;
}

module.exports = {
	get(obj, path, value) {
		const pathIsArray = isArr(path);

		if (!isObj(obj) || (typeof path !== 'string' && !pathIsArray)) {
			return obj;
		}

		const pathArr = (pathIsArray) ? path : getPathSegments(path);

		for (let i = 0; i < pathArr.length; i++) {
			if (!Object.prototype.propertyIsEnumerable.call(obj, pathArr[i])) {
				return value;
			}

			obj = obj[pathArr[i]];

			if (obj === undefined || obj === null) {
				// `obj` is either `undefined` or `null` so we want to stop the loop, and
				// if this is not the last bit of the path, and
				// if it did't return `undefined`
				// it would return `null` if `obj` is `null`
				// but we want `get({foo: null}, 'foo.bar')` to equal `undefined`, or the supplied value, not `null`
				if (i !== pathArr.length - 1) {
					return value;
				}

				break;
			}
		}

		return obj;
	},

	set(obj, path, value) {
		const pathIsArray = isArr(path);

		if (!isObj(obj) || (typeof path !== 'string' && !pathIsArray)) {
			return;
		}

		const pathArr = (pathIsArray) ? path : getPathSegments(path);

		for (let i = 0; i < pathArr.length; i++) {
			const p = pathArr[i];

			if (!isObj(obj[p])) {
				obj[p] = {};
			}

			if (i === pathArr.length - 1) {
				obj[p] = value;
			}

			obj = obj[p];
		}
	},

	delete(obj, path) {
		const pathIsArray = isArr(path);

		if (!isObj(obj) || (typeof path !== 'string' && !pathIsArray)) {
			return;
		}

		const pathArr = (pathIsArray) ? path : getPathSegments(path);

		for (let i = 0; i < pathArr.length; i++) {
			const p = pathArr[i];

			if (i === pathArr.length - 1) {
				delete obj[p];
				return;
			}

			obj = obj[p];

			if (!isObj(obj)) {
				return;
			}
		}
	},

	has(obj, path) {
		const pathIsArray = isArr(path);

		if (!isObj(obj) || (typeof path !== 'string' && !pathIsArray)) {
			return false;
		}

		const pathArr = (pathIsArray) ? path : getPathSegments(path);

		for (let i = 0; i < pathArr.length; i++) {
			if (isObj(obj)) {
				if (!(pathArr[i] in obj)) {
					return false;
				}

				obj = obj[pathArr[i]];
			} else {
				return false;
			}
		}

		return true;
	}
};
