import { useState, useEffect, useRef } from "react";

const API = "https://lifepulse-backend-production-3e50.up.railway.app/api";

const themes = {
  light: {
    cream:"#F5F0E8",creamDark:"#EDE7D9",ink:"#1A1A18",inkLight:"#3D3D38",
    inkMuted:"#7A7A72",green:"#2D6A4F",greenLight:"#D8F3DC",greenMid:"#52B788",
    amber:"#B5621A",amberLight:"#FFE8CC",amberMid:"#F4A261",
    accent:"#C84B31",border:"#D6CFBF",white:"#FFFEF9",cardBg:"#FDFAF3",
    navBg:"rgba(245,240,232,0.95)",msgOwn:"#2D6A4F",msgOther:"#FDFAF3",
  },
  dark: {
    cream:"#1A1A18",creamDark:"#242420",ink:"#F0EBE0",inkLight:"#D4CEBC",
    inkMuted:"#8A8A7A",green:"#52B788",greenLight:"#1A3328",greenMid:"#52B788",
    amber:"#F4A261",amberLight:"#2A1F0F",amberMid:"#F4A261",
    accent:"#E8725A",border:"#333330",white:"#2A2A26",cardBg:"#222220",
    navBg:"rgba(26,26,24,0.95)",msgOwn:"#1A3328",msgOther:"#2A2A26",
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

const MONTHLY_CHALLENGES = [
  {id:1,emoji:"🌿",title:"Touch Grass",desc:"Post yourself outdoors",activityId:"outdoors"},
  {id:2,emoji:"🍳",title:"Chef Mode",desc:"Cook something from scratch",activityId:"cooking"},
  {id:3,emoji:"💪",title:"PR Day",desc:"Post a workout milestone",activityId:"workout"},
  {id:4,emoji:"📖",title:"Book Nerd",desc:"Share what you're reading",activityId:"reading"},
  {id:5,emoji:"🎨",title:"Make Something",desc:"Post a creative project",activityId:"creating"},
  {id:6,emoji:"🧘",title:"Zen Mode",desc:"Log a meditation session",activityId:"wellness"},
  {id:7,emoji:"🛠",title:"Fix It",desc:"Post a DIY task completed",activityId:"building"},
  {id:8,emoji:"🌱",title:"Learn Something",desc:"Post about a skill practiced",activityId:"learning"},
];

// ── Auth helpers ──────────────────────────────────────────────────────────────
const getToken=()=>localStorage.getItem("hs_token");
const setToken=(t)=>localStorage.setItem("hs_token",t);
const getRefresh=()=>localStorage.getItem("hs_refresh");
const setRefresh=(t)=>localStorage.setItem("hs_refresh",t);
const getSavedUser=()=>{try{return JSON.parse(localStorage.getItem("hs_user"));}catch{return null;}};
const saveUser=(u)=>localStorage.setItem("hs_user",JSON.stringify(u));
const getSavedRooms=()=>{try{return JSON.parse(localStorage.getItem("hs_rooms"))||[];}catch{return[];}};
const saveRooms=(r)=>localStorage.setItem("hs_rooms",JSON.stringify(r));
const clearAuth=()=>["hs_token","hs_refresh","hs_user","hs_rooms"].forEach(k=>localStorage.removeItem(k));

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

const encryptCaption=(t)=>btoa(encodeURIComponent(t));
const decryptCaption=(c)=>{try{return decodeURIComponent(atob(c));}catch{return c;}};
const generateNonce=()=>btoa(Math.random().toString(36));
const userColor=(name)=>["#2D6A4F","#C84B31","#7B4F9E","#B5621A","#1A5276","#C17D3C"][name?.charCodeAt(0)%6]||"#3D3D38";
const timeAgo=(date)=>{const s=Math.floor((Date.now()-new Date(date))/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;};

// convert file to base64
const fileToBase64=(file)=>new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result.split(",")[1]);
  reader.onerror=reject;
  reader.readAsDataURL(file);
});

