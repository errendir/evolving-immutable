import { Record, Map, Set } from 'immutable'

import * as EvImm from '../src/'

const shouldLogTimeline = false

const emptyMap = Map<any, any>()

// Connection

export const CHILD_LABEL_CLIENT_ID = '1e20b00f-692e-4f58-b2fe-bd7494f85269.6ce0ac52-d346-4758-8967-975a4f50346e'
export const CHILD_LABEL_ID = 1
export const EMPTY_LABEL_CLIENT_ID = 'e795d425-7ff6-43f1-a224-277a4f2a130b.f8f38803-3555-4ffd-aef5-cc229dd97d25'
export const EMPTY_LABEL_ID = 2

const ConnectionDefaultValues = {
  id: undefined,
  clientId: '',
  sourceClientId: '',
  targetClientId: '',
  // label: '',
  labelId: EMPTY_LABEL_ID,
  labelClientId: EMPTY_LABEL_CLIENT_ID,
  colorId: undefined,
  isDeleted: false,
  completed: false,
  // directionType: types.DIRECTED,
  type: 'connection',
}

class ConnectionRecord extends Record(ConnectionDefaultValues) {
  isChildConnection() {
    // TODO: Get rid of the labelId completely
    return this.get('labelClientId') === CHILD_LABEL_CLIENT_ID || this.get('labelId') === CHILD_LABEL_ID
  }

  getOtherEndOfConnection(ideaClientId) {
    if (this.get('sourceClientId') === ideaClientId)
      return this.get('targetClientId');

    if (this.get('targetClientId') === ideaClientId)
      return this.get('sourceClientId');

    throw new Error('Suppliend ideaClientId is not either endpoint of the connection')
  }

  getClientId() {
    return this.get('clientId')
    // return this.get(keys.CLIENT_ID)
  }
}

export const getAllKnownCCC = (state) => state.get('connectionsInCurrentBoard')

const _getAllActiveCCC = EvImm.startChain({ logTimeline: shouldLogTimeline, name: 'Connection.ts#_getAllActiveCCC' })
  .memoizeForValue()
  .addStep(getAllKnownCCC)
  .memoizeForValue()
  .addFilterStep(connection => !connection.get('isDeleted'))
  .endChain()
export const getAllActiveCCC = (state) =>
  _getAllActiveCCC(state)

const _getAllInCurrentBoardCCC = EvImm.startChain({ logTimeline: shouldLogTimeline, name: 'Connection.ts#_getAllInCurrentBoardCCC' })
  .memoizeForValue()
  .mapOneToMany({
    allIdeasOnCurrentBoardByClientId: (state) => getAllInCurrentBoardIII(state),
    allKnownConnectionsByClientId: (state) => getAllActiveCCC(state),
  })
  .memoizeForObject()
  .addLeftJoinStep({
    mapLeftToSetOfRightKeys: (connection) =>
      ([connection.get('sourceClientId'), connection.get('targetClientId')]),
    attachLeftWithMapOfRight: (connection, ideas) => ({
      connection,
      targetIdea: ideas.get(connection.get('targetClientId')),
      sourceIdea: ideas.get(connection.get('sourceClientId'))
    }),
    extractLeftMap: ({ allKnownConnectionsByClientId }) => allKnownConnectionsByClientId,
    extractRightMap: ({ allIdeasOnCurrentBoardByClientId }) => allIdeasOnCurrentBoardByClientId,
  })
  .addFilterStep(({ connection, targetIdea, sourceIdea }) =>
    !connection.get('isDeleted') && (targetIdea !== undefined) && (sourceIdea !== undefined)
  )
  .addMapStep(({ connection }) => connection)
  .endChain()

export const getAllInCurrentBoardCCC = (state) =>
  _getAllInCurrentBoardCCC(state)


