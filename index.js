const isObject = value => {
	const type = typeof value;
	return value !== null && (type === 'object' || type === 'function');
};

// Optimized empty check without creating an array.
const isEmptyObject = value => {
	if (!isObject(value)) {
		return false;
	}

	for (const key in value) {
		if (Object.hasOwn(value, key)) {
			return false;
		}
	}

	return true;
};

const disallowedKeys = new Set([
	'__proto__',
	'prototype',
	'constructor',
]);

// Maximum allowed array index to prevent DoS via memory exhaustion.
const MAX_ARRAY_INDEX = 1_000_000;

// Optimized digit check without Set overhead.
const isDigit = character => character >= '0' && character <= '9';

// Check if a segment should be coerced to a number.
function shouldCoerceToNumber(segment) {
	// Only coerce valid non-negative integers without leading zeros.
	if (segment === '0') {
		return true;
	}

	if (/^[1-9]\d*$/.test(segment)) {
		const parsedNumber = Number.parseInt(segment, 10);
		// Check within safe integer range and under MAX_ARRAY_INDEX to prevent DoS.
		return parsedNumber <= Number.MAX_SAFE_INTEGER && parsedNumber <= MAX_ARRAY_INDEX;
	}

	return false;
}

// Helper to process a path segment (eliminates duplication).
function processSegment(segment, parts) {
	if (disallowedKeys.has(segment)) {
		return false; // Signal to return empty array.
	}

	if (segment && shouldCoerceToNumber(segment)) {
		parts.push(Number.parseInt(segment, 10));
	} else {
		parts.push(segment);
	}

	return true;
}

// Helper to process a filter segment like 'bar="baz"'.
function processFilterSegment(segment, parts) {
	const equalIndex = segment.indexOf('=');

	if (equalIndex === -1) {
		throw new Error(`Invalid filter syntax: missing '=' in filter '${segment}'`);
	}

	const key = segment.slice(0, equalIndex);
	const valueString = segment.slice(equalIndex + 1);

	if (!key) {
		throw new Error(`Invalid filter syntax: empty key in filter '${segment}'`);
	}

	let value;
	try {
		value = JSON.parse(valueString);
	} catch {
		throw new Error(`Invalid filter syntax: could not parse value in filter '${segment}'`);
	}

	// Only allow primitive values (not objects or arrays)
	if (value !== null && typeof value === 'object') {
		throw new Error(`Invalid filter syntax: filter value must be a JSON primitive, got ${typeof value}`);
	}

	parts.push({key, value});
	return true;
}

// Helper to find an item in an array that matches a filter
function findFilteredItem(array, filter) {
	if (!Array.isArray(array)) {
		return undefined;
	}

	return array.find(item => isObject(item) && item[filter.key] === filter.value);
}

