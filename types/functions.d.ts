import { Map } from 'immutable';
export declare const executeManyOnOne: (functionsByName: any) => SemiPureOperation<{
    functionInstancesByName: {};
}, {}, {}>;
export declare const executeOneOnMany: (fn: any, caller: any) => SemiPureOperation<{
    fnInstance: any;
    callerInstance: any;
}, {}, any>;
export declare const memoizeForSlots: ({computeSlot, executeFunction}: {
    computeSlot: any;
    executeFunction: any;
}) => SemiPureOperation<{
    computeSlotInstance: any;
    functionInstanceBySlot: Map<any, any>;
}, {}, any>;
export declare const memoizeForRecentArguments: (executeFunction: any, {historyLength}?: {
    historyLength?: number;
}) => SemiPureOperation<{
    recentArgumentsValues: {
        value: any;
        arguments: any;
    }[];
    executeFunction: any;
}, {}, any>;
export declare const memoizeForRecentArgumentObject: (executeFunction: any, {historyLength}?: {
    historyLength?: number;
}) => SemiPureOperation<{
    recentArgumentsValues: {
        value: any;
        arguments: any;
    }[];
    executeFunction: any;
}, {}, any>;
export interface SemiPureConfiguration<M, A, R> {
    createMemory: () => M;
    executeFunction: (memory: M, ...args: A[]) => R;
}
export interface SemiPureOperation<M, A, R> {
    (...args: A[]): R;
    specialize: () => SemiPureOperation<M, A, R>;
}
export declare function semiPureFunction<M, A, R>({createMemory, executeFunction}: SemiPureConfiguration<M, A, R>): SemiPureOperation<M, A, R>;
export declare const composeFunctions: (...functions: any[]) => SemiPureOperation<{
    functionInstances: any[];
}, {}, any>;
