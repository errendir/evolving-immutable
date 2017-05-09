import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { createMutableMap, createMutableSet } from './mutableContainers'

const emptySet = Set()
const emptyIterable = []

export const leftJoinDiffProcessor = () => {
  let currentMapLeftToRightKeysInstances = Map<any, any>().asMutable()
  let currentAttachInstances = Map<any, any>().asMutable()
  let rightKeyToLeftKeys = Map<any, Set<any>>().asMutable()
  let leftKeyToMapOfRight = Map<any, Map<any, any>>().asMutable()

  const diffProcessor = ({ remove, add, update }) => ([
    {

    },
    {

    }
  ])

  const specialize = () => {
    return leftJoinDiffProcessor()
  }

  return {
    diffProcessor,
    specialize,
  }
}

interface LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR> {
  (leftValue: VL, leftKey?: KL): Set<KR>,
  specialize?: () => LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR>
}
interface LeftJoinAttachLeftWithMapOfRight<VL, KR, VR, VO> {
  (leftValue: VL, mapOfRightValues: any/*Map<KR, VR>*/): VO,
  specialize?: () => LeftJoinAttachLeftWithMapOfRight<VL, KR, VR, VO>
}
interface LeftJoinOperation<KL, VL, KR, VR, VO> {
  (leftMap: Map<KL, VL>, rightMap: Map<KR, VR>) : Map<KL, VO>,
  specialize: () => LeftJoinOperation<KL, VL, KR, VR, VO>
}
export function leftJoin<KL, VL, KR, VR, VO> (
  mapLeftToSetOfRightKeys: LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR>,
  attachLeftWithMapOfRight: LeftJoinAttachLeftWithMapOfRight<VL, KR, VR, VO>
): LeftJoinOperation<KL, VL, KR, VR, VO> {
  let currentValue = Map<any,any>().asMutable()
  let currentLeftArgument = Map()
  let currentRightArgument = Map()

  let currentMapLeftToRightKeysInstances = createMutableMap()
  let currentAttachInstances = createMutableMap()
  let rightKeyToLeftKeys = createMutableMap()
  let leftKeyToMapOfRight = createMutableMap()

  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument)
    const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument)

    let newValue = currentValue

    rightArgumentDiff.removed.forEach((rightValue, rightKey) => {
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
      rightKeyToLeftKeys.delete(rightKey)
      allLeftKeys.forEach(leftKey => {
        const mapOfRight = leftKeyToMapOfRight.get(leftKey)
        mapOfRight.delete(rightKey)
        const attachInstance = currentAttachInstances.get(leftKey)
        // Use the currentLeftArgument, since the leftElements are updated in the last three loops
        newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), leftKeyToMapOfRight.get(leftKey)))
      })
    })
    rightArgumentDiff.added.forEach((rightValue, rightKey) => {
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
      allLeftKeys.forEach(leftKey => {
        const mapOfRight = leftKeyToMapOfRight.get(leftKey)
        if(!mapOfRight) {
          leftKeyToMapOfRight.set(leftKey, createMutableMap().set(rightKey, rightValue))
        } else {
          mapOfRight.set(rightKey, rightValue)
        }
        const attachInstance = currentAttachInstances.get(leftKey)
        newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), leftKeyToMapOfRight.get(leftKey)))
      })
    })
    rightArgumentDiff.updated.forEach(({ prev, next }, rightKey) => {
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
      allLeftKeys.forEach(leftKey => {
        const mapOfRight = leftKeyToMapOfRight.get(leftKey)
        mapOfRight.set(rightKey, next)
        const attachInstance = currentAttachInstances.get(leftKey)
        newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), leftKeyToMapOfRight.get(leftKey)))
      })
    })

    leftArgumentDiff.removed.forEach((value, leftKey) => {
      currentMapLeftToRightKeysInstances.delete(leftKey)
      currentAttachInstances.delete(leftKey)
      leftKeyToMapOfRight.get(leftKey).forEach((rightValue, rightKey) => {
        const leftKeys = rightKeyToLeftKeys.get(rightKey)
        leftKeys.delete(leftKey)
      })
      leftKeyToMapOfRight.delete(leftKey)
      newValue.remove(leftKey)
    })
    leftArgumentDiff.added.forEach((value, key) => {
      const mapLeftToSetOfRightKeysInstance = mapLeftToSetOfRightKeys.specialize
        ? mapLeftToSetOfRightKeys.specialize() 
        : mapLeftToSetOfRightKeys
      const attachInstance = attachLeftWithMapOfRight.specialize ? attachLeftWithMapOfRight.specialize() : attachLeftWithMapOfRight
      const rightKeys = mapLeftToSetOfRightKeysInstance(value, key)
      // TODO: Optionally diff-mem the following map! Also make sure undefined doesn't land there
      const mapOfRight = createMutableMap()
      rightKeys.forEach(rightKey => {
        const leftKeys = rightKeyToLeftKeys.get(rightKey)
        if(!leftKeys) {
          rightKeyToLeftKeys.set(rightKey, createMutableSet().add(key))
        } else {
          leftKeys.add(key)
        }
        mapOfRight.set(rightKey, newRightArgument.get(rightKey))
      })
      leftKeyToMapOfRight.set(key, mapOfRight)
      currentMapLeftToRightKeysInstances.set(key, mapLeftToSetOfRightKeysInstance)
      currentAttachInstances.set(key, attachInstance)
      newValue.set(key, attachInstance(value, mapOfRight))
    })
    leftArgumentDiff.updated.forEach(({prev, next}, leftKey) => {
      const mapLeftToSetOfRightKeysInstance = currentMapLeftToRightKeysInstances.get(leftKey)
      const attachInstance = currentAttachInstances.get(leftKey)
      const prevRightKeys = mapLeftToSetOfRightKeysInstance(prev, leftKey)
      const nextRightKeys = mapLeftToSetOfRightKeysInstance(next, leftKey)

      let mapOfRight = leftKeyToMapOfRight.get(leftKey)
      const rightKeysDiff = nextRightKeys.diffFromCallbacks(prevRightKeys, {
        add: rightKey => {
          mapOfRight.set(rightKey, newRightArgument.get(rightKey))
          const leftKeys = rightKeyToLeftKeys.get(rightKey)
          if(!leftKeys) {
            rightKeyToLeftKeys.set(rightKey, createMutableSet().add(leftKey))
          } else {
            leftKeys.add(leftKey)
          }
        },
        remove: rightKey => {
          mapOfRight.remove(rightKey)
          rightKeyToLeftKeys.get(rightKey).remove(leftKey)
        },
      })

      newValue.set(leftKey, attachInstance(next, mapOfRight))
    })

    const finalValue = newValue.asImmutable()
    currentValue = finalValue.asMutable()
    currentLeftArgument = newLeftArgument
    currentRightArgument = newRightArgument

    return finalValue
  }
  const specialize = () => {
    return leftJoin(mapLeftToSetOfRightKeys, attachLeftWithMapOfRight)
  }
  apply.specialize = specialize

  return apply
}