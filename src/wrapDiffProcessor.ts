import { Map, Set } from 'immutable'

export const applyToMapDiffProcessor = (getMap, replaceMap) => ({
  remove: (value, key) => replaceMap(getMap().remove(key)),
  add: (value, key) => replaceMap(getMap().set(key, value)),
  update: ({prev, next}, key) => replaceMap(getMap().set(key, next)),
})

export const applyToMutableMapDiffProcessor = (getMap) => ({
  remove: (value, key) => getMap().remove(key),
  add: (value, key) => getMap().set(key, value),
  update: ({prev, next}, key) => getMap().set(key, next),
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
    : applyToMutableMapDiffProcessor(() => currentValue)
  const inDiffProcessor = diffProcessor(outDiffProcessor)

  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFromCallbacks(
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