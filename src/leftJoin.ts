import { Set, Map } from 'immutable'

import { createMutableMap, createMutableSet, createSpecializingMap } from './mutableContainers'

const emptyIterable = []

// export const leftJoinDiffProcessor = () => {
//   let currentMapLeftToRightKeysInstances = createMutableMap()
//   let currentAttachInstances = createMutableMap()
//   let rightKeyToLeftKeys = createMutableMap()
//   let leftKeyToMapOfRight = createMutableMap()

//   let rightValueByKey = createMutableMap()
//   let leftValueByKey = createMutableMap()

//   const diffProcessor = ({ remove, add, update }) => ([
//     {

//     },
//     {
//       remove: (rightValue, rightKey) => {
//         rightValueByKey.delete(rightKey)
//         const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
//         rightKeyToLeftKeys.delete(rightKey)
//         allLeftKeys.forEach(leftKey => {
//           const mapOfRight = leftKeyToMapOfRight.get(leftKey)
//           mapOfRight.delete(rightKey)
//           const attachInstance = currentAttachInstances.get(leftKey)
//           update({
//             next: attachInstance(leftValueByKey.get(leftKey), mapOfRight, leftKey)
//           }, leftKey)
//         })
//       },
//       add: (rightValue, rightKey) => {
//         rightValueByKey.set(rightKey, rightValue)
//         const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
//         allLeftKeys.forEach(leftKey => {
//           let mapOfRight = leftKeyToMapOfRight.get(leftKey)
//           if(!mapOfRight) {
//             mapOfRight = createMutableMap()
//             leftKeyToMapOfRight.set(leftKey, mapOfRight)
//           }
//           mapOfRight.set(rightKey, rightValue)
//           const attachInstance = currentAttachInstances.get(leftKey)
//           update({
//             next: attachInstance(leftValueByKey.get(leftKey), mapOfRight, leftKey)
//           }, leftKey)
//         })
//       },
//       update: ({ prev, next }, rightKey) => {
//         rightValueByKey.set(rightKey, next)
//         const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
//         allLeftKeys.forEach(leftKey => {
//           const mapOfRight = leftKeyToMapOfRight.get(leftKey)
//           mapOfRight.set(rightKey, next)
//           const attachInstance = currentAttachInstances.get(leftKey)
//           update({
//             next: attachInstance(leftValueByKey.get(leftKey), mapOfRight, leftKey)
//           }, leftKey)
//         })
//       }
//     }
//   ])

//   const specialize = () => {
//     return leftJoinDiffProcessor()
//   }

//   return {
//     diffProcessor,
//     specialize,
//   }
// }

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
  let currentLeftArgument = Map<KL,VL>()
  let currentRightArgument = Map<KR, VR>()

  const currentMapLeftToRightKeysInstances = createSpecializingMap<KL, typeof mapLeftToSetOfRightKeys>(mapLeftToSetOfRightKeys)
  const currentAttachInstances = createSpecializingMap<KL, typeof attachLeftWithMapOfRight>(attachLeftWithMapOfRight)

  let rightKeyToLeftKeys = createMutableMap()
  let leftKeyToMapOfRight = createMutableMap()

  let rightValueByKey = createMutableMap()

  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument)
    const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument)

    let newValue = currentValue

    rightArgumentDiff.removed.forEach((_rightValue, rightKey) => {
      rightValueByKey.delete(rightKey)
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
      rightKeyToLeftKeys.delete(rightKey)
      allLeftKeys.forEach((leftKey: KL) => {
        const mapOfRight = leftKeyToMapOfRight.get(leftKey)
        mapOfRight.delete(rightKey)
        const attachInstance = currentAttachInstances.getFnInstance(leftKey)
        // Use the currentLeftArgument, since the leftElements are updated in the last three loops
        newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey) as VL, mapOfRight, leftKey))
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

        const attachInstance = currentAttachInstances.getFnInstance(leftKey)
        newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey) as VL, mapOfRight, leftKey))
      })
    })
    rightArgumentDiff.updated.forEach(({ prev: _prev, next }, rightKey) => {
      //console.log('update', { prev, next }, rightKey, next.diffFrom && next.diffFrom(prev))
      rightValueByKey.set(rightKey, next)
      const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable
      allLeftKeys.forEach(leftKey => {
        const mapOfRight = leftKeyToMapOfRight.get(leftKey)
        mapOfRight.set(rightKey, next)
        const attachInstance = currentAttachInstances.getFnInstance(leftKey)
        //console.log('attaching', currentLeftArgument.get(leftKey), 'with', Array.from(mapOfRight))
        newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey) as VL, mapOfRight, leftKey))
      })
    })

    leftArgumentDiff.removed.forEach((_value, leftKey) => {
      currentMapLeftToRightKeysInstances.deleteFnInstance(leftKey)
      currentAttachInstances.deleteFnInstance(leftKey)
      leftKeyToMapOfRight.get(leftKey).forEach((_rightValue, rightKey) => {
        const leftKeys = rightKeyToLeftKeys.get(rightKey)
        leftKeys.delete(leftKey)
      })
      leftKeyToMapOfRight.delete(leftKey)
      newValue.remove(leftKey)
    })
    leftArgumentDiff.added.forEach((value, key) => {
      const mapLeftToSetOfRightKeysInstance = currentMapLeftToRightKeysInstances.specializeFn()
      const attachInstance = currentAttachInstances.specializeFn()
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
      currentMapLeftToRightKeysInstances.setFnInstance(key, mapLeftToSetOfRightKeysInstance)
      currentAttachInstances.setFnInstance(key, attachInstance)
      newValue.set(key, attachInstance(value, mapOfRight, key))
    })
    leftArgumentDiff.updated.forEach(({prev, next}, leftKey) => {
      const mapLeftToSetOfRightKeysInstance = currentMapLeftToRightKeysInstances.getFnInstance(leftKey)
      const attachInstance = currentAttachInstances.getFnInstance(leftKey)

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