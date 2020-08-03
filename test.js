import test from 'ava';
import m from '.';

test('get', t => {
	const f1 = {foo: {bar: 1}};
	t.is(m.get(f1), f1);
	f1[''] = 'foo';
	t.is(m.get(f1, ''), 'foo');
	t.is(m.get(f1, 'foo'), f1.foo);
	t.is(m.get({foo: 1}, 'foo'), 1);
	t.is(m.get({foo: null}, 'foo'), null);
	t.is(m.get({foo: undefined}, 'foo'), undefined);
	t.is(m.get({foo: {bar: true}}, 'foo.bar'), true);
	t.is(m.get({foo: {bar: {baz: true}}}, 'foo.bar.baz'), true);
	t.is(m.get({foo: {bar: {baz: null}}}, 'foo.bar.baz'), null);
	t.is(m.get({foo: {bar: 'a'}}, 'foo.fake'), undefined);
	t.is(m.get({foo: {bar: 'a'}}, 'foo.fake.fake2'), undefined);
	t.is(m.get({foo: {bar: 'a'}}, 'foo.fake.fake2', 'some value'), 'some value');
	t.is(m.get({'\\': true}, '\\'), true);
	t.is(m.get({'\\foo': true}, '\\foo'), true);
	t.is(m.get({'bar\\': true}, 'bar\\'), true);
	t.is(m.get({'foo\\bar': true}, 'foo\\bar'), true);
	t.is(m.get({'\\.foo': true}, '\\\\.foo'), true);
	t.is(m.get({'bar\\.': true}, 'bar\\\\.'), true);
	t.is(m.get({'foo\\.bar': true}, 'foo\\\\.bar'), true);
	t.is(m.get({foo: 1}, 'foo.bar'), undefined);

	const f2 = {};
	Object.defineProperty(f2, 'foo', {
		value: 'bar',
		enumerable: false
	});
	t.is(m.get(f2, 'foo'), undefined);
	t.is(m.get({}, 'hasOwnProperty'), undefined);

	function fn() {}
	fn.foo = {bar: 1};
	t.is(m.get(fn), fn);
	t.is(m.get(fn, 'foo'), fn.foo);
	t.is(m.get(fn, 'foo.bar'), 1);

	const f3 = {foo: null};
	t.is(m.get(f3, 'foo.bar'), undefined);
	t.is(m.get(f3, 'foo.bar', 'some value'), 'some value');

	t.is(m.get({'foo.baz': {bar: true}}, 'foo\\.baz.bar'), true);
	t.is(m.get({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'), true);

	t.is(m.get(null, 'foo.bar', false), false);
	t.is(m.get('foo', 'foo.bar', false), false);
	t.is(m.get([], 'foo.bar', false), false);
	t.is(m.get(undefined, 'foo.bar', false), false);
});

test('set', t => {
	const func = () => 'test';
	let f1 = {};

	const o1 = m.set(f1, 'foo', 2);
	t.is(f1.foo, 2);
	t.is(o1, f1);

	f1 = {foo: {bar: 1}};
	m.set(f1, 'foo.bar', 2);
	t.is(f1.foo.bar, 2);

	m.set(f1, 'foo.bar.baz', 3);
	t.is(f1.foo.bar.baz, 3);

	m.set(f1, 'foo.bar', 'test');
	t.is(f1.foo.bar, 'test');

	m.set(f1, 'foo.bar', null);
	t.is(f1.foo.bar, null);

	m.set(f1, 'foo.bar', false);
	t.is(f1.foo.bar, false);

	m.set(f1, 'foo.bar', undefined);
	t.is(f1.foo.bar, undefined);

	m.set(f1, 'foo.fake.fake2', 'fake');
	t.is(f1.foo.fake.fake2, 'fake');

	m.set(f1, 'foo.function', func);
	t.is(f1.foo.function, func);

	function fn() {}
	m.set(fn, 'foo.bar', 1);
	t.is(fn.foo.bar, 1);

	f1.fn = fn;
	m.set(f1, 'fn.bar.baz', 2);
	t.is(f1.fn.bar.baz, 2);

	const f2 = {foo: null};
	m.set(f2, 'foo.bar', 2);
	t.is(f2.foo.bar, 2);

	const f3 = {};
	m.set(f3, '', 3);
	t.is(f3[''], 3);

	m.set(f1, 'foo\\.bar.baz', true);
	t.is(f1['foo.bar'].baz, true);

	m.set(f1, 'fo\\.ob\\.ar.baz', true);
	t.is(f1['fo.ob.ar'].baz, true);

	const f4 = 'noobject';
	const o4 = m.set(f4, 'foo.bar', 2);
	t.is(f4, 'noobject');
	t.is(o4, f4);
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
	const f1 = {
		foo: {
			bar: {
				baz: inner
			}
		},
		top: {
			dog: 'sindre'
		}
	};

	t.is(f1.foo.bar.baz.c, 'c');
	m.delete(f1, 'foo.bar.baz.c');
	t.is(f1.foo.bar.baz.c, undefined);

	t.is(f1.top.dog, 'sindre');
	m.delete(f1, 'top');
	t.is(f1.top, undefined);

	t.is(f1.foo.bar.baz.func.foo, 'bar');
	m.delete(f1, 'foo.bar.baz.func.foo');
	t.is(f1.foo.bar.baz.func.foo, undefined);

	t.is(f1.foo.bar.baz.func, func);
	m.delete(f1, 'foo.bar.baz.func');
	t.is(f1.foo.bar.baz.func, undefined);

	m.set(f1, 'foo\\.bar.baz', true);
	t.is(f1['foo.bar'].baz, true);
	m.delete(f1, 'foo\\.bar.baz');
	t.is(f1['foo.bar'].baz, undefined);

	const f2 = {};
	m.set(f2, 'foo.bar\\.baz', true);
	t.is(f2.foo['bar.baz'], true);
	m.delete(f2, 'foo.bar\\.baz');
	t.is(f2.foo['bar.baz'], undefined);

	f2.dotted = {
		sub: {
			'dotted.prop': 'foo',
			other: 'prop'
		}
	};
	m.delete(f2, 'dotted.sub.dotted\\.prop');
	t.is(f2.dotted.sub['dotted.prop'], undefined);
	t.is(f2.dotted.sub.other, 'prop');

	const f3 = {foo: null};
	m.delete(f3, 'foo.bar');
	t.deepEqual(f3, {foo: null});
});

test('has', t => {
	const f1 = {foo: {bar: 1}};
	t.is(m.has(f1), false);
	t.is(m.has(f1, 'foo'), true);
	t.is(m.has({foo: 1}, 'foo'), true);
	t.is(m.has({foo: null}, 'foo'), true);
	t.is(m.has({foo: undefined}, 'foo'), true);
	t.is(m.has({foo: {bar: true}}, 'foo.bar'), true);
	t.is(m.has({foo: {bar: {baz: true}}}, 'foo.bar.baz'), true);
	t.is(m.has({foo: {bar: {baz: null}}}, 'foo.bar.baz'), true);
	t.is(m.has({foo: {bar: 'a'}}, 'foo.fake.fake2'), false);
	t.is(m.has({foo: null}, 'foo.bar'), false);
	t.is(m.has({foo: ''}, 'foo.bar'), false);

	function fn() {}
	fn.foo = {bar: 1};
	t.is(m.has(fn), false);
	t.is(m.has(fn, 'foo'), true);
	t.is(m.has(fn, 'foo.bar'), true);

	t.is(m.has({'foo.baz': {bar: true}}, 'foo\\.baz.bar'), true);
	t.is(m.has({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'), true);
});

test('prevent setting/getting `__proto__`', t => {
	m.set({}, '__proto__.unicorn', '🦄');
	t.not({}.unicorn, '🦄'); // eslint-disable-line no-use-extend-native/no-use-extend-native

	t.is(m.get({}, '__proto__'), undefined);
});
