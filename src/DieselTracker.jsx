import React,{useState,useEffect}from'react'

const fmt=n=>{if(n===null||n===undefined||isNaN(n))return'--';return Number(n).toFixed(2)}
const pct=(a,b)=>b&&b!==0?((a-b)/b*100):null
const arrow=v=>v===null?'':v>=0?'↑':'↓'

function todayStr(){
  const d=new Date();return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`
}
function offsetDays(days){const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`}

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

// ===== Template 1: Diesel =====
function DieselTemplate(){
  const[db,setDB]=useState(()=>load('diesel_v3'))
  const[vals,setVals]=useState({'镇宁2站':'','镇宁4站':''})
  const[lyVals,setLyVals]=useState({'镇宁2站':'','镇宁4站':''})
  const[output,setOutput]=useState('')
  const[copied,setCopied]=useState(false)
  useEffect(()=>{save('diesel_v3',db)},[db])
  const yd=offsetDays(-1),ly=offsetDays(-365)
  const getDB=(date,station)=>(db[date+'|'+station]||{}).diesel??null
  useEffect(()=>{for(const s of STATIONS){const v=getDB(ly,s);if(v!==null&&!lyVals[s])setLyVals(p=>({...p,[s]:String(v)}))}},[db])

  const generate=()=>{
    const lines=[]
    for(const s of STATIONS){
      const today=parseFloat(vals[s]);if(isNaN(today))continue
      setDB(p=>({...p,[todayStr()+'|'+s]:{diesel:today,date:todayStr(),station:s}}))
      const lyNum=parseFloat(lyVals[s]);if(!isNaN(lyNum))setDB(p=>({...p,[ly+'|'+s]:{diesel:lyNum,date:ly,station:s}}))
      const prev=getDB(yd,s),lyVal=getDB(ly,s)??lyNum
      let line=`${s}：柴油销量${fmt(today)}吨`
      if(prev!==null){const hb=pct(today,prev);line+=`，上期销售${fmt(prev)}吨，环比${arrow(hb)}${Math.abs(hb).toFixed(1)}%`}
      if(lyVal!==null&&!isNaN(lyVal)){const tb=pct(today,lyVal);line+=`，去年同期销售${fmt(lyVal)}吨，同比${arrow(tb)}${Math.abs(tb).toFixed(1)}%`}
      lines.push(line)
    }
    setOutput(lines.join('\n'))
  }
  const allOk=STATIONS.every(s=>vals[s]&&!isNaN(parseFloat(vals[s])))

  return<div className="space-y-3">
    {STATIONS.map(s=>{const today=parseFloat(vals[s]),prev=getDB(yd,s),lyV=getDB(ly,s)??parseFloat(lyVals[s])
      return<div key={s} className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 mb-3">{s}</h3>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-500 whitespace-nowrap">今日柴油</span>
          <input type="number" step="0.01" inputMode="decimal" value={vals[s]} onChange={e=>setVals(p=>({...p,[s]:e.target.value}))} placeholder="吨数" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-right focus:outline-none focus:border-[#007AFF]"/>
          <span className="text-gray-400 text-sm">吨</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 whitespace-nowrap">去年同期</span>
          <input type="number" step="0.01" inputMode="decimal" value={lyVals[s]} onChange={e=>setLyVals(p=>({...p,[s]:e.target.value}))} placeholder={lyV!==null?`${fmt(lyV)}吨`:'手动输入'} className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-[#007AFF]"/>
          <span className="text-xs text-gray-400">吨</span>
        </div>
        {!isNaN(today)&&<div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm">
          {prev!==null&&<Row l="环比" v={`${arrow(pct(today,prev))} ${Math.abs(pct(today,prev)).toFixed(1)}%`} c={pct(today,prev)>=0?'text-green-600':'text-red-500'}/>}
          {lyV!==null&&!isNaN(lyV)&&<Row l="同比" v={`${arrow(pct(today,lyV))} ${Math.abs(pct(today,lyV)).toFixed(1)}%`} c={pct(today,lyV)>=0?'text-green-600':'text-red-500'}/>}
        </div>}
      </div>
    })}
    <button onClick={generate} disabled={!allOk} className={`w-full py-3.5 rounded-xl text-base font-medium ${allOk?'bg-[#007AFF] text-white':'bg-gray-200 text-gray-400'}`}>生成汇报并保存</button>
    {output&&<OutputBox output={output} copied={copied} onCopy={()=>{navigator.clipboard.writeText(output);setCopied(true);setTimeout(()=>setCopied(false),2000)}}/>}
    <HistoryBox db={db} label="柴油"/>
  </div>
}

// ===== Template 2: Full Oil =====
function OilTemplate(){
  const[db,setDB]=useState(()=>load('oil_v2'))
  const[vals,setVals]=useState(()=>{const o={};for(const s of STATIONS)for(const oi of OILS)o[s+'|'+oi.key]='';return o})
  const[output,setOutput]=useState('')
  const[copied,setCopied]=useState(false)
  useEffect(()=>{save('oil_v2',db)},[db])
  const yd=offsetDays(-1)

  const generate=()=>{
    const lines=[]
    for(const s of STATIONS){
      const stationLines=[]
      let total=0
      for(const oi of OILS){
        const v=parseFloat(vals[s+'|'+oi.key])
        if(isNaN(v))continue
        setDB(p=>({...p,[todayStr()+'|'+s+'|'+oi.key]:{val:v,date:todayStr(),station:s,oil:oi.key}}))
        const prevKey=yd+'|'+s+'|'+oi.key
        const prev=db[prevKey]?.val??null
        let oilLine=`  ${oi.name}：${fmt(v)}吨`
        if(prev!==null){const hb=pct(v,prev);oilLine+=`，环比${arrow(hb)}${Math.abs(hb).toFixed(1)}%`}
        stationLines.push(oilLine)
        if(oi.key!=='lightOil')total+=v
      }
      // Insert total light oil
      stationLines.unshift(`${s}：轻油合计${fmt(total)}吨`)
      lines.push(stationLines.join('\n'))
    }
    setOutput(lines.join('\n\n'))
  }

  return<div className="space-y-3">
    {STATIONS.map(s=><div key={s} className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-3">{s}</h3>
      {OILS.filter(o=>o.key!=='lightOil').map(oi=><div key={oi.key} className="flex items-center gap-2 mb-2">
        <span className="text-sm text-gray-500 w-20 whitespace-nowrap">{oi.name}</span>
        <input type="number" step="0.01" inputMode="decimal" value={vals[s+'|'+oi.key]} onChange={e=>setVals(p=>({...p,[s+'|'+oi.key]:e.target.value}))} placeholder="吨数" className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:border-[#007AFF]"/>
        <span className="text-xs text-gray-400">吨</span>
      </div>)}
      {/* Auto-calc light oil */}
      {(()=>{const sum=OILS.filter(o=>o.key!=='lightOil').reduce((t,oi)=>t+(parseFloat(vals[s+'|'+oi.key])||0),0);if(sum>0)setTimeout(()=>{if(vals[s+'|lightOil']!==String(sum)){setVals(p=>({...p,[s+'|lightOil']:String(sum)}))}},0);return null})()}
    </div>)}
    <button onClick={generate} className="w-full py-3.5 bg-[#007AFF] text-white rounded-xl text-base font-medium">生成汇总并保存</button>
    {output&&<OutputBox output={output} copied={copied} onCopy={()=>{navigator.clipboard.writeText(output);setCopied(true);setTimeout(()=>setCopied(false),2000)}}/>}
    <HistoryBoxOil db={db}/>
  </div>
}

// ===== Template 3: Converter =====
function ConverterTemplate(){
  const[ton,setTon]=useState('')
  const[liter,setLiter]=useState('')
  const[selectedOil,setSelectedOil]=useState(OILS[0])

  const convertTonToLiter=()=>{
    const t=parseFloat(ton);if(isNaN(t)||!selectedOil.density)return
    setLiter((t*1000/selectedOil.density).toFixed(0))
  }
  const convertLiterToTon=()=>{
    const l=parseFloat(liter);if(isNaN(l)||!selectedOil.density)return
    setTon((l*selectedOil.density/1000).toFixed(6))
  }

  return<div className="space-y-3">
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-3">吨 ↔ 升 换算器</h3>
      <div className="mb-3">
        <label className="text-sm text-gray-500 block mb-1">油品种类</label>
        <div className="flex flex-wrap gap-2">
          {OILS.filter(o=>o.density).map(o=>(
            <button key={o.key} onClick={()=>{setSelectedOil(o);setLiter('')}}
              className={`px-3 py-1.5 rounded-lg text-sm ${selectedOil.key===o.key?'bg-[#007AFF] text-white':'bg-gray-100 text-gray-700'}`}>
              {o.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">密度: {selectedOil.density} kg/L</p>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <input type="number" step="0.001" inputMode="decimal" value={ton} onChange={e=>{setTon(e.target.value);setLiter('')}} placeholder="吨数" className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-right focus:outline-none focus:border-[#007AFF]"/>
        <span className="text-gray-500 text-sm w-8">吨</span>
      </div>
      <button onClick={convertTonToLiter} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium mb-3">换算 ↓</button>
      <div className="flex items-center gap-2 mb-2">
        <input type="number" step="1" inputMode="numeric" value={liter} onChange={e=>{setLiter(e.target.value);setTon('')}} placeholder="升数" className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-right focus:outline-none focus:border-[#007AFF]"/>
        <span className="text-gray-500 text-sm w-8">升</span>
      </div>
      <button onClick={convertLiterToTon} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">换算 ↑</button>
    </div>

    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-gray-800 mb-2">参考密度</h3>
      <div className="space-y-1 text-sm">
        {OILS.filter(o=>o.density).map(o=><div key={o.key} className="flex justify-between"><span>{o.name}</span><span className="text-gray-500">{o.density} kg/L</span></div>)}
      </div>
    </div>
  </div>
}

// ===== Main =====
export default function Tracker(){
  const templates=[
    {id:0,name:'柴油日报',desc:'两个站柴油销量环比同比'},
    {id:1,name:'油品全类',desc:'汽油+柴油全部油品对比'},
    {id:2,name:'吨升换算',desc:'吨↔升在线换算'},
  ]
  const[tab,setTab]=useState(0)

  return<div className="min-h-screen bg-[#f5f5f7] pb-6">
    <div className="bg-white shadow-sm sticky top-0 z-10">
      <div className="px-4 py-3">
        <h1 className="text-lg font-bold text-gray-800">数据工具</h1>
        <p className="text-xs text-gray-400 mt-0.5">{todayStr()}</p>
      </div>
      <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
        {templates.map(t=><button key={t.id} onClick={()=>setTab(t.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab===t.id?'bg-[#007AFF] text-white':'bg-gray-100 text-gray-700'}`}>
          {t.name}
        </button>)}
      </div>
    </div>

    <div className="px-4 pt-3 max-w-md mx-auto">
      {tab===0&&<DieselTemplate/>}
      {tab===1&&<OilTemplate/>}
      {tab===2&&<ConverterTemplate/>}
    </div>
  </div>
}

// --- Shared components ---
function Row({l,v,c}){return<div className="flex justify-between"><span className="text-gray-400">{l}</span><span className={`font-medium ${c||''}`}>{v}</span></div>}

function OutputBox({output,copied,onCopy}){
  return<div className="bg-white rounded-xl shadow-sm p-4">
    <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-semibold text-gray-800">结果</h3><button onClick={onCopy} className="px-4 py-1.5 bg-[#007AFF] text-white text-sm rounded-lg">{copied?'已复制 ✓':'复制'}</button></div>
    <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">{output}</pre>
  </div>
}

function HistoryBox({db,label}){
  const keys=Object.keys(db).length
  if(!keys)return null
  return<div className="bg-white rounded-xl shadow-sm p-4"><h3 className="text-sm font-semibold text-gray-800 mb-2">{label}历史（最近5条）</h3>
    {Object.entries(db).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,5).map(([k,v])=>
      <div key={k} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"><span className="text-gray-500">{v.date} {v.station}</span><span className="font-medium text-gray-700">{fmt(v.diesel)} 吨</span></div>)}
  </div>
}

function HistoryBoxOil({db}){
  const keys=Object.keys(db).length
  if(!keys)return null
  // Group by date+station
  const grouped={}
  Object.entries(db).forEach(([k,v])=>{const gk=v.date+'|'+v.station;(grouped[gk]=grouped[gk]||[]).push(v)})
  const sorted=Object.keys(grouped).sort((a,b)=>b.localeCompare(a)).slice(0,5)
  return<div className="bg-white rounded-xl shadow-sm p-4"><h3 className="text-sm font-semibold text-gray-800 mb-2">油品历史（最近5条）</h3>
    {sorted.map(gk=>{const items=grouped[gk],d=items[0]
      const total=items.filter(v=>v.oil!=='lightOil').reduce((s,v)=>s+v.val,0)
      return<div key={gk} className="text-sm py-1.5 border-b border-gray-50 last:border-0">
        <div className="flex justify-between"><span className="text-gray-500">{d.date} {d.station}</span><span className="font-medium text-gray-700">{fmt(total)} 吨</span></div>
        <div className="text-xs text-gray-400 mt-0.5">{items.filter(v=>v.oil!=='lightOil').map(v=>`${OILS.find(o=>o.key===v.oil)?.name||v.oil} ${fmt(v.val)}`).join(' · ')}</div>
      </div>
    })}
  </div>
}