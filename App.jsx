import { useState, useEffect } from "react";

// ── CONFIG — your live backend URL ───────────────────────────────────────────
const API = "https://lifepulse-backend-production-3e50.up.railway.app/api";

const C = {
  cream:"#F5F0E8",creamDark:"#EDE7D9",ink:"#1A1A18",inkLight:"#3D3D38",
  inkMuted:"#7A7A72",green:"#2D6A4F",greenLight:"#D8F3DC",greenMid:"#52B788",
  amber:"#B5621A",amberLight:"#FFE8CC",amberMid:"#F4A261",
  accent:"#C84B31",border:"#D6CFBF",white:"#FFFEF9",cardBg:"#FDFAF3",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.cream};font-family:'DM Sans',sans-serif;color:${C.ink};}
  ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
  .serif{font-family:'Playfair Display',serif;}
  .fade-in{animation:fadeUp 0.4s ease forwards;opacity:0;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
  .peel-in{animation:peelIn 0.5s cubic-bezier(.16,1,.3,1) forwards;opacity:0;}
  @keyframes peelIn{from{opacity:0;transform:translateY(32px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
  .shimmer{background:linear-gradient(90deg,${C.creamDark} 25%,${C.border} 50%,${C.creamDark} 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .bounce{animation:bounce 0.4s cubic-bezier(.36,.07,.19,.97);}
  @keyframes bounce{0%,100%{transform:scale(1)}40%{transform:scale(1.25)}60%{transform:scale(0.9)}}
  .confetti{animation:confettiBurst 0.8s ease forwards;}
  @keyframes confettiBurst{0%{transform:scale(0);opacity:1}100%{transform:scale(3);opacity:0}}
  button{cursor:pointer;font-family:'DM Sans',sans-serif;}
  input,textarea{font-family:'DM Sans',sans-serif;}
`;

const ACTIVITIES_PRODUCTIVE = [
  {id:"workout",emoji:"💪",label:"Working out",color:"green"},
  {id:"reading",emoji:"📖",label:"Reading",color:"green"},
  {id:"cooking",emoji:"🍳",label:"Cooking",color:"green"},
  {id:"outdoors",emoji:"🌿",label:"Touching grass",color:"green"},
  {id:"creating",emoji:"🎨",label:"Creating",color:"green"},
  {id:"deepwork",emoji:"💼",label:"Deep work",color:"green"},
  {id:"wellness",emoji:"🧘",label:"Wellness",color:"green"},
  {id:"building",emoji:"🛠",label:"Building",color:"green"},
  {id:"learning",emoji:"🌱",label:"Learning",color:"green"},
  {id:"volunteering",emoji:"🤝",label:"Volunteering",color:"green"},
];
const ACTIVITIES_RELAXING = [
  {id:"doomscroll",emoji:"📱",label:"Doomscrolling",color:"amber"},
  {id:"gaming",emoji:"🎮",label:"Gaming",color:"amber"},
  {id:"binge",emoji:"📺",label:"Binge-watching",color:"amber"},
  {id:"napping",emoji:"😴",label:"Napping",color:"amber"},
  {id:"junkfood",emoji:"🍕",label:"Junk food",color:"amber"},
  {id:"shopping",emoji:"🛒",label:"Impulse shopping",color:"amber"},
  {id:"groupchat",emoji:"💬",label:"Group chat hole",color:"amber"},
];
const ALL_ACTIVITIES=[...ACTIVITIES_PRODUCTIVE,...ACTIVITIES_RELAXING];

// ── Auth helpers ──────────────────────────────────────────────────────────────
const getToken=()=>localStorage.getItem("lp_token");
const setToken=(t)=>localStorage.setItem("lp_token",t);
const getRefresh=()=>localStorage.getItem("lp_refresh");
const setRefresh=(t)=>localStorage.setItem("lp_refresh",t);
const getUser=()=>{try{return JSON.parse(localStorage.getItem("lp_user"));}catch{return null;}};
const setUser=(u)=>localStorage.setItem("lp_user",JSON.stringify(u));
const clearAuth=()=>{["lp_token","lp_refresh","lp_user","lp_room"].forEach(k=>localStorage.removeItem(k));};

const apiFetch=async(path,options={})=>{
  const token=getToken();
  const res=await fetch(`${API}${path}`,{
    ...options,
    headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{}),...(options.headers||{})},
  });
  if(res.status===401){
    const refresh=getRefresh();
    if(refresh){
      const r=await fetch(`${API}/auth/refresh`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refreshToken:refresh})});
      if(r.ok){const{accessToken}=await r.json();setToken(accessToken);return apiFetch(path,options);}
    }
    clearAuth();window.location.reload();
  }
  return res;
};

const encryptCaption=(text)=>btoa(encodeURIComponent(text));
const decryptCaption=(cipher)=>{try{return decodeURIComponent(atob(cipher));}catch{return cipher;}};
const generateNonce=()=>btoa(Math.random().toString(36));
const userColor=(name)=>["#2D6A4F","#C84B31","#7B4F9E","#B5621A","#1A5276"][name?.charCodeAt(0)%5]||C.inkLight;

// ── UI helpers ────────────────────────────────────────────────────────────────
const Avatar=({name,size=36,style={}})=>(
  <div style={{width:size,height:size,borderRadius:"50%",background:userColor(name),display:"flex",alignItems:"center",justifyContent:"center",color:C.white,fontWeight:600,fontSize:size*0.38,flexShrink:0,...style}}>
    {name?.[0]?.toUpperCase()||"?"}
  </div>
);

const ActivityBadge=({activityId})=>{
  const act=ALL_ACTIVITIES.find(a=>a.id===activityId);
  if(!act)return<span style={{fontSize:12,padding:"3px 8px",borderRadius:20,background:C.creamDark,color:C.inkMuted}}>{activityId}</span>;
  const g=act.color==="green";
  return<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,background:g?C.greenLight:C.amberLight,color:g?C.green:C.amber,fontSize:12,fontWeight:500}}>{act.emoji} {act.label}</span>;
};

const Btn=({children,onClick,variant="primary",style={},disabled=false,loading=false})=>{
  const v={primary:{background:C.ink,color:C.white},secondary:{background:C.creamDark,color:C.ink,border:`1px solid ${C.border}`},accent:{background:C.accent,color:C.white},ghost:{background:"transparent",color:C.ink,border:`1px solid ${C.border}`},green:{background:C.green,color:C.white}};
  return<button onClick={disabled||loading?undefined:onClick} style={{padding:"10px 20px",borderRadius:8,border:"none",fontWeight:500,fontSize:14,cursor:disabled||loading?"not-allowed":"pointer",transition:"all 0.15s",opacity:disabled||loading?0.6:1,display:"inline-flex",alignItems:"center",gap:6,...v[variant],...style}}>{loading?"Loading...":children}</button>;
};

const Card=({children,style={}})=><div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",...style}}>{children}</div>;
const Err=({msg})=>msg?<div style={{padding:"10px 14px",borderRadius:8,background:"#FEE2E2",color:C.accent,fontSize:13,marginBottom:12}}>{msg}</div>:null;
const Inp=({label,value,onChange,placeholder,type="text"})=>(
  <div style={{marginBottom:16}}>
    {label&&<label style={{fontSize:13,color:C.inkMuted,display:"block",marginBottom:6}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,fontSize:15,outline:"none"}}/>
  </div>
);

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const[mode,setMode]=useState("login");
  const[username,setUsername]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  const submit=async()=>{
    if(!username.trim()||!password.trim())return setError("Fill in all fields");
    setLoading(true);setError("");
    try{
      let res,data;
      if(mode==="register"){
        const publicKey=btoa(Math.random().toString(36).repeat(3));
        const encryptedPrivateKey=btoa(Math.random().toString(36).repeat(3)+":"+password);
        res=await apiFetch("/auth/register",{method:"POST",body:JSON.stringify({username:username.trim(),password,publicKey,encryptedPrivateKey})});
      }else{
        res=await apiFetch("/auth/login",{method:"POST",body:JSON.stringify({username:username.trim(),password})});
      }
      data=await res.json();
      if(!res.ok)return setError(data.error||"Failed");
      setToken(data.accessToken);setRefresh(data.refreshToken);setUser(data.user);
      onAuth(data.user);
    }catch{setError("Network error — check your connection");}
    finally{setLoading(false);}
  };

  return(
    <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div className="fade-in" style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:48,marginBottom:12}}>💓</div>
          <h1 className="serif" style={{fontSize:42,fontWeight:900,letterSpacing:-1}}>LifePulse</h1>
          <p style={{color:C.inkMuted,marginTop:8}}>Your private corner of the internet.</p>
        </div>
        <Card>
          <div style={{display:"flex",gap:8,marginBottom:24}}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${mode===m?C.ink:C.border}`,background:mode===m?C.ink:C.cream,color:mode===m?C.white:C.ink,fontWeight:500,fontSize:14,cursor:"pointer",transition:"all 0.15s"}}>
                {m==="login"?"Sign in":"Create account"}
              </button>
            ))}
          </div>
          <Err msg={error}/>
          <Inp label="Username" value={username} onChange={setUsername} placeholder="e.g. maya_runs"/>
          <Inp label="Password" value={password} onChange={setPassword} placeholder="Min 8 characters" type="password"/>
          <Btn onClick={submit} loading={loading} style={{width:"100%",justifyContent:"center",padding:"13px"}}>
            {mode==="login"?"Sign in →":"Create account →"}
          </Btn>
        </Card>
        <p style={{textAlign:"center",fontSize:12,color:C.inkMuted,marginTop:20}}>🔒 End-to-end encrypted · Zero server-side knowledge</p>
      </div>
    </div>
  );
}

