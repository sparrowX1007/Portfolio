import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, CircleAlert, FilePlus2, LayoutDashboard, LogOut, Menu, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { API_BASE, ApiError, sendRequest } from './api.js';
import { adminNavigation, resources } from './resources.js';

const AdminContext = createContext(null);
const useAdmin = () => useContext(AdminContext);

function AdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [checking, setChecking] = useState(true);
  const [apiStatus, setApiStatus] = useState('checking');
  const request = useCallback(async (path, options = {}) => {
    try { return await sendRequest(path, { ...options, csrfToken }); }
    catch (error) { if (error.status === 401 && path !== '/auth/login') { setUser(null); setCsrfToken(null); } throw error; }
  }, [csrfToken]);

  useEffect(() => {
    let live = true;
    sendRequest('/auth/me').then((data) => {
      if (live) { setUser(data); setCsrfToken(data.csrf_token); }
    }).catch(() => { if (live) { setUser(null); setCsrfToken(null); } }).finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const origin = API_BASE.replace(/\/api\/v1\/?$/, '');
    fetch(`${origin}/health`).then(response => setApiStatus(response.ok?'online':'offline')).catch(()=>setApiStatus('offline'));
  }, []);

  const login = async (credentials) => {
    const data = await sendRequest('/auth/login', { method:'POST', body:credentials });
    setUser(data); setCsrfToken(data.csrf_token);
    return data;
  };
  const logout = async () => {
    try { await request('/auth/logout', { method:'POST' }); }
    finally { setUser(null); setCsrfToken(null); }
  };

  const value = useMemo(() => ({ user, checking, apiStatus, request, login, logout }), [user, checking, apiStatus, request]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

function LoginPage() {
  const { login, user, checking } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (checking) return <div className="admin-loading"><span className="admin-spinner"/>Vérification de la session…</div>;
  if (user) return <Navigate to="/admin" replace/>;

  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try { await login({ email, password }); navigate('/admin', { replace:true }); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Connexion impossible.'); }
    finally { setBusy(false); }
  };

  return <main className="admin-login-page">
    <motion.div className="admin-login-card" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.45}}>
      <Link className="admin-login-brand" to="/"><span className="brand-glyph">d<span>.</span></span><span>DAVID<br/>RAHARISON</span></Link>
      <div className="admin-login-icon"><ShieldCheck size={21}/></div>
      <span className="admin-eyebrow">ESPACE PRIVÉ · ADMIN</span>
      <h1>Content, under control.</h1>
      <p className="admin-login-subtitle">Connecte-toi pour administrer le portfolio.</p>
      <form onSubmit={submit} className="admin-form">
        <label>Adresse e-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required autoFocus placeholder="admin@example.com"/></label>
        <label>Mot de passe<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required placeholder="••••••••••••"/></label>
        {error&&<div className="admin-alert"><CircleAlert size={16}/>{error}</div>}
        <button className="admin-button admin-button-primary admin-login-submit" disabled={busy}>{busy?<><span className="admin-spinner small"/>Connexion…</>:<>Se connecter<ArrowRight size={16}/></>}</button>
      </form>
      <Link className="admin-back-link" to="/"><ArrowLeft size={14}/>Retour au portfolio</Link>
    </motion.div>
    <span className="admin-login-footer">PORTFOLIO CONTROL PANEL <i>✳</i> FIANARANTSOA, MADAGASCAR</span>
  </main>;
}

function AdminGuard({ children }) {
  const { user, checking } = useAdmin();
  if (checking) return <div className="admin-loading"><span className="admin-spinner"/>Vérification de la session…</div>;
  return user ? children : <Navigate to="/admin/login" replace/>;
}

