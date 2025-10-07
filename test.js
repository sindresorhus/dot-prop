import test from 'ava';
import {
	getProperty,
	setProperty,
	hasProperty,
	deleteProperty,
	escapePath,
	deepKeys,
	unflatten,
	parsePath,
	stringifyPath,
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
	t.true(getProperty({foo: true}, String.raw`\foo`)); // \f is escaped to f
	t.true(getProperty({'\\foo': true}, String.raw`\\foo`)); // \\f is escaped backslash + f
	t.true(getProperty({'foo\\': true}, 'foo\\\\'));
	t.true(getProperty({'bar\\': true}, 'bar\\'));
	t.true(getProperty({foobar: true}, String.raw`foo\bar`)); // \b is escaped to b
	t.true(getProperty({'\\': {foo: true}}, String.raw`\\.foo`));
	t.true(getProperty({'bar\\.': true}, String.raw`bar\\\.`));
	t.true(getProperty({
		'foo\\': {
			bar: true,
		},
	}, String.raw`foo\\.bar`));
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

	t.true(getProperty({'foo.baz': {bar: true}}, String.raw`foo\.baz.bar`));
	t.true(getProperty({'fo.ob.az': {bar: true}}, String.raw`fo\.ob\.az.bar`));

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
	}, String.raw`bar.\[0]`));
	t.true(getProperty({
		bar: {
			'': [true],
		},
	}, 'bar.[0]'));
	t.throws(() => getProperty({
		'foo[5[': true,
	}, 'foo[5['), {
		message: 'Invalid character \'[\' in an index at position 6',
	});
	t.throws(() => getProperty({
		'foo[5': {
			bar: true,
		},
	}, 'foo[5.bar'), {
		message: 'Invalid character \'.\' in an index at position 6',
	});
	t.true(getProperty({
		'foo[5]': {
			bar: true,
		},
	}, String.raw`foo\[5].bar`));
	t.throws(() => getProperty({
		'foo[5\\]': {
			bar: true,
		},
	}, String.raw`foo[5\].bar`), {
		message: String.raw`Invalid character '\' in an index at position 6`,
	});
	t.throws(() => getProperty({
		'foo[5': true,
	}, 'foo[5'), {
		message: 'Index was not closed',
	});
	t.throws(() => getProperty({
		'foo[bar]': true,
	}, 'foo[bar]'), {
		message: 'Invalid character \'b\' in an index at position 5',
	});
	t.false(getProperty({}, 'constructor[0]', false));
	t.throws(() => getProperty({}, 'foo[constructor]'), {
		message: 'Invalid character \'c\' in an index at position 5',
	});

	t.false(getProperty([], 'foo[0].bar', false));
	t.true(getProperty({foo: [{bar: true}]}, 'foo[0].bar'));
	t.false(getProperty({foo: ['bar']}, 'foo[1]', false));

	t.true(getProperty([true], '0', false));

	t.true(getProperty({foo: [true]}, 'foo.0'));
	t.true(getProperty({
		foo: {
			0: true,
		},
	}, 'foo.0'));

	t.true(getProperty([{
		'[1]': true,
	}, false, false], String.raw`[0].\[1]`));

	t.true(getProperty({foo: {'[0]': true}}, String.raw`foo.\[0]`));
	t.throws(() => getProperty({foo: {'[0]': true}}, String.raw`foo.[0\]`), {
		message: String.raw`Invalid character '\' in an index at position 7`,
	});
	t.true(getProperty({foo: {'\\': [true]}}, String.raw`foo.\\[0]`));
	t.throws(() => getProperty({foo: {'[0]': true}}, String.raw`foo.[0\]`), {
		message: String.raw`Invalid character '\' in an index at position 7`,
	});

	t.throws(() => getProperty({'foo[0': {'9]': true}}, 'foo[0.9]'), {
		message: 'Invalid character \'.\' in an index at position 6',
	});
	t.throws(() => getProperty({'foo[-1]': true}, 'foo[-1]'), {
		message: 'Invalid character \'-\' in an index at position 5',
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

	setProperty(fixture1, String.raw`foo\.bar.baz`, true);
	t.is(fixture1['foo.bar'].baz, true);

	setProperty(fixture1, String.raw`fo\.ob\.ar.baz`, true);
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

	setProperty(fixture5, '1', true);
	t.is(fixture5[1], true);

	setProperty(fixture5, '0.foo.0', true);
	t.is(fixture5[0].foo[0], true);

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

	setProperty(fixture1, String.raw`foo\.bar.baz`, true);
	t.true(fixture1['foo.bar'].baz);
	t.true(deleteProperty(fixture1, String.raw`foo\.bar.baz`));
	t.is(fixture1['foo.bar'].baz, undefined);

	const fixture2 = {};
	setProperty(fixture2, String.raw`foo.bar\.baz`, true);
	t.true(fixture2.foo['bar.baz']);
	t.true(deleteProperty(fixture2, String.raw`foo.bar\.baz`));
	t.is(fixture2.foo['bar.baz'], undefined);

	fixture2.dotted = {
		sub: {
			'dotted.prop': 'foo',
			other: 'prop',
		},
	};
	t.true(deleteProperty(fixture2, String.raw`dotted.sub.dotted\.prop`));
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

	t.true(deleteProperty(fixture4, '0.top.dog'));
	t.deepEqual(fixture4, [{top: {}}]);

	// Test bracket notation deletion with fresh fixture
	const fixture4b = [{
		top: {
			dog: 'sindre',
		},
	}];
	t.true(deleteProperty(fixture4b, '[0].top.dog'));
	t.deepEqual(fixture4b, [{top: {}}]);

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

	t.true(hasProperty({'foo.baz': {bar: true}}, String.raw`foo\.baz.bar`));
	t.true(hasProperty({'fo.ob.az': {bar: true}}, String.raw`fo\.ob\.az.bar`));
	t.false(hasProperty(undefined, String.raw`fo\.ob\.az.bar`));

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
	t.is(escapePath('foo.bar[0]'), String.raw`foo\.bar\[0]`);
	t.is(escapePath(String.raw`foo\.bar[0]`), String.raw`foo\\\.bar\[0]`);
	t.is(escapePath('foo\\\.bar[0]'), String.raw`foo\\\.bar\[0]`); // eslint-disable-line no-useless-escape
	t.is(escapePath(String.raw`foo\\.bar[0]`), String.raw`foo\\\\\.bar\[0]`);
	t.is(escapePath(String.raw`foo\\.bar\\[0]`), String.raw`foo\\\\\.bar\\\\\[0]`);
	t.is(escapePath('foo[0].bar'), String.raw`foo\[0]\.bar`);
	t.is(escapePath('foo.bar[0].baz'), String.raw`foo\.bar\[0]\.baz`);
	t.is(escapePath('[0].foo'), String.raw`\[0]\.foo`);
	// These tests verify that all backslashes are escaped, even those without special meaning
	t.is(escapePath(String.raw`\foo`), String.raw`\\foo`);
	t.is(escapePath('foo\\'), 'foo\\\\');
	t.is(escapePath('foo\\\\'), 'foo\\\\\\\\');
	t.is(escapePath(''), '');

	t.throws(() => {
		escapePath(0);
	}, {
		instanceOf: TypeError,
		message: /Expected a string, got number/,
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
		String.raw`a\.b.c.d[0]`,
		String.raw`a\.b.c.d[1]`,
		String.raw`a\.b.c.d[2].g`,
		String.raw`a\.b.c.e`,
		String.raw`a\.b.c.f`,
		String.raw`a\.b.c.h`,
		String.raw`a\.b.c.i`,
		String.raw`a\.b.c.nu`,
		String.raw`a\.b.c.na`,
		String.raw`a\.b.c.un`,
		String.raw`a\.b..a`,
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
		sparse: [1,,3], // eslint-disable-line no-sparse-arrays
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

	// DeepKeys now handles cyclic references gracefully
	// Since foo contains a non-empty object (even with cycle), it doesn't yield 'foo'
	// It tries to recurse but stops due to cycle detection
	const keys = deepKeys(object);
	t.deepEqual(keys, []);
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
	setProperty(fixture, String.raw`foo\.bar\[0]`, 'value');
	t.is(fixture['foo.bar[0]'], 'value');
	t.is(getProperty(fixture, String.raw`foo\.bar\[0]`), 'value');

	// Test multiple escaped characters
	setProperty(fixture, String.raw`a\.b\.c`, 'test');
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
		getProperty({}, String.raw`[0]\x`);
	}, {message: String.raw`Invalid character '\' after an index at position 4`});

	// Test closing bracket followed by another closing bracket
	t.throws(() => {
		getProperty({}, '[0]]');
	}, {message: 'Invalid character \']\' after an index at position 4'});

	// Test invalid character after index with default character
	t.throws(() => {
		getProperty({}, '[0]a');
	}, {message: 'Invalid character \'a\' after an index at position 4'});
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
	t.is(getProperty(result, String.raw`a\.b.c`), 1);
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

test('deleteProperty - correct boolean returns', t => {
	// Should return false when property doesn't exist
	t.false(deleteProperty({}, 'a'));
	t.false(deleteProperty({a: {}}, 'a.b'));
	t.false(deleteProperty({foo: [1, 2, 3]}, 'foo.5'));
	t.false(deleteProperty({}, 'nonexistent.path'));

	// Should return true when property exists and is deleted
	const object = {a: {b: 'value'}, foo: 'bar'};
	t.true(deleteProperty(object, 'a.b'));
	t.false('b' in object.a);

	t.true(deleteProperty(object, 'foo'));
	t.false('foo' in object);

	// Array indices
	const arrayObject = {items: ['a', 'b', 'c']};
	t.true(deleteProperty(arrayObject, 'items[1]'));
	t.is(arrayObject.items[1], undefined);
	t.is(arrayObject.items.length, 3); // Length preserved

	// Dot notation array indices
	const dotArrayObject = {items: ['x', 'y', 'z']};
	t.true(deleteProperty(dotArrayObject, 'items.0'));
	t.is(dotArrayObject.items[0], undefined);
});

test('unified numeric behavior', t => {
	// Numeric strings in dot notation become numbers
	const array = [undefined, 'value', undefined];

	// '1' in dot notation becomes number 1 and sets the array element
	setProperty(array, '1', 'updated');
	t.is(array[1], 'updated');

	// Leading zeros stay as string keys (not valid array indices)
	const object = {arr: []};
	setProperty(object, 'arr.01', 'leading-zero'); // '01' stays as string
	setProperty(object, 'arr.00', 'double-zero'); // '00' stays as string

	t.is(object.arr['01'], 'leading-zero');
	t.is(object.arr['00'], 'double-zero');
	t.not(object.arr[1], 'leading-zero'); // Should not affect actual index 1

	// Direct numeric strings are converted to numbers
	const array2 = ['a', 'b', 'c'];
	setProperty(array2, '0', 'updated-a');
	setProperty(array2, '2', 'updated-c');
	t.deepEqual(array2, ['updated-a', 'b', 'updated-c']);
});

test('string index edge cases - leading zeros treated as strings', t => {
	// 'users.00' should be treated as string key, not array index
	const object = {};
	setProperty(object, 'users.00.name', 'x');
	t.deepEqual(object, {users: {'00': {name: 'x'}}});
	t.false(Array.isArray(object.users)); // Should be object, not array

	// hasProperty should work with leading zero string keys
	t.true(hasProperty({users: {'00': {name: 'x'}}}, 'users.00.name'));

	// Multiple leading zeros
	setProperty(object, 'users.000.id', 'y');
	t.is(object.users['000'].id, 'y');

	// Mixed canonical and non-canonical
	const mixed = {};
	setProperty(mixed, 'array.0', 'zero'); // Canonical -> array index
	setProperty(mixed, 'array.00', 'double'); // Non-canonical -> string key
	t.true(Array.isArray(mixed.array));
	t.is(mixed.array[0], 'zero');
	t.is(mixed.array['00'], 'double');
});

test('edge cases - empty strings and special characters', t => {
	// Empty string segments
	const object = {};
	setProperty(object, '.foo', 'empty-start');
	setProperty(object, 'foo.', 'empty-end');
	setProperty(object, 'bar..baz', 'double-dot');

	t.is(object[''].foo, 'empty-start');
	t.is(object.foo[''], 'empty-end');
	t.is(object.bar[''].baz, 'double-dot');

	// Special numeric edge cases - these should work as they're not valid array indices
	setProperty(object, 'items.NaN', 'nan-value');
	setProperty(object, 'items.Infinity', 'infinity-value');
	t.is(object.items.NaN, 'nan-value');
	t.is(object.items.Infinity, 'infinity-value');

	// Very large numbers that might cause issues
	const largeNumber = '999999999999999999999999999999';
	setProperty(object, `items.${largeNumber}`, 'huge');
	t.is(object.items[largeNumber], 'huge');
	t.false(Array.isArray(object.items)); // Too large, should create object

	// Negative zero
	setProperty(object, 'negative.-0', 'negative-zero');
	t.is(object.negative['-0'], 'negative-zero');
});

test('edge cases - deeply nested paths', t => {
	// Maximum reasonable depth
	const deepPath = 'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z';
	const object = {};

	setProperty(object, deepPath, 'deep-value');
	t.is(getProperty(object, deepPath), 'deep-value');
	t.true(hasProperty(object, deepPath));

	// Deep path with arrays
	setProperty(object, 'deep.0.nested.1.array.2.value', 'deep-array');
	t.is(getProperty(object, 'deep.0.nested.1.array.2.value'), 'deep-array');
	t.true(Array.isArray(object.deep));
	t.true(Array.isArray(object.deep[0].nested));
	t.true(Array.isArray(object.deep[0].nested[1].array));
});

test('edge cases - property name conflicts', t => {
	// Properties that could conflict with method names or built-ins
	const object = {};
	const conflictingNames = [
		'toString',
		'valueOf',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'length',
		'push',
	];

	for (const name of conflictingNames) {
		setProperty(object, name, `value-${name}`);
		t.is(getProperty(object, name), `value-${name}`);
		t.true(hasProperty(object, name));
	}

	// Constructor is a disallowed key and returns undefined
	t.is(getProperty(object, 'constructor'), undefined);
});

test('edge cases - array length manipulation', t => {
	// Setting length property on arrays
	const arrayObject = {items: [1, 2, 3, 4, 5]};

	setProperty(arrayObject, 'items.length', 2);
	t.is(arrayObject.items.length, 2);
	t.deepEqual(arrayObject.items, [1, 2]);

	// Setting beyond current length
	setProperty(arrayObject, 'items.10', 'sparse');
	t.is(arrayObject.items.length, 11);
	t.is(arrayObject.items[10], 'sparse');
	t.is(arrayObject.items[5], undefined);
});

test('edge cases - prototype chain interactions', t => {
	// Object with custom prototype
	const parent = {parentProperty: 'inherited'};
	const child = Object.create(parent);
	child.ownProperty = 'own';

	// Should access own properties
	t.is(getProperty(child, 'ownProperty'), 'own');
	t.true(hasProperty(child, 'ownProperty'));

	// Should access inherited properties
	t.is(getProperty(child, 'parentProperty'), 'inherited');
	t.true(hasProperty(child, 'parentProperty'));

	// Deleting should only affect own properties
	t.false(deleteProperty(child, 'parentProperty')); // Not own property
	t.is(getProperty(child, 'parentProperty'), 'inherited'); // Still inherited

	t.true(deleteProperty(child, 'ownProperty')); // Own property
	t.is(getProperty(child, 'ownProperty'), undefined);
});

test('edge cases - unicode and special characters', t => {
	const object = {};

	// Unicode property names
	setProperty(object, '🦄.🌈', 'unicode');
	t.is(getProperty(object, '🦄.🌈'), 'unicode');

	// Properties with dots (escaped)
	setProperty(object, String.raw`key\.with\.dots`, 'escaped');
	t.is(getProperty(object, String.raw`key\.with\.dots`), 'escaped');
	t.is(object['key.with.dots'], 'escaped');

	// Properties with brackets (escaped)
	setProperty(object, String.raw`key\[with\]brackets`, 'escaped-brackets');
	t.is(getProperty(object, String.raw`key\[with\]brackets`), 'escaped-brackets');
	t.is(object['key[with]brackets'], 'escaped-brackets');

	// Mixed escaping and array notation
	setProperty(object, String.raw`items\[special\][0].value`, 'mixed');
	t.is(getProperty(object, String.raw`items\[special\][0].value`), 'mixed');
	t.true(Array.isArray(object['items[special]']));
});

test('edge cases - type coercion and falsy values', t => {
	const object = {};

	// Falsy values as property values
	const falsyValues = [false, 0, '', null, undefined, Number.NaN];
	for (const [index, value] of falsyValues.entries()) {
		setProperty(object, `falsy.${index}`, value);

		// GetProperty should return the actual falsy value
		if (Number.isNaN(value)) {
			t.true(Number.isNaN(getProperty(object, `falsy.${index}`)));
		} else {
			t.is(getProperty(object, `falsy.${index}`), value);
		}

		// HasProperty should return true even for falsy values
		t.true(hasProperty(object, `falsy.${index}`));
	}

	// Default values with falsy existing values
	t.is(getProperty(object, 'falsy.0', 'default'), false); // False, not default
	t.is(getProperty(object, 'falsy.1', 'default'), 0); // 0, not default
	t.is(getProperty(object, 'falsy.2', 'default'), ''); // '', not default
	t.is(getProperty(object, 'falsy.3', 'default'), null); // Null, not default
	t.is(getProperty(object, 'nonexistent', 'default'), 'default'); // Uses default
});

test('edge cases - circular references and complex objects', t => {
	// Circular reference (should not cause infinite loops in our operations)
	const circular = {name: 'root'};
	circular.self = circular;

	setProperty(circular, 'self.newProp', 'added');
	t.is(getProperty(circular, 'self.newProp'), 'added');
	t.is(circular.newProp, 'added'); // Because circular.self === circular

	// Complex nested objects with functions
	const complex = {
		data: new Map([['key', 'value']]),
		regex: /test/g,
		date: new Date('2023-01-01'),
		function: () => 'function-result',
	};

	setProperty(complex, 'data.newKey', 'new-value');
	setProperty(complex, 'function.customProp', 'function-prop');

	t.is(complex.data.newKey, 'new-value');
	t.is(complex.function.customProp, 'function-prop');
	t.is(getProperty(complex, 'function.customProp'), 'function-prop');
});

test('edge cases - array holes and sparse arrays', t => {
	// Working with arrays that have real holes (not just undefined values)
	const sparseArray = Array.from({length: 5}, (_, index) => (index === 1 ? 'second' : (index === 3 ? 'fourth' : undefined)));
	sparseArray.length = 5; // Ensure length is correct
	delete sparseArray[0]; // Create actual hole
	delete sparseArray[2]; // Create actual hole
	delete sparseArray[4]; // Create actual hole
	const container = {sparse: sparseArray};

	// Accessing holes should return undefined
	t.is(getProperty(container, 'sparse.0'), undefined);
	t.is(getProperty(container, 'sparse.2'), undefined);
	t.is(getProperty(container, 'sparse[0]'), undefined);

	// Accessing existing elements
	t.is(getProperty(container, 'sparse.1'), 'second');
	t.is(getProperty(container, 'sparse.3'), 'fourth');

	// HasProperty should return false for actual holes
	t.false(hasProperty(container, 'sparse.0'));
	t.false(hasProperty(container, 'sparse.2'));
	t.true(hasProperty(container, 'sparse.1'));
	t.true(hasProperty(container, 'sparse.3'));

	// Setting in holes
	setProperty(container, 'sparse.0', 'filled');
	t.is(container.sparse[0], 'filled');
	t.true(hasProperty(container, 'sparse.0'));
});

test('parsePath', t => {
	// Basic property access
	t.deepEqual(parsePath('foo'), ['foo']);
	t.deepEqual(parsePath('foo.bar'), ['foo', 'bar']);
	t.deepEqual(parsePath('foo.bar.baz'), ['foo', 'bar', 'baz']);

	// Array indices - bracket notation returns numbers
	t.deepEqual(parsePath('[0]'), [0]);
	t.deepEqual(parsePath('foo[0]'), ['foo', 0]);
	t.deepEqual(parsePath('foo[0].bar'), ['foo', 0, 'bar']);
	t.deepEqual(parsePath('[0][1]'), [0, 1]);
	t.deepEqual(parsePath('foo[0][1].bar'), ['foo', 0, 1, 'bar']);

	// Array indices - dot notation returns numbers
	t.deepEqual(parsePath('foo.0'), ['foo', 0]);
	t.deepEqual(parsePath('foo.0.bar'), ['foo', 0, 'bar']);

	// Escaped characters
	t.deepEqual(parsePath(String.raw`foo\.bar`), ['foo.bar']);
	t.deepEqual(parsePath(String.raw`foo\\.bar`), ['foo\\', 'bar']);
	t.deepEqual(parsePath(String.raw`foo\[0]`), ['foo[0]']);
	t.deepEqual(parsePath(String.raw`foo\.bar\.baz`), ['foo.bar.baz']);

	// Empty paths
	t.deepEqual(parsePath(''), ['']);
	t.deepEqual(parsePath('.'), ['', '']);
	t.deepEqual(parsePath('..'), ['', '', '']);

	// Disallowed keys
	t.deepEqual(parsePath('__proto__'), []);
	t.deepEqual(parsePath('foo.__proto__'), []);
	t.deepEqual(parsePath('prototype'), []);
	t.deepEqual(parsePath('constructor'), []);
	t.deepEqual(parsePath('foo.constructor.bar'), []);

	// Complex paths
	t.deepEqual(parsePath('a.b[0].c.d[1][2].e'), ['a', 'b', 0, 'c', 'd', 1, 2, 'e']);
	t.deepEqual(parsePath(String.raw`foo\.bar[0].baz`), ['foo.bar', 0, 'baz']);

	// Empty brackets treated as literal property name
	t.deepEqual(parsePath('foo[]'), ['foo[]']);
	t.deepEqual(parsePath('foo[].bar'), ['foo[]', 'bar']);
	t.deepEqual(parsePath('[].bar'), ['[]', 'bar']);
	t.deepEqual(parsePath('[]'), ['[]']);

	// Use case from issue #119
	const path = 'users.0.profile.settings.theme';
	const segments = parsePath(path);
	t.deepEqual(segments, ['users', 0, 'profile', 'settings', 'theme']);
});

test('stringifyPath', t => {
	// Basic property paths
	t.is(stringifyPath(['foo']), 'foo');
	t.is(stringifyPath(['foo', 'bar']), 'foo.bar');
	t.is(stringifyPath(['foo', 'bar', 'baz']), 'foo.bar.baz');

	// Array indices - bracket notation by default
	t.is(stringifyPath([0]), '[0]');
	t.is(stringifyPath(['foo', 0]), 'foo[0]');
	t.is(stringifyPath(['foo', 0, 'bar']), 'foo[0].bar');
	t.is(stringifyPath([0, 1]), '[0][1]');
	t.is(stringifyPath(['foo', 0, 1, 'bar']), 'foo[0][1].bar');

	// Array indices - dot notation with preferDotForIndices option
	t.is(stringifyPath(['foo', 0], {preferDotForIndices: true}), 'foo.0');
	t.is(stringifyPath(['foo', 0, 'bar'], {preferDotForIndices: true}), 'foo.0.bar');
	t.is(stringifyPath([0, 1], {preferDotForIndices: true}), '[0].1'); // First is still bracket
	t.is(stringifyPath(['foo', 0, 1, 'bar'], {preferDotForIndices: true}), 'foo.0.1.bar');

	// Numeric strings are normalized to numbers
	t.is(stringifyPath(['foo', '0', 'bar']), 'foo[0].bar');
	t.is(stringifyPath(['foo', '123']), 'foo[123]');
	t.is(stringifyPath(['arr', '42']), 'arr[42]');

	// Properties with special characters - should be escaped
	t.is(stringifyPath(['foo.bar']), String.raw`foo\.bar`);
	t.is(stringifyPath(['foo', 'bar.baz']), String.raw`foo.bar\.baz`);
	t.is(stringifyPath(['foo[0]']), String.raw`foo\[0]`);
	t.is(stringifyPath([String.raw`foo\bar`]), String.raw`foo\\bar`);

	// Empty strings
	t.is(stringifyPath(['']), '');
	t.is(stringifyPath(['', '']), '.');
	t.is(stringifyPath(['', '', '']), '..');
	t.is(stringifyPath(['foo', '']), 'foo.');
	t.is(stringifyPath(['', 'foo']), '.foo');

	// Disallowed keys - output as regular properties (parsePath will filter them)
	t.is(stringifyPath(['__proto__']), '__proto__');
	t.is(stringifyPath(['foo', '__proto__']), 'foo.__proto__');
	t.is(stringifyPath(['prototype']), 'prototype');
	t.is(stringifyPath(['constructor']), 'constructor');
	t.is(stringifyPath(['foo', 'constructor', 'bar']), 'foo.constructor.bar');

	// Complex mixed paths
	t.is(stringifyPath(['a', 'b', 0, 'c', 'd', 1, 2, 'e']), 'a.b[0].c.d[1][2].e');
	t.is(stringifyPath(['foo.bar', 0, 'baz']), String.raw`foo\.bar[0].baz`);

	// Non-integer numbers are treated as string keys
	t.is(stringifyPath([1.5]), String.raw`1\.5`);
	t.is(stringifyPath(['foo', 3.14]), String.raw`foo.3\.14`);
	t.is(stringifyPath([-1]), '-1');
	t.is(stringifyPath(['foo', -5]), 'foo.-5');

	// Leading zeros stay as strings (dot notation, not coerced)
	t.is(stringifyPath(['arr', '00']), 'arr.00');
	t.is(stringifyPath(['arr', '01']), 'arr.01');

	// Type validation
	t.throws(() => stringifyPath(['foo', null]), {
		message: /Expected a string or number.*got object/,
	});
	t.throws(() => stringifyPath(['foo', undefined]), {
		message: /Expected a string or number.*got undefined/,
	});
	t.throws(() => stringifyPath(['foo', {}]), {
		message: /Expected a string or number.*got object/,
	});
	t.throws(() => stringifyPath('not-an-array'), {
		instanceOf: TypeError,
		message: /Expected an array, got string/,
	});
});

test('stringifyPath and parsePath roundtrip', t => {
	// Test that stringifyPath(parsePath(x)) is consistent
	const testPaths = [
		'foo.bar',
		'foo[0].bar',
		'foo.bar.baz',
		String.raw`foo\.bar`,
		String.raw`foo\[0]`,
		'a.b[0].c.d[1][2].e',
		String.raw`foo\.bar[0].baz`,
		'.',
		'..',
		'foo.',
		'.foo',
	];

	for (const path of testPaths) {
		const parsed = parsePath(path);
		if (parsed.length > 0) {
			const stringified = stringifyPath(parsed);
			const reparsed = parsePath(stringified);
			t.deepEqual(parsed, reparsed, `Roundtrip failed for: ${path}`);
		}
	}

	// Test segments -> path -> segments roundtrip
	const testSegments = [
		['foo', 'bar'],
		['foo', 0, 'bar'],
		['foo.bar', 'baz'],
		['foo[0]'],
		[0, 1, 2],
		['', ''],
		['foo', '', 'bar'],
	];

	for (const segments of testSegments) {
		const stringified = stringifyPath(segments);
		const parsed = parsePath(stringified);
		t.deepEqual(segments, parsed, `Roundtrip failed for segments: ${JSON.stringify(segments)}`);
	}

	// Test with preferDotForIndices
	const dotNotationPath = 'foo.0.bar';
	const dotParsed = parsePath(dotNotationPath);
	const dotStringified = stringifyPath(dotParsed, {preferDotForIndices: true});
	const dotReparsed = parsePath(dotStringified);
	t.deepEqual(dotParsed, dotReparsed);
	t.is(dotStringified, 'foo.0.bar');
});

test('stringifyPath with real-world use cases', t => {
	// Use case: Building paths programmatically
	const userIndex = 0;
	const fieldName = 'email';
	const path = stringifyPath(['users', userIndex, fieldName]);
	t.is(path, 'users[0].email');

	// Use case: Safely handling user input with special characters
	const userInput = 'user.input[test]';
	const safePath = stringifyPath(['data', userInput, 'value']);
	t.is(safePath, String.raw`data.user\.input\[test].value`);

	// Use case: Working with nested arrays
	const matrixPath = stringifyPath(['matrix', 0, 1, 'value']);
	t.is(matrixPath, 'matrix[0][1].value');

	// Use case: Converting between notations
	const dotNotation = stringifyPath(['items', 0, 'title'], {preferDotForIndices: true});
	t.is(dotNotation, 'items.0.title');

	// Verify the paths work with getProperty/setProperty
	const object = {};
	setProperty(object, path, 'test@example.com');
	t.is(getProperty(object, path), 'test@example.com');

	setProperty(object, safePath, 42);
	t.is(getProperty(object, safePath), 42);
});

test('array paths - getProperty', t => {
	// Basic array path usage
	const object = {foo: {bar: {baz: 'value'}}};
	t.is(getProperty(object, ['foo', 'bar', 'baz']), 'value');
	t.is(getProperty(object, ['foo', 'bar']), object.foo.bar);

	// Array paths with numeric indices
	const arrayObject = {items: [{name: 'first'}, {name: 'second'}]};
	t.is(getProperty(arrayObject, ['items', 0, 'name']), 'first');
	t.is(getProperty(arrayObject, ['items', 1, 'name']), 'second');

	// Empty array path returns undefined (invalid path)
	t.is(getProperty(object, []), undefined);

	// Non-existent paths
	t.is(getProperty(object, ['foo', 'nonexistent']), undefined);
	t.is(getProperty(object, ['foo', 'nonexistent'], 'default'), 'default');

	// Disallowed keys in array paths
	t.is(getProperty(object, ['__proto__', 'foo']), undefined);
	t.is(getProperty(object, ['constructor']), undefined);

	// Comparison with string paths
	t.is(getProperty(object, ['foo', 'bar', 'baz']), getProperty(object, 'foo.bar.baz'));

	// Mixed types in path array
	const complex = {users: [{profile: {id: 123}}]};
	t.is(getProperty(complex, ['users', 0, 'profile', 'id']), 123);

	// String numbers vs numeric indices in array paths
	const stringKeyObject = {arr: {0: 'number-zero'}};
	t.is(getProperty(stringKeyObject, ['arr', 0]), 'number-zero');

	const mixedKeyObject = {};
	setProperty(mixedKeyObject, ['data', '0'], 'string-key');
	setProperty(mixedKeyObject, ['data', 0], 'number-key');
	// When object already exists, number 0 overwrites string '0'
	t.is(mixedKeyObject.data[0], 'number-key');
});

test('array paths - setProperty', t => {
	// Basic array path usage
	const object = {};
	setProperty(object, ['foo', 'bar', 'baz'], 'value');
	t.is(object.foo.bar.baz, 'value');

	// Array paths with numeric indices
	const arrayObject = {};
	setProperty(arrayObject, ['items', 0, 'name'], 'first');
	t.true(Array.isArray(arrayObject.items));
	t.is(arrayObject.items[0].name, 'first');

	// Setting multiple values
	setProperty(arrayObject, ['items', 1, 'name'], 'second');
	t.is(arrayObject.items[1].name, 'second');

	// Overwriting existing values
	setProperty(object, ['foo', 'bar', 'baz'], 'new-value');
	t.is(object.foo.bar.baz, 'new-value');

	// Empty array path returns object unchanged
	const unchanged = {a: 1};
	const result = setProperty(unchanged, [], 'value');
	t.is(result, unchanged);
	t.deepEqual(unchanged, {a: 1});

	// Disallowed keys in array paths should be filtered
	const protectedObject = {};
	setProperty(protectedObject, ['__proto__', 'polluted'], 'bad');
	t.false('polluted' in Object.prototype);

	// Comparison with string paths
	const object1 = {};
	const object2 = {};
	setProperty(object1, ['a', 'b', 'c'], 'value');
	setProperty(object2, 'a.b.c', 'value');
	t.deepEqual(object1, object2);

	// Numeric strings are normalized to numbers in array paths
	const stringKeyObject = {};
	setProperty(stringKeyObject, ['arr', '0'], 'value');
	t.true(Array.isArray(stringKeyObject.arr)); // '0' normalized to 0, creates array
	t.is(stringKeyObject.arr[0], 'value');
});

test('array paths - hasProperty', t => {
	const object = {foo: {bar: {baz: 'value'}}};

	// Basic array path usage
	t.true(hasProperty(object, ['foo', 'bar', 'baz']));
	t.true(hasProperty(object, ['foo', 'bar']));
	t.true(hasProperty(object, ['foo']));

	// Non-existent paths
	t.false(hasProperty(object, ['foo', 'nonexistent']));
	t.false(hasProperty(object, ['nonexistent']));

	// Array paths with numeric indices
	const arrayObject = {items: [{name: 'first'}, {name: 'second'}]};
	t.true(hasProperty(arrayObject, ['items', 0, 'name']));
	t.true(hasProperty(arrayObject, ['items', 1]));
	t.false(hasProperty(arrayObject, ['items', 2]));

	// Empty array path
	t.false(hasProperty(object, []));

	// Disallowed keys
	t.false(hasProperty(object, ['__proto__']));
	t.false(hasProperty(object, ['constructor']));

	// Comparison with string paths
	t.is(
		hasProperty(object, ['foo', 'bar', 'baz']),
		hasProperty(object, 'foo.bar.baz'),
	);

	// Falsy values should still return true
	const falsyObject = {
		a: {
			b: null, c: 0, d: false, e: '',
		},
	};
	t.true(hasProperty(falsyObject, ['a', 'b']));
	t.true(hasProperty(falsyObject, ['a', 'c']));
	t.true(hasProperty(falsyObject, ['a', 'd']));
	t.true(hasProperty(falsyObject, ['a', 'e']));
});

test('array paths - deleteProperty', t => {
	// Basic array path usage
	const object = {foo: {bar: {baz: 'value', other: 'keep'}}};
	t.true(deleteProperty(object, ['foo', 'bar', 'baz']));
	t.is(object.foo.bar.baz, undefined);
	t.is(object.foo.bar.other, 'keep');

	// Array paths with numeric indices
	const arrayObject = {items: ['a', 'b', 'c']};
	t.true(deleteProperty(arrayObject, ['items', 1]));
	t.is(arrayObject.items[1], undefined);
	t.is(arrayObject.items.length, 3); // Length preserved

	// Non-existent paths return false
	t.false(deleteProperty(object, ['foo', 'nonexistent']));
	t.false(deleteProperty({}, ['foo', 'bar']));

	// Empty array path returns false
	t.false(deleteProperty(object, []));

	// Disallowed keys
	t.false(deleteProperty(object, ['__proto__']));

	// Comparison with string paths
	const object1 = {a: {b: {c: 1}}};
	const object2 = {a: {b: {c: 1}}};
	deleteProperty(object1, ['a', 'b', 'c']);
	deleteProperty(object2, 'a.b.c');
	t.deepEqual(object1, object2);

	// Deleting from nested arrays
	const nested = {data: [{items: ['x', 'y', 'z']}]};
	t.true(deleteProperty(nested, ['data', 0, 'items', 1]));
	t.is(nested.data[0].items[1], undefined);
});

test('array paths - interoperability use case (issue #120)', t => {
	// Simulate getting a path from another library
	const pathFromOtherLib = ['users', 0, 'profile', 'settings', 'theme'];

	// Create object using array path
	const object = {};
	setProperty(object, pathFromOtherLib, 'dark');
	t.is(object.users[0].profile.settings.theme, 'dark');

	// Read using array path
	t.is(getProperty(object, pathFromOtherLib), 'dark');

	// Check existence using array path
	t.true(hasProperty(object, pathFromOtherLib));

	// Delete using array path
	t.true(deleteProperty(object, pathFromOtherLib));
	t.false(hasProperty(object, pathFromOtherLib));

	// Verify no redundant parsing happened
	// This is the key benefit - we avoid stringify → parse cycle
	const segments = ['foo', 'bar', 'baz'];
	const object2 = {};
	setProperty(object2, segments, 'value');
	t.is(getProperty(object2, segments), 'value');
});

test('array paths - edge cases', t => {
	// Single element array
	const object = {foo: 'bar'};
	t.is(getProperty(object, ['foo']), 'bar');

	// Array with empty string
	const emptyObject = {'': {nested: 'value'}};
	setProperty(emptyObject, ['', 'nested'], 'updated');
	t.is(getProperty(emptyObject, ['', 'nested']), 'updated');

	// Very long array path
	const deep = {};
	const longPath = Array.from({length: 50}, (_, index) => `level${index}`);
	setProperty(deep, longPath, 'deep-value');
	t.is(getProperty(deep, longPath), 'deep-value');

	// Array path with special characters in string segments
	const special = {};
	setProperty(special, ['foo.bar', 'baz[0]'], 'special');
	t.is(special['foo.bar']['baz[0]'], 'special');
	t.is(getProperty(special, ['foo.bar', 'baz[0]']), 'special');

	// Type validation - invalid path types return object (no default) or default value
	const testObject = {foo: 'bar'};
	t.is(getProperty(testObject, null), testObject);
	t.is(getProperty(testObject, null, 'default'), 'default');
	t.is(getProperty(testObject, undefined), testObject);
	t.is(getProperty(testObject, 123), testObject);
});

test('input validation - invalid array path segment types', t => {
	const object = {foo: 'bar'};

	// Test all invalid types
	t.throws(() => getProperty(object, [null]), {
		instanceOf: TypeError,
		message: /Expected a string or number.*got object/,
	});

	t.throws(() => getProperty(object, [undefined]), {
		instanceOf: TypeError,
		message: /Expected a string or number.*got undefined/,
	});

	t.throws(() => getProperty(object, [{}]), {
		instanceOf: TypeError,
		message: /Expected a string or number.*got object/,
	});

	t.throws(() => getProperty(object, [Symbol('test')]), {
		instanceOf: TypeError,
		message: /Expected a string or number.*got symbol/,
	});

	t.throws(() => getProperty(object, [true]), {
		instanceOf: TypeError,
		message: /Expected a string or number.*got boolean/,
	});

	t.throws(() => getProperty(object, [false]), {
		instanceOf: TypeError,
		message: /Expected a string or number.*got boolean/,
	});

	// NaN and Infinity are typeof 'number' but invalid - should be rejected
	t.throws(() => getProperty(object, [Number.NaN]), {
		instanceOf: TypeError,
		message: /must be a finite number/,
	});

	t.throws(() => getProperty(object, [Infinity]), {
		instanceOf: TypeError,
		message: /must be a finite number/,
	});

	t.throws(() => getProperty(object, [-Infinity]), {
		instanceOf: TypeError,
		message: /must be a finite number/,
	});
});

test('input validation - setProperty with invalid segment types', t => {
	t.throws(() => setProperty({}, [null], 'value'), {
		instanceOf: TypeError,
		message: /Expected a string or number/,
	});

	t.throws(() => setProperty({}, ['foo', {}], 'value'), {
		instanceOf: TypeError,
		message: /Expected a string or number/,
	});
});

test('input validation - hasProperty with invalid segment types', t => {
	t.throws(() => hasProperty({}, [null]), {
		instanceOf: TypeError,
		message: /Expected a string or number/,
	});

	t.throws(() => hasProperty({}, ['foo', undefined]), {
		instanceOf: TypeError,
		message: /Expected a string or number/,
	});
});

test('input validation - deleteProperty with invalid segment types', t => {
	t.throws(() => deleteProperty({}, [null]), {
		instanceOf: TypeError,
		message: /Expected a string or number/,
	});

	t.throws(() => deleteProperty({}, ['foo', Symbol('test')]), {
		instanceOf: TypeError,
		message: /Expected a string or number/,
	});
});

test('input validation - stringifyPath type errors', t => {
	// Non-array input
	t.throws(() => stringifyPath('not-an-array'), {
		instanceOf: TypeError,
		message: /Expected an array, got string/,
	});

	t.throws(() => stringifyPath(null), {
		instanceOf: TypeError,
		message: /Expected an array, got object/, // Null is typeof object
	});

	// Invalid segment types
	t.throws(() => stringifyPath([null]), {
		instanceOf: TypeError,
		message: /Expected a string or number/,
	});

	t.throws(() => stringifyPath(['foo', {}, 'bar']), {
		instanceOf: TypeError,
		message: /Expected a string or number/,
	});

	t.throws(() => stringifyPath([true, false]), {
		instanceOf: TypeError,
		message: /Expected a string or number/,
	});
});

test('input validation - parsePath type errors', t => {
	t.throws(() => parsePath(123), {
		instanceOf: TypeError,
		message: /Expected a string, got number/,
	});

	t.throws(() => parsePath(null), {
		instanceOf: TypeError,
		message: /Expected a string, got object/,
	});

	t.throws(() => parsePath(undefined), {
		instanceOf: TypeError,
		message: /Expected a string, got undefined/,
	});

	t.throws(() => parsePath([]), {
		instanceOf: TypeError,
		message: /Expected a string, got object/,
	});
});

test('input validation - escapePath type errors', t => {
	t.throws(() => escapePath(123), {
		instanceOf: TypeError,
		message: /Expected a string, got number/,
	});

	t.throws(() => escapePath(null), {
		instanceOf: TypeError,
		message: /Expected a string, got object/,
	});

	t.throws(() => escapePath(['array']), {
		instanceOf: TypeError,
		message: /Expected a string, got object/,
	});
});

test('input validation - special number values in array paths', t => {
	// NaN and Infinity are typeof 'number' but invalid - should be rejected
	t.throws(() => {
		setProperty({}, ['test', Number.NaN], 'value');
	}, {message: /must be a finite number/});

	t.throws(() => {
		setProperty({}, ['test', Infinity], 'value');
	}, {message: /must be a finite number/});

	t.throws(() => {
		setProperty({}, ['test', -Infinity], 'value');
	}, {message: /must be a finite number/});

	// Negative zero is valid (equals regular 0)
	const objectWithNegativeZero = {};
	setProperty(objectWithNegativeZero, ['test', -0], 'value');
	t.true(Array.isArray(objectWithNegativeZero.test));
	t.is(objectWithNegativeZero.test[0], 'value');
});

test('edge cases - MAX_ARRAY_INDEX boundary', t => {
	// At the limit (1,000,000) - should be coerced to number
	const atLimit = parsePath('arr.1000000');
	t.deepEqual(atLimit, ['arr', 1_000_000]);
	t.is(typeof atLimit[1], 'number');

	// Above the limit - should remain string
	const aboveLimit = parsePath('arr.1000001');
	t.deepEqual(aboveLimit, ['arr', '1000001']);
	t.is(typeof aboveLimit[1], 'string');

	// Array path with numeric string above MAX_ARRAY_INDEX stays string
	const object = {};
	setProperty(object, ['arr', '1000001'], 'value');
	t.is(object.arr['1000001'], 'value');
	t.false(Array.isArray(object.arr)); // Above limit, not normalized
});

test('edge cases - stringifyPath with empty array and negative indices', t => {
	// Empty array
	t.is(stringifyPath([]), '');

	// Negative indices are treated as string keys
	t.is(stringifyPath(['arr', -1]), 'arr.-1');
	t.is(stringifyPath([-5]), '-5');

	// Float numbers are treated as string keys
	t.is(stringifyPath([1.5]), String.raw`1\.5`);
	t.is(stringifyPath(['arr', 3.14]), String.raw`arr.3\.14`);
});

test('edge cases - deepKeys with empty structures', t => {
	// Empty object
	t.deepEqual(deepKeys({}), []);

	// Empty array
	t.deepEqual(deepKeys([]), []);

	// Object with only empty nested structures - returns paths to empty objects/arrays
	const nested = {a: {}, b: []};
	t.deepEqual(deepKeys(nested), ['a', 'b']);

	// Deeper nesting
	const deepNested = {a: {b: {c: {}}}};
	t.deepEqual(deepKeys(deepNested), ['a.b.c']);
});

test('array filter syntax - parsePath', t => {
	// Basic filter syntax
	t.deepEqual(parsePath('foo[bar="baz"]'), ['foo', {key: 'bar', value: 'baz'}]);
	t.deepEqual(parsePath('[bar="baz"]'), [{key: 'bar', value: 'baz'}]);

	// Different JSON primitive types
	t.deepEqual(parsePath('foo[id=123]'), ['foo', {key: 'id', value: 123}]);
	t.deepEqual(parsePath('foo[active=true]'), ['foo', {key: 'active', value: true}]);
	t.deepEqual(parsePath('foo[active=false]'), ['foo', {key: 'active', value: false}]);
	t.deepEqual(parsePath('foo[value=null]'), ['foo', {key: 'value', value: null}]);
	t.deepEqual(parsePath('foo[price=5.99]'), ['foo', {key: 'price', value: 5.99}]);

	// Filter followed by property access
	t.deepEqual(parsePath('foo[bar="baz"].qux'), ['foo', {key: 'bar', value: 'baz'}, 'qux']);
	t.deepEqual(parsePath('foo[bar="baz"].qux.nested'), ['foo', {key: 'bar', value: 'baz'}, 'qux', 'nested']);

	// Filter followed by array index
	t.deepEqual(parsePath('foo[bar="baz"][0]'), ['foo', {key: 'bar', value: 'baz'}, 0]);
	t.deepEqual(parsePath('foo[bar="baz"][0].prop'), ['foo', {key: 'bar', value: 'baz'}, 0, 'prop']);

	// Multiple filters
	t.deepEqual(parsePath('foo[bar="baz"][qux="quux"]'), ['foo', {key: 'bar', value: 'baz'}, {key: 'qux', value: 'quux'}]);

	// Nested path with filters
	t.deepEqual(parsePath('users[role="admin"].profile[type="public"].name'), [
		'users',
		{key: 'role', value: 'admin'},
		'profile',
		{key: 'type', value: 'public'},
		'name',
	]);

	// Error cases
	t.throws(() => parsePath('foo[bar="baz"'), {message: 'Filter was not closed'});
	t.throws(() => parsePath('foo[bar=]'), {message: 'Invalid filter syntax: could not parse value in filter \'bar=\''});
	t.throws(() => parsePath('foo[="value"]'), {message: 'Invalid filter syntax: empty key in filter \'="value"\''});
	t.throws(() => parsePath('foo[bar]'), {message: /Invalid character 'b' in an index at position 5/});
	t.throws(() => parsePath('foo[bar={key:"val"}]'), {message: /Invalid filter syntax: could not parse value/});
	t.throws(() => parsePath('foo[bar=["arr"]]'), {message: /Invalid filter syntax: could not parse value/});
});

test('array filter syntax - getProperty', t => {
	const object = {
		foo: [
			{bar: 'baz', value: 1},
			{bar: 'qux', value: 2},
			{bar: 'baz', value: 3},
		],
	};

	// Basic filter
	t.is(getProperty(object, 'foo[bar="baz"].value'), 1); // First match
	t.is(getProperty(object, 'foo[bar="qux"].value'), 2);

	// Filter with different types
	const typedObject = {
		items: [
			{id: 123, name: 'first'},
			{id: 456, name: 'second'},
			{active: true, name: 'active-item'},
			{active: false, name: 'inactive-item'},
			{price: 5.99, name: 'cheap'},
			{value: null, name: 'null-value'},
		],
	};

	t.is(getProperty(typedObject, 'items[id=123].name'), 'first');
	t.is(getProperty(typedObject, 'items[id=456].name'), 'second');
	t.is(getProperty(typedObject, 'items[active=true].name'), 'active-item');
	t.is(getProperty(typedObject, 'items[active=false].name'), 'inactive-item');
	t.is(getProperty(typedObject, 'items[price=5.99].name'), 'cheap');
	t.is(getProperty(typedObject, 'items[value=null].name'), 'null-value');

	// No match - returns default value
	t.is(getProperty(object, 'foo[bar="nonexistent"].value'), undefined);
	t.is(getProperty(object, 'foo[bar="nonexistent"].value', 'default'), 'default');

	// Filter on non-array returns default
	t.is(getProperty({foo: 'not-array'}, 'foo[bar="baz"]', 'default'), 'default');

	// Nested filters
	const nested = {
		users: [
			{role: 'admin', profile: [{type: 'public', name: 'Admin Profile'}]},
			{role: 'user', profile: [{type: 'private', name: 'User Profile'}]},
		],
	};

	t.is(getProperty(nested, 'users[role="admin"].profile[0].name'), 'Admin Profile');
});

test('array filter syntax - setProperty', t => {
	// Set on existing matching item
	const object1 = {
		foo: [
			{bar: 'baz', value: 1},
			{bar: 'qux', value: 2},
		],
	};

	setProperty(object1, 'foo[bar="baz"].value', 100);
	t.is(object1.foo[0].value, 100);
	t.is(object1.foo[1].value, 2); // Other items unchanged

	// Does not create new item when no match
	const object2 = {foo: []};
	setProperty(object2, 'foo[bar="baz"].value', 42);
	t.is(object2.foo.length, 0); // No item created

	// Does not create array when filter would not match
	const object3 = {};
	setProperty(object3, 'items[id=123].name', 'test');
	t.is(object3.items, undefined); // No array created

	// Different value types - only updates existing items
	const object4 = {
		items: [
			{id: 1, name: 'old'},
			{active: true, name: 'old'},
			{value: null, name: 'old'},
		],
	};
	setProperty(object4, 'items[id=1].name', 'numeric-id');
	setProperty(object4, 'items[active=true].name', 'active');
	setProperty(object4, 'items[value=null].name', 'null-val');
	t.is(object4.items.length, 3);
	t.is(object4.items[0].name, 'numeric-id');
	t.is(object4.items[1].name, 'active');
	t.is(object4.items[2].name, 'null-val');
});

test('array filter syntax - hasProperty', t => {
	const object = {
		foo: [
			{bar: 'baz', value: 1},
			{bar: 'qux', value: 2},
		],
	};

	t.true(hasProperty(object, 'foo[bar="baz"].value'));
	t.true(hasProperty(object, 'foo[bar="qux"].value'));
	t.false(hasProperty(object, 'foo[bar="nonexistent"].value'));
	t.false(hasProperty(object, 'foo[bar="baz"].nonexistent'));

	// Filter on non-array
	t.false(hasProperty({foo: 'not-array'}, 'foo[bar="baz"]'));

	// Different types
	const typed = {
		items: [
			{id: 123, name: 'test'},
			{active: true, value: 'yes'},
		],
	};

	t.true(hasProperty(typed, 'items[id=123].name'));
	t.true(hasProperty(typed, 'items[active=true].value'));
	t.false(hasProperty(typed, 'items[id=999].name'));
});

test('array filter syntax - deleteProperty', t => {
	const object = {
		foo: [
			{bar: 'baz', value: 1, extra: 'data'},
			{bar: 'qux', value: 2},
		],
	};

	// Delete property from filtered item
	t.true(deleteProperty(object, 'foo[bar="baz"].extra'));
	t.is(object.foo[0].extra, undefined);
	t.is(object.foo[0].value, 1); // Other properties preserved
	t.is(object.foo[1].value, 2); // Other items preserved

	// Delete from non-existent filter match
	t.false(deleteProperty(object, 'foo[bar="nonexistent"].value'));

	// Delete from non-array
	t.false(deleteProperty({foo: 'not-array'}, 'foo[bar="baz"].value'));
});

test('array filter syntax - stringifyPath', t => {
	// Basic filter
	t.is(stringifyPath(['foo', {key: 'bar', value: 'baz'}]), 'foo[bar="baz"]');

	// Different value types
	t.is(stringifyPath(['foo', {key: 'id', value: 123}]), 'foo[id=123]');
	t.is(stringifyPath(['foo', {key: 'active', value: true}]), 'foo[active=true]');
	t.is(stringifyPath(['foo', {key: 'active', value: false}]), 'foo[active=false]');
	t.is(stringifyPath(['foo', {key: 'value', value: null}]), 'foo[value=null]');
	t.is(stringifyPath(['foo', {key: 'price', value: 5.99}]), 'foo[price=5.99]');

	// Filter with property access
	t.is(stringifyPath(['foo', {key: 'bar', value: 'baz'}, 'qux']), 'foo[bar="baz"].qux');

	// Filter with array index
	t.is(stringifyPath(['foo', {key: 'bar', value: 'baz'}, 0]), 'foo[bar="baz"][0]');

	// Multiple filters
	t.is(stringifyPath(['foo', {key: 'bar', value: 'baz'}, {key: 'qux', value: 'quux'}]), 'foo[bar="baz"][qux="quux"]');

	// Error cases
	t.throws(() => stringifyPath([{key: 'bar'}]), {message: 'Filter object at index 0 must have \'key\' and \'value\' properties'});
	t.throws(() => stringifyPath([{value: 'baz'}]), {message: 'Filter object at index 0 must have \'key\' and \'value\' properties'});
});

test('array filter syntax - roundtrip', t => {
	const paths = [
		'foo[bar="baz"]',
		'foo[id=123].name',
		'foo[active=true].value',
		'users[role="admin"].profile[type="public"].name',
		'items[price=5.99][0].title',
	];

	for (const path of paths) {
		const parsed = parsePath(path);
		const stringified = stringifyPath(parsed);
		const reparsed = parsePath(stringified);
		t.deepEqual(parsed, reparsed, `Roundtrip failed for: ${path}`);
	}
});

test('array filter syntax - array path usage', t => {
	const object = {
		items: [
			{id: 1, name: 'first'},
			{id: 2, name: 'second'},
		],
	};

	// Using array paths with filter objects
	const filterPath = ['items', {key: 'id', value: 1}, 'name'];
	t.is(getProperty(object, filterPath), 'first');

	// `setProperty` only updates existing items, doesn't create
	const object2 = {items: [{id: 1, name: 'old'}]};
	setProperty(object2, filterPath, 'test');
	t.is(object2.items[0].name, 'test');

	t.true(hasProperty(object, filterPath));

	const object3 = {items: [{id: 1, name: 'test', extra: 'data'}]};
	t.true(deleteProperty(object3, ['items', {key: 'id', value: 1}, 'extra']));
	t.is(object3.items[0].extra, undefined);
});