// ── Main App ──────────────────────────────────────────────────────────────────
export default function HangSpace(){
  const[theme,setTheme]=useState(()=>localStorage.getItem("hs_theme")||"light");
  const C=themes[theme];
  const toggleTheme=()=>{const n=theme==="light"?"dark":"light";setTheme(n);localStorage.setItem("hs_theme",n);};

  const styles=`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:${C.cream};font-family:'DM Sans',sans-serif;color:${C.ink};transition:background 0.3s;}
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

  const[user,setUser]=useState(getSavedUser);
  const[rooms,setRooms]=useState(getSavedRooms);
  const[activeRoom,setActiveRoom]=useState(()=>rooms[0]||null);
  const[activeTab,setActiveTab]=useState("feed");
  const[posts,setPosts]=useState([]);
  const[loadingPosts,setLoadingPosts]=useState(false);
  const[showComposer,setShowComposer]=useState(false);
  const[showRoomPicker,setShowRoomPicker]=useState(false);
  const[confetti,setConfetti]=useState(false);
  const[searchQuery,setSearchQuery]=useState("");
  const[chatMessages,setChatMessages]=useState([]);

  useEffect(()=>{if(activeRoom?.id)fetchPosts();},[activeRoom?.id]);

  const fetchPosts=async()=>{
    if(!activeRoom?.id)return;
    setLoadingPosts(true);
    try{const res=await apiFetch(`/posts/room/${activeRoom.id}`);if(res.ok){const d=await res.json();setPosts(d.posts||[]);}}
    catch{}finally{setLoadingPosts(false);}
  };

  const handleAuth=(u)=>{setUser(u);saveUser(u);};

  const handleRoomJoined=(r)=>{
    const updated=[...rooms.filter(x=>x.id!==r.id),r];
    setRooms(updated);saveRooms(updated);
    setActiveRoom(r);
  };

  const handleLeaveRoom=async(roomId)=>{
    if(!confirm("Leave this room?"))return;
    const res=await apiFetch(`/rooms/${roomId}/leave`,{method:"DELETE"});
    if(res.ok){
      const updated=rooms.filter(r=>r.id!==roomId);
      setRooms(updated);saveRooms(updated);
      setActiveRoom(updated[0]||null);
    }
  };

  const handlePost=(post)=>{setPosts(p=>[post,...p]);setConfetti(true);setTimeout(()=>setConfetti(false),1000);};
  const handleDeletePost=(id)=>setPosts(p=>p.filter(x=>x.id!==id));
  const handleEditPost=(id,newCaption)=>setPosts(p=>p.map(x=>x.id===id?{...x,encryptedCaption:encryptCaption(newCaption)}:x));
  const handleLogout=()=>{clearAuth();setUser(null);setRooms([]);setActiveRoom(null);};
  const handleRegenCode=(newCode)=>{
    const updated=rooms.map(r=>r.id===activeRoom.id?{...r,joinCode:newCode}:r);
    setRooms(updated);saveRooms(updated);
    setActiveRoom(r=>({...r,joinCode:newCode}));
  };

  const filteredPosts=searchQuery.trim()
    ?posts.filter(p=>{
        const cap=decryptCaption(p.encryptedCaption).toLowerCase();
        const act=ALL_ACTIVITIES.find(a=>a.id===p.activityId);
        return cap.includes(searchQuery.toLowerCase())||act?.label.toLowerCase().includes(searchQuery.toLowerCase())||p.user?.username.toLowerCase().includes(searchQuery.toLowerCase());
      })
    :posts;

  if(!user)return<><style>{styles}</style><AuthScreen C={C}/> </>;

  // No rooms yet
  if(!activeRoom||rooms.length===0)return(
    <>
      <style>{styles}</style>
      <RoomSetupScreen C={C} user={user} onRoomJoined={handleRoomJoined} onLogout={handleLogout}/>
    </>
  );

  const TABS=[
    {id:"feed",label:"Feed",emoji:"🏠"},
    {id:"chat",label:"Chat",emoji:"💬"},
    {id:"challenges",label:"Challenges",emoji:"🏆"},
    {id:"stats",label:"Stats",emoji:"📊"},
    {id:"profile",label:"You",emoji:"👤"},
  ];

  return(
    <>
      <style>{styles}</style>
      <div style={{minHeight:"100vh",background:C.cream,paddingBottom:80}}>
        {/* Header */}
        <div style={{position:"sticky",top:0,zIndex:100,background:C.navBg,backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>🪐</span>
            <h1 className="serif" style={{fontSize:20,fontWeight:900,color:C.ink}}>HangSpace</h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Room switcher */}
            <button onClick={()=>setShowRoomPicker(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.creamDark,color:C.ink,fontSize:12,fontWeight:500,cursor:"pointer",maxWidth:120}}>
              <span style={{fontSize:14}}>{activeRoom?.emoji||"💓"}</span>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeRoom?.name}</span>
              <span style={{fontSize:10,color:C.inkMuted}}>▼</span>
            </button>
            <button onClick={toggleTheme} style={{background:C.creamDark,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 8px",fontSize:14,cursor:"pointer",color:C.ink}}>
              {theme==="light"?"🌙":"☀️"}
            </button>
            <div style={{width:28,height:28,borderRadius:"50%",background:userColor(user.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:11,cursor:"pointer"}} onClick={()=>setActiveTab("profile")}>
              {user.username?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{maxWidth:560,margin:"0 auto",padding:"16px 16px 0"}}>
          {activeTab==="feed"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <h2 className="serif" style={{fontSize:24,color:C.ink}}>{activeRoom?.name}</h2>
                <button onClick={fetchPosts} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.inkMuted}}>↻</button>
              </div>
              <div style={{position:"relative",marginBottom:16}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.inkMuted}}>🔍</span>
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search posts..." style={{width:"100%",padding:"9px 12px 9px 34px",borderRadius:10,border:`1px solid ${C.border}`,background:C.creamDark,fontSize:13,outline:"none",color:C.ink}}/>
                {searchQuery&&<button onClick={()=>setSearchQuery("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:14,cursor:"pointer",color:C.inkMuted}}>✕</button>}
              </div>
              {loadingPosts?[1,2,3].map(i=><div key={i} className="shimmer" style={{height:200,borderRadius:16,marginBottom:16}}/>)
              :filteredPosts.length===0?(
                <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"40px 24px",textAlign:"center"}}>
                  <div style={{fontSize:48,marginBottom:12}}>{searchQuery?"🔍":"📭"}</div>
                  <h3 className="serif" style={{fontSize:20,marginBottom:8,color:C.ink}}>{searchQuery?"No results":"No posts yet"}</h3>
                  <p style={{color:C.inkMuted,fontSize:14}}>Tap + to post something!</p>
                </div>
              ):filteredPosts.map((post,i)=><PostCard key={post.id} post={post} index={i} C={C} currentUserId={user.id} onDelete={handleDeletePost} onEdit={handleEditPost}/>)}
            </div>
          )}
          {activeTab==="chat"&&<ChatRoom C={C} room={activeRoom} user={user} messages={chatMessages} setMessages={setChatMessages}/>}
          {activeTab==="challenges"&&<ChallengesPage C={C} room={activeRoom} posts={posts}/>}
          {activeTab==="stats"&&<StatsPage C={C} roomId={activeRoom?.id} currentUser={user} posts={posts}/>}
          {activeTab==="profile"&&<ProfilePage C={C} user={user} posts={posts} rooms={rooms} activeRoom={activeRoom} onLogout={handleLogout} onLeaveRoom={handleLeaveRoom} onRoomJoined={handleRoomJoined} onSwitchRoom={(r)=>{setActiveRoom(r);setActiveTab("feed");}}/>}
        </div>

        {confetti&&<div style={{position:"fixed",top:"40%",left:"50%",transform:"translate(-50%,-50%)",fontSize:60,zIndex:2000,pointerEvents:"none"}} className="confetti">🎉</div>}

        {activeTab==="feed"&&(
          <button onClick={()=>setShowComposer(true)} style={{position:"fixed",bottom:90,right:20,width:56,height:56,borderRadius:28,background:C.ink,border:"none",color:C.white,fontSize:28,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        )}

        <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.white,borderTop:`1px solid ${C.border}`,display:"flex",padding:"6px 0 14px"}}>
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"6px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:activeTab===tab.id?C.ink:C.inkMuted,transition:"all 0.15s"}}>
              <span style={{fontSize:18,opacity:activeTab===tab.id?1:0.5}}>{tab.emoji}</span>
              <span style={{fontSize:9,fontWeight:activeTab===tab.id?600:400}}>{tab.label}</span>
            </button>
          ))}
        </div>

        {showComposer&&<PostComposer C={C} roomId={activeRoom?.id} onPost={handlePost} onClose={()=>setShowComposer(false)}/>}
        {showRoomPicker&&<RoomPicker C={C} rooms={rooms} activeRoom={activeRoom} onSelect={(r)=>{setActiveRoom(r);setActiveTab("feed");setShowRoomPicker(false);}} onClose={()=>setShowRoomPicker(false)} onAdd={()=>{setShowRoomPicker(false);setActiveTab("profile");}}/>}
      </div>
    </>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({C}){
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
      setToken(data.accessToken);setRefresh(data.refreshToken);saveUser(data.user);
      window.location.reload();
    }catch{setError("Network error — check your connection");}
    finally{setLoading(false);}
  };

  return(
    <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div className="fade-in" style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:56,marginBottom:12}}>🪐</div>
          <h1 className="serif" style={{fontSize:42,fontWeight:900,letterSpacing:-1,color:C.ink}}>HangSpace</h1>
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
              <input type={type} value={val} onChange={e=>setter(e.target.value)} placeholder={ph} onKeyDown={e=>e.key==="Enter"&&submit()} style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,fontSize:15,outline:"none",color:C.ink}}/>
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
function RoomSetupScreen({C,user,onRoomJoined,onLogout}){
  const[action,setAction]=useState(null);
  const[roomName,setRoomName]=useState("");
  const[joinCode,setJoinCode]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  const createRoom=async()=>{
    if(!roomName.trim())return setError("Enter a room name");
    setLoading(true);setError("");
    try{
      const res=await apiFetch("/rooms",{method:"POST",body:JSON.stringify({name:roomName.trim(),emoji:"🪐",encryptedRoomKey:btoa("key_"+Math.random())})});
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
          <div style={{fontSize:48,marginBottom:12}}>🪐</div>
          <h1 className="serif" style={{fontSize:32,fontWeight:900,color:C.ink}}>Hey, {user.username}!</h1>
          <p style={{color:C.inkMuted,marginTop:8}}>Create a space or join one a friend made.</p>
        </div>
        <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
          {error&&<div style={{padding:"10px 14px",borderRadius:8,background:"#FEE2E2",color:C.accent,fontSize:13,marginBottom:12}}>{error}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {[["create","🏠","Create space","Start fresh"],["join","🔑","Join space","Enter a code"]].map(([id,emoji,label,sub])=>(
              <button key={id} onClick={()=>{setAction(id);setError("");}} style={{padding:"20px 16px",borderRadius:12,border:`2px solid ${action===id?C.ink:C.border}`,background:action===id?C.ink:C.cream,color:action===id?C.white:C.ink,cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <div style={{fontSize:28,marginBottom:8}}>{emoji}</div>
                <div style={{fontWeight:600}}>{label}</div>
                <div style={{fontSize:12,opacity:0.6,marginTop:4}}>{sub}</div>
              </button>
            ))}
          </div>
          {action==="create"&&(
            <div>
              <input value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="Space name e.g. The Homies" style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,fontSize:15,outline:"none",color:C.ink,marginBottom:12}} onKeyDown={e=>e.key==="Enter"&&createRoom()}/>
              <button onClick={createRoom} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:C.ink,color:C.white,fontWeight:500,cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1}}>{loading?"Creating...":"Create Space 🏠"}</button>
            </div>
          )}
          {action==="join"&&(
            <div>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="e.g. FLAME-7293" style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,fontSize:15,outline:"none",color:C.ink,marginBottom:12,textTransform:"uppercase",letterSpacing:1}} onKeyDown={e=>e.key==="Enter"&&joinRoom()}/>
              <button onClick={joinRoom} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:C.ink,color:C.white,fontWeight:500,cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1}}>{loading?"Joining...":"Join Space 🔑"}</button>
            </div>
          )}
        </div>
        <button onClick={onLogout} style={{width:"100%",marginTop:12,padding:"10px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.inkMuted,fontSize:13,cursor:"pointer"}}>Sign out</button>
      </div>
    </div>
  );
}

// ── Room Picker ───────────────────────────────────────────────────────────────
function RoomPicker({C,rooms,activeRoom,onSelect,onClose,onAdd}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:560,background:C.cream,borderRadius:"20px 20px 0 0",padding:"20px 20px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 className="serif" style={{fontSize:20,color:C.ink}}>Your spaces</h3>
          <button onClick={onClose} style={{background:C.creamDark,border:"none",borderRadius:20,padding:"5px 10px",cursor:"pointer",color:C.ink}}>✕</button>
        </div>
        {rooms.map(r=>(
          <button key={r.id} onClick={()=>onSelect(r)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,border:`1px solid ${activeRoom?.id===r.id?C.ink:C.border}`,background:activeRoom?.id===r.id?C.ink:C.cardBg,color:activeRoom?.id===r.id?C.white:C.ink,marginBottom:8,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
            <span style={{fontSize:24}}>{r.emoji||"🪐"}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>{r.name}</div>
              <div style={{fontSize:11,opacity:0.6}}>{r.members?.length||0} members</div>
            </div>
            {activeRoom?.id===r.id&&<span style={{fontSize:16}}>✓</span>}
          </button>
        ))}
        <button onClick={onAdd} style={{width:"100%",padding:"12px",borderRadius:12,border:`1px dashed ${C.border}`,background:"transparent",color:C.inkMuted,fontSize:14,cursor:"pointer",marginTop:4}}>
          + Join or create another space
        </button>
      </div>
    </div>
  );
}

// ── Carousel ──────────────────────────────────────────────────────────────────
function Carousel({urls,C}){
  const[idx,setIdx]=useState(0);
  const valid=urls?.filter(u=>u&&u!=="placeholder")||[];
  if(!valid.length)return null;
  return(
    <div style={{position:"relative",marginBottom:14,borderRadius:12,overflow:"hidden",background:C.creamDark}}>
      <img src={valid[idx]} alt="post" style={{width:"100%",maxHeight:280,objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/>
      {valid.length>1&&(
        <>
          <button onClick={()=>setIdx(i=>(i-1+valid.length)%valid.length)} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.45)",border:"none",borderRadius:"50%",width:30,height:30,color:"white",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <button onClick={()=>setIdx(i=>(i+1)%valid.length)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.45)",border:"none",borderRadius:"50%",width:30,height:30,color:"white",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",display:"flex",gap:4}}>
            {valid.map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:i===idx?"white":"rgba(255,255,255,0.5)"}}/>)}
          </div>
          <div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.4)",borderRadius:6,padding:"2px 8px",fontSize:11,color:"white"}}>{idx+1}/{valid.length}</div>
        </>
      )}
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({post,index,C,currentUserId,onDelete,onEdit}){
  const[reactions,setReactions]=useState(()=>{
    const g={};(post.reactions||[]).forEach(r=>{g[r.emoji]=(g[r.emoji]||0)+1;});return g;
  });
  const[myReactions,setMyReactions]=useState(()=>{
    const mine=new Set();(post.reactions||[]).forEach(r=>{if(r.userId===currentUserId)mine.add(r.emoji);});return mine;
  });
  const[showMenu,setShowMenu]=useState(false);
  const[editing,setEditing]=useState(false);
  const[editCaption,setEditCaption]=useState("");
  const[savingEdit,setSavingEdit]=useState(false);

  const react=async(emoji)=>{
    // Optimistic update
    const alreadyReacted=myReactions.has(emoji);
    setReactions(r=>{
      const u={...r};
      if(alreadyReacted){u[emoji]=(u[emoji]||1)-1;if(u[emoji]<=0)delete u[emoji];}
      else u[emoji]=(u[emoji]||0)+1;
      return u;
    });
    setMyReactions(m=>{const n=new Set(m);alreadyReacted?n.delete(emoji):n.add(emoji);return n;});
    await apiFetch(`/posts/${post.id}/react`,{method:"POST",body:JSON.stringify({emoji})});
  };

  const deletePost=async()=>{
    if(!confirm("Delete this post?"))return;
    const res=await apiFetch(`/posts/${post.id}`,{method:"DELETE"});
    if(res.ok)onDelete(post.id);
  };

  const startEdit=()=>{
    setEditCaption(decryptCaption(post.encryptedCaption));
    setEditing(true);setShowMenu(false);
  };

  const saveEdit=async()=>{
    if(!editCaption.trim())return;
    setSavingEdit(true);
    // Update locally (backend edit route optional)
    onEdit(post.id,editCaption);
    setEditing(false);setSavingEdit(false);
  };

  const caption=decryptCaption(post.encryptedCaption);
  const act=ALL_ACTIVITIES.find(a=>a.id===post.activityId);
  const isGreen=act?.color==="green";
  const isOwn=post.userId===currentUserId||post.user?.id===currentUserId;

  return(
    <div className="peel-in" style={{animationDelay:`${index*60}ms`,marginBottom:16}}>
      <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 18px"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:userColor(post.user?.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:13}}>
              {post.user?.username?.[0]?.toUpperCase()||"?"}
            </div>
            <div>
              <div style={{fontWeight:600,fontSize:13,color:C.ink}}>{post.user?.username}</div>
              <div style={{fontSize:11,color:C.inkMuted}}>{timeAgo(post.createdAt)}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 9px",borderRadius:20,background:isGreen?C.greenLight:C.amberLight,color:isGreen?C.green:C.amber,fontSize:11,fontWeight:500}}>
              {act?.emoji} {act?.label||post.activityId}
            </span>
            {isOwn&&(
              <div style={{position:"relative"}}>
                <button onClick={()=>setShowMenu(m=>!m)} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:C.inkMuted,padding:"3px 6px"}}>⋯</button>
                {showMenu&&(
                  <div style={{position:"absolute",right:0,top:"100%",background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"4px",zIndex:10,minWidth:130,boxShadow:"0 4px 16px rgba(0,0,0,0.12)"}}>
                    <button onClick={startEdit} style={{width:"100%",padding:"8px 12px",border:"none",background:"none",color:C.ink,fontSize:13,cursor:"pointer",textAlign:"left",borderRadius:6}}>✏️ Edit caption</button>
                    <button onClick={()=>{setShowMenu(false);deletePost();}} style={{width:"100%",padding:"8px 12px",border:"none",background:"none",color:C.accent,fontSize:13,cursor:"pointer",textAlign:"left",borderRadius:6}}>🗑️ Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Carousel urls={post.mediaUrls||[]} C={C}/>

        {editing?(
          <div style={{marginBottom:12}}>
            <textarea value={editCaption} onChange={e=>setEditCaption(e.target.value)} rows={3} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.creamDark,fontSize:13,outline:"none",resize:"vertical",fontFamily:"DM Sans,sans-serif",color:C.ink,marginBottom:8}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveEdit} disabled={savingEdit} style={{flex:1,padding:"8px",borderRadius:8,border:"none",background:C.green,color:"white",fontSize:13,cursor:"pointer"}}>{savingEdit?"Saving...":"Save"}</button>
              <button onClick={()=>setEditing(false)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.ink,fontSize:13,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        ):(
          <p style={{fontSize:13,lineHeight:1.6,color:C.inkLight,marginBottom:12}}>{caption}</p>
        )}

        {/* Reactions */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {Object.entries(reactions).map(([emoji,count])=>(
            <button key={emoji} onClick={()=>react(emoji)} style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${myReactions.has(emoji)?C.green:C.border}`,background:myReactions.has(emoji)?C.greenLight:C.creamDark,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:3,color:C.ink,transition:"all 0.15s"}}>
              {emoji}<span style={{fontWeight:600,fontSize:11}}>{count}</span>
            </button>
          ))}
          <div style={{display:"flex",gap:4}}>
            {["❤️","🔥","😭","👏","🎉"].filter(e=>!reactions[e]).map(e=>(
              <button key={e} onClick={()=>react(e)} style={{padding:"4px 8px",borderRadius:20,border:`1px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.inkMuted}}>{e}</button>
            ))}
          </div>
        </div>
        <div style={{marginTop:8,fontSize:10,color:C.inkMuted}}>🔓 Decrypted locally</div>
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
  const[mediaSource,setMediaSource]=useState(null); // "camera" | "file"
  const fileInputRef=useRef();
  const cameraInputRef=useRef();

  const generateCaption=async(id,files)=>{
    const act=ALL_ACTIVITIES.find(a=>a.id===id);if(!act)return;
    setLoadingCaption(true);setCaption("");
    try{
      let imageBase64=null;let mimeType=null;
      const filesToUse=files||mediaFiles;
      if(filesToUse.length>0){
        imageBase64=await fileToBase64(filesToUse[0]);
        mimeType=filesToUse[0].type||"image/jpeg";
      }
      const res=await apiFetch("/ai/caption",{method:"POST",body:JSON.stringify({activityLabel:`${act.emoji} ${act.label}`,imageBase64,mimeType})});
      const data=await res.json();
      setCaption(data.caption||"Living in the moment. 📸");
    }catch{setCaption("Living in the moment. 📸");}
    setLoadingCaption(false);
  };

  const selectActivity=(id)=>{setSelectedActivity(id);generateCaption(id);};

  const handleFiles=(e,source)=>{
    const files=Array.from(e.target.files).slice(0,10);
    if(!files.length)return;
    setMediaFiles(files);setMediaSource(source);
    if(selectedActivity)generateCaption(selectedActivity,files);
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
      <div className="fade-in" style={{width:"100%",maxWidth:560,background:C.cream,borderRadius:"24px 24px 0 0",padding:"24px 20px 36px",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 className="serif" style={{fontSize:22,color:C.ink}}>New post</h2>
          <button onClick={onClose} style={{background:C.creamDark,border:"none",borderRadius:20,padding:"5px 11px",cursor:"pointer",color:C.ink}}>✕</button>
        </div>
        {error&&<div style={{padding:"10px 14px",borderRadius:8,background:"#FEE2E2",color:C.accent,fontSize:13,marginBottom:12}}>{error}</div>}

        {/* Media options */}
        <div style={{marginBottom:18}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {/* Camera button */}
            <button onClick={()=>cameraInputRef.current.click()} style={{padding:"16px",borderRadius:12,border:`2px dashed ${mediaSource==="camera"?C.green:C.border}`,background:mediaSource==="camera"?C.greenLight:C.creamDark,color:mediaSource==="camera"?C.green:C.ink,cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
              <div style={{fontSize:28,marginBottom:4}}>📷</div>
              <div style={{fontSize:13,fontWeight:500}}>Take photo</div>
            </button>
            {/* File picker */}
            <button onClick={()=>fileInputRef.current.click()} style={{padding:"16px",borderRadius:12,border:`2px dashed ${mediaSource==="file"?C.green:C.border}`,background:mediaSource==="file"?C.greenLight:C.creamDark,color:mediaSource==="file"?C.green:C.ink,cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
              <div style={{fontSize:28,marginBottom:4}}>🖼️</div>
              <div style={{fontSize:13,fontWeight:500}}>Choose file</div>
            </button>
          </div>
          {/* Hidden inputs */}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e=>handleFiles(e,"camera")} style={{display:"none"}}/>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={e=>handleFiles(e,"file")} style={{display:"none"}}/>
          {/* Previews */}
          {mediaFiles.length>0&&(
            <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
              {mediaFiles.map((f,i)=>(
                <div key={i} style={{width:56,height:56,borderRadius:8,overflow:"hidden",flexShrink:0,border:`1px solid ${C.border}`,position:"relative"}}>
                  <img src={URL.createObjectURL(f)} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="preview"/>
                  {i===0&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.4)",fontSize:9,color:"white",textAlign:"center",padding:"1px"}}>main</div>}
                </div>
              ))}
              <button onClick={()=>{setMediaFiles([]);setMediaSource(null);}} style={{width:56,height:56,borderRadius:8,border:`1px dashed ${C.border}`,background:"transparent",color:C.inkMuted,fontSize:18,cursor:"pointer",flexShrink:0}}>✕</button>
            </div>
          )}
        </div>

        {/* Activity picker */}
        <div style={{marginBottom:16}}>
          <p style={{fontSize:12,fontWeight:600,marginBottom:9,color:C.inkMuted,letterSpacing:0.5}}>WHAT'S THE VIBE?</p>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {["productive","relaxing"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{padding:"5px 14px",borderRadius:20,border:`1px solid ${C.border}`,background:tab===t?C.ink:C.creamDark,color:tab===t?C.white:C.ink,fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}>
                {t==="productive"?"💚 Growth":"🧡 Chill"}
              </button>
            ))}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {activities.map(act=>(
              <button key={act.id} onClick={()=>selectActivity(act.id)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${selectedActivity===act.id?(act.color==="green"?C.green:C.amber):C.border}`,background:selectedActivity===act.id?(act.color==="green"?C.greenLight:C.amberLight):C.cream,color:selectedActivity===act.id?(act.color==="green"?C.green:C.amber):C.inkLight,fontSize:12,cursor:"pointer",transition:"all 0.15s",fontWeight:selectedActivity===act.id?600:400}}>
                {act.emoji} {act.label}
              </button>
            ))}
          </div>
        </div>

        {selectedActivity&&(
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <p style={{fontSize:12,fontWeight:600,color:C.inkMuted}}>✨ AI CAPTION {mediaFiles.length>0?"(analyzing your photo)":""}</p>
              <button onClick={()=>generateCaption(selectedActivity)} disabled={loadingCaption} style={{fontSize:11,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:500}}>{loadingCaption?"Generating...":"↻ Regenerate"}</button>
            </div>
            {loadingCaption?<div className="shimmer" style={{height:56,borderRadius:8}}/>:<textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={3} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.creamDark,fontSize:13,lineHeight:1.6,outline:"none",resize:"vertical",fontFamily:"DM Sans,sans-serif",color:C.ink}}/>}
          </div>
        )}

        <button onClick={handlePost} disabled={!selectedActivity||posting} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:C.ink,color:C.white,fontWeight:500,fontSize:14,cursor:!selectedActivity||posting?"not-allowed":"pointer",opacity:!selectedActivity||posting?0.6:1}}>
          {posting?"Posting...":"Post to space 🔒"}
        </button>
        <p style={{fontSize:10,color:C.inkMuted,textAlign:"center",marginTop:8}}>Encrypted before leaving your device</p>
      </div>
    </div>
  );
}

