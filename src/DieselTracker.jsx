import React,{useState,useEffect,useCallback,useRef}from'react'

// --- helpers ---
const fmt=n=>n.toFixed(2)
const pct=(a,b)=>b?((a-b)/b*100):0
const today=()=>new Date().toISOString().slice(0,10)
const yest=()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10)}
const lyear=()=>{const d=new Date();d.setFullYear(d.getFullYear()-1);return d.toISOString().slice(0,10)}
const STATIONS=['镇宁2站','镇宁4站']
const STORAGE_KEY='diesel_tracker_v2'

function loadDB(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return{}}}
function saveDB(db){localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}

// Extract diesel number from report text
function extractDiesel(text){
  // Try direct patterns
  const patterns=[
    /柴油销量[：:\s]*(\d+\.?\d*)\s*吨/,
    /柴油\s*[：:]\s*(\d+\.?\d*)\s*吨/,
    /0号柴油[：:\s]*(\d+\.?\d*)\s*吨/,
    /0号柴油\s*(\d+\.?\d*)\s*吨/,
    /柴油[：:\s]*(\d+\.?\d*)\s*吨/,
    /柴油\s*(\d+\.?\d*)\s*吨/,
    // Broader
    /(\d+\.?\d*)\s*吨[\s\S]{0,10}柴油/,
  ]
  for(const p of patterns){
    const m=text.match(p)
    if(m)return parseFloat(m[1])
  }
  // Fallback: find any number near "柴油"
  const m2=text.match(/柴油[\s\S]{0,20}(\d+\.?\d*)\s*吨/)
  if(m2)return parseFloat(m2[1])
  return null
}

