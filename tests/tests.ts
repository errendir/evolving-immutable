import { Set, Map } from 'immutable'

import {
  startChain,
  memoizeForSlots, memoizeForRecentArguments,
  semiPureFunction, composeFunctions,
  unionMap, unionSet, flattenMap,
  zip, leftJoin, group, map, filter, toSet, toMap
} from '../src/'

describe('startChain', () => {
  it('produces a chain that can be specialized', () => {
    let whichNumber = 0
    const toMemoizedUniqueNumberChain = startChain()
      .addStep(memoizeForRecentArguments(
        () => { whichNumber += 1; return whichNumber },
        { historyLength: 1 },
      ))
      .endChain()

    const chain1 = toMemoizedUniqueNumberChain.specialize()
    const chain2 = toMemoizedUniqueNumberChain.specialize()

    console.assert(chain1('a') === chain1('a'))
    console.assert(chain2('a') === chain2('a'))
    console.assert(chain1('a') !== chain2('a'))
  })

  it('produces a chain that can be specialized over a map', () => {
    let whichNumber = 0
    const toMemoizedUniqueNumberChain = startChain()
      .addStep(({ id }) => id)
      .addStep(memoizeForRecentArguments(
        () => { whichNumber += 1; return whichNumber },
        { historyLength: 1 },
      ))
      .endChain()

    const mapOver = map(toMemoizedUniqueNumberChain)
    
    const va = {}, vb = {}, vc = {}, vd = {}
    const map1 = Map({ 'a': { id: 'a' }, 'b': { id: 'a' } })
    const map2 = Map({ 'a': { id: 'a', s: 1 }, 'b': { id: 'a', s: 2 } })

    const result1 = mapOver(map1)
    const result2 = mapOver(map2)

    // The chain is NOT shared between each key of the map - map specializes it
    console.assert(result1.get('a') !== result1.get('b'))
  })

  it('does not allow for chain creation as part of chain execution', () => {
    const chain = startChain()
      .addStep(map((value) =>
        startChain()
          .addStep(value => value+1)
          .endChain()(value)
      ))
      .endChain()

    let caught = false
    try {
      chain(Map({ a: 11 }))
    } catch(err) {
      caught = true
    }
    console.assert(caught === true)
  })

  it('allows for chain specialization as part of chain execution', () => {
    const chain = startChain()
      .addStep(map(
        startChain()
          .addStep(value => value+1)
          .endChain()
      ))
      .endChain()

    let caught = false
    try {
      chain(Map({ a: 11, b: 12 }))
    } catch(err) {
      caught = true
    }
    console.assert(caught === false)
  })

  it('allows for memoization of the full chain by arguments values', () => {
    let i = 0
    const getUnique = () => i++

    const chain = startChain()
      .memoizeForValue()
      .addStep(getUnique)
      .endChain()

    console.assert(chain(15) === chain(15))
    console.assert(chain(15) !== chain(14))
  })

  it('allows for memoization of the tail of the chain by current value', () => {
    let i = 0
    const getUnique = () => i++

    const chain = startChain()
      .addStep(complexObject => complexObject.value)
      .memoizeForValue()
      .addStep(getUnique)
      .endChain()

    console.assert(chain({ value: 15 }) === chain({ value: 15 }))
    console.assert(chain({ value: 15 }) !== chain({ value: 14 }))
  })

  it('allows for memoization of the tail of the chain by current object', () => {
    let i = 0
    const getUnique = () => i++

    const chain = startChain()
      .addStep(v => v)
      .memoizeForObject()
      .addStep(getUnique)
      .endChain()

    console.assert(chain({ value: 15, anotherProp: 14 }) === chain({ value: 15, anotherProp: 14 }))
    console.assert(chain({ value: 15, anotherProp: 14 }) !== chain({ value: 15, anotherProp: 13 }))
  })

  it('allows for multiple types of memoization on one chain', () => {
    let i = 0
    const getUnique = () => i++

    const chain = startChain()
      .memoizeForValue()
      .addStep(object => ({ ...object, c: object.a + object.b }))
      .memoizeForObject()
      .addStep(getUnique)
      .endChain()

    const o1 = { a: 15, b: 14 }
    const o2 = { a: 15, b: 14 }
    console.assert(chain(o1) === chain(o2))
  })

  it('allows for multiple types of memoization on one chain', () => {
    let i = 0
    const getUnique = () => i++

    const chain = startChain()
      .memoizeForObject()
      .addStep(object => object.a + object.b)
      .memoizeForValue()
      .addStep(getUnique)
      .endChain()

    const o1 = { a: 1, b: 2 }
    const o2 = { a: 2, b: 1 }
    const o3 = { a: 2, b: 1 }
    console.assert(chain(o1) === chain(o2))
    console.assert(chain(o2) === chain(o3))
  })

  it('correctly creates an empty chain', () => {
    const chain = startChain()
      .endChain()

    const obj1 = { a: 11 }
    console.assert(chain(obj1) === chain(obj1))
  })

  it('correctly chains skips over the intermediate object creation when possible', () => {
    const chain = startChain()
      .addStep((data) => data)
      .addMapStep(value => value+1)
      .addGroupStep(value => value % 3)
      .endChain()

    const map1 = Map({ a: 11, b: 12, c: 13 })
    console.assert(chain(map1).get(0).has('a'))
    console.assert(chain(map1).get(1).has('b'))
    console.assert(chain(map1).get(2).has('c'))
  })
})

