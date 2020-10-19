import type { Map } from 'leaflet';

export type Priority = 'storage' | 'speed';

export interface ConfigOptions {
	service?: 'mapbox' | 'esri';
	scale: number;
	priority: Priority;
	tileCache: any;
}

export interface UserOptions extends ConfigOptions {
	token: string;
	map: Map;
	saveTile: (name: string, tiledata: ImageData | ImageBitmap) => any;
	retrieveTile: (name: string) => ImageData | ImageBitmap;
}

export interface TileCoord {
	X: number;
	Y: number;
	Z: number;
}