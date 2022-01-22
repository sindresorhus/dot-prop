import test from 'ava';
import {getProperty, setProperty, hasProperty, deleteProperty, escapePath} from './index.js';

test('getProperty', t => {
	const fixture1 = {foo: {bar: 1}};
	t.is(getProperty(fixture1), fixture1);
	fixture1[''] = 'foo';
	t.is(getProperty(fixture1, ''), 'foo');
	t.is(getProperty(fixture1, 'foo'), fixture1.foo);
	t.is(getProperty({foo: 1}, 'foo'), 1);
	t.is(getProperty({foo: null}, 'foo'), null);
	t.is(getProperty({foo: undefined}, 'foo'), undefined);
	t.true(getProperty({foo: {bar: true}}, 'foo.bar'));
	t.true(getProperty({foo: {bar: {baz: true}}}, 'foo.bar.baz'));
	t.is(getProperty({foo: {bar: {baz: null}}}, 'foo.bar.baz'), null);
	t.is(getProperty({foo: {bar: 'a'}}, 'foo.fake'), undefined);
	t.is(getProperty({foo: {bar: 'a'}}, 'foo.fake.fake2'), undefined);
	t.is(getProperty({foo: {bar: 'a'}}, 'foo.fake.fake2', 'some value'), 'some value');
	t.is(getProperty({foo: {}}, 'foo.fake', 'some value'), 'some value');
	t.true(getProperty({'\\': true}, '\\'));
	t.true(getProperty({'\\foo': true}, '\\foo'));
	t.true(getProperty({'\\foo': true}, '\\\\foo'));
	t.true(getProperty({'foo\\': true}, 'foo\\\\'));
	t.true(getProperty({'bar\\': true}, 'bar\\'));
	t.true(getProperty({'foo\\bar': true}, 'foo\\bar'));
	t.true(getProperty({'\\': {foo: true}}, '\\\\.foo'));
	t.true(getProperty({'bar\\.': true}, 'bar\\\\\\.'));
	t.true(getProperty({'foo\\': {
		bar: true,
	}}, 'foo\\\\.bar'));
	t.is(getProperty({foo: 1}, 'foo.bar'), undefined);
	t.true(getProperty({'foo\\': true}, 'foo\\'));

	const fixture2 = {};
	Object.defineProperty(fixture2, 'foo', {
		value: 'bar',
		enumerable: false,
	});
	t.is(getProperty(fixture2, 'foo'), 'bar');
	t.is(getProperty({}, 'hasOwnProperty'), Object.prototype.hasOwnProperty);

	function fn() {}
	fn.foo = {bar: 1};
	t.is(getProperty(fn), fn);
	t.is(getProperty(fn, 'foo'), fn.foo);
	t.is(getProperty(fn, 'foo.bar'), 1);

	const f3 = {foo: null};
	t.is(getProperty(f3, 'foo.bar'), undefined);
	t.is(getProperty(f3, 'foo.bar', 'some value'), 'some value');

	t.true(getProperty({'foo.baz': {bar: true}}, 'foo\\.baz.bar'));
	t.true(getProperty({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'));

	t.false(getProperty(null, 'foo.bar', false));
	t.false(getProperty('foo', 'foo.bar', false));
	t.false(getProperty([], 'foo.bar', false));
	t.false(getProperty(undefined, 'foo.bar', false));

	class F4Class {}
	F4Class.prototype.foo = 1;
	const f4 = new F4Class();
	t.is(getProperty(f4, 'foo'), 1); // #46

	t.true(getProperty({'': {'': {'': true}}}, '..'));
	t.true(getProperty({'': {'': true}}, '.'));
});

test('getProperty - with array indexes', t => {
	t.true(getProperty([true, false, false], '[0]'));
	t.true(getProperty([[false, true, false], false, false], '[0][1]'));
	t.true(getProperty([{foo: [true]}], '[0].foo[0]'));
	t.true(getProperty({foo: [0, {bar: true}]}, 'foo[1].bar'));

	t.false(getProperty(['a', 'b', 'c'], '3', false));
	t.false(getProperty([{foo: [1]}], '[0].bar[0]', false));
	t.false(getProperty([{foo: [1]}], '[0].foo[1]', false));
	t.false(getProperty({foo: [0, {bar: 2}]}, 'foo[0].bar', false));
	t.false(getProperty({foo: [0, {bar: 2}]}, 'foo[2].bar', false));
	t.false(getProperty({foo: [0, {bar: 2}]}, 'foo[1].biz', false));
	t.false(getProperty({foo: [0, {bar: 2}]}, 'bar[0].bar', false));
	t.true(getProperty({
		bar: {
			'[0]': true,
		},
	}, 'bar.\\[0]'));
	t.true(getProperty({
		bar: {
			'': [true],
		},
	}, 'bar.[0]'));
	t.throws(() => getProperty({
		'foo[5[': true,
	}, 'foo[5['), {
		message: 'Invalid character in an index',
	});
	t.throws(() => getProperty({
		'foo[5': {
			bar: true,
		},
	}, 'foo[5.bar'), {
		message: 'Invalid character in an index',
	});
	t.true(getProperty({
		'foo[5]': {
			bar: true,
		},
	}, 'foo\\[5].bar'));
	t.throws(() => getProperty({
		'foo[5\\]': {
			bar: true,
		},
	}, 'foo[5\\].bar'), {
		message: 'Invalid character in an index',
	});
	t.throws(() => getProperty({
		'foo[5': true,
	}, 'foo[5'), {
		message: 'Index was not closed',
	});
	t.throws(() => getProperty({
		'foo[bar]': true,
	}, 'foo[bar]'), {
		message: 'Invalid character in an index',
	});
	t.false(getProperty({}, 'constructor[0]', false));
	t.throws(() => getProperty({}, 'foo[constructor]', false), {
		message: 'Invalid character in an index',
	});

	t.false(getProperty([], 'foo[0].bar', false));
	t.true(getProperty({foo: [{bar: true}]}, 'foo[0].bar'));
	t.false(getProperty({foo: ['bar']}, 'foo[1]', false));

	t.false(getProperty([true], '0', false));

	t.false(getProperty({foo: [true]}, 'foo.0', false));
	t.true(getProperty({foo: {
		0: true,
	}}, 'foo.0'));

	t.true(getProperty([{
		'[1]': true,
	}, false, false], '[0].\\[1]'));

	t.true(getProperty({foo: {'[0]': true}}, 'foo.\\[0]'));
	t.throws(() => getProperty({foo: {'[0]': true}}, 'foo.[0\\]'), {
		message: 'Invalid character in an index',
	});
	t.true(getProperty({foo: {'\\': [true]}}, 'foo.\\\\[0]'));
	t.throws(() => getProperty({foo: {'[0]': true}}, 'foo.[0\\]'), {
		message: 'Invalid character in an index',
	});

	t.throws(() => getProperty({'foo[0': {'9]': true}}, 'foo[0.9]'), {
		message: 'Invalid character in an index',
	});
	t.throws(() => getProperty({'foo[-1]': true}, 'foo[-1]'), {
		message: 'Invalid character in an index',
	});
});

test('setProperty', t => {
	const func = () => 'test';
	let fixture1 = {};

	const o1 = setProperty(fixture1, 'foo', 2);
	t.is(fixture1.foo, 2);
	t.is(o1, fixture1);

	fixture1 = {foo: {bar: 1}};
	setProperty(fixture1, 'foo.bar', 2);
	t.is(fixture1.foo.bar, 2);

	setProperty(fixture1, 'foo.bar.baz', 3);
	t.is(fixture1.foo.bar.baz, 3);

	setProperty(fixture1, 'foo.bar', 'test');
	t.is(fixture1.foo.bar, 'test');

	setProperty(fixture1, 'foo.bar', null);
	t.is(fixture1.foo.bar, null);

	setProperty(fixture1, 'foo.bar', false);
	t.is(fixture1.foo.bar, false);

	setProperty(fixture1, 'foo.bar', undefined);
	t.is(fixture1.foo.bar, undefined);

	setProperty(fixture1, 'foo.fake.fake2', 'fake');
	t.is(fixture1.foo.fake.fake2, 'fake');

	setProperty(fixture1, 'foo.function', func);
	t.is(fixture1.foo.function, func);

	function fn() {}
	setProperty(fn, 'foo.bar', 1);
	t.is(fn.foo.bar, 1);

	fixture1.fn = fn;
	setProperty(fixture1, 'fn.bar.baz', 2);
	t.is(fixture1.fn.bar.baz, 2);

	const fixture2 = {foo: null};
	setProperty(fixture2, 'foo.bar', 2);
	t.is(fixture2.foo.bar, 2);

	const fixture3 = {};
	setProperty(fixture3, '', 3);
	t.is(fixture3[''], 3);

	setProperty(fixture1, 'foo\\.bar.baz', true);
	t.is(fixture1['foo.bar'].baz, true);

	setProperty(fixture1, 'fo\\.ob\\.ar.baz', true);
	t.true(fixture1['fo.ob.ar'].baz);

	const fixture4 = 'noobject';
	const output4 = setProperty(fixture4, 'foo.bar', 2);
	t.is(fixture4, 'noobject');
	t.is(output4, fixture4);

	const fixture5 = [];

	setProperty(fixture5, '[1]', true);
	t.is(fixture5[1], true);

	setProperty(fixture5, '[0].foo[0]', true);
	t.is(fixture5[0].foo[0], true);

	t.throws(() => setProperty(fixture5, '1', true), {
		message: 'Cannot use string index',
	});

	t.throws(() => setProperty(fixture5, '0.foo.0', true), {
		message: 'Cannot use string index',
	});

	const fixture6 = {};

	setProperty(fixture6, 'foo[0].bar', true);
	t.true(fixture6.foo[0].bar);
	t.deepEqual(fixture6, {
		foo: [{
			bar: true,
		}],
	});

	const fixture7 = {foo: ['bar', 'baz']};
	setProperty(fixture7, 'foo.length', 1);
	t.is(fixture7.foo.length, 1);
	t.deepEqual(fixture7, {foo: ['bar']});
});

test('deleteProperty', t => {
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

	t.is(fixture1.foo.bar.baz.c, 'c');
	t.true(deleteProperty(fixture1, 'foo.bar.baz.c'));
	t.is(fixture1.foo.bar.baz.c, undefined);

	t.is(fixture1.top.dog, 'sindre');
	t.true(deleteProperty(fixture1, 'top'));
	t.is(fixture1.top, undefined);

	t.is(fixture1.foo.bar.baz.func.foo, 'bar');
	t.true(deleteProperty(fixture1, 'foo.bar.baz.func.foo'));
	t.is(fixture1.foo.bar.baz.func.foo, undefined);

	t.is(fixture1.foo.bar.baz.func, func);
	t.true(deleteProperty(fixture1, 'foo.bar.baz.func'));
	t.is(fixture1.foo.bar.baz.func, undefined);

	setProperty(fixture1, 'foo\\.bar.baz', true);
	t.true(fixture1['foo.bar'].baz);
	t.true(deleteProperty(fixture1, 'foo\\.bar.baz'));
	t.is(fixture1['foo.bar'].baz, undefined);

	const fixture2 = {};
	setProperty(fixture2, 'foo.bar\\.baz', true);
	t.true(fixture2.foo['bar.baz']);
	t.true(deleteProperty(fixture2, 'foo.bar\\.baz'));
	t.is(fixture2.foo['bar.baz'], undefined);

	fixture2.dotted = {
		sub: {
			'dotted.prop': 'foo',
			other: 'prop',
		},
	};
	t.true(deleteProperty(fixture2, 'dotted.sub.dotted\\.prop'));
	t.is(fixture2.dotted.sub['dotted.prop'], undefined);
	t.is(fixture2.dotted.sub.other, 'prop');

	const fixture3 = {foo: null};
	t.false(deleteProperty(fixture3, 'foo.bar'));
	t.deepEqual(fixture3, {foo: null});

	const fixture4 = [{
		top: {
			dog: 'sindre',
		},
	}];

	t.throws(() => deleteProperty(fixture4, '0.top.dog'), {
		message: 'Cannot use string index',
	});
	t.true(deleteProperty(fixture4, '[0].top.dog'));
	t.deepEqual(fixture4, [{top: {}}]);

	const fixture5 = {
		foo: [{
			bar: ['foo', 'bar'],
		}],
	};

	deleteProperty(fixture5, 'foo[0].bar[0]');

	const fixtureArray = [];
	fixtureArray[1] = 'bar';

	t.deepEqual(fixture5, {
		foo: [{
			bar: fixtureArray,
		}],
	});

	const fixture6 = {};

	setProperty(fixture6, 'foo.bar.0', 'fizz');
});

test('hasProperty', t => {
	const fixture1 = {foo: {bar: 1}};
	t.false(hasProperty(fixture1));
	t.true(hasProperty(fixture1, 'foo'));
	t.true(hasProperty({foo: 1}, 'foo'));
	t.true(hasProperty({foo: null}, 'foo'));
	t.true(hasProperty({foo: undefined}, 'foo'));
	t.true(hasProperty({foo: {bar: true}}, 'foo.bar'));
	t.true(hasProperty({foo: {bar: {baz: true}}}, 'foo.bar.baz'));
	t.true(hasProperty({foo: {bar: {baz: null}}}, 'foo.bar.baz'));
	t.false(hasProperty({foo: {bar: 'a'}}, 'foo.fake.fake2'));
	t.false(hasProperty({foo: null}, 'foo.bar'));
	t.false(hasProperty({foo: ''}, 'foo.bar'));

	function fn() {}
	fn.foo = {bar: 1};
	t.false(hasProperty(fn));
	t.true(hasProperty(fn, 'foo'));
	t.true(hasProperty(fn, 'foo.bar'));

	t.true(hasProperty({'foo.baz': {bar: true}}, 'foo\\.baz.bar'));
	t.true(hasProperty({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'));
	t.false(hasProperty(undefined, 'fo\\.ob\\.az.bar'));

	t.false(hasProperty({
		foo: [{bar: ['bar', 'bizz']}],
	}, 'foo[0].bar.1'));
	t.false(hasProperty({
		foo: [{bar: ['bar', 'bizz']}],
	}, 'foo[0].bar.2'));
	t.false(hasProperty({
		foo: [{bar: ['bar', 'bizz']}],
	}, 'foo[1].bar.1'));
	t.true(hasProperty({
		foo: [{bar: {
			1: 'bar',
		}}],
	}, 'foo[0].bar.1'));
});

test('escapePath', t => {
	t.is(escapePath('foo.bar[0]'), 'foo\\.bar\\[0]');
	t.is(escapePath('foo\\.bar[0]'), 'foo\\\\\\.bar\\[0]');
	t.is(escapePath('foo\\\.bar[0]'), 'foo\\\\\\.bar\\[0]'); // eslint-disable-line no-useless-escape
	t.is(escapePath('foo\\\\.bar[0]'), 'foo\\\\\\\\\\.bar\\[0]');
	t.is(escapePath('foo\\\\.bar\\\\[0]'), 'foo\\\\\\\\\\.bar\\\\\\\\\\[0]');
	t.is(escapePath('foo[0].bar'), 'foo\\[0]\\.bar');
	t.is(escapePath('foo.bar[0].baz'), 'foo\\.bar\\[0]\\.baz');
	t.is(escapePath('[0].foo'), '\\[0]\\.foo');
	t.is(escapePath(''), '');

	t.throws(() => {
		escapePath(0);
	}, {
		instanceOf: TypeError,
		message: 'Expected a string',
	});
});

test('prevent setting/getting `__proto__`', t => {
	setProperty({}, '__proto__.unicorn', '🦄');
	t.not({}.unicorn, '🦄'); // eslint-disable-line no-use-extend-native/no-use-extend-native

	t.is(getProperty({}, '__proto__'), undefined);
});

test('return default value if path is invalid', t => {
	t.is(getProperty({}, 'constructor', '🦄'), '🦄');
});
