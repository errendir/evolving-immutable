import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { wrapDiffProcessor } from './wrapDiffProcessor'

export const mapDiffProcessor = (fn, { overSet=false } = {}) => {
  return overSet ? mapOverSetDiffProcessor(fn) : mapOverMapDiffProcessor(fn)
}

export const map = (fn, { overSet=false } = {}) => {
  return overSet ? mapOverSet(fn) : mapOverMap(fn)
}

export function mapOverMapDiffProcessor(fn) { 
  let currentFnInstances = Map<any, any>().asMutable()
  const diffProcessor = ({ remove, add, update }) => {
    return {
      remove: (value, key) => {
        currentFnInstances.remove(key)
        remove(value, key)
      },
      add: (value, key) => {
        const mapper = fn.specialize ? fn.specialize() : fn
        currentFnInstances.set(key, mapper)
        add(mapper(value, key), key)
      },
      update: ({prev, next}, key) => {
        const mapper = currentFnInstances.get(key)
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

export function mapOverSetDiffProcessor(fn) { 
  let currentFnInstances = Map<any, any>().asMutable()
  const diffProcessor = ({ remove, add }) => {
    return {
      remove: (value) => {
        const mapper = currentFnInstances.get(value)
        currentFnInstances.remove(value)
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