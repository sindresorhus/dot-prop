'use strict';
var test = require('ava');
var dotProp = require('./');

test(function (t) {
	var f1 = {foo: 1};
	t.assert(dotProp(f1) === f1);
	t.assert(dotProp({foo: 1}, 'foo') === 1);
	t.assert(dotProp({foo: null}, 'foo') === null);
	t.assert(dotProp({foo: undefined}, 'foo') === undefined);
	t.assert(dotProp({foo: {bar: true}}, 'foo.bar') === true);
	t.assert(dotProp({foo: {bar: {baz: true}}}, 'foo.bar.baz') === true);
	t.assert(dotProp({foo: {bar: {baz: null}}}, 'foo.bar.baz') === null);
	t.assert(dotProp({foo: {bar: 'a'}}, 'foo.fake.fake2') === undefined);
	t.end();
});
