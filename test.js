'use strict';
var test = require('ava');
var dotProp = require('./');

test(function getter(t) {
	var f1 = {foo: {bar: 1}};
	t.assert(dotProp.get(f1) === f1);
	t.assert(dotProp.get(f1, 'foo') === f1.foo);
	t.assert(dotProp.get({foo: 1}, 'foo') === 1);
	t.assert(dotProp.get({foo: null}, 'foo') === null);
	t.assert(dotProp.get({foo: undefined}, 'foo') === undefined);
	t.assert(dotProp.get({foo: {bar: true}}, 'foo.bar') === true);
	t.assert(dotProp.get({foo: {bar: {baz: true}}}, 'foo.bar.baz') === true);
	t.assert(dotProp.get({foo: {bar: {baz: null}}}, 'foo.bar.baz') === null);
	t.assert(dotProp.get({foo: {bar: 'a'}}, 'foo.fake.fake2') === undefined);

	function fn () {}
	fn.foo = {bar: 1};
	t.assert(dotProp.get(fn), fn)
	t.assert(dotProp.get(fn, 'foo') === fn.foo)
	t.assert(dotProp.get(fn, 'foo.bar') === 1);
	t.end();
});

test(function setter(t) {
	var f1 = {};

	function func() {
		return 'test';
	}

	dotProp.set(f1, 'foo', 2);
	t.assert(f1.foo === 2);

	f1 = {foo: {bar: 1}};
	dotProp.set(f1, 'foo.bar', 2);
	t.assert(f1.foo.bar === 2);

	dotProp.set(f1, 'foo.bar.baz', 3);
	t.assert(f1.foo.bar.baz === 3);

	dotProp.set(f1, 'foo.bar', 'test');
	t.assert(f1.foo.bar === 'test');

	dotProp.set(f1, 'foo.bar', null);
	t.assert(f1.foo.bar === null);

	dotProp.set(f1, 'foo.bar', false);
	t.assert(f1.foo.bar === false);

	dotProp.set(f1, 'foo.bar', undefined);
	t.assert(f1.foo.bar === undefined);

	dotProp.set(f1, 'foo.fake.fake2', 'fake');
	t.assert(f1.foo.fake.fake2 === 'fake');

	dotProp.set(f1, 'foo.function', func);
	t.assert(f1.foo.function === func);

	function fn () {}
	dotProp.set(fn, 'foo.bar', 1);
	t.assert(fn.foo.bar === 1);

	f1.fn = fn;
	dotProp.set(f1, 'fn.bar.baz', 2);
	t.assert(f1.fn.bar.baz, 2);

	t.end();
});
