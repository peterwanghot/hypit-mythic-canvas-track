import { sealVisualTrack } from "@hypit/hypit/composition";
import { browserProgram, hyperframesResourceUri } from "@hypit/hypit/hyperframes";
import type { BlobRef } from "@hypit/hypit/author-kit";
import type { CanvasSpace } from "@hypit/hypit/spatial";
import type { TemporalWindow } from "@hypit/hypit/temporal";
import { assertTemporalWindowFor } from "@hypit/hypit/temporal";
import type { Timeline } from "@hypit/hypit/timeline";

export type SceneSpec = {
  readonly id: string;
  readonly at: number;
  readonly startZoom: number;
  readonly endZoom: number;
  readonly startY: number;
  readonly endY: number;
};

export type Scene = SceneSpec & { readonly image: BlobRef };

export type Cue = {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  readonly role: string;
  readonly text: string;
  readonly tone: "blue" | "gold";
  readonly words?: readonly Word[];
};

export type Word = {
  readonly text: string;
  readonly start: number;
  readonly end: number;
};

export type Effect = {
  readonly id: string;
  readonly amount: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly color: string;
  readonly seed: number;
};

export type PopupSpec = {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly enter: number;
  readonly fadeOut: number;
};

export type Popup = PopupSpec & { readonly image: BlobRef };

export type TrackOptions = {
  readonly id: string;
  readonly badgeSize: number;
  readonly subtitleSize: number;
  readonly badgeY: number;
  readonly subtitleY: number;
  readonly titleFadeStart: number;
  readonly titleEnd: number;
  readonly transparent?: boolean;
};

