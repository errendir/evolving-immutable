import { inspect } from 'util'

import { Record, Set, Map } from 'immutable'

import { pipelinePiece, unionMap, unionSet, zip, leftJoin, group, map, filter, toSet, toMap } from './transformations'

const posts = Set([
  {id: 'pA'},
  {id: 'pB'},
  {id: 'pC'},
  {id: 'pD'},
])
const postsById = Map(posts.map(post => ([post.id, post])))

const likes = Set([
  {id: 'lA', postId: 'pA', userId: 'uA'},
  {id: 'lB', postId: 'pB', userId: 'uB'},
  {id: 'lC', postId: 'pC', userId: 'uC'},
  {id: 'lD', postId: 'pD', userId: 'uD'},
  {id: 'lE', postId: 'pD', userId: 'uC'},
])
const likesById = Map(likes.map(like => ([like.id, like])))

const users = Set([
  {id: 'uA', name: 'A'},
  {id: 'uB', name: 'B'},
  {id: 'uC', name: 'C'},
  {id: 'uD', name: 'D'},
  {id: 'uE', name: 'E'},
])
const usersById = Map(users.map(user => ([user.id, user])))

const groupLikesByPostId = group(like => like.postId)
const getLikesByPostId = (likesById) => {
  return groupLikesByPostId(likesById)
}

const attachLikingUser = leftJoin(
  like => Map([[like.userId, like.userId]]),
  (like, users) => ({ likeId: like.id, postId: like.postId, userId: users.first().id, userName: users.first().name })
)
const getLikeUsers = (likesById, usersById) => {
  return attachLikingUser(likesById, usersById)
}

const groupLikeUsersByPostId = group(likeUser => likeUser.postId)
const mapLikeUsersByPostIdToSet = map(toSet())
const getLikeUsersByPostId = (likesById, usersById) => {
  const likeUsersByLikeId = getLikeUsers(likesById, usersById)
  return mapLikeUsersByPostIdToSet(groupLikeUsersByPostId(likeUsersByLikeId))
}

console.log('likesByPostId')
console.log(
  getLikesByPostId(likesById).toJS()
)

