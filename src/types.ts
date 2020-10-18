export type Priority = 'storage' | 'speed';

export interface ConfigOptions {
	service?: 'mapbox' | 'esri';
	scale: number;
	priority: Priority;
	saveTile: (name: string, tiledata: ImageData | ImageBitmap) => any;
	retrieveTile: (name: string) => ImageData | ImageBitmap;
	tileCache: any;
}

export interface UserOptions extends ConfigOptions {
	token: string;
}

export interface TileCoord {
	X: number;
	Y: number;
	Z: number;
}
