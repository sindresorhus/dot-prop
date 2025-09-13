import {expectTypeOf} from 'expect-type';
import {
	getProperty,
	setProperty,
	hasProperty,
	deleteProperty,
	escapePath,
	deepKeys,
} from './index.js';

// Test the new behavior: non-object types return unknown instead of undefined
expectTypeOf(getProperty(null, 'foo')).toBeUnknown();
expectTypeOf(getProperty(undefined, 'foo')).toBeUnknown();
expectTypeOf(getProperty(42, 'foo')).toBeUnknown();
expectTypeOf(getProperty('string', 'foo')).toBeUnknown();
expectTypeOf(getProperty(true, 'foo')).toBeUnknown();

// With default values, non-object types return the default value
expectTypeOf(getProperty(null, 'foo', 'default')).toEqualTypeOf<string>();
expectTypeOf(getProperty(42, 'foo', 123)).toEqualTypeOf<number>();

expectTypeOf(getProperty({foo: {bar: 'unicorn'}}, 'foo.bar')).toBeString();
expectTypeOf(getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep')).toBeUndefined();
expectTypeOf(getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep', 'default value')).toBeString();

// @ts-expect-error type-fest's `Get` not smart enough to deal with escaped dots
expectTypeOf(getProperty({foo: {'dot.dot': 'unicorn'}}, String.raw`foo.dot\.dot`)).toEqualTypeOf<string>(); // eslint-disable-line @typescript-eslint/naming-convention

const object = {foo: {bar: 'a'}};
expectTypeOf(setProperty(object, 'foo.bar', 'b')).toEqualTypeOf(object);

expectTypeOf(hasProperty({foo: {bar: 'unicorn'}}, 'foo.bar')).toEqualTypeOf<boolean>();

expectTypeOf(deleteProperty({foo: {bar: 'a'}}, 'foo.bar')).toEqualTypeOf<boolean>();

expectTypeOf(escapePath('foo.bar')).toEqualTypeOf<string>();

expectTypeOf(deepKeys({foo: {bar: 'a'}})).toEqualTypeOf<string[]>();
