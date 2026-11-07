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
][ph];

/* ── GROCERY SUGGESTIONS ── */
const GROCERY_LIST = {
  1:[
    {cat:"🥚 Proteins",col:"oklch(0.92 0.22 130)",items:[
      {name:"Eggs (18 pack)",          qty:"1–2 packs",  est:"$5–6",   why:"Your #1 protein — 3 eggs every breakfast"},
      {name:"Canned Tuna (in water)",  qty:"8–10 cans",  est:"$8–10",  why:"Quick lunch protein — zero prep needed"},
      {name:"Chicken Breast",          qty:"1 kg",       est:"$10–12", why:"Dinner protein for 5–6 meals of the week"},
      {name:"Greek Yogurt (plain)",    qty:"4-pack",     est:"$5–6",   why:"Snack + breakfast base — high protein"},
      {name:"Canned Salmon",           qty:"3 cans",     est:"$6–7",   why:"Omega-3s + easy meal variety"},
    ]},
    {cat:"🌾 Carbs & Grains",col:"oklch(0.85 0.18 200)",items:[
      {name:"Oats (large flake)",      qty:"1 kg bag",   est:"$4",     why:"Breakfast base — fills you, slow energy"},
      {name:"Brown Rice",              qty:"2 kg bag",   est:"$4–5",   why:"Lunch carb base for the whole week"},
      {name:"Whole Wheat Bread",       qty:"1 loaf",     est:"$3–4",   why:"Toast with eggs — complex carbs only"},
      {name:"Lentils (red or green)",  qty:"500g bag",   est:"$2–3",   why:"Cheap protein + fibre — great with chicken"},
      {name:"Chickpeas (canned)",      qty:"2 cans",     est:"$2–3",   why:"Salad bulk-up + fibre"},
    ]},
    {cat:"🥦 Vegetables",col:"oklch(0.78 0.22 340)",items:[
      {name:"Frozen Broccoli",         qty:"1 kg bag",   est:"$4",     why:"Easy steamed side — every dinner"},
      {name:"Spinach (fresh or frozen)",qty:"1 bunch",   est:"$2–3",   why:"In omelettes, salads, or steamed"},
      {name:"Onions",                  qty:"3 lb bag",   est:"$3",     why:"Flavour base for every cooked meal"},
      {name:"Garlic",                  qty:"1–2 bulbs",  est:"$1–2",   why:"Anti-inflammatory, adds flavour without calories"},
      {name:"Tomatoes",               qty:"6-pack",     est:"$3–4",   why:"Salad + breakfast scrambles"},
      {name:"Cucumber",               qty:"3 pack",     est:"$2–3",   why:"Snack + salad base — hydrating, zero cal"},
    ]},
    {cat:"🍌 Fruits",col:"#FF9F0A",items:[
      {name:"Bananas",                 qty:"1 bunch (7)", est:"$2–3",  why:"Pre-workout energy + breakfast potassium"},
      {name:"Apples",                  qty:"6-pack",     est:"$4–5",   why:"Snack — fibre + natural sugar hit"},
      {name:"Lemons",                  qty:"5-pack",     est:"$2",     why:"Lemon water every morning + dressing"},
      {name:"Oranges",                 qty:"4-pack",     est:"$3–4",   why:"Vitamin C + natural sweetness"},
    ]},
    {cat:"🫙 Pantry & Fats",col:"#FFD60A",items:[
      {name:"Olive Oil (extra virgin)", qty:"500ml",     est:"$8–10",  why:"Only cooking fat — heart-healthy"},
      {name:"Black Pepper + Mixed Herbs",qty:"as needed",est:"$3–5",   why:"Season everything without extra calories"},
      {name:"Canned Diced Tomatoes",   qty:"2 cans",    est:"$2–3",   why:"Sauce base for chicken dishes"},
      {name:"Mustard (Dijon)",         qty:"1 jar",     est:"$2",     why:"Zero-cal flavour for chicken + sandwiches"},
    ]},
  ],
  2:[
    {cat:"🥚 Proteins",col:"oklch(0.92 0.22 130)",items:[
      {name:"Chicken Breast",          qty:"1.5 kg",     est:"$14–16", why:"Higher volume as workout intensity rises"},
      {name:"Canned Tuna",             qty:"8 cans",     est:"$8–10",  why:"Lunch staple — 30g protein per can"},
      {name:"Eggs (18 pack)",          qty:"1–2 packs",  est:"$5–6",   why:"Breakfast protein every day"},
      {name:"Cottage Cheese",          qty:"500g tub",   est:"$4–5",   why:"Night-time protein — slow digesting"},
      {name:"Shrimp (frozen)",         qty:"500g bag",   est:"$8–10",  why:"Lean protein variety for dinner"},
      {name:"Ground Turkey (lean)",    qty:"500g",       est:"$7–9",   why:"Bowl meals + meal prep flexibility"},
    ]},
    {cat:"🌾 Carbs & Grains",col:"oklch(0.85 0.18 200)",items:[
      {name:"Sweet Potatoes",          qty:"4–5 medium", est:"$4–5",   why:"Complex carb for post-workout recovery"},
      {name:"Quinoa",                  qty:"500g bag",   est:"$5–6",   why:"Complete protein + carb — Phase 2 upgrade"},
      {name:"Brown Rice",              qty:"2 kg",       est:"$4–5",   why:"Lunch base for the week"},
      {name:"Oats",                    qty:"1 kg",       est:"$4",     why:"Breakfast every day"},
      {name:"Whole Wheat Wraps",       qty:"pack of 8",  est:"$3–4",   why:"Chicken wraps — easy on-the-go lunch"},
    ]},
    {cat:"🥦 Vegetables",col:"oklch(0.78 0.22 340)",items:[
      {name:"Mixed Stir-Fry Veg (frozen)",qty:"1 kg",   est:"$4–5",   why:"Quick chicken stir-fry in 10 min"},
      {name:"Broccoli (fresh or frozen)",qty:"1 kg",    est:"$4",     why:"Every dinner side — high fibre"},
      {name:"Bell Peppers",            qty:"3-pack",     est:"$3–4",   why:"Stir-fry + omelette colour + vitamins"},
      {name:"Kale",                    qty:"1 bunch",    est:"$2–3",   why:"Denser nutrients than spinach"},
      {name:"Mushrooms",               qty:"227g pack",  est:"$3",     why:"Low-cal meal extender + breakfast"},
    ]},
    {cat:"🥑 Healthy Fats",col:"#FF9F0A",items:[
      {name:"Avocados",                qty:"3–4",        est:"$4–6",   why:"Post-workout fats — nutrient-dense"},
      {name:"Almonds (raw)",           qty:"200g bag",   est:"$4–5",   why:"Snack — protein + healthy fat"},
      {name:"Olive Oil",               qty:"500ml",      est:"$8–10",  why:"All cooking + salad dressing"},
      {name:"Flaxseeds",               qty:"250g bag",   est:"$3–4",   why:"Stir into yogurt — omega-3 boost"},
    ]},
    {cat:"🍌 Fruits",col:"#FFD60A",items:[
      {name:"Bananas",                qty:"1 bunch",    est:"$2–3",   why:"Pre-workout every day"},
      {name:"Berries (frozen)",       qty:"500g bag",   est:"$4–5",   why:"Antioxidants — into yogurt or oats"},
      {name:"Apples",                 qty:"6-pack",     est:"$4–5",   why:"Snack with almond butter"},
    ]},
  ],
  3:[
    {cat:"🥚 Proteins (priority)",col:"oklch(0.92 0.22 130)",items:[
      {name:"Chicken Breast",          qty:"1.5 kg",     est:"$14–16", why:"200g per meal — protein is king in Phase 3"},
      {name:"Canned Tuna (in water)",  qty:"10 cans",    est:"$10–12", why:"Lunch every day — lowest fat protein"},
      {name:"Eggs + Egg Whites",       qty:"18 eggs + carton whites",est:"$9–12",why:"High-protein low-carb breakfast"},
      {name:"Shrimp",                  qty:"500g",       est:"$8–10",  why:"Low-cal dinner protein on Definition phase"},
      {name:"Sardines (in water)",     qty:"4 tins",     est:"$5–6",   why:"Omega-3 + 22g protein per tin"},
      {name:"Protein Powder (whey)",   qty:"1 serving/day",est:"$—",  why:"Top up protein if meals fall short"},
    ]},
    {cat:"🥦 Vegetables (bulk up)",col:"oklch(0.78 0.22 340)",items:[
      {name:"Frozen Broccoli",         qty:"2 kg bags",  est:"$7–8",   why:"Eat more of this — fills you with zero carbs"},
      {name:"Spinach",                 qty:"2 bunches",  est:"$4–5",   why:"Salad base + scramble filler"},
      {name:"Asparagus",               qty:"1 bunch",    est:"$3–4",   why:"Premium veg for Phase 3 — low carb, diuretic"},
      {name:"Zucchini",               qty:"3 medium",   est:"$2–3",   why:"Rice substitute — spiralize or chop"},
      {name:"Celery",                  qty:"1 bunch",    est:"$2",     why:"Zero calorie snack crunch"},
      {name:"Cucumber",               qty:"3 pack",     est:"$2–3",   why:"Snack or salad — hydrating"},
    ]},
    {cat:"🌾 Minimal Carbs",col:"oklch(0.85 0.18 200)",items:[
      {name:"Oats (for morning only)", qty:"500g",       est:"$3",     why:"Carbs only in the morning — no dinner carbs"},
      {name:"Brown Rice (limited)",    qty:"1 kg",       est:"$3",     why:"Lunch only — skip at dinner"},
      {name:"Rice Cakes",              qty:"1 bag",      est:"$3–4",   why:"If you need a snack with crunch"},
    ]},
    {cat:"🫙 Fats + Pantry",col:"#FFD60A",items:[
      {name:"Olive Oil",               qty:"500ml",      est:"$8–10",  why:"Cooking only — measure it"},
      {name:"ACV (Apple Cider Vinegar)",qty:"1 bottle",  est:"$4–5",   why:"Salad dressing + metabolism boost"},
      {name:"Lemon + Lime",            qty:"bag of 5",   est:"$2–3",   why:"Flavour without calories"},
      {name:"Hot Sauce",               qty:"1 bottle",   est:"$2–3",   why:"Zero-cal flavour on everything"},
    ]},
  ],
  4:[
    {cat:"🥚 Proteins (max)",col:"oklch(0.92 0.22 130)",items:[
      {name:"Chicken Breast",          qty:"2 kg",       est:"$18–22", why:"200g every meal — muscle preservation"},
      {name:"Canned Tuna",             qty:"10–12 cans", est:"$12–14", why:"Daily lunch — zero fat, maximum protein"},
      {name:"Egg Whites (carton)",     qty:"2 cartons",  est:"$8–10",  why:"5 egg whites at breakfast — 20g protein, 0 fat"},
      {name:"Salmon (fresh or frozen)",qty:"500g",       est:"$9–12",  why:"2x per week for omega-3 + lean protein"},
      {name:"Shrimp",                  qty:"750g",       est:"$12–14", why:"Very lean dinner protein with veggies"},
      {name:"Cottage Cheese (low fat)",qty:"500g",       est:"$4–5",   why:"Last meal — casein protein while you sleep"},
    ]},
    {cat:"🥦 Mostly Vegetables",col:"oklch(0.78 0.22 340)",items:[
      {name:"Broccoli + Cauliflower mix",qty:"2 kg bags",est:"$7–9",  why:"80% of your plate at dinner — zero carbs"},
      {name:"Spinach (big bag)",       qty:"454g bag",   est:"$4–5",   why:"Salads + scrambles — iron and density"},
      {name:"Asparagus",               qty:"2 bunches",  est:"$5–7",   why:"Phase 4 superfood — lean and diuretic"},
      {name:"Kale",                    qty:"2 bunches",  est:"$4–5",   why:"Nutrient density for final push"},
      {name:"Cherry Tomatoes",         qty:"1 pint",     est:"$3–4",   why:"Sweetness hit without sugar penalty"},
      {name:"Green Beans",             qty:"500g",       est:"$3",     why:"Volume eating — fills plate with minimal cals"},
    ]},
    {cat:"🌾 Carbs (strategic only)",col:"oklch(0.85 0.18 200)",items:[
      {name:"Oats",                    qty:"500g",       est:"$3",     why:"Morning only — before your workout"},
      {name:"Sweet Potato",            qty:"2 medium",   est:"$2–3",   why:"Post-workout only — replenish glycogen"},
    ]},
    {cat:"🫙 Clean Pantry",col:"#FFD60A",items:[
      {name:"Olive Oil",               qty:"250ml (small)", est:"$5",  why:"Use sparingly — 1 tsp per meal max"},
      {name:"ACV + Lemon",             qty:"bottles",    est:"$6–7",   why:"Dressings without calories"},
      {name:"Green Tea (unsweetened)", qty:"box of 20",  est:"$3–4",   why:"Metabolism + 0 calories — replace evening snacks"},
      {name:"Canned Diced Tomatoes",   qty:"2 cans",     est:"$2–3",   why:"Sauce base — zero fat cooking"},
    ]},
  ],
};
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
const genToken = () => 'tok_' + Array.from(crypto.getRandomValues(new Uint8Array(18))).map(b=>b.toString(16).padStart(2,'0')).join('');
const load = () => { try{ const r=localStorage.getItem(SK); if(r){ const d=JSON.parse(r); if(!d.macroTargets) d.macroTargets={p:150,c:180,f:55}; if(!d.customHabits) d.customHabits=[]; if(!d.personalRecords) d.personalRecords=[]; if(!d.groceryLogs) d.groceryLogs=[]; if(!d.graceDays) d.graceDays=[]; if(!d.targetDays) d.targetDays=120; if(!d.syncToken) d.syncToken=genToken(); return d; } }catch{} return {startDate:null,logs:{},startWeight:80,goalWeight:68,height:175,name:"",dailyCalGoal:1800,targetDays:120,macroTargets:{p:150,c:180,f:55},meds:[],progressPhotos:{},graceDays:[],groceryLogs:[],customHabits:[],personalRecords:[],fastStart:null,onboardingDone:false,syncToken:genToken()}; };
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

  // Feature 1: Milestone celebrations
  const [milestone, setMilestone] = useState(null);

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
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [editFoodName,  setEditFoodName]  = useState("");
  const [editFoodCal,   setEditFoodCal]   = useState("");
  const [editFoodP,     setEditFoodP]     = useState("");
  const [confirmResetLog, setConfirmResetLog] = useState(false);

  // Feature 2: Copy yesterday state
  const [copyYestConfirm, setCopyYestConfirm] = useState(false);

  // Feature 7: Nap logging state
  const [showNapForm, setShowNapForm] = useState(false);
  const [napTime, setNapTime] = useState("");
  const [napDur, setNapDur] = useState("");

  // Feature 9: Activity log state
  const [showActForm, setShowActForm] = useState(false);
  const [actName, setActName] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actDur, setActDur] = useState("");

  // Grocery log state
  const [grocStore,    setGrocStore]    = useState("");
  const [grocItemName, setGrocItemName] = useState("");
  const [grocQty,      setGrocQty]      = useState("");
  const [grocPrice,    setGrocPrice]    = useState("");
  const [showGrocForm, setShowGrocForm] = useState(false);

  // Suggestion view sub-tab
  const [suggestView, setSuggestView] = useState("daily");
  // Grocery view sub-tab
  const [grocView, setGrocView] = useState("suggested");
  // Grocery checked items (for shopping list)
  const [grocChecked, setGrocChecked] = useState(new Set());
  // Goal reached celebration
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const [goalCelebrationDismissed, setGoalCelebrationDismissed] = useState(false);

  // ── Consolidated nav sub-tabs ──
  const [logSubTab,    setLogSubTab]    = useState("habits");   // habits | routine | meds
  const [healthSubTab, setHealthSubTab] = useState("rings");    // rings | body | heart | sleep
  const [moreSubTab,   setMoreSubTab]   = useState("stats");    // stats | mood | plan

  // Heart rate logging state
  const [hrValue, setHrValue] = useState("");

  // ── New polish features ──
  const [isOnline, setIsOnline]           = useState(navigator.onLine);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  // Onboarding wizard
  const [onboardStep, setOnboardStep]     = useState(0);
  const [obName,  setObName]              = useState("");
  const [obGoalW, setObGoalW]             = useState("68");
  const [obHeight,setObHeight]            = useState("175");
  const [obCalG,       setObCalG]          = useState("1800");
  const [obTargetDays, setObTargetDays]   = useState("120");
  const [obProtG, setObProtG]             = useState("150");
  const [obCarbG, setObCarbG]             = useState("180");
  const [obFatG,  setObFatG]              = useState("55");
  const [obAge,        setObAge]          = useState("");
  const [obGender,     setObGender]       = useState("");
  const [obActivity,   setObActivity]     = useState("");
  const [obDiet,       setObDiet]         = useState("");
  // Intermittent fasting
  const [fastNow, setFastNow]             = useState(Date.now());
  // Custom habits
  const [showCHForm,  setShowCHForm]      = useState(false);
  const [chName,  setChName]              = useState("");
  const [chIcon,  setChIcon]              = useState("⭐");
  // Personal records
  const [showPRForm,  setShowPRForm]      = useState(false);
  const [prName,  setPRName]              = useState("");
  const [prVal,   setPRVal]               = useState("");
  const [prUnit,  setPRUnit]              = useState("reps");
  // Macro / calorie goal editing
  const [showGoalEdit, setShowGoalEdit]   = useState(false);
  const [goalCalInput, setGoalCalInput]   = useState("");
  const [goalPInput,   setGoalPInput]     = useState("");
  const [goalCInput,   setGoalCInput]     = useState("");
  const [goalFInput,   setGoalFInput]     = useState("");

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
      if(serverData){
        // Existing user — migrate any missing fields
        if(!serverData.macroTargets)    serverData.macroTargets    = {p:150,c:180,f:55};
        if(!serverData.customHabits)    serverData.customHabits    = [];
        if(!serverData.personalRecords) serverData.personalRecords = [];
        if(!serverData.groceryLogs)     serverData.groceryLogs     = [];
        if(!serverData.graceDays)       serverData.graceDays       = [];
        if(!serverData.targetDays)      serverData.targetDays      = 120;
        // Generate syncToken if missing and immediately save it back to Supabase
        if(!serverData.syncToken){
          serverData.syncToken = genToken();
          saveToSupabase(user.id, serverData);
        }
        setData(serverData);
      } else {
        // Brand-new user — wipe any stale localStorage and force onboarding
        const fresh = {
          startDate:null, logs:{}, startWeight:80, goalWeight:68, height:175,
          name:"", dailyCalGoal:1800, targetDays:120,
          macroTargets:{p:150,c:180,f:55}, meds:[], progressPhotos:{},
          graceDays:[], groceryLogs:[], customHabits:[], personalRecords:[],
          fastStart:null, onboardingDone:false, syncToken:genToken(),
        };
        setData(fresh);
        save(fresh);
      }
      setSynced(true);
    }).catch(()=>setSynced(true));
  },[user]);

  // Welcome-back splash for returning users
  useEffect(()=>{
    if(synced && data.startDate){
      setShowWelcomeBack(true);
      const t = setTimeout(()=>setShowWelcomeBack(false), 2400);
      return ()=>clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[synced]);

  // Online / offline detection
  useEffect(()=>{
    const on=()=>setIsOnline(true), off=()=>setIsOnline(false);
    window.addEventListener("online",on); window.addEventListener("offline",off);
    return ()=>{ window.removeEventListener("online",on); window.removeEventListener("offline",off); };
  },[]);

  // Goal reached detection — check current logged weight vs goal
  useEffect(()=>{
    if(!synced || !data.startDate || goalCelebrationDismissed) return;
    const targetW = data.goalWeight || 68;
    let currW = null;
    for(let d=1; d<=cdFn(); d++) if(data.logs[d]?.weight) currW = data.logs[d].weight;
    if(currW !== null && currW <= targetW) setShowGoalCelebration(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[data.logs, synced, goalCelebrationDismissed]);

  // Fasting live clock (ticks every 30s when fast is active)
  useEffect(()=>{
    if(!data.fastStart) return;
    const id=setInterval(()=>setFastNow(Date.now()),30000);
    return ()=>clearInterval(id);
  },[data.fastStart]);

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

  // Feature 1: Milestone detection
  useEffect(() => {
    if (!data.startDate) return;
    const cdV = cdFn();
    const milestones = [30, 60, 90, 120];
    if (milestones.includes(cdV) && !data.logs[cdV]?.milestoneShown) {
      setMilestone(cdV);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.startDate, data.logs]);

  const go = v => { setView(v); setAk(k=>k+1); if(ref.current) ref.current.scrollTop=0; };
  const upd = useCallback((day,field,val)=>{
    setData(d=>({...d,logs:{...d.logs,[day]:{...(d.logs[day]||{}),[field]:val}}}));
  },[]);
  const lg = d => data.logs[d]||{};
  const cdFn = () => {
    if(!data.startDate) return 1;
    const td = data.targetDays || 120;
    return Math.max(1,Math.min(td,Math.floor((Date.now()-new Date(data.startDate))/86400000)+1));
  };

  const cd = cdFn();
  const ph = getPhaseForDay(cd);
  const PI = PHASES[ph-1];
  const pc = PI.color;
  const dow = data.startDate ? DAYS[new Date(new Date(data.startDate).getTime()+(cd-1)*86400000).getDay()] : "Monday";

  const str = f => { let s=0; for(let d=cd;d>=1;d--){ const isGrace=(data.graceDays||[]).includes(d); if(data.logs[d]?.[f]||isGrace) s++; else break; } return s; };
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

  /* ── SUPABASE SYNC LOADING (blocks stale localStorage from showing) ── */
  if(user && !synced) return (
    <div style={{minHeight:"100vh",background:T.bg0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.fD}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,oklch(0.92 0.22 130),oklch(0.85 0.18 200))",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:`0 0 24px oklch(0.92 0.22 130 / 0.4)`}}>💪</div>
        <div className="mono" style={{color:T.t3,fontSize:12,letterSpacing:".1em"}}>LOADING YOUR PROFILE…</div>
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
    const isLogin = authMode === "login";
    return (
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:T.fD,position:"relative",overflow:"hidden"}}>

        {/* Full-screen photo background */}
        <div style={{position:"fixed",inset:0,zIndex:0}}>
          <img src="/bg.jpg" alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 55%"}}/>
          {/* very light overlay — just enough contrast for text, lets photo breathe */}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0.75) 100%)"}}/>
          {/* grain */}
          <div style={{position:"absolute",inset:0,opacity:.035,mixBlendMode:"overlay",backgroundImage:"url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")"}}/>
        </div>

        {/* Quote — vertically centred, above the bottom card */}
        <div className="scaleIn" style={{position:"absolute",top:0,left:0,right:0,bottom:320,zIndex:1,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",padding:"0 28px"}}>
          <div style={{textAlign:"center"}}>
            {isLogin ? (<>
              {/* Line 1 — bold, lime */}
              <div style={{fontFamily:T.fD,fontWeight:800,fontSize:32,lineHeight:1.15,color:T.lime,letterSpacing:"-0.02em",textShadow:`0 0 24px ${T.limeG},0 2px 20px rgba(0,0,0,0.9)`}}>
                1% better today.
              </div>
              {/* Line 2 — italic serif, white */}
              <div style={{fontFamily:T.fS,fontStyle:"italic",fontWeight:400,fontSize:30,lineHeight:1.15,color:"rgba(255,255,255,0.92)",letterSpacing:"-0.01em",textShadow:"0 2px 20px rgba(0,0,0,0.9)",margin:"2px 0"}}>
                37× better this year.
              </div>
              {/* Line 3 — bright white, quotation marks, bold */}
              <div style={{fontFamily:T.fD,fontWeight:700,fontSize:28,lineHeight:1.15,color:"#ffffff",letterSpacing:"-0.02em",textShadow:"0 2px 20px rgba(0,0,0,0.95)"}}>
                "That's the deal."
              </div>
              <div className="mono" style={{fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:".18em",marginTop:12,textShadow:"0 1px 8px rgba(0,0,0,0.9)"}}>— THE ONLY MATH THAT MATTERS</div>
            </>) : (<>
              <div style={{fontFamily:T.fD,fontWeight:800,fontSize:32,lineHeight:1.15,color:T.lime,letterSpacing:"-0.02em",textShadow:`0 0 24px ${T.limeG},0 2px 20px rgba(0,0,0,0.9)`}}>
                120 days.
              </div>
              <div style={{fontFamily:T.fS,fontStyle:"italic",fontWeight:400,fontSize:30,lineHeight:1.15,color:"rgba(255,255,255,0.92)",textShadow:"0 2px 20px rgba(0,0,0,0.9)",margin:"2px 0"}}>
                One mission.
              </div>
              <div style={{fontFamily:T.fD,fontWeight:700,fontSize:28,lineHeight:1.15,color:"#ffffff",letterSpacing:"-0.02em",textShadow:"0 2px 20px rgba(0,0,0,0.95)"}}>
                "Begin now."
              </div>
              <div className="mono" style={{fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:".18em",marginTop:12,textShadow:"0 1px 8px rgba(0,0,0,0.9)"}}>— YOUR TRANSFORMATION STARTS NOW</div>
            </>)}
          </div>
        </div>

        {/* Bottom sheet — fixed to bottom, compact */}
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:10,padding:"0 16px 36px"}}>
          <div style={{background:"rgba(5,5,7,0.52)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:26,padding:"18px 18px 16px",backdropFilter:"blur(48px)",WebkitBackdropFilter:"blur(48px)",boxShadow:"0 -2px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)"}}>

            {/* Icon + title row */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <svg width="38" height="38" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0,filter:"drop-shadow(0 0 10px oklch(0.92 0.22 130 / 0.5))"}}>
                <defs>
                  <radialGradient id="lbg" cx="40%" cy="22%" r="80%"><stop offset="0%" stopColor="#111116"/><stop offset="100%" stopColor="#050507"/></radialGradient>
                  <filter id="lglow"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  <filter id="lglowG"><feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                <rect width="512" height="512" fill="url(#lbg)" rx="110"/>
                <circle cx="256" cy="256" r="228" fill="none" stroke="#cefc00" strokeWidth="16" opacity="0.07"/>
                <circle cx="256" cy="256" r="228" fill="none" stroke="#cefc00" strokeWidth="16" strokeDasharray="1175 1433" strokeLinecap="round" transform="rotate(-90 256 256)" filter="url(#lglow)"/>
                <circle cx="256" cy="256" r="202" fill="none" stroke="#00d2ff" strokeWidth="16" opacity="0.07"/>
                <circle cx="256" cy="256" r="202" fill="none" stroke="#00d2ff" strokeWidth="16" strokeDasharray="825 1269" strokeLinecap="round" transform="rotate(-90 256 256)" filter="url(#lglow)" opacity="0.85"/>
                <circle cx="256" cy="256" r="176" fill="none" stroke="#ff50c8" strokeWidth="16" opacity="0.07"/>
                <circle cx="256" cy="256" r="176" fill="none" stroke="#ff50c8" strokeWidth="16" strokeDasharray="497 1106" strokeLinecap="round" transform="rotate(-90 256 256)" filter="url(#lglow)" opacity="0.75"/>
                <text x="256" y="318" fontFamily="'Space Grotesk',sans-serif" fontSize="252" fontWeight="700" fill="#cefc00" textAnchor="middle" filter="url(#lglowG)">G</text>
                <text x="256" y="406" fontFamily="'JetBrains Mono',monospace" fontSize="68" fontWeight="600" fill="#cefc00" textAnchor="middle" letterSpacing="4" opacity="0.75" filter="url(#lglow)">2.0</text>
              </svg>
              <div>
                <div style={{fontFamily:T.fD,fontSize:17,fontWeight:700,color:"rgba(255,255,255,0.95)",letterSpacing:"-0.02em",lineHeight:1}}>Goz <span style={{color:T.lime}}>2.0</span></div>
                <div className="mono" style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:".12em",marginTop:3}}>{isLogin?"WELCOME BACK":"BEGIN YOUR JOURNEY"}</div>
              </div>
              {/* Tab pills */}
              <div style={{marginLeft:"auto",display:"flex",background:"rgba(255,255,255,0.07)",borderRadius:20,padding:2,gap:2}}>
                {["login","signup"].map(m=>(
                  <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");}}
                    style={{padding:"5px 12px",borderRadius:18,border:0,cursor:"pointer",fontFamily:T.fM,fontSize:10,fontWeight:600,letterSpacing:".06em",transition:"all .2s",
                      background: authMode===m ? T.lime : "transparent",
                      color: authMode===m ? "#000" : "rgba(255,255,255,0.35)",
                    }}>
                    {m==="login"?"IN":"UP"}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:9}}>
              <input type="email" placeholder="Email address" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required
                style={{...IS,fontSize:14,padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)"}}/>
              <input type="password" placeholder="Password" value={authPass} onChange={e=>setAuthPass(e.target.value)} required
                style={{...IS,fontSize:14,padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)"}}/>

              {authErr && (
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:"oklch(0.78 0.22 340 / 0.12)",border:"1px solid oklch(0.78 0.22 340 / 0.3)",borderRadius:10}}>
                  <span style={{fontSize:12}}>⚠️</span>
                  <span className="mono" style={{fontSize:10,color:"oklch(0.78 0.22 340)"}}>{authErr}</span>
                </div>
              )}

              <button type="submit" disabled={authBusy}
                style={{padding:"13px 0",borderRadius:14,background:authBusy?"rgba(206,252,0,0.45)":T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:13,fontWeight:700,cursor:authBusy?"not-allowed":"pointer",letterSpacing:".1em",boxShadow:authBusy?"none":`0 0 24px ${T.limeG}`,transition:"all .2s",marginTop:2}}>
                {authBusy?(
                  <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                    <span style={{width:11,height:11,borderRadius:"50%",border:"2px solid rgba(0,0,0,0.25)",borderTopColor:"#000",display:"inline-block",animation:"spin .7s linear infinite"}}/>LOADING…
                  </span>
                ):isLogin?"SIGN IN →":"CREATE ACCOUNT →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── WELCOME BACK SPLASH (returning users) ── */
  if(showWelcomeBack && data.startDate){
    const firstName = data.name ? data.name.split(" ")[0] : null;
    const wLostSplash = Math.max(0,(data.startWeight||80)-latW);
    return (
      <div style={{minHeight:"100vh",background:T.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:T.fD,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(60% 50% at 50% 40%,oklch(0.92 0.22 130 / 0.15) 0%,transparent 65%)",pointerEvents:"none"}}/>
        <div className="scaleIn" style={{textAlign:"center",padding:"0 32px",position:"relative",zIndex:1}}>
          <div style={{fontSize:56,marginBottom:18}}>👋</div>
          <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:44,lineHeight:1.1,color:T.t1,letterSpacing:"-0.02em",marginBottom:8}}>
            {firstName ? <>Welcome back,<br/><span style={{color:T.lime}}>{firstName}.</span></> : <>Welcome back.</>}
          </div>
          <div className="mono" style={{fontSize:11,color:T.t3,letterSpacing:".12em",marginTop:14}}>DAY {cd} OF 120 · {PI.name.toUpperCase()}</div>
          {wLostSplash > 0.1 && (
            <div style={{marginTop:22,padding:"12px 24px",background:"oklch(0.92 0.22 130 / 0.10)",border:"1px solid oklch(0.92 0.22 130 / 0.25)",borderRadius:999,display:"inline-block"}}>
              <span style={{fontFamily:T.fM,fontSize:13,color:T.lime,fontWeight:600}}>↓ {wLostSplash.toFixed(1)} kg lost so far</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── ONBOARDING (new users) ── */
  if(!data.startDate){
    const step = onboardStep;

    // ── TDEE via Mifflin-St Jeor ──
    const curW      = parseFloat(tw)         || 80;
    const goalW     = parseFloat(obGoalW)    || 68;
    const ageN      = parseInt(obAge)        || 25;
    const heightN   = parseFloat(obHeight)   || 175;
    const targetDays = parseInt(obTargetDays) || 120;
    const kgToLose  = Math.max(0, curW - goalW);
    const bmr = obGender === "female"
      ? 10*curW + 6.25*heightN - 5*ageN - 161
      : 10*curW + 6.25*heightN - 5*ageN + 5;
    const actMult = {sedentary:1.2,light:1.375,moderate:1.55,active:1.725}[obActivity] || 1.375;
    const tdee = Math.round(bmr * actMult);
    const totalCals = kgToLose * 7700;
    const dailyDeficit = targetDays > 0 ? Math.round(totalCals / targetDays) : 0;
    const suggestedCalGoal = Math.max(1300, tdee - dailyDeficit);
    const weeklyLoss = (dailyDeficit / 7700 * 7).toFixed(2);
    const feasible      = dailyDeficit < 400 ? "easy" : dailyDeficit < 600 ? "achievable" : dailyDeficit < 850 ? "aggressive" : "extreme";
    const feasibleColor = feasible==="easy"?T.lime:feasible==="achievable"?T.cyan:feasible==="aggressive"?"#FF9F0A":T.mag;
    const feasibleIcon  = {easy:"✅",achievable:"💪",aggressive:"⚠️",extreme:"🔥"}[feasible];
    const feasibleText  = {
      easy:`Solid. A ${dailyDeficit} kcal daily deficit is very sustainable — you'll lose fat and keep muscle.`,
      achievable:`Doable. A ${dailyDeficit} kcal deficit needs consistency but is very realistic.`,
      aggressive:`Ambitious. ${dailyDeficit} kcal deficit requires tight discipline — but it's possible.`,
      extreme:`Very aggressive. Consider extending your timeline for a healthier, lasting result.`,
    }[feasible];
    const suggestedDays = kgToLose > 0 ? Math.round(kgToLose * 7700 / 500) : 120;

    // ── Macro splits by diet style ──
    const dietSplits = {balanced:{p:0.30,c:0.40,f:0.30},highprotein:{p:0.40,c:0.30,f:0.30},keto:{p:0.30,c:0.10,f:0.60},mediterranean:{p:0.25,c:0.45,f:0.30}};
    const split  = dietSplits[obDiet] || dietSplits.balanced;
    const macroP = Math.round(suggestedCalGoal * split.p / 4);
    const macroC = Math.round(suggestedCalGoal * split.c / 4);
    const macroF = Math.round(suggestedCalGoal * split.f / 9);

    const TOTAL_STEPS = 6;
    const BIG_BTN = (label, onClick, disabled=false) => (
      <button className="press" disabled={disabled} onClick={onClick}
        style={{width:"100%",padding:17,borderRadius:16,background:disabled?"rgba(255,255,255,0.07)":T.lime,border:"none",color:disabled?T.t3:"#000",fontFamily:T.fM,fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",boxShadow:disabled?"none":`0 8px 32px ${T.limeG}`,letterSpacing:".09em",transition:"all .2s"}}>
        {label}
      </button>
    );
    const BACK_BTN = (onClick) => (
      <button className="press" onClick={onClick}
        style={{padding:"14px 20px",borderRadius:16,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:12,fontWeight:600,cursor:"pointer"}}>
        ← BACK
      </button>
    );

    return (
      <div style={{minHeight:"100vh",background:T.bg0,fontFamily:T.fD,position:"relative",overflow:"hidden"}}>
        <div style={{position:"fixed",inset:0,background:"radial-gradient(55% 40% at 50% 10%,oklch(0.92 0.22 130 / 0.10) 0%,transparent 65%)",pointerEvents:"none"}}/>

        {/* Progress bar */}
        {step > 0 && step < TOTAL_STEPS && (
          <div style={{position:"fixed",top:0,left:0,right:0,height:3,zIndex:50}}>
            <div style={{height:"100%",width:`${(step/TOTAL_STEPS)*100}%`,background:T.lime,transition:"width .5s cubic-bezier(.2,.8,.2,1)",boxShadow:`0 0 12px ${T.limeG}`}}/>
          </div>
        )}

        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 28px 48px",maxWidth:420,margin:"0 auto",position:"relative",zIndex:1}}>

          {/* ═══ STEP 0: Name ═══ */}
          {step===0 && (
            <div className="fadeUp">
              <div style={{fontSize:48,marginBottom:20,textAlign:"center"}}>👋</div>
              <div style={{fontFamily:T.fD,fontSize:34,fontWeight:700,color:T.t1,marginBottom:6,letterSpacing:"-0.03em",textAlign:"center",lineHeight:1.15}}>First things first.</div>
              <div style={{fontSize:15,color:T.t2,marginBottom:36,textAlign:"center",lineHeight:1.6}}>What should we call you?</div>
              <input autoFocus value={obName} onChange={e=>setObName(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&obName.trim())setOnboardStep(1);}}
                placeholder="Your first name…"
                style={{...IS,fontSize:22,padding:"16px 18px",borderRadius:16,textAlign:"center",letterSpacing:"0.01em",marginBottom:16}}/>
              {BIG_BTN(obName.trim()?`LET'S GO, ${obName.split(" ")[0].toUpperCase()} →`:"CONTINUE →",()=>setOnboardStep(1))}
              <div style={{textAlign:"center",marginTop:14}}>
                <button onClick={()=>setOnboardStep(1)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:T.fM,fontSize:11,color:T.t3,letterSpacing:".05em"}}>skip for now</button>
              </div>
            </div>
          )}

          {/* ═══ STEP 1: Age + Gender ═══ */}
          {step===1 && (
            <div className="fadeUp">
              <div className="mono" style={{fontSize:10,color:T.t3,letterSpacing:".18em",marginBottom:10}}>STEP 1 OF {TOTAL_STEPS}</div>
              <div style={{fontFamily:T.fD,fontSize:30,fontWeight:700,color:T.t1,marginBottom:4,letterSpacing:"-0.02em"}}>About you</div>
              <div style={{fontSize:14,color:T.t2,marginBottom:28,lineHeight:1.5}}>This lets us calculate your real calorie target — not a generic guess.</div>

              <div style={{marginBottom:20}}>
                <div className="mono" style={{fontSize:10,color:T.t3,letterSpacing:".12em",marginBottom:10}}>BIOLOGICAL SEX</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["male","♂ Male"],["female","♀ Female"]].map(([v,l])=>{
                    const sel=obGender===v;
                    return (
                      <button key={v} className="press" onClick={()=>setObGender(v)}
                        style={{padding:"20px 8px",borderRadius:16,border:`1.5px solid ${sel?T.lime:"rgba(255,255,255,0.10)"}`,background:sel?T.limeS:"rgba(255,255,255,0.03)",color:sel?T.lime:T.t2,fontFamily:T.fM,fontSize:14,fontWeight:sel?700:400,cursor:"pointer",transition:"all .2s",textAlign:"center"}}>
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{marginBottom:28}}>
                <div className="mono" style={{fontSize:10,color:T.t3,letterSpacing:".12em",marginBottom:10}}>YOUR AGE</div>
                <div style={{position:"relative"}}>
                  <input type="number" value={obAge} onChange={e=>setObAge(e.target.value)} placeholder="e.g. 28"
                    style={{...IS,fontSize:22,padding:"14px 52px 14px 16px",borderRadius:14,textAlign:"center"}}/>
                  <span style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontFamily:T.fM,fontSize:12,color:T.t3}}>yrs</span>
                </div>
              </div>

              <div style={{display:"flex",gap:10}}>
                {BACK_BTN(()=>setOnboardStep(0))}
                <div style={{flex:1}}>{BIG_BTN("CONTINUE →",()=>setOnboardStep(2),!obGender||!obAge)}</div>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Body Stats ═══ */}
          {step===2 && (
            <div className="fadeUp">
              <div className="mono" style={{fontSize:10,color:T.t3,letterSpacing:".18em",marginBottom:10}}>STEP 2 OF {TOTAL_STEPS}</div>
              <div style={{fontFamily:T.fD,fontSize:30,fontWeight:700,color:T.t1,marginBottom:4,letterSpacing:"-0.02em"}}>Your mission</div>
              <div style={{fontSize:14,color:T.t2,marginBottom:28,lineHeight:1.5}}>Enter your numbers and we'll calculate exactly what it takes.</div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:6}}>CURRENT WEIGHT</div>
                  <div style={{position:"relative"}}>
                    <input type="number" value={tw} onChange={e=>setTw(e.target.value)} placeholder="80"
                      style={{...IS,fontSize:18,padding:"14px 40px 14px 16px",borderRadius:14}}/>
                    <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontFamily:T.fM,fontSize:12,color:T.t3}}>kg</span>
                  </div>
                </div>
                <div>
                  <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:6}}>GOAL WEIGHT</div>
                  <div style={{position:"relative"}}>
                    <input type="number" value={obGoalW} onChange={e=>setObGoalW(e.target.value)} placeholder="68"
                      style={{...IS,fontSize:18,padding:"14px 40px 14px 16px",borderRadius:14}}/>
                    <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontFamily:T.fM,fontSize:12,color:T.t3}}>kg</span>
                  </div>
                </div>
              </div>

              <div style={{marginBottom:12}}>
                <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:6}}>HEIGHT</div>
                <div style={{position:"relative"}}>
                  <input type="number" value={obHeight} onChange={e=>setObHeight(e.target.value)} placeholder="175"
                    style={{...IS,fontSize:18,padding:"14px 52px 14px 16px",borderRadius:14}}/>
                  <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontFamily:T.fM,fontSize:12,color:T.t3}}>cm</span>
                </div>
              </div>

              <div style={{marginBottom:28}}>
                <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:8}}>TARGET TIMELINE</div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  {[60,90,120,150,180].map(d=>{
                    const sel=obTargetDays===String(d);
                    return (
                      <button key={d} className="press" onClick={()=>setObTargetDays(String(d))}
                        style={{flex:1,padding:"14px 2px",borderRadius:14,border:`1.5px solid ${sel?T.lime:"rgba(255,255,255,0.10)"}`,background:sel?T.limeS:"rgba(255,255,255,0.03)",color:sel?T.lime:T.t2,fontFamily:T.fM,fontSize:12,fontWeight:sel?700:400,cursor:"pointer",transition:"all .2s"}}>
                        {d}d
                      </button>
                    );
                  })}
                </div>
                <input type="number" value={obTargetDays} onChange={e=>setObTargetDays(e.target.value)} placeholder="or type custom days"
                  style={{...IS,fontSize:14,padding:"10px 14px",borderRadius:12}}/>
              </div>

              <div style={{display:"flex",gap:10}}>
                {BACK_BTN(()=>setOnboardStep(1))}
                <div style={{flex:1}}>{BIG_BTN("CONTINUE →",()=>setOnboardStep(3),!tw||!obGoalW)}</div>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Activity Level ═══ */}
          {step===3 && (
            <div className="fadeUp">
              <div className="mono" style={{fontSize:10,color:T.t3,letterSpacing:".18em",marginBottom:10}}>STEP 3 OF {TOTAL_STEPS}</div>
              <div style={{fontFamily:T.fD,fontSize:30,fontWeight:700,color:T.t1,marginBottom:4,letterSpacing:"-0.02em"}}>How active are you?</div>
              <div style={{fontSize:14,color:T.t2,marginBottom:28,lineHeight:1.5}}>Your typical daily movement — outside of planned workouts.</div>

              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:32}}>
                {[
                  {v:"sedentary", icon:"💺",label:"Sedentary",        sub:"Desk job, little movement"},
                  {v:"light",     icon:"🚶",label:"Lightly Active",   sub:"Light walks, on feet sometimes"},
                  {v:"moderate",  icon:"🏃",label:"Moderately Active",sub:"Regular exercise 3–5x/week"},
                  {v:"active",    icon:"🔥",label:"Very Active",      sub:"Daily hard training or physical job"},
                ].map(({v,icon,label,sub})=>{
                  const sel=obActivity===v;
                  return (
                    <button key={v} className="press" onClick={()=>setObActivity(v)}
                      style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:16,border:`1.5px solid ${sel?T.lime:"rgba(255,255,255,0.08)"}`,background:sel?T.limeS:"rgba(255,255,255,0.02)",cursor:"pointer",transition:"all .2s",textAlign:"left"}}>
                      <span style={{fontSize:26,flexShrink:0}}>{icon}</span>
                      <div>
                        <div style={{fontFamily:T.fM,fontSize:14,fontWeight:700,color:sel?T.lime:T.t1}}>{label}</div>
                        <div style={{fontFamily:T.fM,fontSize:11,color:T.t3,marginTop:2}}>{sub}</div>
                      </div>
                      {sel&&<div style={{marginLeft:"auto",color:T.lime,fontSize:18}}>✓</div>}
                    </button>
                  );
                })}
              </div>

              <div style={{display:"flex",gap:10}}>
                {BACK_BTN(()=>setOnboardStep(2))}
                <div style={{flex:1}}>{BIG_BTN("CONTINUE →",()=>setOnboardStep(4),!obActivity)}</div>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Diet Style ═══ */}
          {step===4 && (
            <div className="fadeUp">
              <div className="mono" style={{fontSize:10,color:T.t3,letterSpacing:".18em",marginBottom:10}}>STEP 4 OF {TOTAL_STEPS}</div>
              <div style={{fontFamily:T.fD,fontSize:30,fontWeight:700,color:T.t1,marginBottom:4,letterSpacing:"-0.02em"}}>Your diet style</div>
              <div style={{fontSize:14,color:T.t2,marginBottom:28,lineHeight:1.5}}>We'll set your macro targets automatically based on your choice.</div>

              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:32}}>
                {[
                  {v:"balanced",      icon:"⚖️", label:"Balanced",        sub:"30% protein · 40% carbs · 30% fat", tag:"Most popular"},
                  {v:"highprotein",   icon:"💪", label:"High Protein",    sub:"40% protein · 30% carbs · 30% fat", tag:"Best for muscle"},
                  {v:"keto",          icon:"🥑", label:"Keto / Low Carb", sub:"30% protein · 10% carbs · 60% fat", tag:"Rapid fat loss"},
                  {v:"mediterranean", icon:"🫒", label:"Mediterranean",   sub:"25% protein · 45% carbs · 30% fat", tag:"Heart healthy"},
                ].map(({v,icon,label,sub,tag})=>{
                  const sel=obDiet===v;
                  return (
                    <button key={v} className="press" onClick={()=>setObDiet(v)}
                      style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:16,border:`1.5px solid ${sel?T.lime:"rgba(255,255,255,0.08)"}`,background:sel?T.limeS:"rgba(255,255,255,0.02)",cursor:"pointer",transition:"all .2s",textAlign:"left"}}>
                      <span style={{fontSize:26,flexShrink:0}}>{icon}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{fontFamily:T.fM,fontSize:14,fontWeight:700,color:sel?T.lime:T.t1}}>{label}</div>
                          <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,background:"rgba(255,255,255,0.06)",padding:"2px 7px",borderRadius:99,letterSpacing:".05em"}}>{tag}</div>
                        </div>
                        <div style={{fontFamily:T.fM,fontSize:11,color:T.t3,marginTop:2}}>{sub}</div>
                      </div>
                      {sel&&<div style={{color:T.lime,fontSize:18}}>✓</div>}
                    </button>
                  );
                })}
              </div>

              <div style={{display:"flex",gap:10}}>
                {BACK_BTN(()=>setOnboardStep(3))}
                <div style={{flex:1}}>{BIG_BTN("SEE MY PLAN →",()=>setOnboardStep(5),!obDiet)}</div>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Plan Calculator ═══ */}
          {step===5 && (
            <div className="fadeUp">
              <div className="mono" style={{fontSize:10,color:T.t3,letterSpacing:".18em",marginBottom:10}}>YOUR PERSONALISED PLAN</div>
              <div style={{fontFamily:T.fD,fontSize:30,fontWeight:700,color:T.t1,marginBottom:20,letterSpacing:"-0.02em"}}>Here's what it takes.</div>

              {/* TDEE row */}
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:3}}>YOUR DAILY BURN (TDEE)</div>
                  <div style={{fontFamily:T.fM,fontSize:22,color:T.cyan,fontWeight:700}}>{tdee} <span style={{fontSize:12,color:T.t3}}>kcal/day</span></div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:3}}>ACTIVITY</div>
                  <div style={{fontFamily:T.fM,fontSize:12,color:T.t2,textTransform:"capitalize"}}>{obActivity}</div>
                </div>
              </div>

              {/* Hero stats */}
              <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",borderRadius:20,border:"1px solid rgba(255,255,255,0.08)",padding:"22px 20px",marginBottom:12,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:`radial-gradient(circle,${feasibleColor}22,transparent 70%)`,filter:"blur(16px)"}}/>
                <div style={{position:"relative"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                    <div>
                      <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".15em",marginBottom:4}}>TO LOSE</div>
                      <div style={{fontFamily:T.fM,fontSize:40,color:T.lime,fontWeight:300,letterSpacing:"-0.04em",lineHeight:1}}>{kgToLose.toFixed(1)}<span style={{fontSize:16,color:T.t3}}> kg</span></div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".15em",marginBottom:4}}>IN</div>
                      <div style={{fontFamily:T.fM,fontSize:40,color:T.cyan,fontWeight:300,letterSpacing:"-0.04em",lineHeight:1}}>{obTargetDays||120}<span style={{fontSize:16,color:T.t3}}> days</span></div>
                    </div>
                  </div>
                  <div style={{height:1,background:"rgba(255,255,255,0.07)",marginBottom:16}}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[
                      {l:"Daily Deficit",v:`${dailyDeficit} kcal`,c:feasibleColor},
                      {l:"Weekly Loss",  v:`${weeklyLoss} kg`,c:T.lime},
                      {l:"Eat Target",   v:`${suggestedCalGoal} kcal`,c:T.cyan},
                    ].map(s=>(
                      <div key={s.l} style={{textAlign:"center"}}>
                        <div style={{fontFamily:T.fM,fontSize:15,fontWeight:600,color:s.c}}>{s.v}</div>
                        <div className="mono" style={{fontSize:9,color:T.t3,marginTop:3,letterSpacing:".08em"}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Macros */}
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
                <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:10}}>DAILY MACROS ({(obDiet||"balanced").toUpperCase()})</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[{l:"Protein",v:macroP+"g",c:T.lime},{l:"Carbs",v:macroC+"g",c:T.cyan},{l:"Fat",v:macroF+"g",c:"#FF9F0A"}].map(m=>(
                    <div key={m.l} style={{textAlign:"center"}}>
                      <div style={{fontFamily:T.fM,fontSize:18,fontWeight:700,color:m.c}}>{m.v}</div>
                      <div className="mono" style={{fontSize:9,color:T.t3,marginTop:3}}>{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feasibility */}
              <div style={{background:`${feasibleColor}11`,border:`1px solid ${feasibleColor}33`,borderRadius:16,padding:"14px 16px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:18}}>{feasibleIcon}</span>
                  <span style={{fontFamily:T.fM,fontSize:12,color:feasibleColor,fontWeight:700,letterSpacing:".05em",textTransform:"uppercase"}}>{feasible}</span>
                </div>
                <div style={{fontFamily:T.fM,fontSize:11,color:T.t2,lineHeight:1.6}}>{feasibleText}</div>
              </div>

              {feasible==="extreme" && (
                <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"12px 14px",marginBottom:12}}>
                  <div style={{fontFamily:T.fM,fontSize:11,color:T.t3,marginBottom:8,letterSpacing:".05em"}}>💡 SUGGESTION</div>
                  <div style={{fontFamily:T.fM,fontSize:12,color:T.t2,lineHeight:1.6}}>
                    At a healthy 500 kcal/day deficit, your goal takes <span style={{color:T.lime,fontWeight:600}}>{suggestedDays} days</span>.
                  </div>
                  <button className="press" onClick={()=>setObTargetDays(String(suggestedDays))}
                    style={{marginTop:10,padding:"8px 16px",borderRadius:10,background:T.limeS,border:`1px solid ${T.lime}`,color:T.lime,fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    USE {suggestedDays} DAYS INSTEAD
                  </button>
                </div>
              )}

              <div style={{display:"flex",gap:10,marginTop:4}}>
                {BACK_BTN(()=>setOnboardStep(4))}
                <div style={{flex:1}}>{BIG_BTN("LOOKS GOOD →",()=>{
                  setObCalG(String(suggestedCalGoal));
                  setObProtG(String(macroP));
                  setObCarbG(String(macroC));
                  setObFatG(String(macroF));
                  if(!ts) setTs(new Date().toISOString().slice(0,10));
                  setOnboardStep(6);
                })}</div>
              </div>
            </div>
          )}

          {/* ═══ STEP 6: Start Date + Launch ═══ */}
          {step===6 && (
            <div className="fadeUp">
              <div style={{fontSize:40,marginBottom:16,textAlign:"center"}}>🚀</div>
              <div className="mono" style={{fontSize:10,color:T.t3,letterSpacing:".18em",marginBottom:10,textAlign:"center"}}>FINAL STEP</div>
              <div style={{fontFamily:T.fD,fontSize:30,fontWeight:700,color:T.t1,marginBottom:4,letterSpacing:"-0.02em",textAlign:"center"}}>When does Day 1 begin?</div>
              <div style={{fontSize:14,color:T.t2,marginBottom:28,textAlign:"center",lineHeight:1.5}}>Start today or pick a future date — you're in control.</div>

              <div style={{marginBottom:10}}>
                <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:8}}>START DATE</div>
                <input type="date" value={ts} onChange={e=>setTs(e.target.value)} style={{...IS,fontSize:18,padding:"14px 16px",borderRadius:14}}/>
              </div>
              <button className="press" onClick={()=>setTs(new Date().toISOString().slice(0,10))}
                style={{width:"100%",marginBottom:28,padding:"10px",borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:11,cursor:"pointer",letterSpacing:".05em"}}>
                📅 USE TODAY (RECOMMENDED)
              </button>

              {/* Summary */}
              <div style={{background:"rgba(255,255,255,0.03)",borderRadius:16,border:"1px solid rgba(255,255,255,0.07)",padding:"16px",marginBottom:28}}>
                <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".15em",marginBottom:12}}>YOUR PLAN SUMMARY</div>
                {[
                  ["Name",          obName||"—"],
                  ["Age / Sex",     `${obAge} yrs · ${obGender||"—"}`],
                  ["Current weight",tw+"kg"],
                  ["Goal weight",   obGoalW+"kg"],
                  ["To lose",       kgToLose.toFixed(1)+"kg"],
                  ["Timeline",      (obTargetDays||120)+" days"],
                  ["Daily TDEE",    tdee+" kcal"],
                  ["Eat target",    (obCalG||suggestedCalGoal)+" kcal/day"],
                  ["Diet style",    (obDiet||"balanced")],
                ].map(([l,v],i,a)=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<a.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                    <span style={{fontFamily:T.fM,fontSize:12,color:T.t3}}>{l}</span>
                    <span style={{fontFamily:T.fM,fontSize:12,color:T.lime,fontWeight:600,textTransform:"capitalize"}}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{display:"flex",gap:10}}>
                {BACK_BTN(()=>setOnboardStep(5))}
                <div style={{flex:1}}>{BIG_BTN(
                  "🚀 START TRANSFORMATION",
                  ()=>{
                    if(!ts) return;
                    setData(d=>({...d,
                      startDate:ts,
                      startWeight:parseFloat(tw)||80,
                      goalWeight:parseFloat(obGoalW)||68,
                      height:parseFloat(obHeight)||175,
                      age:parseInt(obAge)||25,
                      gender:obGender||"male",
                      activityLevel:obActivity||"light",
                      dietStyle:obDiet||"balanced",
                      tdee,
                      name:obName,
                      dailyCalGoal:parseInt(obCalG)||suggestedCalGoal||1800,
                      targetDays:parseInt(obTargetDays)||120,
                      macroTargets:{p:parseInt(obProtG)||macroP,c:parseInt(obCarbG)||macroC,f:parseInt(obFatG)||macroF},
                      onboardingDone:true,
                    }));
                    setSetup(0);
                  },
                  !ts
                )}</div>
              </div>
            </div>
          )}

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
                  {dow.toUpperCase().slice(0,3)} · {(data.targetDays||120)-cd} DAYS REMAIN
                </div>
              </div>
              <div style={{fontFamily:T.fM,fontSize:34,fontWeight:300,color:T.lime,letterSpacing:"-0.04em",textShadow:`0 0 16px ${T.limeG}`,lineHeight:1,flexShrink:0}}>
                {String(Math.round(cd/(data.targetDays||120)*100)).padStart(2,"0")}<span style={{fontSize:16,color:T.t3,textShadow:"none"}}>%</span>
              </div>
            </div>
            <PhaseTrack day={cd} total={data.targetDays||120}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
              {["Detox","Build","Forge","Apex"].slice(0,Math.ceil((data.targetDays||120)/30)).map((p,i)=>(
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

        {/* ── QUICK LOG STRIP ── */}
        {(()=>{
          const l = lg(cd);
          const fields = [
            {icon:"👟", label:"Steps",    key:"steps",  unit:"",   placeholder: l.steps||"0",   type:"number", color:T.lime,  hint:"From Apple Health → Activity"},
            {icon:"📍", label:"Distance", key:"km",     unit:"km", placeholder: l.km||"0.0",    type:"number", color:T.cyan,  hint:"Walking+Running Distance"},
            {icon:"🔥", label:"Calories", key:"calsIn", unit:"",   placeholder: l.calsIn||"0",  type:"number", color:T.mag,   hint:"Active Energy Burned"},
            {icon:"⚖️", label:"Weight",   key:"weight", unit:"kg", placeholder: l.weight||"—",  type:"number", color:"#FF9F0A",hint:"Body weight this morning"},
          ];
          return (
            <Card style={{padding:"14px 14px",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontFamily:T.fM,fontSize:10,fontWeight:700,color:T.t1,letterSpacing:".06em"}}>⚡ QUICK LOG</div>
                <div style={{fontFamily:T.fM,fontSize:9,color:T.t3}}>Open Health app → read numbers → type here</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                {fields.map(f=>(
                  <div key={f.key} style={{textAlign:"center"}}>
                    <div style={{fontSize:18,marginBottom:4}}>{f.icon}</div>
                    <input
                      type={f.type}
                      defaultValue={l[f.key]||""}
                      placeholder={String(f.placeholder)}
                      onBlur={e=>{
                        const v=parseFloat(e.target.value);
                        if(!isNaN(v)&&v>0) upd(cd,f.key,v);
                      }}
                      style={{width:"100%",background:"rgba(255,255,255,0.07)",border:`1.5px solid ${f.color}44`,borderRadius:10,padding:"8px 4px",color:T.t1,fontFamily:T.fM,fontSize:13,fontWeight:700,textAlign:"center",outline:"none",boxSizing:"border-box"}}
                    />
                    <div style={{fontFamily:T.fM,fontSize:8,color:f.color,marginTop:4,letterSpacing:".06em"}}>{f.label.toUpperCase()}{f.unit?` (${f.unit})`:""}</div>
                  </div>
                ))}
              </div>
              <button className="press"
                onClick={()=>window.open("x-apple-health://","_blank")}
                style={{marginTop:12,width:"100%",padding:"10px",borderRadius:12,background:"rgba(255,59,48,0.10)",border:"1.5px solid rgba(255,59,48,0.3)",color:"#FF3B30",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:".06em"}}>
                🍎 OPEN APPLE HEALTH APP
              </button>
            </Card>
          );
        })()}

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
              <span style={{fontFamily:T.fM,fontSize:30,color:T.lime,fontWeight:300,letterSpacing:"-0.04em"}}>{data.goalWeight||65}</span>
              <span style={{fontFamily:T.fM,fontSize:12,color:T.t3}}>kg</span>
            </div>
            <div style={{fontFamily:T.fM,fontSize:12,color:T.t2,marginTop:7}}>{Math.max(0,latW-(data.goalWeight||65)).toFixed(1)} kg to go</div>
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

        {/* ── Custom Habits ── */}
        {((data.customHabits||[]).length > 0 || showCHForm) && (
          <Card style={{padding:16,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div className="eyebrow">CUSTOM HABITS</div>
              <button onClick={()=>setShowCHForm(s=>!s)} style={{background:"none",border:"1px solid rgba(255,255,255,0.10)",borderRadius:8,padding:"4px 10px",color:T.t3,fontFamily:T.fM,fontSize:10,cursor:"pointer"}}>{showCHForm?"CANCEL":"+ ADD"}</button>
            </div>
            {(data.customHabits||[]).map((h,i,arr)=>{
              const key = "ch_"+h.id;
              const on = !!l[key];
              return (
                <div key={h.id}>
                  <div className="press" onClick={()=>upd(cd,key,!on)} style={{display:"flex",alignItems:"center",gap:14,padding:"11px 0",cursor:"pointer"}}>
                    <div style={{width:38,height:38,borderRadius:12,background:on?T.limeS:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0,border:`1px solid ${on?"oklch(0.92 0.22 130 / 0.4)":"rgba(255,255,255,0.06)"}`,transition:"all .25s"}}>{h.icon||"⭐"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:500,color:on?T.t1:T.t2}}>{h.label}</div>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <div style={{width:26,height:26,borderRadius:13,background:on?T.lime:"transparent",border:on?"none":"1.5px solid rgba(255,255,255,0.10)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .25s"}}>
                        {on&&<span style={{fontSize:13,color:"#000",fontWeight:800}}>✓</span>}
                      </div>
                      <button onClick={e=>{e.stopPropagation();setData(d=>({...d,customHabits:(d.customHabits||[]).filter(x=>x.id!==h.id)}));}} style={{background:"none",border:"none",cursor:"pointer",color:T.t3,fontSize:14,padding:"0 4px"}}>×</button>
                    </div>
                  </div>
                  {i<arr.length-1&&<div style={{height:1,background:"rgba(255,255,255,0.06)"}}/>}
                </div>
              );
            })}
            {showCHForm && (
              <div style={{marginTop:12,display:"flex",gap:8,alignItems:"center"}}>
                <input value={chIcon} onChange={e=>setChIcon(e.target.value)} style={{...IS,width:52,textAlign:"center",fontSize:20,padding:"8px 4px",borderRadius:10,flexShrink:0}} maxLength={2} placeholder="⭐"/>
                <input value={chName} onChange={e=>setChName(e.target.value)} placeholder="Habit name…" style={{...IS,flex:1,fontSize:14,padding:"8px 10px",borderRadius:10}}/>
                <button className="press" onClick={()=>{if(!chName.trim())return;setData(d=>({...d,customHabits:[...(d.customHabits||[]),{id:Date.now().toString(),label:chName.trim(),icon:chIcon||"⭐"}]}));setChName("");setChIcon("⭐");setShowCHForm(false);}} style={{padding:"8px 14px",borderRadius:10,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>ADD</button>
              </div>
            )}
          </Card>
        )}

        {/* Add custom habit CTA if none exist */}
        {(data.customHabits||[]).length===0 && !showCHForm && (
          <button className="press" onClick={()=>setShowCHForm(true)} style={{width:"100%",padding:"11px",borderRadius:14,background:"rgba(255,255,255,0.03)",border:"1px dashed rgba(255,255,255,0.10)",color:T.t3,fontFamily:T.fM,fontSize:11,cursor:"pointer",marginBottom:14,letterSpacing:".05em"}}>
            + ADD CUSTOM HABIT
          </button>
        )}

        {/* ── Feature 4C: Grace Day ── */}
        {(()=>{
          const graceUsed = (data.graceDays||[]).includes(cd);
          const weekGraceCount = Array.from({length:7},(_,i)=>cd-i).filter(d=>(data.graceDays||[]).includes(d)).length;
          const canUseGrace = !graceUsed && weekGraceCount === 0;
          const completionPct = Math.round(checkedCount/6*100);
          if (graceUsed) {
            return (
              <Card style={{padding:"12px 16px",marginBottom:14,border:`1px solid ${T.limeG}`,background:T.limeS}}>
                <div style={{fontFamily:T.fM,fontSize:12,color:T.lime,fontWeight:600,letterSpacing:".04em"}}>🛡 Grace Day Active — this day is streak-protected</div>
              </Card>
            );
          }
          if (canUseGrace && completionPct < 60) {
            return (
              <Card style={{padding:"12px 16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontFamily:T.fM,fontSize:12,color:T.t2,fontWeight:600,marginBottom:2}}>🛡 Streak Protection Available</div>
                    <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".04em"}}>Protect today's streak — 1 available this week</div>
                  </div>
                  <button className="press" onClick={()=>setData(d=>({...d,graceDays:[...(d.graceDays||[]),cd]}))}
                    style={{padding:"8px 14px",borderRadius:10,background:T.limeS,border:`1px solid ${T.lime}`,color:T.lime,fontFamily:T.fM,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:".05em",whiteSpace:"nowrap"}}>
                    USE GRACE DAY
                  </button>
                </div>
              </Card>
            );
          }
          return null;
        })()}

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

        {/* ── Feature 2: Copy Yesterday buttons ── */}
        {(()=>{
          const yestFood = data.logs[cd-1]?.foodLog || [];
          const yestWorkout = data.logs[cd-1]?.workoutLog;
          const todayFood = l.foodLog || [];
          const todayWorkout = l.workoutLog;
          if (yestFood.length === 0 && !yestWorkout) return null;
          return (
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {yestFood.length > 0 && (
                copyYestConfirm ? (
                  <div style={{flex:1,padding:"10px 12px",borderRadius:12,background:"rgba(255,150,80,0.10)",border:"1px solid rgba(255,150,80,0.30)"}}>
                    <div style={{fontSize:12,color:T.t1,marginBottom:8}}>Overwrite today's food log?</div>
                    <div style={{display:"flex",gap:6}}>
                      <button className="press" onClick={()=>{ upd(cd,"foodLog",yestFood); setCopyYestConfirm(false); }}
                        style={{flex:1,padding:"7px 10px",borderRadius:8,background:"#FF9F0A",border:"none",color:"#000",fontFamily:T.fM,fontSize:10,fontWeight:700,cursor:"pointer"}}>YES</button>
                      <button className="press" onClick={()=>setCopyYestConfirm(false)}
                        style={{flex:1,padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:10,cursor:"pointer"}}>CANCEL</button>
                    </div>
                  </div>
                ) : (
                  <button className="press" onClick={()=>{ if(todayFood.length>0) setCopyYestConfirm(true); else upd(cd,"foodLog",yestFood); }}
                    style={{flex:1,padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:10,cursor:"pointer",textAlign:"center",letterSpacing:".04em"}}>
                    📋 Copy Yesterday's Food Log
                  </button>
                )
              )}
              {yestWorkout && !todayWorkout && (
                <button className="press" onClick={()=>upd(cd,"workoutLog",yestWorkout)}
                  style={{flex:1,padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:10,cursor:"pointer",textAlign:"center",letterSpacing:".04em"}}>
                  💪 Copy Yesterday's Workout
                </button>
              )}
            </div>
          );
        })()}

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
        <Card style={{padding:16,marginBottom:14}}>
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

        {/* ── QUICK WATER LOG (Feature 2) ── */}
        <Card style={{padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div className="eyebrow">HYDRATION</div>
            <div style={{fontFamily:T.fM,fontSize:18,fontWeight:600,color:T.cyan,letterSpacing:"-0.02em"}}>
              {((l.hydration||0)/1000).toFixed(1)}<span style={{fontSize:12,color:T.t3,fontWeight:400}}>L</span>
            </div>
          </div>
          {/* Water fill bar */}
          <div style={{background:"rgba(100,210,255,0.07)",borderRadius:10,height:10,overflow:"hidden",marginBottom:8,position:"relative"}}>
            <div style={{width:`${Math.min(100,((l.hydration||0)/3000)*100)}%`,height:"100%",background:"linear-gradient(90deg,oklch(0.85 0.18 200),oklch(0.75 0.18 210))",borderRadius:10,transition:"width .8s cubic-bezier(.22,.68,0,1.2)",boxShadow:"0 0 8px oklch(0.85 0.18 200 / 0.5)"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
            <span className="mono" style={{fontSize:10,color:T.t3}}>0L</span>
            <span className="mono" style={{fontSize:10,color:(l.hydration||0)>=3000?T.lime:T.cyan}}>{Math.round(((l.hydration||0)/3000)*100)}% of 3L goal</span>
            <span className="mono" style={{fontSize:10,color:T.t3}}>3L</span>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            {[{label:"+250ml",amt:250},{label:"+500ml",amt:500},{label:"+1L",amt:1000}].map(({label,amt})=>(
              <button key={label} className="press" onClick={()=>upd(cd,"hydration",(l.hydration||0)+amt)}
                style={{flex:1,padding:"11px 4px",borderRadius:12,background:"oklch(0.85 0.18 200 / 0.12)",border:"1px solid oklch(0.85 0.18 200 / 0.3)",color:T.cyan,fontFamily:T.fM,fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:".05em"}}>
                {label}
              </button>
            ))}
            <button className="press" onClick={()=>upd(cd,"hydration",Math.max(0,(l.hydration||0)-250))}
              style={{padding:"11px 14px",borderRadius:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.10)",color:T.t3,fontFamily:T.fM,fontSize:11,cursor:"pointer"}}>
              −
            </button>
          </div>
        </Card>

        {/* ── WORKOUT LOG (Feature 4) ── */}
        <Card style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div className="eyebrow">WORKOUT LOG</div>
            {(l.workoutLog||[]).length > 0 && (
              <div style={{fontFamily:T.fM,fontSize:10,color:T.lime}}>{(l.workoutLog||[]).filter(e=>e.done).length} exercises logged</div>
            )}
          </div>
          {workout.map((ex, i) => {
            const wl = l.workoutLog || [];
            const entry = wl[i] || {exercise:ex, sets:"", reps:"", done:false};
            // Find personal best reps for this exercise
            let pb = 0;
            for (let d = 1; d < cd; d++) {
              const prev = data.logs[d]?.workoutLog?.[i];
              if (prev?.reps) pb = Math.max(pb, parseInt(prev.reps)||0);
            }
            const isNewPB = entry.reps && parseInt(entry.reps) > pb && pb > 0;
            return (
              <div key={i} style={{marginBottom:i<workout.length-1?12:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:entry.done?T.t3:T.t1,marginBottom:6,textDecoration:entry.done?"line-through":"none",textDecorationColor:T.t4}}>{ex}</div>
                    <div style={{display:"flex",gap:8}}>
                      <input type="number" placeholder="Sets" value={entry.sets}
                        onChange={e => {
                          const updated = [...(l.workoutLog||workout.map((x,j)=>({exercise:x,sets:"",reps:"",done:false})))];
                          while(updated.length <= i) updated.push({exercise:workout[updated.length],sets:"",reps:"",done:false});
                          updated[i] = {...entry, sets:e.target.value};
                          upd(cd,"workoutLog",updated);
                        }}
                        style={{...IS,flex:1,fontSize:14,padding:"8px 10px",borderRadius:10}}/>
                      <input type="number" placeholder="Reps" value={entry.reps}
                        onChange={e => {
                          const updated = [...(l.workoutLog||workout.map((x,j)=>({exercise:x,sets:"",reps:"",done:false})))];
                          while(updated.length <= i) updated.push({exercise:workout[updated.length],sets:"",reps:"",done:false});
                          updated[i] = {...entry, reps:e.target.value};
                          upd(cd,"workoutLog",updated);
                        }}
                        style={{...IS,flex:1,fontSize:14,padding:"8px 10px",borderRadius:10}}/>
                    </div>
                    {isNewPB && <div style={{fontFamily:T.fM,fontSize:9,color:T.lime,marginTop:4,letterSpacing:".1em"}}>🏆 NEW PERSONAL BEST!</div>}
                    {pb > 0 && !isNewPB && <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,marginTop:4}}>PB: {pb} reps</div>}
                  </div>
                  <button className="press" onClick={() => {
                    const updated = [...(l.workoutLog||workout.map((x,j)=>({exercise:x,sets:"",reps:"",done:false})))];
                    while(updated.length <= i) updated.push({exercise:workout[updated.length],sets:"",reps:"",done:false});
                    updated[i] = {...entry, done:!entry.done};
                    upd(cd,"workoutLog",updated);
                  }} style={{width:36,height:36,borderRadius:12,border:`1.5px solid ${entry.done?T.lime:"rgba(255,255,255,0.10)"}`,background:entry.done?T.limeS:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,boxShadow:entry.done?`0 0 10px ${T.limeG}`:"none",transition:"all .2s"}}>
                    {entry.done && <svg width="14" height="14" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={T.lime} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                </div>
                {i < workout.length-1 && <div style={{height:1,background:"rgba(255,255,255,0.05)",marginTop:12}}/>}
              </div>
            );
          })}
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

    // Feature 6: Weekly Report
    const weekDays = Array.from({length:7},(_,i)=>Math.max(1,cd-6+i)).filter(d=>d>=1&&d<=cd);
    const weekCpds = weekDays.map(d=>cpd(d));
    const avgCpd = weekCpds.length ? Math.round(weekCpds.reduce((a,b)=>a+b,0)/weekCpds.length) : 0;
    const grade = avgCpd>=85?"A":avgCpd>=70?"B":avgCpd>=55?"C":avgCpd>=40?"D":"F";
    const gradeColor = grade==="A"?T.lime:grade==="B"?T.cyan:grade==="C"?"#FFD60A":grade==="D"?"#FF9F0A":T.mag;
    const bestDay = weekDays.reduce((b,d)=>cpd(d)>cpd(b)?d:b, weekDays[0]||cd);
    const worstDay = weekDays.reduce((b,d)=>cpd(d)<cpd(b)?d:b, weekDays[0]||cd);
    const prevWeekDays = Array.from({length:7},(_,i)=>Math.max(1,cd-13+i)).filter(d=>d>=1&&d<=(cd-7));
    const prevAvg = prevWeekDays.length ? Math.round(prevWeekDays.map(d=>cpd(d)).reduce((a,b)=>a+b,0)/prevWeekDays.length) : 0;
    const weekWeightStart = weekDays.length ? (()=>{for(let d=weekDays[0];d<=cd;d++) if(data.logs[d]?.weight) return data.logs[d].weight; return null;})() : null;
    const weekWeightEnd = (()=>{for(let d=cd;d>=Math.max(1,cd-6);d--) if(data.logs[d]?.weight) return data.logs[d].weight; return null;})();
    const weekWtChange = weekWeightStart&&weekWeightEnd ? (weekWeightEnd-weekWeightStart).toFixed(1) : null;
    // Find lowest habit
    const habitNames = ["noAlcohol","noPorn","workoutDone","drank3L","ate10k","sleptWell"];
    const habitLabels = ["No Alcohol","No Porn","Workout","3L Water","10k Steps","Good Sleep"];
    const habitScores = habitNames.map((f,i)=>({label:habitLabels[i],score:weekDays.filter(d=>data.logs[d]?.[f]).length}));
    const focusHabit = habitScores.sort((a,b)=>a.score-b.score)[0];

    // Feature 7: Share card
    const generateShareCard = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      // Background
      ctx.fillStyle = "#050507";
      ctx.fillRect(0,0,1080,1920);
      // Gradient overlay
      const grd = ctx.createRadialGradient(540,300,0,540,300,800);
      grd.addColorStop(0,"rgba(206,252,0,0.12)");
      grd.addColorStop(1,"transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,1080,1920);
      // Header
      ctx.font = "bold 72px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#cefc00";
      ctx.textAlign = "center";
      ctx.fillText("Goz 2.0", 540, 200);
      // Day
      ctx.font = "bold 160px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(`Day ${cd}`, 540, 420);
      ctx.font = "40px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("of 120", 540, 490);
      // Phase
      ctx.font = "bold 52px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#cefc00";
      ctx.fillText(PI.name.toUpperCase(), 540, 600);
      // Weight
      ctx.font = "bold 64px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      const startW = data.startWeight || 80;
      ctx.fillText(`${startW}kg → ${latW}kg`, 540, 720);
      ctx.font = "40px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#cefc00";
      ctx.fillText(`${wLost.toFixed(1)}kg lost`, 540, 790);
      // Completion
      ctx.font = "bold 100px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#cefc00";
      ctx.fillText(`${avgCpd}%`, 540, 940);
      ctx.font = "36px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("WEEK COMPLETION", 540, 1000);
      // Streaks
      ctx.font = "bold 48px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(`Sober: ${str("noAlcohol")} days · Train: ${str("workoutDone")} days`, 540, 1120);
      // Quote
      const q = getDayQuotes(cd)[0];
      ctx.font = "italic 36px 'Times New Roman', serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      const words = `"${q.t}"`.split(" ");
      let line = "", y = 1300;
      for (const word of words) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > 900 && line) { ctx.fillText(line.trim(), 540, y); line = word + " "; y += 52; } else { line = test; }
      }
      if (line) ctx.fillText(line.trim(), 540, y);
      // Footer
      ctx.font = "32px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillText("goz-transfo.vercel.app", 540, 1860);
      // Download
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url; a.download = `goz-day-${cd}-progress.png`;
      a.click();
    };

    // Feature 8: Export
    const exportCSV = () => {
      const header = "Day,Date,Steps,KM,Mins,Weight,Mood,Energy,Sleep Time,Wake Time,Hydration(L),Calories,No Alcohol,No Porn,Workout Done,Routines Done,Meds Taken,Has Journal,Note";
      const rows = Array.from({length:cd},(_,i)=>i+1).map(d => {
        const l = data.logs[d] || {};
        const date = data.startDate ? new Date(new Date(data.startDate).getTime()+(d-1)*86400000).toISOString().slice(0,10) : "";
        const routinesDone = ROUTINES.filter(r=>(l.routines||{})[r.id]).length;
        const medsDone = (data.meds||[]).filter(m=>(l.medsTaken||{})[m.id]).length;
        const foodLog = l.foodLog || [];
        const cals = foodLog.reduce((s,f)=>s+(f.cal||0),0) || (l.calsIn || "");
        return [d, date, l.steps||"", l.km||"", l.mins||"", l.weight||"",
          l.moodLabel||"", l.energyScore||"", l.sleepTime||"", l.wakeTime||"",
          l.hydration ? (l.hydration/1000).toFixed(2) : (l.waterMl ? (l.waterMl/1000).toFixed(2) : ""),
          cals, l.noAlcohol?"Y":"N", l.noPorn?"Y":"N", l.workoutDone?"Y":"N",
          routinesDone, medsDone, l.notes?"Y":"N", (l.notes||"").replace(/,/g," ")
        ].join(",");
      });
      const csv = [header,...rows].join("\n");
      const blob = new Blob([csv], {type:"text/csv"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "goz-progress-export.csv"; a.click();
      URL.revokeObjectURL(url);
    };

    const exportJSON = () => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "goz-backup.json"; a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div key={ak} className="fadeUp" style={{padding:"0 16px 24px"}}>
        <div className="eyebrow" style={{marginBottom:4,paddingTop:4}}>Progress</div>
        <div style={{fontFamily:T.fD,fontSize:26,fontWeight:600,color:T.t1,marginBottom:18,letterSpacing:"-0.02em"}}>Day 1 → Day {cd}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {[{l:"Days Logged",v:tL,c:T.lime},{l:"Sober Days",v:tNA,c:T.lime},{l:"Clean Days",v:tNP,c:T.cyan},{l:"Workouts",v:tW,c:T.lime},{l:"Weight Lost",v:`${wLost.toFixed(1)}kg`,c:T.lime},{l:"Days Left",v:(data.targetDays||120)-cd,c:T.t2}].map((s,i)=>(
            <Card key={i} style={{padding:14}}>
              <div className="mono" style={{fontSize:28,color:s.c,lineHeight:1,letterSpacing:"-0.02em"}}>{s.v}</div>
              <div className="mono" style={{fontSize:9,color:T.t3,marginTop:5,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</div>
            </Card>
          ))}
        </div>

        {/* ── Feature 5: SVG Weight Chart ── */}
        {ws.length>1&&(()=>{
          const targetW = data.goalWeight || data.targetWeight || 65;
          const allW = ws.map(x=>x.w);
          const minW = Math.min(...allW, targetW)-1;
          const maxW = Math.max(...allW)+1;
          const W = 340, H = 160, PL=32, PR=12, PT=12, PB=24;
          const iW = W-PL-PR, iH = H-PT-PB;
          const xScale = d => PL + ((d-1)/(120-1))*iW;
          const yScale = w => PT + iH - ((w-minW)/(maxW-minW))*iH;
          const pts = ws.map(p=>`${xScale(p.d)},${yScale(p.w)}`).join(" ");
          const fillPts = `${xScale(ws[0].d)},${PT+iH} ` + pts + ` ${xScale(ws[ws.length-1].d)},${PT+iH}`;
          const startW2 = ws[0]?.w;
          const currWt = ws[ws.length-1]?.w;
          const wLostSt = startW2 && currWt ? (startW2-currWt).toFixed(1) : null;
          const daysToGoal = currWt && currWt > targetW && wLostSt > 0 ? Math.round((currWt-targetW)/(wLostSt/(cd||1))) : null;
          const tY = yScale(targetW);
          // Linear regression for projection
          const n = ws.length;
          const sumX = ws.reduce((s,p)=>s+p.d,0);
          const sumY = ws.reduce((s,p)=>s+p.w,0);
          const sumXY = ws.reduce((s,p)=>s+p.d*p.w,0);
          const sumX2 = ws.reduce((s,p)=>s+p.d*p.d,0);
          const slope = n>1 ? (n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX) : 0;
          const intercept = n>1 ? (sumY-slope*sumX)/n : ws[0]?.w||0;
          const projAt120 = Math.max(40, slope*120+intercept);
          const lastPt = ws[ws.length-1];
          return (
            <Card style={{padding:16,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div className="eyebrow">WEIGHT CHART</div>
                <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,letterSpacing:".05em"}}>Target: {targetW}kg</div>
              </div>
              <div style={{overflowX:"hidden"}}>
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
                  <defs>
                    <linearGradient id="wFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.92 0.22 130)" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="oklch(0.92 0.22 130)" stopOpacity="0"/>
                    </linearGradient>
                    <filter id="wGlow">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
                      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  {/* Grid lines */}
                  {[0,0.25,0.5,0.75,1].map((p,i)=>(
                    <line key={i} x1={PL} y1={PT+iH*p} x2={PL+iW} y2={PT+iH*p} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  ))}
                  {/* Target dashed line */}
                  <line x1={PL} y1={tY} x2={PL+iW} y2={tY} stroke={T.lime} strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
                  <text x={PL+iW-2} y={tY-3} fill={T.lime} fontSize="7" textAnchor="end" fontFamily="'JetBrains Mono',monospace">{targetW}kg</text>
                  {/* Fill area */}
                  <polygon points={fillPts} fill="url(#wFill)"/>
                  {/* Line */}
                  <polyline points={pts} fill="none" stroke="oklch(0.92 0.22 130)" strokeWidth="2" strokeLinejoin="round" filter="url(#wGlow)"/>
                  {/* Dots */}
                  {ws.map((p,i)=>(
                    <circle key={i} cx={xScale(p.d)} cy={yScale(p.w)} r={3} fill="oklch(0.92 0.22 130)" stroke="#050507" strokeWidth="1.5"/>
                  ))}
                  {/* Projection line */}
                  {n > 1 && (
                    <line
                      x1={xScale(lastPt.d)} y1={yScale(lastPt.w)}
                      x2={xScale(120)}      y2={yScale(projAt120)}
                      stroke={T.cyan} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.6"
                    />
                  )}
                  {/* Y labels */}
                  {[minW+1, Math.round((minW+maxW)/2), maxW-1].map((v,i)=>(
                    <text key={i} x={PL-3} y={yScale(v)+3} fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor="end" fontFamily="'JetBrains Mono',monospace">{v.toFixed(0)}</text>
                  ))}
                </svg>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:8}}>
                {[{l:"Start",v:startW2?`${startW2}kg`:"—",c:T.t2},{l:"Current",v:currWt?`${currWt}kg`:"—",c:T.lime},{l:"Lost",v:wLostSt?`${wLostSt}kg`:"—",c:T.lime},{l:"Day 120",v:n>1?`${projAt120.toFixed(1)}kg`:"—",c:T.cyan}].map((s,i)=>(
                  <div key={i} style={{textAlign:"center"}}>
                    <div style={{fontFamily:T.fM,fontSize:14,color:s.c,fontWeight:600}}>{s.v}</div>
                    <div className="mono" style={{fontSize:8,color:T.t3,marginTop:2,letterSpacing:".1em"}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

        {/* ── Feature 6: Weekly Report Card ── */}
        <Card style={{padding:16,marginBottom:14,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-30,right:-30,fontFamily:T.fS,fontSize:140,fontStyle:"italic",color:gradeColor,opacity:0.07,lineHeight:1,pointerEvents:"none",userSelect:"none"}}>{grade}</div>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div className="eyebrow" style={{marginBottom:6}}>WEEKLY REPORT</div>
                <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                  <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:80,lineHeight:0.9,color:gradeColor,textShadow:`0 0 30px ${gradeColor}`}}>{grade}</div>
                  <div>
                    <div style={{fontFamily:T.fM,fontSize:24,color:T.t1,letterSpacing:"-0.02em"}}>{avgCpd}%</div>
                    <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".1em"}}>AVG COMPLETION</div>
                  </div>
                </div>
              </div>
              {prevAvg > 0 && (
                <div style={{textAlign:"right",padding:"8px 12px",background:"rgba(255,255,255,0.04)",borderRadius:12,border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".1em",marginBottom:4}}>LAST WEEK</div>
                  <div style={{fontFamily:T.fM,fontSize:18,color:avgCpd>=prevAvg?T.lime:T.mag}}>{prevAvg}%</div>
                  <div style={{fontFamily:T.fM,fontSize:10,color:avgCpd>=prevAvg?T.lime:T.mag}}>{avgCpd>=prevAvg?"+"+(avgCpd-prevAvg):avgCpd-prevAvg}%</div>
                </div>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {l:"Best Day",v:`Day ${bestDay}`,s:`${cpd(bestDay)}%`,c:T.lime},
                {l:"Worst Day",v:`Day ${worstDay}`,s:`${cpd(worstDay)}%`,c:T.mag},
                {l:"Streak",v:str("noAlcohol")>0?"✓ Maintained":"✗ Broken",s:`${str("noAlcohol")} days sober`,c:str("noAlcohol")>0?T.lime:T.mag},
                {l:"Weight Change",v:weekWtChange?`${parseFloat(weekWtChange)>0?"+":""}${weekWtChange}kg`:"—",s:"this week",c:weekWtChange&&parseFloat(weekWtChange)<0?T.lime:T.t2},
              ].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"11px 12px"}}>
                  <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".1em",marginBottom:4}}>{s.l.toUpperCase()}</div>
                  <div style={{fontFamily:T.fM,fontSize:14,fontWeight:600,color:s.c}}>{s.v}</div>
                  <div className="mono" style={{fontSize:9,color:T.t3,marginTop:2}}>{s.s}</div>
                </div>
              ))}
            </div>
            {focusHabit && (
              <div style={{padding:"10px 12px",background:T.limeS,borderRadius:12,border:`1px solid ${T.limeG}`}}>
                <div className="mono" style={{fontSize:9,color:T.lime,letterSpacing:".1em",marginBottom:4}}>FOCUS NEXT WEEK</div>
                <div style={{fontSize:13,color:T.t1,fontWeight:500}}>{focusHabit.label} — only {focusHabit.score}/7 days</div>
              </div>
            )}
          </div>
        </Card>

        {/* ── Feature 5: Pattern Insights ── */}
        {(()=>{
          const allMoodDays = Array.from({length:cd},(_,i)=>i+1).filter(d=>data.logs[d]?.moodScore);
          const avg = arr => arr.length>=2 ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : null;
          const moodOn  = field => avg(allMoodDays.filter(d=>data.logs[d]?.[field]).map(d=>data.logs[d].moodScore));
          const moodOff = field => avg(allMoodDays.filter(d=>!data.logs[d]?.[field]).map(d=>data.logs[d].moodScore));
          const workoutMoodOn  = moodOn("workoutDone"),  workoutMoodOff  = moodOff("workoutDone");
          const soberMoodOn    = moodOn("noAlcohol"),    soberMoodOff    = moodOff("noAlcohol");
          const stepsMoodOn    = moodOn("ate10k"),       stepsMoodOff    = moodOff("ate10k");
          const sleepMoodOn    = moodOn("sleptWell"),    sleepMoodOff    = moodOff("sleptWell");
          const insights = [
            {icon:"💪",label:"Workout days",on:workoutMoodOn,off:workoutMoodOff,offLabel:"rest days"},
            {icon:"🚫",label:"Sober days",on:soberMoodOn,off:soberMoodOff,offLabel:"drinking days"},
            {icon:"🚶",label:"10k steps days",on:stepsMoodOn,off:stepsMoodOff,offLabel:"low step days"},
            {icon:"😴",label:"Good sleep days",on:sleepMoodOn,off:sleepMoodOff,offLabel:"poor sleep days"},
          ].filter(x=>x.on!==null&&x.off!==null);
          if (insights.length === 0) return null;
          return (
            <Card style={{padding:16,marginBottom:14}}>
              <div className="eyebrow" style={{marginBottom:14}}>PATTERN INSIGHTS</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {insights.map((ins,i)=>{
                  const delta = (parseFloat(ins.on)-parseFloat(ins.off)).toFixed(1);
                  const pos = parseFloat(delta) >= 0;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:12}}>
                      <span style={{fontSize:18,flexShrink:0}}>{ins.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:500,color:T.t1}}>{ins.label}</div>
                        <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,marginTop:2}}>{ins.on} vs {ins.off} avg mood on {ins.offLabel}</div>
                      </div>
                      <div style={{padding:"3px 8px",borderRadius:99,background:pos?T.limeS:T.magS,border:`1px solid ${pos?T.lime:T.mag}`,fontFamily:T.fM,fontSize:10,color:pos?T.lime:T.mag,fontWeight:600,flexShrink:0}}>
                        {pos?"+":""}{delta}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}

        {/* ── Personal Records ── */}
        <Card style={{padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div className="eyebrow">PERSONAL RECORDS 🏆</div>
            <button onClick={()=>setShowPRForm(s=>!s)} style={{background:"none",border:"1px solid rgba(255,255,255,0.10)",borderRadius:8,padding:"4px 10px",color:T.t3,fontFamily:T.fM,fontSize:10,cursor:"pointer"}}>{showPRForm?"CANCEL":"+ ADD"}</button>
          </div>
          {(data.personalRecords||[]).length===0 && !showPRForm && (
            <div style={{fontFamily:T.fM,fontSize:11,color:T.t3,lineHeight:1.7}}>Track your bests — push-ups, plank time, fastest km, etc.</div>
          )}
          {(data.personalRecords||[]).map((pr,i,arr)=>(
            <div key={pr.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:500,color:T.t1}}>{pr.label}</div>
                  <div style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>Day {pr.day || cd} · {pr.date || ""}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontFamily:T.fM,fontSize:20,color:T.lime,fontWeight:600}}>{pr.value} <span style={{fontSize:11,color:T.t3}}>{pr.unit}</span></div>
                  <button onClick={()=>setData(d=>({...d,personalRecords:(d.personalRecords||[]).filter(r=>r.id!==pr.id)}))} style={{background:"none",border:"none",cursor:"pointer",color:T.t3,fontSize:14}}>×</button>
                </div>
              </div>
              {i<arr.length-1&&<div style={{height:1,background:"rgba(255,255,255,0.06)"}}/>}
            </div>
          ))}
          {showPRForm && (
            <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
              <input value={prName} onChange={e=>setPRName(e.target.value)} placeholder="e.g. Push-ups, Plank time, 1km run" style={{...IS,fontSize:14,padding:"8px 12px",borderRadius:10}}/>
              <div style={{display:"flex",gap:8}}>
                <input type="number" value={prVal} onChange={e=>setPRVal(e.target.value)} placeholder="Value" style={{...IS,flex:1,fontSize:14,padding:"8px 10px",borderRadius:10}}/>
                <select value={prUnit} onChange={e=>setPRUnit(e.target.value)} style={{...IS,flex:1,fontSize:13,padding:"8px 10px",borderRadius:10}}>
                  {["reps","seconds","minutes","kg","km"].map(u=><option key={u} value={u}>{u}</option>)}
                </select>
                <button className="press" onClick={()=>{if(!prName.trim()||!prVal)return;setData(d=>({...d,personalRecords:[...(d.personalRecords||[]),{id:Date.now().toString(),label:prName.trim(),value:parseFloat(prVal),unit:prUnit,day:cd,date:new Date().toLocaleDateString()}]}));setPRName("");setPRVal("");setShowPRForm(false);}} style={{padding:"8px 14px",borderRadius:10,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>SAVE</button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Feature 7 & 8: Share + Export ── */}
        <Card style={{padding:16,marginBottom:14}}>
          <div className="eyebrow" style={{marginBottom:12}}>SHARE & EXPORT</div>
          <button className="press" onClick={generateShareCard}
            style={{width:"100%",padding:14,borderRadius:13,background:"linear-gradient(135deg,oklch(0.92 0.22 130),oklch(0.85 0.18 200))",border:"none",color:"#000",fontFamily:T.fM,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:".08em",boxShadow:`0 8px 32px oklch(0.92 0.22 130 / 0.4)`,marginBottom:10}}>
            📤 SHARE PROGRESS CARD
          </button>
          <div style={{display:"flex",gap:8}}>
            <button className="press" onClick={exportCSV}
              style={{flex:1,padding:12,borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:".06em"}}>
              ↓ CSV
            </button>
            <button className="press" onClick={exportJSON}
              style={{flex:1,padding:12,borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:".06em"}}>
              ↓ JSON
            </button>
          </div>
        </Card>

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
              <span className="mono" style={{fontSize:10,color:T.lime,whiteSpace:"nowrap"}}>D{String(cd).padStart(3,"0")} / {data.targetDays||120}</span>
              <span className="mono" style={{fontSize:10,color:T.t3,whiteSpace:"nowrap"}}>{(data.targetDays||120)-cd} DAYS REMAIN</span>
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
      <Card style={{padding:16,marginBottom:14}}>
        <Lb>The 6 Non-Negotiables</Lb>
        {[["🚶","10,000 Steps","Every day. Rain, snow, or shine."],["💧","3L Water","First glass before coffee."],["🍳","High Protein Every Meal","Eggs, tuna, chicken every time."],["🚫","Zero Alcohol","Not one sip. This is the foundation."],["😴","In Bed by 11pm","Your body transforms during sleep."],["📸","Weekly Photo","Day 1, 7, 30, 60, 90, 120."]].map(([ic,r,d],i,a)=>(
          <div key={r}><div style={{display:"flex",gap:13,padding:"11px 0",alignItems:"flex-start"}}>
            <span style={{fontSize:20,minWidth:26}}>{ic}</span>
            <div><div style={{fontSize:13,fontWeight:500,color:T.t1}}>{r}</div><div className="mono" style={{fontSize:10,color:T.t3,marginTop:2}}>{d}</div></div>
          </div>{i<a.length-1&&<Dv/>}</div>
        ))}
      </Card>

      {/* ── Profile Settings ── */}
      <Card style={{padding:16}}>
        <div className="eyebrow" style={{marginBottom:12}}>⚙️ PROFILE SETTINGS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><Lb>Your Name</Lb><input defaultValue={data.name||""} onBlur={e=>setData(d=>({...d,name:e.target.value}))} placeholder="Your name" style={{...IS,fontSize:14,padding:"8px 10px",borderRadius:10}}/></div>
          <div><Lb>Height (cm)</Lb><input type="number" defaultValue={data.height||175} onBlur={e=>setData(d=>({...d,height:parseFloat(e.target.value)||175}))} style={{...IS,fontSize:14,padding:"8px 10px",borderRadius:10}}/></div>
          <div><Lb>Start Weight (kg)</Lb><input type="number" defaultValue={data.startWeight||80} onBlur={e=>setData(d=>({...d,startWeight:parseFloat(e.target.value)||80}))} style={{...IS,fontSize:14,padding:"8px 10px",borderRadius:10}}/></div>
          <div><Lb>Goal Weight (kg)</Lb><input type="number" defaultValue={data.goalWeight||68} onBlur={e=>setData(d=>({...d,goalWeight:parseFloat(e.target.value)||68}))} style={{...IS,fontSize:14,padding:"8px 10px",borderRadius:10}}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><Lb>Daily Calorie Goal (kcal)</Lb><input type="number" defaultValue={data.dailyCalGoal||1800} onBlur={e=>setData(d=>({...d,dailyCalGoal:parseInt(e.target.value)||1800}))} style={{...IS,fontSize:14,padding:"8px 10px",borderRadius:10}}/></div>
          <div><Lb>Total Days Goal</Lb><input type="number" defaultValue={data.targetDays||120} onBlur={e=>setData(d=>({...d,targetDays:parseInt(e.target.value)||120}))} style={{...IS,fontSize:14,padding:"8px 10px",borderRadius:10}}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div><Lb>Protein (g)</Lb><input type="number" defaultValue={(data.macroTargets||{}).p||150} onBlur={e=>setData(d=>({...d,macroTargets:{...(d.macroTargets||{p:150,c:180,f:55}),p:parseInt(e.target.value)||150}}))} style={{...IS,fontSize:14,padding:"8px 8px",borderRadius:10}}/></div>
          <div><Lb>Carbs (g)</Lb><input type="number" defaultValue={(data.macroTargets||{}).c||180} onBlur={e=>setData(d=>({...d,macroTargets:{...(d.macroTargets||{p:150,c:180,f:55}),c:parseInt(e.target.value)||180}}))} style={{...IS,fontSize:14,padding:"8px 8px",borderRadius:10}}/></div>
          <div><Lb>Fat (g)</Lb><input type="number" defaultValue={(data.macroTargets||{}).f||55} onBlur={e=>setData(d=>({...d,macroTargets:{...(d.macroTargets||{p:150,c:180,f:55}),f:parseInt(e.target.value)||55}}))} style={{...IS,fontSize:14,padding:"8px 8px",borderRadius:10}}/></div>
        </div>
        <div style={{marginTop:10,fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".05em"}}>Changes save automatically · Restart date resets the journey</div>
      </Card>
    </div>
  );


  /* ════════ FOOD CALORIE DICTIONARY ════════ */
  // [cal, protein_g, carbs_g, fat_g] per standard serving
  const FOOD_CALS = {
    "egg":             [78,  6,  0,  5],  // per 1 egg
    "eggs":            [78,  6,  0,  5],
    "egg white":       [17,  4,  0,  0],
    "egg whites":      [17,  4,  0,  0],
    "toast":           [79,  3, 15,  1],  // per slice
    "bread":           [79,  3, 15,  1],
    "whole wheat toast":[85, 3, 15,  1],
    "banana":          [105, 1, 27,  0],
    "apple":           [95,  0, 25,  0],
    "orange":          [62,  1, 15,  0],
    "mango":           [99,  1, 25,  0],
    "strawberries":    [49,  1, 12,  0],
    "blueberries":     [57,  1, 14,  0],
    "coffee":          [5,   0,  1,  0],
    "black coffee":    [5,   0,  1,  0],
    "lemon water":     [10,  0,  3,  0],
    "green tea":       [2,   0,  0,  0],
    "tea":             [2,   0,  0,  0],
    "water":           [0,   0,  0,  0],
    "oats":            [150, 5, 27,  3],  // per 40g serving
    "oatmeal":         [150, 5, 27,  3],
    "chicken":         [165, 31, 0,  4],  // per 100g
    "chicken breast":  [165, 31, 0,  4],
    "tuna":            [130, 29, 0,  1],  // per 100g / ~half can
    "salmon":          [208, 20, 0, 13],
    "shrimp":          [99,  24, 0,  1],
    "cod":             [90,  20, 0,  1],
    "tilapia":         [96,  20, 0,  2],
    "fish":            [130, 22, 0,  4],
    "beef":            [215, 26, 0, 12],  // per 100g lean
    "ground beef":     [215, 26, 0, 12],
    "turkey":          [189, 29, 0,  7],
    "rice":            [130, 3,  28, 0],  // per 100g cooked
    "white rice":      [130, 3,  28, 0],
    "brown rice":      [120, 3,  25, 1],
    "quinoa":          [222, 8,  39, 4],  // per 185g cooked cup
    "pasta":           [220, 8,  43, 1],  // per 100g cooked
    "pita":            [165, 5,  33, 1],
    "rice cake":       [35,  1,   7, 0],
    "rice cakes":      [35,  1,   7, 0],
    "lentils":         [116, 9,  20, 0],  // per 100g cooked
    "broccoli":        [35,  3,   7, 0],  // per 100g
    "spinach":         [23,  3,   4, 0],
    "kale":            [49,  4,   9, 1],
    "cucumber":        [16,  1,   4, 0],
    "carrot":          [52,  1,  12, 0],
    "tomato":          [22,  1,   5, 0],
    "onion":           [40,  1,   9, 0],
    "garlic":          [5,   0,   1, 0],
    "mushrooms":       [22,  3,   3, 0],
    "mushroom":        [22,  3,   3, 0],
    "zucchini":        [33,  2,   6, 0],
    "asparagus":       [27,  3,   5, 0],
    "green beans":     [44,  2,  10, 0],
    "cauliflower":     [25,  2,   5, 0],
    "sweet potato":    [103, 2,  24, 0],
    "potato":          [87,  2,  20, 0],
    "salad":           [40,  2,   6, 1],
    "avocado":         [234, 3,  12,21],  // per half
    "almonds":         [58,  2,   2, 5],  // per ~10 almonds (15g)
    "peanut butter":   [94,  4,   3, 8],  // per tbsp
    "olive oil":       [119, 0,   0,14],  // per tbsp
    "cheese":          [113, 7,   0, 9],  // per 28g
    "greek yogurt":    [140, 16,  8, 4],
    "yogurt":          [100, 17,  6, 0],
    "milk":            [122, 8,  12, 5],  // per 240ml
    "cottage cheese":  [110, 14,  3, 2],  // per 113g
    "hummus":          [70,  2,   4, 6],  // per 2 tbsp
    "protein shake":   [120, 24,  4, 1],
    "protein powder":  [120, 24,  3, 1],
    "whey protein":    [120, 24,  3, 1],
    "protein bar":     [200, 20, 22, 7],
  };

  // Split "2 eggs + toast + banana" → estimate total cal/p/c/f
  const estimateCals = (rawName) => {
    if (!rawName || !rawName.trim()) return null;
    const parts = rawName.toLowerCase().split(/[+·,]|\band\b/).map(s => s.trim()).filter(Boolean);
    let cal = 0, p = 0, c = 0, f = 0, matched = 0;
    for (const part of parts) {
      let qty = 1, food = part;
      const gm = part.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)/);   // "150g chicken"
      const nm = part.match(/^(\d+(?:\.\d+)?)\s*x?\s+(.+)/);  // "2 eggs"
      if (gm)      { qty = parseFloat(gm[1]) / 100; food = gm[2].trim(); }
      else if (nm) { qty = parseFloat(nm[1]);        food = nm[2].trim(); }
      let vals = FOOD_CALS[food];
      if (!vals) {
        const key = Object.keys(FOOD_CALS).find(k => food.includes(k) || k.includes(food));
        if (key) vals = FOOD_CALS[key];
      }
      if (vals) {
        cal += Math.round(vals[0] * qty);
        p   += Math.round(vals[1] * qty);
        c   += Math.round(vals[2] * qty);
        f   += Math.round(vals[3] * qty);
        matched++;
      }
    }
    return matched > 0 ? { cal, p, c, f } : null;
  };

  /* ════════ MEAL SUGGESTION DATABASE ════════ */
  const MEAL_DB = {
    breakfast: {
      1:[
        {name:"Scrambled Eggs & Toast",      cal:380,p:28,c:32,f:12,desc:"3 eggs scrambled, 1 whole wheat toast, black coffee"},
        {name:"Banana Oat Bowl",             cal:340,p:12,c:58,f:8, desc:"½ cup oats, 1 banana, cinnamon, water — no sugar"},
        {name:"Egg & Veggie Omelette",       cal:310,p:26,c:8, f:18,desc:"3 eggs, spinach, onion, mushrooms — no cheese"},
        {name:"Boiled Eggs & Fruit",         cal:290,p:20,c:22,f:12,desc:"3 boiled eggs, 1 orange, black coffee"},
        {name:"Egg & Avocado Toast",         cal:400,p:22,c:28,f:20,desc:"2 eggs any style, ½ avocado on whole wheat toast"},
        {name:"Protein Banana Pancakes",     cal:360,p:24,c:40,f:8, desc:"2 eggs + 1 banana blended & pan-fried — zero flour"},
        {name:"Egg & Tomato Scramble",       cal:280,p:24,c:10,f:16,desc:"3 eggs, diced tomato, garlic, olive oil — simple & fast"},
        {name:"Oat & Egg White Bowl",        cal:320,p:28,c:38,f:6, desc:"½ cup oats cooked, 3 egg whites stirred in at end"},
        {name:"Veggie Frittata",             cal:350,p:28,c:12,f:20,desc:"3 eggs, zucchini, peppers, onion baked in pan"},
        {name:"Greek Yogurt + Oats",         cal:310,p:22,c:36,f:6, desc:"½ cup Greek yogurt, ½ cup oats, cinnamon, no honey"},
      ],
      2:[
        {name:"Egg White Omelette",          cal:280,p:32,c:10,f:8, desc:"4 egg whites + 1 yolk, peppers, mushrooms"},
        {name:"Oats & Eggs",                 cal:350,p:24,c:48,f:7, desc:"½ cup oats, 2 boiled eggs on the side"},
        {name:"Greek Yogurt Bowl",           cal:290,p:22,c:28,f:6, desc:"Plain Greek yogurt, banana, 1 tbsp honey"},
        {name:"High Protein Scramble",       cal:340,p:30,c:14,f:16,desc:"4 eggs, spinach, salsa, whole wheat toast"},
        {name:"Cottage Cheese Plate",        cal:300,p:28,c:16,f:10,desc:"½ cup cottage cheese, sliced fruit, handful almonds"},
        {name:"Egg & Smoked Salmon Wrap",    cal:370,p:34,c:22,f:14,desc:"2 eggs, 60g smoked salmon, whole wheat wrap, greens"},
        {name:"Tuna & Egg Breakfast Bowl",   cal:350,p:40,c:10,f:14,desc:"½ can tuna, 2 eggs, cucumber, olive oil — fast and filling"},
        {name:"Overnight Protein Oats",      cal:360,p:24,c:46,f:8, desc:"Oats + Greek yogurt + banana left overnight in fridge"},
        {name:"Poached Eggs on Rye",         cal:330,p:26,c:26,f:14,desc:"2 poached eggs on rye bread, sliced tomato, black coffee"},
        {name:"Mushroom & Egg Skillet",      cal:290,p:26,c:8, f:18,desc:"3 eggs, 100g mushrooms, garlic, olive oil, fresh herbs"},
      ],
      3:[
        {name:"Boiled Eggs + Oats",          cal:320,p:26,c:34,f:10,desc:"3 boiled eggs, ½ cup plain oats, lemon water first"},
        {name:"Clean Egg Scramble",          cal:300,p:28,c:8, f:16,desc:"3 eggs, spinach, black coffee — no toast in Phase 3"},
        {name:"Yogurt + Berries",            cal:240,p:22,c:24,f:4, desc:"Plain Greek yogurt, ½ cup berries, no honey"},
        {name:"Egg Muffins Meal Prep",       cal:290,p:28,c:6, f:16,desc:"4 eggs baked in muffin tin with mixed veg"},
        {name:"Smoked Salmon & Cucumber",    cal:260,p:30,c:4, f:14,desc:"70g salmon, sliced cucumber, lemon, capers — clean Phase 3"},
        {name:"4-Egg White Omelette",        cal:250,p:34,c:6, f:8, desc:"4 egg whites, spinach, mushrooms — max protein, no carbs"},
        {name:"Cottage Cheese & Flax",       cal:240,p:26,c:12,f:8, desc:"½ cup cottage cheese, 1 tbsp flaxseed, ½ cup strawberries"},
        {name:"Protein Shake + Egg",         cal:280,p:36,c:14,f:6, desc:"1 scoop whey in water, 1 boiled egg on the side"},
        {name:"Sardine & Spinach Plate",     cal:270,p:32,c:4, f:14,desc:"1 tin sardines in water, baby spinach, lemon — omega-3 rich"},
        {name:"Egg & Avocado (no toast)",    cal:290,p:20,c:6, f:22,desc:"2 eggs, ½ avocado, cherry tomatoes — healthy fats only"},
      ],
      4:[
        {name:"Clean Egg Bowl",              cal:300,p:30,c:10,f:16,desc:"3 eggs, salsa, spinach — zero carbs at breakfast"},
        {name:"Protein Oats",                cal:330,p:28,c:36,f:8, desc:"Oats + 3 egg whites cooked in, cinnamon only"},
        {name:"Overnight Oats",              cal:350,p:20,c:46,f:8, desc:"Oats, almond milk, chia seeds — prep night before"},
        {name:"Smoked Salmon + Eggs",        cal:310,p:32,c:4, f:18,desc:"2 eggs, 60g smoked salmon, cucumber slices"},
        {name:"5-Egg White Omelette",        cal:270,p:38,c:4, f:8, desc:"5 egg whites, mushrooms, spinach — peak Phase 4 breakfast"},
        {name:"Tuna Breakfast Bowl",         cal:290,p:44,c:4, f:10,desc:"1 can tuna, sliced cucumber, mustard, lemon — no carbs"},
        {name:"Greek Yogurt Protein Bowl",   cal:300,p:32,c:18,f:6, desc:"Full-fat Greek yogurt, protein powder stirred in, berries"},
        {name:"Lean Egg & Veg Scramble",     cal:280,p:30,c:8, f:14,desc:"3 eggs, broccoli, peppers — zero starch, high protein"},
        {name:"Cold Overnight Protein Oats", cal:340,p:28,c:38,f:8, desc:"Oats, whey, almond milk, banana overnight — grab & go"},
        {name:"Poached Egg & Asparagus",     cal:260,p:24,c:6, f:14,desc:"2 poached eggs, steamed asparagus, olive oil — elegant & clean"},
      ],
    },
    lunch: {
      1:[
        {name:"Tuna Rice Bowl",              cal:480,p:38,c:52,f:10,desc:"1 can tuna, 1 cup white rice, cucumber, lemon juice"},
        {name:"Chicken & Lentils",           cal:460,p:42,c:40,f:10,desc:"150g chicken breast, ½ cup lentils, olive oil, garlic"},
        {name:"Egg Salad Plate",             cal:380,p:28,c:14,f:22,desc:"3 hard boiled eggs, big salad, olive oil + lemon"},
        {name:"Bean & Rice Bowl",            cal:440,p:22,c:68,f:8, desc:"Black beans, brown rice, salsa, lime juice"},
        {name:"Chicken Fried Rice",          cal:500,p:40,c:54,f:12,desc:"150g chicken, 1 cup brown rice, peas, egg, soy sauce"},
        {name:"Tuna Pasta Salad",            cal:460,p:36,c:48,f:10,desc:"1 can tuna, whole wheat pasta, cucumber, olive oil"},
        {name:"Lentil & Egg Bowl",           cal:420,p:30,c:44,f:10,desc:"½ cup lentils, 2 boiled eggs, greens, ACV dressing"},
        {name:"Chicken Sandwich (WW)",       cal:470,p:42,c:38,f:12,desc:"150g chicken breast, whole wheat bread, mustard, tomato"},
        {name:"Sardine Rice Bowl",           cal:430,p:38,c:44,f:10,desc:"1 tin sardines, brown rice, cucumber, soy sauce, sesame"},
        {name:"Chickpea & Tuna Salad",       cal:400,p:34,c:36,f:12,desc:"½ cup chickpeas, 1 can tuna, tomato, lemon, olive oil"},
      ],
      2:[
        {name:"Salmon & Sweet Potato",       cal:490,p:40,c:44,f:14,desc:"150g canned salmon, medium sweet potato, mixed greens"},
        {name:"Tuna Big Salad",              cal:380,p:42,c:12,f:14,desc:"2 cans tuna, big salad, olive oil + ACV dressing"},
        {name:"Chicken Stir Fry",            cal:470,p:44,c:36,f:12,desc:"150g chicken, mixed veg, soy sauce, brown rice"},
        {name:"Lentil Veggie Soup",          cal:380,p:22,c:52,f:6, desc:"Red lentils, carrots, celery, cumin — batch cook Sunday"},
        {name:"Turkey & Quinoa Bowl",        cal:480,p:46,c:42,f:10,desc:"150g ground turkey, ½ cup quinoa, roasted veg"},
        {name:"Chicken Burrito Bowl",        cal:510,p:44,c:46,f:12,desc:"Chicken, brown rice, black beans, salsa, no sour cream"},
        {name:"Shrimp & Rice Plate",         cal:450,p:42,c:44,f:8, desc:"150g shrimp, brown rice, steamed broccoli, lemon"},
        {name:"Tuna & Sweet Potato",         cal:460,p:40,c:46,f:8, desc:"1 can tuna, baked sweet potato, olive oil, herbs"},
        {name:"Ground Beef Bowl",            cal:500,p:46,c:36,f:16,desc:"150g lean beef, brown rice, roasted peppers, salsa"},
        {name:"Greek Chicken Plate",         cal:470,p:44,c:20,f:20,desc:"150g chicken, Greek salad, pita half, olive oil"},
      ],
      3:[
        {name:"Protein Power Salad",         cal:420,p:46,c:14,f:18,desc:"200g tuna/chicken, mixed greens, ACV dressing, chickpeas"},
        {name:"Shrimp & Brown Rice",         cal:460,p:44,c:42,f:8, desc:"150g shrimp, ½ cup brown rice, steamed broccoli"},
        {name:"Chicken Lettuce Wraps",       cal:350,p:42,c:10,f:12,desc:"Ground chicken, lettuce cups, cucumber, hot sauce"},
        {name:"Chickpea Power Bowl",         cal:430,p:24,c:52,f:12,desc:"½ cup chickpeas, quinoa, roasted veg, tahini drizzle"},
        {name:"Double Tuna Salad",           cal:380,p:50,c:10,f:14,desc:"2 cans tuna, spinach, tomato, ACV — maximum protein"},
        {name:"Turkey Lettuce Bowl",         cal:370,p:44,c:12,f:14,desc:"150g ground turkey, romaine leaves, salsa, avocado"},
        {name:"Salmon & Greens",             cal:420,p:44,c:8, f:22,desc:"150g salmon, big green salad, olive oil, lemon"},
        {name:"Egg & Quinoa Plate",          cal:440,p:32,c:44,f:14,desc:"2 eggs, ½ cup quinoa, roasted veg, olive oil"},
        {name:"Cottage Cheese Power Bowl",   cal:360,p:36,c:24,f:12,desc:"½ cup cottage cheese, chickpeas, cucumber, herbs"},
        {name:"Tuna & Cauliflower Rice",     cal:340,p:46,c:14,f:10,desc:"2 cans tuna, cauliflower rice stir-fried, soy, garlic"},
      ],
      4:[
        {name:"Lean Protein Plate",          cal:400,p:48,c:16,f:12,desc:"200g chicken or tuna, large salad, lemon + olive oil"},
        {name:"Turkey & Veg Bowl",           cal:420,p:46,c:18,f:10,desc:"150g ground turkey, roasted veg, cauliflower rice"},
        {name:"Double Tuna Plate",           cal:380,p:50,c:8, f:14,desc:"2 cans tuna, cucumber, tomato, mustard, no carbs"},
        {name:"Black Bean Salad",            cal:360,p:20,c:46,f:8, desc:"Black beans, corn, tomato, cilantro, lime"},
        {name:"Chicken & Asparagus",         cal:380,p:50,c:10,f:12,desc:"200g chicken breast, steamed asparagus, lemon, herbs"},
        {name:"Shrimp Power Bowl",           cal:360,p:46,c:12,f:10,desc:"200g shrimp, cucumber, avocado ½, lemon — Phase 4 clean"},
        {name:"Sardine & Egg Plate",         cal:340,p:44,c:4, f:16,desc:"1 tin sardines, 2 hard boiled eggs, greens, mustard"},
        {name:"Turkey Salad (no carbs)",     cal:370,p:48,c:6, f:16,desc:"200g turkey, arugula, cherry tomato, olive oil, ACV"},
        {name:"Cod & Steamed Broccoli",      cal:320,p:46,c:8, f:6, desc:"150g cod fillet, steamed broccoli, lemon, olive oil"},
        {name:"Egg White Protein Plate",     cal:300,p:42,c:6, f:10,desc:"5 egg whites, spinach, tomato, black coffee — peak Phase 4"},
      ],
    },
    snack: {
      1:[
        {name:"Apple & Almonds",             cal:180,p:4, c:24,f:10,desc:"1 medium apple, 10 raw almonds"},
        {name:"Banana & Peanut Butter",      cal:210,p:6, c:28,f:8, desc:"1 banana, 1 tbsp natural peanut butter"},
        {name:"Hard Boiled Egg",             cal:80, p:6, c:0, f:6, desc:"1 hard boiled egg, pinch of salt"},
        {name:"Carrot & Hummus",             cal:140,p:6, c:18,f:6, desc:"1 cup baby carrots, 2 tbsp hummus"},
        {name:"Greek Yogurt Cup",            cal:140,p:16,c:8, f:4, desc:"Plain Greek yogurt, no toppings — quick and clean"},
        {name:"Orange & Walnuts",            cal:170,p:4, c:22,f:8, desc:"1 orange, small handful walnuts — antioxidants + fats"},
        {name:"Rice Cake & Peanut Butter",   cal:160,p:5, c:20,f:7, desc:"1 rice cake, 1 tbsp natural peanut butter, banana slices"},
        {name:"Tuna & Crackers",             cal:190,p:20,c:14,f:6, desc:"½ can tuna, 4 whole grain crackers, mustard"},
        {name:"Boiled Egg + Apple",          cal:175,p:6, c:25,f:5, desc:"1 boiled egg, 1 small apple — protein + natural sugar"},
        {name:"Cottage Cheese Cup",          cal:120,p:14,c:6, f:4, desc:"½ cup low-fat cottage cheese — slow digesting protein"},
      ],
      2:[
        {name:"Greek Yogurt",                cal:140,p:16,c:8, f:4, desc:"Plain low-fat Greek yogurt, no toppings"},
        {name:"Rice Cakes & Tuna",           cal:160,p:18,c:16,f:2, desc:"2 rice cakes, ½ can tuna — clean and filling"},
        {name:"Boiled Egg + Cucumber",       cal:100,p:8, c:4, f:6, desc:"1 egg, ½ cucumber sliced with salt"},
        {name:"Cottage Cheese",              cal:120,p:14,c:6, f:4, desc:"½ cup low-fat cottage cheese — slow protein"},
        {name:"Protein Shake",               cal:120,p:24,c:4, f:1, desc:"1 scoop whey isolate in water — between meals if needed"},
        {name:"Apple & Walnuts",             cal:180,p:3, c:24,f:9, desc:"1 apple, 5 walnut halves — fiber + omega-3"},
        {name:"Sardine & Rice Cake",         cal:150,p:18,c:12,f:4, desc:"½ tin sardines, 1 rice cake — cheap, clean, high protein"},
        {name:"Almond Butter & Celery",      cal:140,p:4, c:8, f:11,desc:"1 tbsp almond butter, 3 celery stalks — filling crunch"},
        {name:"Hard Boiled Eggs ×2",         cal:160,p:12,c:0, f:12,desc:"2 hard boiled eggs, salt + pepper — simple satiety"},
        {name:"Mango Chunks",                cal:100,p:1, c:25,f:0, desc:"½ mango — natural carbs, zero processed sugar"},
      ],
      3:[
        {name:"Boiled Egg Only",             cal:80, p:6, c:0, f:6, desc:"1 hard boiled egg — clean, zero carbs"},
        {name:"Skip / Intermittent Fast",    cal:0,  p:0, c:0, f:0, desc:"Best option in Phase 3 — skip snack, fast until dinner"},
        {name:"Black Coffee",                cal:5,  p:0, c:1, f:0, desc:"Black coffee kills hunger, zero calories"},
        {name:"Cucumber Slices",             cal:20, p:1, c:4, f:0, desc:"Sliced cucumber, salt, chili flakes — fills the stomach"},
        {name:"Boiled Eggs ×2",              cal:160,p:12,c:0, f:12,desc:"2 boiled eggs if hunger is strong — no carbs"},
        {name:"Sparkling Water + Lemon",     cal:5,  p:0, c:1, f:0, desc:"Carbonation curbs appetite — zero calories Phase 3 hack"},
        {name:"Celery Sticks",               cal:15, p:0, c:3, f:0, desc:"Unlimited celery — negative calorie, fills stomach"},
        {name:"Sardines (water packed)",     cal:120,p:22,c:0, f:4, desc:"½ tin sardines in water only — protein with minimal cals"},
        {name:"Green Tea × 2",              cal:4,  p:0, c:1, f:0, desc:"2 cups green tea, no sugar — metabolism + appetite control"},
        {name:"Protein Shake (half)",        cal:60, p:12,c:2, f:1, desc:"Half scoop whey in water if hunger is severe — last resort"},
      ],
      4:[
        {name:"Skip Snack",                  cal:0,  p:0, c:0, f:0, desc:"No snack — meals are fully optimized in Phase 4"},
        {name:"Green Tea",                   cal:2,  p:0, c:0, f:0, desc:"Green tea, no sugar — metabolic boost"},
        {name:"15 Almonds",                  cal:100,p:4, c:4, f:9, desc:"Exactly 15 almonds — healthy fat, portion controlled"},
        {name:"Protein Shake (water)",       cal:120,p:24,c:4, f:1, desc:"Whey isolate in water only if very hungry"},
        {name:"Black Coffee + Cinnamon",     cal:8,  p:0, c:2, f:0, desc:"Black coffee with cinnamon — insulin sensitivity + no cals"},
        {name:"2 Hard Boiled Eggs",          cal:160,p:12,c:0, f:12,desc:"2 eggs — absolute minimum clean snack in Phase 4"},
        {name:"Sparkling Water Fast",        cal:0,  p:0, c:0, f:0, desc:"Sparkling water only — extend the fast through afternoon"},
        {name:"5 Walnut Halves",             cal:90, p:2, c:2, f:9, desc:"5 walnut halves — brain fuel, healthy omega-3, nothing else"},
        {name:"½ Scoop Whey (water)",        cal:60, p:12,c:2, f:0, desc:"Half scoop whey protein in plain water — emergency only"},
        {name:"Celery & Mustard",            cal:25, p:1, c:4, f:0, desc:"Celery with mustard dip — near-zero calorie crunch Phase 4"},
      ],
    },
    dinner: {
      1:[
        {name:"Chicken & Broccoli Bowl",     cal:480,p:46,c:36,f:12,desc:"150g chicken, 1 cup brown rice, steamed broccoli, olive oil"},
        {name:"Lentil Dal & Rice",           cal:420,p:24,c:58,f:6, desc:"Red lentils, tomatoes, cumin, garlic, brown rice"},
        {name:"Baked Chicken & Veg",         cal:440,p:48,c:20,f:12,desc:"150g chicken breast, roasted zucchini + carrots"},
        {name:"Tuna & Rice Bowl",            cal:460,p:40,c:48,f:8, desc:"1 can tuna, brown rice, steamed broccoli, soy sauce"},
        {name:"Chicken & Sweet Potato",      cal:490,p:44,c:42,f:10,desc:"150g chicken, baked sweet potato, olive oil, herbs"},
        {name:"Turkey & Rice Bowl",          cal:470,p:42,c:46,f:8, desc:"150g ground turkey, brown rice, steamed broccoli, garlic"},
        {name:"Egg Fried Rice Bowl",         cal:450,p:28,c:52,f:14,desc:"2 eggs, brown rice, peas, carrots, soy sauce — filling"},
        {name:"Salmon & Brown Rice",         cal:500,p:42,c:44,f:14,desc:"150g salmon fillet, brown rice, lemon, steamed green beans"},
        {name:"Chickpea Curry & Rice",       cal:430,p:20,c:62,f:8, desc:"Chickpeas in tomato-cumin sauce, brown rice — batch friendly"},
        {name:"Steak & Veggie Plate",        cal:510,p:48,c:14,f:26,desc:"150g lean steak, steamed broccoli, garlic butter — treat night"},
      ],
      2:[
        {name:"Chicken & Quinoa",            cal:480,p:48,c:42,f:10,desc:"200g chicken breast, ½ cup quinoa, steamed zucchini"},
        {name:"Salmon & Green Beans",        cal:460,p:44,c:10,f:22,desc:"150g salmon, green beans, olive oil, lemon"},
        {name:"Turkey Meatballs & Veg",      cal:440,p:44,c:22,f:16,desc:"Ground turkey, tomato sauce, zucchini noodles"},
        {name:"Stir Fry & Brown Rice",       cal:490,p:46,c:46,f:8, desc:"Chicken, mixed veg, low-sodium soy, brown rice"},
        {name:"Baked Salmon & Asparagus",    cal:460,p:46,c:8, f:24,desc:"150g salmon, asparagus, olive oil, lemon — premium clean"},
        {name:"Shrimp & Quinoa Bowl",        cal:450,p:46,c:40,f:10,desc:"150g shrimp, ½ cup quinoa, roasted peppers, garlic"},
        {name:"Turkey Chili",                cal:430,p:44,c:36,f:10,desc:"Ground turkey, black beans, tomato, cumin — batch cook"},
        {name:"Chicken Tikka (no cream)",    cal:470,p:48,c:22,f:16,desc:"Chicken in tomato-spice sauce, no cream, with basmati rice"},
        {name:"Tuna Steak & Veg",            cal:420,p:50,c:10,f:16,desc:"150g tuna steak, steamed broccoli + beans, olive oil"},
        {name:"Cod & Sweet Potato Mash",     cal:450,p:44,c:38,f:10,desc:"150g cod fillet, sweet potato mash, steamed greens"},
      ],
      3:[
        {name:"Lean Protein + Veg Only",     cal:380,p:46,c:12,f:14,desc:"150g chicken/fish, large steamed veg — NO starch at dinner"},
        {name:"Shrimp Stir Fry (no rice)",   cal:360,p:42,c:14,f:10,desc:"200g shrimp, bok choy, garlic — no rice in Phase 3"},
        {name:"Baked Cod & Asparagus",       cal:320,p:44,c:8, f:8, desc:"150g cod, asparagus, lemon, herbs — super lean"},
        {name:"Ground Turkey Bowl",          cal:400,p:46,c:16,f:14,desc:"150g turkey, cauliflower rice, salsa, no real carbs"},
        {name:"Chicken & Cauliflower Rice",  cal:370,p:48,c:14,f:12,desc:"150g chicken, cauliflower rice stir-fried with garlic"},
        {name:"Salmon & Steamed Broccoli",   cal:400,p:44,c:8, f:20,desc:"150g salmon, steamed broccoli, lemon, dill — no starch"},
        {name:"Turkey & Zucchini Noodles",   cal:360,p:44,c:12,f:14,desc:"150g turkey, zucchini spirals, tomato sauce — zero carbs"},
        {name:"Baked Chicken Thighs & Veg",  cal:390,p:46,c:10,f:18,desc:"2 chicken thighs skinless, roasted broccoli + peppers"},
        {name:"Tuna & Steamed Spinach",      cal:300,p:46,c:6, f:8, desc:"2 cans tuna, steamed spinach, garlic, olive oil splash"},
        {name:"White Fish & Green Beans",    cal:310,p:44,c:8, f:8, desc:"150g tilapia, green beans, lemon, herbs — ultra clean"},
      ],
      4:[
        {name:"Grilled Chicken & Greens",    cal:360,p:48,c:8, f:12,desc:"200g chicken, massive salad, olive oil — max protein"},
        {name:"Tuna & Steamed Veg",          cal:300,p:46,c:8, f:6, desc:"2 cans tuna, broccoli, green beans, lemon — cleanest meal"},
        {name:"Egg White Omelette",          cal:280,p:32,c:6, f:12,desc:"5 egg whites, mushrooms, spinach — light and lean"},
        {name:"White Fish & Veg",            cal:320,p:44,c:10,f:8, desc:"150g tilapia or cod, steamed veg, herbs"},
        {name:"Shrimp & Cucumber Salad",     cal:290,p:44,c:8, f:8, desc:"200g shrimp, cucumber, cherry tomato, lemon — Phase 4 peak"},
        {name:"Chicken Breast & Asparagus",  cal:340,p:50,c:6, f:10,desc:"200g chicken breast, steamed asparagus, lemon, olive oil"},
        {name:"Salmon Salad (no dressing)",  cal:350,p:44,c:6, f:18,desc:"150g salmon, arugula, cherry tomato, lemon only — clean"},
        {name:"Ground Turkey & Cauliflower", cal:340,p:46,c:12,f:12,desc:"200g turkey, cauliflower rice, spinach, garlic — Phase 4"},
        {name:"Cod & Kale Plate",            cal:300,p:44,c:8, f:8, desc:"150g cod, sautéed kale, garlic, lemon — cleanest dinner"},
        {name:"Turkey Breast Plate",         cal:320,p:50,c:4, f:10,desc:"200g turkey breast, steamed broccoli, mustard — competition prep"},
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
      if(!name) return;
      const est = estimateCals(name);
      const finalCal = parseInt(cal) || (est ? est.cal : 0);
      if (!finalCal && !cal) return; // need either manual or estimated cal
      const entry = {
        id: Date.now(), name, cal: finalCal,
        p: est ? est.p : 0, c: est ? est.c : 0, f: est ? est.f : 0,
        meal: mealType,
        time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
        custom: true, autoEst: !cal && !!est,
      };
      upd(cd, "foodLog", [...(l.foodLog||[]), entry]);
    };

    const removeFood = (id) => {
      upd(cd, "foodLog", (l.foodLog||[]).filter(f=>f.id!==id));
    };

    const saveEditFood = (id) => {
      if (!editFoodName.trim()) return;
      const est = estimateCals(editFoodName);
      const finalCal = parseInt(editFoodCal) || (est ? est.cal : 0);
      upd(cd, "foodLog", (l.foodLog||[]).map(f => f.id !== id ? f : {
        ...f,
        name: editFoodName.trim(),
        cal: finalCal,
        p: editFoodP !== "" ? parseInt(editFoodP)||0 : (est ? est.p : f.p),
        c: est ? est.c : f.c,
        f: est ? est.f : f.f,
        autoEst: editFoodCal === "" && !!est,
      }));
      setEditingFoodId(null);
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
          {[{id:"log",l:"Log"},{id:"suggest",l:"Suggest"},{id:"water",l:"Water"},{id:"grocery",l:"Grocery"},{id:"stats",l:"Stats"}].map(t=>(
            <button key={t.id} style={TAB_STYLE(dietTab===t.id)} onClick={()=>setDietTab(t.id)}>{t.l}</button>
          ))}
        </div>

        {/* ═══ TAB: FOOD LOG ═══ */}
        {dietTab==="log" && (
          <div>
            {/* ── DAILY TARGETS BANNER ── */}
            {(()=>{
              const startW2  = data.startWeight || 80;
              const goalWt2  = data.goalWeight  || 68;
              const tDays2   = data.targetDays  || 120;
              const kgLeft2  = Math.max(0, (latW||startW2) - goalWt2);
              const daysLeft2 = Math.max(1, tDays2 - cd + 1);
              const neededDeficit2 = Math.round(kgLeft2 * 7700 / daysLeft2);
              const eatTarget2     = Math.max(1200, Math.round(2200 - neededDeficit2));
              const exerciseBurn2  = Math.max(0, neededDeficit2 - (2200 - eatTarget2));
              const todayDeficit2  = totalBurn - calsIn;
              const onTrack2 = todayDeficit2 >= neededDeficit2 * 0.8;
              const remaining2 = eatTarget2 - calsIn;
              return (
                <div style={{marginBottom:14,padding:"16px",background:`linear-gradient(135deg,rgba(180,255,80,0.08),rgba(0,200,255,0.05),rgba(255,255,255,0.02))`,borderRadius:20,border:`1.5px solid ${onTrack2?T.lime+"44":"rgba(255,150,60,0.4)"}`}}>
                  {/* Status row */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div>
                      <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".14em",marginBottom:3}}>📊 TODAY'S CALORIE PLAN</div>
                      <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:18,color:T.t1,lineHeight:1.2}}>
                        {remaining2>0?`${remaining2} kcal left to eat`:"Calorie goal reached"}
                      </div>
                    </div>
                    <div style={{background:onTrack2?"rgba(180,255,80,0.15)":"rgba(255,150,60,0.15)",borderRadius:10,padding:"6px 11px",border:`1px solid ${onTrack2?T.lime+"44":"rgba(255,150,60,0.4)"}`}}>
                      <div style={{fontFamily:T.fM,fontSize:9,fontWeight:800,color:onTrack2?T.lime:"#FF9F0A",letterSpacing:".1em"}}>{onTrack2?"✓ ON TRACK":"ADJUST"}</div>
                    </div>
                  </div>
                  {/* 4 numbers */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>
                    {[
                      {label:"EAT TARGET",value:eatTarget2,unit:"kcal",color:T.cyan,icon:"🍽️",desc:"daily intake goal"},
                      {label:"BURN TARGET",value:totalBurn,unit:"kcal",color:T.mag,icon:"🔥",desc:"total incl. BMR"},
                      {label:"DEFICIT",value:neededDeficit2,unit:"kcal",color:T.lime,icon:"📉",desc:"needed per day"},
                      {label:"EXERCISE",value:Math.round(((latW||startW2)/10000)*400)||300,unit:"kcal",color:"#FF9F0A",icon:"💪",desc:"burn from activity"},
                    ].map((t,i)=>(
                      <div key={i} style={{background:"rgba(255,255,255,0.05)",borderRadius:13,padding:"10px 7px",textAlign:"center"}}>
                        <div style={{fontSize:14,marginBottom:3}}>{t.icon}</div>
                        <div style={{fontFamily:T.fM,fontSize:15,fontWeight:800,color:t.color,lineHeight:1,letterSpacing:"-0.01em"}}>{t.value.toLocaleString()}</div>
                        <div style={{fontFamily:T.fM,fontSize:7,color:T.t3,marginTop:2,letterSpacing:".06em"}}>{t.unit}</div>
                        <div style={{fontFamily:T.fM,fontSize:7,color:T.t3,marginTop:1}}>{t.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Eat progress bar */}
                  <div style={{marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontFamily:T.fM,fontSize:9,color:T.t3}}>Eaten today: <span style={{color:T.cyan,fontWeight:700}}>{calsIn.toLocaleString()} kcal</span></span>
                      <span style={{fontFamily:T.fM,fontSize:9,color:calsIn>eatTarget2?T.mag:T.lime,fontWeight:600}}>
                        {calsIn>eatTarget2?`${(calsIn-eatTarget2).toLocaleString()} over`:`${remaining2.toLocaleString()} remaining`}
                      </span>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:999,height:7,overflow:"hidden",position:"relative"}}>
                      <div style={{width:`${Math.min(100,Math.round((calsIn/eatTarget2)*100))}%`,height:"100%",background:calsIn>eatTarget2?"linear-gradient(90deg,#FF453A,#FF9F0A)":`linear-gradient(90deg,${T.cyan},${T.lime})`,borderRadius:999,transition:"width 1s cubic-bezier(.22,.68,0,1.2)"}}/>
                    </div>
                  </div>
                  {/* Deficit bar */}
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontFamily:T.fM,fontSize:9,color:T.t3}}>Deficit so far: <span style={{color:todayDeficit2>0?T.lime:T.mag,fontWeight:700}}>{Math.abs(todayDeficit2).toLocaleString()} kcal {todayDeficit2>0?"✓":""}</span></span>
                      <span style={{fontFamily:T.fM,fontSize:9,color:T.t3}}>target: <span style={{color:T.lime}}>{neededDeficit2.toLocaleString()}</span></span>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.08)",borderRadius:999,height:7,overflow:"hidden"}}>
                      <div style={{width:`${Math.min(100,Math.max(0,Math.round((todayDeficit2/neededDeficit2)*100)))}%`,height:"100%",background:`linear-gradient(90deg,${T.lime},#00ffc8)`,borderRadius:999,transition:"width 1s cubic-bezier(.22,.68,0,1.2)"}}/>
                    </div>
                  </div>
                </div>
              );
            })()}

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
              {/* Calorie bar vs user goal */}
              {(()=>{
                const calGoal = data.dailyCalGoal || meals.cal || 1800;
                const remaining = calGoal - calsIn;
                const barPct = Math.min(100, (calsIn / calGoal) * 100);
                const over = calsIn > calGoal;
                return (
                  <div style={{marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span className="mono" style={{fontSize:10,color:T.t3}}>{calsIn} eaten</span>
                      <button onClick={()=>{setGoalCalInput(String(data.dailyCalGoal||1800));setShowGoalEdit(g=>!g);}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
                        <span className="mono" style={{fontSize:10,color:T.lime,fontWeight:600,borderBottom:`1px dashed ${T.lime}`}}>Goal: {calGoal} kcal</span>
                      </button>
                      <span className="mono" style={{fontSize:10,color:over?T.mag:T.lime,fontWeight:600}}>{over?"+"+(calsIn-calGoal):remaining+" left"}</span>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.07)",borderRadius:6,height:8,overflow:"hidden",position:"relative"}}>
                      <div style={{width:`${barPct}%`,height:"100%",background:over?"linear-gradient(90deg,"+T.mag+",#ff6b35)":"linear-gradient(90deg,"+T.cyan+","+T.lime+")",borderRadius:6,transition:"width 1s cubic-bezier(.22,.68,0,1.2)"}}/>
                    </div>
                    {showGoalEdit && (
                      <div style={{marginTop:10,display:"flex",gap:6}}>
                        <input type="number" value={goalCalInput} onChange={e=>setGoalCalInput(e.target.value)} placeholder="1800" style={{...IS,flex:1,fontSize:14,padding:"8px 10px",borderRadius:10}}/>
                        <button className="press" onClick={()=>{setData(d=>({...d,dailyCalGoal:parseInt(goalCalInput)||1800}));setShowGoalEdit(false);}} style={{padding:"8px 14px",borderRadius:10,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer"}}>SET</button>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div style={{fontSize:10,color:T.txt3}}>{loggedCals>0?`${foodLog.length} items logged`:"No items logged yet — tap Suggestions to add meals"}</div>
            </Card>

            {/* ── Feature 3: Macro Progress Rings ── */}
            {(()=>{
              const todayP = foodLog.reduce((s,f)=>s+(f.p||0),0);
              const todayC = foodLog.reduce((s,f)=>s+(f.c||0),0);
              const todayF = foodLog.reduce((s,f)=>s+(f.f||0),0);
              const mt = data.macroTargets || {p:150,c:180,f:55};
              const tgtP = mt.p || 150;
              const tgtC = mt.c || 180;
              const tgtF = mt.f || 55;
              const rings = [
                {label:"PROTEIN",actual:todayP,target:tgtP,color:T.lime},
                {label:"CARBS",  actual:todayC,target:tgtC,color:T.cyan},
                {label:"FAT",    actual:todayF,target:tgtF,color:T.mag},
              ];
              const CIRC = 150.8;
              return (
                <Card style={{padding:16,marginBottom:14}}>
                  <div className="eyebrow" style={{marginBottom:14}}>MACRO TARGETS</div>
                  <div style={{display:"flex",justifyContent:"space-around",gap:8}}>
                    {rings.map(ring=>{
                      const pct = Math.min(100,Math.round((ring.actual/ring.target)*100));
                      const dash = pct*1.508;
                      return (
                        <div key={ring.label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                          <svg width="60" height="60" viewBox="0 0 60 60">
                            <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
                            <circle cx="30" cy="30" r="24" fill="none" stroke={ring.color} strokeWidth="5"
                              strokeDasharray={dash + " " + CIRC}
                              strokeDashoffset="0"
                              strokeLinecap="round"
                              transform="rotate(-90 30 30)"
                              style={{transition:"stroke-dasharray 1s cubic-bezier(.22,.68,0,1.2)"}}/>
                            <text x="30" y="34" textAnchor="middle" fill={ring.color}
                              fontSize="9" fontFamily="'JetBrains Mono',monospace" fontWeight="600">
                              {pct}%
                            </text>
                          </svg>
                          <div style={{fontFamily:T.fM,fontSize:8,color:T.t3,letterSpacing:".1em"}}>{ring.label}</div>
                          <div style={{fontFamily:T.fM,fontSize:10,color:T.t2}}>{ring.actual}g / {ring.target}g</div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Edit macro goals */}
                  <button onClick={()=>{setGoalPInput(String(tgtP));setGoalCInput(String(tgtC));setGoalFInput(String(tgtF));setShowGoalEdit(g=>!g);}} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",padding:0}}>
                    <span className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".08em",borderBottom:"1px dashed rgba(255,255,255,0.2)"}}>EDIT GOALS</span>
                  </button>
                  {showGoalEdit && (
                    <div style={{marginTop:10,display:"flex",gap:6,alignItems:"flex-end"}}>
                      <div style={{flex:1}}><div className="mono" style={{fontSize:8,color:T.t3,marginBottom:4}}>PROTEIN g</div><input type="number" value={goalPInput} onChange={e=>setGoalPInput(e.target.value)} style={{...IS,fontSize:13,padding:"6px 8px",borderRadius:8}}/></div>
                      <div style={{flex:1}}><div className="mono" style={{fontSize:8,color:T.t3,marginBottom:4}}>CARBS g</div><input type="number" value={goalCInput} onChange={e=>setGoalCInput(e.target.value)} style={{...IS,fontSize:13,padding:"6px 8px",borderRadius:8}}/></div>
                      <div style={{flex:1}}><div className="mono" style={{fontSize:8,color:T.t3,marginBottom:4}}>FAT g</div><input type="number" value={goalFInput} onChange={e=>setGoalFInput(e.target.value)} style={{...IS,fontSize:13,padding:"6px 8px",borderRadius:8}}/></div>
                      <button className="press" onClick={()=>{setData(d=>({...d,macroTargets:{p:parseInt(goalPInput)||150,c:parseInt(goalCInput)||180,f:parseInt(goalFInput)||55}}));setShowGoalEdit(false);}} style={{padding:"7px 12px",borderRadius:8,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:10,fontWeight:700,cursor:"pointer"}}>SAVE</button>
                    </div>
                  )}
                </Card>
              );
            })()}

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
                      {editingFoodId===item.id ? (
                        <div style={{padding:"10px 0"}}>
                          <input
                            value={editFoodName} onChange={e=>{ setEditFoodName(e.target.value); if(editFoodCal===""){const est=estimateCals(e.target.value); if(est) setEditFoodCal(String(est.cal));} }}
                            style={{...IS,marginBottom:6,fontSize:13}}
                            placeholder="Food name"
                          />
                          <div style={{display:"flex",gap:6}}>
                            <input type="number" placeholder="kcal (auto if blank)"
                              value={editFoodCal} onChange={e=>setEditFoodCal(e.target.value)}
                              style={{...IS,flex:1,fontSize:13}}/>
                            <input type="number" placeholder="Protein g"
                              value={editFoodP} onChange={e=>setEditFoodP(e.target.value)}
                              style={{...IS,width:80,fontSize:13}}/>
                            <button className="press" onClick={()=>saveEditFood(item.id)}
                              style={{padding:"10px 14px",borderRadius:T.r2,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:".08em"}}>
                              SAVE
                            </button>
                            <button className="press" onClick={()=>setEditingFoodId(null)}
                              style={{padding:"10px 12px",borderRadius:T.r2,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:11,cursor:"pointer"}}>
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 0"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,color:T.txt,fontWeight:500}}>{item.name}</div>
                            <div style={{fontSize:10,color:T.txt3,marginTop:1}}>
                              {item.cal} kcal{item.p>0?` · ${item.p}g protein`:""}{item.autoEst?" · auto-est":""}{item.time?` · ${item.time}`:""}
                            </div>
                          </div>
                          {/* Edit button */}
                          <button className="press"
                            onClick={()=>{ setEditingFoodId(item.id); setEditFoodName(item.name); setEditFoodCal(String(item.cal)); setEditFoodP(String(item.p||"")); }}
                            style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            ✎
                          </button>
                          {/* Delete button */}
                          <button className="press" onClick={()=>removeFood(item.id)}
                            style={{width:28,height:28,borderRadius:8,background:T.magS,border:`1px solid ${T.mag}`,color:T.mag,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            🗑
                          </button>
                        </div>
                      )}
                      {i<items.length-1&&<Dv/>}
                    </div>
                  ))}
                  {showAdd&&(
                    <div style={{marginTop:items.length>0?12:0,padding:"12px",background:T.sur2,borderRadius:T.r2}}>
                      <div style={{fontSize:11,color:T.txt3,marginBottom:8,fontWeight:500}}>LOG CUSTOM FOOD</div>
                      <input placeholder="e.g. 2 eggs + toast + banana"
                        value={cName}
                        onChange={e=>{ setCName(e.target.value); if(cCal===""){const est=estimateCals(e.target.value); if(est) setCCal(String(est.cal)); else setCCal(""); } }}
                        style={{...IS,marginBottom:6,fontSize:14}}/>
                      {cName&&!cCal&&(()=>{const est=estimateCals(cName);return est?<div style={{fontSize:10,color:T.lime,marginBottom:6,fontFamily:T.fM}}>⚡ Auto: {est.cal} kcal · {est.p}g protein</div>:null;})()}
                      <div style={{display:"flex",gap:8}}>
                        <input type="number" placeholder="Calories (auto-filled if known)"
                          value={cCal} onChange={e=>setCCal(e.target.value)}
                          style={{...IS,flex:1,fontSize:14}}/>
                        <button className="press"
                          onClick={()=>{ if(cName.trim()){addCustomFood(cName,cCal,mt.key); setCName(""); setCCal(""); setShowAdd(false);} }}
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
              confirmResetLog ? (
                <div style={{marginBottom:14,padding:"14px 16px",borderRadius:12,background:"rgba(255,80,80,0.08)",border:"1px solid rgba(255,80,80,0.25)"}}>
                  <div style={{fontSize:13,color:T.t1,fontWeight:600,marginBottom:10}}>Reset all food entries for Day {cd}?</div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="press" onClick={()=>{ upd(cd,"foodLog",[]); setConfirmResetLog(false); }}
                      style={{flex:1,padding:11,borderRadius:10,background:T.mag,border:"none",color:"#fff",fontFamily:T.fM,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:".05em"}}>
                      YES, RESET
                    </button>
                    <button className="press" onClick={()=>setConfirmResetLog(false)}
                      style={{flex:1,padding:11,borderRadius:10,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:12,cursor:"pointer"}}>
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <button className="press" onClick={()=>setConfirmResetLog(true)}
                  style={{width:"100%",padding:12,borderRadius:12,background:T.magS,border:`1px solid ${T.mag}`,color:T.mag,fontFamily:T.fM,fontSize:11,fontWeight:600,cursor:"pointer",marginBottom:14,letterSpacing:".05em"}}>
                  🗑 Reset All Food Entries
                </button>
              )
            )}
          </div>
        )}

        {/* ═══ TAB: SUGGESTIONS ═══ */}
        {dietTab==="suggest" && (
          <div>
            {/* Sub-tab: Daily / Weekly / Phase */}
            <div style={{display:"flex",gap:6,marginBottom:14,background:"rgba(255,255,255,0.04)",padding:4,borderRadius:12}}>
              {[{id:"daily",l:"Today's Pick"},{id:"weekly",l:"This Week"},{id:"phase",l:"All (Phase "+ph+")"}].map(t=>(
                <button key={t.id} style={{flex:1,padding:"8px 4px",border:"none",borderRadius:9,background:suggestView===t.id?T.lime:"transparent",color:suggestView===t.id?"#000":T.t2,fontFamily:T.fM,fontSize:10,fontWeight:suggestView===t.id?700:400,letterSpacing:".05em",textTransform:"uppercase",cursor:"pointer",transition:"all .2s"}}
                  onClick={()=>setSuggestView(t.id)}>{t.l}</button>
              ))}
            </div>

            {/* DAILY — all 10 options per meal, today's pick highlighted */}
            {suggestView==="daily" && (
              <div>
                <div style={{fontSize:12,color:T.t3,marginBottom:16,lineHeight:1.7}}>
                  10 meal options per slot · Phase {ph} · Day {cd}. <span style={{color:T.lime,fontWeight:600}}>⭐ = today's recommended pick.</span> Swipe cards →
                </div>
                {MEAL_TYPES.map(mt=>{
                  const sugs = MEAL_DB[mt.key]?.[ph] || [];
                  const todayIdx = (cd-1) % Math.max(1,sugs.length);
                  return (
                    <div key={mt.key} style={{marginBottom:24}}>
                      {/* Section header */}
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <span style={{fontSize:20}}>{mt.icon}</span>
                        <div style={{fontFamily:T.fM,fontSize:12,fontWeight:700,color:T.t1,letterSpacing:".09em",textTransform:"uppercase"}}>{mt.label}</div>
                        <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,marginLeft:2}}>· {sugs.length} options</div>
                      </div>
                      {/* Horizontal scroll row */}
                      <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:6,scrollSnapType:"x mandatory",WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none"}}>
                        {sugs.map((s,i)=>{
                          const isToday = i===todayIdx;
                          return (
                            <div key={i} style={{
                              minWidth:185,maxWidth:185,flexShrink:0,
                              background:isToday?"rgba(180,255,80,0.07)":"rgba(255,255,255,0.04)",
                              borderRadius:16,
                              border:`1.5px solid ${isToday?T.lime+"60":"rgba(255,255,255,0.07)"}`,
                              padding:"13px 12px",
                              scrollSnapAlign:"start",
                              position:"relative",
                              transition:"border-color .2s",
                            }}>
                              {isToday&&(
                                <div style={{position:"absolute",top:9,right:9,fontFamily:T.fM,fontSize:8,background:T.lime,color:"#000",borderRadius:6,padding:"2px 7px",letterSpacing:".06em",fontWeight:800}}>⭐ TODAY</div>
                              )}
                              <div style={{fontSize:13,fontWeight:700,color:T.t1,lineHeight:1.35,marginBottom:5,paddingRight:isToday?44:0}}>{s.name}</div>
                              <div style={{fontSize:10,color:T.t3,lineHeight:1.5,marginBottom:10,minHeight:44}}>{s.desc}</div>
                              {/* Macro pills */}
                              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:11}}>
                                {[["🔥",s.cal,"kcal","#FF9F0A"],["💪",s.p+"g","P","#0A84FF"],["🌾",s.c+"g","C","#FFD60A"],["🥑",s.f+"g","F","#30D158"]].map(([ic,v,lb,c])=>(
                                  <div key={lb} style={{background:"rgba(255,255,255,0.06)",borderRadius:7,padding:"3px 7px",display:"flex",alignItems:"center",gap:3}}>
                                    <span style={{fontSize:9}}>{ic}</span>
                                    <span style={{fontSize:10,fontWeight:700,color:c}}>{v}</span>
                                    <span style={{fontSize:8,color:T.t3}}>{lb}</span>
                                  </div>
                                ))}
                              </div>
                              <button className="press" onClick={()=>addFood(s,mt.key)}
                                style={{width:"100%",padding:"8px",borderRadius:10,background:isToday?T.lime:"rgba(255,255,255,0.08)",border:isToday?"none":`1px solid rgba(255,255,255,0.10)`,color:isToday?"#000":T.t2,fontFamily:T.fM,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:".07em",transition:"all .15s"}}>
                                + LOG
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <Card style={{padding:14,marginTop:4}}>
                  <div className="eyebrow" style={{color:T.mag,marginBottom:6}}>🚫 AVOID THIS PHASE</div>
                  <div style={{fontSize:13,color:T.t2,lineHeight:1.7}}>{meals.avoid}</div>
                </Card>
              </div>
            )}

            {/* WEEKLY PLAN — 7-day rotating picks, one per meal */}
            {suggestView==="weekly" && (
              <div>
                <div style={{fontSize:12,color:T.t3,marginBottom:14,lineHeight:1.6}}>Full week meal plan for the current phase. One clean meal per slot, every day different.</div>
                {Array.from({length:7},(_,i)=>{
                  const dayNum = Math.max(1,cd-3+i); // centre current day
                  const isToday = dayNum===cd;
                  const dayLabel = data.startDate ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(new Date(data.startDate).getTime()+(dayNum-1)*86400000).getDay()] : "D"+dayNum;
                  return (
                    <div key={i} style={{marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <div style={{fontFamily:T.fM,fontSize:11,fontWeight:600,color:isToday?T.lime:T.t3,letterSpacing:".08em"}}>{dayLabel.toUpperCase()}{isToday?" · TODAY":""}</div>
                        <div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}}/>
                        <div style={{fontFamily:T.fM,fontSize:9,color:T.t3}}>Day {dayNum}</div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {MEAL_TYPES.map(mt=>{
                          const sugs = MEAL_DB[mt.key]?.[ph] || [];
                          const pick = sugs[(dayNum-1) % sugs.length];
                          if (!pick) return null;
                          return (
                            <div key={mt.key} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 11px",border:`1px solid ${isToday?"rgba(255,255,255,0.10)":"rgba(255,255,255,0.05)"}`}}>
                              <div style={{fontFamily:T.fM,fontSize:8,color:T.t3,letterSpacing:".1em",marginBottom:4}}>{mt.icon} {mt.label.toUpperCase()}</div>
                              <div style={{fontSize:12,fontWeight:600,color:T.t1,lineHeight:1.3,marginBottom:4}}>{pick.name}</div>
                              <div style={{fontFamily:T.fM,fontSize:10,color:T.lime}}>{pick.cal} kcal · {pick.p}g P</div>
                              {isToday&&(
                                <button className="press" onClick={()=>addFood(pick,mt.key)}
                                  style={{marginTop:6,width:"100%",padding:"6px",borderRadius:8,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:9,fontWeight:700,cursor:"pointer"}}>
                                  + LOG
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PHASE ALL — all 10 suggestions per meal */}
            {suggestView==="phase" && (
              <div>
                <div style={{fontSize:12,color:T.t3,marginBottom:14,lineHeight:1.6}}>All Phase {ph} meal options — {MEAL_TYPES.reduce((s,mt)=>s+(MEAL_DB[mt.key]?.[ph]?.length||0),0)} total. Tap + LOG to add any to today.</div>
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
                            <div style={{fontSize:11,color:T.txt3}}>{suggestions.length} options for Phase {ph}</div>
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
                <Card style={{padding:14}}>
                  <div className="eyebrow" style={{color:T.mag,marginBottom:6}}>AVOID THIS PHASE</div>
                  <div style={{fontSize:13,color:T.t2,lineHeight:1.7}}>{meals.avoid}</div>
                </Card>
              </div>
            )}
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

        {/* ═══ TAB: GROCERY ═══ */}
        {dietTab==="grocery" && (()=>{
          const logs = data.groceryLogs || [];
          const week = Math.ceil(cd/7);
          const currentWeek = Math.ceil(cd/7);
          const grocList = GROCERY_LIST[ph] || GROCERY_LIST[1];

          // Spending aggregates
          const totalSpent   = logs.reduce((s,e)=>s+(e.price||0),0);
          const thisWeek     = logs.filter(e=>e.week===currentWeek).reduce((s,e)=>s+(e.price||0),0);
          const lastWeek     = logs.filter(e=>e.week===currentWeek-1).reduce((s,e)=>s+(e.price||0),0);
          const thisMonth    = logs.filter(e=>e.week>=currentWeek-3).reduce((s,e)=>s+(e.price||0),0);

          // Group by week
          const weekGroups = {};
          logs.forEach(e=>{ if(!weekGroups[e.week]) weekGroups[e.week]=[]; weekGroups[e.week].push(e); });
          const weekNums = Object.keys(weekGroups).map(Number).sort((a,b)=>b-a);

          const addGrocery = () => {
            if (!grocItemName.trim() || !grocPrice) return;
            const entry = {id:Date.now(), week:currentWeek, day:cd, name:grocItemName.trim(), qty:grocQty.trim()||"1", price:parseFloat(grocPrice)||0, store:grocStore.trim()||"", date:new Date().toLocaleDateString()};
            setData(d=>({...d, groceryLogs:[...(d.groceryLogs||[]),entry]}));
            setGrocItemName(""); setGrocQty(""); setGrocPrice(""); setGrocStore(""); setShowGrocForm(false);
          };

          return (
            <div>
              {/* View toggle: Suggested List vs My Log */}
              <div style={{display:"flex",gap:6,marginBottom:16,background:"rgba(255,255,255,0.04)",padding:4,borderRadius:12}}>
                {[{id:"suggested",l:"📋 Suggested List"},{id:"mylog",l:"🛍 My Log"}].map(t=>(
                  <button key={t.id} onClick={()=>setGrocView(t.id)}
                    style={{flex:1,padding:"9px 4px",border:"none",borderRadius:9,background:grocView===t.id?T.lime:"transparent",color:grocView===t.id?"#000":T.t2,fontFamily:T.fM,fontSize:10,fontWeight:grocView===t.id?700:400,letterSpacing:".05em",cursor:"pointer",transition:"all .2s"}}>
                    {t.l}
                  </button>
                ))}
              </div>

              {/* ── SUGGESTED SHOPPING LIST — PREMIUM ── */}
              {grocView==="suggested" && (()=>{
                const phaseDescriptions = {
                  1:"Foundation phase — building the habit. Stock simple, affordable staples you'll actually cook.",
                  2:"Building phase — more variety, more protein, more intensity in the kitchen.",
                  3:"Definition phase — high protein, minimal carbs, maximum vegetables. Every gram counts.",
                  4:"Peak phase — ultra-clean eating. Only the leanest proteins and greens make the list.",
                };
                const phaseTips = {
                  1:["Buy eggs in bulk — cheapest protein per gram","Frozen veg is identical nutrition to fresh, half the cost","Cook chicken breast in batch on Sunday — saves 5 hrs a week"],
                  2:["Add quinoa for complete protein — replaces rice 3x/week","Avocados only ripe when soft — buy green, let sit 2 days","Ground turkey lasts 3 days cooked in the fridge — meal prep it"],
                  3:["Cauliflower rice replaces 250 kcal of carbs per meal","Asparagus is a natural diuretic — reduces water retention","Buy 2 rotisserie chickens on Sunday — use all week"],
                  4:["Only use olive oil measured with a spoon — no pouring","Pre-portioned meals in tupperware = no decision fatigue","Green tea before bed replaces snacks — 0 calories"],
                };
                const checkedCount = grocList.reduce((s,cat)=>s+cat.items.filter((_,ii)=>grocChecked.has(`${ph}-${cat.cat}-${ii}`)).length,0);
                const totalItems = grocList.reduce((s,cat)=>s+cat.items.length,0);
                return (
                  <div>
                    {/* Hero header */}
                    <div style={{marginBottom:20,padding:"20px 18px",background:"linear-gradient(135deg,rgba(180,255,80,0.10),rgba(0,255,200,0.06),rgba(255,255,255,0.03))",borderRadius:22,border:"1.5px solid oklch(0.92 0.22 130 / 0.25)",position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",top:-20,right:-20,fontSize:80,opacity:.06,transform:"rotate(15deg)"}}>🛒</div>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                        <div>
                          <div style={{fontFamily:T.fM,fontSize:10,color:T.lime,letterSpacing:".18em",marginBottom:6}}>WEEKLY SHOPPING LIST</div>
                          <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:26,color:T.t1,lineHeight:1.2,letterSpacing:"-0.01em"}}>Phase {ph} Essentials</div>
                        </div>
                        <div style={{background:"rgba(180,255,80,0.15)",borderRadius:12,padding:"8px 12px",border:"1px solid oklch(0.92 0.22 130 / 0.3)",textAlign:"center",flexShrink:0}}>
                          <div style={{fontFamily:T.fM,fontSize:22,fontWeight:800,color:T.lime,lineHeight:1}}>{checkedCount}</div>
                          <div style={{fontFamily:T.fM,fontSize:8,color:T.t3,letterSpacing:".08em",marginTop:2}}>/ {totalItems} DONE</div>
                        </div>
                      </div>
                      <div style={{fontSize:12,color:T.t3,lineHeight:1.65,marginBottom:14}}>{phaseDescriptions[ph]}</div>
                      {/* Progress bar */}
                      <div style={{background:"rgba(255,255,255,0.07)",borderRadius:999,height:5,overflow:"hidden"}}>
                        <div style={{width:`${totalItems>0?Math.round(checkedCount/totalItems*100):0}%`,height:"100%",background:T.lime,borderRadius:999,transition:"width .5s cubic-bezier(.22,.68,0,1.2)"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                        <span style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".06em"}}>TAP ITEMS TO CHECK OFF</span>
                        <span style={{fontFamily:T.fM,fontSize:9,color:checkedCount===totalItems&&totalItems>0?T.lime:T.t3,letterSpacing:".06em"}}>{totalItems>0?Math.round(checkedCount/totalItems*100):0}%{checkedCount===totalItems&&totalItems>0?" ✓ ALL DONE!":""}</span>
                      </div>
                    </div>

                    {/* Categories */}
                    {grocList.map((cat,ci)=>(
                      <div key={ci} style={{marginBottom:18}}>
                        {/* Category header */}
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"12px 15px",background:`linear-gradient(135deg,${cat.col}18,${cat.col}06)`,borderRadius:16,border:`1.5px solid ${cat.col}35`}}>
                          <div style={{fontSize:22}}>{cat.cat.split(" ")[0]}</div>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:T.fM,fontSize:12,fontWeight:800,color:cat.col,letterSpacing:".06em",textTransform:"uppercase"}}>{cat.cat.split(" ").slice(1).join(" ") || cat.cat}</div>
                            <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,marginTop:1}}>{cat.items.filter((_,ii)=>grocChecked.has(`${ph}-${cat.cat}-${ii}`)).length}/{cat.items.length} checked</div>
                          </div>
                          <div style={{fontFamily:T.fM,fontSize:11,fontWeight:700,color:cat.col,background:`${cat.col}22`,borderRadius:8,padding:"4px 8px"}}>{cat.items.length} items</div>
                        </div>
                        {/* Items */}
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {cat.items.map((item,ii)=>{
                            const key=`${ph}-${cat.cat}-${ii}`;
                            const checked=grocChecked.has(key);
                            return (
                              <div key={ii}
                                onClick={()=>setGrocChecked(prev=>{const n=new Set(prev); if(n.has(key))n.delete(key); else n.add(key); return n;})}
                                style={{background:checked?"rgba(180,255,80,0.06)":"rgba(255,255,255,0.04)",borderRadius:14,padding:"13px 14px",border:`1.5px solid ${checked?T.lime+"44":"rgba(255,255,255,0.07)"}`,display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"all .2s",opacity:checked?0.75:1}}>
                                {/* Checkbox */}
                                <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${checked?T.lime:"rgba(255,255,255,0.2)"}`,background:checked?T.lime:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                                  {checked&&<span style={{fontSize:12,color:"#000",fontWeight:800}}>✓</span>}
                                </div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:13,fontWeight:600,color:checked?T.t3:T.t1,textDecoration:checked?"line-through":"none",marginBottom:3,transition:"color .2s"}}>{item.name}</div>
                                  <div style={{fontSize:10,color:T.t3,lineHeight:1.5}}>{item.why}</div>
                                </div>
                                <div style={{textAlign:"right",flexShrink:0}}>
                                  <div style={{fontFamily:T.fM,fontSize:12,fontWeight:700,color:checked?T.t3:T.lime}}>{item.est}</div>
                                  <div style={{fontSize:9,color:T.t3,marginTop:2}}>{item.qty}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Budget card */}
                    <div style={{padding:"18px 18px",background:"linear-gradient(135deg,rgba(180,255,80,0.08),transparent)",borderRadius:20,border:`1.5px solid ${T.lime}33`,marginBottom:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <div>
                          <div style={{fontFamily:T.fM,fontSize:9,color:T.lime,letterSpacing:".15em",marginBottom:4}}>ESTIMATED WEEKLY BUDGET</div>
                          <div style={{fontFamily:T.fM,fontSize:32,fontWeight:800,color:T.t1,letterSpacing:"-0.02em"}}>$60 <span style={{fontSize:18,color:T.t3,fontWeight:400}}>– $80</span></div>
                        </div>
                        <div style={{background:"rgba(180,255,80,0.12)",borderRadius:12,padding:"10px 14px",border:`1px solid ${T.lime}33`,textAlign:"center"}}>
                          <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,marginBottom:4}}>PER MEAL</div>
                          <div style={{fontFamily:T.fM,fontSize:16,fontWeight:700,color:T.lime}}>~$3–5</div>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:T.t3,lineHeight:1.7}}>Buying frozen veg + canned protein cuts costs by 40% without losing nutrition. Batch cook on Sunday and save 5+ hours during the week.</div>
                    </div>

                    {/* Smart tips */}
                    <div style={{padding:"16px 16px",background:"rgba(255,255,255,0.03)",borderRadius:18,border:"1px solid rgba(255,255,255,0.07)"}}>
                      <div style={{fontFamily:T.fM,fontSize:10,color:T.cyan,letterSpacing:".15em",marginBottom:12}}>💡 PHASE {ph} SHOPPING TIPS</div>
                      {(phaseTips[ph]||[]).map((tip,i)=>(
                        <div key={i} style={{display:"flex",gap:10,marginBottom:i<2?10:0,alignItems:"flex-start"}}>
                          <span style={{fontSize:14,flexShrink:0,marginTop:1}}>→</span>
                          <span style={{fontSize:12,color:T.t2,lineHeight:1.6}}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── MY GROCERY LOG ── */}
              {grocView==="mylog" && (<>
              {/* Spending summary */}
              <Card style={{padding:16,marginBottom:14}}>
                <div className="eyebrow" style={{marginBottom:12}}>GROCERY SPENDING</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  {[{l:"This Week",v:`$${thisWeek.toFixed(2)}`,c:thisWeek<=70?T.lime:T.mag,s:"budget ~$70"},{l:"Last Week",v:`$${lastWeek.toFixed(2)}`,c:T.t2,s:"previous week"},{l:"Last 4 Weeks",v:`$${thisMonth.toFixed(2)}`,c:T.cyan,s:"monthly view"},{l:"Total Logged",v:`$${totalSpent.toFixed(2)}`,c:T.t2,s:"all time"},].map((s,i)=>(
                    <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px"}}>
                      <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".1em",marginBottom:4}}>{s.l.toUpperCase()}</div>
                      <div style={{fontFamily:T.fM,fontSize:20,color:s.c,fontWeight:600,letterSpacing:"-0.02em"}}>{s.v}</div>
                      <div style={{fontSize:9,color:T.t3,marginTop:2}}>{s.s}</div>
                    </div>
                  ))}
                </div>
                {/* Week budget bar */}
                <div style={{marginBottom:4}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>Week {currentWeek} budget</span>
                    <span style={{fontFamily:T.fM,fontSize:10,color:thisWeek<=70?T.lime:T.mag,fontWeight:600}}>${thisWeek.toFixed(2)} / $70.00</span>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.07)",borderRadius:6,height:6,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100,(thisWeek/70)*100)}%`,height:"100%",background:thisWeek<=70?T.lime:T.mag,borderRadius:6,transition:"width .8s"}}/>
                  </div>
                </div>
              </Card>

              {/* Add item form */}
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div className="eyebrow">Log Purchase</div>
                  <button className="press" onClick={()=>setShowGrocForm(v=>!v)}
                    style={{padding:"7px 14px",borderRadius:10,background:showGrocForm?"rgba(255,255,255,0.07)":T.limeS,border:`1px solid ${showGrocForm?"rgba(255,255,255,0.10)":T.lime}`,color:showGrocForm?T.t2:T.lime,fontFamily:T.fM,fontSize:10,fontWeight:600,cursor:"pointer",letterSpacing:".06em"}}>
                    {showGrocForm?"CANCEL":"+ ADD ITEM"}
                  </button>
                </div>
                {showGrocForm&&(
                  <Card style={{padding:14}}>
                    <input placeholder="Item name (e.g. Chicken breast 1kg)"
                      value={grocItemName} onChange={e=>setGrocItemName(e.target.value)}
                      style={{...IS,marginBottom:8,fontSize:14}}/>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <input placeholder="Qty (e.g. 1kg, 18 pack)"
                        value={grocQty} onChange={e=>setGrocQty(e.target.value)}
                        style={{...IS,flex:1,fontSize:13}}/>
                      <input type="number" step="0.01" placeholder="Price $"
                        value={grocPrice} onChange={e=>setGrocPrice(e.target.value)}
                        style={{...IS,flex:1,fontSize:13}}/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <input placeholder="Store (e.g. Maxi, IGA)"
                        value={grocStore} onChange={e=>setGrocStore(e.target.value)}
                        style={{...IS,flex:1,fontSize:13}}/>
                      <button className="press" onClick={addGrocery}
                        style={{padding:"12px 18px",borderRadius:T.r2,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:".08em"}}>
                        ADD
                      </button>
                    </div>
                  </Card>
                )}
              </div>

              {/* Purchase history by week */}
              {weekNums.length===0 && !showGrocForm && (
                <div style={{textAlign:"center",padding:"32px 0",fontFamily:T.fM,fontSize:12,color:T.t3}}>
                  No grocery purchases logged yet. Tap + ADD ITEM to start tracking.
                </div>
              )}
              {weekNums.map(wk=>{
                const wkItems = weekGroups[wk] || [];
                const wkTotal = wkItems.reduce((s,e)=>s+(e.price||0),0);
                return (
                  <div key={wk} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,paddingLeft:2}}>
                      <div className="eyebrow">Week {wk}</div>
                      <span style={{fontFamily:T.fM,fontSize:12,fontWeight:600,color:wkTotal<=70?T.lime:T.mag}}>${wkTotal.toFixed(2)}</span>
                    </div>
                    <Card style={{padding:0,overflow:"hidden"}}>
                      {wkItems.sort((a,b)=>b.id-a.id).map((item,i)=>(
                        <div key={item.id}>
                          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px"}}>
                            <div style={{fontSize:18,minWidth:26}}>🛒</div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:500,color:T.t1}}>{item.name}</div>
                              <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,marginTop:2,letterSpacing:".08em"}}>
                                {item.qty}{item.store?" · "+item.store:""} · {item.date||"Day "+item.day}
                              </div>
                            </div>
                            <div style={{fontFamily:T.fM,fontSize:14,fontWeight:600,color:T.lime,minWidth:48,textAlign:"right"}}>${item.price.toFixed(2)}</div>
                            <button className="press"
                              onClick={()=>setData(d=>({...d,groceryLogs:(d.groceryLogs||[]).filter(e=>e.id!==item.id)}))}
                              style={{width:24,height:24,borderRadius:6,background:T.magS,border:`1px solid ${T.mag}`,color:T.mag,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              ×
                            </button>
                          </div>
                          {i<wkItems.length-1&&<Dv/>}
                        </div>
                      ))}
                      <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>{wkItems.length} items</span>
                        <span style={{fontFamily:T.fM,fontSize:12,fontWeight:600,color:wkTotal<=70?T.lime:T.mag}}>Total: ${wkTotal.toFixed(2)}</span>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </>)}
          </div>
          );
        })()}

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

            {/* ── SMART CALORIE COACH ── */}
            {(()=>{
              const startW   = data.startWeight || 80;
              const goalWt   = data.goalWeight  || 68;
              const tDays    = data.targetDays  || 120;
              const kgLeft   = Math.max(0, (latW||startW) - goalWt);
              const daysLeft = Math.max(1, tDays - cd);

              // Targets
              const needDeficit   = Math.round(kgLeft * 7700 / daysLeft);
              const eatTarget     = Math.max(1200, Math.round(2200 - needDeficit));
              const burnTarget    = Math.max(0, needDeficit - 500); // 500 from food already, rest from exercise

              // Actual this week
              const wr = Array.from({length:Math.min(7,cd)},(_,i)=>Math.max(1,cd-6+i));
              const avgEaten  = Math.round(wr.reduce((s,d)=>{const dl=data.logs[d]||{};const fl=(dl.foodLog||[]).reduce((a,f)=>a+(f.cal||0),0); return s+(fl>0?fl:(dl.calsIn||eatTarget));},0)/wr.length);
              const avgBurned = Math.round(wr.reduce((s,d)=>{const dl=data.logs[d]||{};return s+BMR+Math.round(((dl.steps||0)/10000)*400)+Math.round((dl.km||0)*60)+(dl.workoutDone?200:0);},0)/wr.length);
              const avgDeficit = avgBurned - avgEaten;
              const expectedDeficit = needDeficit;

              // Weight trend this week
              const recentWeights=[];
              for(let d2=Math.max(1,cd-13);d2<=cd;d2++) if(data.logs[d2]?.weight) recentWeights.push({d:d2,w:data.logs[d2].weight});
              const actualWeeklyLoss = recentWeights.length>=2 ? (recentWeights[0].w - recentWeights[recentWeights.length-1].w) / ((recentWeights[recentWeights.length-1].d - recentWeights[0].d) / 7) : null;
              const expectedWeeklyLoss = needDeficit * 7 / 7700;

              // Status
              const deficitOk   = avgDeficit >= expectedDeficit * 0.8;
              const eatOk       = avgEaten <= eatTarget * 1.1;
              const onTrack     = deficitOk && eatOk;

              // Suggestions
              const suggestions = [];
              if(avgEaten > eatTarget * 1.1) suggestions.push({icon:"🍽️",text:`You're eating ~${avgEaten-eatTarget} kcal over your target. Cut carbs at dinner and remove one snack.`,bad:true});
              if(avgBurned < BMR + 300) suggestions.push({icon:"🚶",text:"You're not moving enough. Add a 20-min walk daily — burns 150+ kcal with no effort.",bad:true});
              if(!data.logs[cd]?.workoutDone && cd>1) suggestions.push({icon:"💪",text:"Log today's workout — even a 30-min session adds 200 kcal burned and keeps your streak.",bad:false});
              if((data.logs[cd]?.steps||0) < 5000) suggestions.push({icon:"👟",text:"Under 5,000 steps today. Aim for 8,000–10,000 — it makes a real difference in your deficit.",bad:true});
              if(actualWeeklyLoss !== null && actualWeeklyLoss < expectedWeeklyLoss * 0.6) suggestions.push({icon:"📉",text:`You're losing ${(actualWeeklyLoss||0).toFixed(2)}kg/week but need ${expectedWeeklyLoss.toFixed(2)}kg/week. Tighten the diet or add cardio.`,bad:true});
              if(onTrack && suggestions.length===0) suggestions.push({icon:"🔥",text:"You're on track. Keep this exact routine — your plan is working perfectly.",bad:false});
              if(kgLeft<1) suggestions.push({icon:"🏆",text:`Only ${kgLeft.toFixed(1)}kg from your goal! Stay strict, don't celebrate early.`,bad:false});

              const statusColor = onTrack ? T.lime : "#FF9F0A";
              const statusText  = onTrack ? "ON TRACK" : "NEEDS ADJUSTMENT";

              return (
                <Card style={{padding:18,marginBottom:14,border:`1.5px solid ${statusColor}33`}}>
                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
                    <div>
                      <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".15em",marginBottom:4}}>🧠 SMART CALORIE COACH</div>
                      <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:20,color:T.t1,lineHeight:1.2}}>Is your plan working?</div>
                    </div>
                    <div style={{background:`${statusColor}18`,borderRadius:10,padding:"6px 12px",border:`1px solid ${statusColor}44`}}>
                      <div style={{fontFamily:T.fM,fontSize:9,fontWeight:800,color:statusColor,letterSpacing:".12em"}}>{statusText}</div>
                    </div>
                  </div>

                  {/* Daily targets */}
                  <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:10}}>TODAY'S TARGETS</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
                    {[
                      {label:"EAT THIS MUCH",value:`${eatTarget.toLocaleString()} kcal`,icon:"🍽️",color:T.cyan,sub:`${needDeficit} kcal deficit needed`,actual:avgEaten,ok:eatOk},
                      {label:"BURN THIS MUCH",value:`${(BMR+burnTarget).toLocaleString()} kcal`,icon:"🔥",color:T.mag,sub:`${burnTarget} from exercise`,actual:avgBurned,ok:avgBurned>=(BMR+burnTarget)*0.85},
                    ].map((t,i)=>(
                      <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:16,padding:"14px 12px",border:`1.5px solid ${t.ok?t.color+"44":"rgba(255,100,80,0.25)"}`,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:8,right:10,fontSize:20,opacity:.15}}>{t.icon}</div>
                        <div style={{fontFamily:T.fM,fontSize:8,color:T.t3,letterSpacing:".1em",marginBottom:6}}>{t.label}</div>
                        <div style={{fontFamily:T.fM,fontSize:20,fontWeight:800,color:t.color,letterSpacing:"-0.01em",lineHeight:1}}>{t.value}</div>
                        <div style={{fontSize:9,color:T.t3,marginTop:4,marginBottom:8}}>{t.sub}</div>
                        {/* Actual vs target bar */}
                        <div style={{fontSize:9,color:T.t3,marginBottom:3}}>7-day avg: <span style={{color:t.ok?T.lime:"#FF453A",fontWeight:700}}>{t.actual.toLocaleString()} kcal</span></div>
                        <div style={{background:"rgba(255,255,255,0.08)",borderRadius:999,height:4,overflow:"hidden"}}>
                          <div style={{width:`${Math.min(100,Math.round((i===0?t.actual/eatTarget:t.actual/(BMR+burnTarget))*100))}%`,height:"100%",background:t.ok?T.lime:"#FF453A",borderRadius:999,transition:"width .8s"}}/>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Weekly performance */}
                  <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:10}}>WEEKLY PERFORMANCE</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18}}>
                    {[
                      {l:"Avg Deficit",v:`${Math.max(0,avgDeficit).toLocaleString()}`,u:"kcal/d",target:expectedDeficit,ok:deficitOk},
                      {l:"Wk Loss",v:actualWeeklyLoss?actualWeeklyLoss.toFixed(2):"—",u:"kg/wk",target:null,ok:actualWeeklyLoss===null||actualWeeklyLoss>=expectedWeeklyLoss*0.6},
                      {l:"Left to Go",v:kgLeft.toFixed(1),u:"kg",target:null,ok:kgLeft<2},
                    ].map((s,i)=>(
                      <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 10px",textAlign:"center",border:`1px solid ${s.ok?"rgba(180,255,80,0.15)":"rgba(255,100,80,0.15)"}`}}>
                        <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".08em",marginBottom:4}}>{s.l}</div>
                        <div style={{fontFamily:T.fM,fontSize:18,fontWeight:700,color:s.ok?T.lime:"#FF9F0A"}}>{s.v}</div>
                        <div style={{fontFamily:T.fM,fontSize:8,color:T.t3,marginTop:2}}>{s.u}</div>
                        {s.target&&<div style={{fontFamily:T.fM,fontSize:8,color:T.t3,marginTop:2}}>target: {s.target}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Suggestions */}
                  <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".12em",marginBottom:10}}>COACH SAYS</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {suggestions.slice(0,3).map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"11px 12px",background:s.bad?"rgba(255,100,80,0.06)":"rgba(180,255,80,0.06)",borderRadius:12,border:`1px solid ${s.bad?"rgba(255,100,80,0.2)":"rgba(180,255,80,0.2)"}`}}>
                        <span style={{fontSize:16,flexShrink:0}}>{s.icon}</span>
                        <span style={{fontSize:12,color:T.t2,lineHeight:1.6}}>{s.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Goal projection */}
                  {kgLeft>0 && daysLeft>0 && (
                    <div style={{marginTop:14,padding:"12px 14px",background:"rgba(0,255,200,0.05)",borderRadius:12,border:"1px solid rgba(0,255,200,0.15)"}}>
                      <div style={{fontFamily:T.fM,fontSize:9,color:T.cyan,letterSpacing:".12em",marginBottom:4}}>AT CURRENT PACE</div>
                      <div style={{fontSize:12,color:T.t2,lineHeight:1.6}}>
                        {avgDeficit>0
                          ? <>You'll reach <strong style={{color:T.lime}}>{goalWt}kg</strong> in approximately <strong style={{color:T.cyan}}>{Math.round(kgLeft*7700/avgDeficit)} days</strong>. Your target was {daysLeft} days remaining.</>
                          : <>Increase your daily deficit to stay on track for your <strong style={{color:T.lime}}>{goalWt}kg</strong> goal.</>
                        }
                      </div>
                    </div>
                  )}
                </Card>
              );
            })()}

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


  /* ════════ VIEW: BODY (Progress Photos + Measurements) ════════ */
  const vBody = () => {
    const l = lg(cd);
    const week = Math.ceil(cd / 7);
    const photos = data.progressPhotos || {};
    const weekPhotos = photos[week] || {};
    const week1Photos = photos[1] || {};

    // ── Weight data ──
    const ws = [];
    for (let d = 1; d <= cd; d++) if (data.logs[d]?.weight) ws.push({d, w: data.logs[d].weight});
    const startW  = data.startWeight || ws[0]?.w || 80;
    const targetW = data.goalWeight || data.targetWeight || 68;
    const currW   = ws.length ? ws[ws.length-1].w : null;
    const wLost   = currW ? (startW - currW) : 0;
    const toGoal  = currW ? Math.max(0, currW - targetW) : null;
    // Linear regression for projection
    let projW120 = null, daysToTarget = null, weeklyRate = null;
    if (ws.length >= 2) {
      const n = ws.length;
      const sumX = ws.reduce((s,p)=>s+p.d,0), sumY = ws.reduce((s,p)=>s+p.w,0);
      const sumXY = ws.reduce((s,p)=>s+p.d*p.w,0), sumX2 = ws.reduce((s,p)=>s+p.d*p.d,0);
      const slope = (n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX);
      const intercept = (sumY-slope*sumX)/n;
      projW120 = Math.max(40, slope*120+intercept);
      weeklyRate = Math.abs(slope*7);
      if (slope < 0 && currW > targetW) daysToTarget = Math.round((currW - targetW) / Math.abs(slope));
    }

    // ── Measurement data ──
    const MEASURE_FIELDS = [
      {key:"neck",      label:"Neck",      icon:"📏", shrinkGood:false},
      {key:"height",    label:"Height",    icon:"↕️",  shrinkGood:false},
      {key:"chest",     label:"Chest",     icon:"💪",  shrinkGood:false},
      {key:"waist",     label:"Waist",     icon:"🎯",  shrinkGood:true},
      {key:"hips",      label:"Hips",      icon:"📐",  shrinkGood:true},
      {key:"leftArm",   label:"L. Arm",    icon:"💪",  shrinkGood:false},
      {key:"rightArm",  label:"R. Arm",    icon:"💪",  shrinkGood:false},
      {key:"leftThigh", label:"L. Thigh",  icon:"🦵",  shrinkGood:true},
      {key:"rightThigh",label:"R. Thigh",  icon:"🦵",  shrinkGood:true},
    ];
    const firstM = {};
    for (let d = 1; d <= cd; d++) {
      const m = data.logs[d]?.measurements || {};
      MEASURE_FIELDS.forEach(f => { if (!firstM[f.key] && m[f.key]) firstM[f.key] = m[f.key]; });
    }
    const currM = l.measurements || {};
    const updM = (key, val) => {
      upd(cd, "measurements", {...(l.measurements||{}), [key]: parseFloat(val)||undefined});
    };

    // Total cm changed (shrink-good fields)
    const totalCmLost = MEASURE_FIELDS.filter(f=>f.shrinkGood)
      .reduce((s,f)=>{ const c=currM[f.key], fi=firstM[f.key]; return c&&fi ? s+Math.max(0,fi-c) : s; }, 0);

    // Body fat (Navy)
    const waist=currM.waist, neck=currM.neck;
    const heightCm = currM.height || data.height || 175;
    const bf = (waist&&neck&&heightCm&&waist>neck)
      ? Math.max(0, 495/(1.0324-0.19077*Math.log10(waist-neck)+0.15456*Math.log10(heightCm))-450)
      : null;
    // BMI
    const bmi = currW && heightCm ? (currW / ((heightCm/100)**2)) : null;
    const bmiCat = bmi!=null ? (bmi<18.5?"Underweight":bmi<25?"Normal":bmi<30?"Overweight":"Obese") : null;
    const bmiColor = bmi!=null ? (bmi<18.5?T.cyan:bmi<25?T.lime:bmi<30?"#FF9F0A":T.mag) : T.t3;
    const bfRound = bf ? bf.toFixed(1) : null;
    const bfCat   = bf!=null ? (bf<12?"Lean":bf<17?"Athletic":bf<22?"Fit":bf<28?"Average":"High") : null;
    const bfColor = bf!=null ? (bf<12?T.lime:bf<17?T.cyan:bf<22?"#FFD60A":bf<28?"#FF9F0A":T.mag) : T.t3;
    const bfDaysToTarget = (bf!=null && weeklyRate && bf>12)
      ? Math.round(((bf-12)/(weeklyRate*0.3))*7) : null;

    // Progress score (0-100) based on weight + measurements
    const wProg = currW ? Math.min(100, Math.round((wLost / Math.max(1, startW-targetW))*100)) : 0;
    const mProg = totalCmLost > 0 ? Math.min(100, Math.round(totalCmLost/10*100)) : 0;
    const overallScore = Math.round((wProg*0.6 + mProg*0.4));

    // What to focus on
    const focusList = [];
    if (!currW) focusList.push({icon:"⚖️", text:"Log your weight daily — it powers all predictions"});
    else if (toGoal > 5) focusList.push({icon:"🔥", text:`${toGoal.toFixed(1)}kg to goal — keep the calorie deficit`});
    const waistDiff = waist&&firstM.waist ? (waist-firstM.waist) : null;
    if (waistDiff === null && !waist) focusList.push({icon:"📏", text:"Log waist measurement — it's the #1 indicator"});
    else if (waistDiff > -3) focusList.push({icon:"🎯", text:"Waist needs focus — more cardio + reduce carbs at dinner"});
    if (!neck || !height) focusList.push({icon:"🧮", text:"Add neck + height to unlock body fat % tracking"});
    if (Object.keys(weekPhotos).length === 0) focusList.push({icon:"📸", text:"Take this week's progress photo — visual proof matters"});
    if (!data.logs[cd]?.weight) focusList.push({icon:"📊", text:"Weigh in today — best done first thing in the morning"});

    // Weight chart
    const W=340, H=140, PL=32, PR=12, PT=10, PB=22;
    const iW=W-PL-PR, iH=H-PT-PB;
    const allWs = ws.map(x=>x.w);
    const minW2 = Math.min(...allWs, projW120||99, targetW)-1;
    const maxW2 = Math.max(...allWs)+1;
    const xSc = d => PL+((d-1)/(120-1))*iW;
    const ySc = w => PT+iH-((w-minW2)/(maxW2-minW2))*iH;

    // Photos
    const ANGLES = ["front","side","back"];
    const compressPhoto = (file, cb) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const maxW = 400, scale = Math.min(1, maxW/img.width);
          const cv = document.createElement("canvas");
          cv.width=img.width*scale; cv.height=img.height*scale;
          cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
          cb(cv.toDataURL("image/jpeg",0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };
    const handlePhoto = (angle, file) => {
      if (!file) return;
      compressPhoto(file, b64 => setData(d=>({...d,progressPhotos:{...(d.progressPhotos||{}),[week]:{...(d.progressPhotos?.[week]||{}),[angle]:b64}}})));
    };

    return (
      <div key={ak} className="fadeUp" style={{padding:"0 16px 32px"}}>

        {/* ══ HERO: Transformation Score ══ */}
        <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",borderRadius:22,border:"1px solid rgba(255,255,255,0.10)",padding:"20px",marginBottom:14,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(206,252,0,0.15),transparent 70%)",filter:"blur(20px)"}}/>
          <div style={{position:"relative"}}>
            <div className="eyebrow-accent" style={{marginBottom:10}}>Body Transformation · Day {cd}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[
                {l:"Lost",      v: wLost>0 ? `-${wLost.toFixed(1)}kg` : "—",       c:wLost>0?T.lime:T.t3},
                {l:"To Goal",   v: toGoal!=null ? `${toGoal.toFixed(1)}kg` : "—", c:toGoal===0?T.lime:T.cyan},
                {l:"Day 120 Est.", v: projW120!=null ? `${projW120.toFixed(1)}kg` : "—", c:T.mag},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:"center",background:"rgba(255,255,255,0.05)",borderRadius:14,padding:"12px 6px"}}>
                  <div style={{fontFamily:T.fM,fontSize:20,color:s.c,fontWeight:600,letterSpacing:"-0.02em"}}>{s.v}</div>
                  <div className="mono" style={{fontSize:8,color:T.t3,marginTop:3,letterSpacing:".1em"}}>{s.l.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
              {weeklyRate!=null&&<div style={{fontFamily:T.fM,fontSize:11,color:T.lime}}>📉 {weeklyRate.toFixed(2)}kg/week avg</div>}
              {daysToTarget!=null&&<div style={{fontFamily:T.fM,fontSize:11,color:T.cyan}}>🎯 ~{daysToTarget} days to goal</div>}
              {totalCmLost>0&&<div style={{fontFamily:T.fM,fontSize:11,color:T.mag}}>📏 {totalCmLost.toFixed(1)}cm off body</div>}
            </div>
            {/* Overall progress bar */}
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>Overall progress</span>
              <span style={{fontFamily:T.fM,fontSize:10,color:T.lime,fontWeight:600}}>{overallScore}%</span>
            </div>
            <div style={{background:"rgba(255,255,255,0.07)",borderRadius:6,height:6,overflow:"hidden"}}>
              <div style={{width:`${overallScore}%`,height:"100%",background:`linear-gradient(90deg,${T.lime},${T.cyan})`,borderRadius:6,transition:"width 1s cubic-bezier(.22,.68,0,1.2)"}}/>
            </div>
          </div>
        </div>

        {/* ══ WEIGHT JOURNEY CHART ══ */}
        {ws.length >= 1 && (
          <Card style={{padding:16,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div className="eyebrow">WEIGHT JOURNEY</div>
              <div style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>Target: {targetW}kg</div>
            </div>
            {ws.length >= 2 ? (
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",marginBottom:12}}>
                <defs>
                  <linearGradient id="bFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.lime} stopOpacity="0.25"/>
                    <stop offset="100%" stopColor={T.lime} stopOpacity="0"/>
                  </linearGradient>
                  <filter id="bGlow"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                {[0,0.25,0.5,0.75,1].map((p,i)=>(
                  <line key={i} x1={PL} y1={PT+iH*p} x2={PL+iW} y2={PT+iH*p} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                ))}
                {/* Target line */}
                <line x1={PL} y1={ySc(targetW)} x2={PL+iW} y2={ySc(targetW)} stroke={T.lime} strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
                <text x={PL+iW-2} y={ySc(targetW)-3} fill={T.lime} fontSize="7" textAnchor="end" fontFamily="monospace">{targetW}kg</text>
                {/* Fill */}
                <polygon points={`${xSc(ws[0].d)},${PT+iH} ${ws.map(p=>`${xSc(p.d)},${ySc(p.w)}`).join(" ")} ${xSc(ws[ws.length-1].d)},${PT+iH}`} fill="url(#bFill)"/>
                {/* Actual line */}
                <polyline points={ws.map(p=>`${xSc(p.d)},${ySc(p.w)}`).join(" ")} fill="none" stroke={T.lime} strokeWidth="2.5" strokeLinejoin="round" filter="url(#bGlow)"/>
                {/* Projection dashed */}
                {projW120!=null&&(
                  <line x1={xSc(ws[ws.length-1].d)} y1={ySc(ws[ws.length-1].w)} x2={xSc(120)} y2={ySc(projW120)} stroke={T.cyan} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.7"/>
                )}
                {/* Dots */}
                {ws.map((p,i)=>(
                  <circle key={i} cx={xSc(p.d)} cy={ySc(p.w)} r={i===ws.length-1?4:2.5} fill={i===ws.length-1?T.lime:"rgba(206,252,0,0.8)"} stroke="#050507" strokeWidth="1.5"/>
                ))}
                {/* Y labels */}
                {[Math.ceil(minW2+1), Math.round((minW2+maxW2)/2), Math.floor(maxW2-1)].map((v,i)=>(
                  <text key={i} x={PL-3} y={ySc(v)+3} fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor="end" fontFamily="monospace">{v}</text>
                ))}
                {/* Start / Today / Day120 labels */}
                <text x={PL} y={H-4} fill="rgba(255,255,255,0.25)" fontSize="7" textAnchor="middle" fontFamily="monospace">D1</text>
                {ws.length>0&&<text x={xSc(ws[ws.length-1].d)} y={H-4} fill={T.lime} fontSize="7" textAnchor="middle" fontFamily="monospace">NOW</text>}
                <text x={PL+iW} y={H-4} fill="rgba(255,255,255,0.25)" fontSize="7" textAnchor="middle" fontFamily="monospace">D120</text>
              </svg>
            ) : (
              <div style={{padding:"16px 0",textAlign:"center",fontFamily:T.fM,fontSize:11,color:T.t3}}>Log more weight entries to see your chart</div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {[
                {l:"Start",   v:startW?`${startW}kg`:"—",     c:T.t2},
                {l:"Current", v:currW?`${currW}kg`:"—",       c:T.lime},
                {l:"Lost",    v:wLost>0?`${wLost.toFixed(1)}kg`:"—", c:T.lime},
                {l:"Rate",    v:weeklyRate?`${weeklyRate.toFixed(2)}kg/wk`:"—", c:T.cyan},
              ].map((s,i)=>(
                <div key={i} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"8px 4px"}}>
                  <div style={{fontFamily:T.fM,fontSize:12,color:s.c,fontWeight:600}}>{s.v}</div>
                  <div className="mono" style={{fontSize:8,color:T.t3,marginTop:2,letterSpacing:".08em"}}>{s.l}</div>
                </div>
              ))}
            </div>
            {projW120!=null&&(
              <div style={{marginTop:10,padding:"10px 12px",background:"rgba(0,210,255,0.07)",borderRadius:12,border:"1px solid rgba(0,210,255,0.15)"}}>
                <div style={{fontFamily:T.fM,fontSize:11,color:T.cyan}}>
                  📊 At your current rate — <strong style={{color:T.t1}}>{projW120.toFixed(1)}kg</strong> by Day 120
                  {daysToTarget!=null&&<span style={{color:T.t3}}> · Goal in ~{daysToTarget} days</span>}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ══ MEASUREMENT PROGRESS ══ */}
        {Object.keys(firstM).length > 0 && (
          <Card style={{padding:16,marginBottom:14}}>
            <div className="eyebrow" style={{marginBottom:14}}>MEASUREMENTS PROGRESS</div>
            {MEASURE_FIELDS.filter(f=>firstM[f.key]||currM[f.key]).map(f=>{
              const first = firstM[f.key], cur = currM[f.key]||first;
              if (!first) return null;
              const diff = cur - first;
              const isGood = f.shrinkGood ? diff<=0 : diff>=0;
              const absDiff = Math.abs(diff);
              const barMax = 15; // cm scale
              const barPct = Math.min(100, (absDiff/barMax)*100);
              const barColor = isGood ? T.lime : (diff===0 ? T.t3 : T.mag);
              return (
                <div key={f.key} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:13,color:T.t1,fontWeight:500}}>{f.icon} {f.label}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>{first}cm → {cur}cm</span>
                      <span style={{fontFamily:T.fM,fontSize:11,fontWeight:600,color:barColor,minWidth:50,textAlign:"right"}}>
                        {diff===0?"—":(diff>0?"+":"")+diff.toFixed(1)+"cm"}
                      </span>
                    </div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.07)",borderRadius:4,height:5,overflow:"hidden"}}>
                    <div style={{width:`${barPct}%`,height:"100%",background:barColor,borderRadius:4,transition:"width 1s cubic-bezier(.22,.68,0,1.2)",boxShadow:isGood&&diff!==0?`0 0 6px ${barColor}44`:"none"}}/>
                  </div>
                  {absDiff===0&&<div style={{fontFamily:T.fM,fontSize:9,color:T.t3,marginTop:3}}>No change yet</div>}
                </div>
              );
            })}
            {totalCmLost>0&&(
              <div style={{marginTop:6,padding:"10px 12px",background:T.limeS,borderRadius:10,border:`1px solid ${T.limeG}`}}>
                <div style={{fontFamily:T.fM,fontSize:11,color:T.lime,fontWeight:600}}>📏 Total: {totalCmLost.toFixed(1)}cm lost across body</div>
              </div>
            )}
          </Card>
        )}

        {/* ══ BMI ══ */}
        {bmi!=null && (
          <Card style={{padding:16,marginBottom:14}}>
            <div className="eyebrow" style={{marginBottom:12}}>BMI</div>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div>
                <div style={{fontFamily:T.fM,fontSize:42,color:bmiColor,fontWeight:300,letterSpacing:"-0.04em",lineHeight:1}}>{bmi.toFixed(1)}</div>
                <div style={{display:"inline-block",padding:"3px 10px",borderRadius:99,background:bmiColor+"22",border:`1px solid ${bmiColor}`,fontFamily:T.fM,fontSize:11,color:bmiColor,marginTop:6}}>{bmiCat}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",borderRadius:8,overflow:"hidden",height:6,marginBottom:4}}>
                  {[{l:"Under",c:T.cyan},{l:"Normal",c:T.lime},{l:"Over",c:"#FF9F0A"},{l:"Obese",c:T.mag}].map((s,i)=>(
                    <div key={i} style={{flex:1,background:s.c,opacity:0.35}}/>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  {["18.5","25","30","40+"].map(v=><span key={v} style={{fontFamily:T.fM,fontSize:8,color:T.t3}}>{v}</span>)}
                </div>
                <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,marginTop:6}}>Goal BMI: {((targetW)/((heightCm/100)**2)).toFixed(1)}</div>
              </div>
            </div>
          </Card>
        )}

        {/* ══ BODY FAT + PREDICTION ══ */}
        {bf!=null && (
          <Card style={{padding:16,marginBottom:14}}>
            <div className="eyebrow" style={{marginBottom:12}}>BODY FAT % (NAVY METHOD)</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontFamily:T.fM,fontSize:42,color:bfColor,fontWeight:300,letterSpacing:"-0.04em",lineHeight:1}}>{bfRound}<span style={{fontSize:16,color:T.t3}}>%</span></div>
                <div style={{display:"inline-block",padding:"3px 10px",borderRadius:99,background:bfColor+"22",border:`1px solid ${bfColor}`,fontFamily:T.fM,fontSize:11,color:bfColor,marginTop:6}}>{bfCat}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div className="eyebrow" style={{marginBottom:4}}>Target</div>
                <div style={{fontFamily:T.fM,fontSize:22,color:T.lime,fontWeight:600}}>12%</div>
                {bfDaysToTarget!=null&&<div style={{fontFamily:T.fM,fontSize:10,color:T.t3,marginTop:4}}>~{bfDaysToTarget} days away</div>}
              </div>
            </div>
            {/* BF category scale */}
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",gap:0,borderRadius:8,overflow:"hidden",height:8,marginBottom:6}}>
                {[{l:"Lean",c:T.lime,w:"15%"},{l:"Athletic",c:T.cyan,w:"15%"},{l:"Fit",c:"#FFD60A",w:"15%"},{l:"Average",c:"#FF9F0A",w:"20%"},{l:"High",c:T.mag,w:"35%"}].map(s=>(
                  <div key={s.l} style={{flex:1,background:s.c,opacity:0.4,position:"relative"}}/>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                {["12%","17%","22%","28%","35%+"].map(v=>(
                  <span key={v} style={{fontFamily:T.fM,fontSize:8,color:T.t3}}>{v}</span>
                ))}
              </div>
              {/* Marker */}
              <div style={{position:"relative",height:16,marginTop:-22}}>
                <div style={{position:"absolute",left:`${Math.min(96,Math.max(0,((bf-12)/(35-12))*100))}%`,top:0,transform:"translateX(-50%)",fontFamily:T.fM,fontSize:9,color:bfColor,fontWeight:700}}>▲ {bfRound}%</div>
              </div>
            </div>
            <div style={{padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:10,marginTop:8}}>
              <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,lineHeight:1.6}}>
                {bf>22?"Your body fat is in the Average range. Consistent calorie deficit + cardio will move you into the Fit zone within weeks.":bf>17?"You're in Fit range. Tighten the diet, increase protein, and push toward Athletic — it's close.":bf>12?"Athletic range — you're lean. The final push to sub-12% requires diet precision and a slight deficit.":"You've hit Lean territory. Maintain with high protein and strength training."}
              </div>
            </div>
          </Card>
        )}

        {/* ══ WHAT TO FOCUS ON ══ */}
        {focusList.length > 0 && (
          <Card style={{padding:16,marginBottom:14}}>
            <div className="eyebrow" style={{marginBottom:12,color:T.lime}}>WHAT TO FOCUS ON</div>
            {focusList.slice(0,4).map((f,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<focusList.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                <span style={{fontSize:18,minWidth:26}}>{f.icon}</span>
                <span style={{fontSize:13,color:T.t2,lineHeight:1.5}}>{f.text}</span>
              </div>
            ))}
          </Card>
        )}

        {/* ══ LOG MEASUREMENTS ══ */}
        <Card style={{padding:16,marginBottom:14}}>
          <div className="eyebrow" style={{marginBottom:4}}>LOG MEASUREMENTS (cm)</div>
          <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,marginBottom:14}}>Update weekly. Best done Sunday morning before eating.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {MEASURE_FIELDS.map(f => {
              const cur = currM[f.key], first = firstM[f.key];
              const diff = cur&&first ? (cur-first).toFixed(1) : null;
              const diffColor = diff!==null ? (parseFloat(diff)<0&&f.shrinkGood||parseFloat(diff)>0&&!f.shrinkGood?T.lime:T.mag) : T.t3;
              return (
                <div key={f.key} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <span style={{fontFamily:T.fM,fontSize:9,color:T.t3,letterSpacing:".1em"}}>{f.label.toUpperCase()}</span>
                    {diff!==null&&<span style={{fontFamily:T.fM,fontSize:9,color:diffColor,fontWeight:600}}>{parseFloat(diff)>0?"+":""}{diff}cm</span>}
                  </div>
                  <input type="number" step=".1" placeholder={first?`Last: ${first}`:"0.0"}
                    defaultValue={cur||""}
                    onBlur={e=>{if(e.target.value!=="") updM(f.key,e.target.value);}}
                    style={{...IS,fontSize:15,padding:"7px 9px",borderRadius:9,width:"100%"}}/>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ══ PROGRESS PHOTOS ══ */}
        <Card style={{padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div className="eyebrow">PROGRESS PHOTOS</div>
            <div style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>WEEK {week}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            {ANGLES.map(angle=>{
              const src=weekPhotos[angle];
              return (
                <div key={angle} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                  <div style={{width:"100%",aspectRatio:"3/4",borderRadius:14,overflow:"hidden",background:"rgba(255,255,255,0.04)",border:`1px solid ${src?T.limeG:"rgba(255,255,255,0.08)"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {src?<img src={src} alt={angle} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{textAlign:"center",padding:8}}><div style={{fontSize:20,marginBottom:4}}>📷</div><div className="mono" style={{fontSize:8,color:T.t3,letterSpacing:".1em"}}>{angle.toUpperCase()}</div></div>}
                  </div>
                  <label style={{cursor:"pointer",fontFamily:T.fM,fontSize:9,color:T.lime,letterSpacing:".1em",padding:"5px 10px",borderRadius:8,border:`1px solid ${T.limeG}`,background:T.limeS}}>
                    {src?"CHANGE":"+ ADD"}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handlePhoto(angle,e.target.files[0])}/>
                  </label>
                  <div className="mono" style={{fontSize:9,color:T.t3,letterSpacing:".1em"}}>{angle.toUpperCase()}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ══ BEFORE / AFTER ══ */}
        {week>1&&(Object.keys(week1Photos).length>0||Object.keys(weekPhotos).length>0)&&(
          <Card style={{padding:16,marginBottom:14}}>
            <div className="eyebrow" style={{marginBottom:14}}>BEFORE / AFTER</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {["Week 1","Week "+week].map((label,idx)=>{
                const src=idx===0?week1Photos.front:weekPhotos.front;
                return (
                  <div key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                    <div style={{width:"100%",aspectRatio:"3/4",borderRadius:14,overflow:"hidden",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {src?<img src={src} alt={label} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div className="mono" style={{fontSize:9,color:T.t3}}>NO PHOTO</div>}
                    </div>
                    <div className="mono" style={{fontSize:10,color:idx===0?T.t3:T.lime,letterSpacing:".1em"}}>{label.toUpperCase()}</div>
                  </div>
                );
              })}
            </div>
          </Card>
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
    {id:"working",      label:"Working / Deep Work",   icon:"💼", cat:"Daytime"},
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
          {/* Sleep quality */}
          <div style={{padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <div className="eyebrow" style={{marginBottom:8,color:T.cyan}}>Sleep Quality</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              {[1,2,3,4,5].map(star=>(
                <button key={star} className="press"
                  onClick={()=>upd(cd,"sleepQuality",star)}
                  style={{fontSize:22,background:"none",border:"none",cursor:"pointer",
                    filter:star<=(l.sleepQuality||0)?"none":"grayscale(1) opacity(0.3)",
                    transition:"filter .15s"}}>
                  ⭐
                </button>
              ))}
            </div>
            {l.sleepQuality && <div style={{textAlign:"center",fontFamily:T.fM,fontSize:10,color:T.t3,marginTop:6}}>
              {["","Poor","Fair","Good","Great","Perfect"][l.sleepQuality]} sleep
            </div>}
          </div>
          {/* Nap log */}
          <div style={{padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="eyebrow" style={{color:T.mag}}>Naps</div>
              <button className="press" onClick={()=>setShowNapForm(v=>!v)}
                style={{padding:"5px 10px",borderRadius:8,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.10)",color:T.t2,fontFamily:T.fM,fontSize:10,cursor:"pointer"}}>
                {showNapForm?"CANCEL":"+ NAP"}
              </button>
            </div>
            {(l.naps||[]).map((nap,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{fontFamily:T.fM,fontSize:12,color:T.t2}}>😴 {nap.duration}min {nap.time?"at "+nap.time:""}</span>
                <button className="press" onClick={()=>upd(cd,"naps",(l.naps||[]).filter((_,j)=>j!==i))}
                  style={{width:24,height:24,borderRadius:6,background:T.magS,border:"1px solid "+T.mag,color:T.mag,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  ×
                </button>
              </div>
            ))}
            {showNapForm&&(
              <div style={{marginTop:8,display:"flex",gap:6}}>
                <input type="number" placeholder="Min" value={napDur} onChange={e=>setNapDur(e.target.value)}
                  style={{...IS,width:70,fontSize:13}}/>
                <input type="time" value={napTime} onChange={e=>setNapTime(e.target.value)}
                  style={{...IS,flex:1,fontSize:13}}/>
                <button className="press" onClick={()=>{
                  if(!napDur) return;
                  upd(cd,"naps",[...(l.naps||[]),{duration:parseInt(napDur),time:napTime||""}]);
                  setNapDur(""); setNapTime(""); setShowNapForm(false);
                }} style={{padding:"10px 12px",borderRadius:T.r2,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  ADD
                </button>
              </div>
            )}
            {(sleepDuration || (l.naps||[]).length>0) && (
              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:16}}>
                <div><div className="eyebrow" style={{marginBottom:3}}>Night Sleep</div><div style={{fontFamily:T.fM,fontSize:12,color:T.t2}}>{sleepDuration?`${sleepDuration.h}h ${sleepDuration.m}m`:"—"}</div></div>
                <div><div className="eyebrow" style={{marginBottom:3}}>Nap Total</div><div style={{fontFamily:T.fM,fontSize:12,color:T.mag}}>{(l.naps||[]).reduce((s,n)=>s+(n.duration||0),0)}min</div></div>
                <div><div className="eyebrow" style={{marginBottom:3}}>Total Rest</div>
                  <div style={{fontFamily:T.fM,fontSize:12,color:T.lime}}>
                    {(()=>{const tot=(sleepDuration?.total||0)+(l.naps||[]).reduce((s,n)=>s+(n.duration||0),0); return Math.floor(tot/60)+"h "+tot%60+"m";})()}
                  </div>
                </div>
              </div>
            )}
          </div>
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

        {/* ── Activity Log (Feature 9) ── */}
        <div style={{marginTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,paddingLeft:2}}>
            <div className="eyebrow">Activity Log</div>
            <button className="press" onClick={()=>setShowActForm(v=>!v)}
              style={{padding:"6px 12px",borderRadius:10,background:showActForm?"rgba(255,255,255,0.07)":T.limeS,border:"1px solid "+(showActForm?"rgba(255,255,255,0.10)":T.lime),color:showActForm?T.t2:T.lime,fontFamily:T.fM,fontSize:10,fontWeight:600,cursor:"pointer",letterSpacing:".05em"}}>
              {showActForm?"CANCEL":"+ LOG ACTIVITY"}
            </button>
          </div>

          {showActForm&&(
            <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:16,border:"1px solid rgba(255,255,255,0.08)",padding:"14px 16px",marginBottom:12}}>
              <input placeholder="Activity name (e.g. Walked to campus)"
                value={actName} onChange={e=>setActName(e.target.value)}
                style={{...IS,marginBottom:8,fontSize:14}}/>
              <input placeholder="Description (optional)"
                value={actDesc} onChange={e=>setActDesc(e.target.value)}
                style={{...IS,marginBottom:8,fontSize:13}}/>
              <div style={{display:"flex",gap:8}}>
                <input type="number" placeholder="Duration (min)"
                  value={actDur} onChange={e=>setActDur(e.target.value)}
                  style={{...IS,flex:1,fontSize:13}}/>
                <button className="press" onClick={()=>{
                  if(!actName.trim()) return;
                  const entry = {id:Date.now(), name:actName.trim(), desc:actDesc.trim(), duration:parseInt(actDur)||0, time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};
                  upd(cd,"activities",[...(l.activities||[]),entry]);
                  setActName(""); setActDesc(""); setActDur(""); setShowActForm(false);
                }} style={{padding:"12px 16px",borderRadius:T.r2,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:".08em"}}>
                  ADD
                </button>
              </div>
            </div>
          )}

          {(l.activities||[]).length === 0 && !showActForm && (
            <div style={{textAlign:"center",padding:"20px 0",fontFamily:T.fM,fontSize:11,color:T.t3,letterSpacing:".05em"}}>
              No activities logged yet — tap + to add one
            </div>
          )}

          {(l.activities||[]).length > 0 && (
            <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden"}}>
              {(l.activities||[]).map((act,i,arr)=>(
                <div key={act.id}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 16px"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                      🏃
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:500,color:T.t1}}>{act.name}</div>
                      {act.desc&&<div style={{fontSize:11,color:T.t3,marginTop:2,lineHeight:1.4}}>{act.desc}</div>}
                      <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,marginTop:4,letterSpacing:".08em"}}>
                        {act.duration>0?act.duration+" MIN":""}
                        {act.duration>0&&act.time?" · ":""}
                        {act.time}
                      </div>
                    </div>
                    <button className="press" onClick={()=>upd(cd,"activities",(l.activities||[]).filter(a=>a.id!==act.id))}
                      style={{width:26,height:26,borderRadius:8,background:T.magS,border:"1px solid "+T.mag,color:T.mag,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      ×
                    </button>
                  </div>
                  {i<arr.length-1&&<div style={{height:1,background:"rgba(255,255,255,0.05)",marginLeft:64}}/>}
                </div>
              ))}
              <div style={{padding:"10px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:16}}>
                <div style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>{(l.activities||[]).length} activities logged</div>
                {(l.activities||[]).reduce((s,a)=>s+(a.duration||0),0)>0&&(
                  <div style={{fontFamily:T.fM,fontSize:10,color:T.lime}}>{(l.activities||[]).reduce((s,a)=>s+(a.duration||0),0)} min total</div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    );
  };

  /* ════════ SHELL ════════ */
  const NAV = [
    {id:"home",   label:"Home"},
    {id:"log",    label:"Log"},
    {id:"health", label:"Health"},
    {id:"diet",   label:"Diet"},
    {id:"more",   label:"More"},
  ];
  const ICONS = {
    home:   <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M3 11L12 4l9 7v9a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
    log:    <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M9 11l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.6"/></svg>,
    health: <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 21C12 21 4 13.5 4 8.5a4.5 4.5 0 019-0 4.5 4.5 0 019 0C22 13.5 12 21 12 21z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
    diet:   <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="currentColor" strokeWidth="1.6"/><path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    more:   <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M3 20l5-8 4 4 4-7 5 8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/></svg>,
  };

  /* ── Wrapper views for consolidated nav ── */
  const SUB_BTN = (label, id, active, setter) => (
    <button key={id}
      onClick={()=>setter(id)}
      style={{flex:1,padding:"8px 2px",border:"none",borderRadius:9,
        background:active===id?"rgba(255,255,255,0.10)":"transparent",
        color:active===id?T.t1:T.t3,
        fontFamily:T.fM,fontSize:10,fontWeight:active===id?600:400,
        letterSpacing:".08em",textTransform:"uppercase",cursor:"pointer",
        transition:"all .2s",borderBottom:active===id?`2px solid ${T.lime}`:"2px solid transparent"}}>
      {label}
    </button>
  );

  const vLog = () => (
    <div key="log">
      <div style={{display:"flex",gap:0,padding:"0 16px 0",marginBottom:4,borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        {[["Habits","habits"],["Routine","routine"],["Meds","meds"]].map(([l,id])=>SUB_BTN(l,id,logSubTab,setLogSubTab))}
      </div>
      {logSubTab==="habits"  && vToday()}
      {logSubTab==="routine" && vRoutines()}
      {logSubTab==="meds"    && vMeds()}
    </div>
  );

  const vHealth = () => {
    const l = lg(cd);
    // Heart rate data
    const hrLogs = [];
    for (let d = 1; d <= cd; d++) if (data.logs[d]?.hr) hrLogs.push({d, hr: data.logs[d].hr});
    const avgHR  = hrLogs.length ? Math.round(hrLogs.reduce((s,h)=>s+h.hr,0)/hrLogs.length) : null;
    const latHR  = hrLogs.length ? hrLogs[hrLogs.length-1].hr : null;
    const hrZone = latHR ? (latHR<60?"Athlete":latHR<70?"Excellent":latHR<80?"Good":latHR<90?"Average":"High") : null;
    const hrColor= latHR ? (latHR<60?T.lime:latHR<70?T.cyan:latHR<80?"#FFD60A":"#FF9F0A") : T.t3;

    return (
      <div key="health">
        <div style={{display:"flex",gap:0,padding:"0 16px 0",marginBottom:4,borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          {[["Rings","rings"],["Body","body"],["Heart","heart"],["Sleep","sleep"]].map(([l,id])=>SUB_BTN(l,id,healthSubTab,setHealthSubTab))}
        </div>

        {healthSubTab==="rings" && vActivity()}
        {healthSubTab==="body"  && vBody()}

        {/* ── HEART RATE ── */}
        {healthSubTab==="heart" && (
          <div className="fadeUp" style={{padding:"0 16px 32px"}}>
            {/* Hero */}
            <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",borderRadius:22,border:"1px solid rgba(255,255,255,0.10)",padding:"20px",marginBottom:14,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,80,80,0.2),transparent 70%)",filter:"blur(20px)"}}/>
              <div style={{position:"relative"}}>
                <div className="eyebrow-accent" style={{marginBottom:8,color:T.mag}}>Resting Heart Rate</div>
                <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
                  <span style={{fontFamily:T.fM,fontSize:52,fontWeight:300,color:latHR?hrColor:T.t3,letterSpacing:"-0.04em",lineHeight:1}}>{latHR||"—"}</span>
                  <span style={{fontFamily:T.fM,fontSize:16,color:T.t3}}>bpm</span>
                  {hrZone&&<div style={{padding:"3px 10px",borderRadius:99,background:hrColor+"22",border:`1px solid ${hrColor}`,fontFamily:T.fM,fontSize:10,color:hrColor,marginLeft:4}}>{hrZone}</div>}
                </div>
                <div style={{display:"flex",gap:16}}>
                  {avgHR&&<div><div className="eyebrow" style={{marginBottom:2}}>7-Day Avg</div><div style={{fontFamily:T.fM,fontSize:13,color:T.t2}}>{avgHR} bpm</div></div>}
                  {hrLogs.length>0&&<div><div className="eyebrow" style={{marginBottom:2}}>Entries</div><div style={{fontFamily:T.fM,fontSize:13,color:T.t2}}>{hrLogs.length} logged</div></div>}
                </div>
              </div>
            </div>

            {/* Log HR */}
            <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",padding:"16px",marginBottom:14}}>
              <div className="eyebrow" style={{marginBottom:12}}>Log Today's Resting HR</div>
              <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,marginBottom:12,lineHeight:1.6}}>Measure first thing in the morning, before getting up. Sit still for 1 min then count for 30 seconds × 2.</div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input type="number" placeholder="e.g. 62" value={hrValue} onChange={e=>setHrValue(e.target.value)}
                  style={{...IS,flex:1,fontSize:22,textAlign:"center",fontWeight:600}}/>
                <button className="press" onClick={()=>{
                  if(!hrValue||isNaN(hrValue)) return;
                  upd(cd,"hr",parseInt(hrValue));
                  setHrValue("");
                }} style={{padding:"12px 20px",borderRadius:T.r2,background:T.mag,border:"none",color:"#fff",fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:".08em"}}>
                  LOG ♥
                </button>
              </div>
              {/* Quick presets */}
              <div style={{display:"flex",gap:6}}>
                {[55,60,65,70,75,80].map(v=>(
                  <button key={v} className="press" onClick={()=>{ upd(cd,"hr",v); setHrValue(""); }}
                    style={{flex:1,padding:"8px 0",borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:T.t2,fontFamily:T.fM,fontSize:11,cursor:"pointer"}}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* HR Chart — last 14 days */}
            {hrLogs.length>=2&&(()=>{
              const last14 = hrLogs.slice(-14);
              const maxHR=Math.max(...last14.map(h=>h.hr))+5;
              const minHR=Math.min(...last14.map(h=>h.hr))-5;
              const W=340,H=100,PL=28,PR=8,PT=8,PB=20;
              const iW=W-PL-PR,iH=H-PT-PB;
              const xS=(i)=>PL+(i/(last14.length-1))*iW;
              const yS=(v)=>PT+iH-((v-minHR)/(maxHR-minHR))*iH;
              const pts=last14.map((h,i)=>`${xS(i)},${yS(h.hr)}`).join(" ");
              return (
                <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",padding:"16px",marginBottom:14}}>
                  <div className="eyebrow" style={{marginBottom:12}}>HR TREND (LAST {last14.length} ENTRIES)</div>
                  <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",marginBottom:8}}>
                    {[0,0.5,1].map((p,i)=>(
                      <line key={i} x1={PL} y1={PT+iH*p} x2={PL+iW} y2={PT+iH*p} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                    ))}
                    {/* 60bpm "good" reference line */}
                    {minHR<60&&maxHR>60&&<line x1={PL} y1={yS(60)} x2={PL+iW} y2={yS(60)} stroke={T.lime} strokeWidth="1" strokeDasharray="4 4" opacity="0.4"/>}
                    <polyline points={pts} fill="none" stroke={T.mag} strokeWidth="2" strokeLinejoin="round"/>
                    {last14.map((h,i)=>(
                      <circle key={i} cx={xS(i)} cy={yS(h.hr)} r={i===last14.length-1?4:2.5} fill={i===last14.length-1?T.mag:"rgba(255,80,120,0.7)"} stroke="#050507" strokeWidth="1.5"/>
                    ))}
                    {[minHR+2,Math.round((minHR+maxHR)/2),maxHR-2].map((v,i)=>(
                      <text key={i} x={PL-3} y={yS(v)+3} fill="rgba(255,255,255,0.3)" fontSize="7" textAnchor="end" fontFamily="monospace">{v}</text>
                    ))}
                  </svg>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>Lowest: <span style={{color:T.lime}}>{Math.min(...last14.map(h=>h.hr))} bpm</span></div>
                    <div style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>Highest: <span style={{color:T.mag}}>{Math.max(...last14.map(h=>h.hr))} bpm</span></div>
                  </div>
                </div>
              );
            })()}

            {/* HR History list */}
            {hrLogs.length>0&&(
              <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",marginBottom:14}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  <div className="eyebrow">HR LOG</div>
                </div>
                {hrLogs.slice().reverse().slice(0,10).map((h,i,arr)=>{
                  const z=h.hr<60?"Athlete":h.hr<70?"Excellent":h.hr<80?"Good":h.hr<90?"Average":"High";
                  const c=h.hr<60?T.lime:h.hr<70?T.cyan:h.hr<80?"#FFD60A":"#FF9F0A";
                  return (
                    <div key={h.d}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px"}}>
                        <div>
                          <div style={{fontSize:13,color:T.t1,fontWeight:500}}>Day {h.d}</div>
                          <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,marginTop:2}}>{z}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                          <span style={{fontFamily:T.fM,fontSize:18,color:c,fontWeight:600}}>{h.hr}</span>
                          <span style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>bpm</span>
                        </div>
                      </div>
                      {i<arr.length-1&&<div style={{height:1,background:"rgba(255,255,255,0.05)",marginLeft:16}}/>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── APPLE HEALTH SYNC ── */}
            {(()=>{
              const syncToken = data.syncToken || "—";
              const apiUrl = "https://goz-transfo.vercel.app/api/health";
              const syncUrl = `${apiUrl}?tok=${syncToken}&steps={{Steps Count}}&kcal={{Active Energy}}&km={{Walking+Running Distance}}&hr={{Heart Rate}}&weight={{Body Weight}}`;
              const lastSynced = (() => {
                const l = data.logs[cd] || {};
                return l.appleHealthSynced ? new Date(l.appleHealthSynced).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : null;
              })();
              const hasTodayHealthData = !!(data.logs[cd]?.steps || data.logs[cd]?.appleCalsBurned);

              const steps = [
                {n:"1", title:"Get your Sync Token", body:`Your personal token is shown below. Copy it — you'll paste it into the Shortcut.`},
                {n:"2", title:"Open iOS Shortcuts app", body:`On your iPhone, open the Shortcuts app. Tap the + button to create a new Shortcut.`},
                {n:"3", title:"Add Health actions", body:`Tap "Add Action" → search "Health" → add these:\n• Get Steps Count (today)\n• Get Active Energy (today)\n• Get Walking + Running Distance (today)\n• Get Heart Rate (today, latest sample)\n• Get Workouts (today)\n• Get Body Weight (latest sample)`},
                {n:"4", title:"Add a URL action", body:`Add action → "Get Contents of URL". Set:\n• URL: ${apiUrl}\n• Method: POST\n• Body: JSON\n• Add keys: syncToken="${syncToken}", steps=Steps result, activeKcal=Active Energy, distanceKm=Distance result, heartRate=Heart Rate, workoutMins=Workout duration, weight=Body Weight`},
                {n:"5", title:"Automate it", body:`Go to Automations tab → + → Time of Day → set 8:00 AM daily → add your new Shortcut. Done! It will sync every morning automatically.`},
              ];

              return (
                <div style={{borderRadius:22,border:"1.5px solid rgba(0,210,255,0.3)",overflow:"hidden"}}>

                  {/* Header */}
                  <div style={{padding:"18px",background:"linear-gradient(135deg,rgba(0,210,255,0.13),rgba(180,255,80,0.07))"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontSize:28}}>🍎</span>
                        <div>
                          <div style={{fontFamily:T.fM,fontSize:12,fontWeight:700,color:T.t1}}>Apple Health Sync</div>
                          <div style={{fontFamily:T.fM,fontSize:9,color:T.t3,marginTop:2}}>Auto-fills steps, calories, weight & more</div>
                        </div>
                      </div>
                      <div style={{background:hasTodayHealthData?"rgba(180,255,80,0.2)":"rgba(255,255,255,0.07)",borderRadius:8,padding:"5px 10px",border:`1px solid ${hasTodayHealthData?T.lime+"55":"rgba(255,255,255,0.1)"}`}}>
                        <div style={{fontFamily:T.fM,fontSize:8,fontWeight:800,color:hasTodayHealthData?T.lime:T.t3,letterSpacing:".1em"}}>{hasTodayHealthData?"● SYNCED":"○ NOT SET UP"}</div>
                      </div>
                    </div>
                    {lastSynced&&<div style={{fontFamily:T.fM,fontSize:9,color:T.cyan}}>Last sync today: {lastSynced}</div>}
                  </div>

                  <div style={{padding:"18px",background:"rgba(0,0,0,0.25)"}}>

                    {/* What syncs grid */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:18}}>
                      {[["👟","Steps","steps"],["🔥","Calories","appleCalsBurned"],["📍","Distance","km"],["❤️","Heart Rate","heartRate"],["💪","Workout","workoutDone"],["⚖️","Weight","weight"]].map(([ic,lb,field])=>{
                        const ok=!!(data.logs[cd]?.[field]);
                        return(
                          <div key={lb} style={{textAlign:"center",padding:"10px 6px",background:ok?"rgba(180,255,80,0.08)":"rgba(255,255,255,0.03)",borderRadius:12,border:`1px solid ${ok?T.lime+"44":"rgba(255,255,255,0.06)"}`}}>
                            <div style={{fontSize:18,marginBottom:4}}>{ic}</div>
                            <div style={{fontFamily:T.fM,fontSize:8,color:ok?T.lime:T.t3}}>{lb}</div>
                            {ok&&<div style={{fontFamily:T.fM,fontSize:8,color:T.lime,marginTop:2}}>✓</div>}
                          </div>
                        );
                      })}
                    </div>

                    {/* ── 3 EASY STEPS ── */}
                    <div style={{fontFamily:T.fM,fontSize:10,fontWeight:700,color:T.t1,marginBottom:14,letterSpacing:".04em"}}>3 steps, takes 2 minutes 👇</div>

                    {/* STEP 1 */}
                    <div style={{marginBottom:14,padding:"14px",background:"rgba(255,255,255,0.04)",borderRadius:16,border:"1px solid rgba(255,255,255,0.08)"}}>
                      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                        <div style={{width:26,height:26,borderRadius:9,background:T.cyan,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontFamily:T.fM,fontSize:11,color:"#000",fontWeight:800}}>1</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:600,color:T.t1}}>Copy your personal sync URL</div>
                      </div>
                      <div style={{fontFamily:"monospace",fontSize:9,color:T.cyan,background:"rgba(0,0,0,0.3)",padding:"10px 11px",borderRadius:10,wordBreak:"break-all",lineHeight:1.7,marginBottom:10}}>
                        {`https://goz-transfo.vercel.app/api/health?tok=${syncToken}&steps={{Steps Count}}&kcal={{Active Energy}}&km={{Walking+Running Distance}}&hr={{Heart Rate}}&weight={{Body Weight}}`}
                      </div>
                      <button className="press"
                        onClick={()=>{
                          const url=`https://goz-transfo.vercel.app/api/health?tok=${syncToken}&steps={{Steps Count}}&kcal={{Active Energy}}&km={{Walking+Running Distance}}&hr={{Heart Rate}}&weight={{Body Weight}}`;
                          navigator.clipboard?.writeText(url).then(()=>alert("✅ URL copied! Now go to Step 2."));
                        }}
                        style={{width:"100%",padding:"11px",borderRadius:12,background:T.cyan,border:"none",color:"#000",fontFamily:T.fM,fontSize:11,fontWeight:800,cursor:"pointer",letterSpacing:".08em"}}>
                        📋 COPY SYNC URL
                      </button>
                    </div>

                    {/* STEP 2 */}
                    <div style={{marginBottom:14,padding:"14px",background:"rgba(255,255,255,0.04)",borderRadius:16,border:"1px solid rgba(255,255,255,0.08)"}}>
                      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                        <div style={{width:26,height:26,borderRadius:9,background:T.lime,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontFamily:T.fM,fontSize:11,color:"#000",fontWeight:800}}>2</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:600,color:T.t1}}>Build the Shortcut on iPhone</div>
                      </div>
                      {[
                        {emoji:"📱",text:'Open the Shortcuts app → tap + → name it "Goz Sync"'},
                        {emoji:"❤️",text:'Tap "Add Action" → search "Log Health" — add: Steps Count, Active Energy, Walking+Running Distance, Heart Rate, Body Weight. Set each to "Today".'},
                        {emoji:"🔗",text:'Add action → search "Open URLs" → paste the URL you copied in Step 1. The {{variables}} will auto-link to your Health actions.'},
                      ].map((s,i)=>(
                        <div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<2?"1px solid rgba(255,255,255,0.05)":"none"}}>
                          <span style={{fontSize:16,flexShrink:0}}>{s.emoji}</span>
                          <span style={{fontSize:12,color:T.t2,lineHeight:1.6}}>{s.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* STEP 3 */}
                    <div style={{marginBottom:18,padding:"14px",background:"rgba(255,255,255,0.04)",borderRadius:16,border:"1px solid rgba(255,255,255,0.08)"}}>
                      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                        <div style={{width:26,height:26,borderRadius:9,background:T.mag,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontFamily:T.fM,fontSize:11,color:"#fff",fontWeight:800}}>3</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:600,color:T.t1}}>Automate it (runs every morning)</div>
                      </div>
                      {[
                        {emoji:"⚙️",text:"In Shortcuts → go to the Automations tab (clock icon at the bottom)"},
                        {emoji:"➕",text:'Tap + → "Time of Day" → set 8:00 AM → Daily'},
                        {emoji:"🎯",text:'Tap "New Blank Automation" → Add Action → Shortcuts → Run Shortcut → pick "Goz Sync" → Done'},
                        {emoji:"🔕",text:'"Ask Before Running" → turn it OFF so it runs silently'},
                      ].map((s,i)=>(
                        <div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<3?"1px solid rgba(255,255,255,0.05)":"none"}}>
                          <span style={{fontSize:16,flexShrink:0}}>{s.emoji}</span>
                          <span style={{fontSize:12,color:T.t2,lineHeight:1.6}}>{s.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Test button */}
                    <button className="press"
                      onClick={async()=>{
                        try{
                          const r=await fetch(apiUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({syncToken,steps:9000,activeKcal:350,distanceKm:7.2,hr:62,weight:null})});
                          const j=await r.json();
                          alert(j.success?`✅ ${j.message}\n\nYour sync is working! Now set up the Shortcut above and it'll run automatically every morning.`:`❌ ${j.error}`);
                        }catch(e){alert("❌ "+e.message);}
                      }}
                      style={{width:"100%",padding:"13px",borderRadius:14,background:"rgba(0,210,255,0.1)",border:"1.5px solid rgba(0,210,255,0.35)",color:T.cyan,fontFamily:T.fM,fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:".08em"}}>
                      🧪 TEST CONNECTION FIRST (tap this before Step 2)
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── SLEEP sub-tab ── */}
        {healthSubTab==="sleep" && (()=>{
          const l = lg(cd);
          const SLEEP_T = "23:30";
          const dur = (()=>{
            const s=l.sleepTime, w=l.wakeTime;
            if(!s||!w) return null;
            const [sh,sm]=s.split(":").map(Number), [wh,wm]=w.split(":").map(Number);
            let m=(wh*60+wm)-(sh*60+sm); if(m<0) m+=1440;
            return {h:Math.floor(m/60),m:m%60,total:m};
          })();
          const onTime = l.sleepTime&&l.sleepTime<=SLEEP_T;
          // 14-day sleep chart
          const sleepDays=Array.from({length:14},(_,i)=>Math.max(1,cd-13+i)).filter(d=>d>=1);
          const avgSleep=(()=>{
            const valid=sleepDays.filter(d=>{
              const s=data.logs[d]?.sleepTime,w=data.logs[d]?.wakeTime;
              if(!s||!w) return false;
              const [sh,sm]=s.split(":").map(Number),[wh,wm]=w.split(":").map(Number);
              let m=(wh*60+wm)-(sh*60+sm);if(m<0)m+=1440;return m>0;
            });
            if(!valid.length) return null;
            const total=valid.reduce((s,d)=>{
              const sd=data.logs[d].sleepTime,wd=data.logs[d].wakeTime;
              const [sh,sm]=sd.split(":").map(Number),[wh,wm]=wd.split(":").map(Number);
              let m=(wh*60+wm)-(sh*60+sm);if(m<0)m+=1440;return s+m;
            },0);
            const avg=total/valid.length;
            return {h:Math.floor(avg/60),m:Math.round(avg%60)};
          })();

          return (
            <div className="fadeUp" style={{padding:"0 16px 32px"}}>
              {/* Sleep hero */}
              <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))",borderRadius:22,border:"1px solid rgba(255,255,255,0.10)",padding:"20px",marginBottom:14,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,80,200,0.2),transparent 70%)",filter:"blur(20px)"}}/>
                <div style={{position:"relative"}}>
                  <div className="eyebrow-accent" style={{marginBottom:8}}>Sleep Tracking</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:10}}>
                    <span style={{fontFamily:T.fM,fontSize:48,fontWeight:300,color:dur?(dur.total>=420?T.lime:T.mag):T.t3,letterSpacing:"-0.04em",lineHeight:1}}>
                      {dur?`${dur.h}h ${dur.m}m`:"—"}
                    </span>
                  </div>
                  <div style={{display:"flex",gap:16}}>
                    {avgSleep&&<div><div className="eyebrow" style={{marginBottom:2}}>14-Day Avg</div><div style={{fontFamily:T.fM,fontSize:13,color:T.t2}}>{avgSleep.h}h {avgSleep.m}m</div></div>}
                    <div><div className="eyebrow" style={{marginBottom:2}}>Target</div><div style={{fontFamily:T.fM,fontSize:13,color:T.lime}}>7h 30m+</div></div>
                    <div><div className="eyebrow" style={{marginBottom:2}}>Bedtime</div><div style={{fontFamily:T.fM,fontSize:13,color:onTime?T.lime:T.t2}}>{l.sleepTime||"—"}</div></div>
                  </div>
                </div>
              </div>

              {/* Log sleep */}
              <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",marginBottom:14}}>
                <div style={{padding:"14px 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div className="eyebrow">Log Sleep</div>
                  {dur&&<span style={{fontFamily:T.fM,fontSize:12,color:dur.total>=420?T.lime:T.mag,fontWeight:600}}>{dur.h}h {dur.m}m</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                  <div style={{padding:"16px",borderRight:"1px solid rgba(255,255,255,0.06)"}}>
                    <div className="eyebrow" style={{marginBottom:8,color:T.mag}}>Bedtime</div>
                    <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,marginBottom:6}}>TARGET · 11:30 PM</div>
                    <input type="time" value={l.sleepTime||""} onChange={e=>upd(cd,"sleepTime",e.target.value)}
                      style={{...IS,fontSize:18,fontWeight:600,textAlign:"center",padding:"8px 10px",color:onTime?T.lime:T.t1}}/>
                  </div>
                  <div style={{padding:"16px"}}>
                    <div className="eyebrow" style={{marginBottom:8,color:T.lime}}>Wake Up</div>
                    <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,marginBottom:6}}>LOG YOUR RISE</div>
                    <input type="time" value={l.wakeTime||""} onChange={e=>upd(cd,"wakeTime",e.target.value)}
                      style={{...IS,fontSize:18,fontWeight:600,textAlign:"center",padding:"8px 10px"}}/>
                  </div>
                </div>
                {/* Quality */}
                <div style={{padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div className="eyebrow" style={{marginBottom:8}}>Sleep Quality</div>
                  <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                    {[1,2,3,4,5].map(star=>(
                      <button key={star} className="press" onClick={()=>upd(cd,"sleepQuality",star)}
                        style={{fontSize:22,background:"none",border:"none",cursor:"pointer",filter:star<=(l.sleepQuality||0)?"none":"grayscale(1) opacity(0.3)",transition:"filter .15s"}}>
                        ⭐
                      </button>
                    ))}
                  </div>
                  {l.sleepQuality&&<div style={{textAlign:"center",fontFamily:T.fM,fontSize:10,color:T.t3,marginTop:5}}>{["","Poor","Fair","Good","Great","Perfect"][l.sleepQuality]} sleep</div>}
                </div>
              </div>

              {/* Intermittent Fasting Timer */}
              <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",padding:"16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div className="eyebrow">INTERMITTENT FASTING</div>
                  {data.fastStart && (
                    <button className="press" onClick={()=>setData(d=>({...d,fastStart:null}))} style={{padding:"4px 10px",borderRadius:8,background:"rgba(255,80,200,0.12)",border:"1px solid rgba(255,80,200,0.3)",color:T.mag,fontFamily:T.fM,fontSize:10,cursor:"pointer"}}>END FAST</button>
                  )}
                </div>
                {data.fastStart ? (() => {
                  const elapsed = Math.floor((fastNow - data.fastStart) / 60000);
                  const h = Math.floor(elapsed/60), m = elapsed%60;
                  const pct = Math.min(100, (elapsed / (16*60)) * 100);
                  return (
                    <div>
                      <div style={{fontFamily:T.fM,fontSize:48,fontWeight:300,color:pct>=100?T.lime:T.cyan,letterSpacing:"-0.04em",lineHeight:1,marginBottom:6}}>{String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}</div>
                      <div style={{height:6,background:"rgba(255,255,255,0.07)",borderRadius:3,overflow:"hidden",marginBottom:6}}>
                        <div style={{width:`${pct}%`,height:"100%",background:pct>=100?"linear-gradient(90deg,"+T.lime+","+T.cyan+")":"linear-gradient(90deg,"+T.cyan+","+T.lime+")",borderRadius:3,transition:"width .5s"}}/>
                      </div>
                      <div style={{fontFamily:T.fM,fontSize:10,color:T.t3}}>{pct>=100?"✅ 16:8 window reached!":Math.round(100-pct)+"% to 16h"} · Started {new Date(data.fastStart).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                    </div>
                  );
                })() : (
                  <div>
                    <div style={{fontFamily:T.fM,fontSize:13,color:T.t3,marginBottom:12,lineHeight:1.6}}>Track your eating window. Tap below when you finish your last meal.</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[{l:"Start 16:8 Fast",d:"16h fasting, 8h eating",t:16},{l:"Start 14:10 Fast",d:"14h fasting, 10h eating",t:14}].map(opt=>(
                        <button key={opt.t} className="press" onClick={()=>setData(d=>({...d,fastStart:Date.now()}))}
                          style={{padding:"12px 10px",borderRadius:12,background:"rgba(100,210,255,0.08)",border:"1px solid rgba(100,210,255,0.2)",color:T.cyan,fontFamily:T.fM,fontSize:10,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                          <div style={{marginBottom:3}}>{opt.l}</div>
                          <div style={{fontSize:9,color:T.t3}}>{opt.d}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 14-day sleep bars */}
              <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",borderRadius:20,border:"1px solid rgba(255,255,255,0.06)",padding:"16px"}}>
                <div className="eyebrow" style={{marginBottom:12}}>14-DAY SLEEP HISTORY</div>
                <div style={{display:"flex",gap:4,justifyContent:"space-between",alignItems:"flex-end"}}>
                  {sleepDays.map(d=>{
                    const s=data.logs[d]?.sleepTime, w=data.logs[d]?.wakeTime;
                    let mins=0;
                    if(s&&w){const [sh,sm]=s.split(":").map(Number),[wh,wm]=w.split(":").map(Number);mins=(wh*60+wm)-(sh*60+sm);if(mins<0)mins+=1440;}
                    const pct=Math.min(100,Math.round((mins/540)*100));
                    const isT=d===cd;
                    const dn=data.startDate?["Su","Mo","Tu","We","Th","Fr","Sa"][new Date(new Date(data.startDate).getTime()+(d-1)*86400000).getDay()]:"";
                    const good=mins>=420;
                    return (
                      <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <div style={{width:"100%",height:60,background:"rgba(255,255,255,0.04)",borderRadius:5,overflow:"hidden",display:"flex",alignItems:"flex-end"}}>
                          <div style={{width:"100%",height:`${pct}%`,background:isT?(good?T.lime:T.mag):(good?"rgba(206,252,0,0.5)":"rgba(255,80,80,0.4)"),borderRadius:5,transition:"height .6s"}}/>
                        </div>
                        <span style={{fontFamily:T.fM,fontSize:8,color:isT?T.lime:T.t3,fontWeight:isT?700:400}}>{dn}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                  <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:8,height:8,borderRadius:2,background:T.lime}}/><span style={{fontFamily:T.fM,fontSize:9,color:T.t3}}>7h+ (Goal)</span></div>
                  <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:8,height:8,borderRadius:2,background:T.mag}}/><span style={{fontFamily:T.fM,fontSize:9,color:T.t3}}>Under 7h</span></div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const vMore = () => (
    <div key="more">
      <div style={{display:"flex",gap:0,padding:"0 16px 0",marginBottom:4,borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        {[["Stats","stats"],["Mood","mood"],["Plan","plan"]].map(([l,id])=>SUB_BTN(l,id,moreSubTab,setMoreSubTab))}
      </div>
      {moreSubTab==="stats" && vStats()}
      {moreSubTab==="mood"  && vMood()}
      {moreSubTab==="plan"  && vPlan()}
    </div>
  );

  const av = view==="dayDetail"?"more":view;

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
          <span style={{fontFamily:T.fD,fontSize:18,fontWeight:600,letterSpacing:"-0.02em",color:T.t1}}>{data.name?<>{data.name.split(" ")[0]} <span style={{color:T.lime}}>2.0</span></>:<>Goz <span style={{color:T.lime}}>2.0</span></>}</span>
          <span className="eyebrow">{PI.label} · {PI.name}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {!isOnline && (
            <div style={{fontFamily:T.fM,fontSize:10,color:"#FF9F0A",letterSpacing:".05em",padding:"3px 8px",borderRadius:999,background:"rgba(255,159,10,0.12)",border:"1px solid rgba(255,159,10,0.3)"}}>⚠ OFFLINE</div>
          )}
          {isOnline && syncStatus!=="idle"&&(
            <div style={{fontFamily:T.fM,fontSize:10,color:syncStatus==="saved"?T.lime:T.t3,letterSpacing:".05em"}}>
              {syncStatus==="saving"?<><span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",border:"1.5px solid rgba(255,255,255,0.2)",borderTopColor:T.lime,animation:"spin .7s linear infinite",marginRight:5}}/>SAVING</> : "☁ SYNCED"}
            </div>
          )}
          <div style={{display:"flex",alignItems:"baseline",gap:4,padding:"7px 12px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:999}}>
            <span style={{fontFamily:T.fM,color:T.lime,fontSize:12,fontWeight:600,letterSpacing:".05em"}}>D{cd}</span>
            <span style={{fontFamily:T.fM,color:T.t3,fontSize:10}}>/ {data.targetDays||120}</span>
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

      {/* Feature 1: Milestone Modal */}
      {milestone && (() => {
        const mDay = milestone;
        const phaseNum = Math.ceil(mDay/30);
        const phaseName = ["Phase 1 Complete!","Phase 2 Complete!","Phase 3 Complete!","120 Days Done! 🏆"][phaseNum-1];
        const daysLogged = Object.keys(data.logs).length;
        const allCpds = Array.from({length:mDay},(_,i)=>i+1).map(d=>{const l=data.logs[d]||{};const c=["noAlcohol","noPorn","workoutDone","drank3L","ate10k","sleptWell"].filter(f=>l[f]).length;return Math.round(c/6*100);});
        const avgC = allCpds.length ? Math.round(allCpds.reduce((a,b)=>a+b,0)/allCpds.length) : 0;
        const dismissMilestone = () => { upd(mDay, "milestoneShown", true); setMilestone(null); };
        return (
          <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,5,7,0.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",padding:"24px"}}>
            <div className="popIn" style={{width:"100%",maxWidth:380,background:"linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))",borderRadius:28,border:"1px solid rgba(255,255,255,0.12)",padding:"32px 28px",textAlign:"center",position:"relative",overflow:"hidden",boxShadow:`0 0 80px oklch(0.92 0.22 130 / 0.3)`}}>
              <div style={{position:"absolute",inset:0,background:`radial-gradient(60% 40% at 50% 0%,oklch(0.92 0.22 130 / 0.22),transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{position:"relative"}}>
                <div style={{fontSize:72,marginBottom:16,animation:"popIn .6s cubic-bezier(.22,.68,0,1.2) both"}}>🏆</div>
                <div style={{fontFamily:T.fM,fontSize:10,color:T.t3,letterSpacing:".2em",marginBottom:8}}>MILESTONE REACHED</div>
                <div style={{fontFamily:T.fD,fontSize:32,fontWeight:700,color:T.lime,letterSpacing:"-0.02em",marginBottom:6,textShadow:`0 0 30px oklch(0.92 0.22 130 / 0.7)`}}>{phaseName}</div>
                <div style={{fontFamily:T.fM,fontSize:13,color:T.t2,marginBottom:24}}>Day {mDay} of 120</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
                  {[{l:"Days Logged",v:daysLogged},{l:"Avg Completion",v:`${avgC}%`},{l:"Weight Lost",v:`${wLost.toFixed(1)}kg`}].map((s,i)=>(
                    <div key={i} style={{background:"rgba(255,255,255,0.06)",borderRadius:14,padding:"12px 8px"}}>
                      <div style={{fontFamily:T.fM,fontSize:18,color:T.lime,fontWeight:700,letterSpacing:"-0.02em"}}>{s.v}</div>
                      <div className="mono" style={{fontSize:8,color:T.t3,marginTop:3,letterSpacing:".1em"}}>{s.l.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <button className="press" onClick={dismissMilestone}
                  style={{width:"100%",padding:16,borderRadius:14,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".1em",boxShadow:`0 8px 40px oklch(0.92 0.22 130 / 0.5)`}}>
                  KEEP GOING →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🎉 GOAL REACHED CELEBRATION */}
      {showGoalCelebration && !goalCelebrationDismissed && (()=>{
        const startW = data.startWeight || 80;
        const targetW = data.goalWeight || 68;
        let currW = null;
        for(let d=1; d<=cdFn(); d++) if(data.logs[d]?.weight) currW = data.logs[d].weight;
        const totalLost = currW ? (startW - currW).toFixed(1) : (startW - targetW).toFixed(1);
        const daysUsed = cdFn();
        const dismiss = () => { setShowGoalCelebration(false); setGoalCelebrationDismissed(true); };
        return (
          <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(5,5,7,0.95)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",padding:"24px"}}>
            {/* Confetti-style sparkle bg */}
            <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
              {["🌟","✨","🎊","🎉","⭐","💫","🏆","🎊","✨","🌟","💪","🎯"].map((e,i)=>(
                <div key={i} style={{position:"absolute",fontSize:Math.random()*20+14,opacity:.7,left:`${(i*8.3)%100}%`,top:`${(i*13+7)%100}%`,animation:`float${i%3} 3s ease-in-out infinite`,animationDelay:`${i*0.4}s`}}>{e}</div>
              ))}
            </div>
            <div className="popIn" style={{width:"100%",maxWidth:380,background:"linear-gradient(160deg,rgba(180,255,80,0.12),rgba(0,255,200,0.06),rgba(255,255,255,0.04))",borderRadius:32,border:"1.5px solid oklch(0.92 0.22 130 / 0.5)",padding:"36px 28px",textAlign:"center",position:"relative",overflow:"hidden",boxShadow:`0 0 120px oklch(0.92 0.22 130 / 0.5), 0 40px 80px rgba(0,0,0,0.8)`}}>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(60% 50% at 50% 0%,oklch(0.92 0.22 130 / 0.3),transparent 70%)",pointerEvents:"none"}}/>
              <div style={{position:"relative"}}>
                <div style={{fontSize:80,marginBottom:4,lineHeight:1}}>🏆</div>
                <div style={{fontFamily:T.fM,fontSize:10,color:T.lime,letterSpacing:".25em",marginBottom:12}}>GOAL ACHIEVED</div>
                <div style={{fontFamily:T.fS,fontStyle:"italic",fontSize:38,color:T.t1,letterSpacing:"-0.02em",lineHeight:1.15,marginBottom:6}}>
                  You did it,<br/><span style={{color:T.lime}}>{data.name?.split(" ")[0] || "Champion"}.</span>
                </div>
                <div style={{fontSize:14,color:T.t2,lineHeight:1.7,marginBottom:24}}>
                  You reached your goal weight of <strong style={{color:T.lime}}>{targetW} kg</strong>. This took discipline, sacrifice, and real grit. Be proud.
                </div>
                {/* Stats */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:26}}>
                  {[["⚖️",`${totalLost}kg`,"LOST"],["📅",`${daysUsed}d`,"TAKEN"],["🎯","100%","COMPLETE"]].map(([ic,v,lb])=>(
                    <div key={lb} style={{background:"rgba(180,255,80,0.10)",borderRadius:14,padding:"12px 8px",border:"1px solid oklch(0.92 0.22 130 / 0.25)"}}>
                      <div style={{fontSize:20,marginBottom:4}}>{ic}</div>
                      <div style={{fontFamily:T.fM,fontSize:18,fontWeight:700,color:T.lime,letterSpacing:"-0.01em"}}>{v}</div>
                      <div style={{fontFamily:T.fM,fontSize:8,color:T.t3,letterSpacing:".12em",marginTop:2}}>{lb}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:12,color:T.t3,lineHeight:1.7,marginBottom:22,padding:"12px 14px",background:"rgba(255,255,255,0.04)",borderRadius:14,border:"1px solid rgba(255,255,255,0.06)"}}>
                  "The secret of getting ahead is getting started. The secret of getting started is breaking your complex overwhelming tasks into small, manageable tasks, and then starting on the first one."
                </div>
                <button className="press" onClick={dismiss}
                  style={{width:"100%",padding:"16px",borderRadius:16,background:T.lime,border:"none",color:"#000",fontFamily:T.fM,fontSize:14,fontWeight:800,cursor:"pointer",letterSpacing:".1em",boxShadow:`0 8px 40px oklch(0.92 0.22 130 / 0.6)`,marginBottom:12}}>
                  🎊 CELEBRATE & CONTINUE
                </button>
                <button className="press" onClick={dismiss}
                  style={{background:"none",border:"none",color:T.t3,fontFamily:T.fM,fontSize:11,cursor:"pointer",letterSpacing:".05em"}}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Content */}
      <div ref={ref} style={{overflowY:"auto",flex:1,paddingBottom:100,paddingTop:16,position:"relative",zIndex:1}}>
        {view==="home"     &&vHome()}
        {view==="log"      &&vLog()}
        {view==="health"   &&vHealth()}
        {view==="diet"     &&vDiet()}
        {view==="more"     &&vMore()}
        {view==="dayDetail"&&vDD()}
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
