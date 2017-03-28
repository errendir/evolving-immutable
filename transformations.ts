import { Set, Map, Iterable, List, Record } from 'immutable'

const emptySet = Set()

export const memoizeForRecentArguments = (executeFunction, { historyLength=1 }={}) => {
  return semiPureFunction({
    createMemory: () => ({
      recentArgumentsValues: [],
      executeFunction: executeFunction.specialize ? executeFunction.specialize() : executeFunction
    }),
    executeFunction: ({ recentArgumentsValues, executeFunction }, ...args) => {
      const pastArgumentsValue = recentArgumentsValues
        .find(({ arguments: recentArguments }) => {
          if(recentArguments.length !== args.length) return false
          for(let i=0; i<recentArguments.length; ++i) {
            if(recentArguments[i] !== args[i]) return false
          }
          return true
        })
      if(pastArgumentsValue !== undefined) {
        return pastArgumentsValue.value
      } else {
        const newValue = executeFunction(...args)
        while (recentArgumentsValues.length >= historyLength) {
          recentArgumentsValues.shift()
        }
        recentArgumentsValues.push({ arguments: args, value: newValue })
        return newValue
      }
    }
  })
}

export const semiPureFunction = ({ createMemory, executeFunction }) => {
  const pipeline = createMemory()

  const apply: any = (...args) => {
    return executeFunction(pipeline, ...args)
  }

  const specialize = () => {
    return semiPureFunction({ createMemory, executeFunction })
  }
  apply.specialize = specialize

  return apply
}

export const composeFunctions = (...functions) => {
  return semiPureFunction({
    createMemory: () => ({
      functionInstances: functions.map(fn => fn.specialize ? fn.specialize() : fn)
    }),
    executeFunction: ({ functionInstances }, argument) => {
      return functionInstances.reduce((result, functionInstance) => functionInstance(result), argument)
    }
  })
}

export const unionSet = () => {
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

export const unionMap = () => {
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

export const zip = (attach) => {
  if(attach === undefined) {
    attach = (leftElement, rightElement) => ({ leftElement, rightElement })
  }

  let currentValue = Map<any,any>()
  let currentLeftArgument = Map<any,any>()
  let currentRightArgument = Map<any,any>()
  let currentAttachInstances = Map<any, any>()

  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument)
    const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument)

    let newAttachInstances = currentAttachInstances
    let newValue = currentValue

    rightArgumentDiff.removed.forEach((rightValue, rightKey) => {
      const attachInstance = newAttachInstances.get(rightKey)
      newAttachInstances = newAttachInstances.remove(rightKey)
      const leftValue = currentLeftArgument.get(rightKey)
      if(leftValue !== undefined) {
        newValue = newValue.set(rightKey, attachInstance(leftValue, undefined))
      } else {
        newValue = newValue.remove(rightKey)
      }
    })
    rightArgumentDiff.added.forEach((rightValue, rightKey) => {
      const attachInstance = attach.specialize ? attach.specialize() : attach
      newAttachInstances = newAttachInstances.set(rightKey, attachInstance)
      const leftValue = currentLeftArgument.get(rightKey)
      newValue = newValue.set(rightKey, attachInstance(leftValue, rightValue))
    })
    rightArgumentDiff.updated.forEach(({ prev, next }, rightKey) => {
      const attachInstance = newAttachInstances.get(rightKey)
      const leftValue = currentLeftArgument.get(rightKey)
      newValue = newValue.set(rightKey, attachInstance(leftValue, next))
    })

    leftArgumentDiff.removed.forEach((leftValue, leftKey) => {
      const attachInstance = newAttachInstances.get(leftKey)
      newAttachInstances = newAttachInstances.remove(leftKey)
      const rightValue = newRightArgument.get(leftKey)
      if(rightValue !== undefined) {
        newValue = newValue.set(leftKey, attachInstance(undefined, rightValue))
      } else {
        newValue = newValue.remove(leftKey)
      }
    })
    leftArgumentDiff.added.forEach((leftValue, leftKey) => {
      const attachInstance = attach.specialize ? attach.specialize() : attach
      newAttachInstances = newAttachInstances.set(leftKey, attachInstance)
      const rightValue = newRightArgument.get(leftKey)
      newValue = newValue.set(leftKey, attachInstance(leftValue, rightValue))
    })
    leftArgumentDiff.updated.forEach(({ prev, next }, leftKey) => {
      const attachInstance = newAttachInstances.get(leftKey)
      const rightValue = newRightArgument.get(leftKey)
      newValue = newValue.set(leftKey, attachInstance(next, rightValue))
    })

    currentValue = newValue
    currentLeftArgument = newLeftArgument
    currentRightArgument = newRightArgument
    currentAttachInstances = newAttachInstances

    return newValue
  }

  const specialize = () => {
    return zip(attach)
  }
  apply.specialize = specialize

  return apply
}

