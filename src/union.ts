import { Set, Map } from 'immutable'

import { semiPureFunction } from './functions'

import { wrapDualDiffProcessor } from './wrapDiffProcessor'

import { createMutableMap } from './mutableContainers'

export function safeUnionMap<K,V>() {
  return semiPureFunction({
    createMemory: () => ({
      union: unionMap<K,V>(),
      emptyMap: Map<K,V>(),
    }),
    executeFunction: ({ union, emptyMap }, leftMap: Map<K,V>, rightMap: Map<K,V>) => {
      return union(leftMap || emptyMap, rightMap || emptyMap)
    }
  })
}

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

export const unionMapDiffProcessor = () => {
  let presentLeft = createMutableMap()
  let presentRight = createMutableMap()

  const diffProcessor = ({ remove, add, update }) => ([
    {
      remove: (leftValue, key) => {
        presentLeft.delete(key)
        const rightValue = presentRight.get(key)
        if(rightValue === undefined) {
          remove(leftValue, key)
        }
      },
      add: (leftValue, key) => {
        presentLeft.set(key, leftValue)
        const rightValue = presentRight.get(key)
        if(rightValue === undefined) {
          add(leftValue, key)
        }
      },
      update: (prevNext, key) => {
        presentLeft.set(key, prevNext.next)
        const rightValue = presentRight.get(key)
        if(rightValue === undefined) {
          update(prevNext, key)
        }
      },
    },
    {
      remove: (rightValue, key) => {
        presentRight.delete(key)
        const leftValue = presentLeft.get(key)
        if(leftValue === undefined) {
          remove(rightValue, key)
        } else {
          update({ prev: rightValue, next: leftValue }, key)
        }
      },
      add: (rightValue, key) => {
        presentRight.set(key, rightValue)
        const leftValue = presentLeft.get(key)
        if(leftValue === undefined) {
          add(rightValue, key)
        } else {
          update({ prev: leftValue, next: rightValue }, key)
        }
      },
      update: (prevNext, key) => {
        presentRight.set(key, prevNext.next)
        update(prevNext, key)
      },
    }
  ])

  const specialize = () => {
    return unionMapDiffProcessor()
  }

  return {
    diffProcessor,
    specialize,
  }
}

interface UnionMapOperation<K, V> {
  (leftMap: Map<K, V>, rightMap: Map<K, V>): Map<K, V>,
  specialize: () => UnionMapOperation<K, V>
}
export function unionMap<K, V>() : UnionMapOperation<K,V> {
  return wrapDualDiffProcessor(unionMapDiffProcessor())
}