describe('memoizeForSlots', () => {
  it('produces a function that dispatches the data into the correct instance of the provided function based on the computed slot', () => {
    const getTransformedObject = memoizeForSlots({ 
      computeSlot: (allObjects, objectId) => objectId,
      executeFunction: composeFunctions(
        (allObjects, objectId) => allObjects.get(objectId),
        memoizeForRecentArguments(object => Math.random(), { historyLength: 1 })
      )
    })

    const data = Map({ 'a': Map({ prop1: 1 }), 'b': Map({ prop1: 2 }) })

    const transformedA1 = getTransformedObject(data, 'a')
    const transformedA2 = getTransformedObject(data, 'a')
    const transformedB1 = getTransformedObject(data, 'b')
    const transformedA3 = getTransformedObject(data, 'a')
    const transformedB2 = getTransformedObject(data, 'b')
    console.assert(transformedA1 === transformedA2)
    console.assert(transformedA2 === transformedA3)
    console.assert(transformedB1 === transformedB2)
  })
})


describe('memoizeForRecentArguments', () => {
  it('produces a function that returns cached value if called with the arguments it has recently been called with', () => {
    // const decimalPart = (number) => Math.abs(number) - Math.floor(Math.abs(number))
    // const largeNumber = 1000000
    // const giveMeTheFirstPseudoRandomValue = (seed) => decimalPart(Math.sin(seed*largeNumber)*largeNumber)

    const objHash = memoizeForRecentArguments(Math.random, { historyLength: 20 })

    const obj1 = {}
    const obj2 = {}
    
    const hash1_1 = objHash(obj1)
    const hash2_1 = objHash(obj2)
    const hash1_2 = objHash(obj1)
    const hash2_2 = objHash(obj2)
    console.assert(hash1_1 === hash1_2)
    console.assert(hash2_1 === hash2_2)
  })

  it('produces a function that reruns the provided function if it is called with an argument seen too many calls before', () => {
    const objHash = memoizeForRecentArguments(Math.random, { historyLength: 2 })

    const obj1 = {}
    const obj2 = {}
    const obj3 = {}
    
    const hash1_1 = objHash(obj1)
    const hash2 = objHash(obj2)
    const hash3 = objHash(obj3)
    const hash1_2 = objHash(obj1)
    console.assert(hash1_1 !== hash1_2)
  })

  it('produces a function that does not move the argument to the most recent history', () => {
    const objHash = memoizeForRecentArguments(Math.random, { historyLength: 2 })

    const obj1 = {}
    const obj2 = {}
    const obj3 = {}
    
    const hash1_1 = objHash(obj1)
    const hash2 = objHash(obj2)
    const hash1_2 = objHash(obj1)
    const hash3 = objHash(obj3)
    const hash1_3 = objHash(obj1)
    console.assert(hash1_1 === hash1_2)
    console.assert(hash1_1 !== hash1_3)
  })
})

