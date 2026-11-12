const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/mujoco-Ccv7Q0lr.js","assets/rolldown-runtime-CbXtAM7H.js","assets/index-DjS6RlC9.js"])))=>i.map(i=>d[i]);
import{t as e}from"./index-DjS6RlC9.js";import{n as t,o as n}from"./mount-CN1_4t2b.js";var r=[{name:`FL`,hip:`0.1934 0.0465 0`,side:1,thigh:`front_hip`},{name:`FR`,hip:`0.1934 -0.0465 0`,side:-1,thigh:`front_hip`},{name:`RL`,hip:`-0.1934 0.0465 0`,side:1,thigh:`back_hip`},{name:`RR`,hip:`-0.1934 -0.0465 0`,side:-1,thigh:`back_hip`}];function i(e){let t=e.side*.0955,n=e.side*.08;return`
      <body name="${e.name}_hip" pos="${e.hip}">
        <inertial pos="0 0 0" mass="0.678" diaginertia="0.000884 0.000596 0.00048"/>
        <joint name="${e.name}_hip_joint" class="abduction"/>
        <geom size="0.046 0.02" pos="0 ${n} 0" quat="0.707107 0.707107 0 0" type="cylinder" class="collision"/>
        <body name="${e.name}_thigh" pos="0 ${t} 0">
          <inertial pos="0 0 -0.03" mass="1.152" diaginertia="0.00595 0.00584 0.00088"/>
          <joint name="${e.name}_thigh_joint" class="${e.thigh}"/>
          <geom size="0.1065 0.01225 0.017" pos="0 0 -0.1065" quat="0.707107 0 0.707107 0" type="box" class="collision"/>
          <body name="${e.name}_calf" pos="0 0 -0.213">
            <inertial pos="0 0 -0.14" mass="0.241" diaginertia="0.00149 0.00146 0.000053"/>
            <joint name="${e.name}_calf_joint" class="knee"/>
            <geom size="0.012 0.06" pos="0.008 0 -0.06" type="cylinder" class="collision"/>
            <geom name="${e.name}_foot" type="sphere" size="0.022" pos="0 0 -0.213" friction="0.95 0.02 0.01" condim="3" priority="1" solimp="0.9 0.95 0.001"/>
          </body>
        </body>
      </body>`}function a(e){let t=e===`step`?`
    <geom name="pad" type="box" pos="-0.9 0 -0.05" size="1.45 1.6 0.05" friction="1.05 0.02 0.01" condim="3" rgba="0.16 0.2 0.17 1"/>
    <geom name="low" type="box" pos="2.4 0 -0.29" size="2.4 1.6 0.1" friction="1.05 0.02 0.01" condim="3" rgba="0.1 0.12 0.11 1"/>
    <geom name="face" type="box" pos="0.55 0 -0.09" size="0.012 1.6 0.09" rgba="0.55 0.28 0.12 1" contype="0" conaffinity="0"/>`:`
    <geom name="floor" type="box" pos="0 0 -0.05" size="6 6 0.05" friction="1.05 0.02 0.01" condim="3" rgba="0.14 0.18 0.15 1"/>`;return`<mujoco model="go2_class">
  <compiler angle="radian" autolimits="true"/>
  <option timestep="0.002" integrator="implicitfast" gravity="0 0 -9.81" cone="elliptic"/>
  <default>
    <default class="go2">
      <geom friction="0.8" margin="0.001" condim="3" rgba="0.25 0.28 0.27 1"/>
      <joint axis="0 1 0" damping="1.2" armature="0.01" frictionloss="0.15"/>
      <motor ctrlrange="-23.7 23.7" gear="1"/>
      <default class="abduction">
        <joint axis="1 0 0" range="-1.0472 1.0472"/>
      </default>
      <default class="front_hip"><joint range="-1.5708 3.4907"/></default>
      <default class="back_hip"><joint range="-0.5236 4.5379"/></default>
      <default class="knee">
        <joint range="-2.7227 -0.83776"/>
        <motor ctrlrange="-45.43 45.43"/>
      </default>
      <default class="collision"><geom group="3"/></default>
    </default>
  </default>
  <worldbody>
    <light pos="0 0 2" dir="0 0 -1" directional="true"/>
    <body name="base" pos="0 0 0.27" childclass="go2">
      <inertial pos="0.02 0 0" mass="6.921" diaginertia="0.107 0.098 0.0245"/>
      <freejoint/>
      <geom name="trunk" type="box" size="0.188 0.08 0.06" class="collision"/>
      ${r.map(i).join(`
`)}
    </body>
    ${t}
  </worldbody>
  <actuator>
    <motor class="abduction" name="FL_hip" joint="FL_hip_joint"/>
    <motor class="go2" name="FL_thigh" joint="FL_thigh_joint"/>
    <motor class="knee" name="FL_calf" joint="FL_calf_joint"/>
    <motor class="abduction" name="FR_hip" joint="FR_hip_joint"/>
    <motor class="go2" name="FR_thigh" joint="FR_thigh_joint"/>
    <motor class="knee" name="FR_calf" joint="FR_calf_joint"/>
    <motor class="abduction" name="RL_hip" joint="RL_hip_joint"/>
    <motor class="go2" name="RL_thigh" joint="RL_thigh_joint"/>
    <motor class="knee" name="RL_calf" joint="RL_calf_joint"/>
    <motor class="abduction" name="RR_hip" joint="RR_hip_joint"/>
    <motor class="go2" name="RR_thigh" joint="RR_thigh_joint"/>
    <motor class="knee" name="RR_calf" joint="RR_calf_joint"/>
  </actuator>
  <keyframe>
    <key name="home" qpos="0 0 0.27 1 0 0 0 0 0.9 -1.8 0 0.9 -1.8 0 0.9 -1.8 0 0.9 -1.8"/>
  </keyframe>
</mujoco>`}var o=[40,50,65],s=[2,2.4,2.8],c=[23.7,23.7,45.43],l=class r{id=`mujoco`;mujoco;model=null;data=null;terrain=`flat`;footGeom=[0,0,0,0];forceBuf=null;liftT=0;pushT=0;pushFx=0;pushFy=0;tmp=new n;static async create(t){let n=(await e(async()=>{let{default:e}=await import(`./mujoco-Ccv7Q0lr.js`);return{default:e}},__vite__mapDeps([0,1,2]))).default,i=await n(),a=new r;return a.mujoco=i,a.forceBuf=new i.DoubleBuffer(6),a.load(t),a}setTerrain(e){this.load(e)}reset(e){let t=this.mujoco,n=this.model,r=this.data;if(n&&r){t.mj_resetDataKeyframe(n,r,0),u(r.qpos,e);for(let e=0;e<r.qvel.length;e++)r.qvel[e]=0;this.liftT=0,this.pushT=0,t.mj_forward(n,r)}}push(e){let t=Math.atan2(2*(e.quat[0]*e.quat[3]+e.quat[1]*e.quat[2]),1-2*(e.quat[2]**2+e.quat[3]**2)),n=Math.sin(t),r=-Math.cos(t);this.pushFx=n*150,this.pushFy=r*150,this.pushT=.28}lift(){this.liftT=.48}step(e,n,r){let i=this.model,a=this.data;if(!i||!a)return f(e);let l=Math.max(.05,Math.min(1.5,n)),u=a.qpos,p=a.qvel,m=a.ctrl,h=a.qfrc_bias;for(let t=0;t<12;t++){let n=t%3,i=o[n]*l*(e.joints[t]-u[7+t])-s[n]*l*p[6+t];r&&(i+=h[6+t]);let a=c[n]*Math.min(1.4,l);m[t]=Math.max(-a,Math.min(a,i))}let g=a.xfrc_applied;g.fill(0);let _=380*l,v=70*l,y=_*(e.pos[0]-u[0])-v*p[0],b=_*(e.pos[1]-u[1])-v*p[1],x=_*(e.pos[2]-u[2])-v*p[2],S=70*l,C=80*l,w=Math.hypot(y,b)||1;w>S&&(y*=S/w,b*=S/w),x=Math.max(-C,Math.min(C,x)),this.liftT>0&&(x+=220,this.liftT-=.002),this.pushT>0&&(y+=this.pushFx,b+=this.pushFy,this.pushT-=.002);let[T,E,D,O]=d(e.quat,[u[3],-u[4],-u[5],-u[6]]),k=T<0?-1:1,A=16*l,j=3.2*l,M=k*E*2*A-j*p[3],N=k*D*2*A-j*p[4],P=k*O*2*A-j*p[5];this.pushT>0&&(M+=-.11*this.pushFy,N+=.11*this.pushFx);let F=Math.hypot(M,N,P)||1,I=12*l;F>I&&(M*=I/F,N*=I/F,P*=I/F),g[6]=y,g[7]=b,g[8]=x,g[9]=M,g[10]=N,g[11]=P,this.mujoco.mj_step(i,a);let L=[0,0,0,0],R=[],z=a.contact,B=z.size(),V=this.forceBuf;for(let e=0;e<B;e++){let n=z.get(e);if(!n)continue;let r=this.footGeom.indexOf(n.geom1);if(r<0&&(r=this.footGeom.indexOf(n.geom2)),V){this.mujoco.mj_contactForce(i,a,e,V);let t=V.GetView();r>=0&&(L[r]+=Math.abs(t[0]??0))}let o=n.pos;o&&o.length>=3&&R.length<24&&(t(o[0],o[1],o[2],this.tmp),R.push(this.tmp.x,this.tmp.y,this.tmp.z)),n.delete()}z.delete();let H=a.qfrc_actuator,U=e.joints.slice();for(let e=0;e<12;e++)U[e]=u[7+e];return{pos:[u[0],u[1],u[2]],quat:[u[3],u[4],u[5],u[6]],joints:U,feet:L,contacts:B,servo:Math.hypot(y,b,x),dots:R,actuator:H?Array.from(H.slice(6,18)):void 0}}dispose(){this.data?.delete(),this.model?.delete(),this.forceBuf?.delete(),this.data=null,this.model=null,this.forceBuf=null}load(e){this.data?.delete(),this.model?.delete(),this.model=this.mujoco.MjModel.from_xml_string(a(e)),this.data=new this.mujoco.MjData(this.model),this.mujoco.mj_resetDataKeyframe(this.model,this.data,0),this.mujoco.mj_forward(this.model,this.data);let t=this.mujoco.mjtObj.mjOBJ_GEOM.value;this.footGeom=[`FL_foot`,`FR_foot`,`RL_foot`,`RR_foot`].map(e=>this.mujoco.mj_name2id(this.model,t,e)),this.terrain=e}};function u(e,t){e[0]=t.pos[0],e[1]=t.pos[1],e[2]=t.pos[2],e[3]=t.quat[0],e[4]=t.quat[1],e[5]=t.quat[2],e[6]=t.quat[3];for(let n=0;n<12;n++)e[7+n]=t.joints[n]}function d(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return[n*o-r*s-i*c-a*l,n*s+r*o+i*l-a*c,n*c-r*l+i*o+a*s,n*l+r*c-i*s+a*o]}function f(e){return{pos:e.pos,quat:e.quat,joints:e.joints,feet:[0,0,0,0],contacts:0,servo:0,dots:[]}}export{l as MujocoEngine};