export const leftJoin = (mapLeftToSetOfRightKeys, attachLeftWithMapOfRight) => {
  if(attachLeftWithMapOfRight === undefined) {
    attachLeftWithMapOfRight = (value, rightElements) => ({ value, group: rightElements })
  }

  let currentValue = Map<any,any>()
  let currentLeftArgument = Map()
  let currentRightArgument = Map()

  let currentFnInstances = Map<any, any>().asMutable()
  let currentAttachInstances = Map<any, any>().asMutable()
  let rightKeyToLeftKeys = Map<any, Set<any>>().asMutable()
  let leftKeyToMapOfRight = Map<any, Map<any, any>>().asMutable()

  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument)
    const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument)

    let newValue = currentValue

    rightArgumentDiff.removed.forEach((rightValue, rightKey) => {
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptySet
      rightKeyToLeftKeys = rightKeyToLeftKeys.remove(rightKey)
      allLeftKeys.forEach(leftKey => {
        leftKeyToMapOfRight.update(leftKey, rightElements => rightElements.remove(rightKey))
        const attachInstance = currentAttachInstances.get(leftKey)
        // Use the currentLeftArgument, since the leftElements are updated in the last three loops
        newValue = newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), leftKeyToMapOfRight.get(leftKey)))
      })
    })
    rightArgumentDiff.added.forEach((rightValue, rightKey) => {
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptySet
      allLeftKeys.forEach(leftKey => {
        leftKeyToMapOfRight.update(leftKey, rightElements => (rightElements || Map()).set(rightKey, rightValue))
        const attachInstance = currentAttachInstances.get(leftKey)
        newValue = newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), leftKeyToMapOfRight.get(leftKey)))
      })
    })
    rightArgumentDiff.updated.forEach(({ prev, next }, rightKey) => {
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptySet
      allLeftKeys.forEach(leftKey => {
        leftKeyToMapOfRight.update(leftKey, rightElements => rightElements.set(rightKey, next))
        const attachInstance = currentAttachInstances.get(leftKey)
        newValue = newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), leftKeyToMapOfRight.get(leftKey)))
      })
    })

    leftArgumentDiff.removed.forEach((value, leftKey) => {
      currentFnInstances.remove(leftKey)
      currentAttachInstances.remove(leftKey)
      leftKeyToMapOfRight.get(leftKey).forEach((rightValue, rightKey) => {
        rightKeyToLeftKeys.update(rightKey, leftKeys => leftKeys.remove(leftKey))
      })
      leftKeyToMapOfRight.remove(leftKey)
      newValue = newValue.remove(leftKey)
    })
    leftArgumentDiff.added.forEach((value, key) => {
      const fnInstance = mapLeftToSetOfRightKeys.specialize 
        ? mapLeftToSetOfRightKeys.specialize() 
        : mapLeftToSetOfRightKeys
      const attachInstance = attachLeftWithMapOfRight.specialize ? attachLeftWithMapOfRight.specialize() : attachLeftWithMapOfRight
      const rightKeys = fnInstance(value, key)
      // TODO: Diff-mem the following map! Also make sure undefined doesn't land there
      const mapOfRight = rightKeys.toMap().map(rightKey => newRightArgument.get(rightKey))
      rightKeys.forEach(rightKey => {
        rightKeyToLeftKeys = rightKeyToLeftKeys.update(rightKey, leftKeys => (leftKeys || Set()).add(key))
      })
      leftKeyToMapOfRight.set(key, mapOfRight)
      currentFnInstances.set(key, fnInstance)
      currentAttachInstances.set(key, attachInstance)
      newValue = newValue.set(key, attachInstance(value, mapOfRight))
    })
    leftArgumentDiff.updated.forEach(({prev, next}, leftKey) => {
      const fnInstance = currentFnInstances.get(leftKey)
      const attachInstance = currentAttachInstances.get(leftKey)
      const prevRightKeys = fnInstance(prev, leftKey)
      const nextRightKeys = fnInstance(next, leftKey)
      const rightKeysDiff = nextRightKeys.diffFrom(prevRightKeys)

      let newMapOfRight = leftKeyToMapOfRight.get(leftKey)
      rightKeysDiff.added.forEach(rightKey => {
        newMapOfRight = newMapOfRight.set(rightKey, newRightArgument.get(rightKey))
        rightKeyToLeftKeys.update(rightKey, leftKeys => (leftKeys || Set()).add(leftKey))
      })
      rightKeysDiff.removed.forEach(rightKey => {
        newMapOfRight = newMapOfRight.remove(rightKey)
        rightKeyToLeftKeys.update(rightKey, leftKeys => leftKeys.remove(leftKey))
      })
      leftKeyToMapOfRight.set(leftKey, newMapOfRight)
      newValue = newValue.set(leftKey, attachInstance(next, newMapOfRight))
    })

    currentValue = newValue
    currentLeftArgument = newLeftArgument
    currentRightArgument = newRightArgument

    return newValue
  }
  const specialize = () => {
    return leftJoin(mapLeftToSetOfRightKeys, attachLeftWithMapOfRight)
  }
  apply.specialize = specialize

  return apply
}

