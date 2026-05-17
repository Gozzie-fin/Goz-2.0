import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, loadFromSupabase, saveToSupabase } from "./supabase";

/* ── Fonts & Global Styles ── */
(() => {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap";
  document.head.appendChild(l);
  const s = document.createElement("style");
  s.textContent = `
    *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{display:none} body{background:#050507;overflow-x:hidden}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes scaleIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
    @keyframes popIn{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
    .fadeUp{animation:fadeUp .38s cubic-bezier(.22,.68,0,1.2) both}
    .scaleIn{animation:scaleIn .32s cubic-bezier(.22,.68,0,1.2) both}
    .popIn{animation:popIn .4s cubic-bezier(.22,.68,0,1.2) both}
    .press:active{transform:scale(0.96);transition:transform .1s}
    input,textarea{-webkit-appearance:none;appearance:none;background:transparent}
    input:focus,textarea:focus{outline:none}
    @keyframes ambient-drift{0%{transform:translate(0,0) rotate(0deg)}100%{transform:translate(-3%,2%) rotate(2deg)}}
    .stagger>*{animation:stagger-in .5s cubic-bezier(.2,.8,.2,1) both}
    .stagger>*:nth-child(1){animation-delay:.05s}.stagger>*:nth-child(2){animation-delay:.12s}.stagger>*:nth-child(3){animation-delay:.19s}.stagger>*:nth-child(4){animation-delay:.26s}.stagger>*:nth-child(5){animation-delay:.33s}.stagger>*:nth-child(6){animation-delay:.40s}
    @keyframes stagger-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    .screen-enter{animation:stagger-in .45s cubic-bezier(.2,.8,.2,1) both}
    .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
    .serif{font-family:'Instrument Serif','Times New Roman',serif;font-style:italic}
    .eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,0.38)}
    .eyebrow-accent{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.16em;color:oklch(0.92 0.22 130)}
  `;
  document.head.appendChild(s);
})();

/* ── Constants ── */
const SK = "goz_transfo_v3";
const PHASES = [
  {id:1,label:"Phase 1",name:"Detox & Reset",     days:[1,30],  color:"#FF453A",grad:"linear-gradient(135deg,#FF453A,#FF6B35)"},
  {id:2,label:"Phase 2",name:"Build Momentum",    days:[31,60], color:"#FF9F0A",grad:"linear-gradient(135deg,#FF9F0A,#FFD60A)"},
  {id:3,label:"Phase 3",name:"Definition",        days:[61,90], color:"#30D158",grad:"linear-gradient(135deg,#30D158,#34C759)"},
  {id:4,label:"Phase 4",name:"Lock It In",        days:[91,120],color:"#0A84FF",grad:"linear-gradient(135deg,#0A84FF,#5E5CE6)"},
];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MOODS = [
  {label:"Amazing",emoji:"🔥",score:5,color:"#30D158"},
  {label:"Good",   emoji:"😊",score:4,color:"#34C759"},
  {label:"Neutral",emoji:"😐",score:3,color:"#FFD60A"},
  {label:"Rough",  emoji:"😞",score:2,color:"#FF9F0A"},
  {label:"Bad",    emoji:"😤",score:1,color:"#FF453A"},
];
const ENERGY = [
  {label:"High",  emoji:"⚡",score:3,color:"#30D158"},
  {label:"Medium",emoji:"🔋",score:2,color:"#FFD60A"},
  {label:"Low",   emoji:"🪫",score:1,color:"#FF453A"},
];
const EMOTIONS = ["Motivated","Anxious","Calm","Angry","Hopeful","Lonely","Proud","Tired","Focused","Grateful","Restless","Sad"];

const PLAYLISTS = [
  {name:"Beast Mode",     vibe:"Hip-Hop · Trap",    desc:"Heavy beats for push days",  icon:"🔥",ic2:"#FF453A",
   sp:"https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP",yt:"https://www.youtube.com/results?search_query=beast+mode+workout+playlist"},
  {name:"Run Harder",     vibe:"Electronic · EDM",   desc:"Pace-setter for your 4km",   icon:"🏃",ic2:"#0A84FF",
   sp:"https://open.spotify.com/playlist/37i9dQZF1DX32NsLKyzScr",yt:"https://www.youtube.com/results?search_query=running+motivation+playlist"},
  {name:"HIIT Energy",    vibe:"Drum & Bass · House",desc:"High-tempo for intervals",    icon:"⚡",ic2:"#FF9F0A",
   sp:"https://open.spotify.com/playlist/37i9dQZF1DWUVpAXiEPK8P",yt:"https://www.youtube.com/results?search_query=hiit+workout+music"},
  {name:"Grind Mentality",vibe:"Motivational · Rock", desc:"Core & bodyweight sessions", icon:"💪",ic2:"#30D158",
   sp:"https://open.spotify.com/playlist/37i9dQZF1DX70RN3TfWWJh",yt:"https://www.youtube.com/results?search_query=gym+motivation+workout+music"},
  {name:"Morning Walk",   vibe:"Afrobeats · Chill",  desc:"10k steps vibes",            icon:"☀️",ic2:"#BF5AF2",
   sp:"https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6",yt:"https://www.youtube.com/results?search_query=morning+walk+upbeat+playlist"},
  {name:"Recovery Flow",  vibe:"Lo-fi · Ambient",    desc:"Rest day & stretch",          icon:"🧘",ic2:"#64D2FF",
   sp:"https://open.spotify.com/playlist/37i9dQZF1DWZqd5JICZI0u",yt:"https://www.youtube.com/results?search_query=lofi+chill+recovery+playlist"},
];

const getPhaseForDay = d => d<=30?1:d<=60?2:d<=90?3:4;

const getWorkout = (dow,phase) => {
  const p = Math.min(4,Math.max(1,phase));
  const W = {
    Monday:   {1:["5×20 Push-ups = 100","3×20 Sit-ups","2×30s Plank","10,000 steps"],2:["5×30 Push-ups = 150","4×20 Sit-ups","3×45s Plank","3×20 Squats","10,000 steps"],3:["5×40 Push-ups = 200","Core circuit 4 rounds","3×20 Diamond push-ups","10,000 steps"],4:["5×40 Push-ups","Core 4 rounds","3×15 Pike push-ups","3×20 Tricep dips","10,000 steps"]},
    Tuesday:  {1:["2km run + 2km walk","10,000 steps","Sit-up cooldown"],2:["3km run + 1km walk","10,000 steps","Leg raises"],3:["4km full run","10,000 steps","Stretch 10 min"],4:["4km + 8×30s sprints","12,000 steps","Stretch 10 min"]},
    Wednesday:{1:["10,000 steps easy","3×20 Sit-ups","Stretch 15 min"],2:["Brisk 10,000 steps","3×20 Bicycle crunches","Stretch 15 min"],3:["10-12k steps","Core circuit 3 rounds","Foam roll"],4:["12,000 steps","Core circuit 4 rounds","Cold shower"]},
    Thursday: {1:["5×20 Push-ups = 100","3×15 Leg raises","2×30s Plank","10,000 steps"],2:["5×30 Push-ups = 150","Core circuit 4 rounds","3×20 Lunges","10,000 steps"],3:["5×40 Push-ups = 200","HIIT 20s/10s x8","10,000 steps"],4:["5×40 Push-ups","HIIT 20s/10s x10","3×20 Squats","10,000 steps"]},
    Friday:   {1:["2km run + 2km walk","3×20 Push-ups","10,000 steps"],2:["3km run + 1km walk","HIIT 15 min","10,000 steps"],3:["4km run","HIIT 20s/10s x8","10,000 steps"],4:["4km run","HIIT 20s/10s x10","12,000 steps"]},
    Saturday: {1:["3×20 Push-ups","3×20 Squats","3×20 Sit-ups","10,000 steps"],2:["4×25 Push-ups","4×20 Squats","3×20 Lunges","Core 3 rounds","10,000 steps"],3:["5×40 Push-ups","Full circuit 4 rounds","HIIT finisher","10,000 steps"],4:["Full circuit","HIIT finisher","12,000 steps"]},
    Sunday:   {1:["Easy 10,000 step walk","Full stretch 20 min","Rest"],2:["10,000 steps easy","Mobility 20 min","Rest"],3:["10,000 steps","Stretch & mobility","Optional cold shower"],4:["10,000 steps","Stretch & mobility","Plan next week"]},
  };
  return W[dow]?.[p] || ["10,000 steps","Rest & recover"];
};

const getMeals = ph => [null,
  {b:"3 eggs · toast · banana · coffee",l:"Tuna · white rice · cucumber",s:"Apple · almonds",d:"150g chicken · lentils · broccoli",cal:1800,avoid:"Alcohol · fried food · soda"},
  {b:"4 egg whites + 1 egg · oats · coffee",l:"150g tuna · sweet potato · greens",s:"Greek yogurt · honey",d:"200g chicken · steamed veg · lentils",cal:1650,avoid:"Sugar in coffee · pasta · eating after 9pm"},
  {b:"3 boiled eggs · oats · lemon water",l:"200g tuna/chicken · big salad · ACV",s:"Boiled egg + cucumber",d:"150g protein · steamed veg · NO starch",cal:1550,avoid:"Carbs at dinner · juice · eating after 8pm"},
  {b:"3 eggs + oats · lemon water",l:"200g protein · complex carb · salad",s:"Greek yogurt or egg",d:"200g lean protein · veg · tea",cal:1500,avoid:"All processed food · sugar · alcohol"},
][Math.min(4,Math.max(1,ph))];

/* ── Daily Quotes ── */
const QUOTES = [
  // Bible verses
  {t:"I can do all things through Christ who strengthens me.",a:"Philippians 4:13",cat:"bible"},
  {t:"For I know the plans I have for you — plans to prosper you and not to harm you, plans to give you hope and a future.",a:"Jeremiah 29:11",cat:"bible"},
  {t:"Be strong and courageous. Do not be afraid; the Lord your God will be with you wherever you go.",a:"Joshua 1:9",cat:"bible"},
  {t:"Trust in the Lord with all your heart and lean not on your own understanding.",a:"Proverbs 3:5",cat:"bible"},
  {t:"And we know that in all things God works for the good of those who love him.",a:"Romans 8:28",cat:"bible"},
  {t:"Do not conform to the pattern of this world, but be transformed by the renewing of your mind.",a:"Romans 12:2",cat:"bible"},
  {t:"But those who wait upon the Lord shall renew their strength; they shall mount up with wings as eagles.",a:"Isaiah 40:31",cat:"bible"},
  {t:"The Lord is my strength and my shield; my heart trusts in him, and he helps me.",a:"Psalm 28:7",cat:"bible"},
  {t:"Delight yourself in the Lord, and he will give you the desires of your heart.",a:"Psalm 37:4",cat:"bible"},
  {t:"Whatever you ask for in prayer, believe that you have received it, and it will be yours.",a:"Mark 11:24",cat:"bible"},
  {t:"Commit your works to the Lord, and your plans will be established.",a:"Proverbs 16:3",cat:"bible"},
  {t:"No weapon formed against you shall prosper.",a:"Isaiah 54:17",cat:"bible"},
  {t:"Be still, and know that I am God.",a:"Psalm 46:10",cat:"bible"},
  {t:"With God all things are possible.",a:"Matthew 19:26",cat:"bible"},
  {t:"The Lord your God is in your midst, a mighty one who will save; he will rejoice over you with gladness.",a:"Zephaniah 3:17",cat:"bible"},
  {t:"For God gave us a spirit not of fear but of power and love and self-control.",a:"2 Timothy 1:7",cat:"bible"},
  {t:"Cast all your anxiety on him because he cares for you.",a:"1 Peter 5:7",cat:"bible"},
  // Christian motivational
  {t:"God doesn't call the equipped. He equips the called.",a:"",cat:"christian"},
  {t:"You are not defined by your past. You are prepared by it.",a:"",cat:"christian"},
  {t:"Faith is taking the first step even when you don't see the whole staircase.",a:"Martin Luther King Jr.",cat:"christian"},
  {t:"Let your faith be bigger than your fear.",a:"",cat:"christian"},
  {t:"The will of God will never take you where the grace of God cannot keep you.",a:"",cat:"christian"},
  {t:"God's plan is always better than our own.",a:"",cat:"christian"},
  {t:"Your hardest times often lead to the greatest moments of your life. Keep going. Tough situations build strong people.",a:"Roy T. Bennett",cat:"christian"},
  {t:"Character is doing the right thing when nobody's looking.",a:"J.C. Watts",cat:"christian"},
  {t:"You may have to fight a battle more than once to win it.",a:"Margaret Thatcher",cat:"christian"},
  {t:"God is within her, she will not fall.",a:"Psalm 46:5",cat:"christian"},
  {t:"Prayer is not asking. It is a longing of the soul.",a:"Mahatma Gandhi",cat:"christian"},
  {t:"The secret of change is to focus all of your energy not on fighting the old but on building the new.",a:"Socrates",cat:"christian"},
  // Motivational
  {t:"Discipline is choosing between what you want now and what you want most.",a:"",cat:"motivational"},
  {t:"Push yourself, because no one else is going to do it for you.",a:"",cat:"motivational"},
  {t:"Great things never come from comfort zones.",a:"",cat:"motivational"},
  {t:"Don't stop when you're tired. Stop when you're done.",a:"",cat:"motivational"},
  {t:"Wake up with determination. Go to bed with satisfaction.",a:"",cat:"motivational"},
  {t:"Do something today that your future self will thank you for.",a:"",cat:"motivational"},
  {t:"It's going to be hard, but hard is not impossible.",a:"",cat:"motivational"},
  {t:"You didn't come this far to only come this far.",a:"",cat:"motivational"},
  {t:"Work hard in silence. Let your success be the noise.",a:"",cat:"motivational"},
  {t:"Success is the sum of small efforts repeated day in and day out.",a:"Robert Collier",cat:"motivational"},
  {t:"The secret of getting ahead is getting started.",a:"Mark Twain",cat:"motivational"},
  {t:"You are one decision away from a completely different life.",a:"",cat:"motivational"},
  {t:"If you want to change your life, start with changing your habits.",a:"",cat:"motivational"},
  {t:"Small steps every day. Big results over time.",a:"",cat:"motivational"},
  {t:"Every expert was once a beginner.",a:"",cat:"motivational"},
  {t:"The harder you work for something, the greater you'll feel when you achieve it.",a:"",cat:"motivational"},
  {t:"Success doesn't just find you. You have to go out and get it.",a:"",cat:"motivational"},
  {t:"Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.",a:"Christian D. Larson",cat:"motivational"},
  {t:"The key to success is to focus on goals, not obstacles.",a:"",cat:"motivational"},
  // Inspirational
  {t:"The best way to predict the future is to create it.",a:"Abraham Lincoln",cat:"inspirational"},
  {t:"You are braver than you believe, stronger than you seem, and smarter than you think.",a:"A.A. Milne",cat:"inspirational"},
  {t:"In the middle of every difficulty lies opportunity.",a:"Albert Einstein",cat:"inspirational"},
  {t:"It always seems impossible until it's done.",a:"Nelson Mandela",cat:"inspirational"},
  {t:"The only way to do great work is to love what you do.",a:"Steve Jobs",cat:"inspirational"},
  {t:"The journey of a thousand miles begins with one step.",a:"Lao Tzu",cat:"inspirational"},
  {t:"Turn your wounds into wisdom.",a:"Oprah Winfrey",cat:"inspirational"},
  {t:"Everything you've ever wanted is on the other side of fear.",a:"George Addair",cat:"inspirational"},
  {t:"Happiness is not something ready-made. It comes from your own actions.",a:"Dalai Lama",cat:"inspirational"},
  {t:"The best revenge is massive success.",a:"Frank Sinatra",cat:"inspirational"},
  {t:"It does not matter how slowly you go as long as you do not stop.",a:"Confucius",cat:"inspirational"},
  {t:"Strive not to be a success, but rather to be of value.",a:"Albert Einstein",cat:"inspirational"},
  {t:"Spread love everywhere you go. Let no one ever come to you without leaving happier.",a:"Mother Teresa",cat:"inspirational"},
  {t:"Don't judge each day by the harvest you reap but by the seeds that you plant.",a:"Robert Louis Stevenson",cat:"inspirational"},
  {t:"The purpose of our lives is to be happy.",a:"Dalai Lama",cat:"inspirational"},
  {t:"Life is not measured by the number of breaths we take, but by the moments that take our breath away.",a:"Maya Angelou",cat:"inspirational"},
  {t:"I have learned over the years that when one's mind is made up, this diminishes fear.",a:"Rosa Parks",cat:"inspirational"},
  {t:"You must be the change you wish to see in the world.",a:"Mahatma Gandhi",cat:"inspirational"},
  // Life experience
  {t:"In three words I can sum up everything I've learned about life: it goes on.",a:"Robert Frost",cat:"life"},
  {t:"You cannot change your destination overnight, but you can change your direction overnight.",a:"Jim Rohn",cat:"life"},
  {t:"The quality of your life is determined by the quality of your habits.",a:"",cat:"life"},
  {t:"Pain is temporary. Pride is forever.",a:"",cat:"life"},
  {t:"Eat well. Sleep well. Move daily. Think clearly. The rest follows.",a:"",cat:"life"},
  {t:"Today's actions are tomorrow's results.",a:"",cat:"life"},
  {t:"Success is not final; failure is not fatal: it is the courage to continue that counts.",a:"Winston Churchill",cat:"life"},
  {t:"The most valuable thing you can make is a mistake — you can't learn anything from being perfect.",a:"Adam Osborne",cat:"life"},
  {t:"Life is really simple, but we insist on making it complicated.",a:"Confucius",cat:"life"},
  {t:"You get in life what you have the courage to ask for.",a:"Oprah Winfrey",cat:"life"},
  {t:"An unexamined life is not worth living.",a:"Socrates",cat:"life"},
  {t:"The most common form of despair is not being who you are.",a:"Kierkegaard",cat:"life"},
  {t:"Life is short, and it's up to you to make it sweet.",a:"Sarah Louise Delany",cat:"life"},
  {t:"We know what we are, but know not what we may be.",a:"William Shakespeare",cat:"life"},
  {t:"A year from now you may wish you had started today.",a:"Karen Lamb",cat:"life"},
  {t:"Knowing yourself is the beginning of all wisdom.",a:"Aristotle",cat:"life"},
];
const QUOTE_CAT_COLOR = {bible:"oklch(0.92 0.22 130)",christian:"oklch(0.85 0.18 200)",motivational:"oklch(0.92 0.22 130)",inspirational:"oklch(0.78 0.22 340)",life:"oklch(0.85 0.18 200)"};
const QUOTE_CAT_LABEL = {bible:"Bible",christian:"Christian",motivational:"Motivational",inspirational:"Inspirational",life:"Life"};
const getDayQuotes = day => {
  const n = QUOTES.length;
  return [
    QUOTES[((day-1)*1)   % n],
    QUOTES[((day-1)*37+7) % n],
    QUOTES[((day-1)*73+23)% n],
  ];
};

/* ── Storage ── */
const load = () => { try{ const r=localStorage.getItem(SK); if(r) return JSON.parse(r); }catch{} return {startDate:null,logs:{},startWeight:80,meds:[]}; };
const save = d => { try{ localStorage.setItem(SK,JSON.stringify(d)); }catch{} };

/* ── Design Tokens ── */
const T = {
  bg0:"#050507",bg1:"#0b0b0e",bg2:"#131318",bg3:"#1a1a21",
  hair:"rgba(255,255,255,0.06)",hairS:"rgba(255,255,255,0.10)",
  t1:"rgba(255,255,255,0.96)",t2:"rgba(255,255,255,0.62)",t3:"rgba(255,255,255,0.38)",t4:"rgba(255,255,255,0.22)",
  lime:"oklch(0.92 0.22 130)",limeS:"oklch(0.92 0.22 130 / 0.18)",limeG:"oklch(0.92 0.22 130 / 0.5)",
  cyan:"oklch(0.85 0.18 200)",cyanS:"oklch(0.85 0.18 200 / 0.18)",
  mag:"oklch(0.78 0.22 340)",magS:"oklch(0.78 0.22 340 / 0.18)",
  fD:"'Space Grotesk',-apple-system,sans-serif",
  fM:"'JetBrains Mono',ui-monospace,monospace",
  fS:"'Instrument Serif','Times New Roman',serif",
  // backward compat refs
  bg:"#050507",sur:"rgba(255,255,255,0.025)",sur2:"rgba(255,255,255,0.012)",
  brd:"rgba(255,255,255,0.06)",brd2:"rgba(255,255,255,0.10)",
  txt:"rgba(255,255,255,0.96)",txt2:"rgba(255,255,255,0.62)",txt3:"rgba(255,255,255,0.38)",
  font:"'Space Grotesk',-apple-system,sans-serif",
  disp:"'Instrument Serif','Times New Roman',serif",
  r:22,r2:14,
};

