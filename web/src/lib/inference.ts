import {RGB,result} from './types';
import {letterbox,detections,increasedCrop,preprocessLiveness,postprocessLiveness} from './face';
import {preprocessDocument,postprocessDocument} from './document';
export type Runner=(file:string,x:Float32Array,dims:number[])=>Promise<{data:Float32Array;dims:readonly number[]}>;
export async function checkImage(name:'face'|'document',im:RGB,run:Runner,documentFile='document-fp32.onnx') {
  if(name==='document'){const out=await run(documentFile,preprocessDocument(im),[1,3,224,224]);return postprocessDocument(Array.from(out.data));}
  const det=await run('yolov5s-face.onnx',letterbox(im),[1,3,640,640]),boxes=detections(det.data,det.dims,im);
  if(boxes.length!==1)return result('face',0,false,boxes.length?'More than one face in the selfie.':'No face found in the selfie.');
  const crop=increasedCrop(im,boxes[0]),out=await run('AntiSpoofing_bin_1.5_128.onnx',preprocessLiveness(crop),[1,3,128,128]);
  return postprocessLiveness(Array.from(out.data));
}
