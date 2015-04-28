# dot-prop [![Build Status](https://travis-ci.org/sindresorhus/dot-prop.svg?branch=master)](https://travis-ci.org/sindresorhus/dot-prop)

> Get or set a property from a nested object using a dot path


## Install

```
$ npm install --save dot-prop
```


## Usage

```js
var dotProp = require('dot-prop');

// getter
dotProp.get({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> 'unicorn'

dotProp.get({foo: {bar: 'a'}}, 'foo.notDefined.deep');
//=> undefined

dotProp.get({'foo.bar': {baz: 'a'}}, ['foo.bar', 'baz']);
//=> 'a'

// setter
var obj = {foo: {bar: 'a'}};
dotProp.set(obj, 'foo.bar', 'b');
console.log(obj);
//=> {foo: {bar: 'b'}}

dotProp.set(obj, 'foo.baz', 'x');
console.log(obj);
//=> {foo: {bar: 'b', baz: 'x'}}

dotProp.set(obj, ['foo.bar', 'baz'], 'x');
console.log(obj);
//=> {'foo.bar': {baz: 'x'}}
```


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
