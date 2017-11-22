import { Map } from 'immutable';
export declare const mapDiffProcessor: (fn: any, {overSet}?: {
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
export declare const map: (fn: any, {overSet}?: {
    overSet?: boolean;
}) => any;
export declare function mapOverMapDiffProcessor(fn: any): {
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
export interface MapOverMapMapper<K, VA, VB> {
    (value: VA, key: K): VB;
    specialize?: () => MapOverMapMapper<K, VA, VB>;
}
export interface MapOverMapOperation<K, VA, VB> {
    (map: Map<K, VA>): Map<K, VB>;
    specialize: () => MapOverMapOperation<K, VA, VB>;
}
export declare function mapOverMap<K, VA, VB>(fn: MapOverMapMapper<K, VA, VB>): MapOverMapOperation<K, VA, VB>;
export declare function mapOverSetDiffProcessor(fn: any): {
    diffProcessor: ({remove, add}: {
        remove: any;
        add: any;
    }) => {
        remove: (value: any) => void;
        add: (value: any) => void;
    };
    specialize: () => any;
};
export declare const mapOverSet: (fn: any) => any;