describe('composeFunctions', () => {
  it('preserves the internal memoization of all the addStep functions', () => {
    const appendOneMoreThing = (map) => map.set('one-more-thing', { value: 11 })
    let nextValue = 0
    const extractTheFake = map((object) => nextValue++)

    const process1 = composeFunctions(appendOneMoreThing, extractTheFake)

    const map1 = Map({ a: { value: 12 }, b: { value: 13 }})

    const result1 = process1(map1)
    const result2 = process1(map1)

    console.assert(result1.get('a') === result2.get('a'))
    console.assert(result1.get('b') === result2.get('b'))
    console.assert(result1.get('one-more-thing') !== result2.get('one-more-thing'))
  })

  it('allows multiple arguments to be passed into the first addStepd function', () => {
    const operation = composeFunctions(
      (allObjectsById, objectId) => allObjectsById.get(objectId),
      (object) => object
    )

    const allObjectsById = Map({ 'a': { prop1: 11 }})
    
    console.assert(operation(allObjectsById, 'a') === allObjectsById.get('a'))
  })
})

describe('filter', () => {
  it('produces a map with all the entries of the argument map for which the provided predicate function returns truthy', () => {
    const map = Map({ a: { value: 8 }, b: { value: 11 }, c: { value: 9 } })

    const lowerThan10 = filter(element => element.value < 10)

    const result = lowerThan10(map)
    console.assert(result.keySeq().toSet().equals(Set(["a", "c"])))
    console.assert(result.get("a") === map.get("a"))
    console.assert(result.get("c") === map.get("c"))
  })

  it('produced correct map when argument changes in discontinuous manner', () => {
    const map1 = Map({ a: { value: 8 }, b: { value: 11 }, c: { value: 9 }, d: { value: 3 } })
    const map2 = Map({ a: { value: 14 }, b: { value: 12 }, c: { value: 8 } })

    const lowerThan10 = filter(element => element.value < 10)

    const result1 = lowerThan10(map1)
    const result2 = lowerThan10(map2)
    console.assert(result2.keySeq().toSet().equals(Set(["c"])))
    console.assert(result2.get("c") === map2.get("c"))
  })

  it('updates the result by removing any entry that predicate no longer accepts after argument change', () => {
    const map1 = Map({ a: { value: 8 }, b: { value: 11 }, c: { value: 9 } })
    const map2 = map1.set('a', { value: 12 })

    const lowerThan10 = filter(element => element.value < 10)

    lowerThan10(map1)
    const result = lowerThan10(map2)
    console.assert(result.keySeq().toSet().equals(Set(["c"])))
    console.assert(result.get("c") === map1.get("c"))
  })

  it('updates the result by adding any entry that predicate accepts after argument change', () => {
    const map1 = Map({ a: { value: 8 }, b: { value: 11 }, c: { value: 9 } })
    const map2 = map1.set('b', { value: 2 })

    const lowerThan10 = filter(element => element.value < 10)

    lowerThan10(map1)
    const result = lowerThan10(map2)
    console.assert(result.keySeq().toSet().equals(Set(["a", "b", "c"])))
    console.assert(result.get("a") === map2.get("a"))
    console.assert(result.get("b") === map2.get("b"))
    console.assert(result.get("c") === map2.get("c"))
  })
})

