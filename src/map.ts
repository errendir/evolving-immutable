import { Set, OrderedSet, Map, List, Record } from 'immutable'

import { wrapDiffProcessor } from './wrapDiffProcessor'

import { createMutableMap } from './mutableContainers'

export const mapDiffProcessor = (fn, { overSet=false } = {}) => {
  return overSet ? mapOverSetDiffProcessor(fn) : mapOverMapDiffProcessor(fn)
}

export const map = (fn, { overSet=false } = {}) => {
  return overSet ? mapOverSet(fn) : mapOverMap(fn)
}

export function mapOverMapDiffProcessor(fn) {
  const shouldSpecializeFn = !!fn.specialize
  let currentFnInstances
  if(shouldSpecializeFn) {
    currentFnInstances = createMutableMap()
  }
  const diffProcessor = ({ remove, add, update }) => {
    return {
      remove: (value, key) => {
        if(shouldSpecializeFn) {
          currentFnInstances.delete(key)
        }
        remove(value, key)
      },
      add: (value, key) => {
        let mapper
        if(shouldSpecializeFn) {
          mapper = fn.specialize()
          currentFnInstances.set(key, mapper)
        } else {
          mapper = fn
        }
        add(mapper(value, key), key)
      },
      update: ({prev, next}, key) => {
        let mapper
        if(shouldSpecializeFn) {
          mapper = currentFnInstances.get(key)
        } else {
          mapper = fn
        }
        update({ prev: mapper(prev, key), next: mapper(next, key) }, key)
      }
    }
  }
  const specialize = () => {
    return mapOverMapDiffProcessor(fn)
  }

  return { 
    diffProcessor,
    specialize,
  }
}

interface MapOverMapMapper<K, VA, VB> {
  (value: VA, key: K): VB,
  specialize?: () => MapOverMapMapper<K, VA, VB>
}
interface MapOverMapOperation<K, VA, VB> {
  (map: Map<K, VA>): Map<K, VB>,
  specialize: () => MapOverMapOperation<K, VA, VB>
}
export function mapOverMap<K, VA, VB>(fn: MapOverMapMapper<K, VA, VB>) : MapOverMapOperation<K, VA, VB> {
  return wrapDiffProcessor(mapOverMapDiffProcessor(fn))
}

// TODO: Make sure mapOverSet correctly handles duplicates in the dataset post-mapping
export function mapOverSetDiffProcessor(fn) { 
  let currentFnInstances = createMutableMap()
  const diffProcessor = ({ remove, add }) => {
    return {
      remove: (value) => {
        const mapper = currentFnInstances.get(value)
        currentFnInstances.delete(value)
        remove(mapper(value))
      },
      add: (value) => {
        const mapper = fn.specialize ? fn.specialize() : fn
        currentFnInstances.set(value, mapper)
        add(mapper(value))
      }
    }
  }
  const specialize = () => {
    return mapOverSetDiffProcessor(fn)
  }

  return {
    diffProcessor,
    specialize,
  }
}

export const mapOverSet = (fn) => {
  return wrapDiffProcessor(mapOverSetDiffProcessor(fn), { inSet: true, outSet: true })
}