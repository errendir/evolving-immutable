import { inspect } from 'util'

import { Record, Set, Map, ShapedMap } from 'immutable'

import { 
  executeOneOnMany, semiPureFunction, addStepFunctions,
  unionMap, unionSet, safeUnionSet, flattenMap, zip, leftJoin, group, map, filter, toSet, toMap
} from '../src/'

import * as EvImm from '../src/'

interface Post { id: string }
const posts = Set([
  {id: 'pA'},
  {id: 'pB'},
  {id: 'pC'},
  {id: 'pD'},
])
const postsById = Map(posts.map(post => ([post.id, post])))

interface Like { id: string, postId: string, userId: string }
const likes = Set([
  {id: 'lA', postId: 'pA', userId: 'uA'},
  {id: 'lB', postId: 'pB', userId: 'uB'},
  {id: 'lC', postId: 'pC', userId: 'uC'},
  {id: 'lD', postId: 'pD', userId: 'uD'},
  {id: 'lE', postId: 'pD', userId: 'uC'},
])
const likesById = Map(likes.map(like => ([like.id, like])))
const likesById_plusone = likesById.set('lF', {id: 'lF', postId: 'pD', userId: 'uE'})
const likesById_plusone_minusone = likesById_plusone.remove('lE')

interface User { id: string, name: string }
const users = Set([
  {id: 'uA', name: 'A'},
  {id: 'uB', name: 'B'},
  {id: 'uC', name: 'C'},
  {id: 'uD', name: 'D'},
  {id: 'uE', name: 'E'},
])
const usersById = Map(users.map(user => ([user.id, user])))

const simpleGetLikesByPostId = (likesById) => {
  const likesByPostId = Map<any,any>().asMutable()
  likesById.forEach((like, likeId) => {
    likesByPostId.update(like.postId, (likes) => (likes || Map()).set(likeId, like))
  })
  return likesByPostId.asImmutable()
}

const diffMemGetLikesByPostId = (() => {
  let previousLikesById = Map<any,any>()
  let previousLikesByPostId = Map<any,any>()

  return (likesById) => {
    const difference = likesById.diffFrom(previousLikesById)

    let newLikesByPostId = previousLikesByPostId.asMutable()

    difference.added.forEach((like, likeId) => {
      newLikesByPostId.update(like.postId, (likes) => (likes || Map()).set(likeId, like))
    })
    difference.removed.forEach((like, likeId) => {
      newLikesByPostId.update(like.postId, (likes) => likes.remove(likeId))
      if(newLikesByPostId.get(like.postId).isEmpty()) {
        newLikesByPostId.remove(like.postId)
      }
    })
    difference.updated.forEach(({ prev: prevLike, next: nextLike }, likeId) => {
      if(prevLike.postId !== nextLike.postId) {
        newLikesByPostId.update(prevLike.postId, (likes) => likes.remove(likeId))
        if(newLikesByPostId.get(prevLike.postId).isEmpty()) {
          newLikesByPostId.remove(prevLike.postId)
        }
        newLikesByPostId.update(nextLike.postId, (likes) => (likes || Map()).set(likeId, nextLike))
      } else {
        newLikesByPostId.update(prevLike.postId, (likes) => likes.set(likeId, nextLike))
      }
    })

    previousLikesByPostId = newLikesByPostId.asImmutable()
    previousLikesById = likesById
    return previousLikesByPostId
  }
})()

const groupLikesByPostId = group<string, Like, string>(like => like.postId)
const getLikesByPostId = (likesById) => {
  return groupLikesByPostId(likesById)
}

interface LikeUser { likeId: string, postId: string, userId: string, userName: string }
const attachLikingUser = leftJoin<string, Like, string, User, LikeUser>(
  like => Set([like.userId]),
  (like, users) => ({ likeId: like.id, postId: like.postId, userId: users.get(like.userId).id, userName: users.get(like.userId).name })
)
const getLikeUsers = (likesById, usersById) => {
  return attachLikingUser(likesById, usersById)
}

const groupLikeUsersByPostId = group<string, LikeUser, string>(likeUser => likeUser.postId)
const mapLikeUsersByPostIdToSet = map(toSet())
const getLikeUsersByPostId = (likesById, usersById) => {
  const likeUsersByLikeId = getLikeUsers(likesById, usersById)
  return mapLikeUsersByPostIdToSet(groupLikeUsersByPostId(likeUsersByLikeId))
}

console.log('simpleGetLikesByPostId')
console.log(
  simpleGetLikesByPostId(likesById).toJS()
)

console.log('diffMemGetLikesByPostId')
console.log(
  diffMemGetLikesByPostId(likesById).toJS()
)

