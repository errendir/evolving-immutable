import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { executeManyOnOne, executeOneOnMany } from './functions'

import { EvImmInternals } from './'

let insideOfTheChainExecution = false

// TODO: implement the `claim` method on all Operations so that the unnecessary specializations 
// don't have to be done when Operations are passed to chains or `addStepFunctions`
function _startChain(operations, allowedInsideAChain=false) {
  if(insideOfTheChainExecution && !allowedInsideAChain) {
    throw new Error('Do not create a chain as part of any chain execution')
  }

  const apply: any = (...args) => {
    insideOfTheChainExecution = true
    const [firstOperation, ...restOfOperations] = operations
    let finalResult, error, errorWasThrown = false
    try {
      if(firstOperation !== undefined) {
        finalResult = restOfOperations.reduce(
          (result, functionInstance) => functionInstance(result),
          firstOperation(...args)
        )
      } else {
        finalResult = args[0]
      }
    } catch(err) {
      errorWasThrown = true
      error = err
    }
    insideOfTheChainExecution = false

    if(errorWasThrown === true) {
      throw error
    } 
    return finalResult
  }
  const specialize = () => {
  }
  apply.specialize = () => {
    const newOperations = operations
      .map(operation => operation.specialize ? operation.specialize() : operation)
    return _startChain(newOperations, true)
      .endChain()
  }

  const makeExtendableChain = (childChainConfig={childChain: null, memoizationType: null, historyLength: 0}) => {
    let childChain = childChainConfig.childChain
    let wasAlreadyExtended = false
    const _addStepInThisChain = (operation) => {
      if(!wasAlreadyExtended) {
        operations.push(operation)
        return makeExtendableChain()
      } else {
        // Chain is being reused - need to respecialize and copy all operations except for the last one
        // Chains are right now in a very strange position with regard to mutability
        const newOperations = operations
          .slice(0, operations.length-1)
          .map(operation => operation.specialize ? operation.specialize() : operation)
          .push(operation)
        return _startChain(operations)
      }
    }
    const _addStep = (operation, needsToBeSpecialized=true) => {
      if(childChain !== null) {
        const newChildChain = childChain._addStep(operation, needsToBeSpecialized)
        if(newChildChain !== childChain) {
          return makeExtendableChain({ ...childChainConfig, childChain: newChildChain })
        } else {
          return makeExtendableChain(childChainConfig)
        }
      }
      if(needsToBeSpecialized) {
        operation = operation.specialize ? operation.specialize() : operation
      }
      return _addStepInThisChain(operation)
    }

    const addStep = (operation) => {
      return _addStep(operation, true)
    }

    const memoizeForValue = ({ historyLength=1 } = {}) => {
      if(childChain !== null) {
        const newChildChain = childChain.memoizeForValue({ historyLength })
        if(newChildChain !== childChain) {
          return makeExtendableChain({ ...childChainConfig, childChain: newChildChain })
        } else {
          return makeExtendableChain(childChainConfig)
        }
      }
      childChain = _startChain([], false)
      return makeExtendableChain({ memoizationType: 'value', historyLength, childChain })
    }

    const memoizeForObject = ({ historyLength=1 } = {}) => {
      if(childChain !== null) {
        const newChildChain = childChain.memoizeForObject({ historyLength })
        if(newChildChain !== childChain) {
          return makeExtendableChain({ ...childChainConfig, childChain: newChildChain })
        } else {
          return makeExtendableChain(childChainConfig)
        }
      }
      childChain = _startChain([], false)
      return makeExtendableChain({ memoizationType: 'object', historyLength, childChain })
    }

    const wrapSimpleOperationCreator = (operationCreator) => (...args) => {
      return _addStep(
        operationCreator(...args),
        false,
      )
    }

    const addMapStep = wrapSimpleOperationCreator(EvImmInternals.map)
    const addGroupStep = wrapSimpleOperationCreator(EvImmInternals.group)
    const addFilterStep = wrapSimpleOperationCreator(EvImmInternals.filter)
    const addToSetStep = wrapSimpleOperationCreator(EvImmInternals.toSet)
    const addToMapStep = wrapSimpleOperationCreator(EvImmInternals.toMap)

    const mapManyToOne = (operation, ...extractors) => {
      return _addStep(
        executeOneOnMany(
          operation, (operation, data) => operation(...extractors.map(extractor => extractor(data)))
        ),
        false
      )
    }

    const mapOneToMany = (operationsByName) => {
      return _addStep(
        executeManyOnOne(operationsByName),
        false
      )
    }

    const addLeftJoinStep = (configuration) => {
      return _addStep(
        EvImmInternals.semiPureFunction({
          createMemory: () => ({
            leftJoin: EvImmInternals.leftJoin(
              configuration.mapLeftToSetOfRightKeys,
              configuration.attachLeftWithMapOfRight,
            )
          }),
          executeFunction: ({ leftJoin }, currentValue) => {
            const leftMap = configuration.extractLeftMap(currentValue)
            const rightMap = configuration.extractRightMap(currentValue)
            return leftJoin(leftMap, rightMap)
          }
        }),
        false
      )
    }

    const addZipStep = (configuration) => {
      return _addStep(
        EvImmInternals.semiPureFunction({
          createMemory: () => ({
            zip: EvImmInternals.zip(
              configuration.attach,
            )
          }),
          executeFunction: ({ zip }, currentValue) => {
            const leftMap = configuration.extractLeftMap(currentValue)
            const rightMap = configuration.extractRightMap(currentValue)
            return zip(leftMap, rightMap)
          }
        }),
        false
      )
    }

    const addSafeUnionSetStep = (configuration) => {
      return _addStep(
        EvImmInternals.semiPureFunction({
          createMemory: () => ({
            safeUnionSet: EvImmInternals.safeUnionSet(),
          }),
          executeFunction: ({ safeUnionSet }, currentValue) => {
            const leftMap = configuration.extractLeftMap(currentValue)
            const rightMap = configuration.extractRightMap(currentValue)
            return safeUnionSet(leftMap, rightMap)
          }
        }),
        false
      )
    }

    // TODO: Replace the endChain with the claim process
    // TODO: A chain that was extended but not forked will have a very unexpected behaviour on `.endChain()`
    const endChain = () => {
      if(childChain !== null && childChainConfig.memoizationType === 'value') {
        const endedChildChain = childChain.endChain()
        return _addStepInThisChain(
          EvImmInternals.memoizeForRecentArguments(
            endedChildChain,
            { historyLength: childChainConfig.historyLength }
          )
        ).endChain()
      } 
      if(childChain !== null && childChainConfig.memoizationType === 'object') {
        const endedChildChain = childChain.endChain()
        return _addStepInThisChain(
          EvImmInternals.memoizeForRecentArgumentObject(
            endedChildChain,
            { historyLength: childChainConfig.historyLength }
          )
        ).endChain()
      }
      return apply
    }

    const chain = { 
      _addStep,
      addStep,
      memoizeForValue,
      memoizeForObject,
      mapManyToOne,
      mapOneToMany,
      // All the transformation steps - START
      addLeftJoinStep,
      addMapStep,
      addGroupStep,
      addFilterStep,
      addToSetStep,
      addToMapStep,
      addZipStep,
      addSafeUnionSetStep,
      // All the transformation steps - END
      endChain,
    }
    return chain
  }

  return makeExtendableChain()
}

export function startChain() {
  return _startChain([], false)
}