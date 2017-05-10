import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { wrapDiffProcessor } from './wrapDiffProcessor'

import { createMutableMap, createMutableSet } from './mutableContainers'

export const toSetDiffProcessor = ({ assumeUniqueKeys=false } = {}) => {
  let valueToKeys
  if(!assumeUniqueKeys) {
    valueToKeys = createMutableMap()
  }

  const diffProcessor = ({ remove, add, update }) => {
    const removeKeyValue = (value, key) => {
      if(!assumeUniqueKeys) {
        const keys = valueToKeys.get(value)
        const isSet = Set.prototype.isPrototypeOf(keys)
        if(isSet) {
          keys.delete(key)
        }
        if(!isSet || keys.size === 0) {
          valueToKeys.delete(value)
          remove(value)
        }
      } else {
        remove(value)
      }
    }
    const addKeyValue = (value, key) => {
      if(!assumeUniqueKeys) {
        const keys = valueToKeys.get(value)
        if(keys === undefined) {
          valueToKeys.set(value, key)
          add(value)
        } else {
          if(Set.prototype.isPrototypeOf(keys)) {
            keys.add(key)
          } else {
            valueToKeys.set(value, createMutableSet().add(keys).add(key))
          }
        }
      } else {
        //console.log('adding - set')
        add(value, key)
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
    return toSetDiffProcessor({ assumeUniqueKeys })
  }

  return {
    diffProcessor,
    specialize,
  }
}

export const toSet = ({ assumeUniqueKeys=false } = {}) => {
  return wrapDiffProcessor(toSetDiffProcessor({ assumeUniqueKeys }), { inSet: false, outSet: true })
}

export const toMapDiffProcessor = (keyFn) => {
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

export const reindexMapDiffProcessor = (keyFn) => {
  let currentValue = Map()
  const diffProcessor = ({ remove, add, update }) => ({
    remove: (value, key) => {
      const newKey = keyFn(value, key)
      remove(value, newKey)
    },
    add: (value, key) => {
      const newKey = keyFn(value, key)
      add(value, newKey)
    },
    update: (prevNext, key) => {
      const { prev, next } = prevNext
      const prevNewKey = keyFn(prev, key)
      const nextNewKey = keyFn(prev, key)
      if(prevNewKey === nextNewKey) {
        update(prevNext, nextNewKey)
      } else {
        remove(prev, prevNewKey)
        add(next, nextNewKey)
      }
    },
  })

  const specialize = () => {
    return reindexMapDiffProcessor(keyFn)
  }

  return {
    diffProcessor,
    specialize,
  }
}

export const reindexMap = (keyFn) => {
  return wrapDiffProcessor(reindexMapDiffProcessor(keyFn), { inSet: false, outSet: false })
}