/* ── Apple Fitness Nested Rings ── */
function ActivityRings({move=0,exercise=0,stand=0,size=170}){
  const sM=14,sE=12,sS=10,gap=10;
  const rM=(size-sM)/2,rE=rM-sM/2-gap-sE/2,rS=rE-sE/2-gap-sS/2;
  const circ=r=>2*Math.PI*r, off=(r,p)=>circ(r)*(1-Math.min(1,p/100));
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)",overflow:"visible"}}>
        {[[rM,sM,"rgba(206,255,0,0.08)"],[rE,sE,"rgba(0,210,255,0.08)"],[rS,sS,"rgba(255,80,200,0.08)"]].map(([r,sw,c],i)=>(
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={sw}/>
        ))}
        <circle cx={size/2} cy={size/2} r={rM} fill="none" stroke="oklch(0.92 0.22 130)" strokeWidth={sM}
          strokeLinecap="round" strokeDasharray={circ(rM)} strokeDashoffset={off(rM,move)}
          style={{transition:"stroke-dashoffset 1.4s cubic-bezier(.22,.68,0,1.2) 0s",filter:"drop-shadow(0 0 10px oklch(0.92 0.22 130 / 0.6))"}}/>
        <circle cx={size/2} cy={size/2} r={rE} fill="none" stroke="oklch(0.85 0.18 200)" strokeWidth={sE}
          strokeLinecap="round" strokeDasharray={circ(rE)} strokeDashoffset={off(rE,exercise)}
          style={{transition:"stroke-dashoffset 1.4s cubic-bezier(.22,.68,0,1.2) .15s",filter:"drop-shadow(0 0 10px oklch(0.85 0.18 200 / 0.6))"}}/>
        <circle cx={size/2} cy={size/2} r={rS} fill="none" stroke="oklch(0.78 0.22 340)" strokeWidth={sS}
          strokeLinecap="round" strokeDasharray={circ(rS)} strokeDashoffset={off(rS,stand)}
          style={{transition:"stroke-dashoffset 1.4s cubic-bezier(.22,.68,0,1.2) .3s",filter:"drop-shadow(0 0 10px oklch(0.78 0.22 340 / 0.6))"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3}}>
        <div style={{fontFamily:T.fM,fontSize:10,color:"oklch(0.92 0.22 130)",fontWeight:700,letterSpacing:.5}}>MOVE</div>
        <div style={{fontFamily:T.fM,fontSize:8,color:"oklch(0.85 0.18 200)",fontWeight:600,letterSpacing:.4}}>EXERCISE</div>
        <div style={{fontFamily:T.fM,fontSize:8,color:"oklch(0.78 0.22 340)",fontWeight:600,letterSpacing:.4}}>STAND</div>
      </div>
    </div>
  );
}

/* Single ring */
function Ring({size=38,stroke=5,pct=0,color="#FF453A"}){
  const r=(size-stroke)/2, c=2*Math.PI*r, o=c*(1-Math.min(1,pct/100));
  return (
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={o}
          style={{transition:"stroke-dashoffset 1s cubic-bezier(.22,.68,0,1.2)"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:7,color:T.txt3,fontWeight:700}}>{pct>0?Math.min(999,pct):"—"}</span>
      </div>
    </div>
  );
}

/* ── Micro UI ── */
const Card = ({children,style,onClick,cn=""}) => (
  <div className={`press ${cn}`} onClick={onClick} style={{
    background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",
    borderRadius:22,border:"1px solid rgba(255,255,255,0.06)",
    overflow:"hidden",cursor:onClick?"pointer":"default",...style
  }}>{children}</div>
);
const Dv = () => <div style={{height:1,background:T.brd}}/>;
const Lb = ({children,style}) => <div style={{fontFamily:T.font,fontSize:13,fontWeight:600,color:T.txt2,marginBottom:10,letterSpacing:.2,...style}}>{children}</div>;
const IS = {width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,color:"rgba(255,255,255,0.96)",fontFamily:"'JetBrains Mono',ui-monospace,monospace",fontSize:16,padding:"14px 16px",letterSpacing:"-0.01em"};

