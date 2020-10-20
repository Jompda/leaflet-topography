import type { LatLng } from 'leaflet';
import { _config } from './config';
import type { UserOptions, TileCoord } from './types';

/**
 * Takes in an L.LatLng and returns { elevation, slope, aspect }
 * @param {Object} latlng | L.LatLng
 * @param userOptions | user options
 */
async function getTopography(latlng: LatLng, userOptions: UserOptions) {
	//
	// SETUP:
	// merge options from configuration _config with option passed in current function call
	const options = Object.assign(_config, userOptions);
	const {
		map,
		scale,
		spread,
		priority,
		token,
		_tileCache,
		saveTile,
		retrieveTile,
	} = options;

	// Sound alarms if certain config options are not given by user
	if (!map) {
		throw new Error(
			'Map instance must be passed as option to leaflet-topography config or options'
		);
	}
	if (!token) {
		throw new Error('Token required in leaflet-topography config / options');
	}

	// if user has not set a saveTile function of their own, use this default, which saves tiles to L.Topography._tileCache
	const effectiveSaveTile = saveTile
		? saveTile
		: (name: string, tileData: ImageData | ImageBitmap) =>
				(_tileCache[name] = tileData);

	/**
	 * Takes in a projected point and returns an elevation
	 * @param {Object} point | L.Point
	 */
	async function getElevation(point: { x: number; y: number }) {
		//
		const { X, Y, Z } = getTileCoord(point);
		const tileName = `X${X}Y${Y}Z${Z}`;

		// get the tile from the cache
		const tile = retrieveTile ? retrieveTile(tileName) : _tileCache[tileName];

		// if tile doesn't yet exist, fetch it, wait until its fetched, and rerun this function
		if (!tile) {
			// console.log('theres no tile');
			await fetchDEMTile({ X, Y, Z });
			return await getElevation(point);
		}

		const xyPositionOnTile = {
			x: Math.floor(point.x) - X * 256,
			y: Math.floor(point.y) - Y * 256,
		};

		var RGBA;

		if (priority === 'speed') {
			// Tile data already saved as Uint8ClampedArray, just need to pull the RGBA values, quick for high volumes
			RGBA = getRGBfromImgData(tile, xyPositionOnTile.x, xyPositionOnTile.y);
		} else {
			// if (priority === "storage")
			// Tile data in form of ImageBitMap, need to call .getImageData for coordinate, much slower for high volumes
			var canvas = document.createElement('canvas');
			var c = canvas.getContext('2d');
			c.drawImage(tile, 0, 0);
			var pixelData = c.getImageData(
				xyPositionOnTile.x,
				xyPositionOnTile.y,
				1,
				1
			).data;

			console.log(pixelData);

			RGBA = {
				R: pixelData[0],
				G: pixelData[1],
				B: pixelData[2],
				A: pixelData[3],
			};
		}

		const { R, G, B } = RGBA;

		return -10000 + (R * 256 * 256 + G * 256 + B) * 0.1;
	}

	/**
	 * Takes in ImageData object (created when saving a tile to the store), and xy coordinate
	 * of point on tile, returns RGBA value of that pixel from that ImageData's Uint8ClampedArray
	 * @param {Object} imgData
	 * @param {Number} x
	 * @param {Number} y
	 */
	function getRGBfromImgData(imgData: ImageData, x: number, y: number) {
		var index = y * imgData.width + x;
		var i = index * 4;
		var d = imgData.data;
		return { R: d[i], G: d[i + 1], B: d[i + 2], A: d[i + 3] };
	}

	/**
	 * Takes in a tile coordinate, fetches the tile image, and saves it to the cache in the form of
	 * either an ImageData array or an ImageBitman, depending on options.priority
	 * @param {Object} tileCoord
	 */
	async function fetchDEMTile(tileCoord: TileCoord) {
		const { X, Y, Z } = tileCoord;
		const imageUrl = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${Z}/${X}/${Y}.pngraw?access_token=${token}`;
		const tileName = `X${X}Y${Y}Z${Z}`;

		// Create a canvas, so I can write the image data to it and then call getImageData on it
		var transferCanvas = document.createElement('canvas');
		transferCanvas.width = transferCanvas.height = 256;
		var c = transferCanvas.getContext('2d');

		await loadImage(imageUrl).then((image) => {
			if (priority === 'speed') {
				//
				// MORE STORAGE BUT MUCH FASTER
				// Draw the image to a canvas and then use Canvas2DContext.getImageData to pull the RGBA data
				// in the form of a Uint8Clamped array for the entire tile
				c.drawImage(image, 0, 0, 256, 256);
				var pixelData = c.getImageData(0, 0, 256, 256);
				effectiveSaveTile(tileName, pixelData);
			} else {
				//
				// if (priority === "storage")
				// LESS STORAGE NEEDED BUT MUCH SLOWER:
				// Write the image to an ImageBitMap and then call .getImageData for each pixel inside the getElevation function
				createImageBitmap(image, 0, 0, 256, 256).then((ibm) =>
					effectiveSaveTile(tileName, ibm)
				);
			}
		});
	}

	/**
	 * Takes in image src url as string, returns promise that resolves when image is loaded
	 * @param {String} src
	 */
	function loadImage(src: string): Promise<CanvasImageSource> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = '*';
			img.addEventListener('load', () => resolve(img));
			img.addEventListener('error', (err) => reject(err));
			img.src = src;
		});
	}

	/**
	 * Take in a projection point and return the tile coordinates { X, Y, Z } of that point
	 * @param {Object} projectedPoint
	 */
	function getTileCoord(projectedPoint: { x: number; y: number }) {
		return {
			X: Math.floor(projectedPoint.x / 256),
			Y: Math.floor(projectedPoint.y / 256),
			Z: scale,
		};
	}

	// -------------------------------------------------------------- //
	//                                                                //
	//       Central getTopography function using mapbox:             //
	//                                                                //
	// -------------------------------------------------------------- //
	const point = map.project(latlng, scale);

	const pixelDiff = spread;

	const projectedN = { ...point, y: point.y - pixelDiff },
		projectedS = { ...point, y: point.y + pixelDiff },
		projectedE = { ...point, x: point.x + pixelDiff },
		projectedW = { ...point, x: point.x - pixelDiff };

	// @ts-ignore - ts complaining at me about projectedXs not being proper L.Point types
	const N = map.unproject(projectedN, scale);
	// @ts-ignore
	const S = map.unproject(projectedS, scale);
	// @ts-ignore
	const E = map.unproject(projectedE, scale);
	// @ts-ignore
	const W = map.unproject(projectedW, scale);

	const elePoint = await getElevation({ x: point.x, y: point.y }),
		eleN = await getElevation(projectedN),
		eleS = await getElevation(projectedS),
		eleE = await getElevation(projectedE),
		eleW = await getElevation(projectedW);

	const dx = map.distance(E, W),
		dy = map.distance(N, S);

	const dzdx = (eleE - eleW) / dx,
		dzdy = (eleN - eleS) / dy;

	const slope = Math.atan(Math.sqrt(dzdx ** 2 + dzdy ** 2)) * (180 / Math.PI);
	const aspect =
		dx !== 0
			? (Math.atan2(dzdy, dzdx) * (180 / Math.PI) + 180) % 360
			: (90 * (dy > 0 ? 1 : -1) + 180) % 360;

	return { elevation: elePoint, slope, aspect };
}

export default getTopography;
