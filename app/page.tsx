'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, BUCKET, type Post } from '@/lib/supabase'
import { checkPW, getRole, saveRole, clearRole, type Role } from '@/lib/auth'

/* ─── Color maps ─── */
const CAT_COLOR: Record<string,string> = {
  'Awareness':'#014A8F','Education & Trust':'#7DC13A',
  'Social Proof':'#E86D28','Conversion':'#E8369A'
}
const PLAT_COLOR: Record<string,string> = {
  'Instagram':'#014A8F','TikTok':'#111',
  'Email':'#E86D28','Pinterest':'#C679E3'
}
const STATUS_COLOR: Record<string,string> = {
  approved:'#7DC13A',draft:'#aaa',review:'#E86D28',scheduled:'#014A8F'
}
const CATEGORIES = ['Awareness','Education & Trust','Social Proof','Conversion']
const PLATFORMS = ['Instagram','TikTok','Email','Pinterest']
const FORMATS = ['Reel','Static','Carousel','Story','TikTok Video','Email','Pinterest Pin','UGC']
const STATUSES = ['draft','review','approved','scheduled']

/* ─── pill ─── */
const Pill = ({text,bg,color='#fff',size=9}:{text:string,bg:string,color?:string,size?:number}) => (
  <span style={{fontSize:size,fontWeight:800,padding:'2px 8px',borderRadius:20,background:bg,color,textTransform:'uppercase',letterSpacing:.3,whiteSpace:'nowrap'}}>{text}</span>
)