export default function DieselTracker(){
  const[db,setDB]=useState(()=>loadDB())
  const[template,setTemplate]=useState(0) // 0=diesel
  const[todayStr]=useState(today)

  // Diesel template state
  const[pastes,setPastes]=useState({'镇宁2站':'','镇宁4站':''})
  const[results,setResults]=useState({'镇宁2站':null,'镇宁4站':null})
  const[lastYear,setLastYear]=useState({'镇宁2站':'','镇宁4站':''})
  const[lastYearAuto,setLastYearAuto]=useState({'镇宁2站':null,'镇宁4站':null})
  const[output,setOutput]=useState('')
  const[copied,setCopied]=useState(false)

  // Sync DB
  useEffect(()=>{saveDB(db)},[db])

  // Auto-load last year from DB if exists
  useEffect(()=>{
    const ly=lyear()
    const d2=db[ly+'|镇宁2站'],d4=db[ly+'|镇宁4站']
    setLastYearAuto({'镇宁2站':d2?.diesel||null,'镇宁4站':d4?.diesel||null})
  },[db])

  // Get yesterday's data
  const getYesterday=(station)=>{
    const yd=yest()
    const r=db[yd+'|'+station]
    return r?.diesel||null
  }

  // Process paste
  const process=(station)=>{
    const text=pastes[station]
    if(!text.trim())return
    const diesel=extractDiesel(text)
    setResults(p=>({...p,[station]:diesel}))
    // Save to DB
    const key=todayStr+'|'+station
    setDB(p=>({...p,[key]:{diesel,date:todayStr,station}}))
  }

  const processAll=()=>{STATIONS.forEach(process)}

  // Generate output
  const generate=()=>{
    const yd=yest()
    const ly=lyear()
    const lines=[]

    for(const s of STATIONS){
      const r=results[s]
      if(r===null)continue
      const prev=getYesterday(s)
      const lyVal=lastYear[s]?parseFloat(lastYear[s]):(lastYearAuto[s]||null)

      // Generate the output line
      const dateLabel=yd.replace(/^\d{4}-/,'').replace('-','月')+'日'
      const lyLabel=ly.replace(/^\d{4}-/,'').replace('-','月')+'日'

      let line=`${s}：柴油销量${fmt(r)}吨`
      if(prev!==null){
        const hb=pct(r,prev)
        const arrow=hb>=0?'↑':'↓'
        line+=`，上期销售${fmt(prev)}吨，环比${arrow}${Math.abs(hb).toFixed(1)}%`
      }
      if(lyVal!==null){
        const tb=pct(r,lyVal)
        const arrow2=tb>=0?'↑':'↓'
        line+=`，去年同期销售${fmt(lyVal)}吨，同比${arrow2}${Math.abs(tb).toFixed(1)}%`
      }
      lines.push(line)
    }
    setOutput(lines.join('\n'))
  }

  // Copy
  const copy=()=>{
    navigator.clipboard.writeText(output).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})
  }

  // Count records
  const recordCount=Object.keys(db).length

  // Templates
  const templates=[{id:0,name:'柴油销量对比',desc:'粘贴加油站日报，自动提取柴油销量，计算环比同比'}]

  return<div className="min-h-screen bg-[#f5f5f7] pb-10">
    {/* Header */}
    <div className="bg-white shadow-sm px-4 py-4 sticky top-0 z-10">
      <h1 className="text-lg font-bold text-gray-800">数据追踪工具</h1>
      <p className="text-xs text-gray-500 mt-0.5">已存 {recordCount} 条记录</p>
      {/* Template tabs */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {templates.map(t=>(
          <button key={t.id} onClick={()=>setTemplate(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${template===t.id?'bg-[#007AFF] text-white':'bg-gray-100 text-gray-700'}`}>
            {t.name}
          </button>
        ))}
      </div>
    </div>

    <div className="px-4 pt-4 max-w-lg mx-auto">
      {/* Template 0: Diesel */}
      {template===0&&<>
        <p className="text-sm text-gray-600 mb-4">分别粘贴两个站点的每日汇报，自动提取柴油销量</p>

        {/* Station 2 */}
        <StationCard name="镇宁2站" paste={pastes['镇宁2站']} result={results['镇宁2站']}
          yest={getYesterday('镇宁2站')} lastYear={lastYear['镇宁2站']} lastYearAuto={lastYearAuto['镇宁2站']}
          onPaste={v=>setPastes(p=>({...p,'镇宁2站':v}))}
          onLastYear={v=>setLastYear(p=>({...p,'镇宁2站':v}))}
          onProcess={()=>process('镇宁2站')}/>

        <div className="my-3"/>

        {/* Station 4 */}
        <StationCard name="镇宁4站" paste={pastes['镇宁4站']} result={results['镇宁4站']}
          yest={getYesterday('镇宁4站')} lastYear={lastYear['镇宁4站']} lastYearAuto={lastYearAuto['镇宁4站']}
          onPaste={v=>setPastes(p=>({...p,'镇宁4站':v}))}
          onLastYear={v=>setLastYear(p=>({...p,'镇宁4站':v}))}
          onProcess={()=>process('镇宁4站')}/>

        {/* Actions */}
        <div className="mt-4 space-y-3">
          <button onClick={processAll} className="w-full py-3 bg-[#007AFF] text-white rounded-xl text-base font-medium">一键识别全部</button>
          <button onClick={generate} className="w-full py-3 bg-gray-800 text-white rounded-xl text-base font-medium">生成汇报模板</button>
        </div>

        {/* Output */}
        {output&&<div className="mt-4 bg-white rounded-xl shadow-sm p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-800">汇报模板（可直接复制）</h3>
            <button onClick={copy} className="px-4 py-1.5 bg-[#007AFF] text-white text-sm rounded-lg">{copied?'已复制 ✓':'复制'}</button>
          </div>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">{output}</pre>
        </div>}

        {/* Historical data preview */}
        {recordCount>0&&<div className="mt-6 bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">历史记录（最近5天）</h3>
          <HistoryTable db={db}/>
        </div>}
      </>}
    </div>

    {/* Footer */}
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t border-gray-200 px-4 py-2">
      <p className="text-center text-[10px] text-gray-400">数据仅存储在浏览器本地 · 清缓存会丢失 · 建议定期导出</p>
    </div>
  </div>
}

function StationCard({name,paste,result,yest,lastYear,lastYearAuto,onPaste,onLastYear,onProcess}){
  return<div className="bg-white rounded-xl shadow-sm p-4">
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-semibold text-gray-800">{name}</h3>
      {result!==null&&<span className="text-sm bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">{fmt(result)} 吨</span>}
    </div>
    <textarea value={paste} onChange={e=>onPaste(e.target.value)}
      placeholder={`粘贴${name}的每日汇报...`}
      className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-[#007AFF] mb-2"/>
    <button onClick={onProcess} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium mb-2">识别柴油销量</button>

    {/* Result details */}
    {result!==null&&<div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
      <Row label="今日柴油" value={`${fmt(result)} 吨`}/>
      {yest!==null&&<Row label="昨日同期" value={`${fmt(yest)} 吨`} extra={`环比 ${pct(result,yest)>=0?'+':''}${fmt(pct(result,yest))}%`}/>}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 whitespace-nowrap">去年同期</span>
        <input type="number" step="0.01" value={lastYear} onChange={e=>onLastYear(e.target.value)}
          placeholder={lastYearAuto!==null?`${lastYearAuto} 吨（已自动填入）`:'手动输入...'}
          className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm text-right"/>
        {lastYear&&parseFloat(lastYear)>0&&<span className="text-xs text-gray-500 whitespace-nowrap">同比 {pct(result,parseFloat(lastYear))>=0?'+':''}{fmt(pct(result,parseFloat(lastYear)))}%</span>}
      </div>
    </div>}
  </div>
}

function Row({label,value,extra}){
  return<div className="flex justify-between items-center">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium">{value}{extra&&<span className="ml-2 text-xs text-gray-400">{extra}</span>}</span>
  </div>
}

function HistoryTable({db}){
  const keys=Object.keys(db).sort().reverse().slice(0,5)
  if(!keys.length)return<p className="text-gray-400 text-sm">暂无记录</p>
  return<div className="space-y-1">
    {keys.map(k=>{
      const r=db[k]
      return<div key={k} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
        <span className="text-gray-600">{r.date} {r.station}</span>
        <span className="font-medium">{fmt(r.diesel)} 吨</span>
      </div>
    })}
  </div>
}