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
	t.true(dotProp.get({foo: {bar: true}}, 'foo.bar'));
	t.true(dotProp.get({foo: {bar: {baz: true}}}, 'foo.bar.baz'));
	t.is(dotProp.get({foo: {bar: {baz: null}}}, 'foo.bar.baz'), null);
	t.is(dotProp.get({foo: {bar: 'a'}}, 'foo.fake'), undefined);
	t.is(dotProp.get({foo: {bar: 'a'}}, 'foo.fake.fake2'), undefined);
	t.is(dotProp.get({foo: {bar: 'a'}}, 'foo.fake.fake2', 'some value'), 'some value');
	t.is(dotProp.get({foo: {}}, 'foo.fake', 'some value'), 'some value');
	t.true(dotProp.get({'\\': true}, '\\'));
	t.true(dotProp.get({'\\foo': true}, '\\foo'));
	t.true(dotProp.get({'bar\\': true}, 'bar\\'));
	t.true(dotProp.get({'foo\\bar': true}, 'foo\\bar'));
	t.true(dotProp.get({'\\.foo': true}, '\\\\.foo'));
	t.true(dotProp.get({'bar\\.': true}, 'bar\\\\.'));
	t.true(dotProp.get({'foo\\.bar': true}, 'foo\\\\.bar'));
	t.is(dotProp.get({foo: 1}, 'foo.bar'), undefined);

	const fixture2 = {};
	Object.defineProperty(fixture2, 'foo', {
		value: 'bar',
		enumerable: false
	});
	t.is(dotProp.get(fixture2, 'foo'), 'bar');
	t.is(dotProp.get({}, 'hasOwnProperty'), Object.prototype.hasOwnProperty);

	function fn() {}
	fn.foo = {bar: 1};
	t.is(dotProp.get(fn), fn);
	t.is(dotProp.get(fn, 'foo'), fn.foo);
	t.is(dotProp.get(fn, 'foo.bar'), 1);

	const f3 = {foo: null};
	t.is(dotProp.get(f3, 'foo.bar'), undefined);
	t.is(dotProp.get(f3, 'foo.bar', 'some value'), 'some value');

	t.true(dotProp.get({'foo.baz': {bar: true}}, 'foo\\.baz.bar'));
	t.true(dotProp.get({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'));

	t.false(dotProp.get(null, 'foo.bar', false));
	t.false(dotProp.get('foo', 'foo.bar', false));
	t.false(dotProp.get([], 'foo.bar', false));
	t.false(dotProp.get(undefined, 'foo.bar', false));

	class F4Class {}
	F4Class.prototype.foo = 1;
	const f4 = new F4Class();
	t.is(dotProp.get(f4, 'foo'), 1); // #46
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
	t.true(fixture1['fo.ob.ar'].baz);

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
	t.true(dotProp.delete(fixture1, 'foo.bar.baz.c'));
	t.is(fixture1.foo.bar.baz.c, undefined);

	t.is(fixture1.top.dog, 'sindre');
	t.true(dotProp.delete(fixture1, 'top'));
	t.is(fixture1.top, undefined);

	t.is(fixture1.foo.bar.baz.func.foo, 'bar');
	t.true(dotProp.delete(fixture1, 'foo.bar.baz.func.foo'));
	t.is(fixture1.foo.bar.baz.func.foo, undefined);

	t.is(fixture1.foo.bar.baz.func, func);
	t.true(dotProp.delete(fixture1, 'foo.bar.baz.func'));
	t.is(fixture1.foo.bar.baz.func, undefined);

	dotProp.set(fixture1, 'foo\\.bar.baz', true);
	t.true(fixture1['foo.bar'].baz);
	t.true(dotProp.delete(fixture1, 'foo\\.bar.baz'));
	t.is(fixture1['foo.bar'].baz, undefined);

	const fixture2 = {};
	dotProp.set(fixture2, 'foo.bar\\.baz', true);
	t.true(fixture2.foo['bar.baz']);
	t.true(dotProp.delete(fixture2, 'foo.bar\\.baz'));
	t.is(fixture2.foo['bar.baz'], undefined);

	fixture2.dotted = {
		sub: {
			'dotted.prop': 'foo',
			other: 'prop'
		}
	};
	t.true(dotProp.delete(fixture2, 'dotted.sub.dotted\\.prop'));
	t.is(fixture2.dotted.sub['dotted.prop'], undefined);
	t.is(fixture2.dotted.sub.other, 'prop');

	const fixture3 = {foo: null};
	t.false(dotProp.delete(fixture3, 'foo.bar'));
	t.deepEqual(fixture3, {foo: null});
});

test('has', t => {
	const fixture1 = {foo: {bar: 1}};
	t.false(dotProp.has(fixture1));
	t.true(dotProp.has(fixture1, 'foo'));
	t.true(dotProp.has({foo: 1}, 'foo'));
	t.true(dotProp.has({foo: null}, 'foo'));
	t.true(dotProp.has({foo: undefined}, 'foo'));
	t.true(dotProp.has({foo: {bar: true}}, 'foo.bar'));
	t.true(dotProp.has({foo: {bar: {baz: true}}}, 'foo.bar.baz'));
	t.true(dotProp.has({foo: {bar: {baz: null}}}, 'foo.bar.baz'));
	t.false(dotProp.has({foo: {bar: 'a'}}, 'foo.fake.fake2'));
	t.false(dotProp.has({foo: null}, 'foo.bar'));
	t.false(dotProp.has({foo: ''}, 'foo.bar'));

	function fn() {}
	fn.foo = {bar: 1};
	t.false(dotProp.has(fn));
	t.true(dotProp.has(fn, 'foo'));
	t.true(dotProp.has(fn, 'foo.bar'));

	t.true(dotProp.has({'foo.baz': {bar: true}}, 'foo\\.baz.bar'));
	t.true(dotProp.has({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'));
	t.false(dotProp.has(undefined, 'fo\\.ob\\.az.bar'));
});

test('prevent setting/getting `__proto__`', t => {
	dotProp.set({}, '__proto__.unicorn', '🦄');
	t.not({}.unicorn, '🦄'); // eslint-disable-line no-use-extend-native/no-use-extend-native

	t.is(dotProp.get({}, '__proto__'), undefined);
});
