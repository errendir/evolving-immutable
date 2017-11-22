import { Map } from 'immutable';
import { createMutableMap, createMutableSet, createSpecializingMap } from './mutableContainers';
const emptyIterable = [];
export function leftJoin(mapLeftToSetOfRightKeys, attachLeftWithMapOfRight) {
    let currentValue = Map().asMutable();
    let currentLeftArgument = Map();
    let currentRightArgument = Map();
    const currentMapLeftToRightKeysInstances = createSpecializingMap(mapLeftToSetOfRightKeys);
    const currentAttachInstances = createSpecializingMap(attachLeftWithMapOfRight);
    let rightKeyToLeftKeys = createMutableMap();
    let leftKeyToMapOfRight = createMutableMap();
    let rightValueByKey = createMutableMap();
    const apply = (newLeftArgument, newRightArgument) => {
        const leftArgumentDiff = newLeftArgument.diffFrom(currentLeftArgument);
        const rightArgumentDiff = newRightArgument.diffFrom(currentRightArgument);
        let newValue = currentValue;
        rightArgumentDiff.removed.forEach((_rightValue, rightKey) => {
            rightValueByKey.delete(rightKey);
            const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable;
            rightKeyToLeftKeys.delete(rightKey);
            allLeftKeys.forEach((leftKey) => {
                const mapOfRight = leftKeyToMapOfRight.get(leftKey);
                mapOfRight.delete(rightKey);
                const attachInstance = currentAttachInstances.getFnInstance(leftKey);
                // Use the currentLeftArgument, since the leftElements are updated in the last three loops
                newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), mapOfRight, leftKey));
            });
        });
        rightArgumentDiff.added.forEach((rightValue, rightKey) => {
            rightValueByKey.set(rightKey, rightValue);
            const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable;
            allLeftKeys.forEach(leftKey => {
                let mapOfRight = leftKeyToMapOfRight.get(leftKey);
                if (!mapOfRight) {
                    mapOfRight = createMutableMap();
                    leftKeyToMapOfRight.set(leftKey, mapOfRight);
                }
                mapOfRight.set(rightKey, rightValue);
                const attachInstance = currentAttachInstances.getFnInstance(leftKey);
                newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), mapOfRight, leftKey));
            });
        });
        rightArgumentDiff.updated.forEach(({ prev: _prev, next }, rightKey) => {
            //console.log('update', { prev, next }, rightKey, next.diffFrom && next.diffFrom(prev))
            rightValueByKey.set(rightKey, next);
            const allLeftKeys = rightKeyToLeftKeys.get(rightKey) || emptyIterable;
            allLeftKeys.forEach(leftKey => {
                const mapOfRight = leftKeyToMapOfRight.get(leftKey);
                mapOfRight.set(rightKey, next);
                const attachInstance = currentAttachInstances.getFnInstance(leftKey);
                //console.log('attaching', currentLeftArgument.get(leftKey), 'with', Array.from(mapOfRight))
                newValue.set(leftKey, attachInstance(currentLeftArgument.get(leftKey), mapOfRight, leftKey));
            });
        });
        leftArgumentDiff.removed.forEach((_value, leftKey) => {
            currentMapLeftToRightKeysInstances.deleteFnInstance(leftKey);
            currentAttachInstances.deleteFnInstance(leftKey);
            leftKeyToMapOfRight.get(leftKey).forEach((_rightValue, rightKey) => {
                const leftKeys = rightKeyToLeftKeys.get(rightKey);
                leftKeys.delete(leftKey);
            });
            leftKeyToMapOfRight.delete(leftKey);
            newValue.remove(leftKey);
        });
        leftArgumentDiff.added.forEach((value, key) => {
            const mapLeftToSetOfRightKeysInstance = currentMapLeftToRightKeysInstances.specializeFn();
            const attachInstance = currentAttachInstances.specializeFn();
            const rightKeys = mapLeftToSetOfRightKeysInstance(value, key);
            // TODO: Optionally diff-mem the following map! Also make sure undefined doesn't land there
            const mapOfRight = createMutableMap();
            rightKeys.forEach(rightKey => {
                const leftKeys = rightKeyToLeftKeys.get(rightKey);
                if (!leftKeys) {
                    rightKeyToLeftKeys.set(rightKey, createMutableSet().add(key));
                }
                else {
                    leftKeys.add(key);
                }
                mapOfRight.set(rightKey, rightValueByKey.get(rightKey));
            });
            leftKeyToMapOfRight.set(key, mapOfRight);
            currentMapLeftToRightKeysInstances.setFnInstance(key, mapLeftToSetOfRightKeysInstance);
            currentAttachInstances.setFnInstance(key, attachInstance);
            newValue.set(key, attachInstance(value, mapOfRight, key));
        });
        leftArgumentDiff.updated.forEach(({ prev, next }, leftKey) => {
            const mapLeftToSetOfRightKeysInstance = currentMapLeftToRightKeysInstances.getFnInstance(leftKey);
            const attachInstance = currentAttachInstances.getFnInstance(leftKey);
            const prevRightKeys = mapLeftToSetOfRightKeysInstance(prev, leftKey);
            const nextRightKeys = mapLeftToSetOfRightKeysInstance(next, leftKey);
            let mapOfRight = leftKeyToMapOfRight.get(leftKey);
            prevRightKeys.forEach(rightKey => {
                mapOfRight.delete(rightKey);
                const leftKeys = rightKeyToLeftKeys.get(rightKey);
                if (!!leftKeys) {
                    // TODO: ensure this is always set so the check is unnecessary
                    leftKeys.delete(leftKey);
                }
            });
            nextRightKeys.forEach(rightKey => {
                mapOfRight.set(rightKey, rightValueByKey.get(rightKey));
                const leftKeys = rightKeyToLeftKeys.get(rightKey);
                if (!leftKeys) {
                    rightKeyToLeftKeys.set(rightKey, createMutableSet().add(leftKey));
                }
                else {
                    leftKeys.add(leftKey);
                }
            });
            newValue.set(leftKey, attachInstance(next, mapOfRight, leftKey));
        });
        const finalValue = newValue.asImmutable();
        currentValue = finalValue.asMutable();
        currentLeftArgument = newLeftArgument;
        currentRightArgument = newRightArgument;
        return finalValue;
    };
    const specialize = () => {
        return leftJoin(mapLeftToSetOfRightKeys, attachLeftWithMapOfRight);
    };
    apply.specialize = specialize;
    return apply;
}