console.log('diffMemGetLikesByPostId(likesById_plusone)')
console.log(
  diffMemGetLikesByPostId(likesById_plusone).toJS()
)

console.log('diffMemGetLikesByPostId(likesById_plusone_minusone)')
console.log(
  diffMemGetLikesByPostId(likesById_plusone_minusone).toJS()
)

console.log('likesByPostId')
console.log(
  getLikesByPostId(likesById).toJS()
)

console.log('likesByPostId(likesById_plusone)')
console.log(
  getLikesByPostId(likesById_plusone).toJS()
)

console.log('likesByPostId removed')
console.log(
  getLikesByPostId(likesById.remove('lE')).toJS()
)

console.log('likeUsers')
console.log(
  getLikeUsers(likesById, usersById).toJS()
)

console.log('likeUsersByPostId')
console.log(
  getLikeUsersByPostId(likesById, usersById).toJS()
)

/*
nA --- nB
     / |
   /   |
nD --- nC
*/

// TODO: Make the records diffable too
//const Node = Record({ id: '' })
type Node = ShapedMap<{ id: string }>
const Node = (data) => Map(data)

const nodes = Set([
  Node({id: 'nA'}),
  Node({id: 'nB'}),
  Node({id: 'nC'}),
  Node({id: 'nD'}),
])
const nodesById = Map(nodes.map(node => ([node.get('id'), node])))

//const Edge = Record({ id: '', source: '', target: '' })
type Edge = ShapedMap<{ id: string, source: string, target: string }>
const Edge = (data) => Map(data)

const edges = Set([
  Edge({id: 'eA', source: 'nA', target: 'nB'}),
  Edge({id: 'eB', source: 'nB', target: 'nC'}),
  Edge({id: 'eC', source: 'nC', target: 'nD'}),
  Edge({id: 'eD', source: 'nD', target: 'nB'}),
])
const edgesById = Map(edges.map(edge => ([edge.get('id'), edge])))

type EdgeWithNodes = ShapedMap<{ id: string, source: string, sourceNode: Node, target: string, targetNode: Node }>
const attachSourceAndTarget = leftJoin<string, Edge, string, Node, EdgeWithNodes>(
  edge => Set([edge.get('source'), edge.get('target')]),
  (edge, nodes) => {
    return (edge as EdgeWithNodes)
      .set('sourceNode', nodes.get(edge.get('source')))
      .set('targetNode', nodes.get(edge.get('target')))
  }
)
const isSourceOrTarget = (value, key) => key === 'source' || key === 'target'
const groupBySourceAndTarget = group(filter(isSourceOrTarget))
const leaveNodes = map(map(edgeNode => Set([edgeNode.get('sourceNode'), edgeNode.get('targetNode')])))
const flattenTheNodes = map(flattenMap())
const convertToSet = map(toSet())
const getNeighboursByNodeId_0 = (edgesById, nodesById) => {
  const edgesWithSourceAndTargetById = attachSourceAndTarget(edgesById, nodesById)
  const edgesBySourceAndTarget = groupBySourceAndTarget(edgesWithSourceAndTargetById)
  return convertToSet(flattenTheNodes(leaveNodes(edgesBySourceAndTarget)))
}

console.log('getNeighboursByNodeId_0')
console.log(inspect(
  getNeighboursByNodeId_0(edgesById, nodesById).toJS()
, {depth: 3}))


const attachTargetNode = leftJoin<string, Edge, string, Node, EdgeWithNodes>(
  edge => Set([edge.get('target')]),
  (edge, nodes) => (edge as EdgeWithNodes).set('targetNode', nodes.get(edge.get('target')))
)
const isSource = (value, key) => key === 'source'
const groupBySource = group(filter(isSource))
const leaveTargetNode = map(map(edgeNode => edgeNode.get('targetNode')))
const convertToSet_1 = map(toSet())
const simplify_1 = map(map(node => node.get('id'), {overSet: true}))
const getOutNeighboursByNodeId = (edgesById, nodesById) => {
  const edgesWithTargetById = attachTargetNode(edgesById, nodesById)
  const edgesBySourceAndTarget = groupBySource(edgesWithTargetById)
  return simplify_1(convertToSet_1(leaveTargetNode(edgesBySourceAndTarget)))
}

