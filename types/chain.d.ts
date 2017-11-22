export declare function startChain({logTimeline, name}?: {
    logTimeline?: boolean;
    name?: string;
}): {
    _addStep: (operation: any, needsToBeSpecialized?: boolean) => any;
    addStep: (operation: any) => any;
    memoizeForValue: ({historyLength}?: {
        historyLength?: number;
    }) => any;
    memoizeForObject: ({historyLength}?: {
        historyLength?: number;
    }) => any;
    mapManyToOne: (operation: any, ...extractors: any[]) => any;
    mapOneToMany: (operationsByName: any) => any;
    addMapStep: (...args: any[]) => any;
    addGroupStep: (...args: any[]) => any;
    addFilterStep: (...args: any[]) => any;
    addToSetStep: (...args: any[]) => any;
    addToMapStep: (...args: any[]) => any;
    addReindexMapStep: (...args: any[]) => any;
    addLeftJoinStep: (configuration: any) => any;
    addZipStep: (configuration: any) => any;
    addSafeUnionSetStep: (configuration: any) => any;
    endChain: () => any;
};
