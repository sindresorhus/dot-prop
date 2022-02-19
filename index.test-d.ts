import {expectTypeOf} from 'expect-type';
import {getProperty, setProperty, hasProperty, deleteProperty, escapePath, deepKeys} from './index.js';

expectTypeOf(getProperty({foo: {bar: 'unicorn'}}, 'foo.bar')).toBeString();
expectTypeOf(getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep')).toBeUndefined();
expectTypeOf(
	getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep', 'default value'),
).toBeString();
expectTypeOf(
	getProperty({foo: {'dot.dot': 'unicorn'}}, 'foo.dot\\.dot'),
	// @ts-expect-error type-fest's `Get` not smart enough to deal with escaped dots
).toEqualTypeOf<string>();

const object = {foo: {bar: 'a'}};
expectTypeOf(setProperty(object, 'foo.bar', 'b')).toEqualTypeOf(object);

expectTypeOf(hasProperty({foo: {bar: 'unicorn'}}, 'foo.bar')).toEqualTypeOf<boolean>();

expectTypeOf(deleteProperty({foo: {bar: 'a'}}, 'foo.bar')).toEqualTypeOf<boolean>();

expectTypeOf(escapePath('foo.bar')).toEqualTypeOf<string>();

expectTypeOf(deepKeys({foo: {bar: 'a'}})).toEqualTypeOf<string[]>();
