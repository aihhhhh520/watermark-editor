import React,{useState,useEffect}from'react'

const fmt=n=>{if(n===null||n===undefined||isNaN(n))return'--';return Number(n).toFixed(2)}
const pct=(a,b)=>b&&b!==0?((a-b)/b*100):null
const arrow=v=>v===null?'':v>=0?'↑':'↓'

function todayStr(){const d=new Date();return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`}
function offsetDays(d){const t=new Date();t.setDate(t.getDate()+d);return `${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,'0')}-${t.getDate().toString().padStart(2,'0')}`}

const STATIONS=['镇宁2站','镇宁4站']
const OILS=[
  {key:'diesel0',name:'0号柴油',density:0.84},
  {key:'gas92',name:'92号汽油',density:0.725},
  {key:'gas95',name:'95号汽油',density:0.737},
  {key:'gas98',name:'98号汽油',density:0.753},
  {key:'lightOil',name:'轻油合计',density:null},
]
function load(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return{}}}
function save(k,db){localStorage.setItem(k,JSON.stringify(db))}

// ============================================================
// Template 0 — 柴油日报
// ============================================================
function DieselTemplate(){
  const[db,setDB]=useState(()=>load('diesel_v3'))
  const[vals,setVals]=useState({'镇宁2站':'','镇宁4站':''})
  const[lyVals,setLyVals]=useState({'镇宁2站':'','镇宁4站':''})
  const[out,setOut]=useState('');const[cp,setCp]=useState(false)
  useEffect(()=>{save('diesel_v3',db)},[db])
  const yd=offsetDays(-1),ly=offsetDays(-365)
  const get=(d,s)=>(db[d+'|'+s]||{}).diesel??null
  useEffect(()=>{for(const s of STATIONS){const v=get(ly,s);if(v!==null&&!lyVals[s])setLyVals(p=>({...p,[s]:String(v)}))}},[db])

  const gen=()=>{
    let r=[]
    for(const s of STATIONS){
      const t=parseFloat(vals[s]);if(isNaN(t))continue
      setDB(p=>({...p,[todayStr()+'|'+s]:{diesel:t,date:todayStr(),station:s}}))
      const ln=parseFloat(lyVals[s]);if(!isNaN(ln))setDB(p=>({...p,[ly+'|'+s]:{diesel:ln,date:ly,station:s}}))
      const pv=get(yd,s),l=get(ly,s)??ln
      let line=`${s}：柴油销量${fmt(t)}吨`
      if(pv!==null){const h=pct(t,pv);line+=`，上期销售${fmt(pv)}吨，环比${arrow(h)}${Math.abs(h).toFixed(1)}%`}
      if(l!==null&&!isNaN(l)){const tb=pct(t,l);line+=`，去年同期销售${fmt(l)}吨，同比${arrow(tb)}${Math.abs(tb).toFixed(1)}%`}
      r.push(line)
    }
    setOut(r.join('\n'))
  }
  const ok=STATIONS.every(s=>vals[s]&&!isNaN(parseFloat(vals[s])))
  return<div className="space-y-3">
    {STATIONS.map(s=>{const t=parseFloat(vals[s]),pv=get(yd,s),l=get(ly,s)??parseFloat(lyVals[s])
      return<div key={s} className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 mb-3">{s}</h3>
        <div className="flex items-center gap-2 mb-3"><span className="text-sm text-gray-500 w-16">今日柴油</span><input type="number" step="0.01" inputMode="decimal" value={vals[s]} onChange={e=>setVals(p=>({...p,[s]:e.target.value}))} placeholder="吨数" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-right focus:outline-none focus:border-[#007AFF]"/><span className="text-gray-400 text-sm">吨</span></div>
        <div className="flex items-center gap-2"><span className="text-sm text-gray-400 w-16">去年同期</span><input type="number" step="0.01" inputMode="decimal" value={lyVals[s]} onChange={e=>setLyVals(p=>({...p,[s]:e.target.value}))} placeholder={l!==null?`${fmt(l)}吨`:'手动输入'} className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-[#007AFF]"/><span className="text-xs text-gray-400">吨</span></div>
        {!isNaN(t)&&<div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm">
          {pv!==null&&<R l="环比" v={`${arrow(pct(t,pv))} ${Math.abs(pct(t,pv)).toFixed(1)}%`} c={pct(t,pv)>=0?'text-green-600':'text-red-500'}/>}
          {l!==null&&!isNaN(l)&&<R l="同比" v={`${arrow(pct(t,l))} ${Math.abs(pct(t,l)).toFixed(1)}%`} c={pct(t,l)>=0?'text-green-600':'text-red-500'}/>}
        </div>}
      </div>})}
    <button onClick={gen} disabled={!ok} className={`w-full py-3.5 rounded-xl text-base font-medium ${ok?'bg-[#007AFF] text-white':'bg-gray-200 text-gray-400'}`}>生成汇报并保存</button>
    {out&&<OB out={out} cp={cp} onCopy={()=>{navigator.clipboard.writeText(out);setCp(true);setTimeout(()=>setCp(false),2000)}}/>}
    {Object.keys(db).length>0&&<HB db={db} label="柴油"/>}
  </div>
}

// ============================================================
// Template 1 — 油品全类
// ============================================================
function OilTemplate(){
  const[db,setDB]=useState(()=>load('oil_v2'))
  const[vals,setVals]=useState(()=>{const o={};for(const s of STATIONS)for(const oi of OILS)o[s+'|'+oi.key]='';return o})
  const[out,setOut]=useState('');const[cp,setCp]=useState(false)
  useEffect(()=>{save('oil_v2',db)},[db])
  const yd=offsetDays(-1)

  const gen=()=>{
    let lines=[]
    for(const s of STATIONS){
      let sl=[],total=0
      for(const oi of OILS){
        const v=parseFloat(vals[s+'|'+oi.key]);if(isNaN(v))continue
        setDB(p=>({...p,[todayStr()+'|'+s+'|'+oi.key]:{val:v,date:todayStr(),station:s,oil:oi.key}}))
        const pv=db[yd+'|'+s+'|'+oi.key]?.val??null
        let l=`  ${oi.name}：${fmt(v)}吨`
        if(pv!==null){const h=pct(v,pv);l+=`，环比${arrow(h)}${Math.abs(h).toFixed(1)}%`}
        sl.push(l);if(oi.key!=='lightOil')total+=v
      }
      sl.unshift(`${s}：轻油合计${fmt(total)}吨`);lines.push(sl.join('\n'))
    }
    setOut(lines.join('\n\n'))
  }
  return<div className="space-y-3">
    {STATIONS.map(s=><div key={s} className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-3">{s}</h3>
      {OILS.filter(o=>o.key!=='lightOil').map(oi=><div key={oi.key} className="flex items-center gap-2 mb-2"><span className="text-sm text-gray-500 w-20">{oi.name}</span><input type="number" step="0.01" inputMode="decimal" value={vals[s+'|'+oi.key]} onChange={e=>setVals(p=>({...p,[s+'|'+oi.key]:e.target.value}))} placeholder="吨" className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-[#007AFF]"/><span className="text-xs text-gray-400">吨</span></div>)}
      {(()=>{const sum=OILS.filter(o=>o.key!=='lightOil').reduce((t,oi)=>t+(parseFloat(vals[s+'|'+oi.key])||0),0);if(sum>0)setTimeout(()=>{if(vals[s+'|lightOil']!==String(sum))setVals(p=>({...p,[s+'|lightOil']:String(sum)}))},0);return null})()}
    </div>)}
    <button onClick={gen} className="w-full py-3.5 bg-[#007AFF] text-white rounded-xl text-base font-medium">生成汇总并保存</button>
    {out&&<OB out={out} cp={cp} onCopy={()=>{navigator.clipboard.writeText(out);setCp(true);setTimeout(()=>setCp(false),2000)}}/>}
    {Object.keys(db).length>0&&<HBO db={db}/>}
  </div>
}

// ============================================================
// Template 2 — 吨升换算
// ============================================================
function ConverterTemplate(){
  const[ton,setTon]=useState('');const[liter,setLiter]=useState('')
  const[so,setSo]=useState(OILS[0])
  const t2l=()=>{const t=parseFloat(ton);if(!isNaN(t)&&so.density)setLiter((t*1000/so.density).toFixed(0))}
  const l2t=()=>{const l=parseFloat(liter);if(!isNaN(l)&&so.density)setTon((l*so.density/1000).toFixed(6))}
  return<div className="space-y-3">
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-3">吨 ↔ 升 换算器</h3>
      <div className="mb-3"><label className="text-sm text-gray-500 block mb-1">油品</label><div className="flex flex-wrap gap-2">{OILS.filter(o=>o.density).map(o=><button key={o.key} onClick={()=>{setSo(o);setLiter('')}} className={`px-3 py-1.5 rounded-lg text-sm ${so.key===o.key?'bg-[#007AFF] text-white':'bg-gray-100 text-gray-700'}`}>{o.name}</button>)}</div><p className="text-xs text-gray-400 mt-1">密度: {so.density} kg/L</p></div>
      <div className="flex items-center gap-2 mb-2"><input type="number" step="0.001" inputMode="decimal" value={ton} onChange={e=>{setTon(e.target.value);setLiter('')}} placeholder="吨数" className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-right focus:outline-none focus:border-[#007AFF]"/><span className="text-gray-500 text-sm w-8">吨</span></div>
      <button onClick={t2l} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium mb-3">换算 ↓</button>
      <div className="flex items-center gap-2 mb-2"><input type="number" step="1" inputMode="numeric" value={liter} onChange={e=>{setLiter(e.target.value);setTon('')}} placeholder="升数" className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-right focus:outline-none focus:border-[#007AFF]"/><span className="text-gray-500 text-sm w-8">升</span></div>
      <button onClick={l2t} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">换算 ↑</button>
    </div>
    <div className="bg-white rounded-xl shadow-sm p-4"><h3 className="font-semibold text-gray-800 mb-2">参考密度</h3><div className="space-y-1 text-sm">{OILS.filter(o=>o.density).map(o=><div key={o.key} className="flex justify-between"><span>{o.name}</span><span className="text-gray-500">{o.density} kg/L</span></div>)}</div></div>
  </div>
}

// ============================================================
// Template 3 — 通用环比同比
// ============================================================
function GrowthTemplate(){
  const[rows,setRows]=useState([{id:1,name:'',now:'',prev:'',lastYear:''}])
  const add=()=>setRows(p=>[...p,{id:Date.now(),name:'',now:'',prev:'',lastYear:''}])
  const del=id=>setRows(p=>p.filter(r=>r.id!==id))
  const up=(id,f,v)=>setRows(p=>p.map(r=>r.id===id?{...r,[f]:v}:r))

  return<div className="space-y-3">
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-1">通用环比同比计算</h3>
      <p className="text-xs text-gray-400 mb-3">不限品类，填当期/上期/同期任意数据即可算出</p>
      {rows.map(r=>{
        const n=parseFloat(r.now),p=parseFloat(r.prev),l=parseFloat(r.lastYear)
        return<div key={r.id} className="mb-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
          <div className="flex items-center gap-2 mb-2">
            <input type="text" value={r.name} onChange={e=>up(r.id,'name',e.target.value)} placeholder="名称（如：非油品收入）" className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#007AFF]"/>
            <button onClick={()=>del(r.id)} className="text-xs text-red-400 px-2 py-1" disabled={rows.length<=1}>✕</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-[10px] text-gray-400 block mb-0.5">当期</label><input type="number" step="0.01" inputMode="decimal" value={r.now} onChange={e=>up(r.id,'now',e.target.value)} placeholder="值" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-[#007AFF]"/></div>
            <div><label className="text-[10px] text-gray-400 block mb-0.5">上期（环比）</label><input type="number" step="0.01" inputMode="decimal" value={r.prev} onChange={e=>up(r.id,'prev',e.target.value)} placeholder="值" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-[#007AFF]"/></div>
            <div><label className="text-[10px] text-gray-400 block mb-0.5">同期（同比）</label><input type="number" step="0.01" inputMode="decimal" value={r.lastYear} onChange={e=>up(r.id,'lastYear',e.target.value)} placeholder="值" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-[#007AFF]"/></div>
          </div>
          {(!isNaN(n)&&(!isNaN(p)||!isNaN(l)))&&<div className="flex gap-4 mt-2 text-xs">
            {!isNaN(p)&&p!==0&&<span className={n>=p?'text-green-600':'text-red-500'}>{r.name||'—'} 环比 {arrow(pct(n,p))} {Math.abs(pct(n,p)).toFixed(1)}%</span>}
            {!isNaN(l)&&l!==0&&<span className={n>=l?'text-green-600':'text-red-500'}>同比 {arrow(pct(n,l))} {Math.abs(pct(n,l)).toFixed(1)}%</span>}
          </div>}
        </div>
      })}
      <button onClick={add} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium mt-2">+ 添加行</button>
    </div>
  </div>
}

// ============================================================
// Template 4 — 百分比计算
// ============================================================
function PercentTemplate(){
  const[a,setA]=useState('');const[b,setB]=useState('')
  const[v1,setV1]=useState('');const[v2,setV2]=useState('')
  const[vov,setVov]=useState('');const[v100,setV100]=useState('')
  return<div className="space-y-3">
    {/* Part / Total */}
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-2">占比计算</h3>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div><label className="text-xs text-gray-400 block mb-0.5">部分</label><input type="number" step="0.01" inputMode="decimal" value={a} onChange={e=>setA(e.target.value)} placeholder="值" className="w-full px-3 py-2 border border-gray-200 rounded text-right focus:outline-none focus:border-[#007AFF]"/></div>
        <div><label className="text-xs text-gray-400 block mb-0.5">整体</label><input type="number" step="0.01" inputMode="decimal" value={b} onChange={e=>setB(e.target.value)} placeholder="值" className="w-full px-3 py-2 border border-gray-200 rounded text-right focus:outline-none focus:border-[#007AFF]"/></div>
      </div>
      {(!isNaN(parseFloat(a))&&!isNaN(parseFloat(b))&&b!=='0'&&b!=='')&&<div className="text-center py-2 bg-gray-50 rounded-lg text-sm font-medium">{fmt(a)} / {fmt(b)} = <span className="text-[#007AFF] text-base">{(parseFloat(a)/parseFloat(b)*100).toFixed(2)}%</span></div>}
    </div>
    {/* X% of Y */}
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-2">百分比求值</h3>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div><label className="text-xs text-gray-400 block mb-0.5">百分比</label><div className="flex items-center gap-1"><input type="number" step="0.01" inputMode="decimal" value={vov} onChange={e=>setVov(e.target.value)} placeholder="%" className="w-full px-3 py-2 border border-gray-200 rounded text-right focus:outline-none focus:border-[#007AFF]"/><span className="text-gray-500 text-sm">%</span></div></div>
        <div><label className="text-xs text-gray-400 block mb-0.5">基数</label><input type="number" step="0.01" inputMode="decimal" value={v100} onChange={e=>setV100(e.target.value)} placeholder="值" className="w-full px-3 py-2 border border-gray-200 rounded text-right focus:outline-none focus:border-[#007AFF]"/></div>
      </div>
      {(!isNaN(parseFloat(vov))&&!isNaN(parseFloat(v100)))&&<div className="text-center py-2 bg-gray-50 rounded-lg text-sm font-medium">{fmt(vov)}% × {fmt(v100)} = <span className="text-[#007AFF] text-base">{fmt(parseFloat(vov)/100*parseFloat(v100))}</span></div>}
    </div>
    {/* Change */}
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-2">涨跌幅度</h3>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div><label className="text-xs text-gray-400 block mb-0.5">变化前</label><input type="number" step="0.01" inputMode="decimal" value={v1} onChange={e=>setV1(e.target.value)} placeholder="旧值" className="w-full px-3 py-2 border border-gray-200 rounded text-right focus:outline-none focus:border-[#007AFF]"/></div>
        <div><label className="text-xs text-gray-400 block mb-0.5">变化后</label><input type="number" step="0.01" inputMode="decimal" value={v2} onChange={e=>setV2(e.target.value)} placeholder="新值" className="w-full px-3 py-2 border border-gray-200 rounded text-right focus:outline-none focus:border-[#007AFF]"/></div>
      </div>
      {(!isNaN(parseFloat(v1))&&!isNaN(parseFloat(v2))&&v1!=='0'&&v1!=='')&&<div className="flex justify-between text-sm bg-gray-50 rounded-lg p-3">
        <span>变动</span><span className="font-medium">{fmt(parseFloat(v2)-parseFloat(v1))}</span>
        <span>幅度</span><span className={`font-medium ${parseFloat(v2)>=parseFloat(v1)?'text-green-600':'text-red-500'}`}>{arrow(pct(parseFloat(v2),parseFloat(v1)))} {Math.abs(pct(parseFloat(v2),parseFloat(v1))).toFixed(2)}%</span>
      </div>}
    </div>
  </div>
}

// ============================================================
// Template 5 — 累加记账
// ============================================================
function AccumTemplate(){
  const[db,setDB]=useState(()=>load('accum_v1'))
  const[entries,setEntries]=useState(()=>{const e=[];Object.entries(db).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,20).forEach(([k,v])=>e.push({id:k,name:v.name||'',val:String(v.val||''),date:v.date}));return e})
  const[newName,setNewName]=useState('');const[newVal,setNewVal]=useState('')
  useEffect(()=>{save('accum_v1',db)},[db])

  const add=()=>{
    const v=parseFloat(newVal);if(isNaN(v)||!newName.trim())return
    const id=todayStr()+'_'+Date.now()
    setDB(p=>({...p,[id]:{name:newName,val:v,date:todayStr()}}))
    setEntries(p=>[{id,name:newName,val:String(v),date:todayStr()},...p])
    setNewName('');setNewVal('')
  }
  const del=id=>{setDB(p=>{const n={...p};delete n[id];return n});setEntries(p=>p.filter(e=>e.id!==id))}

  let running=0;entries.slice().reverse().forEach(e=>{running+=parseFloat(e.val)||0;e.running=running})

  return<div className="space-y-3">
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-3">累加记账</h3>
      <div className="flex gap-2 mb-2">
        <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="项目名" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#007AFF]"/>
        <input type="number" step="0.01" inputMode="decimal" value={newVal} onChange={e=>setNewVal(e.target.value)} placeholder="数值" className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-[#007AFF]"/>
        <button onClick={add} className="px-4 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium">加</button>
      </div>
    </div>
    {entries.length>0&&<div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex justify-between items-center mb-2"><h3 className="font-semibold text-gray-800">累计: <span className="text-[#007AFF]">{fmt(running)}</span></h3><span className="text-xs text-gray-400">{entries.length} 条</span></div>
      <div className="space-y-1">{entries.map(e=><div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"><div><span className="text-gray-400 text-xs mr-1">{e.date}</span><span>{e.name}</span></div><div className="flex items-center gap-2"><span className="font-medium">{fmt(parseFloat(e.val))}</span><span className="text-[10px] text-gray-400">累计 {fmt(e.running)}</span><button onClick={()=>del(e.id)} className="text-red-400 text-xs ml-1">✕</button></div></div>)}</div>
    </div>}
  </div>
}

// ============================================================
// Main
// ============================================================
export default function Tracker(){
  const tabs=[
    {id:0,name:'柴油日报'},
    {id:1,name:'油品全类'},
    {id:2,name:'吨升换算'},
    {id:3,name:'环比同比'},
    {id:4,name:'百分比'},
    {id:5,name:'累加记账'},
  ]
  const[tab,setTab]=useState(0)
  return<div className="min-h-screen bg-[#f5f5f7] pb-6">
    <div className="bg-white shadow-sm sticky top-0 z-10">
      <div className="px-4 py-3"><h1 className="text-lg font-bold text-gray-800">数据工具</h1><p className="text-xs text-gray-400 mt-0.5">{todayStr()}</p></div>
      <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab===t.id?'bg-[#007AFF] text-white':'bg-gray-100 text-gray-700'}`}>{t.name}</button>)}
      </div>
    </div>
    <div className="px-4 pt-3 max-w-md mx-auto">
      {tab===0&&<DieselTemplate/>}
      {tab===1&&<OilTemplate/>}
      {tab===2&&<ConverterTemplate/>}
      {tab===3&&<GrowthTemplate/>}
      {tab===4&&<PercentTemplate/>}
      {tab===5&&<AccumTemplate/>}
    </div>
  </div>
}

