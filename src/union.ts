import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { semiPureFunction } from './transformations'

export function safeUnionSet<E>() {
  return semiPureFunction({
    createMemory: () => ({
      union: unionSet<E>(),
      emptySet: Set<E>(),
    }),
    executeFunction: ({ union, emptySet }, leftSet: Set<E>, rightSet: Set<E>) => {
      return union(leftSet || emptySet, rightSet || emptySet)
    }
  })
}

interface UnionSetOperation<E> {
  (leftSet: Set<E>, rightSet: Set<E>): Set<E>,
  specialize: () => UnionSetOperation<E>
}
export function unionSet<E>() : UnionSetOperation<E> {
  let currentValue = Set<any>()
  let currentLeftArgument = Set<any>()
  let currentRightArgument = Set<any>()

  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument)
    const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument)

    let newValue = currentValue
    leftArgumentDiff.removed.forEach(leftValue => {
      if(!currentRightArgument.has(leftValue)) {
        newValue = newValue.remove(leftValue)
      }
    })
    leftArgumentDiff.added.forEach(leftValue => {
      if(!currentRightArgument.has(leftValue)) {
        newValue = newValue.add(leftValue)
      }
    })

    rightArgumentDiff.removed.forEach(rightValue => {
      if(!newLeftArgument.has(rightValue)) {
        newValue = newValue.remove(rightValue)
      }
    })
    rightArgumentDiff.added.forEach(rightValue => {
      if(!newLeftArgument.has(rightValue)) {
        newValue = newValue.add(rightValue)
      }
    })

    currentValue = newValue
    currentLeftArgument = newLeftArgument
    currentRightArgument = newRightArgument

    return newValue
  }
  const specialize = () => {
    return unionSet()
  }
  apply.specialize = specialize

  return apply
}

interface UnionMapOperation<K, V> {
  (leftMap: Map<K, V>, rightMap: Map<K, V>): Map<K, V>,
  specialize: () => UnionMapOperation<K, V>
}
export function unionMap<K, V>() : UnionMapOperation<K,V> {
  let currentValue = Map<any,any>()
  let currentLeftArgument = Map()
  let currentRightArgument = Map()

  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument)
    const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument)

    let newValue = currentValue
    leftArgumentDiff.removed.forEach((leftValue, key) => {
      const rightValue = currentRightArgument.get(key)
      if(rightValue === undefined) {
        newValue = newValue.remove(key)
      } else {
        newValue = newValue.set(key, rightValue)
      }
    })
    leftArgumentDiff.added.forEach((leftValue, key) => {
      const rightValue = currentRightArgument.get(key)
      if(rightValue === undefined) {
        newValue = newValue.set(key, leftValue)
      }
    })
    leftArgumentDiff.updated.forEach(({prev, next}, key) => {
      const rightValue = currentRightArgument.get(key)
      if(rightValue === undefined) {
        newValue = newValue.set(key, next)
      }
    })

    rightArgumentDiff.removed.forEach((rightValue, key) => {
      const leftValue = newLeftArgument.get(key)
      if(leftValue === undefined) {
        newValue = newValue.remove(key)
      } else {
        newValue = newValue.set(key, leftValue)
      }
    })
    rightArgumentDiff.added.forEach((rightValue, key) => {
      newValue = newValue.set(key, rightValue)
    })
    rightArgumentDiff.updated.forEach(({prev, next}, key) => {
      newValue = newValue.set(key, next)
    })

    currentValue = newValue
    currentLeftArgument = newLeftArgument
    currentRightArgument = newRightArgument

    return newValue
  }
  const specialize = () => {
    return unionMap()
  }
  apply.specialize = specialize

  return apply
}