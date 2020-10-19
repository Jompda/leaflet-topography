!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t(require("leaflet")):"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Topography=t(require("leaflet")):e.Topography=t(e.L)}(self,(function(e){return(()=>{"use strict";var t={450:(e,t,a)=>{a.r(t),a.d(t,{Topography:()=>s,default:()=>c,getTopography:()=>i});var r=a(78),o={},n={service:"mapbox",priority:"speed",scale:15,tileCache:o};const i=async function(e,t){var a=Object.assign(n,t),{map:r,scale:o,priority:i,token:p,tileCache:s,saveTile:c}=a;if(!r)throw new Error("Map instance must be passed as option to leaflet-topography config or options");if(!p)throw new Error("Token required in leaflet-topography config / options");var l=c||((e,t)=>s[e]=t);async function f(e){var t,{X:a,Y:r,Z:n}=(t=e,{X:Math.floor(t.x/256),Y:Math.floor(t.y/256),Z:o}),c=s[`X${a}Y${r}Z${n}`];if(!c)return console.log("theres no tile"),await async function(e){var{X:t,Y:a,Z:r}=e,o=`https://api.mapbox.com/v4/mapbox.terrain-rgb/${r}/${t}/${a}.pngraw?access_token=${p}`,n=`X${t}Y${a}Z${r}`,s=document.createElement("canvas");s.width=s.height=256;var c=s.getContext("2d");await function(e){return new Promise(((t,a)=>{var r=new Image;r.crossOrigin="*",r.addEventListener("load",(()=>t(r))),r.addEventListener("error",(e=>a(e))),r.src=e}))}(o).then((e=>{if("speed"===i){c.drawImage(e,0,0,256,256);var t=c.getImageData(0,0,256,256);l(n,t)}else createImageBitmap(e,0,0,256,256).then((e=>l(n,e)))}))}({X:a,Y:r,Z:n}),void f(e);var d,u,g,y,h,v={x:Math.floor(e.x)-256*a,y:Math.floor(e.y)-256*r};if("speed"===i)g=v.x,y=4*(v.y*(u=c).width+g),d={R:(h=u.data)[y],G:h[y+1],B:h[y+2],A:h[y+3]};else{var m=document.createElement("canvas").getContext("2d");m.drawImage(c,0,0);var x=m.getImageData(v.x,v.y,1,1).data;d={R:x[0],G:x[1],B:x[2],A:x[3]}}var{R:w,G:b,B:j}=d;return.1*(256*w*256+256*b+j)-1e4}var d=r.project(e,o),u={...d,y:d.y-2},g={...d,y:d.y+2},y={...d,x:d.x+2},h={...d,x:d.x-2},v=r.unproject(u,o),m=r.unproject(g,o),x=r.unproject(y,o),w=r.unproject(h,o),b=await f(d),j=await f(u),M=await f(g),T=await f(y),$=await f(h),I=r.distance(x,w),O=r.distance(v,m),P=(T-$)/I,E=(j-M)/O;return{elevation:b,slope:Math.atan(Math.sqrt(P**2+E**2))*(180/Math.PI),aspect:0!==I?90-Math.atan2(E,P)*(180/Math.PI):90-90*(O>0?1:-1)}};var p=r||window.L,s={getTopography:i,tileCache:o,_config:n,config:e=>{var t=Object.assign(n,e);return n=t}};p.Topography=s;const c=s},78:t=>{t.exports=e}},a={};function r(e){if(a[e])return a[e].exports;var o=a[e]={exports:{}};return t[e](o,o.exports,r),o.exports}return r.d=(e,t)=>{for(var a in t)r.o(t,a)&&!r.o(e,a)&&Object.defineProperty(e,a,{enumerable:!0,get:t[a]})},r.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r(450)})()}));