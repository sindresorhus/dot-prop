import test from 'ava';
import dotProp from './';

test(function getter(t) {
	let f1 = {foo: {bar: 1}};
	t.is(dotProp.get(f1), f1);
	t.is(dotProp.get(f1, 'foo'), f1.foo);
	t.is(dotProp.get({foo: 1}, 'foo'), 1);
	t.is(dotProp.get({foo: null}, 'foo'), null);
	t.is(dotProp.get({foo: undefined}, 'foo'), undefined);
	t.is(dotProp.get({foo: {bar: true}}, 'foo.bar'), true);
	t.is(dotProp.get({foo: {bar: {baz: true}}}, 'foo.bar.baz'), true);
	t.is(dotProp.get({foo: {bar: {baz: null}}}, 'foo.bar.baz'), null);
	t.is(dotProp.get({foo: {bar: 'a'}}, 'foo.fake.fake2'), undefined);

	function fn() {}
	fn.foo = {bar: 1};
	t.is(dotProp.get(fn), fn);
	t.is(dotProp.get(fn, 'foo'), fn.foo);
	t.is(dotProp.get(fn, 'foo.bar'), 1);

	t.is(dotProp.get({'foo.baz': {bar: true}}, 'foo\\.baz.bar'), true);
	t.is(dotProp.get({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'), true);
});

test(function setter(t) {
	let f1 = {};

	function func() {
		return 'test';
	}

	dotProp.set(f1, 'foo', 2);
	t.is(f1.foo, 2);

	f1 = {foo: {bar: 1}};
	dotProp.set(f1, 'foo.bar', 2);
	t.is(f1.foo.bar, 2);

	dotProp.set(f1, 'foo.bar.baz', 3);
	t.is(f1.foo.bar.baz, 3);

	dotProp.set(f1, 'foo.bar', 'test');
	t.is(f1.foo.bar, 'test');

	dotProp.set(f1, 'foo.bar', null);
	t.is(f1.foo.bar, null);

	dotProp.set(f1, 'foo.bar', false);
	t.is(f1.foo.bar, false);

	dotProp.set(f1, 'foo.bar', undefined);
	t.is(f1.foo.bar, undefined);

	dotProp.set(f1, 'foo.fake.fake2', 'fake');
	t.is(f1.foo.fake.fake2, 'fake');

	dotProp.set(f1, 'foo.function', func);
	t.is(f1.foo.function, func);

	function fn() {}
	dotProp.set(fn, 'foo.bar', 1);
	t.is(fn.foo.bar, 1);

	f1.fn = fn;
	dotProp.set(f1, 'fn.bar.baz', 2);
	t.is(f1.fn.bar.baz, 2);

	dotProp.set(f1, 'foo\\.bar.baz', true);
	t.is(f1['foo.bar'].baz, true);

	dotProp.set(f1, 'fo\\.ob\\.ar.baz', true);
	t.is(f1['fo.ob.ar'].baz, true);
});
