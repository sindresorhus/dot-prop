# dot-prop [![Build Status](https://travis-ci.org/sindresorhus/dot-prop.svg?branch=master)](https://travis-ci.org/sindresorhus/dot-prop)

> Get, set or delete a property from a nested object using a dot path


## Install

```
$ npm install --save dot-prop
```


## Usage

```js
const dotProp = require('dot-prop');

// getter
dotProp.get({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> 'unicorn'

dotProp.get({foo: {bar: 'a'}}, 'foo.notDefined.deep');
//=> undefined

dotProp.get({foo: {'dot.dot': 'unicorn'}}, 'foo.dot\\.dot');
//=> 'unicorn'

// setter
const obj = {foo: {bar: 'a'}};
dotProp.set(obj, 'foo.bar', 'b');
console.log(obj);
//=> {foo: {bar: 'b'}}

dotProp.set(obj, 'foo.baz', 'x');
console.log(obj);
//=> {foo: {bar: 'b', baz: 'x'}}

dotProp.set(obj, 'foo.dot\\.dot', 'unicorn');
console.log(obj);
//=> {foo: {bar: 'b', baz: 'x', 'dot.dot': 'unicorn'}}

// deleter
const obj = {foo: {bar: 'a'}};
dotProp.del(obj, 'foo.bar');
console.log(obj);
//=> {foo: {}}

obj.foo.bar = {x: 'y', y: 'x'};
dotProp.del(obj, 'foo.bar.x');
console.log(obj);
//=> {foo: {bar: {y: 'x'}}}

obj.dotted = {sub: {'dotted.prop': 'foo', other: 'prop'}};
dotProp.del(obj, 'sub.dotted\\.prop')
console.log(obj.dotted);
//=> {sub: {other: 'prop'}}
```


## API

### get(obj, path)

### set(obj, path, value)

#### obj

Type: `object`

Object to get or set the `path` value.

#### path

Type: `string`

Path of the property in the object. Use `.` for nested objects or `\\.` to add a `.` in a key.

#### value

Type: `any`

Value to set at `path`.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
