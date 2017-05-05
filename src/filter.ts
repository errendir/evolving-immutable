import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

export const filter = (fn) => {
  let currentFnInstances = Map<any, any>().asMutable()
  let currentValue = Map().asMutable()
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
    const newValueImmutable = newValue.asImmutable()
    currentValue = newValueImmutable.asMutable()
    return newValueImmutable
  }
  const specialize = () => {
    return filter(fn)
  }
  apply.specialize = specialize

  return apply
}
