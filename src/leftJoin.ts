import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { createMutableMap, createMutableSet } from './mutableContainers'

const emptySet = Set()
const emptyIterable = []

export const leftJoinDiffProcessor = () => {
  let currentMapLeftToRightKeysInstances = createMutableMap()
  let currentAttachInstances = createMutableMap()
  let rightKeyToLeftKeys = createMutableMap()
  let leftKeyToMapOfRight = createMutableMap()

  let rightValueByKey = createMutableMap()
  let leftValueByKey = createMutableMap()

  const diffProcessor = ({ remove, add, update }) => ([
    {

    },
    {
      remove: (rightValue, rightKey) => {
        rightValueByKey.delete(rightKey)
        const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
        rightKeyToLeftKeys.delete(rightKey)
        allLeftKeys.forEach(leftKey => {
          const mapOfRight = leftKeyToMapOfRight.get(leftKey)
          mapOfRight.delete(rightKey)
          const attachInstance = currentAttachInstances.get(leftKey)
          update({
            next: attachInstance(leftValueByKey.get(leftKey), mapOfRight, leftKey)
          }, leftKey)
        })
      },
      add: (rightValue, rightKey) => {
        rightValueByKey.set(rightKey, rightValue)
        const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
        allLeftKeys.forEach(leftKey => {
          let mapOfRight = leftKeyToMapOfRight.get(leftKey)
          if(!mapOfRight) {
            mapOfRight = createMutableMap()
            leftKeyToMapOfRight.set(leftKey, mapOfRight)
          }
          mapOfRight.set(rightKey, rightValue)
          const attachInstance = currentAttachInstances.get(leftKey)
          update({
            next: attachInstance(leftValueByKey.get(leftKey), mapOfRight, leftKey)
          }, leftKey)
        })
      },
      update: ({ prev, next }, rightKey) => {
        rightValueByKey.set(rightKey, next)
        const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
        allLeftKeys.forEach(leftKey => {
          const mapOfRight = leftKeyToMapOfRight.get(leftKey)
          mapOfRight.set(rightKey, next)
          const attachInstance = currentAttachInstances.get(leftKey)
          update({
            next: attachInstance(leftValueByKey.get(leftKey), mapOfRight, leftKey)
          }, leftKey)
        })
      }
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
interface LeftJoinAttachLeftWithMapOfRight<KL, VL, KR, VR, VO> {
  (leftValue: VL, mapOfRightValues: any/*Map<KR, VR>*/, leftKey: KL): VO,
  specialize?: () => LeftJoinAttachLeftWithMapOfRight<KL, VL, KR, VR, VO>
}
interface LeftJoinOperation<KL, VL, KR, VR, VO> {
  (leftMap: Map<KL, VL>, rightMap: Map<KR, VR>) : Map<KL, VO>,
  specialize: () => LeftJoinOperation<KL, VL, KR, VR, VO>
}
export function leftJoin<KL, VL, KR, VR, VO> (
  mapLeftToSetOfRightKeys: LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR>,
  attachLeftWithMapOfRight: LeftJoinAttachLeftWithMapOfRight<KL, VL, KR, VR, VO>
): LeftJoinOperation<KL, VL, KR, VR, VO> {
  let currentValue = Map<any,any>().asMutable()
  let currentLeftArgument = Map()
  let currentRightArgument = Map()

  const shouldSpecializeMapLeft = !!mapLeftToSetOfRightKeys.specialize
  const shouldSpecializeAttach = !!attachLeftWithMapOfRight.specialize

  const currentMapLeftToRightKeysInstances = shouldSpecializeMapLeft ? createMutableMap() : null
  const currentAttachInstances = shouldSpecializeAttach ? createMutableMap() : null

  let rightKeyToLeftKeys = createMutableMap()
  let leftKeyToMapOfRight = createMutableMap()

  let rightValueByKey = createMutableMap()

  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument)
    const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument)

    let newValue = currentValue

    rightArgumentDiff.removed.forEach((rightValue, rightKey) => {
      rightValueByKey.delete(rightKey)
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
      rightKeyToLeftKeys.delete(rightKey)
      allLeftKeys.forEach(leftKey => {
        const mapOfRight = leftKeyToMapOfRight.get(leftKey)
        mapOfRight.delete(rightKey)
        const attachInstance = shouldSpecializeAttach
          ? currentAttachInstances.get(leftKey)
          : attachLeftWithMapOfRight
        // Use the currentLeftArgument, since the leftElements are updated in the last three loops
        newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), mapOfRight, leftKey))
      })
    })
    rightArgumentDiff.added.forEach((rightValue, rightKey) => {
      rightValueByKey.set(rightKey, rightValue)
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
      allLeftKeys.forEach(leftKey => {
        let mapOfRight = leftKeyToMapOfRight.get(leftKey)
        if(!mapOfRight) {
          mapOfRight = createMutableMap()
          leftKeyToMapOfRight.set(leftKey, mapOfRight)
        }
        mapOfRight.set(rightKey, rightValue)

        const attachInstance = shouldSpecializeAttach
          ? currentAttachInstances.get(leftKey)
          : attachLeftWithMapOfRight
        newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), mapOfRight, leftKey))
      })
    })
    rightArgumentDiff.updated.forEach(({ prev, next }, rightKey) => {
      //console.log('update', { prev, next }, rightKey, next.diffFrom && next.diffFrom(prev))
      rightValueByKey.set(rightKey, next)
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
      allLeftKeys.forEach(leftKey => {
        const mapOfRight = leftKeyToMapOfRight.get(leftKey)
        mapOfRight.set(rightKey, next)
        const attachInstance = shouldSpecializeAttach
          ? currentAttachInstances.get(leftKey)
          : attachLeftWithMapOfRight
        //console.log('attaching', currentLeftArgument.get(leftKey), 'with', Array.from(mapOfRight))
        newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), mapOfRight, leftKey))
      })
    })

    leftArgumentDiff.removed.forEach((value, leftKey) => {
      shouldSpecializeMapLeft && currentMapLeftToRightKeysInstances.delete(leftKey)
      shouldSpecializeAttach && currentAttachInstances.delete(leftKey)
      leftKeyToMapOfRight.get(leftKey).forEach((rightValue, rightKey) => {
        const leftKeys = rightKeyToLeftKeys.get(rightKey)
        leftKeys.delete(leftKey)
      })
      leftKeyToMapOfRight.delete(leftKey)
      newValue.remove(leftKey)
    })
    leftArgumentDiff.added.forEach((value, key) => {
      const mapLeftToSetOfRightKeysInstance = shouldSpecializeMapLeft
        ? mapLeftToSetOfRightKeys.specialize() 
        : mapLeftToSetOfRightKeys
      const attachInstance = shouldSpecializeAttach 
        ? attachLeftWithMapOfRight.specialize() 
        : attachLeftWithMapOfRight
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
        mapOfRight.set(rightKey, rightValueByKey.get(rightKey))
      })
      leftKeyToMapOfRight.set(key, mapOfRight)
      shouldSpecializeMapLeft && currentMapLeftToRightKeysInstances.set(key, mapLeftToSetOfRightKeysInstance)
      shouldSpecializeAttach && currentAttachInstances.set(key, attachInstance)
      newValue.set(key, attachInstance(value, mapOfRight, key))
    })
    leftArgumentDiff.updated.forEach(({prev, next}, leftKey) => {
      const mapLeftToSetOfRightKeysInstance = shouldSpecializeMapLeft 
        ? currentMapLeftToRightKeysInstances.get(leftKey)
        : mapLeftToSetOfRightKeys
      const attachInstance = shouldSpecializeAttach
        ? currentAttachInstances.get(leftKey)
        : attachLeftWithMapOfRight
      const prevRightKeys = mapLeftToSetOfRightKeysInstance(prev, leftKey)
      const nextRightKeys = mapLeftToSetOfRightKeysInstance(next, leftKey)

      let mapOfRight = leftKeyToMapOfRight.get(leftKey)
      prevRightKeys.forEach(rightKey => {
        mapOfRight.delete(rightKey)
        const leftKeys = rightKeyToLeftKeys.get(rightKey)
        if(!!leftKeys) {
          // TODO: ensure this is always set so the check is unnecessary
          leftKeys.delete(leftKey)
        }
      })
      nextRightKeys.forEach(rightKey => {
        mapOfRight.set(rightKey, rightValueByKey.get(rightKey))
        const leftKeys = rightKeyToLeftKeys.get(rightKey)
        if(!leftKeys) {
          rightKeyToLeftKeys.set(rightKey, createMutableSet().add(leftKey))
        } else {
          leftKeys.add(leftKey)
        }
      })

      newValue.set(leftKey, attachInstance(next, mapOfRight, leftKey))
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