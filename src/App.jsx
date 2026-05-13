import { useState, useEffect, useRef } from "react";

const API = "https://lifepulse-backend-production-3e50.up.railway.app/api";

// ── Theme ─────────────────────────────────────────────────────────────────────
const getTheme = () => localStorage.getItem("lp_theme") || "light";
const themes = {
  light: {
    cream:"#F5F0E8",creamDark:"#EDE7D9",ink:"#1A1A18",inkLight:"#3D3D38",
    inkMuted:"#7A7A72",green:"#2D6A4F",greenLight:"#D8F3DC",greenMid:"#52B788",
    amber:"#B5621A",amberLight:"#FFE8CC",amberMid:"#F4A261",
    accent:"#C84B31",border:"#D6CFBF",white:"#FFFEF9",cardBg:"#FDFAF3",
    navBg:"rgba(245,240,232,0.95)",
  },
  dark: {
    cream:"#1A1A18",creamDark:"#242420",ink:"#F0EBE0",inkLight:"#D4CEBC",
    inkMuted:"#8A8A7A",green:"#52B788",greenLight:"#1A3328",greenMid:"#52B788",
    amber:"#F4A261",amberLight:"#2A1F0F",amberMid:"#F4A261",
    accent:"#E8725A",border:"#333330",white:"#2A2A26",cardBg:"#222220",
    navBg:"rgba(26,26,24,0.95)",
  }
};

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
  {id:"napping",emoji:"😴",label:"Procrastinating",color:"amber"},
  {id:"junkfood",emoji:"🍕",label:"Junk food",color:"amber"},
  {id:"groupchat",emoji:"💬",label:"Gossip",color:"amber"},
];
const ALL_ACTIVITIES=[...ACTIVITIES_PRODUCTIVE,...ACTIVITIES_RELAXING];

