import { Set, Map } from 'immutable';
export interface LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR> {
    (leftValue: VL, leftKey?: KL): Set<KR>;
    specialize?: () => LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR>;
}
export interface LeftJoinAttachLeftWithMapOfRight<KL, VL, KR, VR, VO> {
    (leftValue: VL, mapOfRightValues: any, leftKey: KL): VO;
    specialize?: () => LeftJoinAttachLeftWithMapOfRight<KL, VL, KR, VR, VO>;
}
export interface LeftJoinOperation<KL, VL, KR, VR, VO> {
    (leftMap: Map<KL, VL>, rightMap: Map<KR, VR>): Map<KL, VO>;
    specialize: () => LeftJoinOperation<KL, VL, KR, VR, VO>;
}
export declare function leftJoin<KL, VL, KR, VR, VO>(mapLeftToSetOfRightKeys: LeftJoinMapLeftToSetOfRightKeys<KL, VL, KR>, attachLeftWithMapOfRight: LeftJoinAttachLeftWithMapOfRight<KL, VL, KR, VR, VO>): LeftJoinOperation<KL, VL, KR, VR, VO>;