describe('zip', () => {
  it('produces a map with all the keys of both input maps', () => {
    const map1 = Map({ a: { a: 1 }, b: { a: 2 }, c: { c: 3 }})
    const map1_a = map1.remove('c')
    const map1_b = map1_a.set('f', { a: 124 })

    const map2 = Map({ c: { b: 1 }, d: { b: 2 }, e: { b: 3 }})

    const zipTwoObjects = zip((left, right) => ({...left, ...right}))

    const outputMap1 = zipTwoObjects(map1, map2)
    const outputMap2 = zipTwoObjects(map1_a, map2)
    const outputMap3 = zipTwoObjects(map1_b, map2)

    console.assert(outputMap1.keySeq().toSet().equals(Set(["a", "b", "c", "d", "e"])))
    console.assert(outputMap2.keySeq().toSet().equals(Set(["a", "b", "c", "d", "e"])))
    console.assert(outputMap3.keySeq().toSet().equals(Set(["a", "b", "c", "d", "e", "f"])))
  })

  it('produces a map with values generated by combining entries of the first argument with entries of the second argument by calling the provided attach function for each key', () => {
    const map1 = Map({ a: { a: 1 }, b: { a: 2 }, c: { c: 3 }})
    const map2 = Map({ a: { b: 1 }, b: { b: 2 } })

    const zipTwoObjects = zip((left, right) => ({ left, right }))

    const outputMap1 = zipTwoObjects(map1, map2)

    console.assert(outputMap1.get("a").left === map1.get("a"))
    console.assert(outputMap1.get("a").right === map2.get("a"))
    console.assert(outputMap1.get("b").left === map1.get("b"))
    console.assert(outputMap1.get("b").right === map2.get("b"))
    console.assert(outputMap1.get("c").left === map1.get("c"))
    console.assert(outputMap1.get("c").right === map2.get("c"))
  })

  it('does not remove entries from the resulting map as long as the key is present in at least one source maps', () => {
    const map1 = Map({ a: { a: 1 }, b: { a: 2 }, c: { c: 3 } })
    const map1_a = map1.remove('a')
    const map1_b = map1_a.remove('c')
    const map2 = Map({ a: { b: 1 }, b: { b: 2 }, c: { c: 3 } })
    const map2_a = map2.remove('b')

    const zipTwoObjects = zip((left, right) => ({ left, right }))

    const outputMap1 = zipTwoObjects(map1, map2)
    const outputMap2 = zipTwoObjects(map1_a, map2)
    const outputMap3 = zipTwoObjects(map1_b, map2)
    const outputMap4 = zipTwoObjects(map1_b, map2_a)

    console.assert(outputMap1.keySeq().toSet().equals(Set(['a', 'b', 'c'])))
    console.assert(outputMap2.keySeq().toSet().equals(Set(['a', 'b', 'c'])))
    console.assert(outputMap3.keySeq().toSet().equals(Set(['a', 'b', 'c'])))
    console.assert(outputMap4.keySeq().toSet().equals(Set(['a', 'b', 'c'])))
  })

  it('removed entries from the resulting map for keys no longer present in either source maps', () => {
    const map1 = Map({ a: { a: 1 }, b: { a: 2 }, c: { c: 3 } })
    const map1_a = map1.remove('a')
    const map1_b = map1_a.remove('c')
    const map2 = Map({ a: { b: 1 }, b: { b: 2 }, c: { c: 3 } })
    const map2_a = map2.remove('a')
    const map2_b = map2_a.remove('c')

    const zipTwoObjects = zip((left, right) => ({ left, right }))

    const outputMap1 = zipTwoObjects(map1, map2)
    const outputMap2 = zipTwoObjects(map1_a, map2)
    const outputMap3 = zipTwoObjects(map1_b, map2)
    const outputMap4 = zipTwoObjects(map1_b, map2_a)
    const outputMap5 = zipTwoObjects(map1_b, map2_b)

    console.assert(outputMap1.keySeq().toSet().equals(Set(['a', 'b', 'c'])))
    console.assert(outputMap2.keySeq().toSet().equals(Set(['a', 'b', 'c'])))
    console.assert(outputMap3.keySeq().toSet().equals(Set(['a', 'b', 'c'])))
    console.assert(outputMap4.keySeq().toSet().equals(Set(['b', 'c'])))
    console.assert(outputMap5.keySeq().toSet().equals(Set(['b'])))
  })

  it('correctly processes the update of the entry in one map regardless of removal of the same key from the other map', () => {
    const map1 = Map<any,any>({ a: { a: 1 }, b: { a: 2 }, c: { c: 3 } })
    const map1_a = map1.set('a', { aa: 1 })
    const map1_b = map1.remove('a')
    const map2 = Map<any,any>({ a: { b: 1 }, b: { b: 2 }, c: { c: 3 } })
    const map2_a = map2.remove('a')
    const map2_b = map2.set('a', { aa: 1 })

    const zipTwoObjects1 = zip((left, right) => ({ left, right }))
    const zipTwoObjects2 = zip((left, right) => ({ left, right }))

    const outputMap1 = zipTwoObjects1(map1, map2)
    const outputMap2 = zipTwoObjects1(map1_a, map2_a)
    const outputMap3 = zipTwoObjects2(map1, map2)
    const outputMap4 = zipTwoObjects2(map1_b, map2_b)

    console.assert(outputMap2.get("a").left === map1_a.get("a"))
    console.assert(outputMap2.get("a").right === map2_a.get("a"))
    console.assert(outputMap4.get("a").left === map1_b.get("a"))
    console.assert(outputMap4.get("a").right === map2_b.get("a"))
  })
})

