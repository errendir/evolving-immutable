import { Map, Set } from 'immutable'

export const filter = (fn) => (argumentMap) => argumentMap.filter(fn)

export const group = (fn) => (argumentMap) => {
  const mapOfGroups = Map<any, any>().asMutable()
  argumentMap.forEach((value, key) => {
    const groups = fn(value, key)
    if(groups.forEach) {
      groups.forEach(group => {
        mapOfGroups.update(group, mapOfValues => (mapOfValues || Map<any, any>()).set(key, value))
      })
    } else {
      mapOfGroups.update(groups, mapOfValues => (mapOfValues || Map<any, any>()).set(key, value))
    }
  })
  return mapOfGroups.asImmutable()
}