import { Map, Set } from 'immutable'

export const applyToMapDiffProcessor = (getMap, replaceMap) => ({
  remove: (_value, key) => replaceMap(getMap().remove(key)),
  add: (value, key) => replaceMap(getMap().set(key, value)),
  update: ({prev: _prev, next}, key) => replaceMap(getMap().set(key, next)),
})

export const applyToMutableMapDiffProcessor = (getMap) => ({
  remove: (_value, key) => getMap().remove(key),
  add: (value, key) => getMap().set(key, value),
  update: ({prev: _prev, next}, key) => getMap().set(key, next),
})

export const applyToDeepMutableMapDiffProcessor = (getMap) => ({
  remove: (_value, ...keys) => getMap().deleteIn(keys),
  add: (value, ...keys) => getMap().setIn(keys, value),
  update: ({prev: _prev, next}, ...keys) => getMap().setIn(keys, next),
})

export const applyToSetDiffProcessor = (getSet, replaceSet) => ({
  remove: (value) => replaceSet(getSet().remove(value)),
  add: (value) => replaceSet(getSet().add(value))
})

export const applyToMutableSetDiffProcessor = (getSet) => ({
  remove: (value) => getSet().remove(value),
  add: (value) => getSet().add(value),
})

export function wrapDiffProcessor(diffProcessorFactory, { inSet=false, outSet=false }={}) {
  const diffProcessor = diffProcessorFactory.diffProcessor

  let currentArgument = inSet ? Set() : Map()
  let currentValue = outSet ? Set().asMutable() : Map().asMutable()

  const outDiffProcessor = outSet
    ? applyToMutableSetDiffProcessor(() => currentValue)
    : applyToDeepMutableMapDiffProcessor(() => currentValue)
  const inDiffProcessor = diffProcessor(outDiffProcessor)

  const apply: any = (newArgument) => {
    newArgument.diffFromCallbacks(
      currentArgument,
      inDiffProcessor,
    )
    currentArgument = newArgument

    const finalValue = currentValue.asImmutable()
    currentValue = finalValue.asMutable()
    return finalValue
  }
  const specialize = () => {
    return wrapDiffProcessor(diffProcessorFactory.specialize(), { inSet, outSet })
  }
  apply.specialize = specialize

  return apply
}

export function wrapDualDiffProcessor(diffProcessorFactory) {
  const diffProcessor = diffProcessorFactory.diffProcessor

  let currentLeftArgument = Map()
  let currentRightArgument = Map()
  let currentValue = Map().asMutable()

  const outDiffProcessor = applyToMutableMapDiffProcessor(() => currentValue)
  const inDiffProcessor = diffProcessor(outDiffProcessor)

  const apply: any = (newLeftArgument, newRightArgument) => {
    newLeftArgument.diffFromCallbacks(
      currentLeftArgument,
      inDiffProcessor[0],
    )
    currentLeftArgument = newLeftArgument

    newRightArgument.diffFromCallbacks(
      currentRightArgument,
      inDiffProcessor[1],
    )
    currentRightArgument = newRightArgument

    const finalValue = currentValue.asImmutable()
    currentValue = finalValue.asMutable()
    return finalValue
  }
  const specialize = () => {
    return wrapDualDiffProcessor(diffProcessorFactory.specialize())
  }
  apply.specialize = specialize

  return apply
}