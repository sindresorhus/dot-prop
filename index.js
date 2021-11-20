'use strict';
const isObject = require('is-obj');

const disallowedKeys = new Set([
	'__proto__',
	'prototype',
	'constructor'
]);

function getPathSegments(path) {
	const parts = [];
	let currentSegment = '';
	let currentIndex = '';
	let isIndex = false;
	let isIgnoring = false;

	for (const [index, character] of Object.entries(path)) {
		switch (character) {
			case '\\':
				if (isIndex) {
					isIndex = false;
					currentSegment += `[${currentIndex}`;
					currentIndex = '';
				} else if (isIgnoring) {
					// If `\\` was escaped
					currentSegment += '\\';
				}

				isIgnoring = !isIgnoring;

				break;

			case '.':
				if (isIgnoring) {
					// If `.` was escaped
					isIgnoring = false;
					currentSegment += character;
					break;
				}

				if (isIndex) {
					currentSegment += `[${currentIndex}`;
					currentIndex = '';
					isIndex = false;
				}

				if (path[index - 1] === ']' && typeof parts[parts.length - 1] === 'number') {
					// If the dot immediately proceeds an index, skip saving the empty string
					break;
				}

				if (disallowedKeys.has(currentSegment)) {
					return [];
				}

				parts.push(currentSegment);
				currentSegment = '';

				break;

			case '[':
				if (isIgnoring) {
					// If `[` was escaped
					isIgnoring = false;
					currentSegment += character;
					break;
				}

				if (path[index - 1] === '.') {
					currentSegment += character;
					break;
				}

				if (!isIndex) {
					isIndex = true;
					break;
				}

				isIndex = false;
				currentSegment += `[${currentIndex}[`;
				currentIndex = '';
				break;

			case ']':
				if (isIndex) {
					const index = Number.parseFloat(currentIndex);
					if (Number.isInteger(index) && index >= 0) {
						if (currentSegment) {
							if (disallowedKeys.has(currentSegment)) {
								return [];
							}

							parts.push(currentSegment);
							currentSegment = '';
						}

						parts.push(index);
					} else {
						currentSegment += `[${currentIndex}]`;
					}

					currentIndex = '';
					isIndex = false;
					break;
				} else if (isIgnoring) {
					currentSegment += ']';
					isIgnoring = false;
					break;
				}

				// Falls through

			default:
				if (isIndex) {
					currentIndex += character;
					break;
				}

				if (isIgnoring) {
					// If no character was escaped
					isIgnoring = false;
					currentSegment += '\\';
				}

				currentSegment += character;
		}
	}

	if (currentIndex) {
		currentSegment += `[${currentIndex}`;
	} else if (isIgnoring) {
		currentSegment += '\\';
	}

	if (currentSegment.length > 0 || parts.length === 0) {
		if (disallowedKeys.has(currentSegment)) {
			return [];
		}

		parts.push(currentSegment);
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
			return value;
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
				object[p] = Number.isInteger(pathArray[i + 1]) ? [] : {};
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
