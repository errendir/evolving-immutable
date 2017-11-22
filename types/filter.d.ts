export declare const filterDiffProcessor: (fn: any, rememberPresent?: boolean) => {
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
export declare const filter: (fn: any) => any;
