import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { wrapDiffProcessor } from './wrapDiffProcessor'

import { createMutableSet, createMutableMap } from './mutableContainers'

export const filterDiffProcessor = (fn, rememberPresent = true) => {
  let currentFnInstances = createMutableMap()
  let presentKeys = createMutableSet()
  const diffProcessor = ({ remove, add, update }) => {
    return {
      remove: (value, key) => {
        currentFnInstances.delete(key)
        if(presentKeys.has(key)) {
          presentKeys.delete(key)
          remove(value, key)
        }
      },
      add: (value, key) => {
        const fnInstance = fn.specialize ? fn.specialize() : fn
        currentFnInstances.set(key, fnInstance)
        if(fnInstance(value, key)) {
          presentKeys.add(key)
          add(value, key)
        }
      },
      update: (prevNext, key) => {
        const {prev, next} = prevNext
        const fnInstance = currentFnInstances.get(key)
        const isIn = presentKeys.has(key)
        const shouldBeIn = fnInstance(next, key)
        if(!isIn && shouldBeIn) {
          presentKeys.add(key)
          add(next, key)
        } else if (isIn && !shouldBeIn) {
          presentKeys.delete(key)
          remove(prev, key)
        } else if (isIn && shouldBeIn && prev !== next) {
          update(prevNext, key)
        }
      }
    }
  }

  const specialize = () => {
    return filterDiffProcessor(fn, rememberPresent)
  }

  return {
    diffProcessor,
    specialize,
  }
}

export const filter = (fn) => {
  return wrapDiffProcessor(filterDiffProcessor(fn, false))
}
