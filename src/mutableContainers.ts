export const createMutableSet = () => {
  return new Set()
}

export const isMutableSet = (set) => {
  return Set.prototype.isPrototypeOf(set)
}

export const createMutableMap = () => {
  return new Map()
}

export const isMutableMap = (set) => {
  return Map.prototype.isPrototypeOf(set)
}

const noop: (...args: any[]) => void = () => {}
export const createSpecializingMap = <K, T extends { specialize?: () => T }>(fn: T) => {
  const shouldSpecialize = !!fn.specialize
  
  if(shouldSpecialize) {
    const currentFnInstances = createMutableMap()
    const deleteFnInstance = (key: K) => currentFnInstances.delete(key)
    const setFnInstance = (key, value) => currentFnInstances.set(key, value)
    const getFnInstance: (key: K) => T = key => currentFnInstances.get(key)
    const specializeFn: () => T = () => (fn as any).specialize() 
    
    return { deleteFnInstance, setFnInstance, getFnInstance, specializeFn }
  } else {
    const deleteFnInstance: (key: K) => void = noop
    const setFnInstance: (key: K, value: T) => void = noop
    const getFnInstance: (key: K) => T = () => fn
    const specializeFn: () => T = () => fn

    return { deleteFnInstance, setFnInstance, getFnInstance, specializeFn }
  }
}