export const group = (fn) => {
  let currentFnInstances = Map<any, any>().asMutable()
  let currentValue = Map<any,any>().asMutable()
  let currentArgument = Map()

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

  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)
    currentArgument = newArgument

    argumentDiff.removed.forEach((value, key) => {
      const fnInstance = currentFnInstances.get(key)
      const groups = findGroups(fnInstance(value, key))
      currentFnInstances.remove(key)
      groups.forEach(group => {
        const prevSubCollection = currentValue.get(group)
        const nextSubCollection = prevSubCollection.remove(key)
        if(nextSubCollection.isEmpty()) {
          currentValue.remove(group)
        } else {
          currentValue.set(group, nextSubCollection)
        }
      })
    })
    argumentDiff.added.forEach((value, key) => {
      const fnInstance = fn.specialize ? fn.specialize() : fn
      const groups = findGroups(fnInstance(value, key))
      currentFnInstances.set(key, fnInstance)
      groups.forEach(group => {
        currentValue.update(group, (subCollection) => (subCollection || Map()).set(key,value))
      })
    })
    argumentDiff.updated.forEach(({prev, next}, key) => {
      const fnInstance = currentFnInstances.get(key)
      const prevGroups = findGroups(fnInstance(prev, key))
      // TODO: consider using diff to only update groups that changed
      prevGroups.forEach(prevGroup => {
        const prevSubCollection = currentValue.get(prevGroup)
        const nextSubCollection = prevSubCollection.remove(key)
        if(nextSubCollection.isEmpty()) {
          currentValue.remove(prevGroup)
        } else {
          currentValue.set(prevGroup, nextSubCollection)
        }
      })
      const nextGroups = findGroups(fnInstance(next, key))
      nextGroups.forEach(nextGroup => {
        currentValue
          .update(nextGroup, (subCollection) => (subCollection || Map()).set(key,next))
      })
    })
    const result = currentValue.asImmutable()
    currentValue = result.asMutable()
    return result
  }
  const specialize = () => {
    return group(fn)
  }
  apply.specialize = specialize

  return apply
}