const setup = String.raw`
const W=data.width,H=data.height,FPS=data.fps,TOTAL_FRAMES=data.totalFrames,DURATION=TOTAL_FRAMES/FPS;
const film=root.querySelector('.film-canvas');
film.width=W;film.height=H;
const ctx=film.getContext('2d',{alpha:true,desynchronized:true});
ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
const images=[...root.querySelectorAll('.scene-image')];
const popupImages=[...root.querySelectorAll('.popup-image')];
const titleImage=root.querySelector('.title-image');
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const smoothstep=(a,b,v)=>{const x=clamp((v-a)/(b-a));return x*x*(3-2*x);};

function drawCover(image,zoom,offsetY,alpha=1){
  if(!image.complete||!image.naturalWidth)return;
  const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight)*zoom;
  const dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(image,(W-dw)/2,(H-dh)/2+offsetY,dw,dh);ctx.restore();
}
function drawScene(scene,image,t,end,alpha){
  const progress=clamp((t-scene.at)/Math.max(.001,end-scene.at));
  drawCover(image,scene.startZoom+(scene.endZoom-scene.startZoom)*progress,scene.startY+(scene.endY-scene.startY)*progress,alpha);
}
function drawBackground(t){
  const scenes=data.scenes,fadeHalf=4/FPS;
  if(!data.transparent){ctx.fillStyle='#0b0f14';ctx.fillRect(0,0,W,H);}else{ctx.clearRect(0,0,W,H);}
  if(data.transparent)return;
  const boundary=scenes.findIndex((scene,index)=>index>0&&Math.abs(t-scene.at)<=fadeHalf);
  if(boundary>0){
    const mix=smoothstep(scenes[boundary].at-fadeHalf,scenes[boundary].at+fadeHalf,t);
    drawScene(scenes[boundary-1],images[boundary-1],t,scenes[boundary].at,1-mix);
    drawScene(scenes[boundary],images[boundary],t,scenes[boundary+1]?.at??DURATION,mix);return;
  }
  let index=0;for(let i=1;i<scenes.length;i+=1)if(t>=scenes[i].at)index=i;
  drawScene(scenes[index],images[index],t,scenes[index+1]?.at??DURATION,1);
}
function mulberry32(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let value=Math.imul(seed^seed>>>15,1|seed);value=value+Math.imul(value^value>>>7,61|value)^value;return((value^value>>>14)>>>0)/4294967296;};}
function createShader(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;}
function createFxRenderer(){
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!gl)throw new Error('WebGL2 unavailable');
  const vertex='#version 300 es\nprecision highp float;\nin vec4 a_geometry;in vec4 a_animation;uniform float u_progress;uniform float u_scene_alpha;uniform float u_kind;out float v_opacity;void main(){float progress=clamp(u_progress,0.0,1.0);float sway=a_geometry.w*sin(progress*6.2831853+a_geometry.x*12.56637);float x=a_geometry.x*'+W+'.0+sway+a_geometry.z*.5;float y=a_geometry.y*'+H+'.0-a_animation.x*progress+a_geometry.z*.5;gl_Position=vec4(x/'+W+'.0*2.0-1.0,1.0-y/'+H+'.0*2.0,0.0,1.0);gl_PointSize=a_geometry.z*mix(2.5,3.2,u_kind);float startProg=a_animation.y;float fadeProg=startProg+a_animation.z;float peak=a_animation.w;float op=0.0;if(progress<=startProg)op=0.0;else if(progress<fadeProg)op=peak*(progress-startProg)/max(.001,fadeProg-startProg);else op=peak;if(u_kind>.5){float shimmer=.85+.15*sin(progress*28.0+a_geometry.x*50.0);op*=shimmer;}v_opacity=op*u_scene_alpha;}';
  const fragment='#version 300 es\nprecision highp float;\nuniform vec4 u_color;uniform float u_kind;in float v_opacity;out vec4 outColor;void main(){float radius=length(gl_PointCoord-vec2(.5))*2.0;if(radius>1.0)discard;float coreEdge=mix(.40,.3125,u_kind);float coreRadius=radius/coreEdge;vec3 color=u_color.rgb;float alpha=0.0;if(u_kind<.5){if(coreRadius<=.46)alpha=mix(.82,.68,coreRadius/.46);else if(coreRadius<=.76)alpha=mix(.68,.30,(coreRadius-.46)/.30);else if(coreRadius<=1.0)alpha=.30*(1.0-(coreRadius-.76)/.24);float outside=max(0.0,radius-coreEdge);alpha+=.42*exp(-pow(outside/.13,2.0));alpha+=.18*exp(-pow(outside/.29,2.0));}else{if(coreRadius<=.35)color=mix(vec3(1.0),vec3(1.0,.976,.769),coreRadius/.35);else color=mix(vec3(1.0,.976,.769),vec3(1.0,.843,0.0),clamp((coreRadius-.35)/.65,0.0,1.0));if(coreRadius<=.70)alpha=1.0;else if(coreRadius<=1.0)alpha=1.0-(coreRadius-.70)/.30;float outside=max(0.0,radius-coreEdge);float glowWarm=.46*exp(-pow(outside/.16,2.0));float glowGold=.28*exp(-pow(outside/.34,2.0));color=mix(color,vec3(1.0,.878,0.0),clamp(glowGold,0.0,.6));alpha+=glowWarm+glowGold;}outColor=vec4(color,clamp(alpha,0.0,1.0)*v_opacity);}';
  const program=gl.createProgram();gl.attachShader(program,createShader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,createShader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
  const groups=[];const rgb=hex=>[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255,1];
  for(const effect of data.effects){
    const count=Math.max(1,Math.round(effect.amount*48)),random=mulberry32(effect.seed),values=new Float32Array(count*8),kind=effect.maxSize<=10?1:0;
    for(let i=0;i<count;i+=1){
      const base=i*8,size=effect.minSize+random()*(effect.maxSize-effect.minSize),dust=size<=10,
            peak=dust?.78+random()*.22:.22+random()*.20,
            top=.42+random()*.65,
            left=random(),
            rise=H*(dust?(.24+random()*.18):(.16+random()*.14)),
            sway=(random()-.5)*(dust?24:16),
            startProg=random()*.005,
            fadeProg=.01;
      values.set([left,top,size,sway,rise,startProg,fadeProg,peak],base);
    }
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.STATIC_DRAW);groups.push({count,buffer,stride:32,geometryLoc:gl.getAttribLocation(program,'a_geometry'),animationLoc:gl.getAttribLocation(program,'a_animation'),color:rgb(effect.color),kind});
  }
  const progressLoc=gl.getUniformLocation(program,'u_progress'),alphaLoc=gl.getUniformLocation(program,'u_scene_alpha'),colorLoc=gl.getUniformLocation(program,'u_color'),kindLoc=gl.getUniformLocation(program,'u_kind');
  return{
    canvas,
    render(progress,alpha=1){
      gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(progressLoc,progress);
      gl.uniform1f(alphaLoc,alpha);
    for(const group of groups){
        gl.bindBuffer(gl.ARRAY_BUFFER,group.buffer);
        gl.enableVertexAttribArray(group.geometryLoc);
        gl.vertexAttribPointer(group.geometryLoc,4,gl.FLOAT,false,group.stride,0);
        gl.enableVertexAttribArray(group.animationLoc);
        gl.vertexAttribPointer(group.animationLoc,4,gl.FLOAT,false,group.stride,16);
        gl.uniform4fv(colorLoc,group.color);
        gl.uniform1f(kindLoc,group.kind);
        gl.drawArrays(gl.POINTS,0,group.count);
      }
      gl.finish();
    }
  };
}
function getSceneProgress(index,t){
  const start=data.scenes[index].at,end=data.scenes[index+1]?.at??DURATION;
  return clamp((t-start)/Math.max(.001,end-start));
}
function drawFx(t){
  const scenes=data.scenes,fadeHalf=4/FPS;
  const boundary=scenes.findIndex((scene,index)=>index>0&&Math.abs(t-scene.at)<=fadeHalf);
  if(boundary>0){
    const mix=smoothstep(scenes[boundary].at-fadeHalf,scenes[boundary].at+fadeHalf,t);
    if(mix<1){fx.render(getSceneProgress(boundary-1,t),1-mix);ctx.drawImage(fx.canvas,0,0);}
    if(mix>0){fx.render(getSceneProgress(boundary,t),mix);ctx.drawImage(fx.canvas,0,0);}
    return;
  }
  let index=0;for(let i=1;i<scenes.length;i+=1)if(t>=scenes[i].at)index=i;
  fx.render(getSceneProgress(index,t),1);
  ctx.drawImage(fx.canvas,0,0);
}
function drawShadowedText(text,x,y,font,fill){ctx.save();ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#000';ctx.shadowColor='rgba(0,0,0,.60)';ctx.shadowBlur=28;ctx.shadowOffsetY=8;ctx.fillText(text,x,y);ctx.shadowColor='rgba(0,0,0,.90)';ctx.shadowBlur=8;ctx.shadowOffsetY=4;ctx.fillText(text,x,y);ctx.shadowColor='transparent';ctx.fillStyle=fill;ctx.fillText(text,x,y);ctx.restore();}
function drawRoleLabel(cue){
  if(!cue.role.trim())return;
  const blue=cue.tone==='blue';
  const badgeColor=blue?'#7DD3FC':'#FFDF00';
  // Role labels are identity badges: render them as a single static text layer.
  // Karaoke progress and gradient wipe apply only to the spoken subtitle below.
  drawShadowedText(cue.role,W/2,data.badgeY,'700 '+data.badgeSize+'px "Source Han Sans CN Bold","Source Han Sans CN","PingFang SC",sans-serif',badgeColor);
}
function drawSubtitle(t){
  const cue=data.cues.find(item=>t>=item.start&&t<item.end);if(!cue)return;
  const progress=clamp((t-cue.start)/(cue.end-cue.start)),blue=cue.tone==='blue',glowColor=blue?'rgba(56,189,248,.72)':'rgba(255,215,0,.72)';
  drawRoleLabel(cue);
  const font='700 '+data.subtitleSize+'px "Source Han Sans CN Bold","Source Han Sans CN","PingFang SC",sans-serif',x=W/2,y=data.subtitleY;
  drawShadowedText(cue.text,x,y,font,'#FFFFFF');ctx.save();ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';const width=ctx.measureText(cue.text).width;const gradient=ctx.createLinearGradient(0,y-34,0,y+34);if(blue){gradient.addColorStop(0,'#E0F2FE');gradient.addColorStop(.35,'#38BDF8');gradient.addColorStop(1,'#0EA5E9');}else{gradient.addColorStop(0,'#FFF9A6');gradient.addColorStop(.35,'#FFDF00');gradient.addColorStop(1,'#FFC000');}ctx.shadowColor=glowColor;ctx.shadowBlur=28;ctx.fillStyle=gradient;
  if(cue.words?.length){let textOffset=0;for(const word of cue.words){const found=cue.text.indexOf(word.text,textOffset);if(found<0)continue;const before=ctx.measureText(cue.text.slice(0,found)).width;const after=ctx.measureText(cue.text.slice(0,found+word.text.length)).width;const wordProgress=clamp((t-word.start)/Math.max(.001,word.end-word.start));ctx.save();ctx.beginPath();ctx.rect(x-width/2+before-2,y-60,(after-before+4)*wordProgress,120);ctx.clip();ctx.fillText(cue.text,x,y);ctx.restore();textOffset=found+word.text.length;}}
  else{ctx.beginPath();ctx.rect(x-width/2-22,y-60,(width+44)*progress,120);ctx.clip();ctx.fillText(cue.text,x,y);}ctx.restore();
}
function drawTitle(t){
  if(t>=data.titleEnd||!titleImage.complete||!titleImage.naturalWidth)return;
  const alpha=t<=data.titleFadeStart?1:clamp(1-(t-data.titleFadeStart)/Math.max(.001,data.titleEnd-data.titleFadeStart));
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(titleImage,0,0,W,H);ctx.restore();
}
function drawPopups(t){
  for(let i=0;i<data.popups.length;i+=1){
    const popup=data.popups[i],image=popupImages[i];
    if(t<popup.start||t>=popup.end||!image.complete||!image.naturalWidth)continue;
    const enterProgress=popup.enter<=0?1:clamp((t-popup.start)/popup.enter);
    const c1=1.70158,c3=c1+1,p=enterProgress-1;
    const scale=enterProgress>=1?1:1+c3*p*p*p+c1*p*p;
    const fadeStart=popup.end-popup.fadeOut;
    const fade=popup.fadeOut<=0||t<=fadeStart?1:clamp((popup.end-t)/popup.fadeOut);
    const alpha=enterProgress*fade;
    const width=W*popup.width*scale,height=width*image.naturalHeight/image.naturalWidth;
    const x=W*popup.x,y=H*popup.y+Math.sin((t-popup.start)*3.2+i)*H*.003;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.shadowColor='rgba(84,42,10,.34)';ctx.shadowBlur=Math.max(5,W*.016);ctx.shadowOffsetY=Math.max(2,W*.006);ctx.drawImage(image,-width/2,-height/2,width,height);ctx.restore();
  }
}
const fx=createFxRenderer();
return localFrame=>{const frame=Math.max(0,Math.min(TOTAL_FRAMES-1,Math.floor(localFrame))),t=frame/FPS;drawBackground(t);drawFx(t);drawTitle(t);drawPopups(t);drawSubtitle(t);};
`;

