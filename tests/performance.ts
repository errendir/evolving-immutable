import { Map, Set } from 'immutable'

import * as EvolvingImmutable from '../src/'
import * as NaiveImmutable from './naiveTransformations'

interface Like { id: number, userId: number, dataPiece1: number }
const generateLike = () => {
  const id = Math.floor(Math.random()*1000000)
  return { 
    id: Math.floor(Math.random()*1000000),
    userId: Math.floor(Math.random()*100),
    dataPiece1: Math.floor(Math.random()*1000000),
    hashCode: () => id,
  }
}
const generateLikes = (NUMBER_OF_LIKES=10000) => {
  const likesById = Map<any, any>().asMutable()
  for(let i=0; i<NUMBER_OF_LIKES; ++i) {
    const like = generateLike()
    likesById.set(like.id, like)
  }
  return likesById.asImmutable()
}
const removeRandom = (likesById) => {
  const keys = likesById.keySeq()
  const chosenKey = keys.get(Math.floor(Math.random()*keys.size))
  return likesById.remove(chosenKey)
}
const addRandom = (likesById) => {
  const like = generateLike()
  return likesById.set(like.id, like)
}
const updateRandom = (likesById) => {
  const keys = likesById.keySeq()
  const chosenKey = keys.get(Math.floor(Math.random()*keys.size))
  return likesById.update(chosenKey, (like) => ({ ...generateLike(), id: like.id }))
}
const perturbLikes = (likesById) => {
  const decision = [removeRandom, addRandom, updateRandom][Math.floor(Math.random()*3)]
  return decision(likesById)
}
const debounce = (likesById) => Map(likesById.entrySeq().toJS())

console.log('Testing perf of set vs map')
const testMapSetSpeed = () => {
  const likesById = generateLikes(100000)

  console.time('map')
  const map = Map().asMutable()
  likesById.forEach((like, id) => {
    map.set(id, like)
  })
  console.timeEnd('map')

  console.time('set')
  const set = Set().asMutable()
  likesById.forEach((like, _id) => {
    set.add(like)
  })
  console.timeEnd('set')
}

testMapSetSpeed()


console.log('Testing perf of filter')
const testFilterSpeed = () => {
  const likesById = generateLikes(100000)

  const specialUsersFilter_ev = EvolvingImmutable.filter(like => like.userId % 3 === 0)
  const specialUsersFilter_na = NaiveImmutable.filter(like => like.userId % 3 === 0)

  console.time('ev: filter one map')
  specialUsersFilter_ev(likesById)
  console.timeEnd('ev: filter one map')

  console.time('ev: diff one map')
  const lBId: any = likesById
  lBId.diffFrom(Map())
  console.timeEnd('ev: diff one map')

  console.time('na: filter one map')
  specialUsersFilter_na(likesById)
  console.timeEnd('na: filter one map')
}

testFilterSpeed()

console.log('Comparing perf of group')
const testContinuousModifications = (description, updateFn, noMods, sequenceLength=1000) => {
  console.log(`Sequence of ${sequenceLength} continuous objects - ${noMods} ${description} at a time`)
  console.time('sequence generation')
  const sequence = [generateLikes()]
  for(let i=0; i<sequenceLength-1; ++i) {
    const lastLikesById = sequence[sequence.length-1]
    let nextLikesById = lastLikesById
    for(let j=0; j<noMods; ++j) {
      nextLikesById = updateFn(nextLikesById)
    }
    sequence.push(nextLikesById)
  }
  console.timeEnd('sequence generation')

  const performARun = (name, fn) => {
    console.time(`${name} run`)
    for(let i=0; i<sequenceLength; ++i) {
      fn(sequence[i])
    }
    console.timeEnd(`${name} run`)
  }

  const groupByUser_ev = EvolvingImmutable.group<number, Like, number>(like => like.userId)
  performARun('evolving', groupByUser_ev)

  const groupByUser_na = NaiveImmutable.group(like => like.userId)
  performARun('naive', groupByUser_na)
}

testContinuousModifications('perturbLikes', perturbLikes, 5)
testContinuousModifications('perturbLikes', perturbLikes, 50)

testContinuousModifications('updateRandom', updateRandom, 5)
testContinuousModifications('updateRandom', updateRandom, 50)
//testContinuousModifications('updateRandom', updateRandom, 500)
//testContinuousModifications('updateRandom', updateRandom, 5000)

testContinuousModifications('debounce', debounce, 1, 300)

process.exit(0)
let likesById
console.log('Discontinuous')
console.time('dry run')
for(let i=0; i<100; ++i) {
  likesById = generateLikes()
}
console.timeEnd('dry run')

console.time('evolving run')
const groupByUser_ev2 = EvolvingImmutable.group<number, Like, number>(like => like.userId)
for(let i=0; i<100; ++i) {
  likesById = generateLikes()
  groupByUser_ev2(likesById)
}
console.timeEnd('evolving run')

console.time('naive run')
const groupByUser_na2 = NaiveImmutable.group(like => like.userId)
for(let i=0; i<100; ++i) {
  likesById = generateLikes()
  groupByUser_na2(likesById)
}
console.timeEnd('naive run')
