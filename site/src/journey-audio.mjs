// Original, quiet signal tones. No context is created until a user enables sound.
export function createJourneyAudio(){
 let context,enabled=false,voices=[];
 const events=[2,12.3,22.5,41,50,61,72,89,90.4,92.1];
 function silence(){if(context)for(const voice of voices)voice.gain.gain.setTargetAtTime(0,context.currentTime,.04);}
 return {
  get enabled(){return enabled;},
  async toggle(){
   if(enabled){enabled=false;silence();return false;}
   const Audio=globalThis.AudioContext??globalThis.webkitAudioContext;
   if(!Audio)return false;
   try{
    if(!context){
     context=new Audio();
     voices=[110,220,440].map(frequency=>{
      const oscillator=context.createOscillator(),gain=context.createGain();
      oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.value=0;
      oscillator.connect(gain).connect(context.destination);oscillator.start();
      return {oscillator,gain};
     });
    }
    await context.resume();enabled=true;return true;
   }catch{enabled=false;silence();return false;}
  },
  update(time,playing){
   if(!context||!enabled)return;
   let pulse=0;for(const event of events){const age=time-event;if(age>=0&&age<2)pulse=Math.max(pulse,Math.sin(Math.min(1,age/.12)*Math.PI/2)*Math.exp(-age*2.2));}
   const levels=playing?[.008,.002+pulse*.012,pulse*.004]:[0,0,0];
   for(let i=0;i<voices.length;i++)voices[i].gain.gain.setTargetAtTime(levels[i],context.currentTime,.035);
  },
  suspend(){silence();if(context)void context.suspend().catch(()=>{});}
 };
}