/* ════════════════════════════════════════
   LOGIN
════════════════════════════════════════ */
function Login({onLogin}:{onLogin:(r:Role)=>void}) {
  const [pw,setPw]=useState('')
  const [err,setErr]=useState('')
  const [loading,setLoading]=useState(false)

  const go=()=>{
    if(!pw)return
    setLoading(true)
    setTimeout(()=>{
      const r=checkPW(pw)
      if(r){saveRole(r);onLogin(r)}
      else{setErr('Incorrect password. Try again.');setLoading(false)}
    },400)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--navy)',position:'relative',overflow:'hidden'}}>
      {[
        {w:340,h:340,bg:'var(--lime)',top:-90,right:200,op:.12},
        {w:260,h:260,bg:'var(--yellow)',top:60,right:-50,op:.14},
        {w:180,h:180,bg:'var(--orange)',bottom:-40,right:30,op:.12},
        {w:130,h:130,bg:'var(--pink)',bottom:50,right:220,op:.1},
      ].map((b,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',width:b.w,height:b.h,background:b.bg,opacity:b.op,
          top:(b as any).top,bottom:(b as any).bottom,right:b.right,pointerEvents:'none'}}/>
      ))}

      <div style={{position:'relative',zIndex:1,background:'rgba(255,255,255,0.07)',backdropFilter:'blur(12px)',
        border:'1px solid rgba(255,255,255,0.14)',borderRadius:12,padding:'48px 40px',width:'100%',maxWidth:400,textAlign:'center'}}>
        <div className="anton" style={{fontSize:26,color:'#fff',lineHeight:1,marginBottom:4}}>
          PLANT <span style={{color:'var(--lime)'}}>CHOCOLATES</span>
        </div>
        <div style={{fontSize:10,color:'var(--yellow)',fontWeight:700,letterSpacing:2.5,textTransform:'uppercase',marginBottom:20}}>
          Plant Powered. Functional Goodness.
        </div>
        <div style={{width:48,height:3,background:'var(--lime)',margin:'0 auto 20px'}}/>
        <div className="anton" style={{fontSize:18,color:'#fff',marginBottom:6}}>CONTENT HUB</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',marginBottom:28}}>Enter your team password to access</div>

        <input
          type="password" placeholder="Password" value={pw}
          onChange={e=>{setPw(e.target.value);setErr('')}}
          onKeyDown={e=>e.key==='Enter'&&go()}
          style={{width:'100%',padding:'12px 16px',borderRadius:6,
            border:err?'2px solid var(--orange)':'2px solid rgba(255,255,255,0.2)',
            background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:15,
            marginBottom:12,outline:'none',fontFamily:'Nunito,sans-serif'}}
        />
        {err&&<div style={{color:'var(--orange)',fontSize:12,marginBottom:12}}>{err}</div>}
        <button onClick={go} disabled={loading||!pw} style={{
          width:'100%',padding:'12px',borderRadius:6,cursor:pw?'pointer':'default',
          background:pw?'var(--lime)':'rgba(255,255,255,0.1)',
          color:pw?'var(--navy)':'rgba(255,255,255,0.3)',
          border:'none',fontSize:14,fontWeight:800,textTransform:'uppercase',letterSpacing:1,transition:'all .2s'}}>
          {loading?'Verifying…':'Enter'}
        </button>
        <div style={{marginTop:24,fontSize:11,color:'rgba(255,255,255,0.28)',lineHeight:1.9}}>
          👁 Viewer — read only<br/>✏️ Editor — full edit + upload
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   UPLOAD ZONE
════════════════════════════════════════ */
function UploadZone({postId,existing,onDone}:{postId:string,existing:string[],onDone:(urls:string[])=>void}) {
  const [files,setFiles]=useState<File[]>([])
  const [uploading,setUploading]=useState(false)
  const [progress,setProgress]=useState(0)
  const [error,setError]=useState('')
  const ref=useRef<HTMLInputElement>(null)

  const handleDrop=(e:React.DragEvent)=>{
    e.preventDefault()
    const dropped=Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/')||f.type.startsWith('video/'))
    setFiles(prev=>[...prev,...dropped])
  }

  const handlePick=(e:React.ChangeEvent<HTMLInputElement>)=>{
    if(e.target.files){
      const picked=Array.from(e.target.files)
      setFiles(prev=>[...prev,...picked])
    }
  }

  const removeFile=(i:number)=>setFiles(prev=>prev.filter((_,idx)=>idx!==i))

  const removeExisting=async(url:string)=>{
    const path=url.split(`${BUCKET}/`)[1]
    await supabase.storage.from(BUCKET).remove([path])
    const newUrls=existing.filter(u=>u!==url)
    await supabase.from('content_posts').update({media_urls:newUrls}).eq('id',postId)
    onDone(newUrls)
  }

  const upload=async()=>{
    if(!files.length)return
    setUploading(true);setError('')
    const newUrls=[...existing]
    for(let i=0;i<files.length;i++){
      const f=files[i]
      const ext=f.name.split('.').pop()
      const path=`posts/${postId}/${Date.now()}-${i}.${ext}`
      const {error:err}=await supabase.storage.from(BUCKET).upload(path,f,{upsert:true})
      if(err){setError(err.message);break}
      const {data}=supabase.storage.from(BUCKET).getPublicUrl(path)
      newUrls.push(data.publicUrl)
      setProgress(Math.round(((i+1)/files.length)*100))
    }
    await supabase.from('content_posts').update({media_urls:newUrls}).eq('id',postId)
    setFiles([]);setUploading(false);setProgress(0)
    onDone(newUrls)
  }

  return (
    <div>
      {/* Existing media */}
      {existing.length>0&&(
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
          {existing.map((url,i)=>(
            <div key={i} style={{position:'relative',width:80,height:80,borderRadius:6,overflow:'hidden',border:'1px solid var(--border)'}}>
              {url.includes('.mp4')||url.includes('.mov')||url.includes('.webm')
                ?<video src={url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                :<img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
              <button onClick={()=>removeExisting(url)} style={{
                position:'absolute',top:2,right:2,width:18,height:18,borderRadius:'50%',
                background:'rgba(0,0,0,0.7)',color:'#fff',border:'none',cursor:'pointer',
                fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e=>e.preventDefault()} onDrop={handleDrop}
        onClick={()=>ref.current?.click()}
        style={{border:'2px dashed var(--border)',borderRadius:8,padding:'20px',textAlign:'center',
          cursor:'pointer',background:'var(--off)',transition:'border-color .15s'}}
        onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--lime)')}
        onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}
      >
        <div style={{fontSize:24,marginBottom:6}}>📁</div>
        <div style={{fontSize:12,fontWeight:700,color:'var(--mid)'}}>Click to upload or drag &amp; drop</div>
        <div style={{fontSize:11,color:'#aaa',marginTop:2}}>Images (JPG, PNG, WebP, GIF) or Videos (MP4, MOV, WebM) · Max 50MB</div>
        <input ref={ref} type="file" multiple accept="image/*,video/*" onChange={handlePick} style={{display:'none'}}/>
      </div>

      {/* Staged files */}
      {files.length>0&&(
        <div style={{marginTop:10}}>
          <div style={{fontSize:11,fontWeight:800,color:'var(--navy)',textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>
            Ready to upload ({files.length} file{files.length>1?'s':''})
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
            {files.map((f,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:4,background:'var(--off)',padding:'4px 8px',borderRadius:4}}>
                <span style={{fontSize:11,color:'var(--mid)'}}>{f.name.length>20?f.name.slice(0,18)+'…':f.name}</span>
                <button onClick={()=>removeFile(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#aaa',fontSize:12}}>✕</button>
              </div>
            ))}
          </div>
          {uploading&&(
            <div style={{marginBottom:8}}>
              <div style={{height:4,background:'var(--border)',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',background:'var(--lime)',width:`${progress}%`,transition:'width .3s'}}/>
              </div>
              <div style={{fontSize:11,color:'var(--mid)',marginTop:4}}>{progress}% uploaded…</div>
            </div>
          )}
          {error&&<div style={{fontSize:12,color:'var(--orange)',marginBottom:8}}>{error}</div>}
          <button onClick={upload} disabled={uploading} style={{
            padding:'8px 16px',background:'var(--lime)',color:'var(--navy)',border:'none',
            borderRadius:6,fontSize:13,fontWeight:800,cursor:'pointer'}}>
            {uploading?'Uploading…':'Upload Files'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   EDIT MODAL
════════════════════════════════════════ */
const BLANK: Partial<Post> = {
  content_number:0,category:'Awareness',platform_channel:'Instagram',format:'Reel',
  hook_name:'',caption_en:'',hashtags:[],vb_background:'',vb_typography:'',
  vb_props:'',vb_mood:'',media_urls:[],status:'draft',notes:''
}

function EditModal({post,onClose,onSaved}:{post:Partial<Post>|null,onClose:()=>void,onSaved:()=>void}) {
  const [form,setForm]=useState<Partial<Post>>(post??BLANK)
  const [saving,setSaving]=useState(false)
  const [tagInput,setTagInput]=useState((post?.hashtags??[]).join(' '))
  const [mediaUrls,setMediaUrls]=useState<string[]>(post?.media_urls??[])
  const isNew=!post?.id

  const set=(k:keyof Post,v:any)=>setForm(f=>({...f,[k]:v}))

  const save=async()=>{
    setSaving(true)
    const data={...form,hashtags:tagInput.trim().split(/\s+/).filter(Boolean),media_urls:mediaUrls}
    if(isNew){
      await supabase.from('content_posts').insert(data)
    } else {
      await supabase.from('content_posts').update(data).eq('id',form.id)
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  const F=(label:string,key:keyof Post,opts?:{rows?:number,type?:string,options?:string[]})=>(
    <div style={{marginBottom:14}}>
      <label style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:.5,color:'var(--navy)',display:'block',marginBottom:4}}>{label}</label>
      {opts?.options
        ?<select value={String(form[key]??'')} onChange={e=>set(key,e.target.value)}
           style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1.5px solid var(--border)',fontSize:13,fontFamily:'Nunito,sans-serif'}}>
           {opts.options.map(o=><option key={o}>{o}</option>)}
         </select>
        :opts?.rows
        ?<textarea rows={opts.rows} value={String(form[key]??'')} onChange={e=>set(key,e.target.value)}
           style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1.5px solid var(--border)',fontSize:13,fontFamily:'Nunito,sans-serif',resize:'vertical'}}/>
        :<input type={opts?.type??'text'} value={String(form[key]??'')} onChange={e=>set(key,opts?.type==='number'?Number(e.target.value):e.target.value)}
           style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1.5px solid var(--border)',fontSize:13,fontFamily:'Nunito,sans-serif'}}/>
      }
    </div>
  )

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:10,width:'100%',maxWidth:680,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,0.35)'}}>
        {/* Header */}
        <div style={{background:'var(--navy)',padding:'16px 24px',borderRadius:'10px 10px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:10}}>
          <div className="anton" style={{color:'#fff',fontSize:17}}>{isNew?'ADD NEW POST':'EDIT POST #{num}'.replace('{num}',String(form.content_number??''))}</div>
          <button onClick={onClose} style={{color:'rgba(255,255,255,0.6)',background:'none',border:'none',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>

        <div style={{padding:24}}>
          {/* Row 1 */}
          <div style={{display:'grid',gridTemplateColumns:'80px 1fr 1fr 1fr',gap:12}}>
            {F('#','content_number',{type:'number'})}
            {F('Category','category',{options:CATEGORIES})}
            {F('Platform','platform_channel',{options:PLATFORMS})}
            {F('Format','format',{options:FORMATS})}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {F('Hook','hook_name')}
            {F('Status','status',{options:STATUSES})}
          </div>
          {F('Caption *','caption_en',{rows:4})}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:.5,color:'var(--navy)',display:'block',marginBottom:4}}>Hashtags (space-separated)</label>
            <textarea rows={2} value={tagInput} onChange={e=>setTagInput(e.target.value)}
              placeholder="#PlantChocolates #FunctionalFood"
              style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1.5px solid var(--border)',fontSize:13,fontFamily:'Nunito,sans-serif',resize:'vertical'}}/>
          </div>

          {/* Visual Brief */}
          <div style={{background:'var(--off)',borderRadius:8,padding:16,marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1,color:'var(--orange)',marginBottom:12}}>Visual Brief — for Graphic Designer</div>
            {F('Background / Setting','vb_background',{rows:2})}
            {F('Typography Direction','vb_typography',{rows:2})}
            {F('Props / Subjects','vb_props',{rows:2})}
            {F('Mood / Reference','vb_mood',{rows:2})}
          </div>

          {/* Media Upload */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1,color:'var(--navy)',marginBottom:8}}>Media — Images &amp; Videos</div>
            {form.id
              ?<UploadZone postId={form.id} existing={mediaUrls} onDone={u=>setMediaUrls(u)}/>
              :<div style={{fontSize:12,color:'#aaa',padding:'12px',background:'var(--off)',borderRadius:6}}>Save the post first, then you can upload media.</div>
            }
          </div>

          {F('Notes','notes',{rows:2})}

          <div style={{display:'flex',gap:10,marginTop:8}}>
            <button onClick={save} disabled={saving||!form.caption_en} style={{
              flex:1,padding:'12px',background:'var(--lime)',color:'var(--navy)',border:'none',
              borderRadius:6,fontSize:14,fontWeight:800,cursor:'pointer',transition:'opacity .2s',
              opacity:saving||!form.caption_en?.trim()?0.6:1}}>
              {saving?'Saving…':isNew?'+ Add Post':'✓ Save Changes'}
            </button>
            <button onClick={onClose} style={{padding:'12px 20px',background:'var(--off)',color:'var(--mid)',border:'1px solid var(--border)',borderRadius:6,fontSize:14,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   POST CARD
════════════════════════════════════════ */
function PostCard({post,role,onEdit,onDelete}:{post:Post,role:Role,onEdit:(p:Post)=>void,onDelete:(id:string)=>void}) {
  const [open,setOpen]=useState(false)
  const catColor=CAT_COLOR[post.category]??'var(--navy)'
  const [imgIdx,setImgIdx]=useState(0)
  const media=post.media_urls??[]

  return (
    <div style={{background:'#fff',borderRadius:8,overflow:'hidden',border:'1px solid var(--border)',transition:'box-shadow .15s'}}
      onMouseEnter={e=>(e.currentTarget.style.boxShadow='0 6px 24px rgba(1,74,143,0.1)')}
      onMouseLeave={e=>(e.currentTarget.style.boxShadow='none')}>
      <div style={{height:5,background:catColor}}/>

      {/* Media preview */}
      {media.length>0&&(
        <div style={{position:'relative',width:'100%',height:180,background:'#111',overflow:'hidden'}}>
          {media[imgIdx].includes('.mp4')||media[imgIdx].includes('.mov')||media[imgIdx].includes('.webm')
            ?<video src={media[imgIdx]} controls style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            :<img src={media[imgIdx]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
          {media.length>1&&(
            <div style={{position:'absolute',bottom:8,left:0,right:0,display:'flex',justifyContent:'center',gap:4}}>
              {media.map((_,i)=>(
                <div key={i} onClick={()=>setImgIdx(i)} style={{
                  width:i===imgIdx?20:8,height:8,borderRadius:4,cursor:'pointer',
                  background:i===imgIdx?'var(--lime)':'rgba(255,255,255,0.5)',transition:'width .2s'}}/>
              ))}
            </div>
          )}
          <div style={{position:'absolute',top:8,right:8,fontSize:10,fontWeight:800,
            background:'rgba(0,0,0,0.55)',color:'#fff',padding:'2px 8px',borderRadius:20}}>
            {media.length} file{media.length>1?'s':''}
          </div>
        </div>
      )}

      {/* No media placeholder (editor only hint) */}
      {media.length===0&&role==='editor'&&(
        <div style={{height:48,background:'var(--off)',display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:11,color:'#bbb',borderBottom:'1px solid var(--border)',gap:6}}>
          <span>📁</span> No media yet — edit post to upload
        </div>
      )}

      <div style={{padding:'14px 16px'}}>
        {/* Header row */}
        <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
          <div className="anton" style={{fontSize:28,lineHeight:1,color:'var(--navy)',minWidth:36}}>
            {String(post.content_number||0).padStart(2,'0')}
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:4}}>
              <Pill text={post.category} bg={catColor}/>
              <Pill text={post.platform_channel} bg={PLAT_COLOR[post.platform_channel]??'#888'}/>
              <Pill text={post.format} bg='#f0f0f0' color='#555'/>
              <Pill text={post.status} bg={STATUS_COLOR[post.status]??'#ccc'}/>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:'var(--mid)'}}>Hook — {post.hook_name}</div>
          </div>
          {role==='editor'&&(
            <div style={{display:'flex',gap:5,flexShrink:0}}>
              <button onClick={()=>onEdit(post)} style={{
                fontSize:11,fontWeight:800,padding:'4px 10px',borderRadius:4,
                background:'var(--navy)',color:'#fff',border:'none',cursor:'pointer'}}>Edit</button>
              <button onClick={()=>onDelete(post.id)} style={{
                fontSize:11,fontWeight:800,padding:'4px 10px',borderRadius:4,
                background:'var(--orange)',color:'#fff',border:'none',cursor:'pointer'}}>Del</button>
            </div>
          )}
        </div>

        {/* Caption */}
        <div style={{fontSize:13,fontStyle:'italic',fontWeight:700,color:'var(--dark)',lineHeight:1.55,marginBottom:10}}>
          &#34;{post.caption_en}&#34;
        </div>

        {/* Hashtags preview */}
        {(post.hashtags??[]).length>0&&(
          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
            {(post.hashtags??[]).slice(0,4).map((t,i)=>(
              <span key={i} style={{fontSize:10,fontWeight:700,color:'var(--navy)',background:'#EAF3FF',padding:'2px 8px',borderRadius:20}}>{t}</span>
            ))}
            {(post.hashtags??[]).length>4&&(
              <span style={{fontSize:10,color:'#aaa',padding:'2px 6px'}}>+{(post.hashtags??[]).length-4} more</span>
            )}
          </div>
        )}

        <button onClick={()=>setOpen(v=>!v)} style={{
          fontSize:10,fontWeight:800,color:'var(--navy)',background:'none',border:'none',
          cursor:'pointer',textTransform:'uppercase',letterSpacing:.5,padding:0}}>
          {open?'▲ Close':'▼ Visual Brief + All Hashtags'}
        </button>

        {open&&(
          <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--off)'}}>
            <div style={{fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:1,color:'var(--orange)',marginBottom:10}}>Visual Brief — for Graphic Designer</div>
            {[['Background / Setting',post.vb_background],['Typography Direction',post.vb_typography],['Props / Subjects',post.vb_props],['Mood / Reference',post.vb_mood]].map(([k,v])=>(
              v?<div key={k} style={{marginBottom:8}}>
                <div style={{fontSize:9,fontWeight:800,textTransform:'uppercase',color:'var(--navy)',marginBottom:2}}>{k}</div>
                <div style={{fontSize:11.5,color:'var(--mid)',lineHeight:1.55,background:'var(--off)',padding:'7px 10px',borderRadius:4}}>{v}</div>
              </div>:null
            ))}
            {(post.hashtags??[]).length>0&&(
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:10}}>
                {(post.hashtags??[]).map((t,i)=>(
                  <span key={i} style={{fontSize:10,fontWeight:700,background:'var(--navy)',color:'var(--lime)',padding:'3px 10px',borderRadius:20}}>{t}</span>
                ))}
              </div>
            )}
            {post.notes&&(
              <div style={{marginTop:10,fontSize:11,color:'var(--mid)'}}><strong>Notes:</strong> {post.notes}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
function Dashboard({role}:{role:Role}) {
  const [posts,setPosts]=useState<Post[]>([])
  const [loading,setLoading]=useState(true)
  const [filterCat,setFilterCat]=useState('All')
  const [filterPlat,setFilterPlat]=useState('All')
  const [search,setSearch]=useState('')
  const [modal,setModal]=useState<Partial<Post>|null|false>(false)
  const [toast,setToast]=useState('')

  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3000)}

  const load=useCallback(async()=>{
    const{data}=await supabase.from('content_posts').select('*').order('content_number',{ascending:true})
    if(data)setPosts(data as Post[])
    setLoading(false)
  },[])

  useEffect(()=>{
    load()
    // Realtime subscription
    const ch=supabase.channel('content_posts_all')
      .on('postgres_changes',{event:'*',schema:'public',table:'content_posts'},payload=>{
        if(payload.eventType==='INSERT'){
          setPosts(prev=>[...prev,payload.new as Post].sort((a,b)=>(a.content_number??0)-(b.content_number??0)))
          showToast('New post added in real-time!')
        } else if(payload.eventType==='UPDATE'){
          setPosts(prev=>prev.map(p=>p.id===payload.new.id?payload.new as Post:p))
          showToast('Post updated in real-time!')
        } else if(payload.eventType==='DELETE'){
          setPosts(prev=>prev.filter(p=>p.id!==payload.old.id))
          showToast('Post deleted in real-time!')
        }
      })
      .subscribe()
    return()=>{supabase.removeChannel(ch)}
  },[load])

  const del=async(id:string)=>{
    if(!confirm('Delete this post and all its media?'))return
    const post=posts.find(p=>p.id===id)
    if(post?.media_urls?.length){
      const paths=post.media_urls.map(u=>u.split(`${BUCKET}/`)[1]).filter(Boolean)
      if(paths.length)await supabase.storage.from(BUCKET).remove(paths)
    }
    await supabase.from('content_posts').delete().eq('id',id)
  }

  const filtered=posts.filter(p=>{
    const catOk=filterCat==='All'||p.category===filterCat
    const platOk=filterPlat==='All'||p.platform_channel===filterPlat
    const q=search.toLowerCase()
    const searchOk=!q||p.caption_en?.toLowerCase().includes(q)||(p.hashtags??[]).some(h=>h.toLowerCase().includes(q))||p.hook_name?.toLowerCase().includes(q)
    return catOk&&platOk&&searchOk
  })

  const stats={
    total:posts.length,
    approved:posts.filter(p=>p.status==='approved').length,
    withMedia:posts.filter(p=>(p.media_urls??[]).length>0).length,
    draft:posts.filter(p=>p.status==='draft').length,
  }

  const NB=({label,active,color,onClick}:{label:string,active:boolean,color:string,onClick:()=>void})=>(
    <button onClick={onClick} style={{
      padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:800,cursor:'pointer',
      border:`1.5px solid ${active?color:'var(--border)'}`,
      background:active?color:'var(--off)',color:active?'#fff':'var(--mid)',
      transition:'all .15s',textTransform:'capitalize',fontFamily:'Nunito,sans-serif',whiteSpace:'nowrap'}}>
      {label}
    </button>
  )

  return (
    <div style={{minHeight:'100vh'}}>
      {/* Toast */}
      {toast&&(
        <div style={{position:'fixed',bottom:24,right:24,zIndex:500,background:'var(--dark)',color:'var(--lime)',
          padding:'10px 18px',borderRadius:8,fontSize:13,fontWeight:700,boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
          display:'flex',gap:8,alignItems:'center'}}>
          <span>🔴 LIVE</span> {toast}
        </div>
      )}

      {/* NAV */}
      <nav style={{position:'sticky',top:0,zIndex:200,background:'var(--navy)',borderBottom:'4px solid var(--lime)',
        display:'flex',alignItems:'center',padding:'0 28px',gap:12,overflow:'hidden'}}>
        <div className="anton" style={{fontSize:17,color:'#fff',whiteSpace:'nowrap',padding:'10px 16px 10px 0',
          borderRight:'1px solid rgba(255,255,255,0.15)',marginRight:4}}>
          PLANT <span style={{color:'var(--lime)'}}>CHOCOLATES</span>
          <span style={{fontSize:11,fontFamily:'Nunito,sans-serif',fontWeight:400,color:'rgba(255,255,255,0.4)',marginLeft:10}}>Content Hub</span>
        </div>
        <div style={{flex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'var(--lime)',animation:'none',
            boxShadow:'0 0 0 2px rgba(125,193,58,0.3)'}}/>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:700}}>LIVE</span>
        </div>
        <div style={{fontSize:11,fontWeight:800,padding:'4px 12px',borderRadius:20,
          background:role==='editor'?'var(--lime)':'rgba(255,255,255,0.12)',
          color:role==='editor'?'var(--navy)':'rgba(255,255,255,0.6)',
          textTransform:'uppercase',letterSpacing:1}}>
          {role==='editor'?'✏️ Editor':'👁 Viewer'}
        </div>
        {role==='editor'&&(
          <button onClick={()=>setModal(BLANK)} style={{
            padding:'8px 14px',borderRadius:6,background:'var(--orange)',color:'#fff',
            border:'none',fontSize:13,fontWeight:800,cursor:'pointer'}}>+ Add Post</button>
        )}
        <button onClick={()=>{clearRole();window.location.reload()}} style={{
          padding:'8px 12px',borderRadius:6,background:'transparent',color:'rgba(255,255,255,0.35)',
          border:'1px solid rgba(255,255,255,0.15)',fontSize:12,cursor:'pointer'}}>Logout</button>
      </nav>

      {/* STATS */}
      <div style={{background:'var(--navy)',padding:'14px 32px',display:'flex',gap:28,flexWrap:'wrap'}}>
        {[{l:'Total',v:stats.total,c:'var(--lime)'},{l:'Approved',v:stats.approved,c:'var(--lime)'},
          {l:'With Media',v:stats.withMedia,c:'var(--yellow)'},{l:'Draft',v:stats.draft,c:'#60A5FA'}].map(s=>(
          <div key={s.l}>
            <div className="anton" style={{fontSize:22,color:s.c,lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginTop:1}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div style={{background:'#fff',borderBottom:'1px solid var(--border)',padding:'12px 28px',
        display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',position:'sticky',top:52,zIndex:100}}>
        <input placeholder="Search captions, hashtags, hooks…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{padding:'6px 12px',borderRadius:6,border:'1.5px solid var(--border)',fontSize:13,fontFamily:'Nunito,sans-serif',width:240}}/>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          <NB label="All" active={filterCat==='All'&&filterPlat==='All'} color="var(--navy)" onClick={()=>{setFilterCat('All');setFilterPlat('All')}}/>
          {CATEGORIES.map(c=><NB key={c} label={c} active={filterCat===c} color={CAT_COLOR[c]} onClick={()=>{setFilterCat(c);setFilterPlat('All')}}/>)}
        </div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {PLATFORMS.map(p=><NB key={p} label={p} active={filterPlat===p} color={PLAT_COLOR[p]} onClick={()=>{setFilterPlat(p);setFilterCat('All')}}/>)}
        </div>
        <div style={{marginLeft:'auto',fontSize:12,color:'var(--mid)',fontWeight:600,whiteSpace:'nowrap'}}>{filtered.length}/{posts.length} posts</div>
      </div>

      {/* GRID */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:18,padding:'24px 28px'}}>
        {loading
          ?<div style={{textAlign:'center',padding:60,color:'var(--mid)',gridColumn:'1/-1'}}>Loading posts…</div>
          :filtered.length===0
          ?<div style={{textAlign:'center',padding:60,color:'var(--mid)',gridColumn:'1/-1'}}>No posts match this filter.</div>
          :filtered.map(p=><PostCard key={p.id} post={p} role={role} onEdit={setModal} onDelete={del}/>)
        }
      </div>

      {/* MODAL */}
      {modal!==false&&<EditModal post={modal||null} onClose={()=>setModal(false)} onSaved={()=>showToast('Saved!')}/>}
    </div>
  )
}

/* ════════════════════════════════════════
   ROOT
════════════════════════════════════════ */
export default function App() {
  const [role,setRole]=useState<Role>(null)
  const [ready,setReady]=useState(false)
  useEffect(()=>{setRole(getRole());setReady(true)},[])
  if(!ready)return null
  if(!role)return <Login onLogin={r=>setRole(r)}/>
  return <Dashboard role={role}/>
}
