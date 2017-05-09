import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { wrapDiffProcessor } from './wrapDiffProcessor'

import { createMutableMap, createMutableSet } from './mutableContainers'

export const toSetDiffProcessor = () => {
  let valueToKeys = createMutableMap()

  const diffProcessor = ({ remove, add, update }) => {
    const removeKeyValue = (value, key) => {
      const keys = valueToKeys.get(value)
      keys.delete(key)
      if(keys.size === 0) {
        valueToKeys.delete(value)
        remove(value)
      }
    }
    const addKeyValue = (value, key) => {
      const keys = valueToKeys.get(value)
      if(!keys) {
        valueToKeys.set(value, createMutableSet().add(key))
        add(value)
      } else {
        keys.add(key)
      }
    }
    return {
      remove: (value, key) => {
        removeKeyValue(value, key)
      },
      add: (value, key) => {
        addKeyValue(value, key)
      },
      update: ({prev, next}, key) => {
        removeKeyValue(prev, key)
        addKeyValue(next, key)
      },
    }
  }

  const specialize = () => {
    return toSetDiffProcessor()
  }

  return {
    diffProcessor,
    specialize,
  }
}

export const toSet = () => {
  return wrapDiffProcessor(toSetDiffProcessor(), { inSet: false, outSet: true })
}

export const toMapDiffProcessor = (keyFn) => {
  let currentValue = Map()
  const diffProcessor = ({ remove, add, update }) => ({
    remove: value => {
      const key = keyFn(value)
      remove(value, key)
    },
    add: value => {
      const key = keyFn(value)
      add(value, key)
    },
  })

  const specialize = () => {
    return toMapDiffProcessor(keyFn)
  }

  return {
    diffProcessor,
    specialize,
  }
}

export const toMap = (keyFn) => {
  return wrapDiffProcessor(toMapDiffProcessor(keyFn), { inSet: true, outSet: false })
}