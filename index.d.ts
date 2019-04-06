declare const dotProp: {
	/**
	@param obj - Object to get the `path` value.
	@param path - Path of the property in the object, using `.` to separate each nested key.

	Use `\\.` if you have a `.` in the key.
	@param defaultValue - Default value.

	@example
	```
	import dotProp = require('dot-prop');

	dotProp.get({foo: {bar: 'unicorn'}}, 'foo.bar');
	//=> 'unicorn'

	dotProp.get({foo: {bar: 'a'}}, 'foo.notDefined.deep');
	//=> undefined

	dotProp.get({foo: {bar: 'a'}}, 'foo.notDefined.deep', 'default value');
	//=> 'default value'

	dotProp.get({foo: {'dot.dot': 'unicorn'}}, 'foo.dot\\.dot');
	//=> 'unicorn'
	```
	*/
	get<T = unknown>(
		obj: {[key: string]: unknown},
		path: string,
		defaultValue?: T
	): T;

	/**
	@param obj - Object to set the `path` value.
	@param path - Path of the property in the object, using `.` to separate each nested key.

	Use `\\.` if you have a `.` in the key.
	@param value - Value to set at `path`.

	@example
	```
	import dotProp = require('dot-prop');

	const obj = {foo: {bar: 'a'}};
	dotProp.set(obj, 'foo.bar', 'b');
	console.log(obj);
	//=> {foo: {bar: 'b'}}

	const foo = dotProp.set({}, 'foo.bar', 'c');
	console.log(foo);
	//=> {foo: {bar: 'c'}}

	dotProp.set(obj, 'foo.baz', 'x');
	console.log(obj);
	//=> {foo: {bar: 'b', baz: 'x'}}
	```
	*/
	set<T extends {[key: string]: unknown}>(
		obj: T,
		path: string,
		value: unknown
	): T;

	/**
	@param obj - Object to test the `path` value.
	@param path - Path of the property in the object, using `.` to separate each nested key.

	Use `\\.` if you have a `.` in the key.
	@example
	```
	import dotProp = require('dot-prop');

	dotProp.has({foo: {bar: 'unicorn'}}, 'foo.bar');
	//=> true
	```
	*/
	has(obj: {[key: string]: unknown}, path: string): boolean;

	/**
	@param obj Object to delete the `path` value.
	@param path - Path of the property in the object, using `.` to separate each nested key.

	Use `\\.` if you have a `.` in the key.

	@example
	```
	import dotProp = require('dot-prop');

	const obj = {foo: {bar: 'a'}};
	dotProp.delete(obj, 'foo.bar');
	console.log(obj);
	//=> {foo: {}}

	obj.foo.bar = {x: 'y', y: 'x'};
	dotProp.delete(obj, 'foo.bar.x');
	console.log(obj);
	//=> {foo: {bar: {y: 'x'}}}
	```
	*/
	delete(obj: {[key: string]: unknown}, path: string): void;
};

export = dotProp;
