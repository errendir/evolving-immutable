import { Set, Map } from 'immutable'

import { 
  pipelinePiece,
  unionMap, unionSet, flattenMap,
  zip, leftJoin, group, map, filter, toSet, toMap
} from './transformations'

describe('zip', () => {
  it('produces a map with all the keys of both input maps')
  it('produces a map with values generated by calling the provided attach function for each key')
})

describe('group', () => {
  it('produces a map where keys are all the groups generated by the provided function', () => {
    const map = Map({ a: { v: 11 }, b: { v: 11 }, c: { v: 12 }})

    const groupByV = group(object => object.v)
    const groupedObjects = groupByV(map)

    console.assert(groupedObjects.keySeq().toSet().has(11))
    console.assert(groupedObjects.keySeq().toSet().has(12))
  })
  it('produces a map with values being maps of all elements belonging to a particual group', () => {
    const map = Map({ a: { v: 11 }, b: { v: 11 }, c: { v: 12 }})

    const groupByV = group(object => object.v)
    const groupedObjects = groupByV(map)

    console.assert(groupedObjects.get(11).has('a'))
    console.assert(groupedObjects.get(11).get('a') === map.get('a'))
    console.assert(groupedObjects.get(11).has('b'))
    console.assert(groupedObjects.get(11).get('b') === map.get('b'))
    console.assert(groupedObjects.get(12).has('c'))
    console.assert(groupedObjects.get(12).get('c') === map.get('c'))
  })
})

describe('leftJoin', () => {
  it('produces a map with each key of the first argument map')

  it('uses the first provided function to find the values in the second argument map', () => {
    const l1 = { id: 1, uId: 1 }
    const l2 = { id: 2, uId: 2 }
    const l3 = { id: 3, uId: 3 }
    const mapL = Map([l1, l2, l3].map(l => ([l.id, l])))
    const u1 = { id: 1 }
    const u2 = { id: 2 }
    const u3 = { id: 3 }
    const mapU = Map([u1, u2, u3].map(u => ([u.id, u])))

    const getLU = leftJoin(
      l => Set([l.uId]),
      (l, us) => ({ l, u: us.get(l.uId) })
    )

    const lu = getLU(mapL, mapU)
    
    console.assert(lu.has(l1.id))
    console.assert(lu.get(l1.id).l === l1)
    console.assert(lu.get(l1.id).u === u1)
    console.assert(lu.has(l2.id))
    console.assert(lu.get(l2.id).l === l2)
    console.assert(lu.get(l2.id).u === u2)
    console.assert(lu.has(l3.id))
    console.assert(lu.get(l3.id).l === l3)
    console.assert(lu.get(l3.id).u === u3)
  })
})

describe('toSet', () => {
  it('produces a set of all the value of the provided map', () => {
    const o1 = {}
    const o2 = {}
    const map = Map({ a: o1, b: o1, c: o2 })
    const convertToSet = toSet()

    const set = convertToSet(map)
    console.assert(Set.isSet(set))
    console.assert(set.has(o1))
    console.assert(set.has(o2))
    console.assert(set.size === 2)
  })

  it('does not remove elements too eagerly when ran again on a map with removed keys', () => {
    const object1 = {}
    const object2 = {}
    const map1 = Map({
      "a": object1,
      "b": object1,
      "c": object1,
    })
    const map2 = map1.remove("a")
    const map3 = map2.set("b", object2)
    const convertToSet = toSet()
    
    console.assert(convertToSet(map1).has(object1))
    console.assert(convertToSet(map2).has(object1))
    console.assert(convertToSet(map3).has(object1))
  })
})