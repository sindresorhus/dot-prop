import Benchmark from 'benchmark';
import {
	getProperty,
	setProperty,
	hasProperty,
	deleteProperty,
} from './index.js';

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
		getProperty({'\\foo': true}, String.raw`\foo`);
		getProperty({'bar\\': true}, 'bar\\');
		getProperty({'foo\\bar': true}, String.raw`foo\bar`);
		getProperty({'\\.foo': true}, String.raw`\\.foo`);
		getProperty({'bar\\.': true}, String.raw`bar\\.`);
		getProperty({'foo\\.bar': true}, String.raw`foo\\.bar`);

		const fixture2 = {};
		Object.defineProperty(fixture2, 'foo', {
			value: 'bar',
			enumerable: false,
		});
		getProperty(fixture2, 'foo');
		getProperty({}, 'hasOwnProperty');

		function function_() {}
		function_.foo = {bar: 1};
		getProperty(function_);
		getProperty(function_, 'foo');
		getProperty(function_, 'foo.bar');

		const fixture3 = {foo: null};
		getProperty(fixture3, 'foo.bar');

		getProperty({'foo.baz': {bar: true}}, String.raw`foo\.baz.bar`);
		getProperty({'fo.ob.az': {bar: true}}, String.raw`fo\.ob\.az.bar`);

		getProperty(null, 'foo.bar', false);
		getProperty('foo', 'foo.bar', false);
		getProperty([], 'foo.bar', false);
		getProperty(undefined, 'foo.bar', false);
	})
	.add('setProperty', () => {
		const function_ = () => 'test';
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

		setProperty(fixture1, 'foo.function', function_);

		function function__() {}
		setProperty(function__, 'foo.bar', 1);

		fixture1.fn = function__;
		setProperty(fixture1, 'fn.bar.baz', 2);

		const fixture2 = {foo: null};
		setProperty(fixture2, 'foo.bar', 2);

		const fixture3 = {};
		setProperty(fixture3, '', 3);

		setProperty(fixture1, String.raw`foo\.bar.baz`, true);

		setProperty(fixture1, String.raw`fo\.ob\.ar.baz`, true);
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

		function function_() {}
		function_.foo = {bar: 1};
		hasProperty(function_);
		hasProperty(function_, 'foo');
		hasProperty(function_, 'foo.bar');

		hasProperty({'foo.baz': {bar: true}}, String.raw`foo\.baz.bar`);
		hasProperty({'fo.ob.az': {bar: true}}, String.raw`fo\.ob\.az.bar`);
	})
	.add('deleteProperty', () => {
		const function_ = () => 'test';
		function_.foo = 'bar';

		const inner = {
			a: 'a',
			b: 'b',
			c: 'c',
			func: function_,
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

		setProperty(fixture1, String.raw`foo\.bar.baz`, true);
		deleteProperty(fixture1, String.raw`foo\.bar.baz`);

		const fixture2 = {};
		setProperty(fixture2, String.raw`foo.bar\.baz`, true);
		deleteProperty(fixture2, String.raw`foo.bar\.baz`);

		fixture2.dotted = {
			sub: {
				'dotted.prop': 'foo',
				other: 'prop',
			},
		};
		deleteProperty(fixture2, String.raw`dotted.sub.dotted\.prop`);
	})
	.add('getProperty - with filter', () => {
		const fixture1 = {
			users: [
				{id: 1, name: 'Alice', role: 'admin'},
				{id: 2, name: 'Bob', role: 'user'},
				{id: 3, name: 'Charlie', role: 'admin'},
			],
		};
		getProperty(fixture1, 'users[id=1].name');
		getProperty(fixture1, 'users[role="admin"].name');
		getProperty(fixture1, 'users[id=2].role');
		getProperty(fixture1, 'users[id=999].name', 'default');
		getProperty(fixture1, 'users[role="guest"].name', 'default');
	})
	.add('setProperty - with filter', () => {
		const fixture1 = {
			users: [
				{id: 1, name: 'Alice', role: 'admin'},
				{id: 2, name: 'Bob', role: 'user'},
			],
		};
		setProperty(fixture1, 'users[id=1].name', 'Alicia');
		setProperty(fixture1, 'users[role="user"].name', 'Robert');
		setProperty(fixture1, 'users[id=999].name', 'NoMatch');
	})
	.add('hasProperty - with filter', () => {
		const fixture1 = {
			users: [
				{id: 1, name: 'Alice', role: 'admin'},
				{id: 2, name: 'Bob', role: 'user'},
			],
		};
		hasProperty(fixture1, 'users[id=1].name');
		hasProperty(fixture1, 'users[role="admin"].name');
		hasProperty(fixture1, 'users[id=999].name');
	})
	.add('deleteProperty - with filter', () => {
		const fixture1 = {
			users: [
				{
					id: 1, name: 'Alice', role: 'admin', temp: 'data',
				},
				{
					id: 2, name: 'Bob', role: 'user', temp: 'data',
				},
			],
		};
		deleteProperty(fixture1, 'users[id=1].temp');
		deleteProperty(fixture1, 'users[role="user"].temp');
	})
	.on('cycle', event => {
		console.log(String(event.target));
	})
	.on('complete', () => {
		console.log('Finished');
	})
	.run({async: true});