export const map = (fn, { overSet=false } = {}) => {
  return overSet ? mapOverSet(fn) : mapOverMap(fn)
}

const mapOverMap = (fn) => {
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
      newValue = newValue.set(key, mapper(value))
    })
    argumentDiff.updated.forEach(({prev, next}, key) => {
      const mapper = currentFnInstances.get(key)
      newValue = newValue.set(key, mapper(next))
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

const mapOverSet = (fn) => {
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

export const filter = (fn) => {
  let currentFnInstances = Map<any, any>()
  let currentValue = Map()
  let currentArgument = Map()
  const apply : any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)
    currentArgument = newArgument

    let newValue = currentValue
    argumentDiff.removed.forEach((value, key) => {
      currentFnInstances = currentFnInstances.remove(key)
      if(newValue.get(key) !== undefined) {
        newValue = newValue.remove(key)
      }
    })
    argumentDiff.added.forEach((value, key) => {
      const fnInstance = fn.specialize ? fn.specialize() : fn
      currentFnInstances = currentFnInstances.set(key, fnInstance)
      if(fnInstance(value, key)) {
        newValue = newValue.set(key, value)
      }
    })
    argumentDiff.updated.forEach(({prev, next}, key) => {
      const fnInstance = currentFnInstances.get(key)
      const isIn = fnInstance(prev, key)
      const shouldBeIn = fnInstance(next, key)
      if(!isIn && shouldBeIn) {
        newValue = newValue.set(key, next)
      } else if (isIn && !shouldBeIn) {
        newValue = newValue.remove(key)
      } else if (isIn && shouldBeIn && prev !== next) {
        newValue = newValue.set(key, next)
      }
    })
    currentValue = newValue
    return newValue
  }
  const specialize = () => {
    return filter(fn)
  }
  apply.specialize = specialize

  return apply
}

export const toSet = () => {
  let currentValue = Set()
  let currentArgument = Map()

  let valueToKeys = Map<any,Set<any>>().asMutable()

  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)

    let newValue = currentValue
    const removeKeyValue = (value, key) => {
      valueToKeys.update(value, keys => keys.remove(key))
      if(valueToKeys.get(value).isEmpty()) {
        valueToKeys.remove(value)
        newValue = newValue.remove(value)
      }
    }
    const addKeyValue = (value, key) => {
      valueToKeys.update(value, keys => (keys || Set()).add(key))
      if(valueToKeys.get(value).size === 1) {
        newValue = newValue.add(value)
      }
    }

    argumentDiff.removed.forEach((value, key) => {
      removeKeyValue(value, key)
    })
    argumentDiff.added.forEach((value, key) => {
      addKeyValue(value, key)
    })
    argumentDiff.updated.forEach(({prev, next}, key) => {
      removeKeyValue(prev, key)
      addKeyValue(next, key)
    })

    currentArgument = newArgument
    currentValue = newValue
    return newValue
  }
  const specialize = () => {
    return toSet()
  }
  apply.specialize = specialize

  return apply
}

export const toMap = (keyFn) => {
  let currentValue = Map()
  let currentArgument = Set()
  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)
    currentArgument = newArgument

    let newValue = currentValue
    argumentDiff.removed.forEach(value => {
      const key = keyFn(value)
      newValue = newValue.remove(key)
    })
    argumentDiff.added.forEach(value => {
      const key = keyFn(value)
      newValue = newValue.set(key, value)
    })
    argumentDiff.updated && argumentDiff.updated.forEach(({prev, next}) => {
      const prevKey = keyFn(prev)
      const nextKey = keyFn(next)
      newValue = newValue.remove(prevKey).set(nextKey, next)
    })
    currentValue = newValue
    return newValue
  }
  const specialize = () => {
    return toMap(keyFn)
  }
  apply.specialize = specialize

  return apply
}