function AdminLayout() {
  const { user, logout, apiStatus } = useAdmin();
  const [mobileNav, setMobileNav] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const signOut = async () => { setLoggingOut(true); try { await logout(); } finally { setLoggingOut(false); navigate('/admin/login', {replace:true}); } };
  return <div className="admin-shell">
    <aside className={`admin-sidebar ${mobileNav?'mobile-open':''}`}>
      <Link to="/admin" className="admin-brand"><span className="brand-glyph">d<span>.</span></span><span className="brand-word">DAVID<br/>RAHARISON</span></Link>
      <div className="admin-side-label">WORKSPACE</div>
      <nav className="admin-side-nav">{adminNavigation.map(item=><NavLink key={item.to} end={item.end} to={item.to} onClick={()=>setMobileNav(false)} className={({isActive})=>`admin-nav-link ${isActive?'active':''}`}><span className="admin-nav-icon">{item.icon}</span>{item.label}{item.end&&<span className="admin-nav-arrow"><ArrowUpRight size={13}/></span>}</NavLink>)}</nav>
      <div className="admin-sidebar-bottom"><span className={`admin-online-dot ${apiStatus==='offline'?'offline':''}`}/>{apiStatus==='checking'?'Connexion à l’API…':apiStatus==='online'?'API accessible':'API indisponible'} <small>V1</small></div>
    </aside>
    {mobileNav&&<button className="admin-scrim" aria-label="Fermer le menu" onClick={()=>setMobileNav(false)}/>}
    <div className="admin-main-wrap">
      <header className="admin-topbar"><button className="admin-mobile-toggle" aria-label="Ouvrir le menu" onClick={()=>setMobileNav(!mobileNav)}><Menu size={19}/></button><div className="admin-breadcrumb"><span>PORTFOLIO</span><i>/</i><b>ADMINISTRATION</b></div><div className="admin-top-actions"><span className="admin-top-user"><span>{user?.full_name?.slice(0,1)?.toUpperCase()||'A'}</span>{user?.full_name||user?.email}</span><button className="admin-logout" onClick={signOut} disabled={loggingOut}><LogOut size={15}/><span>Déconnexion</span></button></div></header>
      <div className="admin-content"><Outlet/></div>
    </div>
  </div>;
}

function AdminPageHeader({ eyebrow, title, subtitle, action }) {
  return <div className="admin-page-header"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;
}

function DashboardPage() {
  const { request, user, apiStatus } = useAdmin();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(()=>{let live=true; Promise.all(['projects','skills','experiences'].map(name=>request(`/admin/${name}?limit=1`))).then(([p,s,e])=>request('/admin/messages?limit=1').then(m=>({projects:p.total,skills:s.total,experiences:e.total,messages:m.total,unread:m.items.filter(x=>!x.is_read).length}))).then(v=>{if(live)setStats(v)}).catch(err=>{if(live)setError(err.message)}); return()=>{live=false}},[request]);
  const tiles=[['Projets',stats?.projects,'▧','/admin/projects'],['Compétences',stats?.skills,'✳','/admin/skills'],['Expériences',stats?.experiences,'↗','/admin/experience'],['Messages non lus',stats?.unread,'✉','/admin/messages']];
  return <>
    <AdminPageHeader eyebrow="OVERVIEW · 01" title={`Bonjour ${user?.full_name?.split(' ')[0]||'David'}.`} subtitle="Voici un aperçu de ton contenu et de ton activité." action={<span className="admin-date-chip"><span className={`admin-online-dot ${apiStatus==='offline'?'offline':''}`}/>{apiStatus==='online'?'API accessible':apiStatus==='checking'?'Vérification API':'API indisponible'}</span>}/>
    {error&&<div className="admin-alert"><CircleAlert size={16}/>{error}</div>}
    <div className="admin-stat-grid">{tiles.map(([label,value,icon,to],i)=><Link to={to} className="admin-stat-card" key={label} style={{'--card-index':i}}><div className="admin-stat-top"><span>{label}</span><i>{icon}</i></div><strong>{value??<span className="admin-skeleton"/>}</strong><span className="admin-stat-foot">Voir la collection <ArrowUpRight size={13}/></span></Link>)}</div>
    <section className="admin-overview-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">QUICK ACCESS</span><h2>Gestion du portfolio</h2></div><span className="admin-panel-mark">✳</span></div><div className="admin-quick-grid">{adminNavigation.slice(1).map(item=><Link to={item.to} key={item.to}><span className="admin-quick-icon">{item.icon}</span><span>{item.label}</span><ArrowUpRight size={14}/></Link>)}</div></section>
  </>;
}

