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

const MapWithPartialUnion = Record({
  map: Map(),
  partialUnion: Map(),
})

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
    return unionSet()
  }
  apply.specialize = specialize

  return apply
}

export const flattenMap = () => {
  let currentArgument = Map()

  let currentMapsAndPartialUnions = List()
  let currentMapToIndex = Map<any, number>()

  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)

    let newMapsAndPartialUnions = currentMapsAndPartialUnions
    let newMapToIndex = currentMapToIndex
    argumentDiff.removed.forEach((map, key) => {
      const index = newMapToIndex.get(map)
      if(index === undefined) throw new Error('One of the maps was not seen before')
      newMapsAndPartialUnions = newMapsAndPartialUnions.splice(index, 1).toList()
      newMapToIndex = newMapToIndex.remove(map)
      // Rebuild the partial union
      // let currentIndex = index + 1
      // while(newMapsAndPartialUnions.get(currentIndex) !== undefined) {

      // }
      // newMapsAndPartialUnions.
    })
    // argumentDiff.added.forEach((leftValue, key) => {
    //   const rightValue = currentArgument.get(key)
    //   if(rightValue === undefined) {
    //     newValue = newValue.set(key, leftValue)
    //   }
    // })
    // argumentDiff.updated.forEach(({prev, next}, key) => {
    //   const rightValue = currentArgument.get(key)
    //   if(rightValue === undefined) {
    //     newValue = newValue.set(key, next)
    //   }
    // })

    // currentMapsInOrder = newMapsInOrder
    // currentCumulativeMapsInOrder = newCumulativeMapsInOrder

    return currentMapsAndPartialUnions.last()
  }
  const specialize = () => {
    return flattenMap()
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

export const map = (fn) => {
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
    return map(fn)
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
    argumentDiff.updated.forEach(({prev, next}) => {
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