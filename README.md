# Evolving Immutable objects

Write declarative denormalization of your Immutable.js object that run as fast (almost) as traditional denormalizations done through imperative updates.

## Theory

Immutable.js uses hash-tries to represent immutable data. This allows for fast creation of new objects from old objects. If you create a map `const map1 = Map({a: 11, b: 12, c: 13, d: 14})` and `const map2 = map1.set('e', 15)`, the map `map2` will share most of the memory with the map `map1`. A neat side-effect of this is the ease of diffing immutable objects that share common edit history.

Read more about the hash-trie diffing here: https://github.com/facebook/immutable-js/pull/953

If a denormalized object must be computed from an immutable object it has to be done anew every time the source object is replaced. However with a cheap diff, a set of changes can be extracted from two object and then applied to the denormalized object.

## Example

Imagine you have the `likesById` object:
```
const likes = Set([
  {id: 'lA', postId: 'pA', userId: 'uA'},
  {id: 'lB', postId: 'pB', userId: 'uB'},
  {id: 'lC', postId: 'pC', userId: 'uC'},
  {id: 'lD', postId: 'pD', userId: 'uD'},
  {id: 'lE', postId: 'pD', userId: 'uC'},
])
const likesById = Map(likes.map(like => ([like.id, like])))
```

If you want to create an aggregate of likes by post id you could write something like that:
```
const getLikesByPostId = (likesById) => {
  return group(like => like.postId, likesById)
}
```

The resulting datastructure is computed anew each time `getLikesByPostId` is called. Even if the `likesById` datastructure didn't change (or changed only slightly) the same expensive grouping computation is performed.

Instead the `getLikesByPostId` can be rewritten to use evolving-immutable diff-memed aggregattion:

```
const _getLikesByPostId = pipelinePiece({
  createPipeline: () => ({
    groupLikesByPostId: group(like => like.postId)
  }),
  executePipeline: ({ groupLikesByPostId }, likesById) => {
    return groupLikesByPostId(likesById)
  }
})
```

Now each time `_getLikesByPostId`, the data used in the previous computation is reused and only the changes in the `likesById` argument are applied to the newly computed result. 