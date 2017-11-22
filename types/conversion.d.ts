export declare const toSetDiffProcessor: ({assumeUniqueKeys}?: {
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
export declare const toSet: ({assumeUniqueKeys}?: {
    assumeUniqueKeys?: boolean;
}) => any;
export declare const toMapDiffProcessor: (keyFn: any) => {
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
export declare const toMap: (keyFn: any) => any;
export declare const reindexMapDiffProcessor: (keyFn: any) => {
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
export declare const reindexMap: (keyFn: any) => any;