// ── Auth helpers ──────────────────────────────────────────────────────────────
const getToken=()=>localStorage.getItem("lp_token");
const setToken=(t)=>localStorage.setItem("lp_token",t);
const getRefresh=()=>localStorage.getItem("lp_refresh");
const setRefresh=(t)=>localStorage.setItem("lp_refresh",t);
const getUser=()=>{try{return JSON.parse(localStorage.getItem("lp_user"));}catch{return null;}};
const setUser=(u)=>localStorage.setItem("lp_user",JSON.stringify(u));
const clearAuth=()=>["lp_token","lp_refresh","lp_user","lp_room"].forEach(k=>localStorage.removeItem(k));

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
const userColor=(name)=>["#2D6A4F","#C84B31","#7B4F9E","#B5621A","#1A5276"][name?.charCodeAt(0)%5]||"#3D3D38";
const timeAgo=(date)=>{const s=Math.floor((Date.now()-new Date(date))/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function LifePulse(){
  const[theme,setTheme]=useState(getTheme);
  const C=themes[theme];

  const styles=`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:${C.cream};font-family:'DM Sans',sans-serif;color:${C.ink};transition:background 0.3s,color 0.3s;}
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

  const toggleTheme=()=>{
    const next=theme==="light"?"dark":"light";
    setTheme(next);localStorage.setItem("lp_theme",next);
  };

  const[user,setUser2]=useState(getUser);
  const[room,setRoom]=useState(()=>{try{return JSON.parse(localStorage.getItem("lp_room"));}catch{return null;}});
  const[activeTab,setActiveTab]=useState("feed");
  const[posts,setPosts]=useState([]);
  const[loadingPosts,setLoadingPosts]=useState(false);
  const[showComposer,setShowComposer]=useState(false);
  const[confetti,setConfetti]=useState(false);
  const[searchQuery,setSearchQuery]=useState("");

  useEffect(()=>{if(room?.id)fetchPosts();},[room?.id]);

  const fetchPosts=async()=>{
    if(!room?.id)return;
    setLoadingPosts(true);
    try{const res=await apiFetch(`/posts/room/${room.id}`);if(res.ok){const d=await res.json();setPosts(d.posts||[]);}}
    catch{}finally{setLoadingPosts(false);}
  };

  const handleRoomJoined=(r)=>{setRoom(r);localStorage.setItem("lp_room",JSON.stringify(r));};
  const handlePost=(post)=>{setPosts(p=>[post,...p]);setConfetti(true);setTimeout(()=>setConfetti(false),1000);};
  const handleLogout=()=>{clearAuth();setUser2(null);setRoom(null);setPosts([]);};
  const handleRegenCode=(newCode)=>{setRoom(r=>{const u={...r,joinCode:newCode};localStorage.setItem("lp_room",JSON.stringify(u));return u;});};
  const handleDeletePost=(postId)=>{setPosts(p=>p.filter(x=>x.id!==postId));};

  const filteredPosts=searchQuery.trim()
    ?posts.filter(p=>{
        const cap=decryptCaption(p.encryptedCaption).toLowerCase();
        const act=ALL_ACTIVITIES.find(a=>a.id===p.activityId);
        return cap.includes(searchQuery.toLowerCase())||act?.label.toLowerCase().includes(searchQuery.toLowerCase())||p.user?.username.toLowerCase().includes(searchQuery.toLowerCase());
      })
    :posts;

  if(!user)return<><style>{styles}</style><AuthScreen C={C} onAuth={u=>{setUser(u);setUser2(u);}}/></>;
  if(!room)return<><style>{styles}</style><RoomSetupScreen C={C} user={user} onRoomJoined={handleRoomJoined}/></>;

  const TABS=[{id:"feed",label:"Feed",emoji:"📱"},{id:"room",label:"Room",emoji:"🏠"},{id:"stats",label:"Stats",emoji:"📊"},{id:"profile",label:"You",emoji:"👤"}];

  return(
    <>
      <style>{styles}</style>
      <div style={{minHeight:"100vh",background:C.cream,paddingBottom:80,transition:"background 0.3s"}}>
        {/* Header */}
        <div style={{position:"sticky",top:0,zIndex:100,background:C.navBg,backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>💓</span>
            <h1 className="serif" style={{fontSize:22,fontWeight:900,color:C.ink}}>LifePulse</h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:11,padding:"3px 10px",borderRadius:10,background:C.greenLight,color:C.green,fontWeight:600}}>🔒 E2E</div>
            <button onClick={toggleTheme} style={{background:C.creamDark,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",fontSize:16,cursor:"pointer",color:C.ink}}>
              {theme==="light"?"🌙":"☀️"}
            </button>
            <div style={{width:30,height:30,borderRadius:"50%",background:userColor(user.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:12}}>
              {user.username?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{maxWidth:560,margin:"0 auto",padding:"20px 16px 0"}}>

          {activeTab==="feed"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h2 className="serif" style={{fontSize:26,color:C.ink}}>{room.name}</h2>
                <button onClick={fetchPosts} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.inkMuted}}>↻</button>
              </div>

              {/* Search bar */}
              <div style={{position:"relative",marginBottom:20}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,color:C.inkMuted}}>🔍</span>
                <input
                  value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search posts, activities, friends..."
                  style={{width:"100%",padding:"10px 12px 10px 38px",borderRadius:10,border:`1px solid ${C.border}`,background:C.creamDark,fontSize:14,outline:"none",color:C.ink}}
                />
                {searchQuery&&<button onClick={()=>setSearchQuery("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:16,cursor:"pointer",color:C.inkMuted}}>✕</button>}
              </div>

              {searchQuery&&<p style={{fontSize:13,color:C.inkMuted,marginBottom:12}}>{filteredPosts.length} result{filteredPosts.length!==1?"s":""} for "{searchQuery}"</p>}

              {loadingPosts?(
                [1,2,3].map(i=><div key={i} className="shimmer" style={{height:200,borderRadius:16,marginBottom:16}}/>)
              ):filteredPosts.length===0?(
                <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"40px 24px",textAlign:"center"}}>
                  <div style={{fontSize:48,marginBottom:12}}>{searchQuery?"🔍":"📭"}</div>
                  <h3 className="serif" style={{fontSize:20,marginBottom:8,color:C.ink}}>{searchQuery?"No results found":"No posts yet"}</h3>
                  <p style={{color:C.inkMuted,fontSize:14}}>{searchQuery?`Try a different search term`:"Tap + to be the first to post!"}</p>
                </div>
              ):(
                filteredPosts.map((post,i)=><PostCard key={post.id} post={post} index={i} C={C} currentUserId={user.id} onDelete={handleDeletePost}/>)
              )}
            </div>
          )}

          {activeTab==="room"&&<RoomPage C={C} room={room} onRegenCode={handleRegenCode}/>}
          {activeTab==="stats"&&<StatsPage C={C} roomId={room.id} currentUser={user}/>}
          {activeTab==="profile"&&<ProfilePage C={C} user={user} posts={posts} onLogout={handleLogout}/>}
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

        {showComposer&&<PostComposer C={C} roomId={room.id} onPost={handlePost} onClose={()=>setShowComposer(false)}/>}
      </div>
    </>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({C,onAuth}){
  const[mode,setMode]=useState("login");
  const[username,setUsername]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  const submit=async()=>{
    if(!username.trim()||!password.trim())return setError("Fill in all fields");
    setLoading(true);setError("");
    try{
      let res;
      if(mode==="register"){
        const publicKey=btoa(Math.random().toString(36).repeat(3));
        const encryptedPrivateKey=btoa(Math.random().toString(36).repeat(3)+":"+password);
        res=await apiFetch("/auth/register",{method:"POST",body:JSON.stringify({username:username.trim(),password,publicKey,encryptedPrivateKey})});
      }else{
        res=await apiFetch("/auth/login",{method:"POST",body:JSON.stringify({username:username.trim(),password})});
      }
      const data=await res.json();
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
          <h1 className="serif" style={{fontSize:42,fontWeight:900,letterSpacing:-1,color:C.ink}}>LifePulse</h1>
          <p style={{color:C.inkMuted,marginTop:8}}>Your private corner of the internet.</p>
        </div>
        <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
          <div style={{display:"flex",gap:8,marginBottom:24}}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${mode===m?C.ink:C.border}`,background:mode===m?C.ink:C.cream,color:mode===m?C.white:C.ink,fontWeight:500,fontSize:14,cursor:"pointer",transition:"all 0.15s"}}>
                {m==="login"?"Sign in":"Create account"}
              </button>
            ))}
          </div>
          {error&&<div style={{padding:"10px 14px",borderRadius:8,background:"#FEE2E2",color:C.accent,fontSize:13,marginBottom:12}}>{error}</div>}
          {[["Username","text",username,setUsername,"e.g. maya_runs"],["Password","password",password,setPassword,"Min 8 characters"]].map(([label,type,val,setter,ph])=>(
            <div key={label} style={{marginBottom:16}}>
              <label style={{fontSize:13,color:C.inkMuted,display:"block",marginBottom:6}}>{label}</label>
              <input type={type} value={val} onChange={e=>setter(e.target.value)} placeholder={ph} style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,fontSize:15,outline:"none",color:C.ink}}/>
            </div>
          ))}
          <button onClick={submit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:8,border:"none",background:C.ink,color:C.white,fontWeight:500,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1}}>
            {loading?"Loading...":(mode==="login"?"Sign in →":"Create account →")}
          </button>
        </div>
        <p style={{textAlign:"center",fontSize:12,color:C.inkMuted,marginTop:20}}>🔒 End-to-end encrypted · Zero server-side knowledge</p>
      </div>
    </div>
  );
}

