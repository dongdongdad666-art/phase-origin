const edges={idle:['holding','entering','unavailable'],holding:['idle','entering','unavailable'],entering:['focused','returning','idle','unavailable'],focused:['returning','idle','unavailable'],returning:['idle','unavailable'],unavailable:[]};
export function createExperienceStore(){
 let snapshot=Object.freeze({mode:'idle',holdProgress:0,focusProgress:0,angle:90,autoplay:false});const listeners=new Set();
 function publish(values){snapshot=Object.freeze({...snapshot,...values});listeners.forEach(fn=>fn(snapshot));}
 return {get snapshot(){return snapshot;},subscribe(fn){listeners.add(fn);fn(snapshot);return()=>listeners.delete(fn);},transition(mode){if(!edges[snapshot.mode].includes(mode))return false;publish({mode});return true;},update(values){const next={};for(const [key,min,max] of [['holdProgress',0,1],['focusProgress',0,1],['angle',12,120]])if(Number.isFinite(values[key]))next[key]=Math.max(min,Math.min(max,values[key]));if(typeof values.autoplay==='boolean')next.autoplay=values.autoplay;publish(next);}};
}
export const experienceStore=createExperienceStore();
