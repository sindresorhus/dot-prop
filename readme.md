# dot-prop [![Build Status](https://travis-ci.org/sindresorhus/dot-prop.svg?branch=master)](https://travis-ci.org/sindresorhus/dot-prop)

> Get a property from a nested object using a dot path


## Install

```
$ npm install --save dot-prop
```


## Usage

```js
var dotProp = require('dot-prop');

dotProp({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> 'unicorn'
```


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
