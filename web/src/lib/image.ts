import { RGB } from './types';
export const roundEven = (v: number) => {const n=Math.floor(v); return v-n===0.5 ? n+(n%2) : Math.round(v)};
// PIL's separable bilinear resampler widens its filter for reduction, and
// rounds into an 8-bit intermediate between horizontal and vertical passes.
export function resizePIL(im: RGB, width: number, height: number): RGB {
  function axis(src: Uint8Array, sw: number, sh: number, count: number, horizontal: boolean) {
    const old=horizontal?sw:sh, scale=old/count, support=Math.max(scale,1), other=horizontal?sh:sw;
    const out=new Uint8Array(count*other*3);
    for(let a=0;a<count;a++) {
      const center=(a+0.5)*scale, lo=Math.max(0,Math.floor(center-support+0.5)), hi=Math.min(old,Math.floor(center+support+0.5));
      const ws=Array.from({length:hi-lo},(_,j)=>Math.max(0,1-Math.abs((j+lo-center+0.5)/support)));
      const sum=ws.reduce((s,v)=>s+v,0);
      // Pillow uses 22-bit fixed point coefficients for 8-bit bilinear.
      const coeff=ws.map(v=>Math.floor(v/sum*4194304+0.5));
      for(let b=0;b<other;b++) for(let c=0;c<3;c++) {
        let v=2097152;
        for(let j=lo;j<hi;j++) v+=src[(horizontal?b*sw+j:j*sw+b)*3+c]*coeff[j-lo];
        out[(horizontal?b*count+a:a*sw+b)*3+c]=Math.max(0,Math.min(255,Math.floor(v/4194304)));
      }
    }
    return out;
  }
  const horizontal=width===im.width?im.data:axis(im.data,im.width,im.height,width,true);
  return {data:height===im.height?horizontal:axis(horizontal,width,im.height,height,false),width,height};
}
export function resizeCV(im: RGB, width: number, height: number): RGB {
  const out=new Uint8Array(width*height*3);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const sx=Math.fround((x+0.5)*im.width/width-0.5), sy=Math.fround((y+0.5)*im.height/height-0.5);
    const ix=Math.floor(sx),iy=Math.floor(sy),ax=Math.fround(sx-ix),ay=Math.fround(sy-iy);
    const a0=roundEven(Math.fround(1-ax)*2048),a1=roundEven(ax*2048),b0=roundEven(Math.fround(1-ay)*2048),b1=roundEven(ay*2048);
    for(let c=0;c<3;c++) {
      const at=(dx:number,dy:number)=>im.data[(Math.max(0,Math.min(im.height-1,iy+dy))*im.width+Math.max(0,Math.min(im.width-1,ix+dx)))*3+c];
      const s0=at(0,0)*a0+at(1,0)*a1,s1=at(0,1)*a0+at(1,1)*a1;
      out[(y*width+x)*3+c]=(((b0*(s0>>4))>>16)+((b1*(s1>>4))>>16)+2)>>2;
    }
  }
  return {data:out,width,height};
}
export function chw(im: RGB): Float32Array {
  const n=im.width*im.height,out=new Float32Array(n*3);
  for(let i=0;i<n;i++) for(let c=0;c<3;c++) out[c*n+i]=im.data[i*3+c]/255;
  return out;
}
export function softmax(xs: number[]): number[] {const m=Math.max(...xs),es=xs.map(x=>Math.exp(x-m)),s=es.reduce((a,b)=>a+b,0);return es.map(x=>x/s)}