describe('group', () => {
  it('produces a map where keys are all the groups generated by the provided function', () => {
    const map = Map({ a: { v: 11 }, b: { v: 11 }, c: { v: 12 }})

    const groupByV = group<string, { v: number }, number>(object => object.v)
    const groupedObjects = groupByV(map)

    console.assert(groupedObjects.keySeq().toSet().has(11))
    console.assert(groupedObjects.keySeq().toSet().has(12))
  })
  it('produces a map of maps of all elements belonging to a particual group', () => {
    const map = Map({ a: { v: 11 }, b: { v: 11 }, c: { v: 12 }})

    const groupByV = group<string, { v: number }, number>(object => object.v)
    const groupedObjects = groupByV(map)

    console.assert(groupedObjects.get(11).has('a'))
    console.assert(groupedObjects.get(11).get('a') === map.get('a'))
    console.assert(groupedObjects.get(11).has('b'))
    console.assert(groupedObjects.get(11).get('b') === map.get('b'))
    console.assert(groupedObjects.get(12).has('c'))
    console.assert(groupedObjects.get(12).get('c') === map.get('c'))
  })
  it('correctly moves an element from one group to another when ran on a modified argument', () => {
    const map0 = Map<string, { v: number }>({})
    const map1 = Map({ a: { v: 11 }, b: { v: 11 }, c: { v: 12 }})
    const map2 = map1.set('a', { v: 12 })

    const groupByV = group<string, { v: number }, number>(object => object.v)
    groupByV(map0)
    groupByV(map1)
    const groupedObjects = groupByV(map2)

    console.assert(groupedObjects.get(11).has('b'))
    console.assert(groupedObjects.get(11).get('b') === map2.get('b'))
    console.assert(groupedObjects.get(12).has('a'))
    console.assert(groupedObjects.get(12).get('a') === map2.get('a'))
    console.assert(groupedObjects.get(12).has('c'))
    console.assert(groupedObjects.get(12).get('c') === map2.get('c'))
  })

  it('removes a group from the resulting map if no argument value remains in the group', () => {
    const map0 = Map<string, { v: number }>({})
    const map1 = Map({ a: { v: 11 }, b: { v: 11 }, c: { v: 12 }})
    const map2 = map1.set('c', { v: 11 })

    const groupByV = group<string, { v: number }, number>(object => object.v)
    groupByV(map0)
    groupByV(map1)
    const groupedObjects = groupByV(map2)

    console.assert(!groupedObjects.has(12))
  })
})

