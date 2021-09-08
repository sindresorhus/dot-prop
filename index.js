'use strict';
const isObject = require('is-obj');

const disallowedKeys = new Set([
	'__proto__',
	'prototype',
	'constructor'
]);

function getPathSegments(path) {
	const parts = [];

	let isIgnoring = false;
	let isPath = true;
	let isIndex = false;
	let currentPathSegment = '';

	for (const character of path) {
		switch (character) {
			case '\\':
				if (isIgnoring) {
					isIgnoring = false;
					currentPathSegment += '\\';
				}

				isIgnoring = !isIgnoring;
				break;

			case '.':
				if (isIgnoring) {
					isIgnoring = false;
					currentPathSegment += '.';
					break;
				}

				if (isIndex) {
					isIndex = false;
					parts.push(`${parts.pop() || ''}[${currentPathSegment}`);
					currentPathSegment = '';
				}

				if (isPath && currentPathSegment.length > 0) {
					if (disallowedKeys.has(currentPathSegment)) {
						return [];
					}

					parts.push(currentPathSegment);
					currentPathSegment = '';
				}

				isPath = true;
				break;

			case '[':
				if (isIgnoring) {
					isIgnoring = false;
					currentPathSegment += '[';
					break;
				}

				if (isPath) {
					if (currentPathSegment !== '' || parts.length === 0) {
						isPath = false;
						isIndex = true;

						if (currentPathSegment.length > 0) {
							if (disallowedKeys.has(currentPathSegment)) {
								return [];
							}

							parts.push(currentPathSegment);
							currentPathSegment = '';
						}
					} else {
						currentPathSegment += '[';
					}

					break;
				}

				if (isIndex) {
					isPath = true;
					currentPathSegment = `${parts.pop() || ''}[${currentPathSegment}[`;
				}

				isIndex = !isIndex;
				break;

			case ']':
				if (isIgnoring && isIndex) {
					isIgnoring = false;
					isIndex = false;
					isPath = true;
					currentPathSegment = `${parts.pop()}[${currentPathSegment}]`;
					break;
				}

				if (isIndex) {
					isIndex = false;
					isPath = true;
					const index = Number.parseInt(currentPathSegment, 10);
					if (Number.isNaN(index)) {
						if (disallowedKeys.has(currentPathSegment)) {
							return [];
						}

						parts.push(currentPathSegment);
					} else {
						parts.push(index);
					}

					currentPathSegment = '';
					break;
				}

				// Falls through

			default:
				if (isIgnoring) {
					isIgnoring = false;
					currentPathSegment += '\\';
				}

				currentPathSegment += character;
		}
	}

	if (isIndex) {
		currentPathSegment = `${parts.pop()}[${currentPathSegment}`;
	}

	if (isIgnoring) {
		currentPathSegment += '\\';
	}

	if (currentPathSegment.length > 0 || parts.length === 0) {
		if (disallowedKeys.has(currentPathSegment)) {
			return [];
		}

		parts.push(currentPathSegment);
	}

	return parts;
}

module.exports = {
	get(object, path, value) {
		if (!isObject(object) || typeof path !== 'string') {
			return value === undefined ? object : value;
		}

		const pathArray = getPathSegments(path);
		if (pathArray.length === 0) {
			return;
		}

		for (let i = 0; i < pathArray.length; i++) {
			const key = pathArray[i];
			const index = Number.parseInt(key, 10);

			// Disallow string indexes
			if (!Number.isInteger(key) && Array.isArray(object) && !Number.isNaN(index) && object[index] === object[key]) {
				object = i === pathArray.length - 1 ? undefined : null;
			} else {
				object = object[key];
			}

			if (object === undefined || object === null) {
				// `object` is either `undefined` or `null` so we want to stop the loop, and
				// if this is not the last bit of the path, and
				// if it didn't return `undefined`
				// it would return `null` if `object` is `null`
				// but we want `get({foo: null}, 'foo.bar')` to equal `undefined`, or the supplied value, not `null`
				if (i !== pathArray.length - 1) {
					return value;
				}

				break;
			}
		}

		return object === undefined ? value : object;
	},

	set(object, path, value) {
		if (!isObject(object) || typeof path !== 'string') {
			return object;
		}

		const root = object;
		const pathArray = getPathSegments(path);

		for (let i = 0; i < pathArray.length; i++) {
			const p = pathArray[i];

			if (!isObject(object[p])) {
				if (Number.isInteger(pathArray[i + 1])) {
					object[p] = [];
				} else {
					object[p] = {};
				}
			}

			if (i === pathArray.length - 1) {
				object[p] = value;
			}

			object = object[p];
		}

		return root;
	},

	delete(object, path) {
		if (!isObject(object) || typeof path !== 'string') {
			return false;
		}

		const pathArray = getPathSegments(path);

		for (let i = 0; i < pathArray.length; i++) {
			const p = pathArray[i];

			if (i === pathArray.length - 1) {
				delete object[p];
				return true;
			}

			object = object[p];

			if (!isObject(object)) {
				return false;
			}
		}
	},

	has(object, path) {
		if (!isObject(object) || typeof path !== 'string') {
			return false;
		}

		const pathArray = getPathSegments(path);
		if (pathArray.length === 0) {
			return false;
		}

		// eslint-disable-next-line unicorn/no-for-loop
		for (let i = 0; i < pathArray.length; i++) {
			if (isObject(object)) {
				if (!(pathArray[i] in object)) {
					return false;
				}

				object = object[pathArray[i]];
			} else {
				return false;
			}
		}

		return true;
	}
};
