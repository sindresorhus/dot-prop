'use strict';
/* globals bench */
var m = require('./');

bench('get', function () {
	var f1 = {foo: {bar: 1}};
	m.get(f1);
	m.get(f1, 'foo');
	m.get({foo: 1}, 'foo');
	m.get({foo: null}, 'foo');
	m.get({foo: undefined}, 'foo');
	m.get({foo: {bar: true}}, 'foo.bar');
	m.get({foo: {bar: {baz: true}}}, 'foo.bar.baz');
	m.get({foo: {bar: {baz: null}}}, 'foo.bar.baz');
	m.get({foo: {bar: 'a'}}, 'foo.fake.fake2');

	function fn() {}
	fn.foo = {bar: 1};
	m.get(fn);
	m.get(fn, 'foo');
	m.get(fn, 'foo.bar');

	m.get({'foo.baz': {bar: true}}, 'foo\\.baz.bar');
	m.get({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar');
});

bench('set', function () {
	var func = () => 'test';
	var f1 = {};

	m.set(f1, 'foo', 2);

	f1 = {foo: {bar: 1}};
	m.set(f1, 'foo.bar', 2);

	m.set(f1, 'foo.bar.baz', 3);

	m.set(f1, 'foo.bar', 'test');

	m.set(f1, 'foo.bar', null);

	m.set(f1, 'foo.bar', false);

	m.set(f1, 'foo.bar', undefined);

	m.set(f1, 'foo.fake.fake2', 'fake');

	m.set(f1, 'foo.function', func);

	function fn() {}
	m.set(fn, 'foo.bar', 1);

	f1.fn = fn;
	m.set(f1, 'fn.bar.baz', 2);

	m.set(f1, 'foo\\.bar.baz', true);

	m.set(f1, 'fo\\.ob\\.ar.baz', true);
});

bench('delete', function () {
	var func = () => 'test';
	func.foo = 'bar';

	var inner = {a: 'a', b: 'b', c: 'c', func: func};
	var f1 = {foo: {bar: {baz: inner}}, top: {dog: 'sindre'}};

	m.delete(f1, 'foo.bar.baz.c');

	m.delete(f1, 'top');

	m.delete(f1, 'foo.bar.baz.func.foo');

	m.delete(f1, 'foo.bar.baz.func');

	m.set(f1, 'foo\\.bar.baz', true);
	m.delete(f1, 'foo\\.bar.baz');

	var f2 = {};
	m.set(f2, 'foo.bar\\.baz', true);
	m.delete(f2, 'foo.bar\\.baz');

	f2.dotted = {sub: {'dotted.prop': 'foo', 'other': 'prop'}};
	m.delete(f2, 'dotted.sub.dotted\\.prop');
});