const _getActiveConnectionsWithEndpointIdeas = EvImm.startChain({ logTimeline: shouldLogTimeline, name: '_getActiveConnectionsWithEndpointIdeas' })
  .memoizeForValue()
  .mapOneToMany({
    connectionsByClientId: (state) => getAllInCurrentBoardCCC(state),
    ideasByClientId: (state) => getAllInCurrentBoardIII(state)
  })
  .memoizeForObject()
  .addLeftJoinStep/*<string, ConnectionShapedMap, string, IdeaShapedMap, ConnectionWithEndpointIdeas>*/({
    mapLeftToSetOfRightKeys: connection => ([connection.get('targetClientId'), connection.get('sourceClientId')]),
    attachLeftWithMapOfRight: (connection, ideas) => ({
      connection,
      targetIdea: ideas.get(connection.get('targetClientId')),
      sourceIdea: ideas.get(connection.get('sourceClientId'))
    }),
    extractLeftMap: ({ connectionsByClientId }) => connectionsByClientId,
    extractRightMap: ({ ideasByClientId }) => ideasByClientId
  })
  // There could be connections with endpoint ideas missing in the state
  .addFilterStep(({ connection, targetIdea, sourceIdea }) =>
    connection !== undefined && targetIdea !== undefined && sourceIdea !== undefined
  )
  .endChain()

export const getActiveConnectionsWithEndpointIdeas = (state) => {
  return _getActiveConnectionsWithEndpointIdeas(state)
}

const _getConnectionsWithEndpointsByEndpoint = (endpoint, oppositeEndpoint) => EvImm.startChain({ logTimeline: shouldLogTimeline, name: '_getConnectionsWithEndpointsByEndpoint_' + endpoint })
  .memoizeForValue()
  .addStep((state) => getActiveConnectionsWithEndpointIdeas(state))
  .memoizeForValue()
  .addMapStep((connectionWithEndpoints) => ({ ...connectionWithEndpoints, otherIdea: connectionWithEndpoints[oppositeEndpoint] }))
  .addGroupStep((connectionWithEndpoints) => connectionWithEndpoints[endpoint].get('clientId'))
  .endChain()

const _getConnectionsWithEndpointsBySourceClientId = _getConnectionsWithEndpointsByEndpoint('sourceIdea', 'targetIdea')
const _getConnectionsWithEndpointsByTargetClientId = _getConnectionsWithEndpointsByEndpoint('targetIdea', 'sourceIdea')

const _getConnectionsWithEndpointsByRelatedIdeaClientId = EvImm.startChain({ logTimeline: shouldLogTimeline, name: '_getConnectionsWithEndpointsByRelatedIdeaClientId' })
  .memoizeForValue()
  .mapOneToMany({
    connectionsWithEndpointsBySourceClientId: _getConnectionsWithEndpointsBySourceClientId,
    connectionsWithEndpointsByTargetClientId: _getConnectionsWithEndpointsByTargetClientId,
  })
  .addZipStep({
    attach: EvImm.safeUnionMap(),
    extractLeftMap: ({ connectionsWithEndpointsBySourceClientId }) => connectionsWithEndpointsBySourceClientId,
    extractRightMap: ({ connectionsWithEndpointsByTargetClientId }) => connectionsWithEndpointsByTargetClientId
  })
  .endChain()

export const getConnectionsWithEndpointsByRelatedIdeaClientId = (state) =>
  _getConnectionsWithEndpointsByRelatedIdeaClientId(state)

// Idea

export const getAllKnownIII = (state) => state.get('ideasInCurrentBoard')

export const getCurrentBoardIdeaClientId = (state) => state.get('board').get('clientId')

const _getAllActiveIII = EvImm.startChain({ logTimeline: shouldLogTimeline, name: '_getAllActive' })
  .memoizeForValue()
  .addStep(getAllKnownIII)
  .memoizeForValue()
  .addFilterStep(idea => !idea.get('isDeleted'))
  .endChain()
export const getAllActiveIII = (state) =>
  _getAllActiveIII(state)

// interface ConnectionWithTargetIdea { connection: any, targetIdea: any }
// interface ConnectionWithSourceIdea { connection: any, targetIdea: any }
const _getChildIdeasByIdeaClientId = EvImm.startChain({ logTimeline: shouldLogTimeline, name: '_getChildIdeasByIdeaClientId' })
  .memoizeForValue()
  .mapOneToMany({
    ideas: (state) => getAllActiveIII(state),
    parentChildConnections: EvImm.startChain({ logTimeline: shouldLogTimeline, name: 'parentChildConnections' })
      .addStep((state) => getAllActiveCCC(state))
      .memoizeForValue()
      .addFilterStep(connection =>
        connection.isChildConnection() && connection.get('sourceClientId') !== connection.get('targetClientId')
      )
      .endChain()
  })
  .memoizeForObject()
  .addLeftJoinStep({
    mapLeftToSetOfRightKeys: connection => ([connection.get('targetClientId')]),
    attachLeftWithMapOfRight: (connection, ideas) => ({ connection, targetIdea: ideas.get(connection.get('targetClientId')) }),
    extractLeftMap: ({ parentChildConnections }) => parentChildConnections,
    extractRightMap: ({ ideas }) => ideas
  })
  .addFilterStep(
    ({ targetIdea }) => targetIdea !== undefined
  )
  .addGroupStep(
    ({ connection }) => connection.get('sourceClientId')
  )
  .memoizeForValue()
  .addMapStep(
    EvImm.startChain()
      .addMapStep(({ targetIdea }) => targetIdea)
      .addReindexMapStep(idea => idea.get('clientId'))
      .endChain()
  )
  .endChain()