const attachSourceNode = leftJoin<string, Edge, string, Node, EdgeWithNodes>(
  edge => Set([edge.get('source')]),
  (edge, nodes) => (edge as EdgeWithNodes).set('sourceNode', nodes.get(edge.get('source')))
)
const isTarget = (value, key) => key === 'target'
const groupByTarget = group(filter(isTarget))
const leaveSourceNode = map(map(edgeNode => edgeNode.get('sourceNode')))
const convertToSet_2 = map(toSet())
const simplify_2 = map(map(node => node.get('id'), {overSet: true}))
const getInNeighboursByNodeId = (edgesById, nodesById) => {
  const edgesWithSourceById = attachSourceNode(edgesById, nodesById)
  const edgesBySourceAndTarget = groupByTarget(edgesWithSourceById)
  return simplify_2(convertToSet_2(leaveSourceNode(edgesBySourceAndTarget)))
}

// const combineNeighbours = (inNeighbours, outNeighbours) => (inNeighbours || Set()).union(outNeighbours || Set())
const zipNeighbours = zip(safeUnionSet())
const getNeighboursByNodeId_1 = (edgesById, nodesById) => {
  const inNeighboursByNodeId = getInNeighboursByNodeId(edgesById, nodesById)
  const outNeighboursByNodeId = getOutNeighboursByNodeId(edgesById, nodesById)
  return zipNeighbours(inNeighboursByNodeId, outNeighboursByNodeId)
}

const getNeighboursByNodeId_2 = EvImm.startChain()
  .addStep(
    leftJoin<string, Edge, string, Node, any>(
      edge => Set([edge.get('source'), edge.get('target')]),
      (edge, nodes) => ({ 
        edge,
        sourceNode: nodes.get(edge.get('source')),
        targetNode: nodes.get(edge.get('target'))
      })
    )
  )
  .mapOneToMany({
    sourceByTargetId: EvImm.startChain()
      .addStep(EvImm.group(({ edge }) => edge.get('target')))
      .addStep(EvImm.map(
        EvImm.startChain()
          .addStep(EvImm.map(({ edge, sourceNode }) => sourceNode))
          .addStep(EvImm.toSet())
          .endChain()
      ))
      .endChain(),
    targetBySourceId: EvImm.startChain()
      .addStep(EvImm.group(({ edge }) => edge.get('source')))
      .addStep(EvImm.map(
        EvImm.startChain()
          .addStep(EvImm.map(({ edge, targetNode }) => targetNode))
          .addStep(EvImm.toSet())
          .endChain()
      ))
      .endChain(),
  })
  .mapManyToOne(
    EvImm.zip(EvImm.safeUnionSet()),
    ({ sourceByTargetId }) => sourceByTargetId,
    ({ targetBySourceId }) => targetBySourceId,
  )
  .addStep(EvImm.map(EvImm.mapOverSet((node) => node.get('id'))))
  .endChain()

console.log('getOutNeighboursByNodeId')
console.log(
  getOutNeighboursByNodeId(edgesById, nodesById).toJS()
)

console.log('getInNeighboursByNodeId')
console.log(
  getInNeighboursByNodeId(edgesById, nodesById).toJS()
)

console.log('getNeighboursByNodeId_1')
console.log(
  getNeighboursByNodeId_1(edgesById, nodesById).toJS()
)

console.log('getNeighboursByNodeId_2')
console.log(
  getNeighboursByNodeId_2(edgesById, nodesById).toJS()
)

// Pipeline example - all functions are specializable
const _getLikesByPostId = group<string, Like, string>(like => like.postId)

const _getLikeUsers =
  leftJoin<string, Like, string, User, LikeUser>(
    like => Set([like.userId]),
    (like, users) => ({ likeId: like.id, postId: like.postId, userId: users.get(like.userId).id, userName: users.get(like.userId).name })
  )

const _getLikeUsersByPostId = addStepFunctions(
  _getLikeUsers,
  group<string, LikeUser, string>(likeUser => likeUser.postId),
  map(toSet())
)

const _getLikeUsersByPostIdFromScope = executeOneOnMany(
  _getLikeUsersByPostId,
  (getLikeUsersByPostId, {likesById, usersById} : { likesById: Map<string, Like>, usersById: Map<string, User> }) => 
    getLikeUsersByPostId(likesById, usersById)
)

const mapScopesToLikeUsersByPostId = map(_getLikeUsersByPostIdFromScope)
const scopesOfUsersAndLikes = Map({
  'a': {
    likesById: likesById,
    usersById: usersById,
  },
  'b': {
    likesById: likesById
      .set('lF', {id: 'lF', postId: 'pD', userId: 'uF'}),
    usersById: usersById
      .set('uF', {id: 'uF', name: 'F'}),
  },
})

console.log('getLikesByPostId')
console.log(
  getLikesByPostId(likesById).toJS()
)

console.log('mapScopesToLikeUsersByPostId')
console.log(inspect(
  mapScopesToLikeUsersByPostId(scopesOfUsersAndLikes).toJS()
, { depth: 3 }))