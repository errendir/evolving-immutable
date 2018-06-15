import { Map } from 'immutable'

import { createSpecializingMap } from './mutableContainers'

interface ZipAttach<LV, RV, UV> {
  (leftValue: LV | undefined, rightValue: RV | undefined): UV,
  specialize?: () => ZipAttach<LV, RV, UV>
}
interface ZipOperation<K, LV, RV, UV> {
  (leftMap: Map<K, LV>, rightMap: Map<K, RV>): Map<K, UV>,
  specialize: () => ZipOperation<K, LV, RV, UV>
}
export function zip<K, LV, RV, UV>(attach: ZipAttach<LV, RV, UV>) : ZipOperation<K, LV, RV, UV> {
  let currentValue = Map<any,any>()
  let currentLeftArgument = Map<any,any>()
  let currentRightArgument = Map<any,any>()

  const currentAttachInstances = createSpecializingMap<K, typeof attach>(attach)

  const apply: any = (newLeftArgument, newRightArgument) => {
    const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument)
    const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument)

    let newValue = currentValue

    rightArgumentDiff.removed.forEach((_rightValue, rightKey) => {
      const leftValue = currentLeftArgument.get(rightKey)
      if(leftValue !== undefined) {
        const attachInstance = currentAttachInstances.getFnInstance(rightKey)
        newValue = newValue.set(rightKey, attachInstance(leftValue, undefined))
      } else {
        currentAttachInstances.deleteFnInstance(rightKey)
        newValue = newValue.remove(rightKey)
      }
    })
    rightArgumentDiff.added.forEach((rightValue, rightKey) => {
      const attachInstance = currentAttachInstances.getFnInstance(rightKey)
      currentAttachInstances.setFnInstance(rightKey, attachInstance)
      const leftValue = currentLeftArgument.get(rightKey)
      newValue = newValue.set(rightKey, attachInstance(leftValue, rightValue))
    })
    rightArgumentDiff.updated.forEach(({ next }, rightKey) => {
      const attachInstance = currentAttachInstances.getFnInstance(rightKey)
      const leftValue = currentLeftArgument.get(rightKey)
      newValue = newValue.set(rightKey, attachInstance(leftValue, next))
    })

    leftArgumentDiff.removed.forEach((_leftValue, leftKey) => {
      const rightValue = newRightArgument.get(leftKey)
      if(rightValue !== undefined) {
        const attachInstance = currentAttachInstances.getFnInstance(leftKey)
        newValue = newValue.set(leftKey, attachInstance(undefined, rightValue))
      } else {
        currentAttachInstances.deleteFnInstance(leftKey)
        newValue = newValue.remove(leftKey)
      }
    })
    leftArgumentDiff.added.forEach((leftValue, leftKey) => {
      const attachInstance = currentAttachInstances.getFnInstance(leftKey)
      currentAttachInstances.setFnInstance(leftKey, attachInstance)
      const rightValue = newRightArgument.get(leftKey)
      newValue = newValue.set(leftKey, attachInstance(leftValue, rightValue))
    })
    leftArgumentDiff.updated.forEach(({ next }, leftKey) => {
      const attachInstance = currentAttachInstances.getFnInstance(leftKey)
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