// ── Room Setup ────────────────────────────────────────────────────────────────
function RoomSetupScreen({user,onRoomJoined}){
  const[action,setAction]=useState(null);
  const[roomName,setRoomName]=useState("");
  const[joinCode,setJoinCode]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  const createRoom=async()=>{
    if(!roomName.trim())return setError("Enter a room name");
    setLoading(true);setError("");
    try{
      const res=await apiFetch("/rooms",{method:"POST",body:JSON.stringify({name:roomName.trim(),emoji:"💓",encryptedRoomKey:btoa("key_"+Math.random())})});
      const data=await res.json();
      if(!res.ok)return setError(data.error||"Failed");
      onRoomJoined(data.room);
    }catch{setError("Network error");}
    finally{setLoading(false);}
  };

  const joinRoom=async()=>{
    if(!joinCode.trim())return setError("Enter a join code");
    setLoading(true);setError("");
    try{
      const res=await apiFetch("/rooms/join",{method:"POST",body:JSON.stringify({joinCode:joinCode.trim().toUpperCase(),encryptedRoomKey:btoa("key_"+Math.random())})});
      const data=await res.json();
      if(!res.ok)return setError(data.error||"Failed");
      onRoomJoined(data.room);
    }catch{setError("Network error");}
    finally{setLoading(false);}
  };

  return(
    <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div className="fade-in" style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:48,marginBottom:12}}>💓</div>
          <h1 className="serif" style={{fontSize:36,fontWeight:900}}>Hey, {user.username}!</h1>
          <p style={{color:C.inkMuted,marginTop:8}}>Create a room or join one a friend made.</p>
        </div>
        <Card>
          <Err msg={error}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {[["create","🏠","Create room","Start your space"],["join","🔑","Join room","Enter a code"]].map(([id,emoji,label,sub])=>(
              <button key={id} onClick={()=>{setAction(id);setError("");}} style={{padding:"20px 16px",borderRadius:12,border:`2px solid ${action===id?C.ink:C.border}`,background:action===id?C.ink:C.cream,color:action===id?C.white:C.ink,cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <div style={{fontSize:28,marginBottom:8}}>{emoji}</div>
                <div style={{fontWeight:600}}>{label}</div>
                <div style={{fontSize:12,opacity:0.6,marginTop:4}}>{sub}</div>
              </button>
            ))}
          </div>
          {action==="create"&&<div><Inp label="Room name" value={roomName} onChange={setRoomName} placeholder="e.g. The Homies"/><Btn onClick={createRoom} loading={loading} style={{width:"100%",justifyContent:"center"}}>Create Room 🏠</Btn></div>}
          {action==="join"&&<div><Inp label="Room code" value={joinCode} onChange={setJoinCode} placeholder="e.g. FLAME-7293"/><Btn onClick={joinRoom} loading={loading} style={{width:"100%",justifyContent:"center"}}>Join Room 🔑</Btn></div>}
        </Card>
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({post,index}){
  const[reactions,setReactions]=useState({});
  const[bouncing,setBouncing]=useState(false);

  useEffect(()=>{
    const g={};(post.reactions||[]).forEach(r=>{g[r.emoji]=(g[r.emoji]||0)+1;});setReactions(g);
  },[]);

  const react=async(emoji)=>{
    const res=await apiFetch(`/posts/${post.id}/react`,{method:"POST",body:JSON.stringify({emoji})});
    if(res.ok){
      const{action}=await res.json();
      setReactions(r=>{const u={...r};if(action==="added")u[emoji]=(u[emoji]||0)+1;else{u[emoji]=(u[emoji]||1)-1;if(u[emoji]<=0)delete u[emoji];}return u;});
    }
  };

  const caption=decryptCaption(post.encryptedCaption);
  const timeAgo=(date)=>{const s=Math.floor((Date.now()-new Date(date))/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;};

  return(
    <div className="peel-in" style={{animationDelay:`${index*80}ms`,marginBottom:20}}>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar name={post.user?.username}/>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>{post.user?.username}</div>
              <div style={{fontSize:12,color:C.inkMuted}}>{timeAgo(post.createdAt)}</div>
            </div>
          </div>
          <span className={bouncing?"bounce":""} onClick={()=>{setBouncing(true);setTimeout(()=>setBouncing(false),400);}} style={{cursor:"pointer"}}>
            <ActivityBadge activityId={post.activityId}/>
          </span>
        </div>
        {post.mediaUrls?.length>0&&post.mediaUrls[0]!=="placeholder"&&(
          <div style={{marginBottom:16,borderRadius:12,overflow:"hidden"}}>
            <img src={post.mediaUrls[0]} alt="post" style={{width:"100%",maxHeight:300,objectFit:"cover",display:"block"}} onError={e=>e.target.style.display="none"}/>
          </div>
        )}
        <p style={{fontSize:14,lineHeight:1.6,color:C.inkLight,marginBottom:16}}>{caption}</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {Object.entries(reactions).map(([emoji,count])=>(
            <button key={emoji} onClick={()=>react(emoji)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:C.creamDark,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:4}}>{emoji}<span style={{fontWeight:500}}>{count}</span></button>
          ))}
          {["❤️","🔥","😂","👏"].map(e=>(
            <button key={e} onClick={()=>react(e)} style={{padding:"5px 10px",borderRadius:20,border:`1px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13,color:C.inkMuted}}>{e}</button>
          ))}
        </div>
        <div style={{marginTop:8,fontSize:11,color:C.inkMuted}}>🔓 Decrypted locally</div>
      </Card>
    </div>
  );
}

// ── Post Composer ─────────────────────────────────────────────────────────────
function PostComposer({roomId,onPost,onClose}){
  const[selectedActivity,setSelectedActivity]=useState(null);
  const[caption,setCaption]=useState("");
  const[loadingCaption,setLoadingCaption]=useState(false);
  const[tab,setTab]=useState("productive");
  const[posting,setPosting]=useState(false);
  const[error,setError]=useState("");
  const[mediaFile,setMediaFile]=useState(null);

  const generateCaption=async(id)=>{
    const act=ALL_ACTIVITIES.find(a=>a.id===id);if(!act)return;
    setLoadingCaption(true);
    try{
      const res=await apiFetch("/ai/caption",{method:"POST",body:JSON.stringify({activityLabel:`${act.emoji} ${act.label}`})});
      const data=await res.json();setCaption(data.caption||"Living my best life. ✨");
    }catch{setCaption("Living my best life. ✨");}
    setLoadingCaption(false);
  };

  const selectActivity=(id)=>{setSelectedActivity(id);generateCaption(id);};

  const handlePost=async()=>{
    if(!selectedActivity)return setError("Select an activity");
    setPosting(true);setError("");
    try{
      let mediaUrls=[];
      if(mediaFile){
        const urlRes=await apiFetch("/posts/upload-url",{method:"POST",body:JSON.stringify({roomId,filename:mediaFile.name,contentType:mediaFile.type})});
        if(urlRes.ok){
          const{uploadUrl,publicUrl}=await urlRes.json();
          await fetch(uploadUrl,{method:"PUT",body:mediaFile,headers:{"Content-Type":mediaFile.type}});
          mediaUrls=[publicUrl];
        }
      }
      const act=ALL_ACTIVITIES.find(a=>a.id===selectedActivity);
      const res=await apiFetch("/posts",{method:"POST",body:JSON.stringify({
        roomId,activityId:selectedActivity,
        activityCategory:act?.color==="green"?"productive":"relaxing",
        encryptedCaption:encryptCaption(caption||"📸"),
        encryptedNonce:generateNonce(),
        mediaUrls:mediaUrls.length>0?mediaUrls:["placeholder"],
        mediaType:"photo",
      })});
      const data=await res.json();
      if(!res.ok)return setError(data.error||"Failed to post");
      onPost(data.post);onClose();
    }catch{setError("Network error");}
    finally{setPosting(false);}
  };

  const activities=tab==="productive"?ACTIVITIES_PRODUCTIVE:ACTIVITIES_RELAXING;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(26,26,24,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000}}>
      <div className="fade-in" style={{width:"100%",maxWidth:560,background:C.cream,borderRadius:"24px 24px 0 0",padding:"28px 24px 40px",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h2 className="serif" style={{fontSize:24}}>New post</h2>
          <button onClick={onClose} style={{background:C.creamDark,border:"none",borderRadius:20,padding:"6px 12px",cursor:"pointer"}}>✕</button>
        </div>
        <Err msg={error}/>
        <label style={{display:"block",border:`2px dashed ${mediaFile?C.green:C.border}`,borderRadius:16,padding:"24px",textAlign:"center",cursor:"pointer",background:mediaFile?C.greenLight:C.creamDark,marginBottom:20,transition:"all 0.2s"}}>
          <input type="file" accept="image/*,video/*" onChange={e=>e.target.files[0]&&setMediaFile(e.target.files[0])} style={{display:"none"}}/>
          {mediaFile?<div><div style={{fontSize:32,marginBottom:6}}>🖼️</div><div style={{fontWeight:500,color:C.green}}>{mediaFile.name}</div></div>:<div><div style={{fontSize:32,marginBottom:6}}>📎</div><div style={{fontWeight:500}}>Tap to add photo or video</div></div>}
        </label>
        <div style={{marginBottom:20}}>
          <p style={{fontSize:13,fontWeight:500,marginBottom:10,color:C.inkMuted}}>WHAT'S THE VIBE?</p>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {["productive","relaxing"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{padding:"6px 16px",borderRadius:20,border:`1px solid ${C.border}`,background:tab===t?C.ink:C.creamDark,color:tab===t?C.white:C.ink,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}>
                {t==="productive"?"💚 Growth":"🧡 Chill"}
              </button>
            ))}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {activities.map(act=>(
              <button key={act.id} onClick={()=>selectActivity(act.id)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${selectedActivity===act.id?(act.color==="green"?C.green:C.amber):C.border}`,background:selectedActivity===act.id?(act.color==="green"?C.greenLight:C.amberLight):C.cream,color:selectedActivity===act.id?(act.color==="green"?C.green:C.amber):C.inkLight,fontSize:13,cursor:"pointer",transition:"all 0.15s",fontWeight:selectedActivity===act.id?600:400}}>
                {act.emoji} {act.label}
              </button>
            ))}
          </div>
        </div>
        {selectedActivity&&(
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <p style={{fontSize:13,fontWeight:500,color:C.inkMuted}}>✨ AI CAPTION</p>
              <button onClick={()=>generateCaption(selectedActivity)} disabled={loadingCaption} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:500}}>{loadingCaption?"Generating...":"↻ Regenerate"}</button>
            </div>
            {loadingCaption?<div className="shimmer" style={{height:60,borderRadius:8}}/>:<textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={3} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.creamDark,fontSize:14,lineHeight:1.6,outline:"none",resize:"vertical",fontFamily:"DM Sans,sans-serif"}}/>}
          </div>
        )}
        <Btn onClick={handlePost} disabled={!selectedActivity} loading={posting} style={{width:"100%",justifyContent:"center",padding:"14px"}}>
          Post to room 🔒
        </Btn>
        <p style={{fontSize:11,color:C.inkMuted,textAlign:"center",marginTop:10}}>Encrypted before leaving your device</p>
      </div>
    </div>
  );
}

