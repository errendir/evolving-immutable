import { Map } from 'immutable';
import { executeManyOnOne, executeOneOnMany } from './functions';
import { EvImmInternals } from './';
import { applyToMapDiffProcessor } from './wrapDiffProcessor';
let insideOfTheChainExecution = false;
const specializeOperation = (operation) => {
    if (operation.specialize) {
        return operation.specialize();
    }
    return operation;
};
// TODO: implement the `claim` method on all Operations so that the unnecessary specializations 
// don't have to be done when Operations are passed to chains or `addStepFunctions`
function _startChain(operations, allowedInsideAChain = false, { logTimeline, name }) {
    if (insideOfTheChainExecution && !allowedInsideAChain) {
        throw new Error('Do not create a chain as part of any chain execution');
    }
    const previousPartialArguments = [];
    const previousPartialValues = [];
    const apply = (...args) => {
        if (logTimeline) {
            performance.mark(`${name}_start`);
        }
        insideOfTheChainExecution = true;
        let finalResult, error, errorWasThrown = false;
        try {
            let currentArguments = args;
            const getChainableBlock = (ops) => {
                const chainableOperations = [];
                while (ops[0] && ops[0].diffProcessor !== undefined) {
                    chainableOperations.push(ops[0]);
                    ops.shift();
                }
                return chainableOperations;
            };
            const operationsToProcess = operations.slice();
            let chainableBlockId = 0;
            while (operationsToProcess.length > 0) {
                const chainableOperations = getChainableBlock(operationsToProcess);
                // TODO: Correctly grouping the diff-passing operations can be done during the chain creation
                if (chainableOperations.length > 0) {
                    console.log('Optimizing a block of', chainableOperations.length, 'operations');
                    let finalMap = previousPartialValues[chainableBlockId] || Map();
                    let nextDiffProcessor = applyToMapDiffProcessor(() => finalMap, (map) => finalMap = map);
                    chainableOperations.reverse().forEach(({ diffProcessor }) => {
                        nextDiffProcessor = diffProcessor(nextDiffProcessor);
                    });
                    // Create the first diff
                    currentArguments[0].diffFromCallbacks(previousPartialArguments[chainableBlockId] || Map(), nextDiffProcessor);
                    previousPartialArguments[chainableBlockId] = currentArguments[0];
                    previousPartialValues[chainableBlockId] = finalMap;
                    currentArguments = [finalMap];
                    chainableBlockId += 1;
                }
                const operation = operationsToProcess.shift();
                if (operation) {
                    currentArguments = [operation(...currentArguments)];
                }
            }
            finalResult = currentArguments[0];
        }
        catch (err) {
            errorWasThrown = true;
            error = err;
        }
        insideOfTheChainExecution = false;
        if (errorWasThrown === true) {
            throw error;
        }
        if (logTimeline) {
            performance.mark(`${name}_end`);
            performance.measure(`${name}`, `${name}_start`, `${name}_end`);
        }
        return finalResult;
    };
    apply.specialize = () => {
        const newOperations = operations
            .map(specializeOperation);
        return _startChain(newOperations, true, { logTimeline, name })
            .endChain();
    };
    const makeExtendableChain = (childChainConfig = { childChain: null, memoizationType: null, historyLength: 0 }) => {
        let childChain = childChainConfig.childChain;
        let wasAlreadyExtended = false;
        const _addStepInThisChain = (operation) => {
            if (operation.diffProcessor !== undefined) {
            }
            if (!wasAlreadyExtended) {
                operations.push(operation);
                return makeExtendableChain();
            }
            else {
                // Chain is being reused - need to respecialize and copy all operations except for the last one
                // Chains are right now in a very strange position with regard to mutability
                const newOperations = operations
                    .slice(0, operations.length - 1)
                    .map(specializeOperation)
                    .push(operation);
                return _startChain(newOperations, false, { logTimeline, name });
            }
        };
        const _addStep = (operation, needsToBeSpecialized = true) => {
            if (childChain !== null) {
                const newChildChain = childChain._addStep(operation, needsToBeSpecialized);
                if (newChildChain !== childChain) {
                    return makeExtendableChain(Object.assign({}, childChainConfig, { childChain: newChildChain }));
                }
                else {
                    return makeExtendableChain(childChainConfig);
                }
            }
            if (needsToBeSpecialized) {
                operation = specializeOperation(operation);
            }
            return _addStepInThisChain(operation);
        };
        const addStep = (operation) => {
            return _addStep(operation, true);
        };
        const memoizeForValue = ({ historyLength = 1 } = {}) => {
            if (childChain !== null) {
                const newChildChain = childChain.memoizeForValue({ historyLength });
                if (newChildChain !== childChain) {
                    return makeExtendableChain(Object.assign({}, childChainConfig, { childChain: newChildChain }));
                }
                else {
                    return makeExtendableChain(childChainConfig);
                }
            }
            childChain = _startChain([], false, { logTimeline, name: name + '_value_memed' });
            return makeExtendableChain({ memoizationType: 'value', historyLength, childChain });
        };
        const memoizeForObject = ({ historyLength = 1 } = {}) => {
            if (childChain !== null) {
                const newChildChain = childChain.memoizeForObject({ historyLength });
                if (newChildChain !== childChain) {
                    return makeExtendableChain(Object.assign({}, childChainConfig, { childChain: newChildChain }));
                }
                else {
                    return makeExtendableChain(childChainConfig);
                }
            }
            childChain = _startChain([], false, { logTimeline, name: name + '_object_memed' });
            return makeExtendableChain({ memoizationType: 'object', historyLength, childChain });
        };
        const wrapSimpleOperationCreator = (operationCreator) => (...args) => {
            return _addStep(operationCreator(...args), false);
        };
        // const addMapStep = wrapSimpleOperationCreator(EvImmInternals.mapDiffProcessor)
        // const addGroupStep = wrapSimpleOperationCreator(EvImmInternals.groupDiffProcessor)
        // const addFilterStep = wrapSimpleOperationCreator(EvImmInternals.filterDiffProcessor)
        // const addToSetStep = wrapSimpleOperationCreator(EvImmInternals.toSetDiffProcessor)
        // const addToMapStep = wrapSimpleOperationCreator(EvImmInternals.toMapDiffProcessor)
        // const addReindexMapStep = wrapSimpleOperationCreator(EvImmInternals.reindexMapDiffProcessor)
        const addMapStep = wrapSimpleOperationCreator(EvImmInternals.map);
        const addGroupStep = wrapSimpleOperationCreator(EvImmInternals.group);
        const addFilterStep = wrapSimpleOperationCreator(EvImmInternals.filter);
        const addToSetStep = wrapSimpleOperationCreator(EvImmInternals.toSet);
        const addToMapStep = wrapSimpleOperationCreator(EvImmInternals.toMap);
        const addReindexMapStep = wrapSimpleOperationCreator(EvImmInternals.reindexMap);
        const mapManyToOne = (operation, ...extractors) => {
            return _addStep(executeOneOnMany(operation, (operation, data) => operation(...extractors.map(extractor => extractor(data)))), false);
        };
        const mapOneToMany = (operationsByName) => {
            return _addStep(executeManyOnOne(operationsByName), false);
        };
        const addLeftJoinStep = (configuration) => {
            return _addStep(EvImmInternals.semiPureFunction({
                createMemory: () => ({
                    leftJoin: EvImmInternals.leftJoin(configuration.mapLeftToSetOfRightKeys, configuration.attachLeftWithMapOfRight)
                }),
                executeFunction: ({ leftJoin }, currentValue) => {
                    const leftMap = configuration.extractLeftMap(currentValue);
                    const rightMap = configuration.extractRightMap(currentValue);
                    return leftJoin(leftMap, rightMap);
                }
            }), false);
        };
        const addZipStep = (configuration) => {
            return _addStep(EvImmInternals.semiPureFunction({
                createMemory: () => ({
                    zip: EvImmInternals.zip(configuration.attach)
                }),
                executeFunction: ({ zip }, currentValue) => {
                    const leftMap = configuration.extractLeftMap(currentValue);
                    const rightMap = configuration.extractRightMap(currentValue);
                    return zip(leftMap, rightMap);
                }
            }), false);
        };
        const addSafeUnionSetStep = (configuration) => {
            return _addStep(EvImmInternals.semiPureFunction({
                createMemory: () => ({
                    safeUnionSet: EvImmInternals.safeUnionSet(),
                }),
                executeFunction: ({ safeUnionSet }, currentValue) => {
                    const leftMap = configuration.extractLeftMap(currentValue);
                    const rightMap = configuration.extractRightMap(currentValue);
                    return safeUnionSet(leftMap, rightMap);
                }
            }), false);
        };
        // TODO: Replace the endChain with the claim process
        // TODO: A chain that was extended but not forked will have a very unexpected behaviour on `.endChain()`
        const endChain = () => {
            if (childChain !== null && childChainConfig.memoizationType === 'value') {
                const endedChildChain = childChain.endChain();
                return _addStepInThisChain(EvImmInternals.memoizeForRecentArguments(endedChildChain, { historyLength: childChainConfig.historyLength })).endChain();
            }
            if (childChain !== null && childChainConfig.memoizationType === 'object') {
                const endedChildChain = childChain.endChain();
                return _addStepInThisChain(EvImmInternals.memoizeForRecentArgumentObject(endedChildChain, { historyLength: childChainConfig.historyLength })).endChain();
            }
            return apply;
        };
        const chain = {
            _addStep,
            addStep,
            memoizeForValue,
            memoizeForObject,
            mapManyToOne,
            mapOneToMany,
            // All the transformation steps - START
            addMapStep,
            addGroupStep,
            addFilterStep,
            addToSetStep,
            addToMapStep,
            addReindexMapStep,
            addLeftJoinStep,
            addZipStep,
            addSafeUnionSetStep,
            // All the transformation steps - END
            endChain,
        };
        return chain;
    };
    return makeExtendableChain();
}
export function startChain({ logTimeline = false, name = 'aChain' } = {}) {
    return _startChain([], false, { logTimeline, name });
}
