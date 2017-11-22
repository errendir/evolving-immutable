import { Map } from 'immutable';
export interface ZipAttach<LV, RV, UV> {
    (leftValue: LV | undefined, rightValue: RV | undefined): UV;
    specialize?: () => ZipAttach<LV, RV, UV>;
}
export interface ZipOperation<K, LV, RV, UV> {
    (leftMap: Map<K, LV>, rightMap: Map<K, RV>): Map<K, UV>;
    specialize: () => ZipOperation<K, LV, RV, UV>;
}
export declare function zip<K, LV, RV, UV>(attach: ZipAttach<LV, RV, UV>): ZipOperation<K, LV, RV, UV>;
