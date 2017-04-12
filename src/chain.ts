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
      finalResult = restOfOperations.reduce(
        (result, functionInstance) => functionInstance(result),
        firstOperation(...args)
      )
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
      .endChain()
  }
  apply.specialize = specialize

  const makeExtendableChain = () => {
    let wasAlreadyExtended = false
    const _addStep = (operation, needsToBeSpecialized=true) => {
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
    const endChain = () => apply

    const chain = { 
      addStep,
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