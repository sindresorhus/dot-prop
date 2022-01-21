import Benchmark from 'benchmark';
import {getProperty, setProperty, hasProperty, deleteProperty} from './index.js';

const suite = new Benchmark.Suite();

suite
	.add('getProperty', () => {
		const fixture1 = {foo: {bar: 1}};
		getProperty(fixture1);
		fixture1[''] = 'foo';
		getProperty(fixture1, '');
		getProperty(fixture1, 'foo');
		getProperty({foo: 1}, 'foo');
		getProperty({foo: null}, 'foo');
		getProperty({foo: undefined}, 'foo');
		getProperty({foo: {bar: true}}, 'foo.bar');
		getProperty({foo: {bar: {baz: true}}}, 'foo.bar.baz');
		getProperty({foo: {bar: {baz: null}}}, 'foo.bar.baz');
		getProperty({foo: {bar: 'a'}}, 'foo.fake');
		getProperty({foo: {bar: 'a'}}, 'foo.fake.fake2');
		getProperty({'\\': true}, '\\');
		getProperty({'\\foo': true}, '\\foo');
		getProperty({'bar\\': true}, 'bar\\');
		getProperty({'foo\\bar': true}, 'foo\\bar');
		getProperty({'\\.foo': true}, '\\\\.foo');
		getProperty({'bar\\.': true}, 'bar\\\\.');
		getProperty({'foo\\.bar': true}, 'foo\\\\.bar');

		const fixture2 = {};
		Object.defineProperty(fixture2, 'foo', {
			value: 'bar',
			enumerable: false,
		});
		getProperty(fixture2, 'foo');
		getProperty({}, 'hasOwnProperty');

		function fn() {}
		fn.foo = {bar: 1};
		getProperty(fn);
		getProperty(fn, 'foo');
		getProperty(fn, 'foo.bar');

		const fixture3 = {foo: null};
		getProperty(fixture3, 'foo.bar');

		getProperty({'foo.baz': {bar: true}}, 'foo\\.baz.bar');
		getProperty({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar');

		getProperty(null, 'foo.bar', false);
		getProperty('foo', 'foo.bar', false);
		getProperty([], 'foo.bar', false);
		getProperty(undefined, 'foo.bar', false);
	})
	.add('setProperty', () => {
		const func = () => 'test';
		let fixture1 = {};

		setProperty(fixture1, 'foo', 2);

		fixture1 = {foo: {bar: 1}};
		setProperty(fixture1, 'foo.bar', 2);

		setProperty(fixture1, 'foo.bar.baz', 3);

		setProperty(fixture1, 'foo.bar', 'test');

		setProperty(fixture1, 'foo.bar', null);

		setProperty(fixture1, 'foo.bar', false);

		setProperty(fixture1, 'foo.bar', undefined);

		setProperty(fixture1, 'foo.fake.fake2', 'fake');

		setProperty(fixture1, 'foo.function', func);

		function fn() {}
		setProperty(fn, 'foo.bar', 1);

		fixture1.fn = fn;
		setProperty(fixture1, 'fn.bar.baz', 2);

		const fixture2 = {foo: null};
		setProperty(fixture2, 'foo.bar', 2);

		const fixture3 = {};
		setProperty(fixture3, '', 3);

		setProperty(fixture1, 'foo\\.bar.baz', true);

		setProperty(fixture1, 'fo\\.ob\\.ar.baz', true);
	})
	.add('hasProperty', () => {
		const fixture1 = {foo: {bar: 1}};
		hasProperty(fixture1);
		hasProperty(fixture1, 'foo');
		hasProperty({foo: 1}, 'foo');
		hasProperty({foo: null}, 'foo');
		hasProperty({foo: undefined}, 'foo');
		hasProperty({foo: {bar: true}}, 'foo.bar');
		hasProperty({foo: {bar: {baz: true}}}, 'foo.bar.baz');
		hasProperty({foo: {bar: {baz: null}}}, 'foo.bar.baz');
		hasProperty({foo: {bar: 'a'}}, 'foo.fake.fake2');

		function fn() {}
		fn.foo = {bar: 1};
		hasProperty(fn);
		hasProperty(fn, 'foo');
		hasProperty(fn, 'foo.bar');

		hasProperty({'foo.baz': {bar: true}}, 'foo\\.baz.bar');
		hasProperty({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar');
	})
	.add('deleteProperty', () => {
		const func = () => 'test';
		func.foo = 'bar';

		const inner = {
			a: 'a',
			b: 'b',
			c: 'c',
			func,
		};

		const fixture1 = {
			foo: {
				bar: {
					baz: inner,
				},
			},
			top: {
				dog: 'sindre',
			},
		};

		deleteProperty(fixture1, 'foo.bar.baz.c');

		deleteProperty(fixture1, 'top');

		deleteProperty(fixture1, 'foo.bar.baz.func.foo');

		deleteProperty(fixture1, 'foo.bar.baz.func');

		setProperty(fixture1, 'foo\\.bar.baz', true);
		deleteProperty(fixture1, 'foo\\.bar.baz');

		const fixture2 = {};
		setProperty(fixture2, 'foo.bar\\.baz', true);
		deleteProperty(fixture2, 'foo.bar\\.baz');

		fixture2.dotted = {
			sub: {
				'dotted.prop': 'foo',
				other: 'prop',
			},
		};
		deleteProperty(fixture2, 'dotted.sub.dotted\\.prop');
	})
	.on('cycle', event => {
		console.log(String(event.target));
	})
	.on('complete', () => {
		console.log('Finished');
	})
	.run({async: true});
