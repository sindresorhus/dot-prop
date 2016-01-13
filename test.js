import test from 'ava';
import m from './';

test(function getter(t) {
	const f1 = {foo: {bar: 1}};
	t.is(m.get(f1), f1);
	t.is(m.get(f1, 'foo'), f1.foo);
	t.is(m.get({foo: 1}, 'foo'), 1);
	t.is(m.get({foo: null}, 'foo'), null);
	t.is(m.get({foo: undefined}, 'foo'), undefined);
	t.is(m.get({foo: {bar: true}}, 'foo.bar'), true);
	t.is(m.get({foo: {bar: {baz: true}}}, 'foo.bar.baz'), true);
	t.is(m.get({foo: {bar: {baz: null}}}, 'foo.bar.baz'), null);
	t.is(m.get({foo: {bar: 'a'}}, 'foo.fake.fake2'), undefined);

	function fn() {}
	fn.foo = {bar: 1};
	t.is(m.get(fn), fn);
	t.is(m.get(fn, 'foo'), fn.foo);
	t.is(m.get(fn, 'foo.bar'), 1);

	t.is(m.get({'foo.baz': {bar: true}}, 'foo\\.baz.bar'), true);
	t.is(m.get({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'), true);
});

test(function setter(t) {
	let f1 = {};

	function func() {
		return 'test';
	}

	m.set(f1, 'foo', 2);
	t.is(f1.foo, 2);

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

	m.set(f1, 'foo\\.bar.baz', true);
	t.is(f1['foo.bar'].baz, true);

	m.set(f1, 'fo\\.ob\\.ar.baz', true);
	t.is(f1['fo.ob.ar'].baz, true);
});