// Shared
function R({l,v,c}){return<div className="flex justify-between"><span className="text-gray-400">{l}</span><span className={`font-medium ${c||''}`}>{v}</span></div>}
function OB({out,cp,onCopy}){return<div className="bg-white rounded-xl shadow-sm p-4"><div className="flex justify-between items-center mb-3"><h3 className="text-sm font-semibold text-gray-800">结果</h3><button onClick={onCopy} className="px-4 py-1.5 bg-[#007AFF] text-white text-sm rounded-lg">{cp?'已复制 ✓':'复制'}</button></div><pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">{out}</pre></div>}
function HB({db,label}){return<div className="bg-white rounded-xl shadow-sm p-4"><h3 className="text-sm font-semibold text-gray-800 mb-2">{label}历史（最近5条）</h3>{Object.entries(db).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,5).map(([k,v])=><div key={k} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"><span className="text-gray-500">{v.date} {v.station}</span><span className="font-medium text-gray-700">{fmt(v.diesel)} 吨</span></div>)}</div>}
function HBO({db}){const g={};Object.entries(db).forEach(([k,v])=>{const gk=v.date+'|'+v.station;(g[gk]=g[gk]||[]).push(v)});const s=Object.keys(g).sort((a,b)=>b.localeCompare(a)).slice(0,5);return<div className="bg-white rounded-xl shadow-sm p-4"><h3 className="text-sm font-semibold text-gray-800 mb-2">油品历史（最近5条）</h3>{s.map(gk=>{const it=g[gk],d=it[0],total=it.filter(v=>v.oil!=='lightOil').reduce((s,v)=>s+v.val,0);return<div key={gk} className="text-sm py-1.5 border-b border-gray-50 last:border-0"><div className="flex justify-between"><span className="text-gray-500">{d.date} {d.station}</span><span className="font-medium text-gray-700">{fmt(total)} 吨</span></div><div className="text-xs text-gray-400 mt-0.5">{it.filter(v=>v.oil!=='lightOil').map(v=>`${OILS.find(o=>o.key===v.oil)?.name||v.oil} ${fmt(v.val)}`).join(' · ')}</div></div>})}</div>}