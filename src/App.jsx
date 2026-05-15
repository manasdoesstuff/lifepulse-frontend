import { useState, useEffect, useRef, useCallback } from "react";

const API = "https://lifepulse-backend-production-3e50.up.railway.app/api";
const PUSHER_KEY = "YOUR_PUSHER_KEY"; // replace after setup
const PUSHER_CLUSTER = "ap2"; // replace with your cluster

const themes = {
  light: {
    bg:"#F5F0E8",bgDark:"#EDE7D9",ink:"#1A1A18",inkLight:"#3D3D38",
    inkMuted:"#7A7A72",green:"#2D6A4F",greenLight:"#D8F3DC",greenMid:"#52B788",
    amber:"#B5621A",amberLight:"#FFE8CC",amberMid:"#F4A261",
    accent:"#C84B31",border:"#D6CFBF",card:"#FDFAF3",nav:"rgba(245,240,232,0.95)",
    tabActive:"#3D3D38",tabBg:"#FFFEF9",
  },
  dark: {
    bg:"#131210",bgDark:"#1C1B18",ink:"#F0EBE0",inkLight:"#D4CEBC",
    inkMuted:"#8A8A7A",green:"#52B788",greenLight:"#1A3328",greenMid:"#52B788",
    amber:"#F4A261",amberLight:"#2A1F0F",amberMid:"#F4A261",
    accent:"#E8725A",border:"#2E2D2A",card:"#1E1D1A",nav:"rgba(13,12,10,0.95)",
    tabActive:"#F0EBE0",tabBg:"#1A1918",
  }
};

const ACTIVITIES_GROWTH = [
  {id:"workout",emoji:"💪",label:"Working out",cat:"growth"},
  {id:"reading",emoji:"📖",label:"Reading",cat:"growth"},
  {id:"cooking",emoji:"🍳",label:"Cooking",cat:"growth"},
  {id:"outdoors",emoji:"🌿",label:"Touching grass",cat:"growth"},
  {id:"creating",emoji:"🎨",label:"Creating",cat:"growth"},
  {id:"deepwork",emoji:"💼",label:"Deep work",cat:"growth"},
  {id:"wellness",emoji:"🧘",label:"Wellness",cat:"growth"},
  {id:"building",emoji:"🛠",label:"Building",cat:"growth"},
  {id:"learning",emoji:"🌱",label:"Learning",cat:"growth"},
  {id:"volunteering",emoji:"🤝",label:"Volunteering",cat:"growth"},
];
const ACTIVITIES_VIBE = [
  {id:"doomscroll",emoji:"📱",label:"Doomscrolling",cat:"vibe"},
  {id:"gaming",emoji:"🎮",label:"Gaming",cat:"vibe"},
  {id:"binge",emoji:"📺",label:"Binge-watching",cat:"vibe"},
  {id:"napping",emoji:"😴",label:"Procrastinating",cat:"vibe"},
  {id:"junkfood",emoji:"🍕",label:"Junk food",cat:"vibe"},
  {id:"groupchat",emoji:"💬",label:"Gossip",cat:"vibe"},
];
const ALL_ACTS=[...ACTIVITIES_GROWTH,...ACTIVITIES_VIBE];

const MONTHLY_CHALLENGES = [
  {id:1,emoji:"🌿",title:"Touch Grass",desc:"Post yourself outdoors",activityId:"outdoors"},
  {id:2,emoji:"🍳",title:"Chef Mode",desc:"Cook something from scratch",activityId:"cooking"},
  {id:3,emoji:"💪",title:"PR Day",desc:"Post a workout milestone",activityId:"workout"},
  {id:4,emoji:"📖",title:"Book Nerd",desc:"Share what you're reading",activityId:"reading"},
  {id:5,emoji:"🎨",title:"Make Something",desc:"Post a creative project",activityId:"creating"},
  {id:6,emoji:"🧘",title:"Zen Mode",desc:"Log a meditation session",activityId:"wellness"},
  {id:7,emoji:"🛠",title:"Fix It",desc:"Post a DIY task completed",activityId:"building"},
  {id:8,emoji:"🌱",title:"Learn Something",desc:"Post about a new skill",activityId:"learning"},
];

// ── Storage helpers ───────────────────────────────────────────────────────────
const store = {
  get: (k,fb=null) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } },
  set: (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} },
  del: (k) => localStorage.removeItem(k),
};
const getToken=()=>localStorage.getItem("hs_token");
const setToken=(t)=>localStorage.setItem("hs_token",t);
const clearAuth=()=>["hs_token","hs_refresh","hs_user","hs_rooms"].forEach(k=>localStorage.removeItem(k));

const apiFetch=async(path,opts={})=>{
  const token=getToken();
  const res=await fetch(`${API}${path}`,{
    ...opts,
    headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{}),...(opts.headers||{})},
  });
  if(res.status===401){
    const refresh=localStorage.getItem("hs_refresh");
    if(refresh){
      const r=await fetch(`${API}/auth/refresh`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refreshToken:refresh})});
      if(r.ok){const{accessToken}=await r.json();setToken(accessToken);return apiFetch(path,opts);}
    }
    clearAuth();window.location.reload();
  }
  return res;
};

const enc=(t)=>btoa(encodeURIComponent(t));
const dec=(c)=>{try{return decodeURIComponent(atob(c));}catch{return c;}};
const nonce=()=>btoa(Math.random().toString(36));
const uColor=(name)=>["#2D6A4F","#C84B31","#7B4F9E","#B5621A","#1A5276","#C17D3C"][name?.charCodeAt(0)%6]||"#3D3D38";
const ago=(date)=>{const s=Math.floor((Date.now()-new Date(date))/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;};
const f2b=(file)=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});

// ── Pusher hook ───────────────────────────────────────────────────────────────
const usePusher = (roomId, handlers) => {
  const channelRef = useRef(null);
  const pusherRef = useRef(null);

  useEffect(() => {
    if (!roomId || !PUSHER_KEY || PUSHER_KEY === "YOUR_PUSHER_KEY") return;
    let Pusher;
    import("https://js.pusher.com/8.2.0/pusher.min.js").then(() => {
      if (window.Pusher) {
        pusherRef.current = new window.Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
        channelRef.current = pusherRef.current.subscribe(`room-${roomId}`);
        Object.entries(handlers).forEach(([event, fn]) => {
          channelRef.current.bind(event, fn);
        });
      }
    }).catch(() => {});
    return () => {
      if (channelRef.current) channelRef.current.unbind_all();
      if (pusherRef.current) pusherRef.current.disconnect();
    };
  }, [roomId]);
};

// ── Push notifications ────────────────────────────────────────────────────────
const requestPushPermission = async () => {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const keyRes = await apiFetch("/notifications/vapid-key");
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });
    await apiFetch("/notifications/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub }) });
    return true;
  } catch { return false; }
};

