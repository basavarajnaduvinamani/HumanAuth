import {it,expect} from 'vitest';
import golden from './golden.json';
import {resizePIL,resizeCV} from './image';
import {features} from './voice';
it('matches Pillow bilinear on a synthetic reduction including antialiasing',()=>{
  expect(Array.from(resizePIL({data:new Uint8Array(golden.rgb),width:39,height:35},17,19).data)).toEqual(golden.pil);
});
it('matches OpenCV integer bilinear within one byte',()=>{
  const actual=resizeCV({data:new Uint8Array(golden.rgb),width:39,height:35},17,19).data;
  expect(Math.max(...Array.from(actual,(v,i)=>Math.abs(v-golden.cv[i])))).toBeLessThanOrEqual(1);
});
it('matches Python stereo MFCC, population scaling and repo deltas',()=>{
  const pcm=Int16Array.from({length:3200},(_,j)=>j%2?(Math.floor(j/2)*3)%30000:Math.floor(j/2)%30000);
  const x=features(pcm);expect(x.length).toBe(golden.voice.length);
  let max=0;for(let i=0;i<x.length;i++)for(let j=0;j<40;j++)max=Math.max(max,Math.abs(x[i][j]-golden.voice[i][j]));
  expect(max).toBeLessThan(1e-7);
});