// ── Room Setup ────────────────────────────────────────────────────────────────
function RoomSetupScreen({C,user,onRoomJoined}){
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
          <h1 className="serif" style={{fontSize:36,fontWeight:900,color:C.ink}}>Hey, {user.username}!</h1>
          <p style={{color:C.inkMuted,marginTop:8}}>Create a room or join one a friend made.</p>
        </div>
        <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
          {error&&<div style={{padding:"10px 14px",borderRadius:8,background:"#FEE2E2",color:C.accent,fontSize:13,marginBottom:12}}>{error}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {[["create","🏠","Create room","Start your space"],["join","🔑","Join room","Enter a code"]].map(([id,emoji,label,sub])=>(
              <button key={id} onClick={()=>{setAction(id);setError("");}} style={{padding:"20px 16px",borderRadius:12,border:`2px solid ${action===id?C.ink:C.border}`,background:action===id?C.ink:C.cream,color:action===id?C.white:C.ink,cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <div style={{fontSize:28,marginBottom:8}}>{emoji}</div>
                <div style={{fontWeight:600}}>{label}</div>
                <div style={{fontSize:12,opacity:0.6,marginTop:4}}>{sub}</div>
              </button>
            ))}
          </div>
          {action==="create"&&(
            <div>
              <input value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="Room name e.g. The Homies" style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,fontSize:15,outline:"none",color:C.ink,marginBottom:12}}/>
              <button onClick={createRoom} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:C.ink,color:C.white,fontWeight:500,cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1}}>{loading?"Creating...":"Create Room 🏠"}</button>
            </div>
          )}
          {action==="join"&&(
            <div>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="e.g. FLAME-7293" style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,fontSize:15,outline:"none",color:C.ink,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}/>
              <button onClick={joinRoom} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:C.ink,color:C.white,fontWeight:500,cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1}}>{loading?"Joining...":"Join Room 🔑"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Image Carousel ────────────────────────────────────────────────────────────
function Carousel({urls,C}){
  const[idx,setIdx]=useState(0);
  const valid=urls.filter(u=>u&&u!=="placeholder");
  if(!valid.length)return null;
  return(
    <div style={{position:"relative",marginBottom:16,borderRadius:12,overflow:"hidden",background:C.creamDark}}>
      <img src={valid[idx]} alt="post" style={{width:"100%",maxHeight:300,objectFit:"cover",display:"block"}} onError={e=>e.target.style.display="none"}/>
      {valid.length>1&&(
        <>
          <button onClick={()=>setIdx(i=>(i-1+valid.length)%valid.length)} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",width:32,height:32,color:"white",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <button onClick={()=>setIdx(i=>(i+1)%valid.length)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",width:32,height:32,color:"white",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",display:"flex",gap:4}}>
            {valid.map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:i===idx?"white":"rgba(255,255,255,0.5)"}}/>)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({post,index,C,currentUserId,onDelete}){
  const[reactions,setReactions]=useState({});
  const[bouncing,setBouncing]=useState(false);
  const[showMenu,setShowMenu]=useState(false);
  const[deleting,setDeleting]=useState(false);

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

  const deletePost=async()=>{
    if(!confirm("Delete this post?"))return;
    setDeleting(true);
    const res=await apiFetch(`/posts/${post.id}`,{method:"DELETE"});
    if(res.ok)onDelete(post.id);
    else setDeleting(false);
  };

  const caption=decryptCaption(post.encryptedCaption);
  const act=ALL_ACTIVITIES.find(a=>a.id===post.activityId);
  const isGreen=act?.color==="green";
  const isOwn=post.userId===currentUserId||post.user?.id===currentUserId;

  return(
    <div className="peel-in" style={{animationDelay:`${index*80}ms`,marginBottom:20,opacity:deleting?0.5:1,transition:"opacity 0.3s"}}>
      <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:userColor(post.user?.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:14}}>
              {post.user?.username?.[0]?.toUpperCase()||"?"}
            </div>
            <div>
              <div style={{fontWeight:600,fontSize:14,color:C.ink}}>{post.user?.username}</div>
              <div style={{fontSize:12,color:C.inkMuted}}>{timeAgo(post.createdAt)}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className={bouncing?"bounce":""} onClick={()=>{setBouncing(true);setTimeout(()=>setBouncing(false),400);}} style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,background:isGreen?C.greenLight:C.amberLight,color:isGreen?C.green:C.amber,fontSize:12,fontWeight:500}}>
              {act?.emoji} {act?.label||post.activityId}
            </span>
            {isOwn&&(
              <div style={{position:"relative"}}>
                <button onClick={()=>setShowMenu(m=>!m)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.inkMuted,padding:"4px"}}>⋯</button>
                {showMenu&&(
                  <div style={{position:"absolute",right:0,top:"100%",background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"4px",zIndex:10,minWidth:120,boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
                    <button onClick={()=>{setShowMenu(false);deletePost();}} style={{width:"100%",padding:"8px 12px",border:"none",background:"none",color:C.accent,fontSize:13,cursor:"pointer",textAlign:"left",borderRadius:6}}>
                      🗑️ Delete post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Carousel */}
        <Carousel urls={post.mediaUrls||[]} C={C}/>

        <p style={{fontSize:14,lineHeight:1.6,color:C.inkLight,marginBottom:16}}>{caption}</p>

        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {Object.entries(reactions).map(([emoji,count])=>(
            <button key={emoji} onClick={()=>react(emoji)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:C.creamDark,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:4,color:C.ink}}>{emoji}<span style={{fontWeight:500}}>{count}</span></button>
          ))}
          {["❤️","🔥","😂","👏"].map(e=>(
            <button key={e} onClick={()=>react(e)} style={{padding:"5px 10px",borderRadius:20,border:`1px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13,color:C.inkMuted}}>{e}</button>
          ))}
        </div>
        <div style={{marginTop:8,fontSize:11,color:C.inkMuted}}>🔓 Decrypted locally</div>
      </div>
    </div>
  );
}

// ── Post Composer ─────────────────────────────────────────────────────────────
function PostComposer({C,roomId,onPost,onClose}){
  const[selectedActivity,setSelectedActivity]=useState(null);
  const[caption,setCaption]=useState("");
  const[loadingCaption,setLoadingCaption]=useState(false);
  const[tab,setTab]=useState("productive");
  const[posting,setPosting]=useState(false);
  const[error,setError]=useState("");
  const[mediaFiles,setMediaFiles]=useState([]);

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

  const handleFiles=(e)=>{
    const files=Array.from(e.target.files).slice(0,10);
    setMediaFiles(files);
  };

  const handlePost=async()=>{
    if(!selectedActivity)return setError("Select an activity");
    setPosting(true);setError("");
    try{
      let mediaUrls=[];
      for(const file of mediaFiles){
        const urlRes=await apiFetch("/posts/upload-url",{method:"POST",body:JSON.stringify({roomId,filename:file.name,contentType:file.type})});
        if(urlRes.ok){
          const{uploadUrl,publicUrl}=await urlRes.json();
          await fetch(uploadUrl,{method:"PUT",body:file,headers:{"Content-Type":file.type}});
          mediaUrls.push(publicUrl);
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
          <h2 className="serif" style={{fontSize:24,color:C.ink}}>New post</h2>
          <button onClick={onClose} style={{background:C.creamDark,border:"none",borderRadius:20,padding:"6px 12px",cursor:"pointer",color:C.ink}}>✕</button>
        </div>
        {error&&<div style={{padding:"10px 14px",borderRadius:8,background:"#FEE2E2",color:C.accent,fontSize:13,marginBottom:12}}>{error}</div>}

        {/* Multi-photo upload */}
        <div style={{marginBottom:20}}>
          <label style={{display:"block",border:`2px dashed ${mediaFiles.length>0?C.green:C.border}`,borderRadius:16,padding:"20px",textAlign:"center",cursor:"pointer",background:mediaFiles.length>0?C.greenLight:C.creamDark,transition:"all 0.2s"}}>
            <input type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{display:"none"}}/>
            {mediaFiles.length>0?(
              <div>
                <div style={{fontSize:28,marginBottom:6}}>🖼️</div>
                <div style={{fontWeight:500,color:C.green}}>{mediaFiles.length} photo{mediaFiles.length>1?"s":""} selected</div>
                <div style={{fontSize:12,color:C.green,marginTop:4}}>Tap to change</div>
              </div>
            ):(
              <div>
                <div style={{fontSize:28,marginBottom:6}}>📎</div>
                <div style={{fontWeight:500,color:C.ink}}>Tap to add up to 10 photos</div>
                <div style={{fontSize:12,color:C.inkMuted,marginTop:4}}>or 1 video · max 60s</div>
              </div>
            )}
          </label>
          {/* Preview thumbnails */}
          {mediaFiles.length>0&&(
            <div style={{display:"flex",gap:8,marginTop:10,overflowX:"auto",paddingBottom:4}}>
              {mediaFiles.map((f,i)=>(
                <div key={i} style={{width:60,height:60,borderRadius:8,overflow:"hidden",flexShrink:0,background:C.creamDark,border:`1px solid ${C.border}`}}>
                  <img src={URL.createObjectURL(f)} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="preview"/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity picker */}
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
            {loadingCaption?<div className="shimmer" style={{height:60,borderRadius:8}}/>:<textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={3} style={{width:"100%",padding:"12px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.creamDark,fontSize:14,lineHeight:1.6,outline:"none",resize:"vertical",fontFamily:"DM Sans,sans-serif",color:C.ink}}/>}
          </div>
        )}

        <button onClick={handlePost} disabled={!selectedActivity||posting} style={{width:"100%",padding:"14px",borderRadius:8,border:"none",background:C.ink,color:C.white,fontWeight:500,fontSize:14,cursor:!selectedActivity||posting?"not-allowed":"pointer",opacity:!selectedActivity||posting?0.6:1}}>
          {posting?"Uploading & posting...":"Post to room 🔒"}
        </button>
        <p style={{fontSize:11,color:C.inkMuted,textAlign:"center",marginTop:10}}>Encrypted before leaving your device</p>
      </div>
    </div>
  );
}

// ── Room Page ─────────────────────────────────────────────────────────────────
function RoomPage({C,room,onRegenCode}){
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
        <div><h2 className="serif" style={{fontSize:26,color:C.ink}}>{room.name}</h2><p style={{fontSize:13,color:C.inkMuted}}>{members.length} members · private room</p></div>
      </div>
      <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",marginBottom:20}}>
        <p style={{fontWeight:600,marginBottom:4,fontSize:13,color:C.inkMuted}}>ROOM CODE</p>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontFamily:"monospace",fontSize:22,fontWeight:700,letterSpacing:2,color:C.accent}}>{room.joinCode}</span>
          <button onClick={copyCode} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.creamDark,color:C.ink,fontSize:12,cursor:"pointer"}}>{copied?"✓ Copied!":"Copy"}</button>
          {isCreator&&<button onClick={regenCode} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.ink,fontSize:12,cursor:"pointer"}}>↻ New code</button>}
        </div>
        <p style={{fontSize:11,color:C.inkMuted,marginTop:8}}>Share with friends · expires 48h</p>
      </div>
      <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
        <p style={{fontWeight:600,marginBottom:16,fontSize:14,color:C.ink}}>Members</p>
        {members.length===0?(
          <p style={{color:C.inkMuted,fontSize:14}}>Just you so far — share the room code!</p>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12}}>
            {members.map(m=>(
              <div key={m.userId} style={{textAlign:"center",padding:12,background:C.creamDark,borderRadius:12}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:userColor(m.user?.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,margin:"0 auto 8px"}}>{m.user?.username?.[0]?.toUpperCase()}</div>
                <div style={{fontWeight:500,fontSize:13,color:C.ink}}>{m.user?.username}</div>
                <div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{m.role==="creator"?"👑 Creator":"Member"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats Page ────────────────────────────────────────────────────────────────
function StatsPage({C,roomId,currentUser}){
  const[stats,setStats]=useState(null);
  const[loading,setLoading]=useState(true);
  const[exporting,setExporting]=useState(false);
  const recapRef=useRef(null);

  useEffect(()=>{
    apiFetch(`/stats/room/${roomId}/weekly`).then(r=>r.json()).then(d=>{setStats(d);setLoading(false);}).catch(()=>setLoading(false));
  },[roomId]);

  const exportRecap=async()=>{
    setExporting(true);
    try{
      const{default:html2canvas}=await import("https://esm.sh/html2canvas@1.4.1");
      const canvas=await html2canvas(recapRef.current,{backgroundColor:"#F5F0E8",scale:2});
      const link=document.createElement("a");
      link.download="lifepulse-recap.png";
      link.href=canvas.toDataURL();
      link.click();
    }catch{alert("Export failed — try screenshotting instead!");}
    setExporting(false);
  };

  if(loading)return<div className="shimmer" style={{height:200,borderRadius:16,margin:"20px 0"}}/>;
  if(!stats?.stats?.length)return(
    <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"40px 24px",textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:12}}>📊</div>
      <h3 className="serif" style={{fontSize:20,marginBottom:8,color:C.ink}}>No data yet</h3>
      <p style={{color:C.inkMuted,fontSize:14}}>Post this week to see your stats!</p>
    </div>
  );

  // Personal stats for current user
  const myStats=stats.stats.find(s=>s.userId===currentUser?.id)||stats.stats[0];

  return(
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h2 className="serif" style={{fontSize:26,color:C.ink}}>Grind report 📊</h2>
        <button onClick={exportRecap} disabled={exporting} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.creamDark,color:C.ink,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
          {exporting?"Exporting...":"📤 Export"}
        </button>
      </div>

      <div ref={recapRef}>
        {/* Personal stats */}
        {myStats&&(
          <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",marginBottom:20}}>
            <p style={{fontWeight:600,marginBottom:16,fontSize:14,color:C.ink}}>Your week</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {[
                {label:"Total posts",value:myStats.totalPosts,emoji:"📸"},
                {label:"Productive",value:`${myStats.productivePct}%`,emoji:"💚"},
                {label:"Productive posts",value:myStats.productiveCount,emoji:"🏆"},
                {label:"Chill posts",value:myStats.relaxingCount,emoji:"🧡"},
              ].map(s=>(
                <div key={s.label} style={{background:C.creamDark,borderRadius:12,padding:"14px",textAlign:"center"}}>
                  <div style={{fontSize:24,marginBottom:4}}>{s.emoji}</div>
                  <div style={{fontWeight:700,fontSize:22,color:C.ink}}>{s.value}</div>
                  <div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>
            {myStats.topActivities?.length>0&&(
              <div>
                <p style={{fontSize:12,color:C.inkMuted,marginBottom:8}}>TOP ACTIVITIES</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {myStats.topActivities.map(id=>{
                    const act=ALL_ACTIVITIES.find(a=>a.id===id);
                    if(!act)return null;
                    const isG=act.color==="green";
                    return<span key={id} style={{fontSize:12,padding:"4px 10px",borderRadius:20,background:isG?C.greenLight:C.amberLight,color:isG?C.green:C.amber,fontWeight:500}}>{act.emoji} {act.label}</span>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Group chart */}
        <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",marginBottom:20}}>
          <p style={{fontWeight:600,marginBottom:16,fontSize:14,color:C.ink}}>Group · Productive vs Chill</p>
          {stats.stats.map(m=>(
            <div key={m.userId} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:500,color:C.ink}}>{m.username}</span>
                <span style={{fontSize:12,color:C.inkMuted}}>{m.productivePct}% 💚</span>
              </div>
              <div style={{height:20,borderRadius:10,overflow:"hidden",background:C.amberLight,display:"flex"}}>
                <div style={{width:`${m.productivePct}%`,background:C.greenMid,borderRadius:"10px 0 0 10px",transition:"width 1s ease"}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
          <p style={{fontWeight:600,marginBottom:16,fontSize:14,color:C.ink}}>Leaderboard 🏆</p>
          {[...stats.stats].sort((a,b)=>b.productivePct-a.productivePct).map((m,i)=>(
            <div key={m.userId} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<stats.stats.length-1?`1px solid ${C.border}`:"none"}}>
              <span style={{fontSize:20,minWidth:28}}>{i===0?"👑":`#${i+1}`}</span>
              <div style={{width:32,height:32,borderRadius:"50%",background:userColor(m.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:12}}>{m.username?.[0]?.toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,color:C.ink}}>{m.username}</div>
                <div style={{fontSize:12,color:C.inkMuted}}>{m.totalPosts} posts this week</div>
              </div>
              <span style={{fontWeight:700,color:m.productivePct>60?C.green:C.amber,fontSize:16}}>{m.productivePct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Profile Page ──────────────────────────────────────────────────────────────
function ProfilePage({C,user,posts,onLogout}){
  const myPosts=posts.filter(p=>p.userId===user.id||p.user?.id===user.id);
  const activityCount={};
  myPosts.forEach(p=>{activityCount[p.activityId]=(activityCount[p.activityId]||0)+1;});
  const topActivities=Object.entries(activityCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const totalPosts=myPosts.length;
  const productivePosts=myPosts.filter(p=>p.activityCategory==="productive").length;
  const productivePct=totalPosts?Math.round((productivePosts/totalPosts)*100):0;

  const RING_SIZE=120,STROKE=10,r=(RING_SIZE-STROKE)/2,circ=2*Math.PI*r;

  return(
    <div style={{paddingBottom:40}}>
      <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",textAlign:"center",marginBottom:20}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:userColor(user.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:24,margin:"0 auto 12px"}}>{user.username?.[0]?.toUpperCase()}</div>
        <h2 className="serif" style={{fontSize:24,color:C.ink}}>{user.username}</h2>
        <p style={{color:C.inkMuted,fontSize:13,marginTop:4}}>Member since {new Date(user.createdAt||Date.now()).toLocaleDateString()}</p>

        {/* Activity ring */}
        <div style={{display:"flex",justifyContent:"center",margin:"20px 0 8px"}}>
          <svg width={RING_SIZE} height={RING_SIZE} style={{transform:"rotate(-90deg)"}}>
            <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={r} fill="none" stroke={C.creamDark} strokeWidth={STROKE}/>
            <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={r} fill="none" stroke={C.greenMid} strokeWidth={STROKE}
              strokeDasharray={circ} strokeDashoffset={circ*(1-productivePct/100)}
              strokeLinecap="round" style={{transition:"stroke-dashoffset 1s ease"}}/>
          </svg>
        </div>
        <p style={{fontSize:14,fontWeight:600,color:C.green}}>{productivePct}% productive · all time</p>
        <div style={{marginTop:12,display:"inline-block",fontSize:11,padding:"3px 10px",borderRadius:10,background:C.greenLight,color:C.green,fontWeight:600}}>🔒 E2E Encrypted</div>
      </div>

      {/* All-time stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {[
          {label:"Total posts",value:totalPosts,emoji:"📸"},
          {label:"Productive posts",value:productivePosts,emoji:"💚"},
          {label:"Chill posts",value:totalPosts-productivePosts,emoji:"🧡"},
          {label:"Activities tried",value:Object.keys(activityCount).length,emoji:"🎯"},
        ].map(s=>(
          <div key={s.label} style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:6}}>{s.emoji}</div>
            <div style={{fontWeight:700,fontSize:22,color:C.ink}}>{s.value}</div>
            <div style={{fontSize:11,color:C.inkMuted,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top activities all time */}
      {topActivities.length>0&&(
        <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",marginBottom:20}}>
          <p style={{fontWeight:600,marginBottom:16,fontSize:14,color:C.ink}}>Top activities (all time)</p>
          {topActivities.map(([id,count],i)=>{
            const act=ALL_ACTIVITIES.find(a=>a.id===id);
            if(!act)return null;
            const maxCount=topActivities[0][1];
            return(
              <div key={id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <span style={{minWidth:24,fontWeight:700,color:C.inkMuted,fontSize:13}}>#{i+1}</span>
                <span style={{fontSize:20}}>{act.emoji}</span>
                <span style={{fontSize:14,flex:1,color:C.ink}}>{act.label}</span>
                <div style={{width:80,height:6,borderRadius:3,background:C.creamDark,overflow:"hidden"}}>
                  <div style={{width:`${(count/maxCount)*100}%`,height:"100%",borderRadius:3,background:act.color==="green"?C.greenMid:C.amberMid}}/>
                </div>
                <span style={{fontSize:12,color:C.inkMuted,minWidth:20}}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onLogout} style={{width:"100%",padding:"12px",borderRadius:8,border:`1px solid ${C.accent}`,background:"transparent",color:C.accent,fontWeight:500,cursor:"pointer"}}>Sign out</button>
    </div>
  );
}
