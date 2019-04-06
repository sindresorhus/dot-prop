import test from 'ava';
import dotProp from '.';

test('get', t => {
	const fixture1 = {foo: {bar: 1}};
	t.is(dotProp.get(fixture1), fixture1);
	fixture1[''] = 'foo';
	t.is(dotProp.get(fixture1, ''), 'foo');
	t.is(dotProp.get(fixture1, 'foo'), fixture1.foo);
	t.is(dotProp.get({foo: 1}, 'foo'), 1);
	t.is(dotProp.get({foo: null}, 'foo'), null);
	t.is(dotProp.get({foo: undefined}, 'foo'), undefined);
	t.is(dotProp.get({foo: {bar: true}}, 'foo.bar'), true);
	t.is(dotProp.get({foo: {bar: {baz: true}}}, 'foo.bar.baz'), true);
	t.is(dotProp.get({foo: {bar: {baz: null}}}, 'foo.bar.baz'), null);
	t.is(dotProp.get({foo: {bar: 'a'}}, 'foo.fake'), undefined);
	t.is(dotProp.get({foo: {bar: 'a'}}, 'foo.fake.fake2'), undefined);
	t.is(dotProp.get({foo: {bar: 'a'}}, 'foo.fake.fake2', 'some value'), 'some value');
	t.is(dotProp.get({'\\': true}, '\\'), true);
	t.is(dotProp.get({'\\foo': true}, '\\foo'), true);
	t.is(dotProp.get({'bar\\': true}, 'bar\\'), true);
	t.is(dotProp.get({'foo\\bar': true}, 'foo\\bar'), true);
	t.is(dotProp.get({'\\.foo': true}, '\\\\.foo'), true);
	t.is(dotProp.get({'bar\\.': true}, 'bar\\\\.'), true);
	t.is(dotProp.get({'foo\\.bar': true}, 'foo\\\\.bar'), true);
	t.is(dotProp.get({foo: 1}, 'foo.bar'), undefined);

	const fixture2 = {};
	Object.defineProperty(fixture2, 'foo', {
		value: 'bar',
		enumerable: false
	});
	t.is(dotProp.get(fixture2, 'foo'), undefined);
	t.is(dotProp.get({}, 'hasOwnProperty'), undefined);

	function fn() {}
	fn.foo = {bar: 1};
	t.is(dotProp.get(fn), fn);
	t.is(dotProp.get(fn, 'foo'), fn.foo);
	t.is(dotProp.get(fn, 'foo.bar'), 1);

	const f3 = {foo: null};
	t.is(dotProp.get(f3, 'foo.bar'), undefined);
	t.is(dotProp.get(f3, 'foo.bar', 'some value'), 'some value');

	t.is(dotProp.get({'foo.baz': {bar: true}}, 'foo\\.baz.bar'), true);
	t.is(dotProp.get({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'), true);

	t.is(dotProp.get(null, 'foo.bar', false), false);
	t.is(dotProp.get('foo', 'foo.bar', false), false);
	t.is(dotProp.get([], 'foo.bar', false), false);
	t.is(dotProp.get(undefined, 'foo.bar', false), false);
});

test('set', t => {
	const func = () => 'test';
	let fixture1 = {};

	const o1 = dotProp.set(fixture1, 'foo', 2);
	t.is(fixture1.foo, 2);
	t.is(o1, fixture1);

	fixture1 = {foo: {bar: 1}};
	dotProp.set(fixture1, 'foo.bar', 2);
	t.is(fixture1.foo.bar, 2);

	dotProp.set(fixture1, 'foo.bar.baz', 3);
	t.is(fixture1.foo.bar.baz, 3);

	dotProp.set(fixture1, 'foo.bar', 'test');
	t.is(fixture1.foo.bar, 'test');

	dotProp.set(fixture1, 'foo.bar', null);
	t.is(fixture1.foo.bar, null);

	dotProp.set(fixture1, 'foo.bar', false);
	t.is(fixture1.foo.bar, false);

	dotProp.set(fixture1, 'foo.bar', undefined);
	t.is(fixture1.foo.bar, undefined);

	dotProp.set(fixture1, 'foo.fake.fake2', 'fake');
	t.is(fixture1.foo.fake.fake2, 'fake');

	dotProp.set(fixture1, 'foo.function', func);
	t.is(fixture1.foo.function, func);

	function fn() {}
	dotProp.set(fn, 'foo.bar', 1);
	t.is(fn.foo.bar, 1);

	fixture1.fn = fn;
	dotProp.set(fixture1, 'fn.bar.baz', 2);
	t.is(fixture1.fn.bar.baz, 2);

	const fixture2 = {foo: null};
	dotProp.set(fixture2, 'foo.bar', 2);
	t.is(fixture2.foo.bar, 2);

	const fixture3 = {};
	dotProp.set(fixture3, '', 3);
	t.is(fixture3[''], 3);

	dotProp.set(fixture1, 'foo\\.bar.baz', true);
	t.is(fixture1['foo.bar'].baz, true);

	dotProp.set(fixture1, 'fo\\.ob\\.ar.baz', true);
	t.is(fixture1['fo.ob.ar'].baz, true);

	const fixture4 = 'noobject';
	const output4 = dotProp.set(fixture4, 'foo.bar', 2);
	t.is(fixture4, 'noobject');
	t.is(output4, fixture4);
});

test('delete', t => {
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

	t.is(fixture1.foo.bar.baz.c, 'c');
	dotProp.delete(fixture1, 'foo.bar.baz.c');
	t.is(fixture1.foo.bar.baz.c, undefined);

	t.is(fixture1.top.dog, 'sindre');
	dotProp.delete(fixture1, 'top');
	t.is(fixture1.top, undefined);

	t.is(fixture1.foo.bar.baz.func.foo, 'bar');
	dotProp.delete(fixture1, 'foo.bar.baz.func.foo');
	t.is(fixture1.foo.bar.baz.func.foo, undefined);

	t.is(fixture1.foo.bar.baz.func, func);
	dotProp.delete(fixture1, 'foo.bar.baz.func');
	t.is(fixture1.foo.bar.baz.func, undefined);

	dotProp.set(fixture1, 'foo\\.bar.baz', true);
	t.is(fixture1['foo.bar'].baz, true);
	dotProp.delete(fixture1, 'foo\\.bar.baz');
	t.is(fixture1['foo.bar'].baz, undefined);

	const fixture2 = {};
	dotProp.set(fixture2, 'foo.bar\\.baz', true);
	t.is(fixture2.foo['bar.baz'], true);
	dotProp.delete(fixture2, 'foo.bar\\.baz');
	t.is(fixture2.foo['bar.baz'], undefined);

	fixture2.dotted = {
		sub: {
			'dotted.prop': 'foo',
			other: 'prop'
		}
	};
	dotProp.delete(fixture2, 'dotted.sub.dotted\\.prop');
	t.is(fixture2.dotted.sub['dotted.prop'], undefined);
	t.is(fixture2.dotted.sub.other, 'prop');

	const fixture3 = {foo: null};
	dotProp.delete(fixture3, 'foo.bar');
	t.deepEqual(fixture3, {foo: null});
});

test('has', t => {
	const fixture1 = {foo: {bar: 1}};
	t.is(dotProp.has(fixture1), false);
	t.is(dotProp.has(fixture1, 'foo'), true);
	t.is(dotProp.has({foo: 1}, 'foo'), true);
	t.is(dotProp.has({foo: null}, 'foo'), true);
	t.is(dotProp.has({foo: undefined}, 'foo'), true);
	t.is(dotProp.has({foo: {bar: true}}, 'foo.bar'), true);
	t.is(dotProp.has({foo: {bar: {baz: true}}}, 'foo.bar.baz'), true);
	t.is(dotProp.has({foo: {bar: {baz: null}}}, 'foo.bar.baz'), true);
	t.is(dotProp.has({foo: {bar: 'a'}}, 'foo.fake.fake2'), false);
	t.is(dotProp.has({foo: null}, 'foo.bar'), false);
	t.is(dotProp.has({foo: ''}, 'foo.bar'), false);

	function fn() {}
	fn.foo = {bar: 1};
	t.is(dotProp.has(fn), false);
	t.is(dotProp.has(fn, 'foo'), true);
	t.is(dotProp.has(fn, 'foo.bar'), true);

	t.is(dotProp.has({'foo.baz': {bar: true}}, 'foo\\.baz.bar'), true);
	t.is(dotProp.has({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'), true);
});
