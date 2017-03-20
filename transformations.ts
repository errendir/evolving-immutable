import { Set, Map, Iterable, List, Record } from 'immutable'

const emptySet = Set()

export const pipelinePiece = ({ createPipeline, executePipeline }) => {
  const pipeline = createPipeline()

  const apply: any = (...args) => {
    return executePipeline(pipeline, ...args)
  }

  const specialize = () => {
    return pipelinePiece({ createPipeline, executePipeline })
  }
  apply.specialize = specialize

  return apply
}

// TODO: Optimize this (don't use unionMap - write one generic union)
export const unionSet = () => {
  const convertLeftToMap = toMap(element => element)
  const convertRightToMap = toMap(element => element)
  const leftRightUnionMap = unionMap()
  const convertUnionToSet = toSet()

  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftMap = convertLeftToMap(newLeftArgument)
    const rightMap = convertRightToMap(newRightArgument)
    return convertUnionToSet(leftRightUnionMap(leftMap, rightMap))
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

    return newValue
  }

  const specialize = () => {
    return zip(attach)
  }
  apply.specialize = specialize

  return apply
}

export const leftJoin = (fn, attach) => {
  if(attach === undefined) {
    attach = (value, rightElements) => ({ value, group: rightElements })
  }

  let currentFnInstances = Map<any, any>()
  let currentAttachInstances = Map<any, any>()
  let currentValue = Map<any,any>()
  let rightToLeft = Map<any, Set<any>>()
  let leftToRight = Map<any, Set<any>>()
  let currentLeftArgument = Map()
  let currentRightArgument = Map()
  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument)
    const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument)

    let newValue = currentValue

    rightArgumentDiff.removed.forEach((rightValue, rightKey) => {
      const allLeftKeys = rightToLeft.get(rightKey) || emptySet
      rightToLeft = rightToLeft.remove(rightKey)
      allLeftKeys.forEach(leftKey => {
        leftToRight = leftToRight.update(leftKey, rightElements => rightElements.remove(rightValue))
        const attachInstance = currentAttachInstances.get(leftKey)
        // Use the currentLeftArgument, since the leftElements are updated in the last three loops
        newValue = newValue.update(leftKey, attachInstance(currentLeftArgument.get(leftKey), leftToRight.get(leftKey)))
      })
    })
    rightArgumentDiff.added.forEach((rightValue, rightKey) => {
      const allLeftKeys = rightToLeft.get(rightKey) || emptySet
      allLeftKeys.forEach(leftKey => {
        leftToRight = leftToRight.update(leftKey, rightElements => (rightElements || Set()).add(rightValue))
        const attachInstance = currentAttachInstances.get(leftKey)
        newValue = newValue.update(leftKey, attachInstance(currentLeftArgument.get(leftKey), leftToRight.get(leftKey)))
      })
    })
    rightArgumentDiff.updated.forEach(({ prev, next }, rightKey) => {
      const allLeftKeys = rightToLeft.get(rightKey) || emptySet
      allLeftKeys.forEach(leftKey => {
        leftToRight = leftToRight.update(leftKey, rightElements => rightElements.remove(prev).add(next))
        const attachInstance = currentAttachInstances.get(leftKey)
        newValue = newValue.update(leftKey, attachInstance(currentLeftArgument.get(leftKey), leftToRight.get(leftKey)))
      })
    })

    leftArgumentDiff.removed.forEach((value, key) => {
      const fnInstance = currentFnInstances.get(key)
      const attachInstance = currentAttachInstances.get(key)
      currentFnInstances = currentFnInstances.remove(key)
      currentAttachInstances = currentAttachInstances.remove(key)
      // TODO: Remove it from the rightToLeft
      // const rightKeys = fnInstance(value, key)
      // rightKeys.forEach(rightKey => {
      //   rightToLeft = rightToLeft.update(rightKey, leftKeys => leftKeys.remove(key))
      // })
      leftToRight = leftToRight.remove(key)
      newValue = newValue.remove(key)
    })
    leftArgumentDiff.added.forEach((value, key) => {
      const fnInstance = fn.specialize ? fn.specialize() : fn
      const attachInstance = attach.specialize ? attach.specialize() : attach
      const rightKeys = fnInstance(value, key)
      // TODO: Diff-mem the following map! Also make sure undefined doesn't land there
      const rightElements = rightKeys.map(rightKey => newRightArgument.get(rightKey))
      rightKeys.forEach(rightKey => {
        rightToLeft = rightToLeft.update(rightKey, leftKeys => (leftKeys || Set()).add(key))
      })
      leftToRight = leftToRight.set(key, rightElements)
      currentFnInstances = currentFnInstances.set(key, fnInstance)
      currentAttachInstances = currentAttachInstances.set(key, attachInstance)
      newValue = newValue.set(key, attachInstance(value, rightElements))
    })
    leftArgumentDiff.updated.forEach(({prev, next}, key) => {
      const fnInstance = currentFnInstances.get(key)
      const attachInstance = currentAttachInstances.get(key)
      const prevRightKeys = fnInstance(prev, key)
      const nextRightKeys = fnInstance(next, key)
      const rightKeysDiff = nextRightKeys.diffFrom(prevRightKeys)
      rightKeysDiff.added.forEach(rightKey => {
        rightToLeft = rightToLeft.update(rightKey, leftKeys => (leftKeys || Set()).add(key))
      })
      rightKeysDiff.removed.forEach(rightKey => {
        rightToLeft = rightToLeft.update(rightKey, leftKeys => leftKeys.remove(key))
      })
      leftToRight.update(key, rightElements => {
        let newRightElements = rightElements
          .merge(rightKeysDiff.added.map(rightKey => newRightArgument.get(rightKey)))
        rightKeysDiff.removed.map(rightKey => {
          newRightElements = newRightElements.remove(rightKey)
        })
        return newRightElements
      })
      newValue = newValue.update(key, attachInstance(next, leftToRight.get(key)))
    })

    currentValue = newValue
    currentLeftArgument = newLeftArgument
    currentRightArgument = newRightArgument

    return newValue
  }
  const specialize = () => {
    return leftJoin(fn, attach)
  }
  apply.specialize = specialize

  return apply
}

