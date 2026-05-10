// Third-party library type declarations
// Using @ts-ignore comments to allow runtime usage without strict types

/* eslint-disable */
/** @type {any} */
// @ts-ignore
import * as cesium from 'cesium';
// @ts-ignore
export { cesium as default };

/** @type {any} */
// @ts-ignore
declare module 'cesium' { export const cesium = {}; }

/** @type {any} */
// @ts-ignore
declare module 'satellite.js' {
    export function twoline2satrec(a: any, b: any): any;
    export function propagate(a: any, b: any): any;
    export function geodeticToCartesian(a: any): any;
    export function eciToEcf(a: any, b: any): any;
    export function gstime(a: any): any;
    export function eciToGeodetic(a: any, b: any): any;
    export function degreesLong(a: any): any;
    export function degreesLat(a: any): any;
    export function velocity(a: any, b: any): any;
}

/** @type {any} */
// @ts-ignore
declare module 'hls.js' {
    export class Hls { constructor(config?: any); loadSource(a: any, b?: any): void; attachMedia(a: any): void; on(a: any, b: any): void; startLoad(): void; stopLoad(): void; destroy(): void; }
    export const Events: { ERROR: string; MANIFEST_PARSED: string; FRAG_CHANGED: string; };
    export function isSupported(): boolean;
}