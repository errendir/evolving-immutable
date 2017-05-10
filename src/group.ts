import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { wrapDiffProcessor } from './wrapDiffProcessor'

import { createMutableMap } from './mutableContainers'

export function groupDiffProcessor(fn) { 
  let currentFnInstances = createMutableMap()
  let currentValue = createMutableMap()

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

  const diffProcessor = ({ remove, add, update }) => ({
    remove: (value, key) => {
      const fnInstance = currentFnInstances.get(key)
      const groups = findGroups(fnInstance(value, key))
      currentFnInstances.delete(key)
      groups.forEach(group => {
        const prevSubCollection = currentValue.get(group)
        const nextSubCollection = prevSubCollection.remove(key)
        if(nextSubCollection.isEmpty()) {
          currentValue.delete(group)
          remove(prevSubCollection, group)
        } else {
          currentValue.set(group, nextSubCollection)
          //update({ prev: prevSubCollection, next: nextSubCollection }, group)
          remove(value, group, key)
        }
      })
    },
    add: (value, key) => {
      const fnInstance = fn.specialize ? fn.specialize() : fn
      const groups = findGroups(fnInstance(value, key))
      currentFnInstances.set(key, fnInstance)
      groups.forEach(group => {
        const prevSubCollection = currentValue.get(group)
        const nextSubCollection = (prevSubCollection || Map().asMutable()).set(key,value)
        currentValue.set(group, nextSubCollection)
        if(!prevSubCollection) {
          //add(nextSubCollection, group)
          add(value, group, key)
        } else {
          //update({ prev: prevSubCollection, next: nextSubCollection }, group)
          add(value, group, key)
        }
      })
    },
    update: ({prev, next}, key) => {
      const fnInstance = currentFnInstances.get(key)
      const prevGroups = findGroups(fnInstance(prev, key))
      // TODO: consider using diff to only update groups that changed
      prevGroups.forEach(prevGroup => {
        const prevSubCollection = currentValue.get(prevGroup)
        const nextSubCollection = prevSubCollection.remove(key)
        if(nextSubCollection.isEmpty()) {
          currentValue.delete(prevGroup)
          remove(prevSubCollection, prevGroup)
        } else {
          currentValue.set(prevGroup, nextSubCollection)
          //update({ prev: prevSubCollection, next: nextSubCollection }, group)
          remove(prev, prevGroup, key)
        }
      })
      const nextGroups = findGroups(fnInstance(next, key))
      nextGroups.forEach(nextGroup => {
        const prevSubCollection = currentValue.get(nextGroup)
        const nextSubCollection = (prevSubCollection || Map().asMutable()).set(key, next)
        currentValue.set(nextGroup, nextSubCollection)
        if(!prevSubCollection) {
          //add(nextSubCollection, nextGroup)
          add(next, nextGroup, key)
        } else {
          //update({ prev: prevSubCollection, next: nextSubCollection }, nextGroup)
          add(next, nextGroup, key)
        }
      })
    },
  })
  const specialize = () => {
    return groupDiffProcessor(fn)
  }

  return { 
    diffProcessor,
    specialize,
  }
}

interface GroupKeyFunction<K, V, GK> {
  (value: V, key: K): Iterable<GK, GK> | GK,
  specialize?: () => GroupKeyFunction<K, V, GK>
}
interface GroupOperation<K, V, GK> {
  (map: Map<K, V>): Map<GK, Map<K, V>>,
  specialize: () => GroupOperation<K, V, GK>
}
export function group<K, V, GK>(fn: GroupKeyFunction<K, V, GK>): GroupOperation<K, V, GK> {
  return wrapDiffProcessor(groupDiffProcessor(fn))
}