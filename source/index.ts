import {type Get} from 'type-fest';

// Helper types for improved readability
type AFunction = (() => void);
type AnArray = unknown[];
type AnObject = Record<PropertyKey, unknown>;
type Segment = number | string;

const isObject = (value: unknown): value is AnObject => {
	const type = typeof value;
	return value !== null && (type === 'object' || type === 'function');
};

const isEmptyObject = (value: unknown): value is AnObject => isObject(value) && Object.keys(value).length === 0;

const disallowedKeys = new Set([
	'__proto__',
	'prototype',
	'constructor',
]);

const digits = new Set('0123456789');

// eslint-disable-next-line complexity
function getPathSegments(path: string) {
	const parts = [];
	let currentSegment = '';
	let currentPart = 'start';
	let isIgnoring = false;

	for (const character of path) {
		switch (character) {
			case '\\': {
				if (currentPart === 'index') {
					throw new Error('Invalid character in an index');
				}

				if (currentPart === 'indexEnd') {
					throw new Error('Invalid character after an index');
				}

				if (isIgnoring) {
					currentSegment += character;
				}

				currentPart = 'property';
				isIgnoring = !isIgnoring;
				break;
			}

			case '.': {
				if (currentPart === 'index') {
					throw new Error('Invalid character in an index');
				}

				if (currentPart === 'indexEnd') {
					currentPart = 'property';
					break;
				}

				if (isIgnoring) {
					isIgnoring = false;
					currentSegment += character;
					break;
				}

				if (disallowedKeys.has(currentSegment)) {
					return [];
				}

				parts.push(currentSegment);
				currentSegment = '';
				currentPart = 'property';
				break;
			}

			case '[': {
				if (currentPart === 'index') {
					throw new Error('Invalid character in an index');
				}

				if (currentPart === 'indexEnd') {
					currentPart = 'index';
					break;
				}

				if (isIgnoring) {
					isIgnoring = false;
					currentSegment += character;
					break;
				}

				if (currentPart === 'property') {
					if (disallowedKeys.has(currentSegment)) {
						return [];
					}

					parts.push(currentSegment);
					currentSegment = '';
				}

				currentPart = 'index';
				break;
			}

			case ']': {
				if (currentPart === 'index') {
					parts.push(Number.parseInt(currentSegment, 10));
					currentSegment = '';
					currentPart = 'indexEnd';
					break;
				}

				if (currentPart === 'indexEnd') {
					throw new Error('Invalid character after an index');
				}

				// Falls through
			}

			default: {
				if (currentPart === 'index' && !digits.has(character)) {
					throw new Error('Invalid character in an index');
				}

				if (currentPart === 'indexEnd') {
					throw new Error('Invalid character after an index');
				}

				if (currentPart === 'start') {
					currentPart = 'property';
				}

				if (isIgnoring) {
					isIgnoring = false;
					currentSegment += '\\';
				}

				currentSegment += character;
			}
		}
	}

	if (isIgnoring) {
		currentSegment += '\\';
	}

	switch (currentPart) {
		case 'property': {
			if (disallowedKeys.has(currentSegment)) {
				return [];
			}

			parts.push(currentSegment);

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

function isStringIndex(object: unknown, key: Segment): key is string {
	if (typeof key !== 'number' && Array.isArray(object)) {
		const index = Number.parseInt(key, 10);
		return Number.isInteger(index) && object[index] === object[key as unknown as number];
	}

	return false;
}

function assertNotStringIndex(object: unknown, key: Segment) {
	if (isStringIndex(object, key)) {
		throw new Error('Cannot use string index');
	}
}

/**
Get the value of the property at the given path.

@param object - Object or array to get the `path` value.
@param path - Path of the property in the object, using `.` to separate each nested key. Use `\\.` if you have a `.` in the key.
@param defaultValue - Default value.

@example
```
import {getProperty} from 'dot-prop';

getProperty({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> 'unicorn'

getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep');
//=> undefined

getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep', 'default value');
//=> 'default value'

getProperty({foo: {'dot.dot': 'unicorn'}}, 'foo.dot\\.dot');
//=> 'unicorn'

getProperty({foo: [{bar: 'unicorn'}]}, 'foo[0].bar');
//=> 'unicorn'
```
*/
export function getProperty<ObjectType, PathType extends string, DefaultValue = undefined, ReturnType = ObjectType extends AnObject | AFunction ? (unknown extends Get<ObjectType, PathType> ? DefaultValue : Get<ObjectType, PathType>) : undefined>(
	object: ObjectType,
	path?: PathType,
	defaultValue?: DefaultValue,
): ReturnType {
	if (!isObject(object) || typeof path !== 'string') {
		return (defaultValue === undefined ? object : defaultValue) as ReturnType;
	}

	const pathArray = getPathSegments(path);
	if (pathArray.length === 0) {
		return defaultValue as ReturnType;
	}

	for (let index = 0; index < pathArray.length; index++) {
		const key = pathArray[index]!;

		object = isStringIndex(object, key)
			? (index === pathArray.length - 1 ? undefined : null) as unknown as ObjectType
			: ((object as unknown as AnObject)[key]) as ObjectType;

		if (object === undefined || object === null) {
			// `object` is either `undefined` or `null` so we want to stop the loop, and
			// if this is not the last bit of the path, and
			// if it didn't return `undefined`
			// it would return `null` if `object` is `null`
			// but we want `get({foo: null}, 'foo.bar')` to equal `undefined`, or the supplied value, not `null`
			if (index !== pathArray.length - 1) {
				return defaultValue as ReturnType;
			}

			break;
		}
	}

	return (object === undefined ? defaultValue : object) as ReturnType;
}

/**
Set the property at the given path to the given value.

@param object - Object or array to set the `path` value.
@param path - Path of the property in the object, using `.` to separate each nested key. Use `\\.` if you have a `.` in the key.
@param value - Value to set at `path`.
@returns The object.

@example
```
import {setProperty} from 'dot-prop';

const object = {foo: {bar: 'a'}};
setProperty(object, 'foo.bar', 'b');
console.log(object);
//=> {foo: {bar: 'b'}}

const foo = setProperty({}, 'foo.bar', 'c');
console.log(foo);
//=> {foo: {bar: 'c'}}

setProperty(object, 'foo.baz', 'x');
console.log(object);
//=> {foo: {bar: 'b', baz: 'x'}}

setProperty(object, 'foo.biz[0]', 'a');
console.log(object);
//=> {foo: {bar: 'b', baz: 'x', biz: ['a']}}
```
*/
export function setProperty<ObjectType extends (AFunction | AnArray | AnObject)>(
	object: ObjectType,
	path: string,
	value: unknown,
): ObjectType {
	if (!isObject(object) || typeof path !== 'string') {
		return object;
	}

	const root = object;
	const pathArray = getPathSegments(path);

	for (let index = 0; index < pathArray.length; index++) {
		const key = pathArray[index]!;

		assertNotStringIndex(object, key);

		if (index === pathArray.length - 1) {
			(object as AnObject)[key as number] = value;
		} else if (!isObject((object as AnObject)[key])) {
			(object as AnObject)[key as number] = typeof pathArray[index + 1] === 'number' ? [] : {};
		}

		object = (object as AnObject)[key as number] as ObjectType;
	}

	return root;
}

/**
Delete the property at the given path.

@param object - Object or array to delete the `path` value.
@param path - Path of the property in the object, using `.` to separate each nested key. Use `\\.` if you have a `.` in the key.
@returns A boolean of whether the property existed before being deleted.

@example
```
import {deleteProperty} from 'dot-prop';

const object = {foo: {bar: 'a'}};
deleteProperty(object, 'foo.bar');
console.log(object);
//=> {foo: {}}

object.foo.bar = {x: 'y', y: 'x'};
deleteProperty(object, 'foo.bar.x');
console.log(object);
//=> {foo: {bar: {y: 'x'}}}
```
*/
export function deleteProperty(object: AFunction | AnArray | AnObject, path: string): boolean {
	if (isObject(object) && typeof path === 'string') {
		const pathArray = getPathSegments(path);

		for (let index = 0; index < pathArray.length; index++) {
			const key = pathArray[index]!;

			assertNotStringIndex(object, key);

			if (index === pathArray.length - 1) {
				delete object[key as number];
				return true;
			}

			object = object[key as number] as AnObject;

			if (!isObject(object)) {
				return false;
			}
		}
	}

	return false;
}

/**
Check whether the property at the given path exists.

@param object - Object or array to test the `path` value.
@param path - Path of the property in the object, using `.` to separate each nested key. Use `\\.` if you have a `.` in the key.

@example
```
import {hasProperty} from 'dot-prop';

hasProperty({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> true
```
*/
export function hasProperty(object: AnObject | AFunction | undefined, path?: string): boolean {
	if (!isObject(object) || typeof path !== 'string') {
		return false;
	}

	const pathArray = getPathSegments(path);
	if (pathArray.length === 0) {
		return false;
	}

	for (const key of pathArray) {
		if (!isObject(object) || !(key in object) || isStringIndex(object, key)) {
			return false;
		}

		object = object[key] as AnObject;
	}

	return true;
}

// TODO: Backslashes with no effect should not be escaped
/**
Escape special characters in a path. Useful for sanitizing user input.

@param path - The dot path to sanitize.

@example
```
import {getProperty, escapePath} from 'dot-prop';

const object = {
	foo: {
		bar: '👸🏻 You found me Mario!',
	},
	'foo.bar' : '🍄 The princess is in another castle!',
};
const escapedPath = escapePath('foo.bar');

console.log(getProperty(object, escapedPath));
//=> '🍄 The princess is in another castle!'
```
*/
export function escapePath(path: string): string {
	if (typeof path !== 'string') {
		throw new TypeError('Expected a string');
	}

	return path.replaceAll(/[\\.[]/g, '\\$&');
}

// The keys returned by Object.entries() for arrays are strings
function entries(value: Segment[]): Array<[Segment, Segment]> {
	const result = Object.entries(value);
	if (Array.isArray(value)) {
		return result.map(([key, value]) => [Number(key), value]);
	}

	return result;
}

function stringifyPath(pathSegments: Segment[]) {
	let result = '';

	for (let [index, segment] of entries(pathSegments)) {
		if (typeof segment === 'number') {
			result += `[${segment}]`;
		} else {
			segment = escapePath(segment);
			result += index === 0 ? segment : `.${segment}`;
		}
	}

	return result;
}

function * deepKeysIterator(object: unknown, currentPath: Segment[] = []): Generator<string, void> {
	if (!isObject(object) || isEmptyObject(object)) {
		if (currentPath.length > 0) {
			yield stringifyPath(currentPath);
		}

		return;
	}

	for (const [key, value] of entries(object)) {
		yield * deepKeysIterator(value, [...currentPath, key]);
	}
}

/**
Returns an array of every path. Non-empty plain objects and arrays are deeply recursed and are not themselves included.

This can be useful to help flatten an object for an API that only accepts key-value pairs or for a tagged template literal.

@param object - The object to iterate through.

@example
```
import {getProperty, deepKeys} from 'dot-prop';

const user = {
	name: {
		first: 'Richie',
		last: 'Bendall',
	},
	activeTasks: [],
	currentProject: null
};

for (const property of deepKeys(user)) {
	console.log(`${property}: ${getProperty(user, property)}`);
	//=> name.first: Richie
	//=> name.last: Bendall
	//=> activeTasks: []
	//=> currentProject: null
}
```
*/
export function deepKeys(object: unknown): string[] {
	return [...deepKeysIterator(object)];
}
