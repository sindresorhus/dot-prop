import test from 'ava';
import {
	getProperty,
	setProperty,
	hasProperty,
	deleteProperty,
	escapePath,
	deepKeys,
	unflatten,
} from './index.js';

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
	t.true(getProperty({
		'foo\\': {
			bar: true,
		},
	}, 'foo\\\\.bar'));
	t.is(getProperty({foo: 1}, 'foo.bar'), undefined);

	const fixture2 = {};
	Object.defineProperty(fixture2, 'foo', {
		value: 'bar',
		enumerable: false,
	});
	t.is(getProperty(fixture2, 'foo'), 'bar');
	t.is(getProperty({}, 'hasOwnProperty'), Object.prototype.hasOwnProperty);

	function function_() {}
	function_.foo = {bar: 1};
	t.is(getProperty(function_), function_);
	t.is(getProperty(function_, 'foo'), function_.foo);
	t.is(getProperty(function_, 'foo.bar'), 1);

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

	t.false(getProperty(['a', 'b', 'c'], '[3]', false));
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

	t.true(getProperty({foo: [true]}, 'foo.0'));
	t.true(getProperty({
		foo: {
			0: true,
		},
	}, 'foo.0'));

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
	const function_ = () => 'test';
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

	setProperty(fixture1, 'foo.function', function_);
	t.is(fixture1.foo.function, function_);

	function function__() {}
	setProperty(function__, 'foo.bar', 1);
	t.is(function__.foo.bar, 1);

	fixture1.fn = function__;
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

	t.is(fixture1.foo.bar.baz.c, 'c');
	t.true(deleteProperty(fixture1, 'foo.bar.baz.c'));
	t.is(fixture1.foo.bar.baz.c, undefined);

	t.is(fixture1.top.dog, 'sindre');
	t.true(deleteProperty(fixture1, 'top'));
	t.is(fixture1.top, undefined);

	t.is(fixture1.foo.bar.baz.func.foo, 'bar');
	t.true(deleteProperty(fixture1, 'foo.bar.baz.func.foo'));
	t.is(fixture1.foo.bar.baz.func.foo, undefined);

	t.is(fixture1.foo.bar.baz.func, function_);
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
	t.false(hasProperty({foo: 0}, 'foo.bar'));
	t.false(hasProperty({foo: false}, 'foo.bar'));

	function function_() {}
	function_.foo = {bar: 1};
	t.false(hasProperty(function_));
	t.true(hasProperty(function_, 'foo'));
	t.true(hasProperty(function_, 'foo.bar'));

	t.true(hasProperty({'foo.baz': {bar: true}}, 'foo\\.baz.bar'));
	t.true(hasProperty({'fo.ob.az': {bar: true}}, 'fo\\.ob\\.az.bar'));
	t.false(hasProperty(undefined, 'fo\\.ob\\.az.bar'));

	t.true(hasProperty({
		foo: [{bar: ['bar', 'bizz']}],
	}, 'foo[0].bar.1'));
	t.false(hasProperty({
		foo: [{bar: ['bar', 'bizz']}],
	}, 'foo[0].bar.2'));
	t.false(hasProperty({
		foo: [{bar: ['bar', 'bizz']}],
	}, 'foo[1].bar.1'));
	t.true(hasProperty({
		foo: [{
			bar: {
				1: 'bar',
			},
		}],
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
	// TODO: The following three tests assume that backslashes with no effect are escaped. Update when this changes.
	t.is(escapePath('\\foo'), '\\\\foo');
	t.is(escapePath('foo\\'), 'foo\\\\');
	t.is(escapePath('foo\\\\'), 'foo\\\\\\\\');
	t.is(escapePath(''), '');

	t.throws(() => {
		escapePath(0);
	}, {
		instanceOf: TypeError,
		message: 'Expected a string',
	});
});

test('deepKeys', t => {
	const object = {
		eo: {},
		ea: [],
		'a.b': {
			c: {
				d: [1, 2, {
					g: 3,
				}],
				e: '🦄',
				f: 0,
				h: {},
				i: [],
				nu: null,
				na: Number.NaN,
				un: undefined,
			},
			'': {
				a: 0,
			},
		},
		'': {
			a: 0,
		},
	};

	const keys = deepKeys(object);

	t.deepEqual(keys, [
		'eo',
		'ea',
		'a\\.b.c.d[0]',
		'a\\.b.c.d[1]',
		'a\\.b.c.d[2].g',
		'a\\.b.c.e',
		'a\\.b.c.f',
		'a\\.b.c.h',
		'a\\.b.c.i',
		'a\\.b.c.nu',
		'a\\.b.c.na',
		'a\\.b.c.un',
		'a\\.b..a',
		'.a',
	]);

	for (const key of keys) {
		t.true(hasProperty(object, key));
	}

	t.deepEqual(deepKeys([]), []);
	t.deepEqual(deepKeys(0), []);
});

test('deepKeys - does not throw on sparse array', t => {
	const object = {
		sparse: [1,,3], // eslint-disable-line no-sparse-arrays, comma-spacing
	};

	const keys = deepKeys(object);

	t.deepEqual(keys, [
		'sparse[0]',
		'sparse[2]',
	]);
});

test('prevent setting/getting `__proto__`', t => {
	setProperty({}, '__proto__.unicorn', '🦄');
	t.not({}.unicorn, '🦄'); // eslint-disable-line no-use-extend-native/no-use-extend-native

	t.is(getProperty({}, '__proto__'), undefined);
});

test('prevent setting/getting `prototype`', t => {
	const object = {};
	setProperty(object, 'prototype.unicorn', '🦄');
	t.is(object.prototype, undefined);
	t.is(getProperty({}, 'prototype'), undefined);
	t.is(getProperty({}, 'prototype', 'default'), 'default');
	t.false(hasProperty({}, 'prototype'));
});

test('return default value if path is invalid', t => {
	t.is(getProperty({}, 'constructor', '🦄'), '🦄');
});

test('deepKeys with Symbol properties', t => {
	const symbol = Symbol('test');
	const object = {
		foo: 'bar',
		[symbol]: 'value',
	};

	const keys = deepKeys(object);
	t.deepEqual(keys, ['foo']);
	// Symbols are not included in deepKeys
});

test('deepKeys with cyclic references', t => {
	const object = {foo: {}};
	object.foo.bar = object;

	// DeepKeys will hit stack overflow with cyclic references
	// This is expected behavior as the library doesn't handle cycles
	t.throws(() => {
		deepKeys(object);
	}, {message: 'Maximum call stack size exceeded'});
});

test('edge cases for mixed array and object paths', t => {
	const fixture = {
		foo: [
			{bar: {baz: [1, {qux: 'value'}]}},
		],
	};

	t.is(getProperty(fixture, 'foo[0].bar.baz[1].qux'), 'value');
	t.true(hasProperty(fixture, 'foo[0].bar.baz[1].qux'));

	setProperty(fixture, 'foo[0].bar.baz[2]', 'new');
	t.is(fixture.foo[0].bar.baz[2], 'new');

	t.true(deleteProperty(fixture, 'foo[0].bar.baz[1].qux'));
	t.false(hasProperty(fixture, 'foo[0].bar.baz[1].qux'));
});

test('escaped paths with special characters', t => {
	const fixture = {};

	// Test escaping of dots, brackets, and backslashes
	setProperty(fixture, 'foo\\.bar\\[0]', 'value');
	t.is(fixture['foo.bar[0]'], 'value');
	t.is(getProperty(fixture, 'foo\\.bar\\[0]'), 'value');

	// Test multiple escaped characters
	setProperty(fixture, 'a\\.b\\.c', 'test');
	t.is(fixture['a.b.c'], 'test');
});

test('setProperty on non-objects returns original value', t => {
	t.is(setProperty(null, 'foo', 'bar'), null);
	t.is(setProperty(undefined, 'foo', 'bar'), undefined);
	t.is(setProperty(42, 'foo', 'bar'), 42);
	t.is(setProperty('string', 'foo', 'bar'), 'string');
	t.is(setProperty(true, 'foo', 'bar'), true);
});

test('deleteProperty on non-objects returns false', t => {
	t.false(deleteProperty(null, 'foo'));
	t.false(deleteProperty(undefined, 'foo'));
	t.false(deleteProperty(42, 'foo'));
	t.false(deleteProperty('string', 'foo'));
	t.false(deleteProperty(true, 'foo'));
});

test('hasProperty on non-objects returns false', t => {
	t.false(hasProperty(null, 'foo'));
	t.false(hasProperty(42, 'foo'));
	t.false(hasProperty('string', 'foo'));
	t.false(hasProperty(true, 'foo'));
});

test('empty path edge cases', t => {
	const fixture = {'': {'': 'value'}};

	t.is(getProperty(fixture, '.'), fixture['']['']);
	t.true(hasProperty(fixture, '.'));

	setProperty(fixture, '..', 'new');
	t.is(fixture[''][''][''], 'new');
});

test('array length property', t => {
	const fixture = {foo: [1, 2, 3]};

	t.is(getProperty(fixture, 'foo.length'), 3);
	t.true(hasProperty(fixture, 'foo.length'));

	// Trying to delete array length throws an error
	t.throws(() => {
		deleteProperty(fixture, 'foo.length');
	}, {message: 'Cannot delete property \'length\' of [object Array]'});
	t.is(fixture.foo.length, 3);
});

test('deepKeys with nested empty objects and arrays', t => {
	const object = {
		a: {},
		b: [],
		c: {
			d: {},
			e: [],
			f: null,
			g: {
				h: 'value',
			},
		},
	};

	const keys = deepKeys(object);
	t.deepEqual(keys, [
		'a',
		'b',
		'c.d',
		'c.e',
		'c.f',
		'c.g.h',
	]);
});

test('deepKeys with function values', t => {
	const function_ = () => {};
	function_.prop = 'value';

	const object = {
		a: function_,
		b: {
			c: function_,
		},
	};

	const keys = deepKeys(object);
	t.deepEqual(keys, [
		'a.prop',
		'b.c.prop',
	]);
});

test('getProperty with inherited properties', t => {
	class Parent {
		constructor() {
			this.instanceProp = 'instance';
		}
	}
	Parent.prototype.protoProp = 'proto';

	const child = new Parent();
	t.is(getProperty(child, 'instanceProp'), 'instance');
	t.is(getProperty(child, 'protoProp'), 'proto');
});

test('setting array elements creates sparse arrays correctly', t => {
	const fixture = {};

	setProperty(fixture, 'arr[2]', 'value');
	t.is(fixture.arr.length, 3);
	t.is(fixture.arr[0], undefined);
	t.is(fixture.arr[1], undefined);
	t.is(fixture.arr[2], 'value');

	// Check sparse array in deepKeys
	const keys = deepKeys(fixture);
	t.deepEqual(keys, ['arr[2]']);
});

test('invalid path edge cases for indexEnd state', t => {
	// Test invalid character after closing bracket with backslash
	t.throws(() => {
		getProperty({}, '[0]\\x');
	}, {message: 'Invalid character after an index'});

	// Test closing bracket followed by another closing bracket
	t.throws(() => {
		getProperty({}, '[0]]');
	}, {message: 'Invalid character after an index'});

	// Test invalid character after index with default character
	t.throws(() => {
		getProperty({}, '[0]a');
	}, {message: 'Invalid character after an index'});
});

test('unflatten - basic dotted keys (issue #116)', t => {
	const flat = {
		'user.name': 'Gummy Bear',
		'user.email': 'gummybear@candymountain.com',
		'user.professional.title': 'King',
		'user.professional.employer': 'Candy Mountain',
	};

	const result = unflatten(flat);

	t.deepEqual(result, {
		user: {
			name: 'Gummy Bear',
			email: 'gummybear@candymountain.com',
			professional: {
				title: 'King',
				employer: 'Candy Mountain',
			},
		},
	});
});

test('unflatten - bracket indexes and escapes', t => {
	const flat = {
		'users[0].name': 'Ada',
		'users[1].name': 'Linus',
		'a\\.b.c': 1,
	};

	const result = unflatten(flat);

	t.is(result.users[0].name, 'Ada');
	t.is(result.users[1].name, 'Linus');
	t.is(result['a.b'].c, 1);

	// Ensure getProperty agrees with produced structure
	t.is(getProperty(result, 'users[0].name'), 'Ada');
	t.is(getProperty(result, 'a\\.b.c'), 1);
});

test('unflatten - disallowed keys are ignored safely', t => {
	const flat = {
		'__proto__.polluted': 'nope',
		'constructor.prototype.bad': true,
		'valid.path': 1,
	};

	const result = unflatten(flat);

	t.is(result.valid.path, 1);
	// Ensure prototype is not polluted via inherited property
	const empty = {};
	t.false('polluted' in empty);
});

test('unflatten - non-object input returns empty object', t => {
	t.deepEqual(unflatten(undefined), {});
	t.deepEqual(unflatten(null), {});
	t.deepEqual(unflatten('unicorn'), {});
	t.deepEqual(unflatten(1), {});
});

test('unflatten - last write wins on conflicts', t => {
	const flat = {
		a: 1,
		'a.b': 2,
		'a.c': 3,
	};

	const result = unflatten(flat);

	// Primitive at 'a' is replaced by object writes
	t.deepEqual(result, {a: {b: 2, c: 3}});
});

test('unflatten - creates sparse arrays where appropriate', t => {
	const result = unflatten({'arr[2]': 'value'});
	t.is(result.arr.length, 3);
	t.is(result.arr[0], undefined);
	t.is(result.arr[1], undefined);
	t.is(result.arr[2], 'value');
});

test('dot notation for array indices support', t => {
	// GetProperty with dot notation for array indices
	const object = {users: [{name: 'Alice', roles: ['admin']}, {name: 'Bob'}]};
	t.is(getProperty(object, 'users.0.name'), 'Alice');
	t.is(getProperty(object, 'users.1.name'), 'Bob');
	t.is(getProperty(object, 'users.0.roles.0'), 'admin');

	// SetProperty with dot notation for array indices
	const data = {};
	setProperty(data, 'items.0.title', 'First Item');
	setProperty(data, 'items.1.title', 'Second Item');
	setProperty(data, 'items.0.tags.0', 'important');

	t.true(Array.isArray(data.items));
	t.is(data.items[0].title, 'First Item');
	t.is(data.items[1].title, 'Second Item');
	t.true(Array.isArray(data.items[0].tags));
	t.is(data.items[0].tags[0], 'important');

	// HasProperty with dot notation for array indices
	t.true(hasProperty(data, 'items.0.title'));
	t.true(hasProperty(data, 'items.0.tags.0'));
	t.false(hasProperty(data, 'items.2.title'));

	// DeleteProperty with dot notation for array indices
	t.true(deleteProperty(data, 'items.0.tags.0'));
	t.is(data.items[0].tags[0], undefined);

	// Mixed bracket and dot notation should work
	t.is(getProperty(object, 'users[0].name'), 'Alice');
	t.is(getProperty(object, 'users.0.roles[0]'), 'admin');
});

test('dot notation array indices - edge cases and mixed syntax', t => {
	// Test with sparse arrays
	const sparseObject = {};
	setProperty(sparseObject, 'items.5.name', 'item5');
	t.is(sparseObject.items[5].name, 'item5');
	t.is(sparseObject.items[0], undefined);
	t.true(hasProperty(sparseObject, 'items.5.name'));
	t.false(hasProperty(sparseObject, 'items.0.name'));

	// Deep nesting with mixed syntax
	const deepObject = {
		level1: [{
			level2: {
				arr: [
					{level4: ['deep', 'array']},
				],
			},
		}],
	};

	t.is(getProperty(deepObject, 'level1.0.level2.arr[0].level4.1'), 'array');
	t.is(getProperty(deepObject, 'level1[0].level2.arr.0.level4[1]'), 'array');

	// Setting complex nested structures
	setProperty(deepObject, 'level1.0.level2.newArr.0.value', 'test');
	t.is(deepObject.level1[0].level2.newArr[0].value, 'test');

	// Zero-based indices
	const zeroObject = {};
	setProperty(zeroObject, 'arr.0', 'first');
	setProperty(zeroObject, 'arr.00', 'zero-prefixed'); // Should be treated as string
	t.is(zeroObject.arr[0], 'first');
	t.is(zeroObject.arr['00'], 'zero-prefixed');
	t.true(hasProperty(zeroObject, 'arr.0'));

	// Large indices
	const largeIndexObject = {};
	setProperty(largeIndexObject, 'arr.100', 'large');
	t.is(largeIndexObject.arr[100], 'large');
	t.is(largeIndexObject.arr.length, 101);

	// Mixed object and array operations
	const mixedObject = {complex: {data: [{items: ['a', 'b']}, {items: ['c', 'd']}]}};
	t.is(getProperty(mixedObject, 'complex.data.0.items.1'), 'b');
	t.is(getProperty(mixedObject, 'complex.data.1.items.0'), 'c');

	setProperty(mixedObject, 'complex.data.0.items.2', 'e');
	t.is(mixedObject.complex.data[0].items[2], 'e');

	t.true(deleteProperty(mixedObject, 'complex.data.0.items.1'));
	t.is(mixedObject.complex.data[0].items[1], undefined);
});

test('dot notation array indices - boundary conditions', t => {
	// Negative indices should be treated as strings (not valid array indices)
	const object = {};
	setProperty(object, 'arr.-1', 'negative');
	t.is(object.arr['-1'], 'negative');
	t.false(Array.isArray(object.arr)); // Should create object, not array

	// Non-numeric strings with dots should work normally
	setProperty(object, 'data.abc.def', 'string-keys');
	t.is(object.data.abc.def, 'string-keys');

	// Leading zeros are treated as strings
	const leadingZeroObject = {};
	setProperty(leadingZeroObject, 'arr.01', 'leading-zero');
	setProperty(leadingZeroObject, 'arr.1', 'one');
	t.is(leadingZeroObject.arr['01'], 'leading-zero');
	t.is(leadingZeroObject.arr[1], 'one');
	t.not(leadingZeroObject.arr['01'], leadingZeroObject.arr[1]);

	// Empty arrays with dot notation
	const emptyArrayObject = {arr: []};
	t.false(hasProperty(emptyArrayObject, 'arr.0'));
	setProperty(emptyArrayObject, 'arr.0', 'first');
	t.true(hasProperty(emptyArrayObject, 'arr.0'));
	t.is(emptyArrayObject.arr[0], 'first');

	// Very long numeric strings (should still work as indices)
	const longIndexObject = {};
	setProperty(longIndexObject, 'arr.999999999999999', 'huge-index');
	t.is(longIndexObject.arr[999_999_999_999_999], 'huge-index');

	// Unflatten with dot array notation
	const flatWithDotIndices = {
		'users.0.name': 'Alice',
		'users.0.age': 30,
		'users.1.name': 'Bob',
		'tags.0': 'important',
		'tags.1': 'urgent',
	};

	const unflattened = unflatten(flatWithDotIndices);
	t.true(Array.isArray(unflattened.users));
	t.true(Array.isArray(unflattened.tags));
	t.is(unflattened.users[0].name, 'Alice');
	t.is(unflattened.users[1].name, 'Bob');
	t.is(unflattened.tags[0], 'important');
	t.is(unflattened.tags[1], 'urgent');
});
