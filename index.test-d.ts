import {expectType, expectAssignable} from 'tsd';
import {getProperty, setProperty, hasProperty, deleteProperty} from './index.js';

expectType<string>(getProperty({foo: {bar: 'unicorn'}}, 'foo.bar'));
expectType<undefined>(getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep'));
expectAssignable<string>(
	getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep', 'default value'),
);
expectType<string>(
	getProperty({foo: {'dot.dot': 'unicorn'}}, 'foo.dot\\.dot'),
);

const object = {foo: {bar: 'a'}};
expectType<typeof object>(setProperty(object, 'foo.bar', 'b'));

expectType<boolean>(hasProperty({foo: {bar: 'unicorn'}}, 'foo.bar'));

expectType<boolean>(deleteProperty({foo: {bar: 'a'}}, 'foo.bar'));
