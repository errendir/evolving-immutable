import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { executeManyOnOne, executeOneOnMany } from './functions'

import { EvImmInternals } from './'

let insideOfTheChainExecution = false

// TODO: implement the `claim` method on all Operations so that the unnecessary specializations 
// don't have to be done when Operations are passed to chains or `addStepFunctions`
function _startChain(operations, allowedInsideAChain=false, parentChain=null) {
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
      const newOperations = operations
        .map(operation => operation.specialize ? operation.specialize() : operation)
      return _startChain(newOperations, true)
    }
    apply.specialize = () => specialize().endChain()

  const makeExtendableChain = () => {
    let childChain = null
    let mfVHL = 0
    let mfOHL = 0
    let wasAlreadyExtended = false
    const _addStep = (operation, needsToBeSpecialized=true) => {
      if(childChain !== null) {
        throw new Error('Only the child chain can be extended')
      }
      if(needsToBeSpecialized) {
        operation = operation.specialize ? operation.specialize() : operation
      }
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

    const addStep = (operation) => {
      return _addStep(operation, true)
    }

    const memoizeForValue = ({ historyLength=1 } = {}) => {
      if(childChain !== null) {
        throw new Error('Only the child chain can be extended')
      }
      childChain = _startChain([], false, chain)
      mfVHL = historyLength
      return childChain
    }

    const memoizeForObject = ({ historyLength=1 } = {}) => {
      if(childChain !== null) {
        throw new Error('Only the child chain can be extended')
      }
      childChain = _startChain([], false, chain)
      mfOHL = historyLength
      return childChain
    }

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

    const addMapStep = (fn) => {
      return _addStep(
        EvImmInternals.map(fn),
        false
      )
    }

    const addGroupStep = (fn) => {
      return _addStep(
        EvImmInternals.group(fn),
        false
      )
    }

    const addFilterStep = (fn) => {
      return _addStep(
        EvImmInternals.filter(fn),
        false
      )
    }

    const addToSetStep = () => {
      return _addStep(
        EvImmInternals.toSet(),
        false
      )
    }

    const addToMapStep = (fn) => {
      return _addStep(
        EvImmInternals.toMap(fn),
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
      if(parentChain) return parentChain.endChain()
      if(childChain && mfVHL > 0) {
        const endedChildChain = childChain.__apply
        childChain = null
        return _addStep(
          EvImmInternals.memoizeForRecentArguments(
            endedChildChain,
            { historyLength: mfVHL }
          ),
          false
        ).endChain()
      } 
      if(childChain && mfOHL > 0) {
        const endedChildChain = childChain.__apply
        childChain = null
        return _addStep(
          EvImmInternals.memoizeForRecentArgumentObject(
            endedChildChain,
            { historyLength: mfOHL }
          ),
          false
        ).endChain()
      }
      return apply
    }

    const chain = { 
      __apply: apply,
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
      specialize,
      endChain,
    }
    return chain
  }

  return makeExtendableChain()
}

export function startChain() {
  return _startChain([], false)
}