export const getChildIdeasByIdeaClientId = (state) =>
  _getChildIdeasByIdeaClientId(state)

const _getAllInCurrentBoardIII = EvImm.startChain({ logTimeline: shouldLogTimeline, name: 'Idea.ts#_getAllInCurrentBoardIII' })
  .memoizeForValue()
  .mapOneToMany({
    childIdeasByIdeaClientId: (state) => getChildIdeasByIdeaClientId(state),
    currentBoardClientId: (state) => getCurrentBoardIdeaClientId(state),
  })
  .memoizeForObject()
  .addStep(({ childIdeasByIdeaClientId, currentBoardClientId }) => {
    return childIdeasByIdeaClientId.get(currentBoardClientId) || emptyMap
  })
  .endChain()

export const getAllInCurrentBoardIII = (state) =>
  _getAllInCurrentBoardIII(state)

const _getRelatedIdeasOrNothingByIdeaClientId = EvImm.startChain({ logTimeline: shouldLogTimeline, name: '_getRelatedIdeasOrNothingByIdeaClientId' })
  .addStep(getConnectionsWithEndpointsByRelatedIdeaClientId)
  .memoizeForValue()
  .addMapStep(
  EvImm.startChain(/*{ logTimeline: shouldLogTimeline, name: '_getRelatedIdeasOrNothingByIdeaClientId_map'}*/)
    .addMapStep(({ otherIdea }) => otherIdea)
    .addReindexMapStep(idea => idea.get('clientId'))
    .endChain()
  )
  .endChain()

const _getRelatedIdeasByIdeaClientId = EvImm.startChain({ logTimeline: shouldLogTimeline, name: '_getRelatedIdeasByIdeaClientId' })
  .memoizeForValue()
  .mapOneToMany({
    relatedIdeasOrNothingByIdeaClientId: (state) => _getRelatedIdeasOrNothingByIdeaClientId(state),
    emptyMapByIdeaClientId: EvImm.startChain()
      .addStep((state) => getAllInCurrentBoardIII(state))
      .memoizeForValue()
      .addStep(EvImm.map(_idea => emptyMap))
      .endChain(),
  })
  .memoizeForObject()
  .addLeftJoinStep({
    mapLeftToSetOfRightKeys: (_emptyMap, clientId) => ([clientId]),
    attachLeftWithMapOfRight: (emptyMap, wrappedMapOfRelated, clientId) => {
      return wrappedMapOfRelated.get(clientId) || emptyMap
    },
    extractLeftMap: ({ emptyMapByIdeaClientId }) => emptyMapByIdeaClientId,
    extractRightMap: ({ relatedIdeasOrNothingByIdeaClientId }) => relatedIdeasOrNothingByIdeaClientId
  })
  .endChain()

export const getRelatedIdeasByIdeaClientId = (state) =>
  _getRelatedIdeasByIdeaClientId(state)

const rawState = require('../state-snapshot')

const subMapNames = ['ideasInCurrentBoard', 'connectionsInCurrentBoard', 'comments', 'likes', 'labels', 'colors', 'attributes', 'users', 'ideasMetadata', 'graphLayoutsMetadata', 'graphLayouts', 'documents']
for(let subMapName of subMapNames) {
  rawState[subMapName] = Map(rawState[subMapName]).map(object => Map(object as any))
}
rawState['connectionsInCurrentBoard'] = rawState['connectionsInCurrentBoard'].map(
  connection => new ConnectionRecord(connection)
)
rawState['board'] = Map(rawState['board'])

const state = Map(rawState)

console.profile && console.profile('getRelatedIdeasByIdeaClientId')
console.time && console.time('getRelatedIdeasByIdeaClientId')
getRelatedIdeasByIdeaClientId(state)
console.time && console.timeEnd('getRelatedIdeasByIdeaClientId')
console.profile && console.profileEnd()