# dot-prop [![Build Status](https://travis-ci.org/sindresorhus/dot-prop.svg?branch=master)](https://travis-ci.org/sindresorhus/dot-prop)

> Get, set, or delete a property from a nested object using a dot path


## Install

```
$ npm install dot-prop
```


## Usage

```js
const dotProp = require('dot-prop');

// Getter
dotProp.get({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> 'unicorn'

dotProp.get({foo: {bar: 'a'}}, 'foo.notDefined.deep');
//=> undefined

dotProp.get({foo: {bar: 'a'}}, 'foo.notDefined.deep', 'default value');
//=> 'default value'

dotProp.get({foo: {'dot.dot': 'unicorn'}}, 'foo.dot\\.dot');
//=> 'unicorn'

// Setter
const object = {foo: {bar: 'a'}};
dotProp.set(object, 'foo.bar', 'b');
console.log(object);
//=> {foo: {bar: 'b'}}

const foo = dotProp.set({}, 'foo.bar', 'c');
console.log(foo);
//=> {foo: {bar: 'c'}}

dotProp.set(object, 'foo.baz', 'x');
console.log(object);
//=> {foo: {bar: 'b', baz: 'x'}}

// Has
dotProp.has({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> true

// Deleter
const object = {foo: {bar: 'a'}};
dotProp.delete(object, 'foo.bar');
console.log(object);
//=> {foo: {}}

object.foo.bar = {x: 'y', y: 'x'};
dotProp.delete(object, 'foo.bar.x');
console.log(object);
//=> {foo: {bar: {y: 'x'}}}
```


## API

### get(object, path, [defaultValue])

### set(object, path, value)

Returns the object.

### has(object, path)

### delete(object, path)

#### object

Type: `Object`

Object to get, set, or delete the `path` value.

#### path

Type: `string`

Path of the property in the object, using `.` to separate each nested key.

Use `\\.` if you have a `.` in the key.

#### value

Type: `unknown`

Value to set at `path`.

#### defaultValue

Type: `unknown`

Default value.


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
