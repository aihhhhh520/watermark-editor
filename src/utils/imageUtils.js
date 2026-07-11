export function compressImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image()
    img.onload=()=>{
      const maxW=2048,maxH=2048
      let w=img.width,h=img.height
      if(w>maxW||h>maxH){const r=Math.min(maxW/w,maxH/h);w=Math.round(w*r);h=Math.round(h*r)}
      const c=document.createElement('canvas');c.width=w;c.height=h
      c.getContext('2d').drawImage(img,0,0,w,h)
      c.toBlob(b=>{if(b)resolve({url:URL.createObjectURL(b),width:w,height:h});else reject(new Error('compress failed'))},'image/jpeg',0.85)
    }
    img.onerror=reject
    img.src=URL.createObjectURL(file)
  })
}

export function loadImage(url){
  return new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url
  })
}

export function downloadBlob(blob,filename){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}

export function generateFilename(){
  const d=new Date();return `watermark_${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}_${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}.png`
}

export function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}

export function gaussBlur(imageData,mask,radius,passes){
  const w=imageData.width,h=imageData.height
  const src=new Uint8ClampedArray(imageData.data)
  const dst=new Uint8ClampedArray(src)
  const maskData=mask.data
  // Simple box blur with distance-based feathering
  for(let p=0;p<passes;p++){
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4
        if(maskData[i+3]===0){dst[i]=src[i];dst[i+1]=src[i+1];dst[i+2]=src[i+2];continue}
        let r=0,g=0,b=0,c=0
        for(let dy=-radius;dy<=radius;dy++){
          for(let dx=-radius;dx<=radius;dx++){
            const nx=x+dx,ny=y+dy
            if(nx<0||nx>=w||ny<0||ny>=h)continue
            const j=(ny*w+nx)*4
            if(maskData[j+3]===0){r+=src[j];g+=src[j+1];b+=src[j+2];c++}
          }
        }
        if(c>0){dst[i]=r/c;dst[i+1]=g/c;dst[i+2]=b/c}
      }
    }
    if(p<passes-1)src.set(dst)
  }
  return new ImageData(dst,w,h)
}