// ── Pull to refresh ───────────────────────────────────────────────────────────
const usePullToRefresh = (onRefresh) => {
  const startY = useRef(0);
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY === 0) { setPulling(true); setDistance(Math.min(dy, 80)); }
  };
  const onTouchEnd = async () => {
    if (distance > 60) { await onRefresh(); }
    setPulling(false); setDistance(0);
  };
  return { pulling, distance, onTouchStart, onTouchMove, onTouchEnd };
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function HangSpace() {
  const [theme, setTheme] = useState(() => store.get("hs_theme","light"));
  const C = themes[theme];
  const toggleTheme = () => { const n=theme==="light"?"dark":"light"; setTheme(n); store.set("hs_theme",n); };

  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:${C.bg};font-family:'DM Sans',sans-serif;color:${C.ink};transition:background 0.3s;}
    ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
    .serif{font-family:'Playfair Display',serif;}
    .fade{animation:fadeUp 0.4s ease forwards;opacity:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
    .peel{animation:peel 0.45s cubic-bezier(.16,1,.3,1) forwards;opacity:0;}
    @keyframes peel{from{opacity:0;transform:translateY(28px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
    .shimmer{background:linear-gradient(90deg,${C.bgDark} 25%,${C.border} 50%,${C.bgDark} 75%);background-size:200% 100%;animation:sh 1.5s infinite;}
    @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .confetti{animation:cf 0.8s ease forwards;}
    @keyframes cf{0%{transform:scale(0);opacity:1}100%{transform:scale(3);opacity:0}}
    button{cursor:pointer;font-family:'DM Sans',sans-serif;}
    input,textarea{font-family:'DM Sans',sans-serif;}
    .tab-btn:focus{outline:none;}
  `;

  const [user, setUser] = useState(() => store.get("hs_user", null));
  const [rooms, setRooms] = useState(() => store.get("hs_rooms", []));
  const [activeRoom, setActiveRoom] = useState(() => store.get("hs_rooms",[])[0]||null);
  const [activeTab, setActiveTab] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [search, setSearch] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Real-time Pusher
  usePusher(activeRoom?.id, {
    "new-post": (data) => { if (data.post) setPosts(p => [data.post, ...p.filter(x => x.id !== data.post.id)]); },
    "reaction": (data) => {
      setPosts(p => p.map(post => {
        if (post.id !== data.postId) return post;
        const reactions = (post.reactions||[]).filter(r => !(r.userId===data.userId && r.emoji===data.emoji));
        if (data.action==="added") reactions.push({ userId:data.userId, emoji:data.emoji });
        return { ...post, reactions };
      }));
    },
    "new-message": (msg) => { setChatMessages(m => [...m, msg]); },
  });

  useEffect(() => { if (activeRoom?.id) fetchPosts(); }, [activeRoom?.id]);

  const fetchPosts = async () => {
    if (!activeRoom?.id) return;
    setLoadingPosts(true);
    try { const r=await apiFetch(`/posts/room/${activeRoom.id}`); if(r.ok){const d=await r.json();setPosts(d.posts||[]);} }
    catch {} finally { setLoadingPosts(false); }
  };

  const ptr = usePullToRefresh(fetchPosts);

  const handleAuth = (u) => { setUser(u); store.set("hs_user",u); };
  const handleRoomJoined = (r) => {
    const updated = [...rooms.filter(x=>x.id!==r.id), r];
    setRooms(updated); store.set("hs_rooms",updated); setActiveRoom(r);
  };
  const handleLeaveRoom = async (roomId) => {
    const room = rooms.find(r=>r.id===roomId);
    const isCreator = room?.creatorId === user?.id;
    const msg = isCreator ? "You're the creator — leaving will DELETE this space for everyone. Continue?" : "Leave this space?";
    if (!confirm(msg)) return;
    const res = await apiFetch(`/rooms/${roomId}/leave`, {method:"DELETE"});
    if (res.ok) {
      const updated = rooms.filter(r=>r.id!==roomId);
      setRooms(updated); store.set("hs_rooms",updated);
      setActiveRoom(updated[0]||null);
    }
  };
  const handlePost = (post) => { setPosts(p=>[post,...p]); setConfetti(true); setTimeout(()=>setConfetti(false),1000); };
  const handleDeletePost = (id) => setPosts(p=>p.filter(x=>x.id!==id));
  const handleEditPost = (id, cap) => setPosts(p=>p.map(x=>x.id===id?{...x,encryptedCaption:enc(cap)}:x));
  const handleLogout = () => { clearAuth(); setUser(null); setRooms([]); setActiveRoom(null); };
  const handleRegenCode = (code) => {
    const updated = rooms.map(r=>r.id===activeRoom.id?{...r,joinCode:code}:r);
    setRooms(updated); store.set("hs_rooms",updated); setActiveRoom(r=>({...r,joinCode:code}));
  };

  const enableNotifications = async () => {
    const ok = await requestPushPermission();
    setNotifEnabled(ok);
    if (!ok) alert("Notifications blocked. Enable them in your browser/phone settings.");
  };

  const filteredPosts = search.trim()
    ? posts.filter(p => {
        const cap = dec(p.encryptedCaption).toLowerCase();
        const act = ALL_ACTS.find(a=>a.id===p.activityId);
        return cap.includes(search.toLowerCase()) || act?.label.toLowerCase().includes(search.toLowerCase()) || p.user?.username.toLowerCase().includes(search.toLowerCase());
      })
    : posts;

  if (!user) return <><style>{S}</style><AuthScreen C={C} onAuth={handleAuth}/></>;
  if (!activeRoom || rooms.length===0) return <><style>{S}</style><RoomSetupScreen C={C} user={user} onRoomJoined={handleRoomJoined} onLogout={handleLogout}/></>;

  const TABS = [
    {id:"feed",label:"Feed",emoji:"🏠"},
    {id:"chat",label:"Chat",emoji:"💬"},
    {id:"challenges",label:"Goals",emoji:"🏆"},
    {id:"stats",label:"Stats",emoji:"📊"},
    {id:"profile",label:"You",emoji:"👤"},
  ];

  return (
    <>
      <style>{S}</style>
      <div style={{minHeight:"100vh",background:C.bg,paddingBottom:76}}>
        {/* Pull-to-refresh indicator */}
        {ptr.pulling && (
          <div style={{position:"fixed",top:0,left:0,right:0,zIndex:200,display:"flex",justifyContent:"center",paddingTop:Math.max(0,ptr.distance-20),transition:"padding 0.1s"}}>
            <div style={{background:C.card,borderRadius:20,padding:"6px 16px",fontSize:12,color:C.inkMuted,border:`1px solid ${C.border}`,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>
              {ptr.distance>60?"Release to refresh ✓":"Pull to refresh"}
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{position:"sticky",top:0,zIndex:100,background:C.nav,backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <img src="/icon-192.png" style={{width:28,height:28,borderRadius:8}} onError={e=>e.target.style.display="none"}/>
            <h1 className="serif" style={{fontSize:19,fontWeight:900,color:C.ink}}>HangSpace</h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <button onClick={()=>setShowRoomPicker(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bgDark,color:C.ink,fontSize:12,fontWeight:500,cursor:"pointer",maxWidth:130}}>
              <span style={{fontSize:13}}>{activeRoom?.emoji||"🪐"}</span>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeRoom?.name}</span>
              <span style={{fontSize:9,color:C.inkMuted}}>▼</span>
            </button>
            <button onClick={toggleTheme} style={{background:C.bgDark,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 8px",fontSize:13,cursor:"pointer",color:C.ink}}>
              {theme==="light"?"🌙":"☀️"}
            </button>
            {!notifEnabled && (
              <button onClick={enableNotifications} title="Enable notifications" style={{background:C.bgDark,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 8px",fontSize:13,cursor:"pointer"}}>🔔</button>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          style={{maxWidth:560,margin:"0 auto",padding:"14px 14px 0"}}
          onTouchStart={activeTab==="feed"?ptr.onTouchStart:undefined}
          onTouchMove={activeTab==="feed"?ptr.onTouchMove:undefined}
          onTouchEnd={activeTab==="feed"?ptr.onTouchEnd:undefined}
        >
          {activeTab==="feed" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <h2 className="serif" style={{fontSize:22,color:C.ink}}>{activeRoom?.name}</h2>
                <button onClick={fetchPosts} style={{background:"none",border:"none",fontSize:17,cursor:"pointer",color:C.inkMuted}}>↻</button>
              </div>
              <div style={{position:"relative",marginBottom:14}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.inkMuted}}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search posts..." style={{width:"100%",padding:"8px 10px 8px 30px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bgDark,fontSize:13,outline:"none",color:C.ink}}/>
                {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:13,cursor:"pointer",color:C.inkMuted}}>✕</button>}
              </div>
              {loadingPosts
                ? [1,2,3].map(i=><div key={i} className="shimmer" style={{height:180,borderRadius:14,marginBottom:14}}/>)
                : filteredPosts.length===0
                  ? <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"36px 20px",textAlign:"center"}}>
                      <div style={{fontSize:44,marginBottom:10}}>{search?"🔍":"📭"}</div>
                      <h3 className="serif" style={{fontSize:18,marginBottom:6,color:C.ink}}>{search?"No results":"No posts yet"}</h3>
                      <p style={{color:C.inkMuted,fontSize:13}}>Tap + to post something!</p>
                    </div>
                  : filteredPosts.map((post,i)=><PostCard key={post.id} post={post} index={i} C={C} currentUserId={user.id} onDelete={handleDeletePost} onEdit={handleEditPost}/>)
              }
            </div>
          )}
          {activeTab==="chat" && <ChatRoom C={C} room={activeRoom} user={user} messages={chatMessages} setMessages={setChatMessages}/>}
          {activeTab==="challenges" && <ChallengesPage C={C} room={activeRoom} posts={posts}/>}
          {activeTab==="stats" && <StatsPage C={C} roomId={activeRoom?.id} currentUser={user} posts={posts}/>}
          {activeTab==="profile" && <ProfilePage C={C} user={user} posts={posts} rooms={rooms} activeRoom={activeRoom} onLogout={handleLogout} onLeaveRoom={handleLeaveRoom} onRoomJoined={handleRoomJoined} onSwitchRoom={r=>{setActiveRoom(r);store.set("hs_rooms",rooms);setActiveTab("feed");}} onRegenCode={handleRegenCode}/>}
        </div>

        {confetti && <div style={{position:"fixed",top:"40%",left:"50%",transform:"translate(-50%,-50%)",fontSize:56,zIndex:2000,pointerEvents:"none"}} className="confetti">🎉</div>}

        {activeTab==="feed" && (
          <button onClick={()=>setShowComposer(true)} style={{position:"fixed",bottom:86,right:18,width:52,height:52,borderRadius:26,background:C.ink,border:"none",color:"white",fontSize:26,cursor:"pointer",boxShadow:"0 4px 14px rgba(0,0,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        )}

        {/* Bottom nav */}
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.tabBg,borderTop:`1px solid ${C.border}`,display:"flex",padding:"6px 0 12px"}}>
          {TABS.map(tab=>(
            <button key={tab.id} className="tab-btn" onClick={()=>setActiveTab(tab.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"5px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:17,opacity:activeTab===tab.id?1:0.4}}>{tab.emoji}</span>
              <span style={{fontSize:9,fontWeight:activeTab===tab.id?600:400,color:activeTab===tab.id?C.tabActive:C.inkMuted}}>{tab.label}</span>
              {activeTab===tab.id && <div style={{width:16,height:2,borderRadius:1,background:C.tabActive,marginTop:1}}/>}
            </button>
          ))}
        </div>

        {showComposer && <PostComposer C={C} roomId={activeRoom?.id} user={user} onPost={handlePost} onClose={()=>setShowComposer(false)}/>}
        {showRoomPicker && <RoomPicker C={C} rooms={rooms} activeRoom={activeRoom} onSelect={r=>{setActiveRoom(r);setActiveTab("feed");setShowRoomPicker(false);}} onClose={()=>setShowRoomPicker(false)} onAdd={()=>{setShowRoomPicker(false);setActiveTab("profile");}}/>}
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
      const body=mode==="register"
        ?{username:username.trim(),password,publicKey:btoa(Math.random().toString(36).repeat(3)),encryptedPrivateKey:btoa(Math.random().toString(36).repeat(3))}
        :{username:username.trim(),password};
      const res=await apiFetch(`/auth/${mode}`,{method:"POST",body:JSON.stringify(body)});
      const data=await res.json();
      if(!res.ok)return setError(data.error||"Failed");
      setToken(data.accessToken);localStorage.setItem("hs_refresh",data.refreshToken);store.set("hs_user",data.user);
      onAuth(data.user);
    }catch{setError("Network error — check your connection");}
    finally{setLoading(false);}
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div className="fade" style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <img src="/icon-192.png" style={{width:72,height:72,borderRadius:18,marginBottom:14}} onError={e=>{e.target.style.display="none";}}/>
          <h1 className="serif" style={{fontSize:38,fontWeight:900,letterSpacing:-1,color:C.ink}}>HangSpace</h1>
          <p style={{color:C.inkMuted,marginTop:6,fontSize:15}}>Your private corner of the internet.</p>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 22px"}}>
          <div style={{display:"flex",gap:8,marginBottom:22}}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"9px",borderRadius:8,border:`1px solid ${mode===m?C.ink:C.border}`,background:mode===m?C.ink:C.bg,color:mode===m?"white":C.ink,fontWeight:500,fontSize:13,cursor:"pointer",transition:"all 0.15s"}}>
                {m==="login"?"Sign in":"Create account"}
              </button>
            ))}
          </div>
          {error&&<div style={{padding:"9px 12px",borderRadius:8,background:"#FEE2E2",color:"#C84B31",fontSize:13,marginBottom:12}}>{error}</div>}
          {[["Username","text",username,setUsername,"e.g. maya_runs"],["Password","password",password,setPassword,"Min 8 characters"]].map(([label,type,val,setter,ph])=>(
            <div key={label} style={{marginBottom:14}}>
              <label style={{fontSize:12,color:C.inkMuted,display:"block",marginBottom:5}}>{label}</label>
              <input type={type} value={val} onChange={e=>setter(e.target.value)} placeholder={ph} onKeyDown={e=>e.key==="Enter"&&submit()} style={{width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,fontSize:14,outline:"none",color:C.ink}}/>
            </div>
          ))}
          <button onClick={submit} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:C.ink,color:"white",fontWeight:500,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1}}>
            {loading?"Loading...":(mode==="login"?"Sign in →":"Create account →")}
          </button>
        </div>
        <p style={{textAlign:"center",fontSize:11,color:C.inkMuted,marginTop:16}}>🔒 End-to-end encrypted · Zero server-side knowledge</p>
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
    if(!roomName.trim())return setError("Enter a name");
    setLoading(true);setError("");
    try{
      const res=await apiFetch("/rooms",{method:"POST",body:JSON.stringify({name:roomName.trim(),emoji:"🪐",encryptedRoomKey:btoa("key_"+Math.random())})});
      const data=await res.json();if(!res.ok)return setError(data.error||"Failed");
      onRoomJoined(data.room);
    }catch{setError("Network error");}finally{setLoading(false);}
  };
  const joinRoom=async()=>{
    if(!joinCode.trim())return setError("Enter a code");
    setLoading(true);setError("");
    try{
      const res=await apiFetch("/rooms/join",{method:"POST",body:JSON.stringify({joinCode:joinCode.trim().toUpperCase(),encryptedRoomKey:btoa("key_"+Math.random())})});
      const data=await res.json();if(!res.ok)return setError(data.error||"Failed");
      onRoomJoined(data.room);
    }catch{setError("Network error");}finally{setLoading(false);}
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div className="fade" style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <img src="/icon-192.png" style={{width:64,height:64,borderRadius:16,marginBottom:12}} onError={e=>e.target.style.display="none"}/>
          <h1 className="serif" style={{fontSize:30,fontWeight:900,color:C.ink}}>Hey, {user.username}!</h1>
          <p style={{color:C.inkMuted,marginTop:6}}>Create a space or join one.</p>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 22px"}}>
          {error&&<div style={{padding:"9px 12px",borderRadius:8,background:"#FEE2E2",color:"#C84B31",fontSize:13,marginBottom:12}}>{error}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
            {[["create","🏠","Create space"],["join","🔑","Join space"]].map(([id,emoji,label])=>(
              <button key={id} onClick={()=>{setAction(id);setError("");}} style={{padding:"18px 14px",borderRadius:12,border:`2px solid ${action===id?C.ink:C.border}`,background:action===id?C.ink:C.bg,color:action===id?"white":C.ink,cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <div style={{fontSize:26,marginBottom:6}}>{emoji}</div>
                <div style={{fontWeight:600,fontSize:13}}>{label}</div>
              </button>
            ))}
          </div>
          {action==="create"&&<div>
            <input value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="Space name e.g. The Homies" style={{width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,fontSize:14,outline:"none",color:C.ink,marginBottom:10}} onKeyDown={e=>e.key==="Enter"&&createRoom()}/>
            <button onClick={createRoom} disabled={loading} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:C.ink,color:"white",fontWeight:500,cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1}}>{loading?"Creating...":"Create Space 🏠"}</button>
          </div>}
          {action==="join"&&<div>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="e.g. FLAME-7293" style={{width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,fontSize:14,outline:"none",color:C.ink,marginBottom:10,textTransform:"uppercase",letterSpacing:1}} onKeyDown={e=>e.key==="Enter"&&joinRoom()}/>
            <button onClick={joinRoom} disabled={loading} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:C.ink,color:"white",fontWeight:500,cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1}}>{loading?"Joining...":"Join Space 🔑"}</button>
          </div>}
        </div>
        <button onClick={onLogout} style={{width:"100%",marginTop:10,padding:"9px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.inkMuted,fontSize:13,cursor:"pointer"}}>Sign out</button>
      </div>
    </div>
  );
}

// ── Room Picker ───────────────────────────────────────────────────────────────
function RoomPicker({C,rooms,activeRoom,onSelect,onClose,onAdd}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:560,background:C.bg,borderRadius:"20px 20px 0 0",padding:"18px 18px 36px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 className="serif" style={{fontSize:18,color:C.ink}}>Your spaces</h3>
          <button onClick={onClose} style={{background:C.bgDark,border:"none",borderRadius:20,padding:"4px 10px",cursor:"pointer",color:C.ink}}>✕</button>
        </div>
        {rooms.map(r=>(
          <button key={r.id} onClick={()=>onSelect(r)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:12,border:`1px solid ${activeRoom?.id===r.id?C.ink:C.border}`,background:activeRoom?.id===r.id?C.ink:C.card,color:activeRoom?.id===r.id?"white":C.ink,marginBottom:7,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
            <span style={{fontSize:22}}>{r.emoji||"🪐"}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13}}>{r.name}</div>
              <div style={{fontSize:11,opacity:0.6}}>{r.members?.length||0} members</div>
            </div>
            {activeRoom?.id===r.id&&<span>✓</span>}
          </button>
        ))}
        <button onClick={onAdd} style={{width:"100%",padding:"11px",borderRadius:12,border:`1px dashed ${C.border}`,background:"transparent",color:C.inkMuted,fontSize:13,cursor:"pointer",marginTop:4}}>
          + Join or create another space
        </button>
      </div>
    </div>
  );
}

// ── Carousel ──────────────────────────────────────────────────────────────────
function Carousel({urls,C}){
  const[idx,setIdx]=useState(0);
  const valid=(urls||[]).filter(u=>u&&u!=="placeholder");
  if(!valid.length)return null;
  return(
    <div style={{position:"relative",marginBottom:12,borderRadius:12,overflow:"hidden",background:C.bgDark}}>
      <img src={valid[idx]} alt="post" style={{width:"100%",maxHeight:270,objectFit:"cover",display:"block"}} onError={e=>e.target.style.display="none"}/>
      {valid.length>1&&<>
        <button onClick={()=>setIdx(i=>(i-1+valid.length)%valid.length)} style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.45)",border:"none",borderRadius:"50%",width:28,height:28,color:"white",fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <button onClick={()=>setIdx(i=>(i+1)%valid.length)} style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.45)",border:"none",borderRadius:"50%",width:28,height:28,color:"white",fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        <div style={{position:"absolute",bottom:7,left:"50%",transform:"translateX(-50%)",display:"flex",gap:4}}>
          {valid.map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:i===idx?"white":"rgba(255,255,255,0.4)"}}/>)}
        </div>
        <div style={{position:"absolute",top:7,right:7,background:"rgba(0,0,0,0.4)",borderRadius:5,padding:"2px 7px",fontSize:10,color:"white"}}>{idx+1}/{valid.length}</div>
      </>}
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({post,index,C,currentUserId,onDelete,onEdit}){
  const[reactions,setReactions]=useState(()=>{const g={};(post.reactions||[]).forEach(r=>{g[r.emoji]=(g[r.emoji]||0)+1;});return g;});
  const[myReactions,setMyReactions]=useState(()=>{const s=new Set();(post.reactions||[]).forEach(r=>{if(r.userId===currentUserId)s.add(r.emoji);});return s;});
  const[showMenu,setShowMenu]=useState(false);
  const[editing,setEditing]=useState(false);
  const[editVal,setEditVal]=useState("");

  const react=async(emoji)=>{
    const had=myReactions.has(emoji);
    setReactions(r=>{const u={...r};had?(u[emoji]=(u[emoji]||1)-1,u[emoji]<=0&&delete u[emoji]):(u[emoji]=(u[emoji]||0)+1);return u;});
    setMyReactions(m=>{const n=new Set(m);had?n.delete(emoji):n.add(emoji);return n;});
    await apiFetch(`/posts/${post.id}/react`,{method:"POST",body:JSON.stringify({emoji})});
  };

  const act=ALL_ACTS.find(a=>a.id===post.activityId);
  const isGrowth=act?.cat==="growth";
  const isOwn=post.userId===currentUserId||post.user?.id===currentUserId;
  const caption=dec(post.encryptedCaption);

  return(
    <div className="peel" style={{animationDelay:`${index*55}ms`,marginBottom:14}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:11}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:uColor(post.user?.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:12}}>
              {post.user?.username?.[0]?.toUpperCase()||"?"}
            </div>
            <div>
              <div style={{fontWeight:600,fontSize:13,color:C.ink}}>{post.user?.username}</div>
              <div style={{fontSize:10,color:C.inkMuted}}>{ago(post.createdAt)}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:20,background:isGrowth?C.greenLight:C.amberLight,color:isGrowth?C.green:C.amber,fontSize:11,fontWeight:500}}>
              {act?.emoji} {act?.label||post.activityId}
            </span>
            {isOwn&&<div style={{position:"relative"}}>
              <button onClick={()=>setShowMenu(m=>!m)} style={{background:"none",border:"none",fontSize:15,cursor:"pointer",color:C.inkMuted,padding:"3px 5px"}}>⋯</button>
              {showMenu&&<div style={{position:"absolute",right:0,top:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"4px",zIndex:10,minWidth:130,boxShadow:"0 4px 16px rgba(0,0,0,0.12)"}}>
                <button onClick={()=>{setEditVal(caption);setEditing(true);setShowMenu(false);}} style={{width:"100%",padding:"7px 11px",border:"none",background:"none",color:C.ink,fontSize:12,cursor:"pointer",textAlign:"left",borderRadius:6}}>✏️ Edit caption</button>
                <button onClick={async()=>{setShowMenu(false);if(confirm("Delete this post?")){const r=await apiFetch(`/posts/${post.id}`,{method:"DELETE"});if(r.ok)onDelete(post.id);}}} style={{width:"100%",padding:"7px 11px",border:"none",background:"none",color:C.accent,fontSize:12,cursor:"pointer",textAlign:"left",borderRadius:6}}>🗑️ Delete</button>
              </div>}
            </div>}
          </div>
        </div>

        <Carousel urls={post.mediaUrls||[]} C={C}/>

        {editing?(
          <div style={{marginBottom:10}}>
            <textarea value={editVal} onChange={e=>setEditVal(e.target.value)} rows={2} style={{width:"100%",padding:"9px 11px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bgDark,fontSize:13,outline:"none",resize:"vertical",fontFamily:"DM Sans,sans-serif",color:C.ink,marginBottom:7}}/>
            <div style={{display:"flex",gap:7}}>
              <button onClick={()=>{onEdit(post.id,editVal);setEditing(false);}} style={{flex:1,padding:"7px",borderRadius:7,border:"none",background:C.green,color:"white",fontSize:12,cursor:"pointer"}}>Save</button>
              <button onClick={()=>setEditing(false)} style={{flex:1,padding:"7px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:C.ink,fontSize:12,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        ):<p style={{fontSize:13,lineHeight:1.6,color:C.inkLight,marginBottom:11}}>{caption}</p>}

        <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
          {Object.entries(reactions).map(([emoji,count])=>(
            <button key={emoji} onClick={()=>react(emoji)} style={{padding:"3px 9px",borderRadius:20,border:`1.5px solid ${myReactions.has(emoji)?C.green:C.border}`,background:myReactions.has(emoji)?C.greenLight:C.bgDark,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:3,color:C.ink,transition:"all 0.15s"}}>
              {emoji}<span style={{fontWeight:600,fontSize:11}}>{count}</span>
            </button>
          ))}
          {["❤️","🔥","😭","🤯","🎉"].filter(e=>!reactions[e]).map(e=>(
            <button key={e} onClick={()=>react(e)} style={{padding:"3px 7px",borderRadius:20,border:`1px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.inkMuted}}>{e}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Post Composer ─────────────────────────────────────────────────────────────
function PostComposer({C,roomId,user,onPost,onClose}){
  const[selectedAct,setSelectedAct]=useState(null);
  const[tab,setTab]=useState("growth");
  const[posting,setPosting]=useState(false);
  const[error,setError]=useState("");
  const[mediaFiles,setMediaFiles]=useState([]);
  const[mediaSource,setMediaSource]=useState(null);
  const fileRef=useRef();
  const camRef=useRef();

  const handleFiles=(e,src)=>{
    const files=Array.from(e.target.files).slice(0,10);
    if(!files.length)return;
    setMediaFiles(files);setMediaSource(src);
  };

  const handlePost=async()=>{
    if(!selectedAct)return setError("Select a vibe");
    setPosting(true);setError("");
    try{
      let mediaUrls=[];
      for(const file of mediaFiles){
        const ur=await apiFetch("/posts/upload-url",{method:"POST",body:JSON.stringify({roomId,filename:file.name,contentType:file.type})});
        if(ur.ok){const{uploadUrl,publicUrl}=await ur.json();await fetch(uploadUrl,{method:"PUT",body:file,headers:{"Content-Type":file.type}});mediaUrls.push(publicUrl);}
      }
      const act=ALL_ACTS.find(a=>a.id===selectedAct);
      const res=await apiFetch("/posts",{method:"POST",body:JSON.stringify({
        roomId,activityId:selectedAct,activityCategory:act?.cat||"vibe",
        encryptedCaption:enc(act?`${act.emoji} ${act.label}`:"📸"),
        encryptedNonce:nonce(),
        mediaUrls:mediaUrls.length>0?mediaUrls:["placeholder"],mediaType:"photo",
      })});
      const data=await res.json();
      if(!res.ok)return setError(data.error||"Failed to post");
      onPost(data.post);onClose();
    }catch{setError("Network error");}finally{setPosting(false);}
  };

  const acts=tab==="growth"?ACTIVITIES_GROWTH:ACTIVITIES_VIBE;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000}}>
      <div className="fade" style={{width:"100%",maxWidth:560,background:C.bg,borderRadius:"22px 22px 0 0",padding:"22px 18px 34px",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h2 className="serif" style={{fontSize:21,color:C.ink}}>New post</h2>
          <button onClick={onClose} style={{background:C.bgDark,border:"none",borderRadius:20,padding:"5px 11px",cursor:"pointer",color:C.ink}}>✕</button>
        </div>
        {error&&<div style={{padding:"9px 12px",borderRadius:8,background:"#FEE2E2",color:"#C84B31",fontSize:12,marginBottom:11}}>{error}</div>}

        {/* Media */}
        <div style={{marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
            <button onClick={()=>camRef.current.click()} style={{padding:"14px",borderRadius:11,border:`2px dashed ${mediaSource==="cam"?C.green:C.border}`,background:mediaSource==="cam"?C.greenLight:C.bgDark,color:mediaSource==="cam"?C.green:C.ink,cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
              <div style={{fontSize:26,marginBottom:4}}>📷</div>
              <div style={{fontSize:12,fontWeight:500}}>Take photo</div>
            </button>
            <button onClick={()=>fileRef.current.click()} style={{padding:"14px",borderRadius:11,border:`2px dashed ${mediaSource==="file"?C.green:C.border}`,background:mediaSource==="file"?C.greenLight:C.bgDark,color:mediaSource==="file"?C.green:C.ink,cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
              <div style={{fontSize:26,marginBottom:4}}>🖼️</div>
              <div style={{fontSize:12,fontWeight:500}}>Choose files</div>
            </button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={e=>handleFiles(e,"cam")} style={{display:"none"}}/>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={e=>handleFiles(e,"file")} style={{display:"none"}}/>
          {mediaFiles.length>0&&(
            <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:4}}>
              {mediaFiles.map((f,i)=>(
                <div key={i} style={{width:52,height:52,borderRadius:8,overflow:"hidden",flexShrink:0,border:`1px solid ${C.border}`,position:"relative"}}>
                  <img src={URL.createObjectURL(f)} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="preview"/>
                  {i===0&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.45)",fontSize:8,color:"white",textAlign:"center"}}>cover</div>}
                </div>
              ))}
              <button onClick={()=>{setMediaFiles([]);setMediaSource(null);}} style={{width:52,height:52,borderRadius:8,border:`1px dashed ${C.border}`,background:"transparent",color:C.inkMuted,fontSize:16,cursor:"pointer",flexShrink:0}}>✕</button>
            </div>
          )}
        </div>

        {/* Activity picker */}
        <p style={{fontSize:11,fontWeight:600,marginBottom:8,color:C.inkMuted,letterSpacing:0.5}}>WHAT'S THE VIBE?</p>
        <div style={{display:"flex",gap:7,marginBottom:9}}>
          {["growth","vibe"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"5px 13px",borderRadius:20,border:`1px solid ${C.border}`,background:tab===t?C.ink:C.bgDark,color:tab===t?"white":C.ink,fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}>
              {t==="growth"?"🌱 Growth":"✨ Vibe"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
          {acts.map(act=>(
            <button key={act.id} onClick={()=>setSelectedAct(act.id)} style={{padding:"6px 11px",borderRadius:20,border:`1.5px solid ${selectedAct===act.id?(act.cat==="growth"?C.green:C.amber):C.border}`,background:selectedAct===act.id?(act.cat==="growth"?C.greenLight:C.amberLight):C.bg,color:selectedAct===act.id?(act.cat==="growth"?C.green:C.amber):C.inkLight,fontSize:12,cursor:"pointer",transition:"all 0.15s",fontWeight:selectedAct===act.id?600:400}}>
              {act.emoji} {act.label}
            </button>
          ))}
        </div>

        <button onClick={handlePost} disabled={!selectedAct||posting} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:C.ink,color:"white",fontWeight:500,fontSize:14,cursor:!selectedAct||posting?"not-allowed":"pointer",opacity:!selectedAct||posting?0.6:1}}>
          {posting?"Posting...":"Share to space 🔒"}
        </button>
        <p style={{fontSize:10,color:C.inkMuted,textAlign:"center",marginTop:7}}>Encrypted before leaving your device</p>
      </div>
    </div>
  );
}

// ── Chat Room (real-time via Pusher) ──────────────────────────────────────────
function ChatRoom({C,room,user,messages,setMessages}){
  const[input,setInput]=useState("");
  const[sending,setSending]=useState(false);
  const bottomRef=useRef();

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const send=async()=>{
    if(!input.trim()||sending)return;
    setSending(true);
    const tempMsg={id:`temp-${Date.now()}`,userId:user.id,username:user.username,text:input.trim(),timestamp:new Date().toISOString(),temp:true};
    setMessages(m=>[...m,tempMsg]);
    setInput("");
    try{
      await apiFetch(`/chat/${room.id}`,{method:"POST",body:JSON.stringify({text:tempMsg.text})});
      // Pusher will deliver to others; remove temp flag
      setMessages(m=>m.map(x=>x.id===tempMsg.id?{...x,temp:false}:x));
    }catch{
      setMessages(m=>m.filter(x=>x.id!==tempMsg.id));
      setInput(tempMsg.text);
    }finally{setSending(false);}
  };

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 155px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <h2 className="serif" style={{fontSize:21,color:C.ink}}>Chat</h2>
        <span style={{fontSize:11,color:C.inkMuted,background:C.bgDark,padding:"2px 8px",borderRadius:10,border:`1px solid ${C.border}`}}>live · {room?.name}</span>
      </div>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:7,paddingBottom:4}}>
        {messages.length===0&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:C.inkMuted}}>
            <div style={{fontSize:38,marginBottom:8}}>💬</div>
            <p style={{fontSize:14}}>Start the conversation!</p>
            <p style={{fontSize:11,marginTop:4,opacity:0.7}}>Messages appear in real-time for everyone</p>
          </div>
        )}
        {messages.map(msg=>{
          const isMe=msg.userId===user.id;
          return(
            <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",opacity:msg.temp?0.6:1}}>
              {!isMe&&<span style={{fontSize:10,color:C.inkMuted,marginBottom:2,marginLeft:10}}>{msg.username}</span>}
              <div style={{maxWidth:"78%",padding:"9px 13px",borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",background:isMe?C.green:C.card,color:isMe?"white":C.ink,fontSize:13,lineHeight:1.5,border:`1px solid ${isMe?"transparent":C.border}`}}>
                {msg.text}
              </div>
              <span style={{fontSize:9,color:C.inkMuted,marginTop:2,marginLeft:isMe?0:10,marginRight:isMe?10:0}}>{ago(msg.timestamp)}</span>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:7,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Say something..." style={{flex:1,padding:"10px 13px",borderRadius:12,border:`1px solid ${C.border}`,background:C.bgDark,fontSize:13,outline:"none",color:C.ink}}/>
        <button onClick={send} disabled={!input.trim()||sending} style={{padding:"10px 16px",borderRadius:12,border:"none",background:C.ink,color:"white",fontSize:15,cursor:input.trim()&&!sending?"pointer":"not-allowed",opacity:input.trim()&&!sending?1:0.5}}>↑</button>
      </div>
    </div>
  );
}

// ── Challenges Page ───────────────────────────────────────────────────────────
function ChallengesPage({C,room,posts}){
  const now=new Date();
  const monthName=now.toLocaleString("default",{month:"long"});
  const challenge=MONTHLY_CHALLENGES[now.getMonth()%MONTHLY_CHALLENGES.length];
  const members=room?.members||[];
  const completions=members.map(m=>{
    const up=posts.filter(p=>(p.userId===m.userId||p.user?.id===m.userId)&&p.activityId===challenge.activityId);
    return{...m,completed:up.length>0};
  });
  const pct=members.length?Math.round((completions.filter(c=>c.completed).length/members.length)*100):0;

  return(
    <div style={{paddingBottom:40}}>
      <h2 className="serif" style={{fontSize:24,color:C.ink,marginBottom:4}}>{monthName}'s Challenge</h2>
      <p style={{color:C.inkMuted,fontSize:13,marginBottom:18}}>Complete it together this month!</p>
      <div style={{background:C.card,border:`2px solid ${C.green}`,borderRadius:18,padding:"22px",marginBottom:18,textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:10}}>{challenge.emoji}</div>
        <h3 className="serif" style={{fontSize:26,color:C.ink,marginBottom:6}}>{challenge.title}</h3>
        <p style={{color:C.inkMuted,fontSize:14,marginBottom:18}}>{challenge.desc}</p>
        <div style={{background:C.bgDark,borderRadius:10,padding:"14px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
            <span style={{fontSize:12,color:C.inkMuted}}>Group progress</span>
            <span style={{fontSize:12,fontWeight:600,color:C.green}}>{completions.filter(c=>c.completed).length}/{members.length}</span>
          </div>
          <div style={{height:10,borderRadius:5,background:C.border,overflow:"hidden"}}>
            <div style={{width:`${pct}%`,height:"100%",background:C.greenMid,borderRadius:5,transition:"width 1s ease"}}/>
          </div>
        </div>
        <p style={{fontSize:11,color:C.inkMuted}}>Post with <strong>{challenge.emoji} {ALL_ACTS.find(a=>a.id===challenge.activityId)?.label}</strong> to complete</p>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px",marginBottom:18}}>
        <p style={{fontWeight:600,marginBottom:14,fontSize:13,color:C.ink}}>Who's done it 🏆</p>
        {members.length===0?<p style={{color:C.inkMuted,fontSize:13}}>No members yet</p>:(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:9}}>
            {completions.map(m=>(
              <div key={m.userId} style={{textAlign:"center",padding:"11px 8px",background:m.completed?C.greenLight:C.bgDark,borderRadius:11,border:`1px solid ${m.completed?C.greenMid:C.border}`}}>
                <div style={{fontSize:22,marginBottom:4}}>{m.completed?"✅":"⏳"}</div>
                <div style={{fontWeight:500,fontSize:12,color:C.ink}}>{m.user?.username||"..."}</div>
                <div style={{fontSize:10,color:m.completed?C.green:C.inkMuted,marginTop:2}}>{m.completed?"Done!":"In progress"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px"}}>
        <p style={{fontWeight:600,marginBottom:12,fontSize:13,color:C.ink}}>All challenges</p>
        {MONTHLY_CHALLENGES.map((ch,i)=>{
          const isCur=ch.id===challenge.id;
          return(
            <div key={ch.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<MONTHLY_CHALLENGES.length-1?`1px solid ${C.border}`:"none",opacity:isCur?1:0.55}}>
              <span style={{fontSize:20}}>{ch.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:13,color:C.ink}}>{ch.title}</div>
                <div style={{fontSize:11,color:C.inkMuted}}>{ch.desc}</div>
              </div>
              {isCur&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:9,background:C.greenLight,color:C.green,fontWeight:600}}>Now</span>}
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
  const[exported,setExported]=useState(false);
  const recapRef=useRef();

  useEffect(()=>{
    apiFetch(`/stats/room/${roomId}/weekly`).then(r=>r.json()).then(d=>{setStats(d);setLoading(false);}).catch(()=>setLoading(false));
  },[roomId]);

  const exportImage=async()=>{
    // Simple canvas-based export
    try{
      const el=recapRef.current;
      const{default:h2c}=await import("https://esm.sh/html2canvas@1.4.1");
      const canvas=await h2c(el,{scale:2,useCORS:true,backgroundColor:C.bg});
      const link=document.createElement("a");link.download="hangspace-stats.png";link.href=canvas.toDataURL("image/png");
      document.body.appendChild(link);link.click();document.body.removeChild(link);
      setExported(true);setTimeout(()=>setExported(false),2000);
    }catch{
      // Fallback: open print dialog
      window.print();
    }
  };

  const myPosts=posts.filter(p=>p.userId===currentUser?.id||p.user?.id===currentUser?.id);
  const growthPosts=myPosts.filter(p=>p.activityCategory==="growth").length;
  const pct=myPosts.length?Math.round((growthPosts/myPosts.length)*100):0;

  if(loading)return<div className="shimmer" style={{height:180,borderRadius:14,margin:"16px 0"}}/>;

  return(
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h2 className="serif" style={{fontSize:22,color:C.ink}}>Your week 📊</h2>
        <button onClick={exportImage} style={{padding:"6px 11px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bgDark,color:C.ink,fontSize:12,cursor:"pointer"}}>
          {exported?"✓ Saved!":"📤 Export"}
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
        {[{l:"My posts",v:myPosts.length,e:"📸"},{l:"Growth",v:`${pct}%`,e:"🌱"}].map(s=>(
          <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:11,padding:"13px",textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.e}</div>
            <div style={{fontWeight:700,fontSize:20,color:C.ink}}>{s.v}</div>
            <div style={{fontSize:11,color:C.inkMuted,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div ref={recapRef}>
        {!stats?.stats?.length?(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"30px",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:8}}>📊</div>
            <p style={{color:C.inkMuted,fontSize:13}}>Post this week to see group stats!</p>
          </div>
        ):(
          <>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:12}}>
              <p style={{fontWeight:600,marginBottom:12,fontSize:12,color:C.inkMuted,letterSpacing:0.4}}>GROUP · GROWTH VS VIBE</p>
              {stats.stats.map(m=>(
                <div key={m.userId} style={{marginBottom:11}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:500,color:C.ink}}>{m.username}</span>
                    <span style={{fontSize:11,color:C.inkMuted}}>{m.productivePct}% 🌱</span>
                  </div>
                  <div style={{height:16,borderRadius:8,overflow:"hidden",background:C.amberLight,display:"flex"}}>
                    <div style={{width:`${m.productivePct}%`,background:C.greenMid,borderRadius:"8px 0 0 8px",transition:"width 1s ease"}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px"}}>
              <p style={{fontWeight:600,marginBottom:12,fontSize:12,color:C.inkMuted,letterSpacing:0.4}}>LEADERBOARD</p>
              {[...stats.stats].sort((a,b)=>b.productivePct-a.productivePct).map((m,i)=>(
                <div key={m.userId} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 0",borderBottom:i<stats.stats.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:16,minWidth:24}}>{i===0?"👑":`#${i+1}`}</span>
                  <div style={{width:26,height:26,borderRadius:"50%",background:uColor(m.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:10}}>{m.username?.[0]?.toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:12,color:C.ink}}>{m.username}</div>
                    <div style={{fontSize:10,color:C.inkMuted}}>{m.totalPosts} posts</div>
                  </div>
                  <span style={{fontWeight:700,color:m.productivePct>60?C.green:C.amber,fontSize:14}}>{m.productivePct}%</span>
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
function ProfilePage({C,user,posts,rooms,activeRoom,onLogout,onLeaveRoom,onRoomJoined,onSwitchRoom,onRegenCode}){
  const[showAdd,setShowAdd]=useState(false);
  const[addAct,setAddAct]=useState(null);
  const[roomName,setRoomName]=useState("");
  const[joinCode,setJoinCode]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const[copied,setCopied]=useState(false);

  const myPosts=posts.filter(p=>p.userId===user.id||p.user?.id===user.id);
  const ac={};myPosts.forEach(p=>{ac[p.activityId]=(ac[p.activityId]||0)+1;});
  const top=Object.entries(ac).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const pct=myPosts.length?Math.round((myPosts.filter(p=>p.activityCategory==="growth").length/myPosts.length)*100):0;
  const R=96,SW=8,r2=(R-SW)/2,circ=2*Math.PI*r2;

  const createRoom=async()=>{
    if(!roomName.trim())return setError("Enter a name");
    setLoading(true);setError("");
    try{const res=await apiFetch("/rooms",{method:"POST",body:JSON.stringify({name:roomName.trim(),emoji:"🪐",encryptedRoomKey:btoa("k"+Math.random())})});const d=await res.json();if(!res.ok)return setError(d.error);onRoomJoined(d.room);onSwitchRoom(d.room);setShowAdd(false);}
    catch{setError("Network error");}finally{setLoading(false);}
  };
  const joinRoom=async()=>{
    if(!joinCode.trim())return setError("Enter a code");
    setLoading(true);setError("");
    try{const res=await apiFetch("/rooms/join",{method:"POST",body:JSON.stringify({joinCode:joinCode.trim().toUpperCase(),encryptedRoomKey:btoa("k"+Math.random())})});const d=await res.json();if(!res.ok)return setError(d.error);onRoomJoined(d.room);onSwitchRoom(d.room);setShowAdd(false);}
    catch{setError("Network error");}finally{setLoading(false);}
  };

  const regenCode=async()=>{
    const res=await apiFetch(`/rooms/${activeRoom.id}/regen-code`,{method:"POST"});
    if(res.ok){const d=await res.json();onRegenCode(d.joinCode);}
  };

  return(
    <div style={{paddingBottom:40}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px",textAlign:"center",marginBottom:14}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:uColor(user.username),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:20,margin:"0 auto 10px"}}>{user.username?.[0]?.toUpperCase()}</div>
        <h2 className="serif" style={{fontSize:20,color:C.ink}}>{user.username}</h2>
        <div style={{display:"flex",justifyContent:"center",margin:"14px 0 5px"}}>
          <svg width={R} height={R} style={{transform:"rotate(-90deg)"}}>
            <circle cx={R/2} cy={R/2} r={r2} fill="none" stroke={C.bgDark} strokeWidth={SW}/>
            <circle cx={R/2} cy={R/2} r={r2} fill="none" stroke={C.greenMid} strokeWidth={SW} strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s ease"}}/>
          </svg>
        </div>
        <p style={{fontSize:12,fontWeight:600,color:C.green}}>{pct}% growth · all time</p>
        <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:12}}>
          {[{v:myPosts.length,l:"Posts"},{v:Object.keys(ac).length,l:"Activities"}].map(s=>(
            <div key={s.l} style={{textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:18,color:C.ink}}>{s.v}</div>
              <div style={{fontSize:10,color:C.inkMuted}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active room code */}
      {activeRoom&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:14}}>
          <p style={{fontWeight:600,marginBottom:10,fontSize:13,color:C.ink}}>Active space · {activeRoom.name}</p>
          <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
            <span style={{fontFamily:"monospace",fontSize:18,fontWeight:700,letterSpacing:2,color:C.accent}}>{activeRoom.joinCode}</span>
            <button onClick={()=>{navigator.clipboard?.writeText(activeRoom.joinCode);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{padding:"4px 11px",borderRadius:7,border:`1px solid ${C.border}`,background:C.bgDark,color:C.ink,fontSize:11,cursor:"pointer"}}>{copied?"✓":"Copy"}</button>
            {activeRoom.creatorId===user.id&&<button onClick={regenCode} style={{padding:"4px 11px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",color:C.ink,fontSize:11,cursor:"pointer"}}>↻ New code</button>}
          </div>
        </div>
      )}

      {/* Spaces */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{fontWeight:600,fontSize:13,color:C.ink}}>Your spaces ({rooms.length})</p>
          <button onClick={()=>setShowAdd(a=>!a)} style={{fontSize:11,padding:"4px 11px",borderRadius:7,border:`1px solid ${C.border}`,background:C.bgDark,color:C.ink,cursor:"pointer"}}>+ Add</button>
        </div>
        {showAdd&&(
          <div style={{background:C.bgDark,borderRadius:11,padding:"13px",marginBottom:12}}>
            {error&&<div style={{padding:"7px",borderRadius:7,background:"#FEE2E2",color:"#C84B31",fontSize:11,marginBottom:9}}>{error}</div>}
            <div style={{display:"flex",gap:7,marginBottom:9}}>
              {["create","join"].map(a=>(
                <button key={a} onClick={()=>setAddAct(a)} style={{flex:1,padding:"7px",borderRadius:7,border:`1px solid ${addAct===a?C.ink:C.border}`,background:addAct===a?C.ink:C.bg,color:addAct===a?"white":C.ink,fontSize:12,cursor:"pointer"}}>
                  {a==="create"?"🏠 Create":"🔑 Join"}
                </button>
              ))}
            </div>
            {addAct==="create"&&<div><input value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="Space name" style={{width:"100%",padding:"9px 11px",borderRadius:7,border:`1px solid ${C.border}`,background:C.bg,fontSize:12,outline:"none",color:C.ink,marginBottom:7}}/><button onClick={createRoom} disabled={loading} style={{width:"100%",padding:"8px",borderRadius:7,border:"none",background:C.ink,color:"white",fontSize:12,cursor:"pointer",opacity:loading?0.6:1}}>{loading?"...":"Create"}</button></div>}
            {addAct==="join"&&<div><input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="e.g. FLAME-7293" style={{width:"100%",padding:"9px 11px",borderRadius:7,border:`1px solid ${C.border}`,background:C.bg,fontSize:12,outline:"none",color:C.ink,marginBottom:7,textTransform:"uppercase"}}/><button onClick={joinRoom} disabled={loading} style={{width:"100%",padding:"8px",borderRadius:7,border:"none",background:C.ink,color:"white",fontSize:12,cursor:"pointer",opacity:loading?0.6:1}}>{loading?"...":"Join"}</button></div>}
          </div>
        )}
        {rooms.map(r=>(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:10,background:activeRoom?.id===r.id?C.greenLight:C.bgDark,marginBottom:7,border:`1px solid ${activeRoom?.id===r.id?C.greenMid:C.border}`,cursor:"pointer"}} onClick={()=>onSwitchRoom(r)}>
            <span style={{fontSize:18}}>{r.emoji||"🪐"}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:12,color:C.ink}}>{r.name}</div>
              <div style={{fontSize:10,color:C.inkMuted}}>{r.members?.length||0} members · {r.creatorId===user.id?"creator":"member"}</div>
            </div>
            <button onClick={e=>{e.stopPropagation();onLeaveRoom(r.id);}} style={{fontSize:10,padding:"2px 8px",borderRadius:6,border:`1px solid ${r.creatorId===user.id?C.accent:C.border}`,background:"transparent",color:r.creatorId===user.id?C.accent:C.inkMuted,cursor:"pointer"}}>
              {r.creatorId===user.id?"Delete":"Leave"}
            </button>
          </div>
        ))}
      </div>

      {/* Top activities */}
      {top.length>0&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:14}}>
          <p style={{fontWeight:600,marginBottom:11,fontSize:13,color:C.ink}}>Top activities</p>
          {top.map(([id,count],i)=>{
            const act=ALL_ACTS.find(a=>a.id===id);if(!act)return null;
            return(<div key={id} style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
              <span style={{minWidth:20,fontWeight:700,color:C.inkMuted,fontSize:11}}>#{i+1}</span>
              <span style={{fontSize:17}}>{act.emoji}</span>
              <span style={{fontSize:12,flex:1,color:C.ink}}>{act.label}</span>
              <span style={{fontSize:11,padding:"2px 7px",borderRadius:9,background:act.cat==="growth"?C.greenLight:C.amberLight,color:act.cat==="growth"?C.green:C.amber,fontWeight:500}}>{count}x</span>
            </div>);
          })}
        </div>
      )}

      <button onClick={onLogout} style={{width:"100%",padding:"11px",borderRadius:8,border:`1px solid ${C.accent}`,background:"transparent",color:C.accent,fontWeight:500,cursor:"pointer",fontSize:13}}>Sign out</button>
    </div>
  );
}