function getPath(object, path) { return path.split('.').reduce((value,key)=>value?.[key], object); }
function setPath(object, path, value) { const parts=path.split('.'); let target=object; parts.slice(0,-1).forEach(key=>{target[key]??={};target=target[key]});target[parts.at(-1)]=value; }
function printable(value) { if (value===null||value===undefined||value==='') return '—'; if (typeof value==='boolean') return value?'Oui':'Non'; if (Array.isArray(value)) return value.join(', '); if (typeof value==='object') return JSON.stringify(value); return String(value); }
function displayValue(row, path) {
  if (path==='translations.fr.name') return row?.translations?.fr?.name||'—';
  return printable(getPath(row,path));
}
function initialForm(definition, record) {
  const values={};
  for(const field of definition.fields){let value=record?getPath(record,field.name):field.default;if(value===undefined)value=field.type==='checkbox'?false:field.type==='json'?[]:'';if(field.type==='json')value=JSON.stringify(value,null,2);if(field.type==='list')value=Array.isArray(value)?value.join(', '):'';values[field.name]=value;}
  if(record&&definition.endpoint==='projects') values.images=JSON.stringify((record.images||[]).map(({image_url,alt_text,display_order})=>({image_url,alt_text,display_order})),null,2);
  return values;
}
function formPayload(definition, values) {
  const result={};
  for(const field of definition.fields){let value=values[field.name];if(field.type==='number')value=value===''?null:Number(value);if(field.type==='checkbox')value=Boolean(value);if(field.type==='url'&&value==='')value=null;if(field.type==='json'){try{value=JSON.parse(value||'[]')}catch{throw new Error(`JSON invalide dans « ${field.label} ».`)}}if(field.type==='list')value=value.split(',').map(x=>x.trim()).filter(Boolean);setPath(result,field.name,value);}
  if(definition.endpoint==='projects'){result.skill_ids=(result.skill_ids||[]).map(x=>x.trim());result.images=result.images||[];}
  return result;
}

