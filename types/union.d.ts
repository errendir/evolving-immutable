import { Set, Map } from 'immutable';
import { SemiPureOperation } from './functions';
export declare function safeUnionMap<K, V>(): SemiPureOperation<{
    union: UnionMapOperation<K, V>;
    emptyMap: Map<K, V>;
}, Map<K, V>, Map<K, V>>;
export declare function safeUnionSet<E>(): SemiPureOperation<{
    union: UnionSetOperation<E>;
    emptySet: Set<E>;
}, Set<E>, Set<E>>;
export interface UnionSetOperation<E> {
    (leftSet: Set<E>, rightSet: Set<E>): Set<E>;
    specialize: () => UnionSetOperation<E>;
}
export declare function unionSet<E>(): UnionSetOperation<E>;
export declare const unionMapDiffProcessor: () => {
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
export interface UnionMapOperation<K, V> {
    (leftMap: Map<K, V>, rightMap: Map<K, V>): Map<K, V>;
    specialize: () => UnionMapOperation<K, V>;
}
export declare function unionMap<K, V>(): UnionMapOperation<K, V>;
