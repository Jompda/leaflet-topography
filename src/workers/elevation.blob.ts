// Build a worker from an anonymous function body
export default URL.createObjectURL(
	new Blob(
		[
			'(',

			function () {
				onmessage = function (e) {
					self.dems = {};

					if (e.data.raster) {
						const { colors, breakpoints, continuous, breaksAt0 } = e.data;
						const { data } = e.data.raster;
						self.dems[e.data.id] = raster2dem(data);
						self.shades = shading(self.dems[e.data.id], {
							colors,
							breakpoints,
							continuous,
							breaksAt0,
						});
					}

					postMessage({
						id: e.data.id,
						shades: self.shades,
					});
				};

				function raster2dem(data) {
					const dem = new Int16Array(256 * 256);

					var x, y, i, j;

					function height(R, G, B) {
						return -10000 + (R * 256 * 256 + G * 256 + B) * 0.1;
					}

					for (x = 0; x < 256; x++) {
						for (y = 0; y < 256; y++) {
							i = x + y * 256;
							j = i * 4;
							dem[i] = height(data[j], data[j + 1], data[j + 2]);
						}
					}

					return dem;
				}

				function shading(dem, userOptions) {
					const continuous =
						userOptions.continuous === undefined
							? true
							: userOptions.continuous;
					const breaksAt0 = (userOptions.breaksAt0 =
						userOptions.breaksAt0 === undefined
							? true
							: userOptions.breaksAt0);
					const userColors = userOptions.colors;
					const userBreakpoints = userOptions.breakpoints;

					function hexToR(h) {
						return parseInt(cutHex(h).substring(0, 2), 16);
					}
					function hexToG(h) {
						return parseInt(cutHex(h).substring(2, 4), 16);
					}
					function hexToB(h) {
						return parseInt(cutHex(h).substring(4, 6), 16);
					}
					function cutHex(h) {
						return h.charAt(0) == '#' ? h.substring(1, 7) : h;
					}

					var colors = userColors || [
						'#164A5B',
						'#75CFEC',
						'#FCFFA0',
						'#008000',
						'#855723',
						'#006400',
						'#493829',
						'#3d3d3d',
						'#ffffff',
					];

					const start = -850,
						end = 8700,
						range = end - start,
						bracket = range / (colors.length - 1);

					const derivedBreakpoints = (() => {
						let group = [];
						for (let i = 0; i < colors.length - 1; i++) {
							let breakpoint = start + i * bracket;
							group.push(breakpoint);
							group.sort((a, b) => a - b);
						}
						group.push(end);
						return group;
					})();

					const backupBreakpoints = [
						-850,
						0,
						300,
						800,
						1500,
						2400,
						5000,
						7200,
						8700,
					];

					var breakpoints = userBreakpoints || backupBreakpoints;

					if (breaksAt0 && !breakpoints.includes(0)) {
						breakpoints.push(0);
						breakpoints.sort((a, b) => a - b);
					}

					var gradients = continuous
						? (() => {
								var collection = [];

								for (let i = 0; i < breakpoints.length - 1; i++) {
									var rainbow = new Rainbow();
									rainbow.setNumberRange(
										breakpoints[i],
										breakpoints[i + 1]
									);

									// discontinuous use of colors between negative and position values
									if (!breaksAt0) {
										rainbow.setSpectrum(colors[i], colors[i + 1]);
									} else if (breaksAt0 && i < breakpoints.length - 2) {
										if (i === 0) {
											rainbow.setSpectrum(colors[i], colors[i + 1]);
										} else {
											rainbow.setSpectrum(
												colors[i + 1],
												colors[i + 2]
											);
										}
									}

									collection.push(rainbow);
								}

								return collection;
						  })()
						: null;

					// console.log(
					// 	'colors',
					// 	colors,
					// 	'breakpoints',
					// 	breakpoints,
					// 	'gradients',
					// 	gradients
					// );

					function hypsotint(elevation) {
						for (let i = 0; i < breakpoints.length - 1; i++) {
							if (
								breakpoints[i] < elevation &&
								elevation <= breakpoints[i + 1]
							) {
								return continuous
									? gradients[i].colorAt(elevation)
									: colors[i];
							}
						}

						return '000000';
					}

					var px = new Uint8ClampedArray(256 * 256 * 4);

					for (let i = 0; i < dem.length; i++) {
						var hex = `#${hypsotint(dem[i])}`;

						px[4 * i + 0] = hexToR(hex);
						px[4 * i + 1] = hexToG(hex);
						px[4 * i + 2] = hexToB(hex);
						px[4 * i + 3] = 255;
					}

					return px;
				}

				function Rainbow() {
					'use strict';
					var gradients = null;
					var minNum = 0;
					var maxNum = 100;
					var colours = ['ff0000', 'ffff00', '00ff00', '0000ff'];
					setColours(colours);

					function setColours(spectrum) {
						if (spectrum.length < 2) {
							throw new Error('Rainbow must have two or more colours.');
						} else {
							var increment = (maxNum - minNum) / (spectrum.length - 1);
							var firstGradient = new ColourGradient();
							firstGradient.setGradient(spectrum[0], spectrum[1]);
							firstGradient.setNumberRange(minNum, minNum + increment);
							gradients = [firstGradient];

							for (var i = 1; i < spectrum.length - 1; i++) {
								var colourGradient = new ColourGradient();
								colourGradient.setGradient(
									spectrum[i],
									spectrum[i + 1]
								);
								colourGradient.setNumberRange(
									minNum + increment * i,
									minNum + increment * (i + 1)
								);
								gradients[i] = colourGradient;
							}

							colours = spectrum;
						}
					}

					this.setSpectrum = function () {
						setColours(arguments);
						return this;
					};

					this.setSpectrumByArray = function (array) {
						setColours(array);
						return this;
					};

					this.colourAt = function (number) {
						if (isNaN(number)) {
							throw new TypeError(number + ' is not a number');
						} else if (gradients.length === 1) {
							return gradients[0].colourAt(number);
						} else {
							var segment = (maxNum - minNum) / gradients.length;
							var index = Math.min(
								Math.floor(
									(Math.max(number, minNum) - minNum) / segment
								),
								gradients.length - 1
							);
							return gradients[index].colourAt(number);
						}
					};

					this.colorAt = this.colourAt;

					this.setNumberRange = function (minNumber, maxNumber) {
						if (maxNumber > minNumber) {
							minNum = minNumber;
							maxNum = maxNumber;
							setColours(colours);
						} else {
							throw new RangeError(
								'maxNumber (' +
									maxNumber +
									') is not greater than minNumber (' +
									minNumber +
									')'
							);
						}
						return this;
					};
				}

				function ColourGradient() {
					'use strict';
					var startColour = 'ff0000';
					var endColour = '0000ff';
					var minNum = 0;
					var maxNum = 100;

					this.setGradient = function (colourStart, colourEnd) {
						startColour = getHexColour(colourStart);
						endColour = getHexColour(colourEnd);
					};

					this.setNumberRange = function (minNumber, maxNumber) {
						if (maxNumber > minNumber) {
							minNum = minNumber;
							maxNum = maxNumber;
						} else {
							throw new RangeError(
								'maxNumber (' +
									maxNumber +
									') is not greater than minNumber (' +
									minNumber +
									')'
							);
						}
					};

					this.colourAt = function (number) {
						return (
							calcHex(
								number,
								startColour.substring(0, 2),
								endColour.substring(0, 2)
							) +
							calcHex(
								number,
								startColour.substring(2, 4),
								endColour.substring(2, 4)
							) +
							calcHex(
								number,
								startColour.substring(4, 6),
								endColour.substring(4, 6)
							)
						);
					};

					function calcHex(
						number,
						channelStart_Base16,
						channelEnd_Base16
					) {
						var num = number;
						if (num < minNum) {
							num = minNum;
						}
						if (num > maxNum) {
							num = maxNum;
						}
						var numRange = maxNum - minNum;
						var cStart_Base10 = parseInt(channelStart_Base16, 16);
						var cEnd_Base10 = parseInt(channelEnd_Base16, 16);
						var cPerUnit = (cEnd_Base10 - cStart_Base10) / numRange;
						var c_Base10 = Math.round(
							cPerUnit * (num - minNum) + cStart_Base10
						);
						return formatHex(c_Base10.toString(16));
					}

					function formatHex(hex) {
						if (hex.length === 1) {
							return '0' + hex;
						} else {
							return hex;
						}
					}

					function isHexColour(string) {
						var regex = /^#?[0-9a-fA-F]{6}$/i;
						return regex.test(string);
					}

					function getHexColour(string) {
						if (isHexColour(string)) {
							return string.substring(string.length - 6, string.length);
						} else {
							var name = string.toLowerCase();
							if (colourNames.hasOwnProperty(name)) {
								return colourNames[name];
							}
							throw new Error(string + ' is not a valid colour.');
						}
					}

					// Extended list of CSS colornames s taken from
					// http://www.w3.org/TR/css3-color/#svg-color
					var colourNames = {
						aliceblue: 'F0F8FF',
						antiquewhite: 'FAEBD7',
						aqua: '00FFFF',
						aquamarine: '7FFFD4',
						azure: 'F0FFFF',
						beige: 'F5F5DC',
						bisque: 'FFE4C4',
						black: '000000',
						blanchedalmond: 'FFEBCD',
						blue: '0000FF',
						blueviolet: '8A2BE2',
						brown: 'A52A2A',
						burlywood: 'DEB887',
						cadetblue: '5F9EA0',
						chartreuse: '7FFF00',
						chocolate: 'D2691E',
						coral: 'FF7F50',
						cornflowerblue: '6495ED',
						cornsilk: 'FFF8DC',
						crimson: 'DC143C',
						cyan: '00FFFF',
						darkblue: '00008B',
						darkcyan: '008B8B',
						darkgoldenrod: 'B8860B',
						darkgray: 'A9A9A9',
						darkgreen: '006400',
						darkgrey: 'A9A9A9',
						darkkhaki: 'BDB76B',
						darkmagenta: '8B008B',
						darkolivegreen: '556B2F',
						darkorange: 'FF8C00',
						darkorchid: '9932CC',
						darkred: '8B0000',
						darksalmon: 'E9967A',
						darkseagreen: '8FBC8F',
						darkslateblue: '483D8B',
						darkslategray: '2F4F4F',
						darkslategrey: '2F4F4F',
						darkturquoise: '00CED1',
						darkviolet: '9400D3',
						deeppink: 'FF1493',
						deepskyblue: '00BFFF',
						dimgray: '696969',
						dimgrey: '696969',
						dodgerblue: '1E90FF',
						firebrick: 'B22222',
						floralwhite: 'FFFAF0',
						forestgreen: '228B22',
						fuchsia: 'FF00FF',
						gainsboro: 'DCDCDC',
						ghostwhite: 'F8F8FF',
						gold: 'FFD700',
						goldenrod: 'DAA520',
						gray: '808080',
						green: '008000',
						greenyellow: 'ADFF2F',
						grey: '808080',
						honeydew: 'F0FFF0',
						hotpink: 'FF69B4',
						indianred: 'CD5C5C',
						indigo: '4B0082',
						ivory: 'FFFFF0',
						khaki: 'F0E68C',
						lavender: 'E6E6FA',
						lavenderblush: 'FFF0F5',
						lawngreen: '7CFC00',
						lemonchiffon: 'FFFACD',
						lightblue: 'ADD8E6',
						lightcoral: 'F08080',
						lightcyan: 'E0FFFF',
						lightgoldenrodyellow: 'FAFAD2',
						lightgray: 'D3D3D3',
						lightgreen: '90EE90',
						lightgrey: 'D3D3D3',
						lightpink: 'FFB6C1',
						lightsalmon: 'FFA07A',
						lightseagreen: '20B2AA',
						lightskyblue: '87CEFA',
						lightslategray: '778899',
						lightslategrey: '778899',
						lightsteelblue: 'B0C4DE',
						lightyellow: 'FFFFE0',
						lime: '00FF00',
						limegreen: '32CD32',
						linen: 'FAF0E6',
						magenta: 'FF00FF',
						maroon: '800000',
						mediumaquamarine: '66CDAA',
						mediumblue: '0000CD',
						mediumorchid: 'BA55D3',
						mediumpurple: '9370DB',
						mediumseagreen: '3CB371',
						mediumslateblue: '7B68EE',
						mediumspringgreen: '00FA9A',
						mediumturquoise: '48D1CC',
						mediumvioletred: 'C71585',
						midnightblue: '191970',
						mintcream: 'F5FFFA',
						mistyrose: 'FFE4E1',
						moccasin: 'FFE4B5',
						navajowhite: 'FFDEAD',
						navy: '000080',
						oldlace: 'FDF5E6',
						olive: '808000',
						olivedrab: '6B8E23',
						orange: 'FFA500',
						orangered: 'FF4500',
						orchid: 'DA70D6',
						palegoldenrod: 'EEE8AA',
						palegreen: '98FB98',
						paleturquoise: 'AFEEEE',
						palevioletred: 'DB7093',
						papayawhip: 'FFEFD5',
						peachpuff: 'FFDAB9',
						peru: 'CD853F',
						pink: 'FFC0CB',
						plum: 'DDA0DD',
						powderblue: 'B0E0E6',
						purple: '800080',
						red: 'FF0000',
						rosybrown: 'BC8F8F',
						royalblue: '4169E1',
						saddlebrown: '8B4513',
						salmon: 'FA8072',
						sandybrown: 'F4A460',
						seagreen: '2E8B57',
						seashell: 'FFF5EE',
						sienna: 'A0522D',
						silver: 'C0C0C0',
						skyblue: '87CEEB',
						slateblue: '6A5ACD',
						slategray: '708090',
						slategrey: '708090',
						snow: 'FFFAFA',
						springgreen: '00FF7F',
						steelblue: '4682B4',
						tan: 'D2B48C',
						teal: '008080',
						thistle: 'D8BFD8',
						tomato: 'FF6347',
						turquoise: '40E0D0',
						violet: 'EE82EE',
						wheat: 'F5DEB3',
						white: 'FFFFFF',
						whitesmoke: 'F5F5F5',
						yellow: 'FFFF00',
						yellowgreen: '9ACD32',
					};
				}
			}.toString(),

			')()',
		],
		{ type: 'application/javascript' }
	)
);
