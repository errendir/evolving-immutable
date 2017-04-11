import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { map } from './map'
import { toSet, toMap } from './conversion'

// TODO: test the performance of flattenSet
// it deletages to flattenMap, which on the provided data (sets indexed by themselves)
// will detect only addition and removals - nothing will be diffed
// We need to make sure the continuity of each set is preserved by identifying which
// Pairs of <removed set, added set> are easily diffable (share edit history)
export const flattenSet = () => {
  const convertEachToMap = map(toMap(element => element))
  const flattenCurrentMap = flattenMap()
  const convertFlatToSet = toSet()

  const apply: any = (argument) => {
    return convertFlatToSet(flattenCurrentMap(convertEachToMap(argument)))
  }

  const specialize = () => {
    return flattenSet()
  }
  apply.specialize = specialize

  return apply
}

// No consistency guaranteed when it comes to colliding keys
// You can get one sub map taking precedence one run and the other some other run
export const flattenMap = () => {
  let currentArgument = Map<any, any>()

  let currentValue = Map<any, any>()
  // TODO: consider using OrderedSet to force some sort of consistent priority
  let currentKeyToSourceKeys = Map<any, Set<any>>()

  const apply: any = (newArgument) => {
    const argumentDiff = newArgument.diffFrom(currentArgument)

    let newValue = currentValue
    let newKeyToSourceKeys = currentKeyToSourceKeys

    const removeValueKeyFromSource = (value, key, sourceKey) => {
      newKeyToSourceKeys = newKeyToSourceKeys.update(key, sources => sources.remove(sourceKey))
      if(newKeyToSourceKeys.get(key).isEmpty()) {
        newKeyToSourceKeys = newKeyToSourceKeys.remove(key)
        newValue = newValue.remove(key)
      } else if(newValue.get(key) === value) {
        // TODO: More inconsistency (described below too) - even if value taken
        // for the key was `=== value` doesn't mean it was taken from this removed source
        const remainingSourceKey = newKeyToSourceKeys.get(key).last()
        const remainingValue = currentArgument.get(remainingSourceKey).get(key)
        newValue = newValue.set(key, remainingValue)
      }
    }

    const addValueKeyFromSource = (value, key, sourceKey) => {
      newKeyToSourceKeys = newKeyToSourceKeys.update(key, sources => (sources || Set()).add(sourceKey))
      newValue = newValue.set(key, value)
    }
  
    argumentDiff.removed.forEach((mapOrSet, sourceKey) => {
      mapOrSet.forEach((value, key) => {
        removeValueKeyFromSource(value, key, sourceKey)
      })
    })
    // Newely added map will take precedence over previously added ones
    argumentDiff.added.forEach((mapOrSet, sourceKey) => {
      mapOrSet.forEach((value, key) => {
        addValueKeyFromSource(value, key, sourceKey)
      })
    })
    // Modification of a map will take precedence over previously entries
    argumentDiff.updated.forEach(({prev, next}, sourceKey) => {
      const mapOrSetDiff = next.diffFrom(prev)
      mapOrSetDiff.removed.forEach((value, key) => {
        removeValueKeyFromSource(value, key, sourceKey)
      })
      mapOrSetDiff.added.forEach((value, key) => {
        addValueKeyFromSource(value, key, sourceKey)
      })
      mapOrSetDiff.updated && mapOrSetDiff.updated.forEach(({prev, next}, key) => {
        // TODO: Even if the chosen element was equal to prev doesn't mean it came from
        // the updated mapOrSet. This adds to the inconsistency of treating the colliding keys
        // Consider tracking origin of each value in the resulting map and the priority of sub maps
        if(newValue.get(key) === prev) {
          newValue = newValue.set(key, next)
        }
      })
    })

    currentValue = newValue
    currentKeyToSourceKeys = newKeyToSourceKeys

    return currentValue
  }
  const specialize = () => {
    return flattenMap()
  }
  apply.specialize = specialize

  return apply
}