describe('leftJoin', () => {
  it('produces a map with each key of the first argument map', () => {
    interface Left { otherEnd: string }
    const mapL = Map({ 'a': { otherEnd: 'a' }, 'b': { otherEnd: 'b' } })
    interface Right { }
    const mapR = Map({ 'a': {}, 'b': {}, 'c': {} })

    const leftJoinLR = leftJoin<string, Left, string, Right, {left: Left, right: Right}>(
      (left) => Set([left.otherEnd]),
      (left, rights) => ({ left, right: rights.get(left.otherEnd) })
    )

    const mapLR = leftJoinLR(mapL, mapR)
    console.assert(mapLR.keySeq().toSet().equals(Set(['a', 'b'])))
  })

  it('uses the first provided function to find the values in the second argument map', () => {
    interface L { id: number, uId: number }
    const l1 = { id: 1, uId: 1 }
    const l2 = { id: 2, uId: 2 }
    const l3 = { id: 3, uId: 3 }
    const mapL = Map<number, L>([l1, l2, l3].map(l => ([l.id, l])))
    interface U { id: number }
    const u1 = { id: 1 }
    const u2 = { id: 2 }
    const u3 = { id: 3 }
    const mapU = Map<number, U>([u1, u2, u3].map(u => ([u.id, u])))

    const getLU = leftJoin<number, L, number, U, { l: L, u: U }>(
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

describe('toMap', () => {
  it('produces a map with entries generated from argument set values by attaching a key returned for each value by the attach function', () => {
    const o1 = { id: 1, val: 1}, o2 = { id: 2, val: 2}, o3 = { id: 3, val: 3}
    const set = Set([o1, o2, o3])

    const convertToMap = toMap(value => value.id)
    const result = convertToMap(set)

    console.assert(result.keySeq().toSet().equals(Set([1,2,3])))
    console.assert(result.get(1) === o1)
    console.assert(result.get(2) === o2)
    console.assert(result.get(3) === o3)
  })
})

describe('unionSet', () => {
  it('produces a set with all the elements of two argument sets', () => {
    const set1 = Set([1,2,3,4])
    const set2 = Set([3,4,5,6])

    const union = unionSet()

    const setU = union(set1, set2)

    console.assert(setU.equals(Set([1,2,3,4,5,6])))
  })

  it('does not lose an element until it is gone from both argument sets', () => {
    const set1_1 = Set([1,2,3,4])
    const set1_2 = set1_1.remove(3)
    const set1_3 = set1_2.remove(4)
    const set1_4 = set1_3.remove(1)
    const set2_1 = Set([3,4,5,6])
    const set2_2 = set2_1.remove(4)
    const set2_3 = set2_2.remove(3)
    const set2_4 = set2_3.remove(1)

    const union = unionSet()

    const set11 = union(set1_1, set2_1)
    const set21 = union(set1_2, set2_1)
    const set22 = union(set1_2, set2_2)
    const set32 = union(set1_3, set2_2)
    const set33 = union(set1_3, set2_3)
    const set44 = union(set1_4, set2_4)

    console.assert(set11.equals(Set([1,2,3,4,5,6])))
    console.assert(set21.equals(Set([1,2,3,4,5,6])))
    console.assert(set22.equals(Set([1,2,3,4,5,6])))
    console.assert(set32.equals(Set([1,2,3,5,6])))
    console.assert(set33.equals(Set([1,2,5,6])))
    console.assert(set44.equals(Set([2,5,6])))
  })

  it('preserves an element removed from one argument set but added to another', () => {
    const set1_1 = Set([1,2,3,4,5])
    const set1_2 = set1_1.remove(5)
    const set2_1 = Set([1,2,3,4])
    const set2_2 = set2_1.add(5)

    const union = unionSet()

    const set11 = union(set1_1, set2_1)
    const set22 = union(set1_2, set2_2)
    
    console.assert(set11.equals(Set([1,2,3,4,5])))
    console.assert(set22.equals(Set([1,2,3,4,5])))
  })
})