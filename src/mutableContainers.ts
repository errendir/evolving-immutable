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