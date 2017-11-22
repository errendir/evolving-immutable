import { Map } from 'immutable';
export declare function groupDiffProcessor(fn: any): {
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
export interface GroupKeyFunction<K, V, GK> {
    (value: V, key: K): Iterable<GK> | GK;
    specialize?: () => GroupKeyFunction<K, V, GK>;
}
export interface GroupOperation<K, V, GK> {
    (map: Map<K, V>): Map<GK, Map<K, V>>;
    specialize: () => GroupOperation<K, V, GK>;
}
export declare function group<K, V, GK>(fn: GroupKeyFunction<K, V, GK>): GroupOperation<K, V, GK>;
