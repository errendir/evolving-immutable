export declare const applyToMapDiffProcessor: (getMap: any, replaceMap: any) => {
    remove: (_value: any, key: any) => any;
    add: (value: any, key: any) => any;
    update: ({prev: _prev, next}: {
        prev: any;
        next: any;
    }, key: any) => any;
};
export declare const applyToMutableMapDiffProcessor: (getMap: any) => {
    remove: (_value: any, key: any) => any;
    add: (value: any, key: any) => any;
    update: ({prev: _prev, next}: {
        prev: any;
        next: any;
    }, key: any) => any;
};
export declare const applyToDeepMutableMapDiffProcessor: (getMap: any) => {
    remove: (_value: any, ...keys: any[]) => any;
    add: (value: any, ...keys: any[]) => any;
    update: ({prev: _prev, next}: {
        prev: any;
        next: any;
    }, ...keys: any[]) => any;
};
export declare const applyToSetDiffProcessor: (getSet: any, replaceSet: any) => {
    remove: (value: any) => any;
    add: (value: any) => any;
};
export declare const applyToMutableSetDiffProcessor: (getSet: any) => {
    remove: (value: any) => any;
    add: (value: any) => any;
};
export declare function wrapDiffProcessor(diffProcessorFactory: any, {inSet, outSet}?: {
    inSet?: boolean;
    outSet?: boolean;
}): any;
export declare function wrapDualDiffProcessor(diffProcessorFactory: any): any;
