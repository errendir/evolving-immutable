import { Map, Set } from 'immutable';
import * as functions from './functions';
import * as group from './group';
import * as leftJoin from './leftJoin';
import * as map from './map';
import * as union from './union';
import * as zip from './zip';
export * from './conversion';
export * from './filter';
export * from './flatten';
export * from './functions';
export * from './group';
export * from './leftJoin';
export * from './map';
export * from './union';
export * from './zip';
export declare const EvImmInternals: {
    zip<K, LV, RV, UV>(attach: zip.ZipAttach<LV, RV, UV>): zip.ZipOperation<K, LV, RV, UV>;
    safeUnionMap<K, V>(): functions.SemiPureOperation<{
        union: union.UnionMapOperation<K, V>;
        emptyMap: Map<K, V>;
    }, Map<K, V>, Map<K, V>>;
    safeUnionSet<E>(): functions.SemiPureOperation<{
        union: union.UnionSetOperation<E>;
        emptySet: Set<E>;
    }, Set<E>, Set<E>>;
    unionSet<E>(): union.UnionSetOperation<E>;
    unionMapDiffProcessor: () => {
        diffProcessor: ({remove, add, update}: {
            remove: any;
            add: any;
            update: any;
        }) => {
            remove: (leftValue: any, key: any) => void;
            add: (leftValue: any, key: any) => void;
            update: (prevNext: any, key: any) => void;
        }[];
        specialize: () => any;
    };
    unionMap<K, V>(): union.UnionMapOperation<K, V>;
    mapDiffProcessor: (fn: any, {overSet}?: {
        overSet?: boolean;
    }) => {
        diffProcessor: ({remove, add, update}: {
            remove: any;
            add: any;
            update: any;
        }) => {
            remove: (value: any, key: any) => void;
            add: (value: any, key: any) => void;
            update: ({prev, next}: {
                prev: any;
                next: any;
            }, key: any) => void;
        };
        specialize: () => any;
    } | {
        diffProcessor: ({remove, add}: {
            remove: any;
            add: any;
        }) => {
            remove: (value: any) => void;
            add: (value: any) => void;
        };
        specialize: () => any;
    };
    map: (fn: any, {overSet}?: {
        overSet?: boolean;
    }) => any;
    mapOverMapDiffProcessor(fn: any): {
        diffProcessor: ({remove, add, update}: {
            remove: any;
            add: any;
            update: any;
        }) => {
            remove: (value: any, key: any) => void;
            add: (value: any, key: any) => void;
            update: ({prev, next}: {
                prev: any;
                next: any;
            }, key: any) => void;
        };
        specialize: () => any;
    };
    mapOverMap<K, VA, VB>(fn: map.MapOverMapMapper<K, VA, VB>): map.MapOverMapOperation<K, VA, VB>;
    mapOverSetDiffProcessor(fn: any): {
        diffProcessor: ({remove, add}: {
            remove: any;
            add: any;
        }) => {
            remove: (value: any) => void;
            add: (value: any) => void;
        };
        specialize: () => any;
    };
    mapOverSet: (fn: any) => any;
    leftJoin<KL, VL, KR, VR, VO>(mapLeftToSetOfRightKeys: leftJoin.LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR>, attachLeftWithMapOfRight: leftJoin.LeftJoinAttachLeftWithMapOfRight<KL, VL, KR, VR, VO>): leftJoin.LeftJoinOperation<KL, VL, KR, VR, VO>;
    groupDiffProcessor(fn: any): {
        diffProcessor: ({remove, add, update: _update}: {
            remove: any;
            add: any;
            update: any;
        }) => {
            remove: (value: any, key: any) => void;
            add: (value: any, key: any) => void;
            update: ({prev, next}: {
                prev: any;
                next: any;
            }, key: any) => void;
        };
        specialize: () => any;
    };
    group<K, V, GK>(fn: group.GroupKeyFunction<K, V, GK>): group.GroupOperation<K, V, GK>;
    executeManyOnOne: (functionsByName: any) => functions.SemiPureOperation<{
        functionInstancesByName: {};
    }, {}, {}>;
    executeOneOnMany: (fn: any, caller: any) => functions.SemiPureOperation<{
        fnInstance: any;
        callerInstance: any;
    }, {}, any>;
    memoizeForSlots: ({computeSlot, executeFunction}: {
        computeSlot: any;
        executeFunction: any;
    }) => functions.SemiPureOperation<{
        computeSlotInstance: any;
        functionInstanceBySlot: Map<any, any>;
    }, {}, any>;
    memoizeForRecentArguments: (executeFunction: any, {historyLength}?: {
        historyLength?: number;
    }) => functions.SemiPureOperation<{
        recentArgumentsValues: {
            value: any;
            arguments: any;
        }[];
        executeFunction: any;
    }, {}, any>;
    memoizeForRecentArgumentObject: (executeFunction: any, {historyLength}?: {
        historyLength?: number;
    }) => functions.SemiPureOperation<{
        recentArgumentsValues: {
            value: any;
            arguments: any;
        }[];
        executeFunction: any;
    }, {}, any>;
    semiPureFunction<M, A, R>({createMemory, executeFunction}: functions.SemiPureConfiguration<M, A, R>): functions.SemiPureOperation<M, A, R>;
    composeFunctions: (...functions: any[]) => functions.SemiPureOperation<{
        functionInstances: any[];
    }, {}, any>;
    flattenSet: () => any;
    flattenMap: () => any;
    filterDiffProcessor: (fn: any, rememberPresent?: boolean) => {
        diffProcessor: ({remove, add, update}: {
            remove: any;
            add: any;
            update: any;
        }) => {
            remove: (value: any, key: any) => void;
            add: (value: any, key: any) => void;
            update: (prevNext: any, key: any) => void;
        };
        specialize: () => any;
    };
    filter: (fn: any) => any;
    toSetDiffProcessor: ({assumeUniqueKeys}?: {
        assumeUniqueKeys?: boolean;
    }) => {
        diffProcessor: ({remove, add, update: _update}: {
            remove: any;
            add: any;
            update: any;
        }) => {
            remove: (value: any, key: any) => void;
            add: (value: any, key: any) => void;
            update: ({prev, next}: {
                prev: any;
                next: any;
            }, key: any) => void;
        };
        specialize: () => any;
    };
    toSet: ({assumeUniqueKeys}?: {
        assumeUniqueKeys?: boolean;
    }) => any;
    toMapDiffProcessor: (keyFn: any) => {
        diffProcessor: ({remove, add, update: _update}: {
            remove: any;
            add: any;
            update: any;
        }) => {
            remove: (value: any) => void;
            add: (value: any) => void;
        };
        specialize: () => any;
    };
    toMap: (keyFn: any) => any;
    reindexMapDiffProcessor: (keyFn: any) => {
        diffProcessor: ({remove, add, update}: {
            remove: any;
            add: any;
            update: any;
        }) => {
            remove: (value: any, key: any) => void;
            add: (value: any, key: any) => void;
            update: (prevNext: any, key: any) => void;
        };
        specialize: () => any;
    };
    reindexMap: (keyFn: any) => any;
};
export * from './chain';