export function renderMythicCanvasTrack(
  timeline: Timeline,
  canvas: CanvasSpace,
  window: TemporalWindow,
  title: BlobRef,
  scenes: readonly Scene[],
  cues: readonly Cue[],
  effects: readonly Effect[],
  popups: readonly Popup[],
  options: TrackOptions,
) {
  assertTemporalWindowFor(window, { subjectId: options.id, space: timeline });
  if (scenes.length === 0) throw new Error("Mythic Canvas Track requires at least one Scene.");
  if (cues.length === 0) throw new Error("Mythic Canvas Track requires at least one Cue.");
  const fps = timeline.frameRate.numerator / timeline.frameRate.denominator;
  const totalFrames = window.span.endFrameExclusive - window.span.startFrame;
  const artifacts = [title, ...scenes.map((scene) => scene.image), ...popups.map((popup) => popup.image)];
  const program = browserProgram({
    html: `<canvas class="film-canvas" width="${canvas.widthPx}" height="${canvas.heightPx}"></canvas><img class="title-image" src="${hyperframesResourceUri(title.resource)}" alt="">${scenes.map((scene, index) => `<img class="scene-image" data-scene="${index}" src="${hyperframesResourceUri(scene.image.resource)}" alt="">`).join("")}${popups.map((popup, index) => `<img class="popup-image" data-popup="${index}" src="${hyperframesResourceUri(popup.image.resource)}" alt="">`).join("")}`,
    css: `:scope{position:absolute;inset:0;overflow:hidden;background:transparent}.film-canvas{display:block;width:100%;height:100%}.scene-image,.popup-image,.title-image{display:none}`,
    data: {
      width: canvas.widthPx,
      height: canvas.heightPx,
      fps,
      totalFrames,
      scenes: scenes.map(({ image: _image, ...scene }) => scene),
      cues,
      effects,
      popups: popups.map(({ image: _image, ...popup }) => popup),
      badgeSize: options.badgeSize,
      subtitleSize: options.subtitleSize,
      badgeY: options.badgeY,
      subtitleY: options.subtitleY,
      titleFadeStart: options.titleFadeStart,
      titleEnd: options.titleEnd,
      transparent: options.transparent ?? false,
    },
    setup,
  }, artifacts);

  return sealVisualTrack({
    id: options.id,
    programSpaceId: timeline.id,
    visualIr: "hypit.visual-ir@1",
    presents: [{
      id: options.id,
      span: window.span,
      stacking: { order: 0, tieBreak: options.id },
      elements: [{
        id: `${options.id}-program`,
        kind: "program",
        order: 0,
        program,
        style: [
          { name: "position", value: "absolute" },
          { name: "inset", value: 0 },
          { name: "width", value: `${canvas.widthPx}px` },
          { name: "height", value: `${canvas.heightPx}px` },
        ],
      }],
    }],
  });
}
