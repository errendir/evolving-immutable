import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

interface ZipAttach<K, LV, RV, UV> {
  (leftValue: LV | undefined, rightValue: LV | undefined): UV,
  specialize? : any
}
interface ZipOperation<K, LV, RV, UV> {
  (leftMap: Map<K, LV>, rightMap: Map<K, RV>): Map<K, UV>,
  specialize: () => ZipOperation<K, LV, RV, UV>
}
export function zip<K, LV, RV, UV>(attach: ZipAttach<K, LV, RV, UV>) : ZipOperation<K, LV, RV, UV> {
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
      const leftValue = currentLeftArgument.get(rightKey)
      if(leftValue !== undefined) {
        const attachInstance = newAttachInstances.get(rightKey)
        newValue = newValue.set(rightKey, attachInstance(leftValue, undefined))
      } else {
        newAttachInstances = newAttachInstances.remove(rightKey)
        newValue = newValue.remove(rightKey)
      }
    })
    rightArgumentDiff.added.forEach((rightValue, rightKey) => {
      const attachInstance = newAttachInstances.get(rightKey) || 
        (attach.specialize ? attach.specialize() : attach)
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
      const rightValue = newRightArgument.get(leftKey)
      if(rightValue !== undefined) {
        const attachInstance = newAttachInstances.get(leftKey)
        newValue = newValue.set(leftKey, attachInstance(undefined, rightValue))
      } else {
        newAttachInstances = newAttachInstances.remove(leftKey)
        newValue = newValue.remove(leftKey)
      }
    })
    leftArgumentDiff.added.forEach((leftValue, leftKey) => {
      const attachInstance = newAttachInstances.get(leftKey) || 
        (attach.specialize ? attach.specialize() : attach)
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