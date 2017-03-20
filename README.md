# Evolving Immutable objects

Write declarative denormalization of your Immutable.js object that run as fast (almost) as traditional denormalizations done through imperative updates.

## Theory

Immutable.js uses hash-tries to represent immutable data. This allows for fast creation of new objects from old objects. If you create a map `const map1 = Map({a: 11, b: 12, c: 13, d: 14})` and `const map2 = map1.set('e', 15)`, the map `map2` will share most of the memory with the map `map1`. A neat side-effect of this is the ease of diffing immutable objects that share common edit history.

Read more about the hash-trie diffing here: https://github.com/facebook/immutable-js/pull/953

If a denormalized object must be computed from an immutable object it has to be done anew every time the source object is replaced. However with a cheap diff, a set of changes can be extracted from two object and then applied to the denormalized object.