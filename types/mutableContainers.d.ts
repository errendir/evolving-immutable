export declare const createMutableSet: () => Set<any>;
export declare const isMutableSet: (set: any) => boolean;
export declare const createMutableMap: () => Map<any, any>;
export declare const isMutableMap: (set: any) => boolean;
export declare const createSpecializingMap: <K, T extends {
    specialize?: (() => T) | undefined;
}>(fn: T) => {
    deleteFnInstance: (key: K) => void;
    setFnInstance: (key: K, value: T) => void;
    getFnInstance: (key: K) => T;
    specializeFn: () => T;
};
