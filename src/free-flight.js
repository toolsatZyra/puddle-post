import {Flight,BASE_SPEED,PLAYER_SCALE,clamp,seeded} from './flight.js';
export const FREE_LABELS=['Village letter','Wandering letter','Express letter'];
export class FreeFlight extends Flight {
  reset(x=-4){
    this.free=true;this.random=seeded(this.seed);this.x=x;this.previousX=x;this.y=0;this.previousY=0;this.vx=0;this.vy=0;this.time=0;this.passed=0;this.delivered=0;this.streak=0;this.points=0;this.alive=true;this.speed=BASE_SPEED*.65;this.ceiling=5.4-1.7*PLAYER_SCALE;this.floor=-4.15+.6*PLAYER_SCALE;this.bound=10;this.flapCooldown=0;this.nextId=0;this.gates=[];this.hazards=[];
    for(let i=0;i<6;i++)this.gates.push(this.makeGate(x+7+i*4.8));
  }
  get targetSpeed(){return BASE_SPEED*.65*1.15**(this.level-1);}
  makeGate(x){
    const id=this.nextId++,tier=id<2?0:Math.floor(this.random()*3),mailY=[-1.65,.15,1.7][tier]+(this.random()-.5)*.5;
    if(id>0){const baseY=clamp(mailY+(id%2?1.65:-1.65),-1.8,2.6);this.hazards.push({id,x:x+1.9,previousX:x+1.9,y:baseY,previousY:baseY,baseY,phase:this.random()*6.28,rate:.75+this.random()*.5,amplitude:.35+this.random()*.3,r:.28});}
    return{id,x,previousX:x,center:0,gap:6.5,mailY,tier,reward:[10,25,50][tier],passed:false,delivered:false,missed:false};
  }
  flap(){if(this.alive&&this.flapCooldown<=0){this.vy=Math.min(4.3,this.vy+2.45);this.flapCooldown=.14;}}
  step(dt,axis=0,lift=false){
    if(!this.alive)return[];const events=[];this.time+=dt;this.previousX=this.x;this.previousY=this.y;this.flapCooldown=Math.max(0,this.flapCooldown-dt);if(lift)this.flap();
    this.vx=clamp(this.vx+clamp(axis,-1,1)*8*dt,-4.2,4.2)*Math.exp(-.5*dt);this.vy=Math.max(-5,this.vy-5.6*dt);this.x+=this.vx*dt;this.y+=this.vy*dt;
    if(this.x< -this.bound){this.x=-this.bound;this.vx=Math.max(0,this.vx);}if(this.x>this.bound){this.x=this.bound;this.vx=Math.min(0,this.vx);}
    this.speed+=(this.targetSpeed-this.speed)*(1-Math.exp(-dt*4));
    for(const g of this.gates){g.previousX=g.x;g.x-=this.speed*dt;}
    for(const h of this.hazards){h.previousX=h.x;h.previousY=h.y;h.x-=this.speed*dt;h.y=h.baseY+Math.sin(this.time*h.rate+h.phase)*h.amplitude;}
    const hit=this.hazards.some(h=>Math.abs(h.x-this.x)<.38*PLAYER_SCALE+h.r && this.y-.35*PLAYER_SCALE<h.y+h.r && this.y+1.25*PLAYER_SCALE>h.y-h.r);
    const houseHit=this.gates.some(g=>Math.abs(g.x-this.x)<.8&&this.y-.35*PLAYER_SCALE< -3.1);
    if(this.y<this.floor||this.y>this.ceiling||hit||houseHit){this.alive=false;return[{type:'hit'}];}
    for(const g of this.gates){
      if(!g.delivered&&!g.missed&&Math.abs(g.x+.35-this.x)<.66&&Math.abs(this.y-g.mailY)<.68){
        const level=this.level;g.delivered=true;this.delivered++;this.streak++;const bonus=this.streak%5===0?20:0;this.points+=g.reward+bonus;events.push({type:'delivery',gate:g,streak:this.streak,points:g.reward,bonus});if(this.level>level)events.push({type:'level',level:this.level});
      }
      if(!g.passed&&g.x<this.x-.9){g.passed=true;this.passed++;events.push({type:'pass',gate:g});}
      // A letter remains available when you fly past it: reverse and return.
      if(!g.delivered&&!g.missed&&g.x< -this.bound-1.5){g.missed=true;this.streak=0;}
    }
    for(let i=0;i<this.gates.length;i++)if(this.gates[i].x< -this.bound-5){const last=this.gates.reduce((a,b)=>a.x>b.x?a:b);this.gates[i]=this.makeGate(last.x+4.8);}
    this.hazards=this.hazards.filter(h=>h.x> -this.bound-5);return events;
  }
}