// TODO: test the performance of flattenSet
// it deletages to flattenMap, which on the provided data (sets indexed by themselves)
// will detect only addition and removals - nothing will be diffed
// We need to make sure the continuity of each set is preserved by identifying which
// Pairs of <removed set, added set> are easily diffable (share edit history)
export const flattenSet = () => {
  const convertEachToMap = map(toMap(element => element))
  const flattenCurrentMap = flattenMap()
  const convertFlatToSet = toSet()

  const apply: any = (argument) => {
    return convertFlatToSet(flattenCurrentMap(convertEachToMap(argument)))
  }

  const specialize = () => {
    return flattenSet()
  }
  apply.specialize = specialize

  return apply
}

// No consistency guaranteed when it comes to colliding keys
// You can get one sub map taking precedence one run and the other some other run
export const flattenMap = () => {
  let currentArgument = Map<any, any>()

  let currentValue = Map<any, any>()
  // TODO: consider using OrderedSet to force some sort of consistent priority
  let currentKeyToSourceKeys = Map<any, Set<any>>()

  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)

    let newValue = currentValue
    let newKeyToSourceKeys = currentKeyToSourceKeys

    const removeValueKeyFromSource = (value, key, sourceKey) => {
      newKeyToSourceKeys = newKeyToSourceKeys.update(key, sources => sources.remove(sourceKey))
      if(newKeyToSourceKeys.get(key).isEmpty()) {
        newKeyToSourceKeys = newKeyToSourceKeys.remove(key)
        newValue = newValue.remove(key)
      } else if(newValue.get(key) === value) {
        // TODO: More inconsistency (described below too) - even if value taken
        // for the key was `=== value` doesn't mean it was taken from this removed source
        const remainingSourceKey = newKeyToSourceKeys.get(key).last()
        const remainingValue = currentArgument.get(remainingSourceKey).get(key)
        newValue = newValue.set(key, remainingValue)
      }
    }

    const addValueKeyFromSource = (value, key, sourceKey) => {
      newKeyToSourceKeys = newKeyToSourceKeys.update(key, sources => (sources || Set()).add(sourceKey))
      newValue = newValue.set(key, value)
    }
  
    argumentDiff.removed.forEach((mapOrSet, sourceKey) => {
      mapOrSet.forEach((value, key) => {
        removeValueKeyFromSource(value, key, sourceKey)
      })
    })
    // Newely added map will take precedence over previously added ones
    argumentDiff.added.forEach((mapOrSet, sourceKey) => {
      mapOrSet.forEach((value, key) => {
        addValueKeyFromSource(value, key, sourceKey)
      })
    })
    // Modification of a map will take precedence over previously entries
    argumentDiff.updated.forEach(({prev, next}, sourceKey) => {
      const mapOrSetDiff = next.diffFrom(prev)
      mapOrSetDiff.removed.forEach((value, key) => {
        removeValueKeyFromSource(value, key, sourceKey)
      })
      mapOrSetDiff.added.forEach((value, key) => {
        addValueKeyFromSource(value, key, sourceKey)
      })
      mapOrSetDiff.updated && mapOrSetDiff.updated.forEach(({prev, next}, key) => {
        // TODO: Even if the chosen element was equal to prev doesn't mean it came from
        // the updated mapOrSet. This adds to the inconsistency of treating the colliding keys
        // Consider tracking origin of each value in the resulting map and the priority of sub maps
        if(newValue.get(key) === prev) {
          newValue = newValue.set(key, next)
        }
      })
    })

    currentValue = newValue
    currentKeyToSourceKeys = newKeyToSourceKeys

    return currentValue
  }
  const specialize = () => {
    return flattenMap()
  }
  apply.specialize = specialize

  return apply
}