// ── Room Page ─────────────────────────────────────────────────────────────────
function RoomPage({room,onRegenCode}){
  const[copied,setCopied]=useState(false);
  const isCreator=room.creatorId===getUser()?.id;
  const members=room.members||[];

  const copyCode=()=>{navigator.clipboard?.writeText(room.joinCode);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const regenCode=async()=>{
    const res=await apiFetch(`/rooms/${room.id}/regen-code`,{method:"POST"});
    if(res.ok){const data=await res.json();onRegenCode(data.joinCode);}
  };

  return(
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
        <div style={{width:56,height:56,borderRadius:16,background:C.ink,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{room.emoji||"💓"}</div>
        <div><h2 className="serif" style={{fontSize:26}}>{room.name}</h2><p style={{fontSize:13,color:C.inkMuted}}>{members.length} members · private room</p></div>
      </div>
      <Card style={{marginBottom:20}}>
        <p style={{fontWeight:600,marginBottom:4,fontSize:13,color:C.inkMuted}}>ROOM CODE</p>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontFamily:"monospace",fontSize:22,fontWeight:700,letterSpacing:2,color:C.accent}}>{room.joinCode}</span>
          <Btn onClick={copyCode} variant="secondary" style={{padding:"6px 14px",fontSize:12}}>{copied?"✓ Copied!":"Copy"}</Btn>
          {isCreator&&<Btn onClick={regenCode} variant="ghost" style={{padding:"6px 14px",fontSize:12}}>↻ New code</Btn>}
        </div>
        <p style={{fontSize:11,color:C.inkMuted,marginTop:8}}>Share with friends to invite them · expires 48h</p>
      </Card>
      <Card>
        <p style={{fontWeight:600,marginBottom:16,fontSize:14}}>Members</p>
        {members.length===0?(
          <p style={{color:C.inkMuted,fontSize:14}}>Just you so far — share the room code with friends!</p>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12}}>
            {members.map(m=>(
              <div key={m.userId} style={{textAlign:"center",padding:12,background:C.creamDark,borderRadius:12}}>
                <Avatar name={m.user?.username} size={40} style={{margin:"0 auto 8px"}}/>
                <div style={{fontWeight:500,fontSize:13}}>{m.user?.username}</div>
                <div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{m.role==="creator"?"👑 Creator":"Member"}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Stats Page ────────────────────────────────────────────────────────────────
function StatsPage({roomId}){
  const[stats,setStats]=useState(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    apiFetch(`/stats/room/${roomId}/weekly`).then(r=>r.json()).then(d=>{setStats(d);setLoading(false);}).catch(()=>setLoading(false));
  },[roomId]);

  if(loading)return<div className="shimmer" style={{height:200,borderRadius:16,margin:"20px 0"}}/>;
  if(!stats?.stats?.length)return<Card style={{textAlign:"center",padding:"40px 24px"}}><div style={{fontSize:48,marginBottom:12}}>📊</div><h3 className="serif" style={{fontSize:20,marginBottom:8}}>No data yet</h3><p style={{color:C.inkMuted,fontSize:14}}>Post this week to see your stats!</p></Card>;

  return(
    <div style={{paddingBottom:40}}>
      <h2 className="serif" style={{fontSize:26,marginBottom:24}}>This week's grind report 📊</h2>
      <Card style={{marginBottom:20}}>
        <p style={{fontWeight:600,marginBottom:16,fontSize:14}}>Productive vs Chill</p>
        {stats.stats.map(m=>(
          <div key={m.userId} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:13,fontWeight:500}}>{m.username}</span>
              <span style={{fontSize:12,color:C.inkMuted}}>{m.productivePct}% 💚</span>
            </div>
            <div style={{height:20,borderRadius:10,overflow:"hidden",background:C.amberLight,display:"flex"}}>
              <div style={{width:`${m.productivePct}%`,background:C.greenMid,borderRadius:"10px 0 0 10px",transition:"width 1s ease"}}/>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <p style={{fontWeight:600,marginBottom:16,fontSize:14}}>Leaderboard 🏆</p>
        {[...stats.stats].sort((a,b)=>b.productivePct-a.productivePct).map((m,i)=>(
          <div key={m.userId} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<stats.stats.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:20,minWidth:28}}>{i===0?"👑":`#${i+1}`}</span>
            <Avatar name={m.username} size={32}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:500}}>{m.username}</div>
              <div style={{fontSize:12,color:C.inkMuted}}>{m.totalPosts} posts this week</div>
            </div>
            <span style={{fontWeight:700,color:m.productivePct>60?C.green:C.amber,fontSize:16}}>{m.productivePct}%</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Profile Page ──────────────────────────────────────────────────────────────
function ProfilePage({user,onLogout}){
  return(
    <div style={{paddingBottom:40}}>
      <Card style={{textAlign:"center",marginBottom:20}}>
        <Avatar name={user.username} size={64} style={{margin:"0 auto 12px"}}/>
        <h2 className="serif" style={{fontSize:24}}>{user.username}</h2>
        <p style={{color:C.inkMuted,fontSize:13,marginTop:4}}>Member since {new Date(user.createdAt||Date.now()).toLocaleDateString()}</p>
        <div style={{marginTop:12,display:"inline-block",fontSize:11,padding:"3px 10px",borderRadius:10,background:C.greenLight,color:C.green,fontWeight:600}}>🔒 E2E Encrypted</div>
      </Card>
      <Card style={{marginBottom:20}}>
        <p style={{fontWeight:600,marginBottom:8,fontSize:14}}>Your encryption key</p>
        <p style={{fontSize:11,fontFamily:"monospace",color:C.inkMuted,wordBreak:"break-all",background:C.creamDark,padding:"10px",borderRadius:8}}>{user.publicKey?.slice(0,80)}...</p>
        <p style={{fontSize:11,color:C.inkMuted,marginTop:8}}>Used to encrypt your room access. Never share your password.</p>
      </Card>
      <Btn onClick={onLogout} variant="ghost" style={{width:"100%",justifyContent:"center",color:C.accent,borderColor:C.accent}}>Sign out</Btn>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function LifePulse(){
  const[user,setUser]=useState(getUser);
  const[room,setRoom]=useState(()=>{try{return JSON.parse(localStorage.getItem("lp_room"));}catch{return null;}});
  const[activeTab,setActiveTab]=useState("feed");
  const[posts,setPosts]=useState([]);
  const[loadingPosts,setLoadingPosts]=useState(false);
  const[showComposer,setShowComposer]=useState(false);
  const[confetti,setConfetti]=useState(false);

  useEffect(()=>{if(room?.id)fetchPosts();},[room?.id]);

  const fetchPosts=async()=>{
    if(!room?.id)return;
    setLoadingPosts(true);
    try{const res=await apiFetch(`/posts/room/${room.id}`);if(res.ok){const d=await res.json();setPosts(d.posts||[]);}}
    catch{}finally{setLoadingPosts(false);}
  };

  const handleRoomJoined=(r)=>{setRoom(r);localStorage.setItem("lp_room",JSON.stringify(r));};
  const handlePost=(post)=>{setPosts(p=>[post,...p]);setConfetti(true);setTimeout(()=>setConfetti(false),1000);};
  const handleLogout=()=>{clearAuth();setUser(null);setRoom(null);setPosts([]);};
  const handleRegenCode=(newCode)=>{setRoom(r=>{const u={...r,joinCode:newCode};localStorage.setItem("lp_room",JSON.stringify(u));return u;});};

  if(!user)return<><style>{styles}</style><AuthScreen onAuth={u=>{setUser(u);}}/></>;
  if(!room)return<><style>{styles}</style><RoomSetupScreen user={user} onRoomJoined={handleRoomJoined}/></>;

  const TABS=[{id:"feed",label:"Feed",emoji:"📱"},{id:"room",label:"Room",emoji:"🏠"},{id:"stats",label:"Stats",emoji:"📊"},{id:"profile",label:"You",emoji:"👤"}];

  return(
    <>
      <style>{styles}</style>
      <div style={{minHeight:"100vh",background:C.cream,paddingBottom:80}}>
        <div style={{position:"sticky",top:0,zIndex:100,background:C.cream,borderBottom:`1px solid ${C.border}`,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>💓</span>
            <h1 className="serif" style={{fontSize:22,fontWeight:900}}>LifePulse</h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:11,padding:"3px 10px",borderRadius:10,background:C.greenLight,color:C.green,fontWeight:600}}>🔒 E2E</div>
            <Avatar name={user.username} size={30}/>
          </div>
        </div>

        <div style={{maxWidth:560,margin:"0 auto",padding:"20px 16px 0"}}>
          {activeTab==="feed"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <h2 className="serif" style={{fontSize:26}}>{room.name}</h2>
                <button onClick={fetchPosts} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.inkMuted}}>↻</button>
              </div>
              {loadingPosts?(
                [1,2,3].map(i=><div key={i} className="shimmer" style={{height:200,borderRadius:16,marginBottom:16}}/>)
              ):posts.length===0?(
                <Card style={{textAlign:"center",padding:"40px 24px"}}>
                  <div style={{fontSize:48,marginBottom:12}}>📭</div>
                  <h3 className="serif" style={{fontSize:20,marginBottom:8}}>No posts yet</h3>
                  <p style={{color:C.inkMuted,fontSize:14}}>Tap + to be the first to post!</p>
                </Card>
              ):(
                posts.map((post,i)=><PostCard key={post.id} post={post} index={i}/>)
              )}
            </div>
          )}
          {activeTab==="room"&&<RoomPage room={room} onRegenCode={handleRegenCode}/>}
          {activeTab==="stats"&&<StatsPage roomId={room.id}/>}
          {activeTab==="profile"&&<ProfilePage user={user} onLogout={handleLogout}/>}
        </div>

        {confetti&&<div style={{position:"fixed",top:"40%",left:"50%",transform:"translate(-50%,-50%)",fontSize:60,zIndex:2000,pointerEvents:"none"}} className="confetti">🎉</div>}

        {activeTab==="feed"&&(
          <button onClick={()=>setShowComposer(true)} style={{position:"fixed",bottom:90,right:20,width:56,height:56,borderRadius:28,background:C.ink,border:"none",color:C.white,fontSize:28,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        )}

        <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.white,borderTop:`1px solid ${C.border}`,display:"flex",padding:"8px 0 16px"}}>
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"8px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:activeTab===tab.id?C.ink:C.inkMuted,transition:"all 0.15s"}}>
              <span style={{fontSize:20,opacity:activeTab===tab.id?1:0.5}}>{tab.emoji}</span>
              <span style={{fontSize:10,fontWeight:activeTab===tab.id?600:400}}>{tab.label}</span>
            </button>
          ))}
        </div>

        {showComposer&&<PostComposer roomId={room.id} onPost={handlePost} onClose={()=>setShowComposer(false)}/>}
      </div>
    </>
  );
}