function ResourcePage({ resource: resourceProp }) {
  const { resource: routeResource } = useParams();
  const resource = resourceProp || routeResource;
  const definition = resources[resource];
  const { request } = useAdmin();
  const [items,setItems]=useState([]);const [total,setTotal]=useState(0);const [offset,setOffset]=useState(0);const [query,setQuery]=useState('');const [search,setSearch]=useState('');const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [toast,setToast]=useState('');const [editor,setEditor]=useState(null);const [saving,setSaving]=useState(false);
  const limit=10;
  const load=useCallback(async()=>{setLoading(true);setError('');try{const params=new URLSearchParams({limit:String(limit),offset:String(offset)});if(search)params.set('q',search);const data=await request(`/admin/${definition.endpoint}?${params}`);setItems(data.items||[]);setTotal(data.total||0)}catch(e){setError(e.message)}finally{setLoading(false)}},[request,definition,offset,search]);
  useEffect(()=>{load()},[load]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3000);return()=>clearTimeout(timer)},[toast]);
  if(!definition)return <Navigate to="/admin" replace/>;
  const columns=definition.columns;
  const remove=async row=>{if(!window.confirm(`Supprimer ce${definition.singular==='expérience'?'tte':' '} ${definition.singular} ? Cette action est définitive.`))return;try{await request(`/admin/${definition.endpoint}/${row.id}`,{method:'DELETE'});setToast('Élément supprimé.');await load()}catch(e){setError(e.message)}};
  const submit=async event=>{event.preventDefault();setSaving(true);setError('');try{const body=formPayload(definition,editor.values);const path=`/admin/${definition.endpoint}${editor.record?`/${editor.record.id}`:''}`;await request(path,{method:editor.record?'PUT':'POST',body});setEditor(null);setToast(editor.record?'Modifications enregistrées.':'Élément créé.');await load()}catch(e){setError(e.message)}finally{setSaving(false)}};

  return <>
    <AdminPageHeader eyebrow={`CONTENT · ${resource.toUpperCase()}`} title={definition.title} subtitle={`${total} élément${total===1?'':'s'} dans cette collection.`} action={<button className="admin-button admin-button-primary" onClick={()=>setEditor({record:null,values:initialForm(definition,null)})}><Plus size={16}/>Ajouter</button>}/>
    {error&&<div className="admin-alert"><CircleAlert size={16}/>{error}<button onClick={()=>setError('')} aria-label="Fermer"><X size={14}/></button></div>}
    <section className="admin-table-panel"><div className="admin-table-toolbar"><form className="admin-search" onSubmit={e=>{e.preventDefault();setOffset(0);setSearch(query.trim())}}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Rechercher dans ${definition.title.toLowerCase()}…`}/><button type="submit">Rechercher</button></form><span className="admin-count">{loading?'Chargement…':`${total} résultat${total===1?'':'s'}`}</span></div>
      <div className="admin-table-scroll"><table className="admin-table"><thead><tr>{columns.map(col=><th key={col}>{columnTitle(col)}</th>)}<th className="admin-actions-heading">Actions</th></tr></thead><tbody>{loading?<tr><td colSpan={columns.length+1} className="admin-empty"><span className="admin-spinner small"/>Chargement des données…</td></tr>:items.length===0?<tr><td colSpan={columns.length+1} className="admin-empty">Aucun élément pour l’instant.</td></tr>:items.map(row=><tr key={row.id}>{columns.map(col=><td key={col}><TableValue value={getPathForRow(row,col)} path={col}/></td>)}<td><div className="admin-row-actions"><button aria-label="Modifier" title="Modifier" onClick={()=>setEditor({record:row,values:initialForm(definition,row)})}><FilePlus2 size={15}/></button><button className="danger" aria-label="Supprimer" title="Supprimer" onClick={()=>remove(row)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>
      <div className="admin-pagination"><span>{total?`${offset+1}–${Math.min(offset+limit,total)} sur ${total}`:'0 résultat'}</span><div><button disabled={offset===0||loading} aria-label="Page précédente" onClick={()=>setOffset(Math.max(0,offset-limit))}><ChevronLeft size={16}/></button><button disabled={offset+limit>=total||loading} aria-label="Page suivante" onClick={()=>setOffset(offset+limit)}><ChevronRight size={16}/></button></div></div>
    </section>
    <AnimatePresence>{editor&&<motion.div className="admin-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget)setEditor(null)}}><motion.section className="admin-editor-modal" initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}} aria-modal="true" role="dialog" aria-labelledby="admin-editor-title"><div className="admin-modal-header"><div><span className="admin-eyebrow">{editor.record?'EDIT RECORD':'NEW RECORD'}</span><h2 id="admin-editor-title">{editor.record?'Modifier':'Ajouter'} · {definition.singular}</h2></div><button className="admin-icon-button" onClick={()=>setEditor(null)} aria-label="Fermer"><X size={18}/></button></div><form className="admin-form admin-editor-form" onSubmit={submit}><div className="admin-editor-fields">{definition.fields.map(field=><label className={`${field.type==='textarea'||field.type==='json'?'wide':''} ${field.type==='checkbox'?'check-field':''}`} key={field.name}>{field.type==='checkbox'?<><input type="checkbox" checked={Boolean(editor.values[field.name])} onChange={e=>setEditor({...editor,values:{...editor.values,[field.name]:e.target.checked}})}/>{field.label}</>:<>{field.label}{field.help&&<small>{field.help}</small>}{field.type==='select'?<select required value={editor.values[field.name]||''} onChange={e=>setEditor({...editor,values:{...editor.values,[field.name]:e.target.value}})}>{field.options.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>:field.type==='textarea'||field.type==='json'?<textarea required={field.type==='json'} rows={field.type==='json'?6:3} value={editor.values[field.name]} onChange={e=>setEditor({...editor,values:{...editor.values,[field.name]:e.target.value}})}/>:<input type={field.type||'text'} min={field.type==='number'?0:undefined} value={editor.values[field.name]??''} onChange={e=>setEditor({...editor,values:{...editor.values,[field.name]:e.target.value}})}/>}</>}</label>)}</div><div className="admin-modal-footer"><button type="button" className="admin-button admin-button-quiet" onClick={()=>setEditor(null)}>Annuler</button><button type="submit" className="admin-button admin-button-primary" disabled={saving}>{saving?<><span className="admin-spinner small"/>Enregistrement…</>:<><Check size={16}/>Enregistrer</>}</button></div></form></motion.section></motion.div>}</AnimatePresence>
    <AnimatePresence>{toast&&<motion.div className="admin-toast" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}><Check size={15}/>{toast}</motion.div>}</AnimatePresence>
  </>;
}

function getPathForRow(row,path){ if(path==='translations.fr.name')return row.translations?.fr?.name||'—'; return getPath(row,path); }
function columnTitle(path){return ({'translations.fr.name':'Nom (FR)',status:'Publication',completed_on:'Date de réalisation',is_featured:'Mis en avant',email:'E-mail',location:'Localisation',availability:'Disponibilité',name:'Nom',category:'Catégorie',level:'Niveau',is_public:'Visible',institution:'Établissement',degree:'Diplôme',started_on:'Début',ended_on:'Fin',company:'Entreprise',position:'Poste',issuer:'Organisme',awarded_on:'Obtention',expires_on:'Expiration',provider:'Organisme',platform:'Plateforme',url:'URL',display_order:'Ordre',key:'Clé',value:'Valeur'})[path]||path;}
function TableValue({value,path}){if(path==='status'||path==='availability'){const good=value==='published'||value==='open'||value==='available';return <span className={`admin-pill ${good?'good':''}`}>{printable(value)}</span>}if(typeof value==='boolean')return <span className={`admin-bool ${value?'yes':''}`}>{value?'Oui':'Non'}</span>;return <span className="admin-cell-value" title={printable(value)}>{printable(value)}</span>}

function MessagesPage(){const {request}=useAdmin();const [data,setData]=useState({items:[],total:0});const [unread,setUnread]=useState(true);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [page,setPage]=useState(0);const [selected,setSelected]=useState(null);const limit=10;const load=useCallback(async()=>{setLoading(true);try{const d=await request(`/admin/messages?limit=${limit}&offset=${page*limit}&unread=${unread}`);setData(d)}catch(e){setError(e.message)}finally{setLoading(false)}},[request,page,unread]);useEffect(()=>{load()},[load]);const update=async(row,is_read)=>{try{await request(`/admin/messages/${row.id}`,{method:'PATCH',body:{is_read}});if(selected?.id===row.id)setSelected({...row,is_read});await load()}catch(e){setError(e.message)}};const remove=async row=>{if(!window.confirm('Supprimer définitivement ce message ?'))return;try{await request(`/admin/messages/${row.id}`,{method:'DELETE'});setSelected(null);await load()}catch(e){setError(e.message)}};return <><AdminPageHeader eyebrow="INBOX · CONTACT" title="Messages" subtitle="Les messages reçus depuis le formulaire de contact." action={<button className={`admin-button ${unread?'admin-button-primary':'admin-button-quiet'}`} onClick={()=>{setPage(0);setUnread(!unread)}}>{unread?'Voir tous':'Voir les non lus'}</button>}/>{error&&<div className="admin-alert"><CircleAlert size={16}/>{error}</div>}<div className="admin-message-layout"><section className="admin-table-panel admin-inbox-panel"><div className="admin-table-toolbar"><span className="admin-count">{data.total} message{data.total===1?'':'s'} {unread?'non lu(s)':''}</span><span className="admin-eyebrow">INBOX / 01</span></div><div className="admin-message-list">{loading?<div className="admin-empty"><span className="admin-spinner small"/>Chargement…</div>:data.items.length===0?<div className="admin-empty">Aucun message.</div>:data.items.map(row=><button key={row.id} className={`admin-message-row ${!row.is_read?'unread':''} ${selected?.id===row.id?'selected':''}`} onClick={()=>{setSelected(row);if(!row.is_read)update(row,true)}}><span className="admin-message-dot"/><span className="admin-message-meta"><b>{row.name}</b><small>{row.email}</small></span><span className="admin-message-subject">{row.subject}</span><time>{new Date(row.created_at).toLocaleDateString('fr-FR')}</time></button>)}</div><div className="admin-pagination"><span>{data.total?`${page*limit+1}–${Math.min(page*limit+limit,data.total)} sur ${data.total}`:'0 résultat'}</span><div><button disabled={page===0||loading} onClick={()=>setPage(page-1)}><ChevronLeft size={16}/></button><button disabled={(page+1)*limit>=data.total||loading} onClick={()=>setPage(page+1)}><ChevronRight size={16}/></button></div></div></section><aside className="admin-message-detail">{selected?<><div className="admin-detail-top"><span className="admin-eyebrow">MESSAGE · {new Date(selected.created_at).toLocaleString('fr-FR')}</span><button className="admin-icon-button danger" onClick={()=>remove(selected)} title="Supprimer"><Trash2 size={16}/></button></div><h2>{selected.subject}</h2><div className="admin-sender"><span>{selected.name.slice(0,1).toUpperCase()}</span><div><b>{selected.name}</b><a href={`mailto:${selected.email}`}>{selected.email}</a></div></div><p className="admin-message-content">{selected.content}</p><div className="admin-detail-actions"><a className="admin-button admin-button-primary" href={`mailto:${selected.email}?subject=${encodeURIComponent('Re: '+selected.subject)}`}>Répondre<ArrowUpRight size={15}/></a><button className="admin-button admin-button-quiet" onClick={()=>update(selected,!selected.is_read)}>{selected.is_read?'Marquer non lu':'Marquer comme lu'}</button></div></>:<div className="admin-detail-placeholder"><span>✉</span><p>Sélectionne un message pour lire son contenu.</p></div>}</aside></div></>}

function AdminRoutes(){return <Routes><Route path="/admin/login" element={<LoginPage/>}/><Route path="/admin" element={<AdminGuard><AdminLayout/></AdminGuard>}><Route index element={<DashboardPage/>}/><Route path="profile" element={<ResourcePage resource="profile"/>}/><Route path="projects" element={<ResourcePage resource="projects"/>}/><Route path="skills" element={<ResourcePage resource="skills"/>}/><Route path="education" element={<ResourcePage resource="education"/>}/><Route path="experience" element={<ResourcePage resource="experience"/>}/><Route path="certifications" element={<ResourcePage resource="certifications"/>}/><Route path="trainings" element={<ResourcePage resource="trainings"/>}/><Route path="messages" element={<MessagesPage/>}/><Route path="settings" element={<ResourcePage resource="settings"/>}/></Route><Route path="*" element={<Navigate to="/admin" replace/>}/></Routes>}

export default function AdminApp(){return <AdminProvider><AdminRoutes/></AdminProvider>}
