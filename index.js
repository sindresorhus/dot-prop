const isObject = value => {
	const type = typeof value;
	return value !== null && (type === 'object' || type === 'function');
};

const disallowedKeys = new Set([
	'__proto__',
	'prototype',
	'constructor',
]);

// Longest disallowed key. A longer segment can't be disallowed, so the membership
// check is skipped for it. This keeps `parsePath` linear on inputs like `a[][]…`.
const maxDisallowedKeyLength = Math.max(...[...disallowedKeys].map(key => key.length));

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

export function parsePath(path) { // eslint-disable-line complexity
	if (typeof path !== 'string') {
		throw new TypeError(`Expected a string, got ${typeof path}`);
	}

	const parts = [];
	let currentSegment = '';
	let indexSegment = '';
	let hadProperty = false;
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

				if (currentPart === 'indexEnd') {
					currentPart = 'index';
					break;
				}

				// Entering an index from a property. Keep the property in `currentSegment`
				// and collect index digits separately, so empty brackets (`[]`) don't
				// require pushing then popping the segment (which re-scans a growing
				// literal on every `[` and makes `a[][]…` quadratic).
				//
				// Reject a disallowed key here, before the index opens, so `__proto__[0]`
				// etc. still return []. The length guard keeps this O(1) for long literals.
				if (
					currentPart === 'property'
					&& currentSegment.length <= maxDisallowedKeyLength
					&& disallowedKeys.has(currentSegment)
				) {
					return [];
				}

				hadProperty = currentPart === 'property';
				currentPart = 'index';
				break;
			}

			case ']': {
				if (currentPart === 'indexEnd') {
					throw new Error(`Invalid character '${character}' after an index at position ${position}`);
				}

				if (currentPart !== 'index') {
					// In property context, treat ] as a literal character. Transition out
					// of 'start' like any other literal, otherwise a leading ']' leaves the
					// segment in 'start' and is discarded at the end of the path.
					if (currentPart === 'start') {
						currentPart = 'property';
					}

					currentSegment += character;
					break;
				}

				if (indexSegment === '') {
					// Empty brackets - treat `[]` as literal characters of the property.
					currentSegment += '[]';
					currentPart = 'property';
					break;
				}

				// A real index closes. Flush the pending property segment first
				// (an empty one too, for paths like `foo.[0]`).
				if ((currentSegment !== '' || hadProperty) && !processSegment(currentSegment, parts)) {
					return [];
				}

				currentSegment = '';
				hadProperty = false;

				// Index must be digits only (enforced by default case).
				// The String() check rejects leading zeros like `[01]`.
				const parsedNumber = Number.parseInt(indexSegment, 10);
				const isValidInteger = parsedNumber <= MAX_ARRAY_INDEX
					&& indexSegment === String(parsedNumber);

				// Keep as string if not a valid integer representation or exceeds MAX_ARRAY_INDEX.
				parts.push(isValidInteger ? parsedNumber : indexSegment);

				indexSegment = '';
				currentPart = 'indexEnd';
				break;
			}

			default: {
				if (currentPart === 'index') {
					if (!isDigit(character)) {
						throw new Error(`Invalid character '${character}' in an index at position ${position}`);
					}

					indexSegment += character;
					break;
				}

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
		object = object[key];

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

		if (index === pathArray.length - 1) {
			object[key] = value;
			continue;
		}

		const existingValue = object[key];
		if (isObject(existingValue)) {
			object = existingValue;
			continue;
		}

		// Create a fresh container when the existing value is missing or primitive.
		const nextKey = pathArray[index + 1];
		const shouldCreateArray = typeof nextKey === 'number';
		object[key] = shouldCreateArray ? [] : {};
		object = object[key];
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

		if (index === pathArray.length - 1) {
			const existed = Object.hasOwn(object, key);
			if (!existed) {
				return false;
			}

			delete object[key];
			return true;
		}

		const existingValue = object[key];
		if (!isObject(existingValue)) {
			return false;
		}

		object = existingValue;
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
		if (!isObject(object) || !(key in object)) {
			return false;
		}

		object = object[key];
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

// Format a single path segment's contribution to a stringified path.
// `isFirst` is whether the segment starts the path (no leading separator).
// `startsOutput` is whether nothing has been emitted yet, which happens when every
// preceding segment was an empty string key.
function formatPathSegment(segment, isFirst, startsOutput, preferDotForIndices) {
	// An index may only use bracket notation when it is genuinely at the start of
	// the path or something precedes it in the output. A `[0]` that merely *looks*
	// like the start parses back as a bare index, dropping the empty keys before it.
	const useDotForIndex = !isFirst && (preferDotForIndices || startsOutput);

	if (typeof segment === 'number') {
		// Non-integer or negative numbers are treated as string keys.
		if (!Number.isInteger(segment) || segment < 0) {
			const escaped = escapePath(String(segment));
			return isFirst ? escaped : `.${escaped}`;
		}

		return useDotForIndex ? `.${segment}` : `[${segment}]`;
	}

	// Empty string keys carry no text, only a separator when not first.
	if (segment === '') {
		return isFirst ? '' : '.';
	}

	// Numeric strings are normalized to numbers.
	if (shouldCoerceToNumber(segment)) {
		const numericValue = Number.parseInt(segment, 10);
		return useDotForIndex ? `.${numericValue}` : `[${numericValue}]`;
	}

	// Regular strings use dot notation.
	const escaped = escapePath(segment);
	return isFirst ? escaped : `.${escaped}`;
}

export function stringifyPath(pathSegments, options = {}) {
	if (!Array.isArray(pathSegments)) {
		throw new TypeError(`Expected an array, got ${typeof pathSegments}`);
	}

	const {preferDotForIndices = false} = options;
	const parts = [];
	let startsOutput = true;

	for (const [index, segment] of pathSegments.entries()) {
		// Validate segment types at runtime
		if (typeof segment !== 'string' && typeof segment !== 'number') {
			throw new TypeError(`Expected a string or number for path segment at index ${index}, got ${typeof segment}`);
		}

		const part = formatPathSegment(segment, index === 0, startsOutput, preferDotForIndices);
		parts.push(part);

		if (part !== '') {
			startsOutput = false;
		}
	}

	return parts.join('');
}

function * deepKeysIterator(object) {
	if (!isObject(object)) {
		return;
	}

	const rootEntries = normalizeEntries(object);
	if (rootEntries.length === 0) {
		return;
	}

	// Iterative depth-first walk with an explicit stack, so deeply nested input
	// cannot overflow the call stack (unbounded recursion is a DoS vector).
	//
	// The path string is built incrementally: each segment is escaped and appended
	// once, when we descend into it. Re-stringifying the whole path for every leaf
	// (which re-escapes every ancestor segment) makes the walk quadratic in the
	// depth, so a deeply nested object cheaply blocks the event loop for seconds
	// (an algorithmic-complexity DoS vector).
	const ancestors = new Set([object]);
	const stack = [{iterator: rootEntries[Symbol.iterator](), prefix: '', object}];

	while (stack.length > 0) {
		const frame = stack.at(-1);
		const {value: entry, done} = frame.iterator.next();

		if (done) {
			ancestors.delete(stack.pop().object);
			continue;
		}

		const [key, value] = entry;
		const {prefix} = frame;
		const path = prefix + formatPathSegment(key, stack.length === 1, prefix === '', false);

		if (isObject(value)) {
			// Skip circular references (object already on the current path).
			if (ancestors.has(value)) {
				continue;
			}

			// The entries decide both whether this is a leaf and what to walk, so they are computed once.
			const entries = normalizeEntries(value);
			if (entries.length > 0) {
				ancestors.add(value);
				stack.push({iterator: entries[Symbol.iterator](), prefix: path, object: value});
				continue;
			}
		}

		yield path;
	}
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
