import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

import { executeManyOnOne, executeOneOnMany } from './functions'

// TODO: implement the `claim` method on all Operations so that the unnecessary specializations 
// don't have to be done when Operations are passed to chains or `composeFunctions`
function _startChain(operations) {
  const apply: any = (...args) => {
    const [firstOperation, ...restOfOperations] = operations
    return restOfOperations.reduce(
      (result, functionInstance) => functionInstance(result),
      firstOperation(...args)
    )
  }

  const makeExtendableChain = () => {
    let wasAlreadyExtended = false
    const compose = (operation) => {
      if(!wasAlreadyExtended) {
        operations.push(operation.specialize ? operation.specialize() : operation)
        return makeExtendableChain()
      } else {
        // Chain is being reused - need to respecialize and copy all operations
        const newOperations = operations
          .slice(0, operations.length-1)
          .map(operation => operation.specialize ? operation.specialize() : operation)
        return _startChain(operations)
      }
    }

    const mapManyToOne = (operation, ...extractors) => {
      return compose(executeOneOnMany(
        operation, (operation, data) => operation(...extractors.map(extractor => extractor(data)))
      ))
    }
    const mapOneToMany = (operationsByName) => {
      return compose(executeManyOnOne(operationsByName))
    }

    // TODO: Replace the endChain with the claim process
    const endChain = () => apply

    const chain = { compose, mapManyToOne, mapOneToMany, endChain }
    return chain
  }

  return makeExtendableChain()
}

export function startChain() {
  return _startChain([])
}