import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

const emptySet = Set()

interface LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR> {
  (leftValue: VL, leftKey?: KL): Set<KR>,
  specialize?: () => LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR>
}
interface LeftJoinAttachLeftWithMapOfRight<VL, KR, VR, VO> {
  (leftValue: VL, mapOfRightValues: Map<KR, VR>): VO,
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
      const mapOfRight = rightKeys.toMap().map(rightKey => newRightArgument.get(rightKey)) as Map<KR, VR>
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