export function parsePath(path) { // eslint-disable-line complexity
	if (typeof path !== 'string') {
		throw new TypeError(`Expected a string, got ${typeof path}`);
	}

	const parts = [];
	let currentSegment = '';
	let currentPart = 'start';
	let isEscaping = false;
	let position = 0;

	for (const character of path) {
		position++;

		// Handle escaping.
		if (isEscaping) {
			currentSegment += character;
			isEscaping = false;
			continue;
		}

		// Handle escape character.
		if (character === '\\') {
			if (currentPart === 'index') {
				throw new Error(`Invalid character '${character}' in an index at position ${position}`);
			}

			if (currentPart === 'indexEnd') {
				throw new Error(`Invalid character '${character}' after an index at position ${position}`);
			}

			isEscaping = true;
			currentPart = currentPart === 'start' ? 'property' : currentPart;
			continue;
		}

		switch (character) {
			case '.': {
				if (currentPart === 'index') {
					throw new Error(`Invalid character '${character}' in an index at position ${position}`);
				}

				if (currentPart === 'filter') {
					// In filter mode, dots are allowed (e.g., in numeric values)
					currentSegment += character;
					break;
				}

				if (currentPart === 'indexEnd') {
					currentPart = 'property';
					break;
				}

				if (!processSegment(currentSegment, parts)) {
					return [];
				}

				currentSegment = '';
				currentPart = 'property';
				break;
			}

			case '[': {
				if (currentPart === 'index') {
					throw new Error(`Invalid character '${character}' in an index at position ${position}`);
				}

				if (currentPart === 'filter') {
					// In filter mode, accumulate - will be caught by JSON.parse or primitive check
					currentSegment += character;
					break;
				}

				if (currentPart === 'indexEnd') {
					currentPart = 'index';
					break;
				}

				if (currentPart === 'property' || currentPart === 'start') {
					// Only push if we have content OR if we're in 'property' mode (not 'start')
					if ((currentSegment || currentPart === 'property') && !processSegment(currentSegment, parts)) {
						return [];
					}

					currentSegment = '';
				}

				currentPart = 'index';
				break;
			}

			case '=': {
				if (currentPart === 'index') {
					// Transition to filter mode
					currentSegment += character;
					currentPart = 'filter';
					break;
				}

				// In other contexts, = is just a regular character
				currentSegment += character;
				break;
			}

			case ']': {
				if (currentPart === 'index') {
					if (currentSegment === '') {
						// Empty brackets - backtrack and treat as literal
						const lastSegment = parts.pop() || '';
						currentSegment = lastSegment + '[]';
						currentPart = 'property';
					} else {
						// Check if it's a valid integer index
						const parsedNumber = Number.parseInt(currentSegment, 10);
						const isValidInteger = !Number.isNaN(parsedNumber)
							&& Number.isFinite(parsedNumber)
							&& parsedNumber >= 0
							&& parsedNumber <= Number.MAX_SAFE_INTEGER
							&& parsedNumber <= MAX_ARRAY_INDEX
							&& currentSegment === String(parsedNumber);

						if (isValidInteger) {
							parts.push(parsedNumber);
						} else {
							// Not a valid integer - report the first invalid character
							// This maintains backward compatibility with old error messages
							for (let i = 0; i < currentSegment.length; i++) {
								if (!isDigit(currentSegment[i])) {
									const errorPosition = position - currentSegment.length + i;
									throw new Error(`Invalid character '${currentSegment[i]}' in an index at position ${errorPosition}`);
								}
							}

							// All digits but not valid (e.g., exceeds MAX_ARRAY_INDEX or has leading zeros)
							// Keep as string
							parts.push(currentSegment);
						}

						currentSegment = '';
						currentPart = 'indexEnd';
					}

					break;
				}

				if (currentPart === 'filter') {
					if (!processFilterSegment(currentSegment, parts)) {
						return [];
					}

					currentSegment = '';
					currentPart = 'indexEnd';
					break;
				}

				if (currentPart === 'indexEnd') {
					throw new Error(`Invalid character '${character}' after an index at position ${position}`);
				}

				// In property context, treat ] as literal character
				currentSegment += character;
				break;
			}

			default: {
				if (currentPart === 'indexEnd') {
					throw new Error(`Invalid character '${character}' after an index at position ${position}`);
				}

				if (currentPart === 'start') {
					currentPart = 'property';
				}

				currentSegment += character;
			}
		}
	}

	// Handle unfinished escaping (trailing backslash)
	if (isEscaping) {
		currentSegment += '\\';
	}

	// Handle end of path
	switch (currentPart) {
		case 'property': {
			if (!processSegment(currentSegment, parts)) {
				return [];
			}

			break;
		}

		case 'index': {
			throw new Error('Index was not closed');
		}

		case 'filter': {
			throw new Error('Filter was not closed');
		}

		case 'start': {
			parts.push('');
			break;
		}
		// No default
	}

	return parts;
}