const PhaseTrack = ({day,total=120}) => {
  const phases=[{d:30},{d:30},{d:30},{d:30}];
  let cum=0;
  return (
    <div style={{display:"flex",gap:4,width:"100%"}}>
      {phases.map((p,i)=>{
        const start=cum,end=cum+p.d; cum=end;
        const segPct=Math.max(0,Math.min(1,(day-start)/p.d));
        const isCurr=day>start&&day<=end;
        return <div key={i} style={{flex:p.d,height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",position:"relative"}}>
          <div style={{position:"absolute",inset:0,width:`${segPct*100}%`,background:isCurr?"oklch(0.92 0.22 130)":"rgba(255,255,255,0.5)",boxShadow:isCurr?"0 0 8px oklch(0.92 0.22 130 / 0.5)":"none",borderRadius:2,transition:"width 1s cubic-bezier(.2,.8,.2,1)"}}/>
        </div>;
      })}
    </div>
  );
};

/* ════════════════════════════════════════════════════
   MAIN APP
════════════════════════════════════════════════════ */
export default function GozTransfo() {
  const [data,setData]   = useState(load);
  const [view,setView]   = useState("home");
  const [setup,setSetup] = useState(0);
  const [ts,setTs]       = useState("");
  const [tw,setTw]       = useState("80");
  const [selDay,setSD]   = useState(1);
  const [ak,setAk]       = useState(0);
  const ref              = useRef(null);
  const sbTimer          = useRef(null);
  const savedTimer       = useRef(null);

  // Auth state
  const [user,setUser]         = useState(null);
  const [authReady,setAuthReady]= useState(false);
  const [synced,setSynced]     = useState(false);
  const [authEmail,setAuthEmail]= useState("");
  const [authPass,setAuthPass] = useState("");
  const [authErr,setAuthErr]   = useState("");
  const [authBusy,setAuthBusy] = useState(false);
  const [authMode,setAuthMode] = useState("login"); // "login" | "signup"
  const [syncStatus,setSyncStatus] = useState("idle"); // "idle" | "saving" | "saved"

  // Notification state
  const [notifPerm,setNotifPerm]   = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [notifBanner,setNotifBanner]= useState(false);

  // Meds state
  const [showAddMed,setShowAddMed] = useState(false);
  const [medForm,setMedForm]       = useState({name:"",dose:"",time:"08:00",category:"Supplement",notes:""});

  // Diet dashboard state — hoisted to avoid React hook-in-function violations
  const [dietTab,  setDietTab]  = useState("log");
  const [activeSug,setActiveSug]= useState(null);
  const [showAddB, setShowAddB] = useState(false);
  const [showAddL, setShowAddL] = useState(false);
  const [showAddS, setShowAddS] = useState(false);
  const [showAddD, setShowAddD] = useState(false);
  const [custNameB,setCustNameB]= useState("");
  const [custCalB, setCustCalB] = useState("");
  const [custNameL,setCustNameL]= useState("");
  const [custCalL, setCustCalL] = useState("");
  const [custNameS,setCustNameS]= useState("");
  const [custCalS, setCustCalS] = useState("");
  const [custNameD,setCustNameD]= useState("");
  const [custCalD, setCustCalD] = useState("");

  // Init Supabase auth session
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user??null);
      setAuthReady(true);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>{
      setUser(session?.user??null);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // Load server data once user is known
  useEffect(()=>{
    if(!user) return;
    loadFromSupabase(user.id).then(serverData=>{
      if(serverData) setData(serverData);
      setSynced(true);
    });
  },[user]);

  // Save to localStorage immediately; debounce Supabase write by 1.5s
  useEffect(()=>{ save(data); },[data]);
  useEffect(()=>{
    if(!user||!synced) return;
    setSyncStatus("saving");
    clearTimeout(sbTimer.current);
    clearTimeout(savedTimer.current);
    sbTimer.current=setTimeout(async ()=>{
      await saveToSupabase(user.id,data);
      setSyncStatus("saved");
      savedTimer.current=setTimeout(()=>setSyncStatus("idle"),2500);
    },1500);
    return ()=>{ clearTimeout(sbTimer.current); clearTimeout(savedTimer.current); };
  },[data,user,synced]);

  // ── Notification helpers ──────────────────────────────────────
  const askNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPerm(result);
    setNotifBanner(false);
    if (result === 'granted') scheduleReminders();
  };

  const scheduleReminders = useCallback(() => {
    if (!('serviceWorker' in navigator)) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then(reg => {
      if (!reg.active) return;
      reg.active.postMessage({ type: 'SCHEDULE', notifications: buildSchedule() });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const buildSchedule = () => {
    const now  = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // helper: next occurrence of HH:MM (pushes to tomorrow if already past)
    const at = (h, m) => {
      const t = new Date(base.getTime() + h * 3600000 + m * 60000);
      if (t <= now) t.setDate(t.getDate() + 1);
      return t.getTime();
    };

    const cdV  = cdFn();
    const l    = (data.logs[cdV] || {});
    const yl   = (data.logs[cdV - 1] || {});

    // Meds routines from config
    const meds = data.meds || [];

    // Yesterday's score for progress-check tone
    const ROUTINE_IDS = ["brushTeeth","prayers","scripture","workout","cooking","studying","french","goals","reading","socialreach","cleaning"];
    const yCheckins   = ["noAlcohol","noPorn","workoutDone","drank3L","ate10k","sleptWell"].filter(f => yl[f]).length;
    const yRoutines   = ROUTINE_IDS.filter(id => (yl.routines || {})[id]).length;
    const yScore      = cdV > 1 ? Math.round((yCheckins + yRoutines) / (6 + ROUTINE_IDS.length) * 100) : 100;
    const routinesDone = ROUTINE_IDS.filter(id => (l.routines || {})[id]).length;

    // Days since last log entry
    let daysSilent = 0;
    for (let d = cdV - 1; d >= Math.max(1, cdV - 7); d--) {
      if (Object.keys(data.logs[d] || {}).length > 0) break;
      daysSilent++;
    }

    const ns = [];

    // 06:50 — Morning kickoff
    let morningBody;
    if (daysSilent >= 2)
      morningBody = `You haven't logged in ${daysSilent} days, Goz. Day ${cdV} starts NOW. No more gaps.`;
    else if (yScore < 45 && cdV > 1)
      morningBody = `Yesterday was only ${yScore}% complete. Today you fix that. Prayers. Scripture. Move. 🔥`;
    else
      morningBody = `Good morning! Day ${cdV} of 120. Hydrate first, then prayers & scripture. Let's go.`;
    ns.push({ time: at(6, 50), title: 'Goz 2.0 · Rise & Grind 🌅', body: morningBody, tag: 'morning' });

    // Medication reminders (one per med, at its configured time)
    meds.forEach((med, i) => {
      if (!med.time) return;
      const [mh, mm] = med.time.split(':').map(Number);
      const taken = !!(l.meds || {})[med.name || i];
      if (!taken) {
        ns.push({
          time: at(mh, mm),
          title: `💊 ${med.name || 'Medication'} reminder`,
          body: `${med.dose ? med.dose + ' — ' : ''}Don't skip it. Consistency is the game.`,
          tag: `med-${i}`,
        });
      }
    });

    // 12:00 — Midday check (only if workout not yet logged)
    if (!l.workoutDone && !l.mins) {
      ns.push({
        time: at(12, 0),
        title: 'Goz 2.0 · Midday 💪',
        body: 'Workout not done yet. 30 minutes of Zone 2 changes everything. Block the time.',
        tag: 'midday',
      });
    }

    // 14:00 — Afternoon check (hydration + steps)
    const steps = l.steps || 0;
    if (steps < 5000) {
      ns.push({
        time: at(14, 0),
        title: 'Goz 2.0 · Move More 🚶',
        body: `Only ${steps.toLocaleString()} steps so far. You need 10,000. Get up and walk.`,
        tag: 'steps',
      });
    }

    // 19:30 — Evening check (routines completion)
    const remaining = ROUTINE_IDS.length - routinesDone;
    if (remaining > 2) {
      ns.push({
        time: at(19, 30),
        title: 'Goz 2.0 · Evening Check 🌙',
        body: `${remaining} routines still open. You're at ${routinesDone}/${ROUTINE_IDS.length}. Close the day strong.`,
        tag: 'evening',
      });
    } else if (routinesDone === ROUTINE_IDS.length) {
      ns.push({
        time: at(19, 30),
        title: 'Goz 2.0 · PERFECT Day! 🏆',
        body: `All ${ROUTINE_IDS.length} routines done! This is what transformation looks like. Keep it up.`,
        tag: 'evening',
      });
    }

    // 22:00 — Journal + wind-down
    if (!l.journal) {
      ns.push({
        time: at(22, 0),
        title: 'Goz 2.0 · Journal Time 📓',
        body: 'Write today down before it slips. What went well? What broke? Prep tomorrow.',
        tag: 'journal',
      });
    }

    // 23:00 — Sleep reminder
    ns.push({
      time: at(23, 0),
      title: 'Goz 2.0 · Sleep Reminder 💤',
      body: 'Bed by 11:30pm. Recovery is training. Phone down — eyes closed.',
      tag: 'sleep',
    });

    return ns;
  };

  // Request permission prompt when user first logs in
  useEffect(() => {
    if (!user) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      setTimeout(() => setNotifBanner(true), 2000);
    } else if (Notification.permission === 'granted') {
      scheduleReminders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-schedule whenever data changes (debounced via the 1.5s Supabase timer completing)
  useEffect(() => {
    if (!user || !synced) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const t = setTimeout(() => scheduleReminders(), 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, synced]);

  const go = v => { setView(v); setAk(k=>k+1); if(ref.current) ref.current.scrollTop=0; };
  const upd = useCallback((day,field,val)=>{
    setData(d=>({...d,logs:{...d.logs,[day]:{...(d.logs[day]||{}),[field]:val}}}));
  },[]);
  const lg = d => data.logs[d]||{};
  const cdFn = () => {
    if(!data.startDate) return 1;
    return Math.max(1,Math.min(120,Math.floor((Date.now()-new Date(data.startDate))/86400000)+1));
  };

  const cd = cdFn();
  const ph = getPhaseForDay(cd);
  const PI = PHASES[ph-1];
  const pc = PI.color;
  const dow = data.startDate ? DAYS[new Date(new Date(data.startDate).getTime()+(cd-1)*86400000).getDay()] : "Monday";

  const str = f => { let s=0; for(let d=cd;d>=1;d--){ if(data.logs[d]?.[f]) s++; else break; } return s; };
  const latW = (()=>{ for(let d=cd;d>=1;d--) if(data.logs[d]?.weight) return data.logs[d].weight; return data.startWeight||80; })();
  const wLost = Math.max(0,(data.startWeight||80)-latW);

  const STEP_G=10000,KM_G=4,MIN_G=45;
  const todayL = lg(cd);
  const mPct = Math.round(((todayL.steps||0)/STEP_G)*100);
  const ePct = Math.round(((todayL.km||0)/KM_G)*100);
  const sPct = Math.round(((todayL.mins||0)/MIN_G)*100);

  /* ── AUTH LOADING ── */
  if(!authReady) return (
    <div style={{minHeight:"100vh",background:T.bg0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fD}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,oklch(0.92 0.22 130),oklch(0.85 0.18 200))",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:`0 0 24px oklch(0.92 0.22 130 / 0.4)`}}>💪</div>
        <div className="mono" style={{color:T.t3,fontSize:12,letterSpacing:".1em"}}>LOADING…</div>
      </div>
    </div>
  );

  /* ── LOGIN / SIGNUP ── */
  if(!user){
    const submit = async e => {
      e.preventDefault();
      setAuthBusy(true); setAuthErr("");
      const fn = authMode==="signup" ? supabase.auth.signUp : supabase.auth.signInWithPassword;
      const {error} = await fn.call(supabase.auth,{email:authEmail,password:authPass});
      if(error) setAuthErr(error.message);
      setAuthBusy(false);
    };
    return (
      <div style={{minHeight:"100vh",background:T.bg0,display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 20px",fontFamily:T.fD}}>
        <div style={{position:"fixed",inset:0,background:"radial-gradient(60% 50% at 50% 20%,oklch(0.92 0.22 130 / 0.12) 0%,transparent 60%)",pointerEvents:"none"}}/>
        <div className="scaleIn" style={{width:"100%",maxWidth:340,position:"relative",zIndex:1}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{width:72,height:72,borderRadius:20,background:"linear-gradient(135deg,oklch(0.92 0.22 130),oklch(0.85 0.18 200))",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,boxShadow:`0 16px 48px oklch(0.92 0.22 130 / 0.3)`}}>💪</div>
            <div style={{fontFamily:T.fD,fontSize:32,fontWeight:700,color:T.t1,letterSpacing:"-0.02em"}}>Goz <span style={{color:T.lime}}>2.0</span></div>
            <div className="mono" style={{fontSize:11,color:T.t3,marginTop:4,letterSpacing:".08em"}}>{authMode==="signup"?"CREATE YOUR ACCOUNT":"WELCOME BACK"}</div>
          </div>
          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12}}>
            <input
              type="email" placeholder="Email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required
              style={{...IS,fontSize:15}}
            />
            <input
              type="password" placeholder="Password" value={authPass} onChange={e=>setAuthPass(e.target.value)} required
              style={{...IS,padding:"14px 16px",fontSize:15}}
            />
            {authErr && <div className="mono" style={{fontSize:11,color:"oklch(0.78 0.22 340)",textAlign:"center",letterSpacing:".05em"}}>{authErr}</div>}
            <button type="submit" disabled={authBusy} style={{padding:"15px 0",borderRadius:14,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:13,fontWeight:700,cursor:authBusy?"not-allowed":"pointer",opacity:authBusy?0.6:1,marginTop:4,letterSpacing:".08em",boxShadow:`0 0 24px ${T.limeG}`}}>
              {authBusy?"…":authMode==="signup"?"CREATE ACCOUNT":"SIGN IN →"}
            </button>
          </form>
          <div style={{textAlign:"center",marginTop:20,fontFamily:T.fM,fontSize:11,color:T.t3,letterSpacing:".05em"}}>
            {authMode==="login"?"NO ACCOUNT? ":"HAVE ACCOUNT? "}
            <span style={{color:T.lime,cursor:"pointer",fontWeight:600}} onClick={()=>{setAuthMode(m=>m==="login"?"signup":"login");setAuthErr("");}}>
              {authMode==="login"?"SIGN UP":"SIGN IN"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ── ONBOARDING ── */
  if(!data.startDate){
    if(setup===0) return (
      <div style={{minHeight:"100vh",background:T.bg0,display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 20px",fontFamily:T.fD}}>
        <div style={{position:"fixed",inset:0,background:"radial-gradient(60% 50% at 50% 20%,oklch(0.92 0.22 130 / 0.12) 0%,transparent 60%)",pointerEvents:"none"}}/>
        <div className="scaleIn" style={{width:"100%",maxWidth:360,textAlign:"center",position:"relative",zIndex:1}}>
          <div style={{width:90,height:90,borderRadius:24,background:"linear-gradient(135deg,oklch(0.92 0.22 130),oklch(0.85 0.18 200))",margin:"0 auto 22px",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 20px 60px oklch(0.92 0.22 130 / 0.35)`,fontSize:42}}>💪</div>
          <div style={{fontFamily:T.fD,fontSize:40,fontWeight:700,color:T.t1,marginBottom:8,letterSpacing:"-0.03em"}}>Goz <span style={{color:T.lime}}>2.0</span></div>
          <div className="mono" style={{fontSize:11,color:T.t3,lineHeight:1.7,marginBottom:32,letterSpacing:".05em"}}>YOUR 120-DAY BODY TRANSFORMATION</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:32,textAlign:"left"}}>
            {[["🏃","Activity Rings","Apple Fitness-style tracking"],["🎵","Workout Music","Spotify & YouTube links"],["🧠","Mood Tracker","Mental health insights"],["⚖️","80kg → 65kg","15kg in 120 days"]].map(([ic,t,s])=>(
              <div key={t} style={{display:"flex",gap:14,alignItems:"center",background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:14,padding:"11px 14px",border:"1px solid rgba(255,255,255,0.06)"}}>
                <span style={{fontSize:22}}>{ic}</span>
                <div><div style={{fontSize:14,fontWeight:500,color:T.t1}}>{t}</div><div className="mono" style={{fontSize:10,color:T.t3}}>{s}</div></div>
              </div>
            ))}
          </div>
          <button className="press" onClick={()=>setSetup(2)} style={{width:"100%",padding:16,borderRadius:14,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:`0 8px 32px ${T.limeG}`,letterSpacing:".08em"}}>
            BEGIN YOUR JOURNEY →
          </button>
        </div>
      </div>
    );
    if(setup===2) return (
      <div style={{minHeight:"100vh",background:T.bg0,display:"flex",flexDirection:"column",padding:"60px 24px 40px",fontFamily:T.fD,maxWidth:400,margin:"0 auto"}}>
        <div className="fadeUp">
          <div className="eyebrow" style={{marginBottom:6}}>Setup</div>
          <div style={{fontFamily:T.fD,fontSize:30,fontWeight:700,color:T.t1,marginBottom:6,letterSpacing:"-0.02em"}}>Set Up</div>
          <div style={{fontSize:14,color:T.t2,marginBottom:36}}>Where are you starting?</div>
          <div style={{marginBottom:18}}><Lb>Start Date</Lb><input type="date" value={ts} onChange={e=>setTs(e.target.value)} style={IS}/></div>
          <div style={{marginBottom:40}}>
            <Lb>Current Weight (kg)</Lb>
            <input type="number" value={tw} onChange={e=>setTw(e.target.value)} placeholder="80" style={IS}/>
            <div className="mono" style={{fontSize:11,color:T.t3,marginTop:8}}>Goal: 65kg · Losing {Math.max(0,(parseFloat(tw)||80)-65).toFixed(0)}kg</div>
          </div>
          <button className="press" onClick={()=>{if(!ts)return;setData(d=>({...d,startDate:ts,startWeight:parseFloat(tw)||80}));setSetup(0);}} style={{width:"100%",padding:16,borderRadius:14,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:`0 8px 32px ${T.limeG}`,letterSpacing:".08em"}}>
            START TRANSFORMATION →
          </button>
        </div>
      </div>
    );
  }

  /* ════════ VIEW: HOME ════════ */
  const vHome = () => {
    const l=lg(cd), meals=getMeals(ph);
    const checkedCount=[l.noAlcohol,l.noPorn,l.workoutDone,l.drank3L,l.ate10k,l.sleptWell].filter(Boolean).length;
    return (
      <div key={ak} className="fadeUp" style={{padding:"0 16px 24px"}}>

        {/* ── Hero card ── */}
        <Card style={{padding:"24px 22px 22px",marginBottom:14,position:"relative",overflow:"hidden",background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",border:"1px solid rgba(255,255,255,0.10)"}}>
          <div style={{position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,oklch(0.92 0.22 130 / 0.18),transparent 70%)",filter:"blur(20px)"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:6,height:6,borderRadius:6,background:T.lime,boxShadow:`0 0 8px ${T.limeG}`}}/>
              <span className="eyebrow-accent">In Progress</span>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:18,gap:12}}>
              <div style={{minWidth:0}}>
                <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:72,lineHeight:0.85,color:T.t1,letterSpacing:"-0.02em",whiteSpace:"nowrap"}}>
                  Day <span style={{color:T.lime}}>{String(cd).padStart(2,"0")}</span>
                </div>
                <div style={{marginTop:10,fontFamily:T.fM,color:T.t2,fontSize:12,letterSpacing:"0.05em",whiteSpace:"nowrap"}}>
                  {dow.toUpperCase().slice(0,3)} · {120-cd} DAYS REMAIN
                </div>
              </div>
              <div style={{fontFamily:T.fM,fontSize:34,fontWeight:300,color:T.lime,letterSpacing:"-0.04em",textShadow:`0 0 16px ${T.limeG}`,lineHeight:1,flexShrink:0}}>
                {String(Math.round(cd/120*100)).padStart(2,"0")}<span style={{fontSize:16,color:T.t3,textShadow:"none"}}>%</span>
              </div>
            </div>
            <PhaseTrack day={cd} total={120}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
              {["Detox","Build","Forge","Apex"].map((p,i)=>(
                <span key={p} className="mono" style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:i===Math.floor((cd-1)/30)?"oklch(0.92 0.22 130)":T.t4}}>{p}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* ── Activity ── */}
        <Card style={{padding:16,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <ActivityRings move={mPct} exercise={ePct} stand={sPct} size={108}/>
            <div style={{flex:1}}>
              <div className="eyebrow" style={{marginBottom:10}}>Today's Activity</div>
              {[{l:"Move",v:`${(todayL.steps||0).toLocaleString()}`,u:" steps",p:mPct,c:T.lime},
                {l:"Exercise",v:`${(todayL.km||0).toFixed(1)}`,u:"km",p:ePct,c:T.cyan},
                {l:"Stand",v:`${todayL.mins||0}`,u:"min",p:sPct,c:T.mag}].map(r=>(
                <div key={r.l} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
                    <div>
                      <span style={{fontFamily:T.fM,fontSize:9,color:r.c,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase"}}>{r.l} </span>
                      <span style={{fontFamily:T.fM,fontSize:14,color:T.t1,fontWeight:500,letterSpacing:"-0.02em"}}>{r.v}</span>
                      <span style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>{r.u}</span>
                    </div>
                    <span style={{fontFamily:T.fM,fontSize:11,color:r.c}}>{Math.min(999,r.p)}%</span>
                  </div>
                  <div style={{height:2,borderRadius:1,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100,r.p)}%`,height:"100%",background:r.c,borderRadius:1,transition:"width 1s cubic-bezier(.22,.68,0,1.2)"}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="press" onClick={()=>go("activity")} style={{marginTop:14,width:"100%",padding:13,borderRadius:14,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:`0 0 20px ${T.limeG}`,letterSpacing:".08em"}}>
            LOG ACTIVITY & MUSIC →
          </button>
        </Card>

        {/* ── Streaks ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[{l:"Sober",v:str("noAlcohol"),ic:"◐",c:T.lime},{l:"Clean",v:str("noPorn"),ic:"◑",c:T.cyan},{l:"Train",v:str("workoutDone"),ic:"◒",c:T.mag}].map((s,i)=>(
            <Card key={i} style={{padding:14,position:"relative",textAlign:"left"}}>
              <div style={{position:"absolute",top:10,right:10,width:18,height:18,borderRadius:"50%",background:s.c,opacity:.18,filter:"blur(6px)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <span style={{color:s.c,fontSize:14}}>{s.ic}</span>
                <span className="mono" style={{fontSize:9,color:T.t3,letterSpacing:"0.18em",textTransform:"uppercase"}}>{s.l}</span>
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                <span className="mono" style={{fontSize:26,fontWeight:500,color:s.v>0?s.c:T.t3,textShadow:s.v>0?`0 0 12px ${s.c}`:"none"}}>{String(s.v).padStart(2,"0")}</span>
                <span className="mono" style={{fontSize:9,color:T.t3}}>DAY</span>
              </div>
              <div className="mono" style={{fontSize:9,color:T.t3,marginTop:2,letterSpacing:"0.1em"}}>STREAK</div>
            </Card>
          ))}
        </div>

        {/* ── Weight ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <Card style={{padding:"16px 14px"}}>
            <div className="eyebrow" style={{marginBottom:8}}>Current</div>
            <div style={{display:"flex",alignItems:"baseline",gap:4}}>
              <span style={{fontFamily:T.fM,fontSize:30,color:T.t1,fontWeight:300,letterSpacing:"-0.04em"}}>{latW}</span>
              <span style={{fontFamily:T.fM,fontSize:12,color:T.t3}}>kg</span>
            </div>
            <div style={{fontFamily:T.fM,fontSize:12,color:T.lime,marginTop:7}}>↓ {wLost.toFixed(1)} kg lost</div>
          </Card>
          <Card style={{padding:"16px 14px",background:"linear-gradient(180deg,oklch(0.92 0.22 130 / 0.08),oklch(0.92 0.22 130 / 0.02))",border:"1px solid oklch(0.92 0.22 130 / 0.2)"}}>
            <div className="eyebrow-accent" style={{marginBottom:8}}>Goal</div>
            <div style={{display:"flex",alignItems:"baseline",gap:4}}>
              <span style={{fontFamily:T.fM,fontSize:30,color:T.lime,fontWeight:300,letterSpacing:"-0.04em"}}>65</span>
              <span style={{fontFamily:T.fM,fontSize:12,color:T.t3}}>kg</span>
            </div>
            <div style={{fontFamily:T.fM,fontSize:12,color:T.t2,marginTop:7}}>{Math.max(0,latW-65).toFixed(1)} kg to go</div>
          </Card>
        </div>

        {/* ── Daily Intent quote ── */}
        <div style={{padding:"6px 4px 18px"}}>
          <div className="eyebrow" style={{marginBottom:8}}>Daily Intent</div>
          <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:26,lineHeight:1.15,color:T.t1,letterSpacing:"-0.01em"}}>
            The work doesn't<br/><span style={{color:T.lime}}>require permission.</span>
          </div>
          <div className="mono" style={{marginTop:10,color:T.t3,fontSize:11,letterSpacing:"0.05em"}}>— GOZ FIELD MANUAL, ENTRY {String(cd).padStart(3,"0")}</div>
        </div>

        {/* ── Check-in ── */}
        <Card style={{overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div className="eyebrow">Today's Check-in</div>
            <div style={{padding:"3px 10px",borderRadius:99,background:T.limeS,border:`1px solid ${T.lime}`,fontFamily:T.fM,fontSize:11,color:T.lime,fontWeight:700}}>{checkedCount}/6</div>
          </div>
          {[{f:"noAlcohol",t:"No Alcohol",sub:"Zero drinks today",ic:"🚫"},
            {f:"noPorn",t:"No Porn",sub:"Clean day",ic:"🛡️"},
            {f:"workoutDone",t:"Workout Done",sub:`${dow} session`,ic:"💪"},
            {f:"drank3L",t:"3L Water",sub:"Hydration goal",ic:"💧"},
            {f:"ate10k",t:"10k Steps",sub:"Movement goal",ic:"🚶"},
            {f:"sleptWell",t:"Good Sleep",sub:"In bed by 11pm",ic:"😴"}
          ].map(({f,t,sub,ic},i,a)=>{
            const on=!!l[f];
            return (
              <div key={f}>
                <div className="press" onClick={()=>upd(cd,f,!on)} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",cursor:"pointer",background:on?"oklch(0.92 0.22 130 / 0.05)":"transparent",transition:"background .2s"}}>
                  <div style={{width:38,height:38,borderRadius:12,background:on?T.limeS:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0,transition:"all .25s",border:`1px solid ${on?"oklch(0.92 0.22 130 / 0.4)":"rgba(255,255,255,0.06)"}`,boxShadow:on?`0 0 14px ${T.limeG}`:"none"}}>{ic}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:500,color:on?T.t1:T.t2,transition:"color .2s"}}>{t}</div>
                    <div style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>{sub}</div>
                  </div>
                  <div style={{width:26,height:26,borderRadius:13,background:on?T.lime:"transparent",border:on?"none":"1.5px solid rgba(255,255,255,0.10)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .25s",flexShrink:0,boxShadow:on?`0 0 12px ${T.limeG}`:"none"}}>
                    {on&&<span style={{fontSize:13,color:"#000",fontWeight:800}}>✓</span>}
                  </div>
                </div>
                {i<a.length-1&&<div style={{height:1,background:"rgba(255,255,255,0.06)",marginLeft:68}}/>}
              </div>
            );
          })}
        </Card>

        {/* ── Log weight ── */}
        <Card style={{padding:16,marginBottom:14}}>
          <div className="eyebrow" style={{marginBottom:12}}>Log Weight</div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <input type="number" step=".1" placeholder={`${latW}`} defaultValue={l.weight||""}
              onBlur={e=>{if(e.target.value!=="") upd(cd,"weight",parseFloat(e.target.value));}}
              style={{...IS,flex:1,fontSize:22,fontWeight:300,textAlign:"center",letterSpacing:"-0.02em"}}/>
            <span style={{fontFamily:T.fM,fontSize:16,color:T.t3}}>kg</span>
          </div>
        </Card>

        {/* ── Nutrition ── */}
        <Card style={{overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div className="eyebrow">Today's Nutrition</div>
            <div style={{padding:"3px 10px",borderRadius:99,background:T.limeS,border:`1px solid ${T.lime}`,fontFamily:T.fM,fontSize:11,color:T.lime,fontWeight:700}}>{meals.cal} kcal</div>
          </div>
          {[["🌅","Breakfast",meals.b,T.lime],["☀️","Lunch",meals.l,T.cyan],["🍎","Snack",meals.s,T.mag],["🌙","Dinner",meals.d,T.lime]].map(([ic,lb,v,c],i,a)=>(
            <div key={lb}>
              <div style={{padding:"12px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:36,height:36,borderRadius:11,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{ic}</div>
                <div>
                  <div className="eyebrow-accent" style={{marginBottom:3,color:c}}>{lb.toUpperCase()}</div>
                  <div style={{fontSize:13,color:T.t2,lineHeight:1.5}}>{v}</div>
                </div>
              </div>
              {i<a.length-1&&<div style={{height:1,background:"rgba(255,255,255,0.06)",marginLeft:64}}/>}
            </div>
          ))}
          <div style={{margin:"0 16px 16px",padding:"10px 14px",background:"rgba(255,255,255,0.03)",borderRadius:14,border:"1px solid rgba(255,255,255,0.06)"}}>
            <span className="eyebrow" style={{color:"rgba(255,100,80,0.9)"}}>AVOID · </span>
            <span style={{fontSize:12,color:T.t3}}>{meals.avoid}</span>
          </div>
        </Card>

        {/* ── Daily Word ── */}
        {(()=>{
          const quotes = getDayQuotes(cd);
          const hr = new Date().getHours();
          const slot = hr>=5&&hr<12 ? 0 : hr>=12&&hr<18 ? 1 : 2;
          const slotLabel = ["Morning","Afternoon","Evening"];
          return (
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingLeft:2}}>
                <div className="eyebrow">Daily Word</div>
                <span className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".08em"}}>3 TODAY · {slotLabel[slot].toUpperCase()} ACTIVE</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {quotes.map((q,i)=>{
                  const isActive = i===slot;
                  const c = QUOTE_CAT_COLOR[q.cat];
                  return (
                    <div key={i} style={{
                      background: isActive ? `linear-gradient(135deg,${c}18,${c}08)` : "linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.006))",
                      borderRadius:18,
                      border:`1px solid ${isActive?c+"44":"rgba(255,255,255,0.06)"}`,
                      padding:"16px 18px",
                      boxShadow:isActive?`0 4px 24px ${c}22`:"none",
                      transition:"all .3s",
                    }}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          {isActive && <div style={{width:5,height:5,borderRadius:"50%",background:c,boxShadow:`0 0 6px ${c}`}}/>}
                          <span className="mono" style={{fontSize:9,color:isActive?c:T.t3,letterSpacing:".14em"}}>{QUOTE_CAT_LABEL[q.cat].toUpperCase()}</span>
                        </div>
                        <span className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".08em"}}>{slotLabel[i]}</span>
                      </div>
                      <div style={{fontFamily:T.fS,fontSize:isActive?17:14,fontStyle:"italic",color:isActive?T.t1:T.t2,lineHeight:1.5,marginBottom:q.a?8:0}}>
                        "{q.t}"
                      </div>
                      {q.a&&<div className="mono" style={{fontSize:9,color:isActive?c:T.t3,letterSpacing:".06em"}}>— {q.a}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </div>
    );
  };

  /* ════════ VIEW: TODAY (Workout) ════════ */
  const vToday = () => {
    const l=lg(cd), workout=getWorkout(dow,ph);
    const checkedCount=[l.noAlcohol,l.noPorn,l.workoutDone,l.drank3L,l.ate10k,l.sleptWell].filter(Boolean).length;
    const theme={Monday:"Push + Core",Tuesday:"Run + Steps",Wednesday:"Active Recovery",Thursday:"Push + Core",Friday:"Run + HIIT",Saturday:"Full Body",Sunday:"Rest & Walk"}[dow];
    const tagColor={PUSH:T.lime,RUN:T.cyan,REST:T.mag,HIIT:T.lime,STEPS:T.cyan,CORE:T.mag};
    const workoutItems=workout.map((w,i)=>({id:i,time:["06:00","09:00","12:00","15:00","17:00","19:00","21:00"][i]||"—",title:w,tag:["PUSH","STEPS","CORE","RUN","HIIT","REST","PUSH"][i]||"MOVE"}));
    return (
      <div key={ak} className="fadeUp" style={{padding:"0 16px 24px"}}>
        {/* Hero focus card */}
        <Card style={{padding:22,marginBottom:18,position:"relative",overflow:"hidden",background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",border:"1px solid rgba(255,255,255,0.10)"}}>
          <div style={{position:"absolute",top:-40,left:-40,width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,${T.limeS},transparent 70%)`,filter:"blur(20px)"}}/>
          <div style={{position:"relative"}}>
            <div className="eyebrow-accent" style={{marginBottom:10}}>FOCUS · {dow.toUpperCase()}</div>
            <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:34,lineHeight:1.05,letterSpacing:"-0.01em",color:T.t1}}>
              Earn your<br/><span style={{color:T.lime}}>recovery.</span>
            </div>
            <div style={{marginTop:16,display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
              <div>
                <div className="mono" style={{fontSize:26,color:T.t1}}>
                  {String(checkedCount).padStart(2,"0")}<span style={{color:T.t3}}>/{String(6).padStart(2,"0")}</span>
                </div>
                <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:"0.18em"}}>RITUALS COMPLETE</div>
              </div>
              <div style={{width:120}}>
                <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(checkedCount/6)*100}%`,background:T.lime,boxShadow:`0 0 8px ${T.limeG}`,transition:"width 0.6s cubic-bezier(0.2,0.8,0.2,1)"}}/>
                </div>
                <div className="mono" style={{fontSize:10,color:T.t3,marginTop:6,textAlign:"right",letterSpacing:"0.1em"}}>{Math.round(checkedCount/6*100)}% · {theme.toUpperCase()}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <div style={{marginBottom:18,position:"relative"}}>
          <div style={{position:"absolute",left:48,top:8,bottom:8,width:1,background:"linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.06),transparent)"}}/>
          <div className="eyebrow" style={{marginBottom:16,paddingLeft:4}}>TIMELINE</div>
          {workoutItems.map((t,i)=>{
            const isDone=l.workoutDone&&i<workoutItems.length;
            const c=tagColor[t.tag]||T.lime;
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:16,marginBottom:10,position:"relative"}}>
                <div className="mono" style={{width:38,fontSize:10,color:T.t3,textAlign:"right"}}>{t.time}</div>
                <div style={{width:22,height:22,borderRadius:22,border:`1.5px solid ${isDone?c:"rgba(255,255,255,0.10)"}`,background:isDone?c:"transparent",boxShadow:isDone?`0 0 10px ${c}`:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s"}}>
                  {isDone&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <Card style={{flex:1,padding:"12px 14px",opacity:isDone?0.55:1,transition:"all 0.3s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span className="mono" style={{fontSize:9,letterSpacing:"0.18em",color:c}}>{t.tag}</span>
                    {isDone&&<span className="mono" style={{fontSize:9,color:T.t3,letterSpacing:"0.1em"}}>DONE</span>}
                  </div>
                  <div style={{fontSize:13,fontWeight:500,letterSpacing:"-0.01em",color:isDone?T.t2:T.t1,textDecoration:isDone?"line-through":"none",textDecorationColor:T.t4}}>{t.title}</div>
                </Card>
              </div>
            );
          })}
        </div>

        <button className="press" onClick={()=>upd(cd,"workoutDone",!l.workoutDone)} style={{marginBottom:14,width:"100%",padding:15,borderRadius:14,background:l.workoutDone?T.limeS:T.lime,border:l.workoutDone?`1px solid ${T.lime}`:"none",color:l.workoutDone?T.lime:"#000",fontFamily:T.fM,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:".08em",boxShadow:l.workoutDone?"none":`0 0 24px ${T.limeG}`,transition:"all .2s"}}>
          {l.workoutDone?"✓ WORKOUT COMPLETE":"MARK WORKOUT DONE →"}
        </button>

        <Card style={{padding:16,marginBottom:14}}>
          <Lb>Journal</Lb>
          <textarea rows={4} placeholder="How did the workout feel?" defaultValue={l.notes||""} onBlur={e=>upd(cd,"notes",e.target.value)}
            style={{...IS,resize:"none",lineHeight:1.6,fontSize:14}}/>
        </Card>
        <Card style={{padding:16}}>
          <Lb>Quick Mood</Lb>
          <div style={{display:"flex",gap:7}}>
            {MOODS.map(m=>{const sel=l.moodScore===m.score;return(
              <button key={m.score} className="press" onClick={()=>{upd(cd,"moodScore",m.score);upd(cd,"moodLabel",m.label);upd(cd,"moodEmoji",m.emoji);}}
                style={{flex:1,padding:"10px 2px",borderRadius:12,border:`1.5px solid ${sel?T.lime:T.brd}`,background:sel?T.limeS:"rgba(255,255,255,0.03)",cursor:"pointer",transition:"all .2s"}}>
                <div style={{fontSize:22}}>{m.emoji}</div>
                <div style={{fontFamily:T.fM,fontSize:9,color:sel?T.lime:T.t3,marginTop:3,fontWeight:sel?600:400}}>{m.label}</div>
              </button>
            );})}
          </div>
        </Card>
      </div>
    );
  };

  /* ════════ VIEW: ACTIVITY RINGS + MUSIC ════════ */
  const vActivity = () => {
    const l=lg(cd);
    const mP=Math.round(((l.steps||0)/STEP_G)*100);
    const eP=Math.round(((l.km||0)/KM_G)*100);
    const sP=Math.round(((l.mins||0)/MIN_G)*100);
    const wkSteps=Array.from({length:7},(_,i)=>cd-i).filter(d=>d>=1).reduce((s,d)=>s+(data.logs[d]?.steps||0),0);
    const wkKm=Array.from({length:7},(_,i)=>cd-i).filter(d=>d>=1).reduce((s,d)=>s+(data.logs[d]?.km||0),0);
    const allClosed=mP>=100&&eP>=100&&sP>=100;

    return (
      <div key={ak} className="fadeUp" style={{padding:"0 16px 24px"}}>
        <div className="eyebrow" style={{marginBottom:4,paddingTop:4}}>Activity Rings</div>
        <div style={{fontFamily:T.fD,fontSize:26,fontWeight:600,color:T.t1,marginBottom:18,letterSpacing:"-0.02em"}}>Day {String(cd).padStart(2,"0")}</div>

        {/* Hero ring card */}
        <Card style={{padding:"28px 22px 24px",marginBottom:14,position:"relative",overflow:"hidden",background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",border:"1px solid rgba(255,255,255,0.10)"}}>
          <div style={{position:"absolute",inset:0,background:`radial-gradient(60% 50% at 50% 50%,${T.limeS},transparent 70%)`}}/>
          <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:18}}>
            <ActivityRings move={mP} exercise={eP} stand={sP} size={220}/>
            <div style={{textAlign:"center"}}>
              <div className="eyebrow" style={{marginBottom:4}}>TODAY · {dow.toUpperCase().slice(0,3)}</div>
              <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:28,letterSpacing:"-0.01em",color:T.t1}}>
                <span style={{color:T.lime}}>{Math.round((mP+eP+sP)/3)}%</span> closed
              </div>
            </div>
          </div>
          {allClosed&&<div className="popIn" style={{marginTop:14,padding:"10px 14px",background:T.limeS,borderRadius:14,border:`1px solid ${T.lime}`,textAlign:"center"}}>
            <span style={{fontFamily:T.fM,fontSize:12,color:T.lime,fontWeight:700,letterSpacing:".08em"}}>ALL 3 RINGS CLOSED — INCREDIBLE!</span>
          </div>}
        </Card>

        {/* Per-ring detail */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
          {[
            {l:"MOVE",    sub:"Steps today",  val:(l.steps||0).toLocaleString(), goal:"10,000",pct:mP,c:T.lime},
            {l:"EXERCISE",sub:"Distance run",  val:`${(l.km||0).toFixed(1)}`,  unit:"km",goal:"4km",   pct:eP,c:T.cyan},
            {l:"STAND",   sub:"Active minutes",val:String(l.mins||0),unit:"min",goal:"45 min", pct:sP,c:T.mag},
          ].map(r=>(
            <Card key={r.l} style={{padding:16,display:"flex",alignItems:"center",gap:16}}>
              <div style={{width:48,height:48,position:"relative",flexShrink:0}}>
                <svg width={48} height={48} style={{transform:"rotate(-90deg)"}}>
                  <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5}/>
                  <circle cx={24} cy={24} r={20} fill="none" stroke={r.c} strokeWidth={5} strokeLinecap="round"
                    strokeDasharray={2*Math.PI*20} strokeDashoffset={2*Math.PI*20*(1-Math.min(1,r.pct/100))}
                    style={{transition:"stroke-dashoffset 1s cubic-bezier(.22,.68,0,1.2)",filter:`drop-shadow(0 0 6px ${r.c})`}}/>
                </svg>
              </div>
              <div style={{flex:1}}>
                <div className="mono" style={{fontSize:10,color:r.c,letterSpacing:"0.18em",marginBottom:2}}>{r.l}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:2}}>
                  <span className="mono" style={{fontSize:22,color:T.t1,letterSpacing:"-0.02em"}}>{r.val}</span>
                  {r.unit&&<span className="mono" style={{fontSize:11,color:T.t3}}>{r.unit}</span>}
                </div>
                <div className="mono" style={{fontSize:10,color:T.t3,marginTop:2}}>GOAL · {r.goal}</div>
                <div style={{marginTop:6,height:2,borderRadius:1,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                  <div style={{width:`${Math.min(100,r.pct)}%`,height:"100%",background:r.c,borderRadius:1,transition:"width 1s cubic-bezier(.22,.68,0,1.2)"}}/>
                </div>
              </div>
              <div className="mono" style={{fontSize:18,color:r.c,fontWeight:500,textShadow:`0 0 10px ${r.c}`,flexShrink:0}}>{Math.min(999,r.pct)}%</div>
            </Card>
          ))}
        </div>

        {/* LOG INPUTS */}
        <Card style={{padding:16,marginBottom:14}}>
          <Lb>Log Today's Activity</Lb>
          {[
            {f:"steps",lb:"🔴  Steps walked",       ph:"e.g. 8500",  hint:`Goal: ${STEP_G.toLocaleString()} steps`},
            {f:"km",   lb:"🟢  Distance run (km)",   ph:"e.g. 3.2",   hint:"Goal: 4km · enter 0 for rest days",step:".1"},
            {f:"mins", lb:"🔵  Active minutes",       ph:"e.g. 35",    hint:"Goal: 45 min total movement"},
          ].map(({f,lb,ph,hint,step},i,a)=>{
            const val=l[f];
            return (
              <div key={f}>
                <div style={{padding:"12px 0"}}>
                  <div style={{fontSize:12,color:T.txt2,fontWeight:600,marginBottom:7}}>{lb}</div>
                  <input type="number" step={step||"1"} placeholder={ph} defaultValue={val||""}
                    onBlur={e=>{if(e.target.value!=="") upd(cd,f,parseFloat(e.target.value));}}
                    style={{...IS,fontSize:17}}/>
                  <div style={{fontSize:10,color:T.txt3,marginTop:4}}>{hint}</div>
                </div>
                {i<a.length-1&&<Dv/>}
              </div>
            );
          })}
        </Card>

        {/* 7-DAY SUMMARY */}
        <Card style={{padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span className="eyebrow">This Week</span>
            <span className="mono" style={{fontSize:10,color:T.t3}}>{Array.from({length:7},(_,i)=>cd-6+i).filter(d=>d>=1&&(data.logs[d]?.steps||0)>=STEP_G).length} / 7 GOAL DAYS</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {[{l:"Total Steps",v:wkSteps.toLocaleString(),c:T.lime},{l:"Total Distance",v:`${wkKm.toFixed(1)}km`,c:T.cyan}].map((s,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:"12px 13px"}}>
                <div className="mono" style={{fontSize:22,color:s.c,letterSpacing:"-0.02em"}}>{s.v}</div>
                <div className="mono" style={{fontSize:9,color:T.t3,marginTop:3,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="eyebrow" style={{marginBottom:10}}>7-Day Move Ring</div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            {Array.from({length:7},(_,i)=>cd-6+i).map(d=>{
              if(d<1) return <div key={d} style={{flex:1}}/>;
              const s=data.logs[d]?.steps||0;
              const p=Math.min(100,Math.round(s/STEP_G*100));
              const mP2=Math.min(100,Math.round(((data.logs[d]?.km||0)/KM_G)*100));
              const sP2=Math.min(100,Math.round(((data.logs[d]?.mins||0)/MIN_G)*100));
              const dn=data.startDate?DAYS[new Date(new Date(data.startDate).getTime()+(d-1)*86400000).getDay()].slice(0,1):"";
              return (
                <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,opacity:d>cd?0.35:1}}>
                  <ActivityRings move={p} exercise={mP2} stand={sP2} size={36}/>
                  <span className="mono" style={{fontSize:10,color:d===cd?T.lime:T.t3,fontWeight:d===cd?600:400}}>{dn}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* MUSIC */}
        <div style={{marginBottom:4}}>
          <div style={{fontFamily:T.fD,fontSize:20,fontWeight:600,color:T.t1,marginBottom:4,letterSpacing:"-0.02em"}}>Workout Music</div>
          <div className="mono" style={{fontSize:11,color:T.t3,marginBottom:16,letterSpacing:"0.05em"}}>TAP 🟢 SPOTIFY · ▶️ YOUTUBE</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {PLAYLISTS.map((p,i)=>(
              <Card key={i} style={{padding:0}}>
                <div style={{display:"flex",alignItems:"center",gap:13,padding:"13px 15px"}}>
                  <div style={{width:48,height:48,borderRadius:13,background:`${p.ic2}18`,border:`1px solid ${p.ic2}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{p.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:T.txt,marginBottom:2}}>{p.name}</div>
                    <div style={{fontSize:11,color:T.txt3}}>{p.vibe}</div>
                    <div style={{fontSize:11,color:T.txt2,marginTop:1}}>{p.desc}</div>
                  </div>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <a href={p.sp} target="_blank" rel="noopener noreferrer" className="press"
                      style={{width:36,height:36,borderRadius:11,background:"rgba(29,185,84,0.15)",border:"1px solid rgba(29,185,84,0.35)",display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none",fontSize:18}}>🟢</a>
                    <a href={p.yt} target="_blank" rel="noopener noreferrer" className="press"
                      style={{width:36,height:36,borderRadius:11,background:"rgba(255,0,0,0.12)",border:"1px solid rgba(255,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none",fontSize:16}}>▶️</a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ════════ VIEW: MOOD ════════ */
  const vMood = () => {
    const l=lg(cd);
    const md=[];for(let d=1;d<=cd;d++) if(data.logs[d]?.moodScore) md.push({day:d,...data.logs[d]});
    const avg=md.length?(md.reduce((s,m)=>s+m.moodScore,0)/md.length).toFixed(1):"—";
    const bSt=(()=>{let b=0,c=0;for(let d=1;d<=cd;d++){if((data.logs[d]?.moodScore||0)>=4){c++;b=Math.max(b,c);}else c=0;}return b;})();
    const tm=MOODS.find(m=>m.score===l.moodScore),te=ENERGY.find(e=>e.score===l.energyScore);
    const moodColors=["oklch(0.62 0.16 25)","oklch(0.72 0.16 50)","oklch(0.82 0.18 90)","oklch(0.92 0.22 130)","oklch(0.85 0.18 200)"];
    return (
      <div key={ak} className="fadeUp" style={{padding:"0 16px 24px"}}>
        {/* Hero mood card */}
        <Card style={{padding:22,marginBottom:14,position:"relative",overflow:"hidden",background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",border:"1px solid rgba(255,255,255,0.10)"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,${moodColors[(l.moodScore||3)-1]},transparent 70%)`,opacity:.25,filter:"blur(20px)",transition:"background 0.4s"}}/>
          <div style={{position:"relative"}}>
            <div className="eyebrow" style={{marginBottom:8}}>CHECK-IN</div>
            <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:28,lineHeight:1.1,letterSpacing:"-0.01em",color:T.t1}}>
              How's the engine<br/>running?
            </div>
            {/* 5-circle mood selector */}
            <div style={{marginTop:24,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
              {[1,2,3,4,5].map((v,i)=>{
                const isActive=l.moodScore===v;
                const c=moodColors[i];
                return (
                  <button key={v} className="press" onClick={()=>{upd(cd,"moodScore",v);const m=MOODS.find(x=>x.score===v);if(m){upd(cd,"moodLabel",m.label);upd(cd,"moodEmoji",m.emoji);}}}
                    style={{background:"transparent",border:0,padding:0,display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <div style={{width:isActive?44:32,height:isActive?44:32,borderRadius:"50%",background:isActive?c:"transparent",border:`1.5px solid ${isActive?c:"rgba(255,255,255,0.10)"}`,boxShadow:isActive?`0 0 20px ${c}`:"none",transition:"all 0.35s cubic-bezier(0.2,0.8,0.2,1)"}}/>
                    <span className="mono" style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:isActive?c:T.t3,fontWeight:isActive?600:400,transition:"color 0.3s"}}>{MOODS[i].label.slice(0,4)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[{l:"Avg Mood",v:avg,s:"/5",c:T.lime},{l:"Tracked",v:md.length,s:"days",c:T.cyan},{l:"Best Streak",v:bSt,s:"days",c:T.mag}].map((s,i)=>(
            <Card key={i} style={{padding:"12px 8px",textAlign:"center"}}>
              <div className="mono" style={{fontSize:24,color:s.c,lineHeight:1,letterSpacing:"-0.02em"}}>{s.v}<span style={{fontSize:10,color:T.t3}}>{s.s}</span></div>
              <div className="mono" style={{fontSize:9,color:T.t3,marginTop:3,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</div>
            </Card>
          ))}
        </div>

        {/* Emotion tags */}
        <div style={{marginBottom:14}}>
          <div className="eyebrow" style={{marginBottom:12,paddingLeft:4}}>FEELING · TAP TO TAG</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {EMOTIONS.map(em=>{const sel=(l.emotions||[]).includes(em);return(
              <button key={em} className="press" onClick={()=>{const c=l.emotions||[];upd(cd,"emotions",sel?c.filter(e=>e!==em):[...c,em]);}}
                style={{padding:"8px 13px",borderRadius:999,background:sel?T.limeS:"rgba(255,255,255,0.03)",border:`1px solid ${sel?T.lime:"rgba(255,255,255,0.06)"}`,color:sel?T.lime:T.t2,fontFamily:T.fD,fontSize:12,fontWeight:500,boxShadow:sel?`0 0 12px ${T.limeG}`:"none",transition:"all .25s",cursor:"pointer"}}>
                {em}
              </button>
            );})}
          </div>
        </div>

        {/* 14-day trend sparkline */}
        {md.length>1&&(
          <Card style={{padding:20,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span className="eyebrow">14-Day Trend</span>
              <span className="mono" style={{fontSize:11,color:T.lime}}>↑ TRACKING</span>
            </div>
            <div style={{position:"relative",height:80}}>
              {[0,0.25,0.5,0.75,1].map(p=>(
                <div key={p} style={{position:"absolute",left:0,right:0,top:`${p*80}px`,height:1,background:"rgba(255,255,255,0.04)"}}/>
              ))}
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"flex-end",gap:4}}>
                {md.slice(-14).map((m,i)=>{
                  const h=((m.moodScore-1)/4)*68+4;
                  const c=moodColors[m.moodScore-1]||T.lime;
                  return (
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{width:"100%",height:h,background:c,borderRadius:"3px 3px 0 0",opacity:.85,maxWidth:18,alignSelf:"center"}}/>
                      <div className="mono" style={{fontSize:7,color:T.t3}}>D{m.day}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        <Card style={{padding:16,marginBottom:14}}>
          <Lb>Day {cd} — Energy & Notes</Lb>
          <div style={{display:"flex",gap:7,marginBottom:14}}>
            {ENERGY.map(e=>{const sel=l.energyScore===e.score;return(
              <button key={e.score} className="press" onClick={()=>upd(cd,"energyScore",e.score)}
                style={{flex:1,padding:"11px 2px",borderRadius:13,border:`1.5px solid ${sel?T.lime:T.brd}`,background:sel?T.limeS:"rgba(255,255,255,0.03)",cursor:"pointer",transition:"all .25s cubic-bezier(.22,.68,0,1.2)"}}>
                <div style={{fontSize:26}}>{e.emoji}</div><div style={{fontFamily:T.fM,fontSize:9,color:sel?T.lime:T.t3,marginTop:3,fontWeight:sel?600:400}}>{e.label}</div>
              </button>
            );})}
          </div>
          <div style={{marginBottom:14}}>
            <Lb>What's on your mind?</Lb>
            <textarea rows={3} placeholder="Any trigger, win, or struggle?" defaultValue={l.moodNote||""} onBlur={e=>upd(cd,"moodNote",e.target.value)}
              style={{...IS,resize:"none",lineHeight:1.6,fontSize:14}}/>
          </div>
          {(tm||te)&&(
            <div style={{marginTop:13,padding:"11px 14px",background:"rgba(255,255,255,0.04)",borderRadius:T.r2,display:"flex",gap:13,alignItems:"center"}}>
              {tm&&<div style={{fontSize:30}}>{tm.emoji}</div>}
              <div>{tm&&<div style={{fontSize:14,fontWeight:600,color:T.lime}}>{tm.label}</div>}
              {te&&<div style={{fontSize:12,color:T.t2,marginTop:2}}>{te.emoji} {te.label} energy</div>}
              {(l.emotions||[]).length>0&&<div style={{fontSize:10,color:T.t3,marginTop:3}}>{(l.emotions||[]).join(" · ")}</div>}</div>
            </div>
          )}
        </Card>

        <button className="press" onClick={()=>{}} style={{width:"100%",marginBottom:14,padding:16,borderRadius:14,background:T.lime,color:"#000",border:0,fontFamily:T.fM,fontSize:12,fontWeight:600,letterSpacing:"0.1em",boxShadow:`0 0 24px ${T.limeG}`,cursor:"pointer"}}>LOG CHECK-IN →</button>

        {md.length>=3&&(()=>{
          const sM=md.filter(m=>data.logs[m.day]?.noAlcohol),aS=sM.length?(sM.reduce((s,m)=>s+m.moodScore,0)/sM.length).toFixed(1):null;
          const wM=md.filter(m=>data.logs[m.day]?.workoutDone),aW=wM.length?(wM.reduce((s,m)=>s+m.moodScore,0)/wM.length).toFixed(1):null;
          const r3=md.slice(-3).reduce((s,m)=>s+m.moodScore,0)/3;
          return(
            <Card style={{padding:16,marginBottom:14}}>
              <div className="eyebrow" style={{marginBottom:12}}>Patterns</div>
              {[[aS,"Sober days avg",T.lime],[aW,"Workout days avg",T.cyan],[r3.toFixed(1),"3-day trend",r3>=3.5?T.lime:r3>=2.5?T.cyan:T.mag]].filter(([v])=>v).map(([v,lb,c],i,a)=>(
                <div key={lb}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
                  <span style={{fontSize:13,color:T.t2}}>{lb}</span><span className="mono" style={{fontSize:16,fontWeight:500,color:c}}>{v}/5</span>
                </div>{i<a.length-1&&<Dv/>}</div>
              ))}
            </Card>
          );
        })()}
        {md.length>0&&(
          <Card style={{padding:16}}>
            <div className="eyebrow" style={{marginBottom:12}}>Recent Entries</div>
            {md.slice(-5).reverse().map((m,i,a)=>{const mI=MOODS.find(x=>x.score===m.moodScore),eI=ENERGY.find(x=>x.score===m.energyScore);return(
              <div key={i}><div style={{display:"flex",gap:12,padding:"10px 0",alignItems:"flex-start"}}>
                <div style={{fontSize:26,minWidth:32}}>{mI?.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:14,fontWeight:500,color:T.lime}}>{mI?.label}</span><span className="mono" style={{fontSize:11,color:T.t3}}>Day {m.day}</span></div>
                  {eI&&<div style={{fontSize:12,color:T.t2,marginTop:2}}>{eI.emoji} {eI.label}</div>}
                  {(m.emotions||[]).length>0&&<div style={{fontSize:10,color:T.t3,marginTop:2}}>{m.emotions.join(" · ")}</div>}
                  {m.moodNote&&<div style={{fontSize:11,color:T.t3,marginTop:3,fontStyle:"italic"}}>"{m.moodNote}"</div>}
                </div>
              </div>{i<a.length-1&&<Dv/>}</div>
            );})}
          </Card>
        )}
      </div>
    );
  };

  /* ════════ VIEW: STATS ════════ */
  const vStats = () => {
    const ws=[],tNA=Object.values(data.logs).filter(l=>l.noAlcohol).length,tNP=Object.values(data.logs).filter(l=>l.noPorn).length,tW=Object.values(data.logs).filter(l=>l.workoutDone).length,tL=Object.keys(data.logs).length;
    for(let d=1;d<=cd;d++) if(data.logs[d]?.weight) ws.push({d,w:data.logs[d].weight});
    const cpd=d=>{const l=data.logs[d]||{};const c=["noAlcohol","noPorn","workoutDone","drank3L","ate10k","sleptWell"].filter(f=>l[f]).length;const r=ROUTINES.filter(rt=>(l.routines||{})[rt.id]).length;return Math.round((c+r)/(6+ROUTINES.length)*100);};
    return (
      <div key={ak} className="fadeUp" style={{padding:"0 16px 24px"}}>
        <div className="eyebrow" style={{marginBottom:4,paddingTop:4}}>Progress</div>
        <div style={{fontFamily:T.fD,fontSize:26,fontWeight:600,color:T.t1,marginBottom:18,letterSpacing:"-0.02em"}}>Day 1 → Day {cd}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {[{l:"Days Logged",v:tL,c:T.lime},{l:"Sober Days",v:tNA,c:T.lime},{l:"Clean Days",v:tNP,c:T.cyan},{l:"Workouts",v:tW,c:T.lime},{l:"Weight Lost",v:`${wLost.toFixed(1)}kg`,c:T.lime},{l:"Days Left",v:120-cd,c:T.t2}].map((s,i)=>(
            <Card key={i} style={{padding:14}}>
              <div className="mono" style={{fontSize:28,color:s.c,lineHeight:1,letterSpacing:"-0.02em"}}>{s.v}</div>
              <div className="mono" style={{fontSize:9,color:T.t3,marginTop:5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</div>
            </Card>
          ))}
        </div>
        {ws.length>0&&(
          <Card style={{padding:16,marginBottom:14}}>
            <div className="eyebrow" style={{marginBottom:12}}>Weight Journey</div>
            <div style={{overflowX:"auto"}}>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,minWidth:ws.length*30,height:94,paddingBottom:18,position:"relative"}}>
                {ws.map((w,i)=>{const max=Math.max(...ws.map(x=>x.w)),min=Math.min(...ws.map(x=>x.w));const h=18+((w.w-min)/(max-min||1))*60;return(
                  <div key={i} style={{textAlign:"center",minWidth:26}}>
                    <div className="mono" style={{fontSize:7,color:T.t3,marginBottom:2}}>{w.w}</div>
                    <div style={{height:h,width:18,background:`oklch(0.92 0.22 130 / 0.5)`,borderRadius:"3px 3px 0 0",border:`1px solid ${T.lime}`,margin:"0 auto"}}/>
                    <div className="mono" style={{fontSize:7,color:T.t3,marginTop:2}}>D{w.d}</div>
                  </div>
                );})}
              </div>
            </div>
          </Card>
        )}
        <Card style={{padding:16}}>
          <div className="eyebrow" style={{marginBottom:12}}>Daily Log Grid</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {Array.from({length:cd},(_,i)=>i+1).map(d=>{const p=cpd(d);const c=p>=80?T.lime:p>=50?T.cyan:p>0?T.mag:"rgba(255,255,255,0.07)";return(
              <button key={d} className="press" onClick={()=>{setSD(d);go("dayDetail");}}
                style={{width:28,height:28,borderRadius:7,background:c,border:"none",cursor:"pointer",fontFamily:T.fM,fontSize:8,color:p>=50?"#000":"rgba(255,255,255,0.35)",fontWeight:700}}>
                {d}
              </button>
            );})}
          </div>
          <div style={{display:"flex",gap:12,marginTop:10,fontSize:10,color:T.t3,flexWrap:"wrap",fontFamily:T.fM,letterSpacing:"0.05em"}}>
            <span>● 80%+</span><span>● 50–79%</span><span>● &lt;50%</span><span>● Empty</span>
          </div>
        </Card>
      </div>
    );
  };

  /* ════════ VIEW: DAY DETAIL ════════ */
  const vDD = () => {
    const l=lg(selDay),dph=getPhaseForDay(selDay),dPI=PHASES[dph-1];
    const ddow=data.startDate?DAYS[new Date(new Date(data.startDate).getTime()+(selDay-1)*86400000).getDay()]:"Monday";
    const sleepDur=(()=>{
      const s=l.sleepTime,w=l.wakeTime;
      if(!s||!w) return null;
      const [sh,sm]=s.split(":").map(Number),[wh,wm]=w.split(":").map(Number);
      let m=(wh*60+wm)-(sh*60+sm); if(m<0) m+=1440;
      return {h:Math.floor(m/60),m:m%60,total:m};
    })();
    const routinesDone = ROUTINES.filter(r=>(l.routines||{})[r.id]);
    const medsDone = (data.meds||[]).filter(m=>(l.medsTaken||{})[m.id]);
    const foodLog = l.foodLog||[];
    const totalCal = foodLog.reduce((s,f)=>s+(f.cal||0),0);
    const moodI = MOODS.find(m=>m.score===l.moodScore);
    const energyI = ENERGY.find(e=>e.score===l.energyScore);

    const Section = ({title,children,color=T.t3})=>(
      <div style={{marginBottom:14}}>
        <div className="eyebrow" style={{marginBottom:10,paddingLeft:2,color}}>{title}</div>
        <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden"}}>
          {children}
        </div>
      </div>
    );
    const Row=({label,value,color=T.t1,sub})=>(
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
        <span style={{fontSize:13,color:T.t2}}>{label}</span>
        <div style={{textAlign:"right"}}>
          <span className="mono" style={{fontSize:15,fontWeight:500,color}}>{value}</span>
          {sub&&<div className="mono" style={{fontSize:9,color:T.t3,marginTop:1}}>{sub}</div>}
        </div>
      </div>
    );

    return (
      <div key={ak} className="fadeUp" style={{padding:"0 20px 32px"}}>
        <button className="press" onClick={()=>go("stats")} style={{background:"none",border:"none",color:T.lime,fontFamily:T.fM,fontSize:12,fontWeight:600,cursor:"pointer",padding:"0 0 14px",letterSpacing:".08em"}}>‹ BACK TO STATS</button>

        {/* Header */}
        <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",borderRadius:22,border:"1px solid rgba(255,255,255,0.10)",padding:"20px",marginBottom:20,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,${dPI.color}22,transparent 70%)`,filter:"blur(20px)"}}/>
          <div style={{position:"relative"}}>
            <div className="eyebrow" style={{marginBottom:6,color:T.lime}}>Day Detail</div>
            <div style={{fontFamily:T.fS,fontSize:42,fontStyle:"italic",color:T.t1,lineHeight:.9,marginBottom:6}}>Day <span style={{color:T.lime}}>{String(selDay).padStart(2,"0")}</span></div>
            <div className="mono" style={{fontSize:11,color:T.t3,letterSpacing:".08em"}}>{ddow.toUpperCase()} · {dPI.label.toUpperCase()} · {dPI.name.toUpperCase()}</div>
          </div>
        </div>

        {/* Check-in */}
        <Section title="Check-In" color={T.lime}>
          {[["noAlcohol","No Alcohol","🚫"],["noPorn","No Porn","🛡️"],["workoutDone","Workout Done","💪"],["drank3L","3L Water","💧"],["ate10k","10k Steps","🚶"],["sleptWell","Good Sleep","😴"]].map(([f,lb,ic],i,a)=>{
            const on=!!l[f];
            return(
              <div key={f} style={{display:"flex",alignItems:"center",gap:13,padding:"11px 16px",borderBottom:i<a.length-1?"1px solid rgba(255,255,255,0.04)":"none",background:on?"rgba(255,255,255,0.015)":"transparent"}}>
                <span style={{fontSize:18,minWidth:26}}>{ic}</span>
                <span style={{flex:1,fontSize:14,color:on?T.t1:T.t3}}>{lb}</span>
                <div style={{width:22,height:22,borderRadius:11,background:on?T.lime:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:on?`0 0 10px ${T.limeG}`:"none",flexShrink:0}}>
                  {on&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
            );
          })}
        </Section>

        {/* Activity */}
        {(l.steps||l.km||l.mins||l.weight)&&(
          <Section title="Activity & Body" color={T.cyan}>
            {l.steps>0&&<Row label="Steps" value={l.steps.toLocaleString()} color={T.lime} sub={`/ 10,000 · ${Math.round(l.steps/10000*100)}%`}/>}
            {l.km>0&&<Row label="Distance" value={`${l.km} km`} color={T.cyan} sub="/ 4 km goal"/>}
            {l.mins>0&&<Row label="Active mins" value={`${l.mins} min`} color={T.cyan} sub="/ 45 min goal"/>}
            {l.weight&&<Row label="Weight" value={`${l.weight} kg`} color={T.lime} sub={`${Math.max(0,l.weight-65).toFixed(1)} kg from goal`}/>}
          </Section>
        )}

        {/* Sleep */}
        {(l.sleepTime||l.wakeTime)&&(
          <Section title="Sleep" color={T.mag}>
            {l.sleepTime&&<Row label="Bedtime" value={l.sleepTime} color={l.sleepTime<="23:30"?T.lime:T.mag} sub={l.sleepTime<="23:30"?"✓ On time":"Late"}/>}
            {l.wakeTime&&<Row label="Wake up" value={l.wakeTime} color={T.cyan}/>}
            {sleepDur&&<Row label="Duration" value={`${sleepDur.h}h ${sleepDur.m}m`} color={sleepDur.total>=420?T.lime:T.mag} sub={sleepDur.total>=420?"Good sleep":"Below 7h"}/>}
          </Section>
        )}

        {/* Mood */}
        {(moodI||energyI||(l.emotions||[]).length>0||l.moodNote)&&(
          <Section title="Mood & Energy" color={T.mag}>
            {moodI&&<Row label="Mood" value={`${moodI.emoji} ${moodI.label}`} color={T.lime}/>}
            {energyI&&<Row label="Energy" value={`${energyI.emoji} ${energyI.label}`} color={T.cyan}/>}
            {(l.emotions||[]).length>0&&<div style={{padding:"11px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <div className="eyebrow" style={{marginBottom:7}}>Emotions</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {(l.emotions||[]).map(e=><span key={e} style={{padding:"4px 10px",borderRadius:99,background:T.limeS,border:`1px solid ${T.lime}`,fontSize:11,color:T.lime,fontFamily:T.fM,letterSpacing:".06em"}}>{e}</span>)}
              </div>
            </div>}
            {l.moodNote&&<div style={{padding:"11px 16px"}}>
              <div className="eyebrow" style={{marginBottom:6}}>Note</div>
              <div style={{fontSize:13,color:T.t2,lineHeight:1.6,fontStyle:"italic"}}>"{l.moodNote}"</div>
            </div>}
          </Section>
        )}

        {/* Routines */}
        {routinesDone.length>0&&(
          <Section title={`Routines · ${routinesDone.length}/${ROUTINES.length} done`} color={T.lime}>
            {ROUTINES.map((r,i,a)=>{
              const done=!!(l.routines||{})[r.id];
              return(
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<a.length-1?"1px solid rgba(255,255,255,0.04)":"none",opacity:done?1:.4}}>
                  <span style={{fontSize:17}}>{r.icon}</span>
                  <span style={{flex:1,fontSize:13,color:done?T.t1:T.t3}}>{r.label}</span>
                  {done&&<div style={{width:18,height:18,borderRadius:9,background:T.lime,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 8px ${T.limeG}`}}>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>}
                </div>
              );
            })}
          </Section>
        )}

        {/* Meds */}
        {(data.meds||[]).length>0&&(
          <Section title={`Medications · ${medsDone.length}/${(data.meds||[]).length} taken`} color={T.cyan}>
            {(data.meds||[]).map((med,i,a)=>{
              const taken=!!(l.medsTaken||{})[med.id];
              return(
                <div key={med.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<a.length-1?"1px solid rgba(255,255,255,0.04)":"none",opacity:taken?1:.4}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:taken?T.lime:T.t3,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:taken?T.t1:T.t3}}>{med.name}</div>
                    {med.dose&&<div className="mono" style={{fontSize:9,color:T.t3,marginTop:1}}>{med.dose}</div>}
                  </div>
                  <span className="mono" style={{fontSize:10,color:taken?T.lime:T.t3,letterSpacing:".08em"}}>{taken?"TAKEN":"MISSED"}</span>
                </div>
              );
            })}
          </Section>
        )}

        {/* Food log */}
        {foodLog.length>0&&(
          <Section title={`Nutrition · ${totalCal} kcal logged`} color={T.lime}>
            {foodLog.map((f,i,a)=>(
              <div key={f.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:i<a.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                <div>
                  <div style={{fontSize:13,color:T.t1}}>{f.name}</div>
                  <div className="mono" style={{fontSize:9,color:T.t3,marginTop:1}}>{f.meal?.toUpperCase()}</div>
                </div>
                <span className="mono" style={{fontSize:13,color:T.lime}}>{f.cal} kcal</span>
              </div>
            ))}
          </Section>
        )}

        {/* Water */}
        {l.waterMl>0&&(
          <Section title="Hydration" color={T.cyan}>
            <Row label="Water intake" value={`${(l.waterMl/1000).toFixed(1)} L`} color={l.waterMl>=3000?T.lime:T.cyan} sub={`${Math.round(l.waterMl/3000*100)}% of 3L goal`}/>
          </Section>
        )}

        {/* Journal */}
        {l.notes&&(
          <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",padding:"16px 18px",marginBottom:14}}>
            <div className="eyebrow" style={{marginBottom:10}}>Journal</div>
            <div style={{fontFamily:T.fS,fontSize:15,fontStyle:"italic",color:T.t2,lineHeight:1.7}}>"{l.notes}"</div>
          </div>
        )}
      </div>
    );
  };

  /* ════════ VIEW: PLAN ════════ */
  const vPlan = () => (
    <div key={ak} className="fadeUp" style={{padding:"0 16px 24px"}}>
      <div className="eyebrow" style={{marginBottom:4,paddingTop:4}}>120-Day Plan</div>
      <div style={{fontFamily:T.fD,fontSize:26,fontWeight:600,color:T.t1,marginBottom:4,letterSpacing:"-0.02em"}}>Full Program</div>

      {/* Plan hero */}
      <Card style={{padding:22,marginBottom:14,position:"relative",overflow:"hidden",background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",border:"1px solid rgba(255,255,255,0.10)"}}>
        <div style={{position:"absolute",inset:0,background:`radial-gradient(60% 50% at 50% 30%,${T.limeS},transparent 70%)`}}/>
        <div style={{position:"relative"}}>
          <div className="eyebrow-accent" style={{marginBottom:10}}>FOUR PHASES · ONE ARC</div>
          <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:28,lineHeight:1.05,letterSpacing:"-0.01em",color:T.t1}}>
            From <span style={{color:T.t3}}>baseline</span><br/>to <span style={{color:T.lime}}>apex</span>.
          </div>
          <div style={{marginTop:18}}>
            <PhaseTrack day={cd} total={120}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8,gap:8}}>
              <span className="mono" style={{fontSize:10,color:T.lime,whiteSpace:"nowrap"}}>D{String(cd).padStart(3,"0")} / 120</span>
              <span className="mono" style={{fontSize:10,color:T.t3,whiteSpace:"nowrap"}}>{120-cd} DAYS REMAIN</span>
            </div>
          </div>
        </div>
      </Card>

      {PHASES.map(p=>{const m=getMeals(p.id),isA=p.id===ph;return(
        <Card key={p.id} style={{padding:16,marginBottom:12,border:isA?"1px solid rgba(255,255,255,0.10)":undefined,opacity:p.id>ph?0.7:1,position:"relative",overflow:"hidden"}}>
          {isA&&<div style={{position:"absolute",top:0,left:0,bottom:0,width:2,background:T.lime,boxShadow:`0 0 12px ${T.limeG}`}}/>}
          <div style={{paddingLeft:isA?8:0}}>
            {isA&&<div className="eyebrow-accent" style={{marginBottom:5}}>CURRENT PHASE</div>}
            <div className="mono" style={{fontSize:10,color:isA?T.lime:T.t3,fontWeight:600,letterSpacing:"0.1em",marginBottom:3}}>{p.label} · Days {p.days[0]}–{p.days[1]}</div>
            <div style={{fontFamily:T.fD,fontSize:18,fontWeight:500,color:T.t1,marginBottom:13,letterSpacing:"-0.01em"}}>{p.name}</div>
            <div className="eyebrow" style={{marginBottom:8}}>Weekly Schedule</div>
            {Object.entries({Monday:"Push + Core",Tuesday:"Run 4km",Wednesday:"Active Recovery",Thursday:"Push + Core",Friday:"Run + HIIT",Saturday:"Full Body",Sunday:"Rest & Walk"}).map(([day,theme],i,a)=>(
              <div key={day}><div style={{display:"flex",gap:10,padding:"7px 0",alignItems:"center"}}>
                <div className="mono" style={{width:32,fontSize:10,color:isA?T.lime:T.t3,fontWeight:600}}>{day.slice(0,3).toUpperCase()}</div>
                <div style={{fontSize:13,color:T.t2}}>{theme}</div>
              </div>{i<a.length-1&&<Dv/>}</div>
            ))}
            <div style={{marginTop:12,padding:"10px 13px",background:"rgba(255,255,255,0.04)",borderRadius:14,border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"baseline",gap:6}}>
              <span className="mono" style={{fontSize:20,color:isA?T.lime:T.t2,letterSpacing:"-0.02em"}}>{m.cal}</span>
              <span style={{fontSize:12,color:T.t3}}> kcal/day</span>
            </div>
          </div>
        </Card>
      );})}
      <Card style={{padding:16,marginBottom:12}}>
        <Lb>Sherbrooke Groceries (weekly)</Lb>
        {[["Eggs (18 pack)","$5-6"],["Canned tuna (8 cans)","$8-10"],["Chicken breast (1kg)","$10-12"],["Brown rice (2kg)","$4-5"],["Oats (1kg)","$4"],["Lentils/chickpeas","$3-4"],["Frozen broccoli (1kg)","$4"],["Bananas + apples","$5-7"],["Greek yogurt (4 pack)","$5-6"],["Olive oil + spices","$5-6"]].map(([item,price],i,a)=>(
          <div key={i}><div style={{display:"flex",justifyContent:"space-between",padding:"9px 0"}}>
            <span style={{fontSize:13,color:T.t2}}>{item}</span>
            <span className="mono" style={{fontSize:13,fontWeight:500,color:T.lime}}>{price}</span>
          </div>{i<a.length-1&&<Dv/>}</div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"11px 0 0",borderTop:"1px solid rgba(255,255,255,0.10)",marginTop:4}}>
          <span style={{fontSize:14,fontWeight:600,color:T.t1}}>Weekly Total</span>
          <span className="mono" style={{fontSize:15,fontWeight:600,color:T.lime}}>~$53-70</span>
        </div>
      </Card>
      <Card style={{padding:16}}>
        <Lb>The 6 Non-Negotiables</Lb>
        {[["🚶","10,000 Steps","Every day. Rain, snow, or shine."],["💧","3L Water","First glass before coffee."],["🍳","High Protein Every Meal","Eggs, tuna, chicken every time."],["🚫","Zero Alcohol","Not one sip. This is the foundation."],["😴","In Bed by 11pm","Your body transforms during sleep."],["📸","Weekly Photo","Day 1, 7, 30, 60, 90, 120."]].map(([ic,r,d],i,a)=>(
          <div key={r}><div style={{display:"flex",gap:13,padding:"11px 0",alignItems:"flex-start"}}>
            <span style={{fontSize:20,minWidth:26}}>{ic}</span>
            <div><div style={{fontSize:13,fontWeight:500,color:T.t1}}>{r}</div><div className="mono" style={{fontSize:10,color:T.t3,marginTop:2}}>{d}</div></div>
          </div>{i<a.length-1&&<Dv/>}</div>
        ))}
      </Card>
    </div>
  );


  /* ════════ MEAL SUGGESTION DATABASE ════════ */
  const MEAL_DB = {
    breakfast: {
      1:[
        {name:"Scrambled Eggs & Toast",  cal:380,p:28,c:32,f:12,desc:"3 eggs scrambled, 1 whole wheat toast, black coffee"},
        {name:"Banana Oat Bowl",          cal:340,p:12,c:58,f:8, desc:"½ cup oats, 1 banana, cinnamon, water — no sugar"},
        {name:"Egg & Veggie Omelette",    cal:310,p:26,c:8, f:18,desc:"3 eggs, spinach, onion, mushrooms — no cheese"},
        {name:"Boiled Eggs & Fruit",      cal:290,p:20,c:22,f:12,desc:"3 boiled eggs, 1 orange, black coffee"},
      ],
      2:[
        {name:"Egg White Omelette",       cal:280,p:32,c:10,f:8, desc:"4 egg whites + 1 yolk, peppers, mushrooms"},
        {name:"Oats & Eggs",              cal:350,p:24,c:48,f:7, desc:"½ cup oats, 2 boiled eggs on the side"},
        {name:"Greek Yogurt Bowl",        cal:290,p:22,c:28,f:6, desc:"Plain Greek yogurt, banana, 1 tbsp honey"},
        {name:"High Protein Scramble",    cal:340,p:30,c:14,f:16,desc:"4 eggs, spinach, salsa, whole wheat toast"},
      ],
      3:[
        {name:"Boiled Eggs + Oats",       cal:320,p:26,c:34,f:10,desc:"3 boiled eggs, ½ cup plain oats, lemon water first"},
        {name:"Clean Egg Scramble",       cal:300,p:28,c:8, f:16,desc:"3 eggs, spinach, black coffee — no toast in Phase 3"},
        {name:"Yogurt + Berries",         cal:240,p:22,c:24,f:4, desc:"Plain Greek yogurt, ½ cup berries, no honey"},
        {name:"Egg Muffins Meal Prep",    cal:290,p:28,c:6, f:16,desc:"4 eggs baked in muffin tin with mixed veg"},
      ],
      4:[
        {name:"Clean Egg Bowl",           cal:300,p:30,c:10,f:16,desc:"3 eggs, salsa, spinach — zero carbs at breakfast"},
        {name:"Protein Oats",             cal:330,p:28,c:36,f:8, desc:"Oats + 3 egg whites cooked in, cinnamon only"},
        {name:"Overnight Oats",           cal:350,p:20,c:46,f:8, desc:"Oats, almond milk, chia seeds — prep night before"},
        {name:"Smoked Salmon + Eggs",     cal:310,p:32,c:4, f:18,desc:"2 eggs, 60g smoked salmon, cucumber slices"},
      ],
    },
    lunch: {
      1:[
        {name:"Tuna Rice Bowl",           cal:480,p:38,c:52,f:10,desc:"1 can tuna, 1 cup white rice, cucumber, lemon juice"},
        {name:"Chicken & Lentils",        cal:460,p:42,c:40,f:10,desc:"150g chicken breast, ½ cup lentils, olive oil, garlic"},
        {name:"Egg Salad Plate",          cal:380,p:28,c:14,f:22,desc:"3 hard boiled eggs, big salad, olive oil + lemon"},
        {name:"Bean & Rice Bowl",         cal:440,p:22,c:68,f:8, desc:"Black beans, brown rice, salsa, lime juice"},
      ],
      2:[
        {name:"Salmon & Sweet Potato",    cal:490,p:40,c:44,f:14,desc:"150g canned salmon, medium sweet potato, mixed greens"},
        {name:"Tuna Big Salad",           cal:380,p:42,c:12,f:14,desc:"2 cans tuna, big salad, olive oil + ACV dressing"},
        {name:"Chicken Stir Fry",         cal:470,p:44,c:36,f:12,desc:"150g chicken, mixed veg, soy sauce, brown rice"},
        {name:"Lentil Veggie Soup",       cal:380,p:22,c:52,f:6, desc:"Red lentils, carrots, celery, cumin — batch cook Sunday"},
      ],
      3:[
        {name:"Protein Power Salad",      cal:420,p:46,c:14,f:18,desc:"200g tuna/chicken, mixed greens, ACV dressing, chickpeas"},
        {name:"Shrimp & Brown Rice",      cal:460,p:44,c:42,f:8, desc:"150g shrimp, ½ cup brown rice, steamed broccoli"},
        {name:"Chicken Lettuce Wraps",    cal:350,p:42,c:10,f:12,desc:"Ground chicken, lettuce cups, cucumber, hot sauce"},
        {name:"Chickpea Power Bowl",      cal:430,p:24,c:52,f:12,desc:"½ cup chickpeas, quinoa, roasted veg, tahini drizzle"},
      ],
      4:[
        {name:"Lean Protein Plate",       cal:400,p:48,c:16,f:12,desc:"200g chicken or tuna, large salad, lemon + olive oil"},
        {name:"Turkey & Veg Bowl",        cal:420,p:46,c:18,f:10,desc:"150g ground turkey, roasted veg, cauliflower rice"},
        {name:"Double Tuna Plate",        cal:380,p:50,c:8, f:14,desc:"2 cans tuna, cucumber, tomato, mustard, no carbs"},
        {name:"Black Bean Salad",         cal:360,p:20,c:46,f:8, desc:"Black beans, corn, tomato, cilantro, lime"},
      ],
    },
    snack: {
      1:[
        {name:"Apple & Almonds",          cal:180,p:4, c:24,f:10,desc:"1 medium apple, 10 raw almonds"},
        {name:"Banana & Peanut Butter",   cal:210,p:6, c:28,f:8, desc:"1 banana, 1 tbsp natural peanut butter"},
        {name:"Hard Boiled Egg",          cal:80, p:6, c:0, f:6, desc:"1 hard boiled egg, pinch of salt"},
        {name:"Carrot & Hummus",          cal:140,p:6, c:18,f:6, desc:"1 cup baby carrots, 2 tbsp hummus"},
      ],
      2:[
        {name:"Greek Yogurt",             cal:140,p:16,c:8, f:4, desc:"Plain low-fat Greek yogurt, no toppings"},
        {name:"Rice Cakes & Tuna",        cal:160,p:18,c:16,f:2, desc:"2 rice cakes, ½ can tuna — clean and filling"},
        {name:"Boiled Egg + Cucumber",    cal:100,p:8, c:4, f:6, desc:"1 egg, ½ cucumber sliced with salt"},
        {name:"Cottage Cheese",           cal:120,p:14,c:6, f:4, desc:"½ cup low-fat cottage cheese — slow protein"},
      ],
      3:[
        {name:"Boiled Egg Only",          cal:80, p:6, c:0, f:6, desc:"1 hard boiled egg — clean, zero carbs"},
        {name:"Skip / Intermittent Fast", cal:0,  p:0, c:0, f:0, desc:"Best option in Phase 3 — skip snack, fast until dinner"},
        {name:"Black Coffee",             cal:5,  p:0, c:1, f:0, desc:"Black coffee kills hunger, zero calories"},
        {name:"Cucumber Slices",          cal:20, p:1, c:4, f:0, desc:"Sliced cucumber, salt, chili flakes — fills the stomach"},
      ],
      4:[
        {name:"Skip Snack",               cal:0,  p:0, c:0, f:0, desc:"No snack — meals are fully optimized in Phase 4"},
        {name:"Green Tea",                cal:2,  p:0, c:0, f:0, desc:"Green tea, no sugar — metabolic boost"},
        {name:"15 Almonds",               cal:100,p:4, c:4, f:9, desc:"Exactly 15 almonds — healthy fat, portion controlled"},
        {name:"Protein Shake (water)",    cal:120,p:24,c:4, f:1, desc:"Whey isolate in water only if very hungry"},
      ],
    },
    dinner: {
      1:[
        {name:"Chicken & Broccoli Bowl",  cal:480,p:46,c:36,f:12,desc:"150g chicken, 1 cup brown rice, steamed broccoli, olive oil"},
        {name:"Lentil Dal & Rice",        cal:420,p:24,c:58,f:6, desc:"Red lentils, tomatoes, cumin, garlic, brown rice"},
        {name:"Baked Chicken & Veg",      cal:440,p:48,c:20,f:12,desc:"150g chicken breast, roasted zucchini + carrots"},
        {name:"Tuna & Rice Bowl",         cal:460,p:40,c:48,f:8, desc:"1 can tuna, brown rice, steamed broccoli, soy sauce"},
      ],
      2:[
        {name:"Chicken & Quinoa",         cal:480,p:48,c:42,f:10,desc:"200g chicken breast, ½ cup quinoa, steamed zucchini"},
        {name:"Salmon & Green Beans",     cal:460,p:44,c:10,f:22,desc:"150g salmon, green beans, olive oil, lemon"},
        {name:"Turkey Meatballs & Veg",   cal:440,p:44,c:22,f:16,desc:"Ground turkey, tomato sauce, zucchini noodles"},
        {name:"Stir Fry & Brown Rice",    cal:490,p:46,c:46,f:8, desc:"Chicken, mixed veg, low-sodium soy, brown rice"},
      ],
      3:[
        {name:"Lean Protein + Veg Only",  cal:380,p:46,c:12,f:14,desc:"150g chicken/fish, large steamed veg — NO starch at dinner"},
        {name:"Shrimp Stir Fry (no rice)",cal:360,p:42,c:14,f:10,desc:"200g shrimp, bok choy, garlic — no rice in Phase 3"},
        {name:"Baked Cod & Asparagus",    cal:320,p:44,c:8, f:8, desc:"150g cod, asparagus, lemon, herbs — super lean"},
        {name:"Ground Turkey Bowl",       cal:400,p:46,c:16,f:14,desc:"150g turkey, cauliflower rice, salsa, no real carbs"},
      ],
      4:[
        {name:"Grilled Chicken & Greens", cal:360,p:48,c:8, f:12,desc:"200g chicken, massive salad, olive oil — max protein"},
        {name:"Tuna & Steamed Veg",       cal:300,p:46,c:8, f:6, desc:"2 cans tuna, broccoli, green beans, lemon — cleanest meal"},
        {name:"Egg White Omelette",       cal:280,p:32,c:6, f:12,desc:"5 egg whites, mushrooms, spinach — light and lean"},
        {name:"White Fish & Veg",         cal:320,p:44,c:10,f:8, desc:"150g tilapia or cod, steamed veg, herbs"},
      ],
    },
  };

  const vDiet = () => {
    const l = lg(cd);
    const meals = getMeals(ph);

    // Water helpers
    const WATER_GOAL = 3000, GLASS = 250, GLASSES = 12;
    const waterMl = l.waterMl || 0;
    const waterGlasses = Math.floor(waterMl / GLASS);
    const waterPct = Math.min(100, Math.round((waterMl / WATER_GOAL) * 100));

    // Calorie helpers
    const BMR = 1900;
    const stepBurn  = Math.round(((l.steps||0)/10000)*400);
    const runBurn   = Math.round((l.km||0)*60);
    const workBurn  = l.workoutDone ? 200 : 0;
    const totalBurn = BMR + stepBurn + runBurn + workBurn;

    // Food log total
    const foodLog = l.foodLog || [];
    const loggedCals = foodLog.reduce((s,f) => s+(f.cal||0), 0);
    const calsIn = loggedCals > 0 ? loggedCals : (l.calsIn || meals.cal);
    const deficit = totalBurn - calsIn;

    // Weekly / monthly
    const weekRange = Array.from({length:7},(_,i)=>Math.max(1,cd-6+i));
    const weekBurn  = weekRange.reduce((s,d)=>{const dl=data.logs[d]||{};return s+BMR+Math.round(((dl.steps||0)/10000)*400)+Math.round((dl.km||0)*60)+(dl.workoutDone?200:0);},0);
    const weekIn    = weekRange.reduce((s,d)=>{const dl=data.logs[d]||{};const fl=(dl.foodLog||[]).reduce((a,f)=>a+(f.cal||0),0);return s+(fl>0?fl:(dl.calsIn||getMeals(getPhaseForDay(d)).cal));},0);
    const monthRange= Array.from({length:Math.min(30,cd)},(_,i)=>Math.max(1,cd-29+i));
    const monthBurn = monthRange.reduce((s,d)=>{const dl=data.logs[d]||{};return s+BMR+Math.round(((dl.steps||0)/10000)*400)+Math.round((dl.km||0)*60)+(dl.workoutDone?200:0);},0);
    const monthIn   = monthRange.reduce((s,d)=>{const dl=data.logs[d]||{};const fl=(dl.foodLog||[]).reduce((a,f)=>a+(f.cal||0),0);return s+(fl>0?fl:(dl.calsIn||getMeals(getPhaseForDay(d)).cal));},0);

    // Chart
    const chartDays = weekRange.map(d=>{
      const dl=data.logs[d]||{};const dph=getPhaseForDay(d);
      const b=BMR+Math.round(((dl.steps||0)/10000)*400)+Math.round((dl.km||0)*60)+(dl.workoutDone?200:0);
      const fl=(dl.foodLog||[]).reduce((a,f)=>a+(f.cal||0),0);
      const e=fl>0?fl:(dl.calsIn||getMeals(dph).cal);
      const name=data.startDate?DAYS[new Date(new Date(data.startDate).getTime()+(d-1)*86400000).getDay()].slice(0,3):"";
      return {d,b,e,name};
    });
    const maxB = Math.max(...chartDays.map(x=>x.b),2500);

    // Macros
    const macros=[
      {label:"Protein",g:ph<=1?120:ph<=2?140:ph<=3?150:155,color:T.lime},
      {label:"Carbs",  g:ph<=1?180:ph<=2?150:ph<=3?120:100,color:T.cyan},
      {label:"Fat",    g:ph<=1?60: ph<=2?55: ph<=3?50: 50, color:T.mag},
    ];
    const totalMG = macros.reduce((s,m)=>s+m.g,0);
    macros.forEach(m=>m.pct=Math.round(m.g/totalMG*100));

    // Add food entry
    const addFood = (item, mealType) => {
      const entry = { id: Date.now(), name: item.name, cal: item.cal, p: item.p, c: item.c, f: item.f, meal: mealType, time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) };
      const updated = [...(l.foodLog||[]), entry];
      upd(cd, "foodLog", updated);
      setActiveSug(null);
    };

    const addCustomFood = (name, cal, mealType) => {
      if(!name||!cal) return;
      const entry = { id: Date.now(), name, cal:parseInt(cal)||0, p:0, c:0, f:0, meal:mealType, time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), custom:true };
      upd(cd, "foodLog", [...(l.foodLog||[]), entry]);
    };

    const removeFood = (id) => {
      upd(cd, "foodLog", (l.foodLog||[]).filter(f=>f.id!==id));
    };

    const MEAL_TYPES = [
      {key:"breakfast", label:"Breakfast", icon:"🌅"},
      {key:"lunch",     label:"Lunch",     icon:"☀️"},
      {key:"snack",     label:"Snack",     icon:"🍎"},
      {key:"dinner",    label:"Dinner",    icon:"🌙"},
    ];

    const TAB_STYLE = (active) => ({
      flex:1, padding:"9px 4px", border:"none", borderRadius:10,
      background: active ? T.lime : "rgba(255,255,255,0.05)",
      color: active ? "#000" : T.t2,
      fontFamily:T.fM, fontSize:11, fontWeight:active?700:400,
      letterSpacing:".05em", textTransform:"uppercase",
      cursor:"pointer", transition:"all .2s"
    });

    return (
      <div key={ak} className="fadeUp" style={{padding:"0 16px 24px"}}>
        <div style={{marginBottom:16}}>
          <div className="eyebrow" style={{marginBottom:4,paddingTop:4}}>Diet Dashboard</div>
          <div style={{fontFamily:T.fD,fontSize:26,fontWeight:600,color:T.t1,marginBottom:4,letterSpacing:"-0.02em"}}>Day {cd}</div>
          <div style={{fontFamily:T.fM,fontSize:11,color:T.t3}}>{PI.name}</div>
        </div>

        {/* Tab switcher */}
        <div style={{display:"flex",gap:6,marginBottom:16,background:"rgba(255,255,255,0.04)",padding:4,borderRadius:13}}>
          {[{id:"log",l:"Food Log"},{id:"suggest",l:"Suggestions"},{id:"water",l:"Water"},{id:"stats",l:"Stats"}].map(t=>(
            <button key={t.id} style={TAB_STYLE(dietTab===t.id)} onClick={()=>setDietTab(t.id)}>{t.l}</button>
          ))}
        </div>

        {/* ═══ TAB: FOOD LOG ═══ */}
        {dietTab==="log" && (
          <div>
            {/* Calorie summary */}
            <Card style={{padding:16,marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                {[
                  {l:"Burned",  v:totalBurn.toLocaleString(),c:T.mag,s:"kcal"},
                  {l:"Eaten",   v:calsIn.toLocaleString(),   c:T.cyan,s:"kcal logged"},
                  {l:deficit>0?"Deficit":"Surplus",v:Math.abs(deficit).toLocaleString(),c:deficit>0?T.lime:T.mag,s:"kcal"},
                ].map((s,i)=>(
                  <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:T.r2,padding:"12px 8px",textAlign:"center"}}>
                    <div className="mono" style={{fontSize:20,color:s.c,lineHeight:1,letterSpacing:"-0.02em"}}>{s.v}</div>
                    <div className="mono" style={{fontSize:9,color:T.t3,marginTop:3,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</div>
                    <div className="mono" style={{fontSize:8,color:T.t3}}>{s.s}</div>
                  </div>
                ))}
              </div>
              {/* Calorie bar */}
              <div style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span className="mono" style={{fontSize:10,color:T.t3}}>0</span>
                  <span className="mono" style={{fontSize:10,color:T.lime,fontWeight:600}}>Goal: {meals.cal} kcal</span>
                  <span className="mono" style={{fontSize:10,color:T.t3}}>{Math.round(meals.cal*1.2)}</span>
                </div>
                <div style={{background:"rgba(255,255,255,0.07)",borderRadius:6,height:6,overflow:"hidden",position:"relative"}}>
                  <div style={{position:"absolute",left:`${Math.min(100,(meals.cal/Math.round(meals.cal*1.2))*100)}%`,top:0,bottom:0,width:1,background:T.lime,zIndex:2}}/>
                  <div style={{width:`${Math.min(100,(calsIn/Math.round(meals.cal*1.2))*100)}%`,height:"100%",background:calsIn>meals.cal?T.mag:T.cyan,borderRadius:6,transition:"width 1s cubic-bezier(.22,.68,0,1.2)"}}/>
                </div>
              </div>
              <div style={{fontSize:10,color:T.txt3}}>{loggedCals>0?`${foodLog.length} items logged`:"No items logged yet — tap Suggestions to add meals"}</div>
            </Card>

            {/* Food log by meal — per-meal hoisted state avoids hook violations */}
            {[
              {mt:{key:"breakfast",label:"Breakfast",icon:"🌅"}, showAdd:showAddB,setShowAdd:setShowAddB, cName:custNameB,setCName:setCustNameB, cCal:custCalB,setCCal:setCustCalB},
              {mt:{key:"lunch",    label:"Lunch",    icon:"☀️"}, showAdd:showAddL,setShowAdd:setShowAddL, cName:custNameL,setCName:setCustNameL, cCal:custCalL,setCCal:setCustCalL},
              {mt:{key:"snack",    label:"Snack",    icon:"🍎"}, showAdd:showAddS,setShowAdd:setShowAddS, cName:custNameS,setCName:setCustNameS, cCal:custCalS,setCCal:setCustCalS},
              {mt:{key:"dinner",   label:"Dinner",   icon:"🌙"}, showAdd:showAddD,setShowAdd:setShowAddD, cName:custNameD,setCName:setCustNameD, cCal:custCalD,setCCal:setCustCalD},
            ].map(({mt,showAdd,setShowAdd,cName,setCName,cCal,setCCal})=>{
              const items = foodLog.filter(f=>f.meal===mt.key);
              const mealCals = items.reduce((s,f)=>s+f.cal,0);
              return (
                <Card key={mt.key} style={{padding:16,marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:items.length>0||showAdd?12:0}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontSize:20}}>{mt.icon}</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:T.txt}}>{mt.label}</div>
                        {mealCals>0&&<div style={{fontSize:11,color:T.txt3}}>{mealCals} kcal logged</div>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button className="press" onClick={()=>{ setActiveSug(mt.key); setDietTab("suggest"); }}
                        style={{padding:"6px 10px",borderRadius:8,background:T.limeS,border:`1px solid ${T.lime}`,color:T.lime,fontFamily:T.fM,fontSize:10,fontWeight:600,cursor:"pointer",letterSpacing:".05em"}}>
                        SUGGEST
                      </button>
                      <button className="press" onClick={()=>setShowAdd(!showAdd)}
                        style={{padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:10,cursor:"pointer",letterSpacing:".05em"}}>
                        {showAdd?"CANCEL":"+ LOG"}
                      </button>
                    </div>
                  </div>
                  {items.map((item,i)=>(
                    <div key={item.id}>
                      <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0"}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,color:T.txt,fontWeight:500}}>{item.name}</div>
                          <div style={{fontSize:10,color:T.txt3,marginTop:1}}>
                            {item.cal} kcal{item.p>0?` · ${item.p}g protein`:""}{item.time?` · ${item.time}`:""}
                          </div>
                        </div>
                        <button className="press" onClick={()=>removeFood(item.id)}
                          style={{width:26,height:26,borderRadius:8,background:T.magS,border:`1px solid ${T.mag}`,color:T.mag,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          ×
                        </button>
                      </div>
                      {i<items.length-1&&<Dv/>}
                    </div>
                  ))}
                  {showAdd&&(
                    <div style={{marginTop:items.length>0?12:0,padding:"12px",background:T.sur2,borderRadius:T.r2}}>
                      <div style={{fontSize:11,color:T.txt3,marginBottom:8,fontWeight:500}}>LOG CUSTOM FOOD</div>
                      <input placeholder="Food name (e.g. 2 eggs + toast)"
                        value={cName} onChange={e=>setCName(e.target.value)}
                        style={{...IS,marginBottom:8,fontSize:14}}/>
                      <div style={{display:"flex",gap:8}}>
                        <input type="number" placeholder="Calories" value={cCal} onChange={e=>setCCal(e.target.value)}
                          style={{...IS,flex:1,fontSize:14}}/>
                        <button className="press" onClick={()=>{ addCustomFood(cName,cCal,mt.key); setCName(""); setCCal(""); setShowAdd(false); }}
                          style={{padding:"12px 16px",borderRadius:T.r2,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:".08em"}}>
                          ADD
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {foodLog.length>0&&(
              <button className="press" onClick={()=>upd(cd,"foodLog",[])}
                style={{width:"100%",padding:12,borderRadius:12,background:T.magS,border:`1px solid ${T.mag}`,color:T.mag,fontFamily:T.fM,fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:14,letterSpacing:".05em"}}>
                Clear All Food Entries
              </button>
            )}
          </div>
        )}

        {/* ═══ TAB: SUGGESTIONS ═══ */}
        {dietTab==="suggest" && (
          <div>
            <div style={{fontSize:12,color:T.txt3,marginBottom:14,lineHeight:1.6}}>
              Phase {ph} optimized meals. Tap any meal to add it to your log.
            </div>
            {MEAL_TYPES.map(mt=>{
              const isActive = activeSug===mt.key;
              const suggestions = MEAL_DB[mt.key]?.[ph] || [];
              return (
                <Card key={mt.key} style={{padding:16,marginBottom:12,border:`1px solid ${isActive?pc+"44":T.brd}`}}>
                  <div className="press" onClick={()=>setActiveSug(isActive?null:mt.key)}
                    style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontSize:22}}>{mt.icon}</span>
                      <div>
                        <div style={{fontSize:15,fontWeight:600,color:T.txt}}>{mt.label}</div>
                        <div style={{fontSize:11,color:T.txt3}}>{suggestions.length} suggestions for Phase {ph}</div>
                      </div>
                    </div>
                    <span style={{color:T.txt3,fontSize:16,transition:"transform .2s",transform:isActive?"rotate(180deg)":"rotate(0deg)"}}>›</span>
                  </div>

                  {isActive&&(
                    <div style={{marginTop:14}}>
                      {suggestions.map((s,i)=>(
                        <div key={i}>
                          <div style={{padding:"11px 0"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                              <div style={{flex:1,marginRight:10}}>
                                <div style={{fontSize:14,fontWeight:600,color:T.txt,marginBottom:2}}>{s.name}</div>
                                <div style={{fontSize:11,color:T.txt2,lineHeight:1.5}}>{s.desc}</div>
                                <div style={{display:"flex",gap:12,marginTop:5}}>
                                  {[["🔥",s.cal,"kcal","#FF9F0A"],["💪",s.p+"g","protein","#0A84FF"],["🌾",s.c+"g","carbs","#FFD60A"],["🥑",s.f+"g","fat","#30D158"]].map(([ic,v,lb,c])=>(
                                    <div key={lb} style={{textAlign:"center"}}>
                                      <div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div>
                                      <div style={{fontSize:8,color:T.txt3}}>{lb}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <button className="press" onClick={()=>addFood(s,mt.key)}
                                style={{padding:"8px 14px",borderRadius:10,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0,marginTop:2,letterSpacing:".08em"}}>
                                + LOG
                              </button>
                            </div>
                          </div>
                          {i<suggestions.length-1&&<Dv/>}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Phase avoid list */}
            <Card style={{padding:14}}>
              <div className="eyebrow" style={{color:T.mag,marginBottom:6}}>AVOID THIS PHASE</div>
              <div style={{fontSize:13,color:T.t2,lineHeight:1.7}}>{meals.avoid}</div>
            </Card>
          </div>
        )}

        {/* ═══ TAB: WATER ═══ */}
        {dietTab==="water" && (
          <div>
            <Card style={{padding:16,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <Lb style={{margin:0}}>💧 Water Intake</Lb>
                <span className="mono" style={{fontSize:14,fontWeight:600,color:T.cyan}}>{(waterMl/1000).toFixed(2)}L <span style={{color:T.t3,fontWeight:400}}>/ 3L</span></span>
              </div>

              {/* Glass grid */}
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
                {Array.from({length:GLASSES},(_,i)=>{
                  const filled = i < waterGlasses;
                  return (
                    <button key={i} className="press"
                      onClick={()=>upd(cd,"waterMl",filled?Math.max(0,waterMl-GLASS):waterMl+GLASS)}
                      style={{width:44,height:54,borderRadius:11,border:`1.5px solid ${filled?T.cyan+"44":"rgba(255,255,255,0.08)"}`,background:filled?T.cyanS:"rgba(255,255,255,0.03)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",padding:"4px 4px 6px",transition:"all .2s"}}>
                      <div style={{fontSize:20,lineHeight:1}}>{filled?"🥤":"🫙"}</div>
                      <div className="mono" style={{fontSize:8,color:filled?T.cyan:T.t3,marginTop:2,fontWeight:filled?700:400}}>{(i+1)*250}ml</div>
                    </button>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div style={{background:"rgba(255,255,255,0.06)",borderRadius:8,height:6,overflow:"hidden",marginBottom:8}}>
                <div style={{width:`${waterPct}%`,height:"100%",background:T.cyan,boxShadow:`0 0 8px ${T.cyanS}`,borderRadius:8,transition:"width .8s cubic-bezier(.22,.68,0,1.2)"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                <span className="mono" style={{fontSize:11,color:T.cyan,fontWeight:600}}>{waterGlasses}/{GLASSES} glasses</span>
                <span className="mono" style={{fontSize:11,color:waterPct>=100?T.lime:T.t3,fontWeight:waterPct>=100?700:400}}>{waterPct>=100?"✓ GOAL REACHED":waterPct+"% of goal"}</span>
              </div>

              {/* Quick add */}
              <div style={{display:"flex",gap:8}}>
                {[250,500,750].map(ml=>(
                  <button key={ml} className="press" onClick={()=>upd(cd,"waterMl",(waterMl||0)+ml)}
                    style={{flex:1,padding:"10px 4px",borderRadius:10,background:T.cyanS,border:`1px solid ${T.cyan}`,color:T.cyan,fontFamily:T.fM,fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:".05em"}}>
                    +{ml}ml
                  </button>
                ))}
                <button className="press" onClick={()=>upd(cd,"waterMl",0)}
                  style={{padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",color:T.t3,fontFamily:T.fM,fontSize:11,cursor:"pointer"}}>
                  RST
                </button>
              </div>
            </Card>

            {/* 7-day water bars */}
            <Card style={{padding:16}}>
              <Lb>7-Day Water History</Lb>
              <div style={{display:"flex",gap:6,justifyContent:"space-between",alignItems:"flex-end"}}>
                {weekRange.map((d,i)=>{
                  const wMl=data.logs[d]?.waterMl||0;
                  const wPct=Math.min(100,Math.round((wMl/WATER_GOAL)*100));
                  const dn=data.startDate?DAYS[new Date(new Date(data.startDate).getTime()+(d-1)*86400000).getDay()].slice(0,1):"";
                  const isT=d===cd;
                  return (
                    <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{fontSize:9,color:isT?pc:T.txt3,fontWeight:isT?700:400}}>{wPct>0?wPct+"%":""}</div>
                      <div style={{width:"100%",height:60,background:"rgba(100,210,255,0.06)",borderRadius:6,overflow:"hidden",display:"flex",alignItems:"flex-end"}}>
                        <div style={{width:"100%",height:`${wPct}%`,background:"linear-gradient(0deg,#0A84FF,#64D2FF)",transition:"height 1s cubic-bezier(.22,.68,0,1.2)",opacity:isT?1:.7}}/>
                      </div>
                      <div style={{fontSize:9,color:isT?pc:T.txt3,fontWeight:isT?700:400}}>{dn}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:14,padding:"10px 12px",background:"rgba(100,210,255,0.06)",borderRadius:T.r2,border:"1px solid rgba(100,210,255,0.15)"}}>
                <div className="mono" style={{fontSize:11,color:T.cyan,fontWeight:600,marginBottom:3}}>WHY 3L MATTERS</div>
                <div style={{fontSize:11,color:T.txt3,lineHeight:1.6}}>Water flushes the alcohol bloat, reduces facial puffiness, improves skin, and cuts hunger by up to 30%. Start every morning with a full glass before coffee.</div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══ TAB: STATS ═══ */}
        {dietTab==="stats" && (
          <div>
            {/* Macros */}
            <Card style={{padding:16,marginBottom:14}}>
              <Lb>🥗 Daily Macro Targets — Phase {ph}</Lb>
              {macros.map(m=>(
                <div key={m.label} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:13,color:T.t2,fontWeight:500}}>{m.label}</span>
                    <span className="mono" style={{fontSize:13,color:m.color,fontWeight:600}}>{m.g}g <span style={{color:T.t3,fontWeight:400,fontSize:11}}>({m.pct}%)</span></span>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.07)",borderRadius:4,height:4,overflow:"hidden"}}>
                    <div style={{width:`${m.pct}%`,height:"100%",background:m.color,borderRadius:4,transition:"width 1s cubic-bezier(.22,.68,0,1.2)"}}/>
                  </div>
                </div>
              ))}
            </Card>

            {/* 7-day chart */}
            <Card style={{padding:16,marginBottom:14}}>
              <Lb>📊 7-Day Calorie Chart</Lb>
              <div style={{overflowX:"auto",paddingBottom:4}}>
                <div style={{display:"flex",alignItems:"flex-end",gap:6,minWidth:chartDays.length*44,height:108,position:"relative",paddingBottom:20}}>
                  {chartDays.map((day,i)=>{
                    const bH=Math.round((day.b/maxB)*80);
                    const eH=Math.round((day.e/maxB)*80);
                    const isT=day.d===cd;
                    return (
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:36}}>
                        <div style={{display:"flex",gap:2,alignItems:"flex-end",height:82}}>
                          <div style={{width:14,height:bH,background:"#FF453A88",borderRadius:"3px 3px 0 0",border:isT?"1px solid #FF453A":"none"}}/>
                          <div style={{width:14,height:eH,background:"#FF9F0A88",borderRadius:"3px 3px 0 0",border:isT?"1px solid #FF9F0A":"none"}}/>
                        </div>
                        <div style={{fontSize:8,color:isT?pc:T.txt3,fontWeight:isT?700:400,position:"absolute",bottom:0}}>{day.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{display:"flex",gap:14,marginTop:8}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,background:"#FF453A88",borderRadius:2}}/><span style={{fontSize:11,color:T.txt3}}>Burned</span></div>
                <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,background:"#FF9F0A88",borderRadius:2}}/><span style={{fontSize:11,color:T.txt3}}>Eaten</span></div>
              </div>
            </Card>

            {/* Deficit summary */}
            <Card style={{padding:16,marginBottom:14}}>
              <Lb>📉 Deficit Summary</Lb>
              {[
                {period:"Today",   burn:totalBurn,eaten:calsIn,     def:deficit,         days:1},
                {period:"7 Days",  burn:weekBurn, eaten:weekIn,     def:weekBurn-weekIn, days:7},
                {period:"30 Days", burn:monthBurn,eaten:monthIn,    def:monthBurn-monthIn,days:Math.min(30,cd)},
              ].map(({period,burn,eaten,def,days},i,a)=>{
                const fat=def>0?(def/7700).toFixed(2):"0";
                return (
                  <div key={period}>
                    <div style={{padding:"12px 0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <span style={{fontSize:13,fontWeight:600,color:T.txt}}>{period}</span>
                        <span className="mono" style={{fontSize:12,color:def>0?T.lime:T.mag,fontWeight:600}}>
                          {def>0?"-":"+"}{ Math.abs(def).toLocaleString()} kcal
                        </span>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        {[{l:"Burned",v:burn.toLocaleString(),c:T.mag},{l:"Eaten",v:eaten.toLocaleString(),c:T.cyan},{l:"Fat Lost",v:`${fat}kg`,c:def>0?T.lime:T.mag}].map((s,j)=>(
                          <div key={j} style={{flex:1,background:T.sur2,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                            <div style={{fontSize:13,fontWeight:700,color:s.c}}>{s.v}</div>
                            <div style={{fontSize:8,color:T.txt3,marginTop:2}}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {i<a.length-1&&<Dv/>}
                  </div>
                );
              })}
              <div style={{marginTop:10,padding:"9px 12px",background:"rgba(48,209,88,0.07)",borderRadius:T.r2,border:"1px solid rgba(48,209,88,0.15)"}}>
                <div className="mono" style={{fontSize:11,color:T.lime,fontWeight:600,marginBottom:2}}>THE MATH</div>
                <div style={{fontSize:11,color:T.txt3,lineHeight:1.6}}>1kg fat = 7,700 kcal deficit. At ~{Math.max(0,deficit)} kcal/day deficit you lose ~{(Math.max(0,deficit)*30/7700).toFixed(2)}kg per month.</div>
              </div>
            </Card>

            {/* Burn breakdown */}
            <Card style={{padding:16}}>
              <Lb>🔥 Today's Burn Breakdown</Lb>
              {[
                {l:"Base Metabolic Rate",v:BMR,      c:T.t2},
                {l:`Steps (${(l.steps||0).toLocaleString()})`,v:stepBurn,c:T.lime},
                {l:`Running (${(l.km||0).toFixed(1)}km)`,     v:runBurn, c:T.cyan},
                {l:"Strength session",               v:workBurn,c:T.mag},
              ].map(({l:lb,v,c},i,a)=>(
                <div key={lb}>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0"}}>
                    <span style={{fontSize:13,color:T.t2}}>{lb}</span>
                    <span className="mono" style={{fontSize:13,fontWeight:500,color:c}}>{v.toLocaleString()} kcal</span>
                  </div>
                  {i<a.length-1&&<Dv/>}
                </div>
              ))}
              <div style={{marginTop:10,padding:"10px 12px",background:T.limeS,borderRadius:T.r2,border:`1px solid ${T.lime}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:600,color:T.t1}}>Total Burn</span>
                  <span className="mono" style={{fontSize:22,color:T.lime,letterSpacing:"-0.02em"}}>{totalBurn.toLocaleString()} <span style={{fontSize:12,color:T.t3,fontWeight:400}}>kcal</span></span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };


  /* ════════ VIEW: MEDS ════════ */
  const vMeds = () => {
    const meds = data.meds || [];
    const takenToday = data.logs[cd]?.medsTaken || {};
    const totalToday = meds.length;
    const doneToday  = meds.filter(m => takenToday[m.id]).length;
    const pct = totalToday > 0 ? doneToday / totalToday : 0;

    const toggleTaken = (id) => {
      const cur = data.logs[cd]?.medsTaken || {};
      upd(cd, "medsTaken", {...cur, [id]: !cur[id]});
    };

    const addMed = () => {
      if (!medForm.name.trim()) return;
      const newMed = {...medForm, id: Date.now().toString()};
      setData(d => ({...d, meds: [...(d.meds||[]), newMed]}));
      setMedForm({name:"",dose:"",time:"08:00",category:"Supplement",notes:""});
      setShowAddMed(false);
    };

    const removeMed = (id) => {
      setData(d => ({...d, meds: (d.meds||[]).filter(m => m.id !== id)}));
    };

    const CAT_COLOR = {
      Vitamin:"oklch(0.92 0.22 130)",
      Supplement:"oklch(0.85 0.18 200)",
      Prescription:"oklch(0.78 0.22 340)",
      Mental:"oklch(0.82 0.18 90)",
      Other:"rgba(255,255,255,0.38)",
    };

    const sortedMeds = [...meds].sort((a,b) => a.time.localeCompare(b.time));

    return (
      <div key={ak} className="fadeUp" style={{padding:"0 20px 32px"}}>

        {/* ── Hero ── */}
        <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",borderRadius:22,border:"1px solid rgba(255,255,255,0.10)",padding:"22px 20px",marginBottom:16,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-50,right:-50,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,oklch(0.92 0.22 130 / 0.15),transparent 70%)",filter:"blur(20px)"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:T.lime,boxShadow:`0 0 8px ${T.limeG}`}}/>
              <span className="eyebrow-accent">Daily Protocol</span>
            </div>
            <div style={{fontFamily:T.fS,fontSize:34,fontStyle:"italic",lineHeight:1.05,color:T.t1,marginBottom:6}}>
              {totalToday===0 ? "No meds set up yet." : doneToday===totalToday ? "All done. 🎯" : `Take care of\nyour body.`}
            </div>
            {totalToday > 0 && (
              <>
                <div style={{marginTop:16,display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:8}}>
                  <span className="mono" style={{fontSize:26,color:T.t1,letterSpacing:"-0.02em"}}>
                    {String(doneToday).padStart(2,"0")}<span style={{color:T.t3}}>/{String(totalToday).padStart(2,"0")}</span>
                  </span>
                  <span className="mono" style={{fontSize:11,color:T.lime}}>{Math.round(pct*100)}% TAKEN</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct*100}%`,background:T.lime,boxShadow:`0 0 8px ${T.limeG}`,borderRadius:2,transition:"width .6s cubic-bezier(.2,.8,.2,1)"}}/>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Timeline ── */}
        {totalToday > 0 && (
          <div style={{marginBottom:20,position:"relative"}}>
            <div style={{position:"absolute",left:48,top:0,bottom:0,width:1,background:"linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04),transparent)"}}/>
            <div className="eyebrow" style={{marginBottom:16,paddingLeft:4}}>Today's Schedule</div>
            {sortedMeds.map((med) => {
              const taken = !!takenToday[med.id];
              const c = CAT_COLOR[med.category] || CAT_COLOR.Other;
              return (
                <div key={med.id} style={{display:"flex",alignItems:"center",gap:16,marginBottom:10,position:"relative"}}>
                  <span className="mono" style={{width:36,fontSize:11,color:taken?T.t3:T.t2,textAlign:"right",flexShrink:0}}>{med.time}</span>
                  <button onClick={()=>toggleTaken(med.id)} style={{
                    width:22,height:22,borderRadius:22,flexShrink:0,padding:0,
                    border:`1.5px solid ${taken?c:"rgba(255,255,255,0.18)"}`,
                    background:taken?c:"transparent",
                    boxShadow:taken?`0 0 10px ${c}`:"none",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    cursor:"pointer",transition:"all .3s",
                  }}>
                    {taken&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <div style={{
                    flex:1,padding:"12px 14px",
                    background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",
                    borderRadius:16,border:`1px solid ${taken?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.10)"}`,
                    opacity:taken?0.55:1,transition:"all .3s",
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span className="mono" style={{fontSize:9,letterSpacing:".18em",color:c,opacity:taken?.6:1}}>{med.category.toUpperCase()}</span>
                      {taken && <span className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".1em"}}>DONE</span>}
                    </div>
                    <div style={{fontSize:15,fontWeight:500,color:taken?T.t2:T.t1,letterSpacing:"-0.01em",textDecoration:taken?"line-through":"none",textDecorationColor:"rgba(255,255,255,0.2)"}}>{med.name}</div>
                    {med.dose && <div className="mono" style={{fontSize:11,color:T.t3,marginTop:3}}>{med.dose}</div>}
                    {med.notes && <div style={{fontSize:12,color:T.t3,marginTop:4,fontStyle:"italic"}}>{med.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Manage medications ── */}
        <div className="eyebrow" style={{marginBottom:12,paddingLeft:2}}>My Medications</div>
        {meds.length > 0 && (
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
            {meds.map(med => {
              const c = CAT_COLOR[med.category] || CAT_COLOR.Other;
              return (
                <div key={med.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:16,border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0,boxShadow:`0 0 6px ${c}`}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:500,color:T.t1}}>{med.name}</div>
                    <div className="mono" style={{fontSize:10,color:T.t3,marginTop:2}}>{med.time} · {med.dose||med.category}</div>
                  </div>
                  <button onClick={()=>removeMed(med.id)} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"4px 10px",color:T.t3,fontFamily:T.fM,fontSize:10,cursor:"pointer",letterSpacing:".05em",flexShrink:0}}>REMOVE</button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Add form ── */}
        {showAddMed ? (
          <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",borderRadius:22,border:"1px solid rgba(255,255,255,0.10)",padding:20,marginBottom:14}}>
            <div className="eyebrow-accent" style={{marginBottom:16}}>Add Medication</div>
            {[
              {label:"Name",key:"name",type:"text",placeholder:"e.g. Vitamin D3"},
              {label:"Dose",key:"dose",type:"text",placeholder:"e.g. 2000 IU / 1 tablet"},
              {label:"Time",key:"time",type:"time",placeholder:""},
            ].map(({label,key,type,placeholder})=>(
              <div key={key} style={{marginBottom:12}}>
                <div className="eyebrow" style={{marginBottom:6}}>{label}</div>
                <input
                  type={type} value={medForm[key]} placeholder={placeholder}
                  onChange={e=>setMedForm(f=>({...f,[key]:e.target.value}))}
                  style={{...IS,fontSize:15}}
                />
              </div>
            ))}
            <div style={{marginBottom:12}}>
              <div className="eyebrow" style={{marginBottom:8}}>Category</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {["Vitamin","Supplement","Prescription","Mental","Other"].map(cat=>{
                  const sel = medForm.category===cat;
                  const c = CAT_COLOR[cat];
                  return (
                    <button key={cat} onClick={()=>setMedForm(f=>({...f,category:cat}))} style={{
                      padding:"6px 12px",borderRadius:999,cursor:"pointer",
                      background:sel?`${c}22`:"rgba(255,255,255,0.03)",
                      border:`1px solid ${sel?c:"rgba(255,255,255,0.08)"}`,
                      color:sel?c:T.t2,fontFamily:T.fM,fontSize:10,
                      boxShadow:sel?`0 0 10px ${c}55`:"none",
                      letterSpacing:".08em",transition:"all .2s",
                    }}>{cat.toUpperCase()}</button>
                  );
                })}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div className="eyebrow" style={{marginBottom:6}}>Notes (optional)</div>
              <input type="text" value={medForm.notes} placeholder="e.g. Take with food"
                onChange={e=>setMedForm(f=>({...f,notes:e.target.value}))}
                style={{...IS,fontSize:15}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={addMed} style={{flex:1,padding:14,borderRadius:14,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:".08em",boxShadow:`0 0 20px ${T.limeG}`}}>ADD →</button>
              <button onClick={()=>setShowAddMed(false)} style={{padding:"14px 18px",borderRadius:14,background:"none",border:"1px solid rgba(255,255,255,0.08)",color:T.t2,fontFamily:T.fM,fontSize:12,cursor:"pointer",letterSpacing:".05em"}}>CANCEL</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setShowAddMed(true)} style={{width:"100%",padding:15,borderRadius:16,background:"rgba(255,255,255,0.03)",border:`1px dashed rgba(255,255,255,0.12)`,color:T.t2,fontFamily:T.fM,fontSize:11,cursor:"pointer",letterSpacing:".1em",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            <span style={{fontSize:18,fontStyle:"normal"}}>＋</span> ADD MEDICATION
          </button>
        )}

        {/* ── History ── */}
        {meds.length > 0 && (
          <div style={{marginTop:24}}>
            <div className="eyebrow" style={{marginBottom:12,paddingLeft:2}}>7-Day Adherence</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {meds.map(med => {
                const c = CAT_COLOR[med.category] || CAT_COLOR.Other;
                const days7 = Array.from({length:7},(_,i)=>cd-6+i).filter(d=>d>=1);
                return (
                  <div key={med.id} style={{padding:"12px 14px",background:"linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.006))",borderRadius:16,border:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontSize:13,fontWeight:500,color:T.t1}}>{med.name}</span>
                      <span className="mono" style={{fontSize:10,color:c}}>
                        {days7.filter(d=>data.logs[d]?.medsTaken?.[med.id]).length}/{days7.length} days
                      </span>
                    </div>
                    <div style={{display:"flex",gap:5}}>
                      {days7.map(d=>{
                        const taken=!!data.logs[d]?.medsTaken?.[med.id];
                        const dn=data.startDate?DAYS[new Date(new Date(data.startDate).getTime()+(d-1)*86400000).getDay()].slice(0,1):"";
                        return (
                          <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                            <div style={{width:24,height:24,borderRadius:6,background:taken?`${c}33`:"rgba(255,255,255,0.04)",border:`1px solid ${taken?c:"rgba(255,255,255,0.06)"}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:taken?`0 0 8px ${c}55`:"none"}}>
                              {taken&&<div style={{width:7,height:7,borderRadius:"50%",background:c}}/>}
                            </div>
                            <span className="mono" style={{fontSize:8,color:d===cd?T.lime:T.t3}}>{dn}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ════════ VIEW: ROUTINES ════════ */
  const ROUTINES = [
    {id:"brushTeeth",   label:"Brush Teeth",          icon:"🪥", cat:"Morning"},
    {id:"prayers",      label:"Prayers",               icon:"🙏", cat:"Morning"},
    {id:"scripture",    label:"Scripture Study",       icon:"📖", cat:"Morning"},
    {id:"workout",      label:"Workout",               icon:"💪", cat:"Morning"},
    {id:"cooking",      label:"Cooking",               icon:"🍳", cat:"Daytime"},
    {id:"studying",     label:"Studying",              icon:"📚", cat:"Daytime"},
    {id:"french",       label:"Learn French",          icon:"🇫🇷", cat:"Daytime"},
    {id:"goals",        label:"Work on Goals",         icon:"🎯", cat:"Daytime"},
    {id:"reading",      label:"Read a Book",           icon:"📕", cat:"Evening"},
    {id:"socialreach",  label:"Reach Out to Friends/Family", icon:"🤝", cat:"Evening"},
    {id:"cleaning",     label:"Cleaning",              icon:"🧹", cat:"Evening"},
  ];
  const SLEEP_TARGET = "23:30";

  const vRoutines = () => {
    const l = lg(cd);
    const done   = l.routines || {};
    const doneN  = ROUTINES.filter(r => done[r.id]).length;
    const totalN = ROUTINES.length;
    const pct    = doneN / totalN;

    const toggleRoutine = id => upd(cd, "routines", {...(l.routines||{}), [id]: !(l.routines||{})[id]});

    // Sleep duration calc
    const sleepDuration = (() => {
      const s = l.sleepTime, w = l.wakeTime;
      if (!s || !w) return null;
      const [sh,sm] = s.split(":").map(Number);
      const [wh,wm] = w.split(":").map(Number);
      let mins = (wh*60+wm) - (sh*60+sm);
      if (mins < 0) mins += 1440;
      const h = Math.floor(mins/60), m = mins%60;
      return {h, m, total: mins};
    })();

    const sleepOnTime = l.sleepTime && l.sleepTime <= SLEEP_TARGET;

    // Streak for full routine completion
    const routineStreak = (() => {
      let s = 0;
      for (let d = cd; d >= 1; d--) {
        const dr = data.logs[d]?.routines || {};
        if (ROUTINES.filter(r => dr[r.id]).length === totalN) s++;
        else break;
      }
      return s;
    })();

    // 7-day adherence per routine
    const days7 = Array.from({length:7},(_,i)=>cd-6+i).filter(d=>d>=1);

    const cats = ["Morning","Daytime","Evening"];
    const catColor = {Morning:T.lime, Daytime:T.cyan, Evening:T.mag};

    return (
      <div key={ak} className="fadeUp" style={{padding:"0 20px 32px"}}>

        {/* ── Hero ── */}
        <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",borderRadius:22,border:"1px solid rgba(255,255,255,0.10)",padding:"22px 20px",marginBottom:16,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,oklch(0.92 0.22 130 / 0.15),transparent 70%)",filter:"blur(20px)"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:T.lime,boxShadow:`0 0 8px ${T.limeG}`}}/>
              <span className="eyebrow-accent">Daily Routines</span>
            </div>
            <div style={{fontFamily:T.fS,fontSize:34,fontStyle:"italic",lineHeight:1.05,color:T.t1,marginBottom:16}}>
              {doneN === totalN ? <>Perfect day. 🔥</> : <>Build the\n<span style={{color:T.lime}}>discipline.</span></>}
            </div>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontFamily:T.fM,fontSize:26,color:T.t1,letterSpacing:"-0.02em"}}>
                {String(doneN).padStart(2,"0")}<span style={{color:T.t3}}>/{String(totalN).padStart(2,"0")}</span>
              </span>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {routineStreak > 0 && (
                  <span style={{fontFamily:T.fM,fontSize:10,color:T.lime,letterSpacing:".08em"}}>🔥 {routineStreak}-DAY STREAK</span>
                )}
                <span style={{fontFamily:T.fM,fontSize:11,color:T.lime}}>{Math.round(pct*100)}%</span>
              </div>
            </div>
            <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct*100}%`,background:T.lime,boxShadow:`0 0 8px ${T.limeG}`,borderRadius:2,transition:"width .6s cubic-bezier(.2,.8,.2,1)"}}/>
            </div>
          </div>
        </div>

        {/* ── Sleep ── */}
        <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:22,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"14px 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div className="eyebrow">Sleep Log</div>
            {sleepDuration && (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:T.fM,fontSize:12,color:sleepDuration.total>=420?T.lime:T.mag,fontWeight:600,letterSpacing:".03em"}}>
                  {sleepDuration.h}h {sleepDuration.m}m
                </span>
                {sleepOnTime && <span style={{fontFamily:T.fM,fontSize:9,color:T.lime,background:T.limeS,border:`1px solid ${T.lime}`,borderRadius:99,padding:"2px 7px",letterSpacing:".08em"}}>ON TIME</span>}
              </div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {/* Bedtime */}
            <div style={{padding:"16px 16px",borderRight:"1px solid rgba(255,255,255,0.06)"}}>
              <div className="eyebrow" style={{marginBottom:8,color:T.mag}}>Bedtime</div>
              <div style={{fontFamily:T.fM,fontSize:11,color:T.t3,marginBottom:8}}>TARGET · 11:30 PM</div>
              <input type="time" value={l.sleepTime||""} onChange={e=>upd(cd,"sleepTime",e.target.value)}
                style={{...IS,fontSize:20,fontWeight:600,textAlign:"center",letterSpacing:"0.04em",padding:"10px 12px",color:l.sleepTime&&l.sleepTime<=SLEEP_TARGET?T.lime:T.t1}}/>
            </div>
            {/* Wake time */}
            <div style={{padding:"16px 16px"}}>
              <div className="eyebrow" style={{marginBottom:8,color:T.lime}}>Wake Up</div>
              <div style={{fontFamily:T.fM,fontSize:11,color:T.t3,marginBottom:8}}>LOG YOUR RISE</div>
              <input type="time" value={l.wakeTime||""} onChange={e=>upd(cd,"wakeTime",e.target.value)}
                style={{...IS,fontSize:20,fontWeight:600,textAlign:"center",letterSpacing:"0.04em",padding:"10px 12px"}}/>
            </div>
          </div>
          {/* Sleep stats strip */}
          {sleepDuration && (
            <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:24}}>
              {[
                {l:"Duration", v:`${sleepDuration.h}h ${sleepDuration.m}m`, c:sleepDuration.total>=420?T.lime:T.mag},
                {l:"Bedtime",  v:l.sleepTime ? (parseInt(l.sleepTime.split(":")[0])>=12 ? `${l.sleepTime} PM` : `${l.sleepTime} AM`) : "—", c:sleepOnTime?T.lime:T.mag},
                {l:"Wake",     v:l.wakeTime  ? (parseInt(l.wakeTime.split(":")[0])>=12  ? `${l.wakeTime} PM`  : `${l.wakeTime} AM`)  : "—", c:T.cyan},
              ].map(s=>(
                <div key={s.l}>
                  <div className="eyebrow" style={{marginBottom:3}}>{s.l}</div>
                  <div style={{fontFamily:T.fM,fontSize:14,fontWeight:600,color:s.c,letterSpacing:"-0.01em"}}>{s.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Checklist by category ── */}
        {cats.map(cat => {
          const items = ROUTINES.filter(r => r.cat === cat);
          const c = catColor[cat];
          const catDone = items.filter(r => (l.routines||{})[r.id]).length;
          return (
            <div key={cat} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingLeft:2}}>
                <div className="eyebrow" style={{color:c}}>{cat}</div>
                <span style={{fontFamily:T.fM,fontSize:10,color:T.t3,letterSpacing:".05em"}}>{catDone}/{items.length}</span>
              </div>
              <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden"}}>
                {items.map((r, i) => {
                  const on = !!(l.routines||{})[r.id];
                  return (
                    <div key={r.id}>
                      <div className="press" onClick={()=>toggleRoutine(r.id)}
                        style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",cursor:"pointer",background:on?`${c}08`:"transparent",transition:"background .2s"}}>
                        <div style={{width:38,height:38,borderRadius:12,background:on?`${c}22`:"rgba(255,255,255,0.04)",border:`1px solid ${on?c+"44":"transparent"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0,transition:"all .25s",boxShadow:on?`0 0 14px ${c}44`:"none"}}>
                          {r.icon}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:500,color:on?T.t1:T.t2,transition:"color .2s",textDecoration:on?"none":"none"}}>{r.label}</div>
                          <div style={{fontFamily:T.fM,fontSize:9,color:c,letterSpacing:".12em",marginTop:2,opacity:on?1:.5}}>{r.cat.toUpperCase()}</div>
                        </div>
                        <div style={{width:26,height:26,borderRadius:13,background:on?c:"transparent",border:on?"none":`1.5px solid rgba(255,255,255,0.18)`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .25s",flexShrink:0,boxShadow:on?`0 0 12px ${c}66`:"none"}}>
                          {on && <svg width="11" height="11" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </div>
                      {i < items.length-1 && <div style={{height:1,background:"rgba(255,255,255,0.05)",marginLeft:68}}/>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── 7-day overview ── */}
        <div style={{marginTop:8}}>
          <div className="eyebrow" style={{marginBottom:12,paddingLeft:2}}>7-Day Overview</div>
          <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",padding:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:4}}>
              {days7.map(d => {
                const dr = data.logs[d]?.routines || {};
                const n  = ROUTINES.filter(r => dr[r.id]).length;
                const p  = n / totalN;
                const dn = data.startDate ? DAYS[new Date(new Date(data.startDate).getTime()+(d-1)*86400000).getDay()].slice(0,1) : "";
                const isToday = d === cd;
                const slept = data.logs[d]?.sleepTime;
                const onTime = slept && slept <= SLEEP_TARGET;
                return (
                  <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                    {/* Bar */}
                    <div style={{width:"100%",height:56,background:"rgba(255,255,255,0.04)",borderRadius:6,overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                      <div style={{width:"100%",height:`${p*100}%`,background:isToday?T.lime:"rgba(255,255,255,0.3)",borderRadius:6,boxShadow:isToday&&p>0?`0 0 8px ${T.limeG}`:"none",transition:"height .6s cubic-bezier(.2,.8,.2,1)"}}/>
                    </div>
                    {/* Sleep dot */}
                    <div style={{width:6,height:6,borderRadius:"50%",background:onTime?T.lime:slept?T.mag:"rgba(255,255,255,0.1)",boxShadow:onTime?`0 0 5px ${T.limeG}`:"none"}}/>
                    <span style={{fontFamily:T.fM,fontSize:9,color:isToday?T.lime:T.t3,fontWeight:isToday?600:400}}>{dn}</span>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginTop:12,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:T.lime}}/><span style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".08em"}}>ON TIME</span></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:T.mag}}/><span style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".08em"}}>LATE</span></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:"rgba(255,255,255,0.1)"}}/><span style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".08em"}}>NO LOG</span></div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  /* ════════ SHELL ════════ */
  const NAV = [
    {id:"home",   label:"Home"},
    {id:"today",  label:"Today"},
    {id:"activity",label:"Rings"},
    {id:"diet",   label:"Diet"},
    {id:"mood",   label:"Mood"},
    {id:"stats",  label:"Stats"},
    {id:"plan",   label:"Plan"},
    {id:"meds",     label:"Meds"},
    {id:"routines", label:"Routine"},
  ];
  const ICONS = {
    home:     <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M3 11L12 4l9 7v9a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
    today:    <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    activity: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>,
    diet:     <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="currentColor" strokeWidth="1.6"/><path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    mood:     <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="9" cy="10" r="0.8" fill="currentColor"/><circle cx="15" cy="10" r="0.8" fill="currentColor"/></svg>,
    stats:    <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M3 20l5-8 4 4 4-7 5 8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/></svg>,
    plan:     <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M9 9h6M9 13h6M9 17h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    meds:     <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M9 3h6v4H9zM7 7h10l1 14H6L7 7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 12h4M12 10v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    routines: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M9 11l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.6"/></svg>,
  };
  const av = view==="dayDetail"?"stats":view;

  return (
    <div style={{minHeight:"100vh",background:T.bg0,color:T.t1,fontFamily:T.fD,display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",position:"relative"}}>
      {/* Ambient background */}
      <div style={{position:"fixed",inset:0,zIndex:0,background:T.bg0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:"-20%",background:"radial-gradient(60% 50% at 20% 8%,oklch(0.92 0.22 130 / 0.12) 0%,transparent 60%),radial-gradient(70% 60% at 90% 100%,oklch(0.78 0.22 340 / 0.10) 0%,transparent 55%),radial-gradient(50% 40% at 50% 50%,oklch(0.85 0.18 200 / 0.08) 0%,transparent 70%)",filter:"blur(20px)",animation:"ambient-drift 24s ease-in-out infinite alternate"}}/>
        <div style={{position:"absolute",inset:0,opacity:.05,mixBlendMode:"overlay",backgroundImage:"url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")"}}/>
      </div>

      {/* Top bar */}
      <div style={{padding:"52px 22px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20,background:"rgba(5,5,7,0.85)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          <span style={{fontFamily:T.fD,fontSize:18,fontWeight:600,letterSpacing:"-0.02em",color:T.t1}}>Goz <span style={{color:T.lime}}>2.0</span></span>
          <span className="eyebrow">{PI.label} · {PI.name}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {syncStatus!=="idle"&&(
            <div style={{fontFamily:T.fM,fontSize:10,color:syncStatus==="saved"?T.lime:T.t3,letterSpacing:".05em"}}>
              {syncStatus==="saving"?<><span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",border:"1.5px solid rgba(255,255,255,0.2)",borderTopColor:T.lime,animation:"spin .7s linear infinite",marginRight:5}}/>SAVING</> : "☁ SYNCED"}
            </div>
          )}
          <div style={{display:"flex",alignItems:"baseline",gap:4,padding:"7px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:999}}>
            <span style={{fontFamily:T.fM,color:T.lime,fontSize:12,fontWeight:600,letterSpacing:".05em"}}>D{cd}</span>
            <span style={{fontFamily:T.fM,color:T.t3,fontSize:10}}>/ 120</span>
          </div>
          <button
            onClick={()=>notifPerm==='granted'?scheduleReminders():notifPerm==='default'?askNotifPermission():null}
            title={notifPerm==='granted'?"Reminders active — tap to refresh":"Enable reminders"}
            style={{background:"none",border:`1px solid ${notifPerm==='granted'?"oklch(0.92 0.22 130 / 0.35)":"rgba(255,255,255,0.08)"}`,borderRadius:999,padding:"5px 10px",color:notifPerm==='granted'?T.lime:T.t3,fontFamily:T.fM,fontSize:10,cursor:"pointer",letterSpacing:".05em"}}
          >{notifPerm==='granted'?"🔔":"🔕"}</button>
          <button onClick={()=>supabase.auth.signOut()} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:999,padding:"5px 10px",color:T.t3,fontFamily:T.fM,fontSize:10,cursor:"pointer",letterSpacing:".05em"}}>OUT</button>
        </div>
      </div>

      {/* Notification permission banner */}
      {notifBanner && notifPerm === 'default' && (
        <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:50,padding:"0 16px"}}>
          <div style={{margin:"8px 0",background:"linear-gradient(135deg,oklch(0.92 0.22 130 / 0.15),oklch(0.85 0.18 200 / 0.12))",border:"1px solid oklch(0.92 0.22 130 / 0.3)",borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
            <span style={{fontSize:22,flexShrink:0}}>🔔</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:T.fD,fontSize:13,fontWeight:600,color:T.t1,marginBottom:2}}>Enable Daily Reminders</div>
              <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,letterSpacing:".03em"}}>Medications · Routines · Sleep · Progress alerts</div>
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0}}>
              <button onClick={()=>setNotifBanner(false)} style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",borderRadius:999,padding:"6px 10px",color:T.t3,fontFamily:T.fM,fontSize:10,cursor:"pointer"}}>Later</button>
              <button onClick={askNotifPermission} style={{background:T.lime,border:0,borderRadius:999,padding:"6px 12px",color:"#000",fontFamily:T.fM,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:".05em"}}>ALLOW</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div ref={ref} style={{overflowY:"auto",flex:1,paddingBottom:100,paddingTop:16,position:"relative",zIndex:1}}>
        {view==="home"     &&vHome()}
        {view==="today"    &&vToday()}
        {view==="activity" &&vActivity()}
        {view==="diet"     &&vDiet()}
        {view==="mood"     &&vMood()}
        {view==="stats"    &&vStats()}
        {view==="dayDetail"&&vDD()}
        {view==="plan"     &&vPlan()}
        {view==="meds"     &&vMeds()}
        {view==="routines" &&vRoutines()}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:30,paddingBottom:28,paddingTop:10,background:"linear-gradient(180deg,rgba(5,5,7,0) 0%,rgba(5,5,7,0.9) 30%,rgba(5,5,7,0.98) 100%)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",justifyContent:"space-around",padding:"0 8px"}}>
          {NAV.map(item=>{
            const active=av===item.id;
            const col=active?T.lime:T.t3;
            return (
              <button key={item.id} className="press" onClick={()=>go(item.id)} style={{background:"transparent",border:0,padding:"6px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative",cursor:"pointer"}}>
                <div style={{filter:active?`drop-shadow(0 0 8px ${T.limeG})`:"none",transition:"filter .3s",color:col}}>
                  {ICONS[item.id]}
                </div>
                <span style={{fontFamily:T.fM,fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:col,fontWeight:active?600:400,transition:"color .3s"}}>{item.label}</span>
                {active&&<div style={{position:"absolute",bottom:-4,width:4,height:4,borderRadius:4,background:T.lime,boxShadow:`0 0 6px ${T.limeG}`}}/>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