export const group = (fn) => {
  let currentFnInstances = Map<any, any>()
  let currentValue = Map<any,any>()
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

    let newValue = currentValue
    argumentDiff.removed.forEach((value, key) => {
      const fnInstance = currentFnInstances.get(key)
      const groups = findGroups(fnInstance(value, key))
      currentFnInstances = currentFnInstances.remove(key)
      groups.forEach(group => {
        newValue = newValue.update(group, (subCollection) => subCollection.remove(key))
      })
    })
    argumentDiff.added.forEach((value, key) => {
      const fnInstance = fn.specialize ? fn.specialize() : fn
      const groups = findGroups(fnInstance(value, key))
      currentFnInstances = currentFnInstances.set(key, fnInstance)
      groups.forEach(group => {
        newValue = newValue.update(group, (subCollection) => (subCollection || Map()).set(key,value))
      })
    })
    argumentDiff.updated.forEach(({prev, next}, key) => {
      const fnInstance = currentFnInstances.get(key)
      const prevGroups = findGroups(fnInstance(prev, key))
      const nextGroups = findGroups(fnInstance(next, key))
      // TODO: consider using diff to optimize this operation
      prevGroups.forEach(prevGroup => {
        newValue = newValue
          .update(prevGroup, (subCollection) => subCollection.remove(key))
      })
      nextGroups.forEach(nextGroup => {
        newValue = newValue
          .update(nextGroup, (subCollection) => (subCollection || Map()).set(key,next))
      })
    })
    currentValue = newValue
    return newValue
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
  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)
    currentArgument = newArgument

    let newValue = currentValue
    argumentDiff.removed.forEach((value, key) => {
      newValue = newValue.remove(value)
    })
    argumentDiff.added.forEach((value, key) => {
      newValue = newValue.add(value)
    })
    argumentDiff.updated.forEach(({prev, next}, key) => {
      newValue = newValue.remove(prev).add(next)
    })
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
      newValue = newValue.remove(value)
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