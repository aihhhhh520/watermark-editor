import React,{useState,useRef,useEffect,useCallback}from'react'
import{compressImage,loadImage,downloadBlob,generateFilename}from'./utils/imageUtils'

let nid=0;function uid(){return'w'+Date.now()+'_'+(nid++)}

export default function App(){
  const[img,setImg]=useState(null)
  const[imgUrl,setImgUrl]=useState(null)
  const[blocks,setBlocks]=useState([])
  const[sid,setSid]=useState(null)
  const[edit,setEdit]=useState(false)
  const[sz,setSz]=useState({w:0,h:0,s:1})
  const[undo,setUndo]=useState(null)
  const[placeMode,setPlaceMode]=useState(false)
  const[cross,setCross]=useState(null)
  const box=useRef(null),iw=useRef(null)
  const prev=useRef(null)
  const ds=useRef({x:0,y:0,bx:0,by:0})
  const szr=useRef({w:0,h:0,s:1})

  const sel=blocks.find(b=>b.id===sid)

  const cl=useCallback(()=>{
    if(!img||!box.current)return
    const cw=box.current.clientWidth,ch=box.current.clientHeight
    const s=Math.min(cw/img.naturalWidth,ch/img.naturalHeight,1)
    setSz({w:Math.round(img.naturalWidth*s),h:Math.round(img.naturalHeight*s),s})
  },[img])
  useEffect(()=>{cl();window.addEventListener('resize',cl);return()=>window.removeEventListener('resize',cl)},[cl])
  useEffect(()=>{szr.current=sz},[sz])

  const up=async f=>{
    nid=0;setBlocks([]);setSid(null);setEdit(false);setUndo(null);setPlaceMode(false)
    if(prev.current)URL.revokeObjectURL(prev.current)
    const{url}=await compressImage(f)
    prev.current=url;setImgUrl(url);setImg(await loadImage(url))
  }

  const toPct=(cx,cy)=>{
    const w=iw.current;if(!w)return{x:50,y:50}
    const r=w.getBoundingClientRect()
    return{x:Math.max(0,Math.min(100,(cx-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(cy-r.top)/r.height*100))}
  }

  const bgDown=e=>{
    if(!placeMode){setSid(null);setEdit(false);return}
    e.preventDefault();e.stopPropagation()
    const p=toPct(e.clientX,e.clientY)
    const b={id:uid(),x:p.x,y:p.y,text:'',fontSize:80,color:'#ffffff',bold:true}
    setBlocks(p=>{setUndo([...p]);setSid(b.id);setEdit(true);return[...p,b]})
    setPlaceMode(false);setCross(null)
  }
  const bgMove=e=>{
    if(!placeMode)return
    const p=toPct(e.clientX,e.clientY),w=iw.current
    if(!w)return;const r=w.getBoundingClientRect()
    setCross({x:p.x,y:p.y,left:r.left,top:r.top,width:r.width,height:r.height})
  }
  const bgLeave=()=>setCross(null)

  const blkDown=(id,e)=>{
    if(placeMode)return
    e.stopPropagation();e.preventDefault();e.target.setPointerCapture(e.pointerId)
    const b=blocks.find(x=>x.id===id);if(!b)return
    let moved=false
    ds.current={x:e.clientX,y:e.clientY,bx:b.x,by:b.y}
    const mv=e=>{
      const dx=e.clientX-ds.current.x,dy=e.clientY-ds.current.y
      if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true
      const r=szr.current;if(!r.w)return
      let nx=ds.current.bx+dx/r.w*100,ny=ds.current.by+dy/r.h*100
      setBlocks(p=>p.map(t=>t.id===id?{...t,x:Math.max(0,Math.min(100,nx)),y:Math.max(0,Math.min(100,ny))}:t))
    }
    const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);if(!moved){setSid(id);setEdit(true)}}
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up)
  }

  const upd=u=>setBlocks(p=>p.map(b=>b.id===sid?{...b,...u}:b))
  const del=()=>{if(!sid)return;setBlocks(p=>{setUndo([...p]);const n=p.filter(b=>b.id!==sid);setSid(null);setEdit(false);return n})}
  const onUndo=()=>{if(!undo)return;setBlocks(undo);setUndo(null);setSid(null);setEdit(false)}
  const clr=()=>{setBlocks(p=>{setUndo([...p]);return[]});setSid(null);setEdit(false)}

  const save=()=>{
    if(!img)return
    const cv=document.createElement('canvas');cv.width=img.naturalWidth;cv.height=img.naturalHeight
    const ctx=cv.getContext('2d');ctx.drawImage(img,0,0)
    blocks.forEach(b=>{if(!b.text)return
      ctx.font=`${b.bold?'bold ':''}${b.fontSize||80}px sans-serif`;ctx.fillStyle=b.color||'#fff';ctx.textAlign='center';ctx.textBaseline='middle'
      ctx.shadowColor='rgba(0,0,0,0.35)';ctx.shadowBlur=Math.max(1,(b.fontSize||80)/16)
      ctx.fillText(b.text,b.x/100*img.naturalWidth,b.y/100*img.naturalHeight)})
    ctx.save();ctx.globalAlpha=.08;ctx.font='10px sans-serif';ctx.fillStyle='#000';ctx.textAlign='right'
    ctx.fillText('已编辑',img.naturalWidth-8,img.naturalHeight-8);ctx.restore()
    cv.toBlob(bl=>{if(bl)downloadBlob(bl,generateFilename())},'image/png')
  }

  const reset=()=>{if(prev.current)URL.revokeObjectURL(prev.current);prev.current=null;setImg(null);setImgUrl(null);setBlocks([]);setSid(null);setEdit(false);setUndo(null);setPlaceMode(false)}

  const now=new Date()
  const temps=[{k:'日期',v:now.toLocaleDateString('zh-CN')},{k:'时间',v:now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})},{k:'秒',v:now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}]
  const cols=['#FFFFFF','#E0E0E0','#BDBDBD','#9E9E9E','#616161','#333333','#000000','#FF6B6B','#FFB347','#FFD93D','#6BCB77','#4D96FF','#9B59B6']

  return<div className="h-full flex flex-col bg-[#f5f5f7]">
    {img&&<header className="flex-shrink-0 bg-white shadow-sm px-4 py-3 z-10 flex items-center justify-between">
      <h1 className="text-lg font-bold text-gray-800">水印添加器</h1>
      <button onClick={reset} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium">换照片</button>
    </header>}
    <div className="flex-1 relative overflow-hidden">
      {!img?<div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] px-6"
        onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f?.type?.startsWith('image/'))up(f)}}
        onDragOver={e=>e.preventDefault()}>
        <div className="w-24 h-24 mb-4 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
        <h2 className="text-xl font-bold mb-1">水印添加器</h2>
        <p className="text-gray-500 text-sm mb-6">上传照片 → 点"选位置" → 在照片上点 → 输入文字 → 保存</p>
        <label className="px-6 py-3 bg-[#007AFF] text-white rounded-xl text-base font-medium cursor-pointer active:bg-[#0066CC]">选择照片<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)up(f)}} className="hidden"/></label>
        <p className="mt-4 text-xs text-gray-400">全部本地完成，不上传</p>
      </div>
      :<div ref={box} className="absolute inset-0 flex items-center justify-center bg-[#262626]" style={{cursor:placeMode?'none':'default'}}
        onPointerDown={bgDown} onPointerMove={bgMove} onPointerLeave={bgLeave} onPointerCancel={bgLeave}>
        <div ref={iw} className="relative" style={{width:sz.w+'px',height:sz.h+'px'}}>
          <img src={imgUrl} className="w-full h-full block pointer-events-none select-none" alt=""/>
          {blocks.map(b=>{const is=sid===b.id,fs=Math.max(8,Math.round(b.fontSize*sz.s))
            return<div key={b.id} data-block className="absolute cursor-grab active:cursor-grabbing select-none" style={{left:b.x+'%',top:b.y+'%',zIndex:20,transform:'translate(-50%,-50%)'}} onPointerDown={e=>blkDown(b.id,e)}>
              <div className="whitespace-nowrap leading-none" style={{fontSize:fs+'px',color:b.color||'#fff',fontWeight:b.bold?'bold':'normal',fontFamily:'sans-serif',textShadow:'0 1px 4px rgba(0,0,0,0.6)'}}>{b.text||(is?'▎':'')}</div>
              {is&&<div className="absolute -inset-1 border-2 border-[#007AFF] rounded pointer-events-none"/>}
            </div>})}
        </div>
        {placeMode&&cross&&<div className="fixed pointer-events-none z-30" style={{left:cross.left+cross.width*cross.x/100-24+'px',top:cross.top+cross.height*cross.y/100-24+'px'}}>
          <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#fff" strokeWidth="2.5" opacity="0.9"/><circle cx="24" cy="24" r="6" fill="none" stroke="#fff" strokeWidth="2" opacity="0.9"/><line x1="24" y1="2" x2="24" y2="10" stroke="#fff" strokeWidth="2.5"/><line x1="24" y1="38" x2="24" y2="46" stroke="#fff" strokeWidth="2.5"/><line x1="2" y1="24" x2="10" y2="24" stroke="#fff" strokeWidth="2.5"/><line x1="38" y1="24" x2="46" y2="24" stroke="#fff" strokeWidth="2.5"/></svg>
        </div>}
        {placeMode&&<div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#007AFF] text-white px-4 py-2 rounded-full text-sm font-medium z-20 shadow-lg pointer-events-none animate-pulse">点照片上要加水印的位置</div>}
      </div>}
    </div>

    {edit&&sel&&<><div className="fixed inset-0 bg-black/20 z-20" onClick={()=>{setEdit(false);setSid(null)}}/>
      <div className="fixed inset-x-0 bottom-0 bg-white shadow-lg rounded-t-2xl z-30 animate-fadein px-4 pt-4 pb-4 max-h-[65vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3"><h3 className="text-base font-semibold">编辑水印</h3><button onClick={del} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm">删除</button></div>
        <input type="text" value={sel.text} onChange={e=>upd({text:e.target.value})} placeholder="输入水印文字..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:border-[#007AFF] mb-3" autoFocus/>
        <label className="text-sm text-gray-600 block mb-1">字号: {sel.fontSize||80}px</label>
        <input type="range" min={10} max={1000} value={sel.fontSize||80} onChange={e=>upd({fontSize:Number(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg accent-[#007AFF] mb-3"/>
        <label className="text-sm text-gray-600 block mb-1">颜色</label>
        <div className="flex flex-wrap gap-1.5 mb-3">{cols.map(c=><button key={c} onClick={()=>upd({color:c})} className={`w-8 h-8 rounded-full border-2 ${sel.color===c?'border-[#007AFF] scale-110':'border-gray-200'}`} style={{backgroundColor:c}}/>)}</div>
        <label className="flex items-center gap-2 text-sm text-gray-600 mb-3"><input type="checkbox" checked={sel.bold||false} onChange={e=>upd({bold:e.target.checked})} className="w-4 h-4 text-[#007AFF] rounded"/>粗体</label>
        <div className="flex flex-wrap gap-2 mb-2">{temps.map(t=><button key={t.k} onClick={()=>upd({text:t.v})} className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200">{t.k}</button>)}</div>
      </div>
    </>}

    {img&&<div className={`flex-shrink-0 bg-white shadow-lg px-3 pt-3 pb-4 ${edit?'opacity-0 pointer-events-none':''}`}>
      <div className="grid grid-cols-4 gap-3">
        <B l={placeMode?'取消':'选位置'} d={placeMode?'取消加水印':'点照片加水印'} c={()=>{setPlaceMode(v=>!v);setCross(null);setSid(null);setEdit(false)}} p/>
        <B l="保存" d="导出PNG" c={save} p/>
        <B l="撤销" d="恢复上步" x={!undo} c={onUndo}/>
        <B l="全删" d="清除全部" x={blocks.length===0} c={clr}/>
      </div>
      <p className="mt-3 text-center text-xs text-gray-400">点"选位置"进入添加模式 · 拖水印移动 · 点水印编辑</p>
    </div>}
  </div>
}

function B({l,d,x,c,p}){return<button className={`py-2.5 rounded-xl flex flex-col items-center gap-0.5 ${x?'bg-gray-100 text-gray-400':p?'bg-[#007AFF]/90 text-white':'bg-gray-100 text-gray-700'} disabled:opacity-50`} disabled={x} onClick={c}><span className="text-sm font-semibold">{l}</span><span className="text-[10px] opacity-70">{d}</span></button>}