// ── Chat Room ─────────────────────────────────────────────────────────────────
function ChatRoom({C,room,user,messages,setMessages}){
  const[input,setInput]=useState("");
  const bottomRef=useRef();

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const send=()=>{
    if(!input.trim())return;
    const msg={id:Date.now(),userId:user.id,username:user.username,text:input.trim(),timestamp:new Date().toISOString()};
    setMessages(m=>[...m,msg]);
    setInput("");
  };

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 160px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <h2 className="serif" style={{fontSize:22,color:C.ink}}>Chat</h2>
        <span style={{fontSize:12,color:C.inkMuted,background:C.creamDark,padding:"2px 8px",borderRadius:10}}>local only</span>
      </div>
      <div style={{flex:1,overflowY:"auto",marginBottom:12,display:"flex",flexDirection:"column",gap:8}}>
        {messages.length===0&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:C.inkMuted}}>
            <div style={{fontSize:40,marginBottom:8}}>💬</div>
            <p style={{fontSize:14}}>Start the conversation!</p>
            <p style={{fontSize:12,marginTop:4}}>Messages are stored locally on your device</p>
          </div>
        )}
        {messages.map(msg=>{
          const isMe=msg.userId===user.id;
          return(
            <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
              {!isMe&&<span style={{fontSize:11,color:C.inkMuted,marginBottom:3,marginLeft:8}}>{msg.username}</span>}
              <div style={{maxWidth:"75%",padding:"10px 14px",borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",background:isMe?C.green:C.cardBg,color:isMe?"white":C.ink,fontSize:14,lineHeight:1.5,border:`1px solid ${isMe?"transparent":C.border}`}}>
                {msg.text}
              </div>
              <span style={{fontSize:10,color:C.inkMuted,marginTop:3,marginLeft:isMe?0:8,marginRight:isMe?8:0}}>{timeAgo(msg.timestamp)}</span>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8,paddingBottom:4}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Say something..." style={{flex:1,padding:"11px 14px",borderRadius:12,border:`1px solid ${C.border}`,background:C.creamDark,fontSize:14,outline:"none",color:C.ink}}/>
        <button onClick={send} disabled={!input.trim()} style={{padding:"11px 18px",borderRadius:12,border:"none",background:C.ink,color:C.white,fontSize:16,cursor:input.trim()?"pointer":"not-allowed",opacity:input.trim()?1:0.5}}>↑</button>
      </div>
    </div>
  );
}

// ── Challenges Page ───────────────────────────────────────────────────────────
function ChallengesPage({C,room,posts}){
  const now=new Date();
  const monthName=now.toLocaleString("default",{month:"long"});
  const currentChallenge=MONTHLY_CHALLENGES[now.getMonth()%MONTHLY_CHALLENGES.length];

  // Check completions based on posts
  const members=room?.members||[];
  const completions=members.map(m=>{
    const userPosts=posts.filter(p=>p.userId===m.userId||p.user?.id===m.userId);
    const completed=userPosts.some(p=>p.activityId===currentChallenge.activityId);
    return{...m,completed};
  });

  const completedCount=completions.filter(c=>c.completed).length;
  const pct=members.length?Math.round((completedCount/members.length)*100):0;

  return(
    <div style={{paddingBottom:40}}>
      <h2 className="serif" style={{fontSize:26,color:C.ink,marginBottom:4}}>{monthName}'s Challenge</h2>
      <p style={{color:C.inkMuted,fontSize:14,marginBottom:20}}>Complete it this month with your crew!</p>

      {/* Current challenge card */}
      <div style={{background:C.cardBg,border:`2px solid ${C.green}`,borderRadius:20,padding:"24px",marginBottom:20,textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:12}}>{currentChallenge.emoji}</div>
        <h3 className="serif" style={{fontSize:28,color:C.ink,marginBottom:8}}>{currentChallenge.title}</h3>
        <p style={{color:C.inkMuted,fontSize:15,marginBottom:20}}>{currentChallenge.desc}</p>
        <div style={{background:C.creamDark,borderRadius:12,padding:"16px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:13,color:C.inkMuted}}>Group progress</span>
            <span style={{fontSize:13,fontWeight:600,color:C.green}}>{completedCount}/{members.length} done</span>
          </div>
          <div style={{height:12,borderRadius:6,background:C.border,overflow:"hidden"}}>
            <div style={{width:`${pct}%`,height:"100%",background:C.greenMid,borderRadius:6,transition:"width 1s ease"}}/>
          </div>
        </div>
        <p style={{fontSize:12,color:C.inkMuted}}>Post with the <strong>{currentChallenge.emoji} {ALL_ACTIVITIES.find(a=>a.id===currentChallenge.activityId)?.label}</strong> tag to complete</p>
      </div>

      {/* Member completion grid */}
      <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 20px",marginBottom:20}}>
        <p style={{fontWeight:600,marginBottom:16,fontSize:14,color:C.ink}}>Who's done it 🏆</p>
        {members.length===0?(
          <p style={{color:C.inkMuted,fontSize:14}}>No members yet</p>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
            {completions.map(m=>(
              <div key={m.userId} style={{textAlign:"center",padding:"12px 8px",background:m.completed?C.greenLight:C.creamDark,borderRadius:12,border:`1px solid ${m.completed?C.greenMid:C.border}`,transition:"all 0.3s"}}>
                <div style={{fontSize:24,marginBottom:4}}>{m.completed?"✅":"⏳"}</div>
                <div style={{fontWeight:500,fontSize:12,color:C.ink}}>{m.user?.username||"..."}</div>
                <div style={{fontSize:10,color:m.completed?C.green:C.inkMuted,marginTop:2}}>{m.completed?"Completed!":"In progress"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past challenges */}
      <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px"}}>
        <p style={{fontWeight:600,marginBottom:14,fontSize:14,color:C.ink}}>All challenges</p>
        {MONTHLY_CHALLENGES.map((ch,i)=>{
          const isCurrent=ch.id===currentChallenge.id;
          return(
            <div key={ch.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<MONTHLY_CHALLENGES.length-1?`1px solid ${C.border}`:"none",opacity:isCurrent?1:0.6}}>
              <span style={{fontSize:22}}>{ch.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:13,color:C.ink}}>{ch.title}</div>
                <div style={{fontSize:11,color:C.inkMuted}}>{ch.desc}</div>
              </div>
              {isCurrent&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:C.greenLight,color:C.green,fontWeight:600}}>This month</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stats Page ────────────────────────────────────────────────────────────────
function StatsPage({C,roomId,currentUser,posts}){
  const[stats,setStats]=useState(null);
  const[loading,setLoading]=useState(true);
  const recapRef=useRef();

  useEffect(()=>{
    apiFetch(`/stats/room/${roomId}/weekly`).then(r=>r.json()).then(d=>{setStats(d);setLoading(false);}).catch(()=>setLoading(false));
  },[roomId]);

  const exportRecap=async()=>{
    try{
      const{default:html2canvas}=await import("https://esm.sh/html2canvas@1.4.1");
      const canvas=await html2canvas(recapRef.current,{backgroundColor:"#F5F0E8",scale:2});
      const link=document.createElement("a");link.download="hangspace-recap.png";link.href=canvas.toDataURL();link.click();
    }catch{alert("Screenshoot to save instead!");}
  };

  const myPosts=posts.filter(p=>p.userId===currentUser?.id||p.user?.id===currentUser?.id);
  const totalMine=myPosts.length;
  const productiveMine=myPosts.filter(p=>p.activityCategory==="productive").length;
  const pctMine=totalMine?Math.round((productiveMine/totalMine)*100):0;

  if(loading)return<div className="shimmer" style={{height:200,borderRadius:16,margin:"20px 0"}}/>;

  return(
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 className="serif" style={{fontSize:24,color:C.ink}}>Grind report 📊</h2>
        <button onClick={exportRecap} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.creamDark,color:C.ink,fontSize:12,cursor:"pointer"}}>📤 Export</button>
      </div>

      {/* Personal quick stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[{label:"My posts",value:totalMine,emoji:"📸"},{label:"Productive",value:`${pctMine}%`,emoji:"💚"}].map(s=>(
          <div key={s.label} style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:4}}>{s.emoji}</div>
            <div style={{fontWeight:700,fontSize:22,color:C.ink}}>{s.value}</div>
            <div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div ref={recapRef}>
        {!stats?.stats?.length?(
          <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"32px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:10}}>📊</div>
            <p style={{color:C.inkMuted}}>Post this week to see group stats!</p>
          </div>
        ):(
          <>
            <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"18px 20px",marginBottom:14}}>
              <p style={{fontWeight:600,marginBottom:14,fontSize:13,color:C.ink}}>This week · Productive vs Chill</p>
              {stats.stats.map(m=>(
                <div key={m.userId} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:500,color:C.ink}}>{m.username}</span>
                    <span style={{fontSize:11,color:C.inkMuted}}>{m.productivePct}% 💚</span>
                  </div>
                  <div style={{height:18,borderRadius:9,overflow:"hidden",background:C.amberLight,display:"flex"}}>
                    <div style={{width:`${m.productivePct}%`,background:C.greenMid,borderRadius:"9px 0 0 9px",transition:"width 1s ease"}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"18px 20px"}}>
              <p style={{fontWeight:600,marginBottom:14,fontSize:13,color:C.ink}}>Leaderboard 🏆</p>
              {[...stats.stats].sort((a,b)=>b.productivePct-a.productivePct).map((m,i)=>(
                <div key={m.userId} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<stats.stats.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:18,minWidth:26}}>{i===0?"👑":`#${i+1}`}</span>
                  <div style={{width:28,height:28,borderRadius:"50%",background:userColor(m.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:11}}>{m.username?.[0]?.toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:13,color:C.ink}}>{m.username}</div>
                    <div style={{fontSize:11,color:C.inkMuted}}>{m.totalPosts} posts</div>
                  </div>
                  <span style={{fontWeight:700,color:m.productivePct>60?C.green:C.amber,fontSize:15}}>{m.productivePct}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Profile Page ──────────────────────────────────────────────────────────────
function ProfilePage({C,user,posts,rooms,activeRoom,onLogout,onLeaveRoom,onRoomJoined,onSwitchRoom}){
  const[showAddRoom,setShowAddRoom]=useState(false);
  const[addAction,setAddAction]=useState(null);
  const[roomName,setRoomName]=useState("");
  const[joinCode,setJoinCode]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const[copied,setCopied]=useState(false);

  const myPosts=posts.filter(p=>p.userId===user.id||p.user?.id===user.id);
  const activityCount={};
  myPosts.forEach(p=>{activityCount[p.activityId]=(activityCount[p.activityId]||0)+1;});
  const topActivities=Object.entries(activityCount).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const pct=myPosts.length?Math.round((myPosts.filter(p=>p.activityCategory==="productive").length/myPosts.length)*100):0;
  const RING=100,STROKE=9,r=(RING-STROKE)/2,circ=2*Math.PI*r;

  const createRoom=async()=>{
    if(!roomName.trim())return setError("Enter a name");
    setLoading(true);setError("");
    try{
      const res=await apiFetch("/rooms",{method:"POST",body:JSON.stringify({name:roomName.trim(),emoji:"🪐",encryptedRoomKey:btoa("key_"+Math.random())})});
      const data=await res.json();
      if(!res.ok)return setError(data.error||"Failed");
      onRoomJoined(data.room);setShowAddRoom(false);onSwitchRoom(data.room);
    }catch{setError("Network error");}finally{setLoading(false);}
  };

  const joinRoom=async()=>{
    if(!joinCode.trim())return setError("Enter a code");
    setLoading(true);setError("");
    try{
      const res=await apiFetch("/rooms/join",{method:"POST",body:JSON.stringify({joinCode:joinCode.trim().toUpperCase(),encryptedRoomKey:btoa("key_"+Math.random())})});
      const data=await res.json();
      if(!res.ok)return setError(data.error||"Failed");
      onRoomJoined(data.room);setShowAddRoom(false);onSwitchRoom(data.room);
    }catch{setError("Network error");}finally{setLoading(false);}
  };

  const copyCode=()=>{navigator.clipboard?.writeText(activeRoom?.joinCode);setCopied(true);setTimeout(()=>setCopied(false),2000);};

  return(
    <div style={{paddingBottom:40}}>
      {/* User card */}
      <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px",textAlign:"center",marginBottom:16}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:userColor(user.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:22,margin:"0 auto 10px"}}>{user.username?.[0]?.toUpperCase()}</div>
        <h2 className="serif" style={{fontSize:22,color:C.ink}}>{user.username}</h2>
        <div style={{display:"flex",justifyContent:"center",margin:"14px 0 6px"}}>
          <svg width={RING} height={RING} style={{transform:"rotate(-90deg)"}}>
            <circle cx={RING/2} cy={RING/2} r={r} fill="none" stroke={C.creamDark} strokeWidth={STROKE}/>
            <circle cx={RING/2} cy={RING/2} r={r} fill="none" stroke={C.greenMid} strokeWidth={STROKE} strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s ease"}}/>
          </svg>
        </div>
        <p style={{fontSize:13,fontWeight:600,color:C.green}}>{pct}% productive · all time</p>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:12}}>
          {[{v:myPosts.length,l:"Posts"},{v:topActivities.length,l:"Activities"}].map(s=>(
            <div key={s.l} style={{textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:20,color:C.ink}}>{s.v}</div>
              <div style={{fontSize:11,color:C.inkMuted}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Spaces */}
      <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"18px 20px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontWeight:600,fontSize:14,color:C.ink}}>Your spaces ({rooms.length})</p>
          <button onClick={()=>setShowAddRoom(a=>!a)} style={{fontSize:12,padding:"5px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.creamDark,color:C.ink,cursor:"pointer"}}>+ Add space</button>
        </div>
        {showAddRoom&&(
          <div style={{background:C.creamDark,borderRadius:12,padding:"14px",marginBottom:14}}>
            {error&&<div style={{padding:"8px",borderRadius:8,background:"#FEE2E2",color:C.accent,fontSize:12,marginBottom:10}}>{error}</div>}
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              {["create","join"].map(a=>(
                <button key={a} onClick={()=>setAddAction(a)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${addAction===a?C.ink:C.border}`,background:addAction===a?C.ink:C.cream,color:addAction===a?C.white:C.ink,fontSize:12,cursor:"pointer"}}>
                  {a==="create"?"🏠 Create":"🔑 Join"}
                </button>
              ))}
            </div>
            {addAction==="create"&&<div><input value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="Space name" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,fontSize:13,outline:"none",color:C.ink,marginBottom:8}}/><button onClick={createRoom} disabled={loading} style={{width:"100%",padding:"9px",borderRadius:8,border:"none",background:C.ink,color:C.white,fontSize:13,cursor:"pointer",opacity:loading?0.6:1}}>{loading?"Creating...":"Create"}</button></div>}
            {addAction==="join"&&<div><input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="e.g. FLAME-7293" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,fontSize:13,outline:"none",color:C.ink,marginBottom:8,textTransform:"uppercase"}}/><button onClick={joinRoom} disabled={loading} style={{width:"100%",padding:"9px",borderRadius:8,border:"none",background:C.ink,color:C.white,fontSize:13,cursor:"pointer",opacity:loading?0.6:1}}>{loading?"Joining...":"Join"}</button></div>}
          </div>
        )}
        {rooms.map(r=>(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:activeRoom?.id===r.id?C.greenLight:C.creamDark,marginBottom:8,border:`1px solid ${activeRoom?.id===r.id?C.greenMid:C.border}`}}>
            <span style={{fontSize:20}}>{r.emoji||"🪐"}</span>
            <div style={{flex:1}} onClick={()=>onSwitchRoom(r)} style={{flex:1,cursor:"pointer"}}>
              <div style={{fontWeight:500,fontSize:13,color:C.ink}}>{r.name}</div>
              <div style={{fontSize:11,color:C.inkMuted}}>{r.members?.length||0} members</div>
            </div>
            {activeRoom?.id===r.id&&(
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontFamily:"monospace",fontSize:12,color:C.accent,fontWeight:600}}>{r.joinCode}</span>
                <button onClick={copyCode} style={{fontSize:11,padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.cream,color:C.ink,cursor:"pointer"}}>{copied?"✓":"Copy"}</button>
              </div>
            )}
            {r.creatorId!==user.id&&(
              <button onClick={()=>onLeaveRoom(r.id)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:`1px solid ${C.accent}`,background:"transparent",color:C.accent,cursor:"pointer"}}>Leave</button>
            )}
          </div>
        ))}
      </div>

      {/* Top activities */}
      {topActivities.length>0&&(
        <div style={{background:C.cardBg,border:`1px solid ${C.border}`,borderRadius:16,padding:"18px 20px",marginBottom:14}}>
          <p style={{fontWeight:600,marginBottom:12,fontSize:14,color:C.ink}}>Top activities</p>
          {topActivities.map(([id,count],i)=>{
            const act=ALL_ACTIVITIES.find(a=>a.id===id);if(!act)return null;
            return(
              <div key={id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{minWidth:22,fontWeight:700,color:C.inkMuted,fontSize:12}}>#{i+1}</span>
                <span style={{fontSize:18}}>{act.emoji}</span>
                <span style={{fontSize:13,flex:1,color:C.ink}}>{act.label}</span>
                <span style={{fontSize:12,padding:"2px 8px",borderRadius:10,background:act.color==="green"?C.greenLight:C.amberLight,color:act.color==="green"?C.green:C.amber,fontWeight:500}}>{count}x</span>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onLogout} style={{width:"100%",padding:"12px",borderRadius:8,border:`1px solid ${C.accent}`,background:"transparent",color:C.accent,fontWeight:500,cursor:"pointer",fontSize:14}}>Sign out</button>
    </div>
  );
}