console.log('likesByPostId added')
console.log(
  getLikesByPostId(likesById.set('lF', {id: 'lF', postId: 'pD', userId: 'uE'})).toJS()
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
const Node = (data) => Map(data)

const nodes = Set([
  Node({id: 'nA'}),
  Node({id: 'nB'}),
  Node({id: 'nC'}),
  Node({id: 'nD'}),
])
const nodesById = Map(nodes.map(node => ([node.get('id'), node])))

//const Edge = Record({ id: '', source: '', target: '' })
const Edge = (data) => Map(data)

const edges = Set([
  Edge({id: 'eA', source: 'nA', target: 'nB'}),
  Edge({id: 'eB', source: 'nB', target: 'nC'}),
  Edge({id: 'eC', source: 'nC', target: 'nD'}),
  Edge({id: 'eD', source: 'nD', target: 'nB'}),
])
const edgesById = Map(edges.map(edge => ([edge.get('id'), edge])))

// const attachSourceAndTarget = leftJoin(
//   edge => Set([edge.get('source'), edge.get('target')]),
//   (edge, nodes) => {
//     // TODO: Find a better way of doing it (return a Map from the joining fn?)
//     let sourceNode, targetNode
//     if(nodes.first().get('id') === edge.get('source')) {
//       sourceNode = nodes.first()
//       targetNode = nodes.last()
//     } else {
//       sourceNode = nodes.last()
//       targetNode = nodes.fist()
//     }
//     return edge
//       .set('sourceNode', sourceNode)
//       .set('targetNode', targetNode)
//   }
// )
// const isSourceOrTarget = (value, key) => key === 'source' || key === 'target'
// const groupBySourceAndTarget = group(filter(isSourceOrTarget))
// const leaveNodes = map(map(edgeNode => Set([edgeNode.get('sourceNode'), edgeNode.get('targetNode')])))
// const convertToSet = map(toSet())
// const getEdgesByNodeId = (edgesById) => {
//   const edgesWithSourceAndTargetById = attachSourceAndTarget(edgesById, nodesById)
//   const edgesBySourceAndTarget = groupBySourceAndTarget(edgesWithSourceAndTargetById)
//   return convertToSet(leaveNodes(edgesBySourceAndTarget))
// }
//
// console.log('getEdgesByNodeId')
// console.log(
//   getEdgesByNodeId(edgesById)
// )


const attachTargetNode = leftJoin(
  edge => Set([edge.get('target')]),
  (edge, nodes) => edge.set('targetNode', nodes.first())
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

const attachSourceNode = leftJoin(
  edge => Set([edge.get('source')]),
  (edge, nodes) => edge.set('sourceNode', nodes.first())
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

// We are using a specializable `combineNeighbours` as the zip attach function, so we can diff-mem each union
const combineNeighbours = pipelinePiece({
  createPipeline: () => ({
    unionInAndOutNeighbours: unionSet(),
    emptySet: Set(),
  }),
  executePipeline: ({ unionInAndOutNeighbours, emptySet }, inNeighbours, outNeighbours) => {
    return unionInAndOutNeighbours(inNeighbours || emptySet, outNeighbours || emptySet)
  }
})
// const combineNeighbours = (inNeighbours, outNeighbours) => (inNeighbours || Set()).union(outNeighbours || Set())
const zipNeighbours = zip(combineNeighbours)
const getNeighboursByNodeId = (edgesById, nodesById) => {
  const inNeighboursByNodeId = getInNeighboursByNodeId(edgesById, nodesById)
  const outNeighboursByNodeId = getOutNeighboursByNodeId(edgesById, nodesById)
  return zipNeighbours(inNeighboursByNodeId, outNeighboursByNodeId)
}


console.log('getOutNeighboursByNodeId')
console.log(
  getOutNeighboursByNodeId(edgesById, nodesById).toJS()
)

console.log('getInNeighboursByNodeId')
console.log(
  getInNeighboursByNodeId(edgesById, nodesById).toJS()
)

console.log('getNeighboursByNodeId')
console.log(
  getNeighboursByNodeId(edgesById, nodesById).toJS()
)

// Pipeline example - all functions are specializable
const _getLikesByPostId = pipelinePiece({
  createPipeline: () => ({
    groupLikesByPostId: group(like => like.postId)
  }),
  executePipeline: ({ groupLikesByPostId }, likesById) => {
    return groupLikesByPostId(likesById)
  }
})

const _getLikeUsers = pipelinePiece({
  createPipeline: () => ({
    attachLikingUser: leftJoin(
      like => Map([[like.userId, like.userId]]),
      (like, users) => ({ likeId: like.id, postId: like.postId, userId: users.first().id, userName: users.first().name })
    )
  }),
  executePipeline: ({ attachLikingUser }, likesById, usersById) => {
    return attachLikingUser(likesById, usersById)
  }
})

const _getLikeUsersByPostId = pipelinePiece({
  createPipeline: () => ({
    getLikeUsers: _getLikeUsers.specialize(),
    groupLikeUsersByPostId: group(likeUser => likeUser.postId),
    mapLikeUsersByPostIdToSet: map(toSet()),
  }),
  executePipeline: ({ getLikeUsers, groupLikeUsersByPostId, mapLikeUsersByPostIdToSet }, likesById, usersById) => {
    const likeUsersByLikeId = getLikeUsers(likesById, usersById)
    return mapLikeUsersByPostIdToSet(groupLikeUsersByPostId(likeUsersByLikeId))
  }
})

const _getLikeUsersByPostIdFromScope = pipelinePiece({
  createPipeline: () => ({
    getLikeUsersByPostId: _getLikeUsersByPostId.specialize()
  }),
  executePipeline: ({getLikeUsersByPostId}, {likesById, usersById}) => {
    return getLikeUsersByPostId(likesById, usersById)
  }
})

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