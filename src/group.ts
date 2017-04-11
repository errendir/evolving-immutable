import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

interface GroupKeyFunction<K, V, GK> {
  (value: V, key: K): Iterable<GK, GK> | GK,
  specialize?: () => GroupKeyFunction<K, V, GK>
}
interface GroupOperation<K, V, GK> {
  (map: Map<K, V>): Map<GK, Map<K, V>>,
  specialize: () => GroupOperation<K, V, GK>
}
export function group<K, V, GK>(fn: GroupKeyFunction<K, V, GK>): GroupOperation<K, V, GK> {
  let currentFnInstances = Map<any, any>().asMutable()
  let currentValue = Map<any,any>().asMutable()
  let currentArgument = Map()

  const groupsSentinel = []
  const findGroups = (group) => {
    let groups
    if(Iterable.isIterable(group)) {
      groups = group
    } else {
      groups = groupsSentinel
      groupsSentinel[0] = group
    }
    return groups
  }

  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)
    currentArgument = newArgument

    argumentDiff.removed.forEach((value, key) => {
      const fnInstance = currentFnInstances.get(key)
      const groups = findGroups(fnInstance(value, key))
      currentFnInstances.remove(key)
      groups.forEach(group => {
        const prevSubCollection = currentValue.get(group)
        const nextSubCollection = prevSubCollection.remove(key)
        if(nextSubCollection.isEmpty()) {
          currentValue.remove(group)
        } else {
          currentValue.set(group, nextSubCollection)
        }
      })
    })
    argumentDiff.added.forEach((value, key) => {
      const fnInstance = fn.specialize ? fn.specialize() : fn
      const groups = findGroups(fnInstance(value, key))
      currentFnInstances.set(key, fnInstance)
      groups.forEach(group => {
        currentValue.update(group, (subCollection) => (subCollection || Map()).set(key,value))
      })
    })
    argumentDiff.updated.forEach(({prev, next}, key) => {
      const fnInstance = currentFnInstances.get(key)
      const prevGroups = findGroups(fnInstance(prev, key))
      // TODO: consider using diff to only update groups that changed
      prevGroups.forEach(prevGroup => {
        const prevSubCollection = currentValue.get(prevGroup)
        const nextSubCollection = prevSubCollection.remove(key)
        if(nextSubCollection.isEmpty()) {
          currentValue.remove(prevGroup)
        } else {
          currentValue.set(prevGroup, nextSubCollection)
        }
      })
      const nextGroups = findGroups(fnInstance(next, key))
      nextGroups.forEach(nextGroup => {
        currentValue
          .update(nextGroup, (subCollection) => (subCollection || Map()).set(key,next))
      })
    })
    const result = currentValue.asImmutable()
    currentValue = result.asMutable()
    return result
  }
  const specialize = () => {
    return group(fn)
  }
  apply.specialize = specialize

  return apply
}