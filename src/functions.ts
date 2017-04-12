import { Set, OrderedSet, Map, Iterable, List, Record } from 'immutable'

const objectMap = (object, fn) => {
  const mappedObject = {}
  Object.keys(object).forEach(key => mappedObject[key] = fn(object[key], key))
  return mappedObject
}

export const executeManyOnOne = (functionsByName) => {
  return semiPureFunction({
    createMemory: () => ({
      functionInstancesByName: objectMap(functionsByName, fn => fn.specialize ? fn.specialize() : fn)
    }),
    executeFunction: ({ functionInstancesByName }, ...args) => {
      return objectMap(functionInstancesByName, (functionInstance) => functionInstance(...args))
    }
  })
}

export const executeOneOnMany = (fn, caller) => {
  return semiPureFunction({
    createMemory: () => ({
      fnInstance: fn.specialize ? fn.specialize() : fn,
      callerInstance: caller.specialize ? caller.specialize() : caller,
    }),
    executeFunction: ({ fnInstance, callerInstance }, ...args) => {
      return callerInstance(fnInstance, ...args)
    }
  })
}

export const memoizeForSlots = ({ computeSlot, executeFunction }) => {
  return semiPureFunction({
    createMemory: () => ({
      computeSlotInstance: computeSlot.specialize ? computeSlot.specialize() : computeSlot,
      functionInstanceBySlot: Map<any,any>().asMutable(),
    }),
    executeFunction: ({ computeSlotInstance, functionInstanceBySlot }, ...args) => {
      const slot = computeSlotInstance(...args)
      let functionInstance = functionInstanceBySlot.get(slot)
      if(!functionInstance) {
        functionInstance = executeFunction.specialize ? executeFunction.specialize() : executeFunction
        functionInstanceBySlot.set(slot, functionInstance)
      }
      return functionInstance(...args)
    }
  })
}

export const memoizeForRecentArguments = (executeFunction, { historyLength=1 }={}) => {
  return semiPureFunction({
    createMemory: () => ({
      recentArgumentsValues: [] as { value: any, arguments: any }[],
      executeFunction: executeFunction.specialize ? executeFunction.specialize() : executeFunction
    }),
    executeFunction: ({ recentArgumentsValues, executeFunction }, ...args) => {
      const pastArgumentsValue = recentArgumentsValues
        .find(({ arguments: recentArguments }) => {
          if(recentArguments.length !== args.length) return false
          for(let i=0; i<recentArguments.length; ++i) {
            if(recentArguments[i] !== args[i]) return false
          }
          return true
        })
      if(pastArgumentsValue !== undefined) {
        return pastArgumentsValue.value
      } else {
        const newValue = executeFunction(...args)
        while (recentArgumentsValues.length >= historyLength) {
          recentArgumentsValues.shift()
        }
        recentArgumentsValues.push({ arguments: args, value: newValue })
        return newValue
      }
    }
  })
}

interface SemiPureConfiguration<M, A, R> {
  createMemory: () => M,
  executeFunction: (memory: M, ...args: A[]) => R,
}
interface SemiPureOperation<M, A, R> {
  (...args: A[]): R,
  specialize: () => SemiPureOperation<M, A, R>
}
export function semiPureFunction<M, A, R>(
  { createMemory, executeFunction } : SemiPureConfiguration<M, A, R>
) : SemiPureOperation<M, A, R> {
  const pipeline = createMemory()

  const apply: any = (...args) => {
    return executeFunction(pipeline, ...args)
  }

  const specialize = () => {
    return semiPureFunction<M, A, R>({ createMemory, executeFunction })
  }
  apply.specialize = specialize

  return apply
}

export const addStepFunctions = (...functions) => {
  return semiPureFunction({
    createMemory: () => ({
      functionInstances: functions.map(fn => fn.specialize ? fn.specialize() : fn)
    }),
    executeFunction: ({ functionInstances: [firstFunctionInstance, ...restOfFunctionInstances] }, ...args) => {
      return restOfFunctionInstances.reduce(
        (result, functionInstance) => functionInstance(result),
        firstFunctionInstance(...args)
      )
    }
  })
}