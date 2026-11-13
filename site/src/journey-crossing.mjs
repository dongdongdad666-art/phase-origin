import * as THREE from 'three';
import {ease} from './cinematic-timeline.mjs';

// One reversible clock coordinates frame, passage, landscape and destination.
// Retire the valley only once the closed passage covers even the narrow lens.
export function sampleCrossing(seconds){
 const time=Math.max(0,Math.min(96,Number.isFinite(seconds)?seconds:0));
 return {time,scale:1+.85*ease(73.4,77.4,time),valleyVisible:time<77.6,
  sky:ease(77.6,81.8,time),core:ease(78.8,82.6,time),
  amount:ease(69,72.8,time)*(1-ease(81.6,84.4,time)),opening:ease(79.6,83.2,time)};
}

const eye=new THREE.Vector3(),focus=new THREE.Vector3(18,109,-143),up=new THREE.Vector3(0,1,0);
const matrix=new THREE.Matrix4(),source=new THREE.Quaternion(),destination=new THREE.Quaternion();
export function orientCrossingCamera(frame,time){
 const amount=ease(77.4,84.4,time);
 if(amount===0)return frame;
 eye.fromArray(frame.position);matrix.lookAt(eye,focus,up);
 destination.setFromRotationMatrix(matrix);source.fromArray(frame.quaternion).normalize();
 return {...frame,quaternion:source.slerp(destination,amount).normalize().toArray()};
}