function normalizePath(path) {
	if (typeof path === 'string') {
		return parsePath(path);
	}

	if (Array.isArray(path)) {
		const normalized = [];

		for (const [index, segment] of path.entries()) {
			// Handle filter objects in array paths
			if (typeof segment === 'object' && segment !== null) {
				// Check if it looks like a filter object
				const hasKey = 'key' in segment;
				const hasValue = 'value' in segment;

				if (!hasKey && !hasValue) {
					// Empty object or object without filter properties
					throw new TypeError(`Expected a string or number for path segment at index ${index}, got ${typeof segment}`);
				}

				// Validate filter object structure
				if (!hasKey || !hasValue) {
					throw new TypeError(`Filter object at index ${index} must have 'key' and 'value' properties`);
				}

				// Validate filter key is a string
				if (typeof segment.key !== 'string') {
					throw new TypeError(`Filter key at index ${index} must be a string, got ${typeof segment.key}`);
				}

				// Validate filter value is a primitive (not object or array)
				if (segment.value !== null && typeof segment.value === 'object') {
					throw new TypeError(`Filter value at index ${index} must be a JSON primitive, got ${typeof segment.value}`);
				}

				normalized.push(segment);
				continue;
			}

			// Type validation.
			if (typeof segment !== 'string' && typeof segment !== 'number') {
				throw new TypeError(`Expected a string or number for path segment at index ${index}, got ${typeof segment}`);
			}

			// Validate numbers are finite (reject NaN, Infinity, -Infinity).
			if (typeof segment === 'number' && !Number.isFinite(segment)) {
				throw new TypeError(`Path segment at index ${index} must be a finite number, got ${segment}`);
			}

			// Check for disallowed keys.
			if (disallowedKeys.has(segment)) {
				return [];
			}

			// Normalize numeric strings to numbers for simplicity.
			// This treats ['items', '0'] the same as ['items', 0].
			if (typeof segment === 'string' && shouldCoerceToNumber(segment)) {
				normalized.push(Number.parseInt(segment, 10));
			} else {
				normalized.push(segment);
			}
		}

		return normalized;
	}

	return [];
}

export function getProperty(object, path, value) {
	if (!isObject(object) || (typeof path !== 'string' && !Array.isArray(path))) {
		return value === undefined ? object : value;
	}

	const pathArray = normalizePath(path);
	if (pathArray.length === 0) {
		return value;
	}

	for (let index = 0; index < pathArray.length; index++) {
		const key = pathArray[index];

		// Handle filter objects
		if (typeof key === 'object' && key !== null) {
			const found = findFilteredItem(object, key);
			if (!found) {
				return value;
			}

			object = found;
		} else {
			object = object[key];
		}

		if (object === undefined || object === null) {
			// Return default value if we hit undefined/null before the end of the path.
			// This ensures get({foo: null}, 'foo.bar') returns the default value, not null.
			if (index !== pathArray.length - 1) {
				return value;
			}

			break;
		}
	}

	return object === undefined ? value : object;
}

export function setProperty(object, path, value) {
	if (!isObject(object) || (typeof path !== 'string' && !Array.isArray(path))) {
		return object;
	}

	const root = object;
	const pathArray = normalizePath(path);

	if (pathArray.length === 0) {
		return object;
	}

	for (let index = 0; index < pathArray.length; index++) {
		const key = pathArray[index];

		// Handle filter objects
		if (typeof key === 'object' && key !== null) {
			const found = findFilteredItem(object, key);
			if (!found) {
				return root;
			}

			object = found;
		} else if (index === pathArray.length - 1) {
			object[key] = value;
		} else if (isObject(object[key])) {
			object = object[key];
		} else {
			const nextKey = pathArray[index + 1];

			// If next key is a filter, check if we would need to create an array that won't have matches
			if (typeof nextKey === 'object' && nextKey !== null) {
				// Don't create an empty array for a filter that won't match
				return root;
			}

			// Create arrays for numeric indices, objects for string keys
			const shouldCreateArray = typeof nextKey === 'number';
			object[key] = shouldCreateArray ? [] : {};
			object = object[key];
		}
	}

	return root;
}

export function deleteProperty(object, path) {
	if (!isObject(object) || (typeof path !== 'string' && !Array.isArray(path))) {
		return false;
	}

	const pathArray = normalizePath(path);

	if (pathArray.length === 0) {
		return false;
	}

	for (let index = 0; index < pathArray.length; index++) {
		const key = pathArray[index];

		// Handle filter objects
		if (typeof key === 'object' && key !== null) {
			const found = findFilteredItem(object, key);
			if (!found) {
				return false;
			}

			object = found;
		} else if (index === pathArray.length - 1) {
			const existed = Object.hasOwn(object, key);
			if (!existed) {
				return false;
			}

			delete object[key];
			return true;
		} else {
			object = object[key];

			if (!isObject(object)) {
				return false;
			}
		}
	}
}

export function hasProperty(object, path) {
	if (!isObject(object) || (typeof path !== 'string' && !Array.isArray(path))) {
		return false;
	}

	const pathArray = normalizePath(path);
	if (pathArray.length === 0) {
		return false;
	}

	for (const key of pathArray) {
		// Handle filter objects
		if (typeof key === 'object' && key !== null) {
			const found = findFilteredItem(object, key);
			if (!found) {
				return false;
			}

			object = found;
		} else {
			if (!isObject(object) || !(key in object)) {
				return false;
			}

			object = object[key];
		}
	}

	return true;
}

