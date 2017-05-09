import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { wrapDiffProcessor } from './wrapDiffProcessor'

export const toSetDiffProcessor = () => {
  let valueToKeys = Map<any,Set<any>>().asMutable()

  const removeKeyValue = (remove) => (value, key) => {
    valueToKeys.update(value, keys => keys.remove(key))
    if(valueToKeys.get(value).isEmpty()) {
      valueToKeys.remove(value)
      remove(value)
    }
  }
  const addKeyValue = (add) => (value, key) => {
    valueToKeys.update(value, keys => (keys || Set()).add(key))
    if(valueToKeys.get(value).size === 1) {
      add(value)
    }
  }

  const diffProcessor = ({ remove, add, update }) => ({
    remove: (value, key) => {
      removeKeyValue(remove)(value, key)
    },
    add: (value, key) => {
      addKeyValue(add)(value, key)
    },
    update: ({prev, next}, key) => {
      removeKeyValue(remove)(prev, key)
      addKeyValue(add)(next, key)
    },
  })

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
  let currentArgument = Set()
  const diffProcessor = ({ remove, add, update }) => ({
    remove: value => {
      const key = keyFn(value)
      remove(value, key)
    },
    add: value => {
      const key = keyFn(value)
      add(value, key)
    },
    update: ({prev, next}) => {
      const prevKey = keyFn(prev)
      const nextKey = keyFn(next)
      remove(prev, prevKey)
      add(next, nextKey)
    }
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