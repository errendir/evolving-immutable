import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

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