export function escapePath(path) {
	if (typeof path !== 'string') {
		throw new TypeError(`Expected a string, got ${typeof path}`);
	}

	// Escape special characters in one pass
	return path.replaceAll(/[\\.[]/g, String.raw`\$&`);
}

function normalizeEntries(value) {
	const entries = Object.entries(value);
	if (Array.isArray(value)) {
		return entries.map(([key, entryValue]) => {
			// Use shouldCoerceToNumber for consistency with parsePath
			const normalizedKey = shouldCoerceToNumber(key)
				? Number.parseInt(key, 10)
				: key;
			return [normalizedKey, entryValue];
		});
	}

	return entries;
}

export function stringifyPath(pathSegments, options = {}) {
	if (!Array.isArray(pathSegments)) {
		throw new TypeError(`Expected an array, got ${typeof pathSegments}`);
	}

	const {preferDotForIndices = false} = options;
	const parts = [];

	for (const [index, segment] of pathSegments.entries()) {
		// Handle filter objects
		if (typeof segment === 'object' && segment !== null) {
			// Check if it looks like a filter object
			const hasKey = 'key' in segment;
			const hasValue = 'value' in segment;

			if (!hasKey && !hasValue) {
				// Empty object or object without filter properties
				throw new TypeError(`Expected a string or number for path segment at index ${index}, got ${typeof segment}`);
			}

			// Validate filter object structure
			if (!hasKey || !hasValue) {
				throw new TypeError(`Filter object at index ${index} must have 'key' and 'value' properties`);
			}

			// Reconstruct filter syntax
			const filterString = `[${segment.key}=${JSON.stringify(segment.value)}]`;
			parts.push(filterString);
			continue;
		}

		// Validate segment types at runtime
		if (typeof segment !== 'string' && typeof segment !== 'number') {
			throw new TypeError(`Expected a string or number for path segment at index ${index}, got ${typeof segment}`);
		}

		if (typeof segment === 'number') {
			// Handle numeric indices
			if (!Number.isInteger(segment) || segment < 0) {
				// Non-integer or negative numbers are treated as string keys
				const escaped = escapePath(String(segment));
				parts.push(index === 0 ? escaped : `.${escaped}`);
			} else if (preferDotForIndices && index > 0) {
				parts.push(`.${segment}`);
			} else {
				parts.push(`[${segment}]`);
			}
		} else if (typeof segment === 'string') {
			if (segment === '') {
				// Empty string handling
				if (index === 0) {
					// Start with empty string, no prefix needed
				} else {
					parts.push('.');
				}
			} else if (shouldCoerceToNumber(segment)) {
				// Numeric strings are normalized to numbers
				const numericValue = Number.parseInt(segment, 10);
				if (preferDotForIndices && index > 0) {
					parts.push(`.${numericValue}`);
				} else {
					parts.push(`[${numericValue}]`);
				}
			} else {
				// Regular strings use dot notation
				const escaped = escapePath(segment);
				parts.push(index === 0 ? escaped : `.${escaped}`);
			}
		}
	}

	return parts.join('');
}

function * deepKeysIterator(object, currentPath = [], ancestors = new Set()) {
	if (!isObject(object) || isEmptyObject(object)) {
		if (currentPath.length > 0) {
			yield stringifyPath(currentPath);
		}

		return;
	}

	// Check if this object is already in the current path (circular reference)
	if (ancestors.has(object)) {
		return;
	}

	// Add to ancestors, recurse, then remove (backtrack)
	ancestors.add(object);

	// Reuse currentPath array by push/pop instead of creating new arrays
	for (const [key, value] of normalizeEntries(object)) {
		currentPath.push(key);
		yield * deepKeysIterator(value, currentPath, ancestors);
		currentPath.pop();
	}

	ancestors.delete(object);
}

export function deepKeys(object) {
	return [...deepKeysIterator(object)];
}

export function unflatten(object) {
	const result = {};
	if (!isObject(object)) {
		return result;
	}

	for (const [path, value] of Object.entries(object)) {
		setProperty(result, path, value);
	}

	return result;
}
