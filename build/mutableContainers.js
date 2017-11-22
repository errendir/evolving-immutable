export const createMutableSet = () => {
    return new Set();
};
export const isMutableSet = (set) => {
    return Set.prototype.isPrototypeOf(set);
};
export const createMutableMap = () => {
    return new Map();
};
export const isMutableMap = (set) => {
    return Map.prototype.isPrototypeOf(set);
};
const noop = () => { };
export const createSpecializingMap = (fn) => {
    const shouldSpecialize = !!fn.specialize;
    if (shouldSpecialize) {
        const currentFnInstances = createMutableMap();
        const deleteFnInstance = (key) => currentFnInstances.delete(key);
        const setFnInstance = (key, value) => currentFnInstances.set(key, value);
        const getFnInstance = key => currentFnInstances.get(key);
        const specializeFn = () => fn.specialize();
        return { deleteFnInstance, setFnInstance, getFnInstance, specializeFn };
    }
    else {
        const deleteFnInstance = noop;
        const setFnInstance = noop;
        const getFnInstance = () => fn;
        const specializeFn = () => fn;
        return { deleteFnInstance, setFnInstance, getFnInstance, specializeFn };
    }
};
