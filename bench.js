'use strict';
const Benchmark = require('benchmark');
const dotProp = require('.');

const suite = new Benchmark.Suite();

suite
	.add('get', () => {
		const fixture1 = {foo: {bar: 1}};
		dotProp.get(fixture1);
		fixture1[''] = 'foo';
		dotProp.get(fixture1, '');
		dotProp.get(fixture1, 'foo');
		dotProp.get({foo: 1}, 'foo');
		dotProp.get({foo: null}, 'foo');
		dotProp.get({foo: undefined}, 'foo');
		dotProp.get({foo: {bar: true}}, 'foo.bar');
		dotProp.get({foo: {bar: {baz: true}}}, 'foo.bar.baz');
		dotProp.get({foo: {bar: {baz: null}}}, 'foo.bar.baz');
		dotProp.get({foo: {bar: 'a'}}, 'foo.fake');
		dotProp.get({foo: {bar: 'a'}}, 'foo.fake.fake2');
		dotProp.get({'\\': true}, '\\');
		dotProp.get({'\\foo': true}, '\\foo');
		dotProp.get({'bar\\': true}, 'bar\\');
		dotProp.get({'foo\\bar': true}, 'foo\\bar');
		dotProp.get({'\\.foo': true}, '\\\\.foo');
		dotProp.get({'bar\\.': true}, 'bar\\\\.');
		dotProp.get({'foo\\.bar': true}, 'foo\\\\.bar');

		const fixture2 = {};
		Object.defineProperty(fixture2, 'foo', {
			value: 'bar',
			enumerable: false
		});
		dotProp.get(fixture2, 'foo');
		dotProp.get({}, 'hasOwnProperty');

		function fn() {}
		fn.foo = {bar: 1};
		dotProp.get(fn);
		dotProp.get(fn, 'foo');
		dotProp.get(fn, 'foo.bar');

		const fixture3 = {foo: null};
		dotProp.get(fixture3, 'foo.bar');

		dotProp.get({'foo.baz': {bar: true}}, 'foo\\.baz.bar');
		dotProp.get({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar');

		dotProp.get(null, 'foo.bar', false);
		dotProp.get('foo', 'foo.bar', false);
		dotProp.get([], 'foo.bar', false);
		dotProp.get(undefined, 'foo.bar', false);
	})
	.add('set', () => {
		const func = () => 'test';
		let fixture1 = {};

		dotProp.set(fixture1, 'foo', 2);

		fixture1 = {foo: {bar: 1}};
		dotProp.set(fixture1, 'foo.bar', 2);

		dotProp.set(fixture1, 'foo.bar.baz', 3);

		dotProp.set(fixture1, 'foo.bar', 'test');

		dotProp.set(fixture1, 'foo.bar', null);

		dotProp.set(fixture1, 'foo.bar', false);

		dotProp.set(fixture1, 'foo.bar', undefined);

		dotProp.set(fixture1, 'foo.fake.fake2', 'fake');

		dotProp.set(fixture1, 'foo.function', func);

		function fn() {}
		dotProp.set(fn, 'foo.bar', 1);

		fixture1.fn = fn;
		dotProp.set(fixture1, 'fn.bar.baz', 2);

		const fixture2 = {foo: null};
		dotProp.set(fixture2, 'foo.bar', 2);

		const fixture3 = {};
		dotProp.set(fixture3, '', 3);

		dotProp.set(fixture1, 'foo\\.bar.baz', true);

		dotProp.set(fixture1, 'fo\\.ob\\.ar.baz', true);
	})
	.add('delete', () => {
		const func = () => 'test';
		func.foo = 'bar';

		const inner = {
			a: 'a',
			b: 'b',
			c: 'c',
			func
		};

		const fixture1 = {
			foo: {
				bar: {
					baz: inner
				}
			},
			top: {
				dog: 'sindre'
			}
		};

		dotProp.delete(fixture1, 'foo.bar.baz.c');

		dotProp.delete(fixture1, 'top');

		dotProp.delete(fixture1, 'foo.bar.baz.func.foo');

		dotProp.delete(fixture1, 'foo.bar.baz.func');

		dotProp.set(fixture1, 'foo\\.bar.baz', true);
		dotProp.delete(fixture1, 'foo\\.bar.baz');

		const fixture2 = {};
		dotProp.set(fixture2, 'foo.bar\\.baz', true);
		dotProp.delete(fixture2, 'foo.bar\\.baz');

		fixture2.dotted = {
			sub: {
				'dotted.prop': 'foo',
				other: 'prop'
			}
		};
		dotProp.delete(fixture2, 'dotted.sub.dotted\\.prop');
	})
	.add('has', () => {
		const fixture1 = {foo: {bar: 1}};
		dotProp.has(fixture1);
		dotProp.has(fixture1, 'foo');
		dotProp.has({foo: 1}, 'foo');
		dotProp.has({foo: null}, 'foo');
		dotProp.has({foo: undefined}, 'foo');
		dotProp.has({foo: {bar: true}}, 'foo.bar');
		dotProp.has({foo: {bar: {baz: true}}}, 'foo.bar.baz');
		dotProp.has({foo: {bar: {baz: null}}}, 'foo.bar.baz');
		dotProp.has({foo: {bar: 'a'}}, 'foo.fake.fake2');

		function fn() {}
		fn.foo = {bar: 1};
		dotProp.has(fn);
		dotProp.has(fn, 'foo');
		dotProp.has(fn, 'foo.bar');

		dotProp.has({'foo.baz': {bar: true}}, 'foo\\.baz.bar');
		dotProp.has({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar');
	})
	.on('cycle', event => {
		console.log(String(event.target));
	})
	.on('complete', () => {
		console.log('Finished');
	})
	.run({async: true});
