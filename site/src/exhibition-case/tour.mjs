export const tourStops=['guide','enclose','ambient','overview'];
export const dwellSeconds=[6,9,9,4];
export const cameraEase=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
export function createTour(){
 const tour={running:false,paused:false,index:-1,elapsed:0,complete:false,
  start(){Object.assign(this,{running:true,paused:false,index:-1,elapsed:0,complete:false});},
  stop(){this.running=false;this.paused=false;},
  togglePause(){if(this.running)this.paused=!this.paused;},
  step(dt,moving){
   if(!this.running||this.paused)return null;
   if(this.index<0){this.index=0;return tourStops[0];}
   if(moving)return null;
   this.elapsed+=Math.max(0,Math.min(dt,.25));
   if(this.elapsed<dwellSeconds[this.index])return null;
   this.elapsed=0;this.index++;
   if(this.index===tourStops.length){this.complete=true;this.stop();return null;}
   return tourStops[this.index];
  }
 };return tour;
}
