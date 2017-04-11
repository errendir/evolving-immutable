import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

export const map = (fn, { overSet=false } = {}) => {
  return overSet ? mapOverSet(fn) : mapOverMap(fn)
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
  let currentFnInstances = Map<any, any>()
  let currentValue = Map()
  let currentArgument = Map()
  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)
    currentArgument = newArgument

    let newValue = currentValue
    argumentDiff.removed.forEach((value, key) => {
      currentFnInstances = currentFnInstances.remove(key)
      newValue = newValue.remove(key)
    })
    argumentDiff.added.forEach((value, key) => {
      const mapper = fn.specialize ? fn.specialize() : fn
      currentFnInstances = currentFnInstances.set(key, mapper)
      newValue = newValue.set(key, mapper(value, key))
    })
    argumentDiff.updated.forEach(({prev, next}, key) => {
      const mapper = currentFnInstances.get(key)
      newValue = newValue.set(key, mapper(next, key))
    })
    currentValue = newValue
    return newValue
  }
  const specialize = () => {
    return mapOverMap(fn)
  }
  apply.specialize = specialize

  return apply
}

export const mapOverSet = (fn) => {
  let currentFnInstances = Map<any, any>()
  let currentValue = Set()
  let currentArgument = Set()
  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)
    currentArgument = newArgument

    let newValue = currentValue
    argumentDiff.removed.forEach(value => {
      const mapper = currentFnInstances.get(value)
      currentFnInstances = currentFnInstances.remove(value)
      newValue = newValue.remove(mapper(value))
    })
    argumentDiff.added.forEach(value => {
      const mapper = fn.specialize ? fn.specialize() : fn
      currentFnInstances = currentFnInstances.set(value, mapper)
      newValue = newValue.add(mapper(value))
    })
    argumentDiff.updated && argumentDiff.updated.forEach(({prev, next}, key) => {
      const mapper = currentFnInstances.get(key)
      newValue = newValue.remove(mapper(prev)).add(mapper(next))
    })
    currentValue = newValue
    return newValue
  }
  const specialize = () => {
    return mapOverSet(fn)
  }
  apply.specialize = specialize

  return apply
}