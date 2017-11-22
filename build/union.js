import { Set, Map } from 'immutable';
// @ts-ignore
import { semiPureFunction } from './functions';
import { wrapDualDiffProcessor } from './wrapDiffProcessor';
import { createMutableMap } from './mutableContainers';
export function safeUnionMap() {
    return semiPureFunction({
        createMemory: () => ({
            union: unionMap(),
            emptyMap: Map(),
        }),
        executeFunction: ({ union, emptyMap }, leftMap, rightMap) => {
            return union(leftMap || emptyMap, rightMap || emptyMap);
        }
    });
}
export function safeUnionSet() {
    return semiPureFunction({
        createMemory: () => ({
            union: unionSet(),
            emptySet: Set(),
        }),
        executeFunction: ({ union, emptySet }, leftSet, rightSet) => {
            return union(leftSet || emptySet, rightSet || emptySet);
        }
    });
}
export function unionSet() {
    let currentValue = Set();
    let currentLeftArgument = Set();
    let currentRightArgument = Set();
    const apply = (newLeftArgument, newRightArgument) => {
        const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument);
        const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument);
        let newValue = currentValue;
        leftArgumentDiff.removed.forEach(leftValue => {
            if (!currentRightArgument.has(leftValue)) {
                newValue = newValue.remove(leftValue);
            }
        });
        leftArgumentDiff.added.forEach(leftValue => {
            if (!currentRightArgument.has(leftValue)) {
                newValue = newValue.add(leftValue);
            }
        });
        rightArgumentDiff.removed.forEach(rightValue => {
            if (!newLeftArgument.has(rightValue)) {
                newValue = newValue.remove(rightValue);
            }
        });
        rightArgumentDiff.added.forEach(rightValue => {
            if (!newLeftArgument.has(rightValue)) {
                newValue = newValue.add(rightValue);
            }
        });
        currentValue = newValue;
        currentLeftArgument = newLeftArgument;
        currentRightArgument = newRightArgument;
        return newValue;
    };
    const specialize = () => {
        return unionSet();
    };
    apply.specialize = specialize;
    return apply;
}
export const unionMapDiffProcessor = () => {
    let presentLeft = createMutableMap();
    let presentRight = createMutableMap();
    const diffProcessor = ({ remove, add, update }) => ([
        {
            remove: (leftValue, key) => {
                presentLeft.delete(key);
                const rightValue = presentRight.get(key);
                if (rightValue === undefined) {
                    remove(leftValue, key);
                }
            },
            add: (leftValue, key) => {
                presentLeft.set(key, leftValue);
                const rightValue = presentRight.get(key);
                if (rightValue === undefined) {
                    add(leftValue, key);
                }
            },
            update: (prevNext, key) => {
                presentLeft.set(key, prevNext.next);
                const rightValue = presentRight.get(key);
                if (rightValue === undefined) {
                    update(prevNext, key);
                }
            },
        },
        {
            remove: (rightValue, key) => {
                presentRight.delete(key);
                const leftValue = presentLeft.get(key);
                if (leftValue === undefined) {
                    remove(rightValue, key);
                }
                else {
                    update({ prev: rightValue, next: leftValue }, key);
                }
            },
            add: (rightValue, key) => {
                presentRight.set(key, rightValue);
                const leftValue = presentLeft.get(key);
                if (leftValue === undefined) {
                    add(rightValue, key);
                }
                else {
                    update({ prev: leftValue, next: rightValue }, key);
                }
            },
            update: (prevNext, key) => {
                presentRight.set(key, prevNext.next);
                update(prevNext, key);
            },
        }
    ]);
    const specialize = () => {
        return unionMapDiffProcessor();
    };
    return {
        diffProcessor,
        specialize,
    };
};
export function unionMap() {
    return wrapDualDiffProcessor(unionMapDiffProcessor());
}
