import {expectType, expectAssignable} from 'tsd';
import dotProp = require('.');

expectType<string>(dotProp.get({foo: {bar: 'unicorn'}}, 'foo.bar'));
expectType<undefined>(dotProp.get({foo: {bar: 'a'}}, 'foo.notDefined.deep'));
expectAssignable<string>(
	dotProp.get({foo: {bar: 'a'}}, 'foo.notDefined.deep', 'default value')
);
expectType<string>(
	dotProp.get({foo: {'dot.dot': 'unicorn'}}, 'foo.dot\\.dot')
);

const object = {foo: {bar: 'a'}};
expectType<typeof object>(dotProp.set(object, 'foo.bar', 'b'));

expectType<boolean>(dotProp.has({foo: {bar: 'unicorn'}}, 'foo.bar'));

expectType<boolean>(dotProp.delete({foo: {bar: 'a'}}, 'foo.bar'));
