const bilingual = (label, kind = 'text') => [
  { name: 'translations.fr.' + label.key, label: `${label.title} · FR`, type: kind },
  { name: 'translations.en.' + label.key, label: `${label.title} · EN`, type: kind },
];

export const resources = {
  profile: {
    endpoint: 'profiles', title: 'Profil', singular: 'profil', columns: ['email', 'location', 'availability'],
    fields: [
      { name: 'email', label: 'E-mail professionnel', type: 'email', required:true }, { name: 'location', label: 'Localisation', required:true },
      { name: 'availability', label: 'Disponibilité', type: 'select', options: [['open', 'Ouvert aux opportunités'], ['available', 'Disponible'], ['unavailable', 'Indisponible']] },
      { name: 'photo_url', label: 'URL de la photo', type: 'url' }, { name: 'cv_url', label: 'URL du CV', type: 'url' },
      ...bilingual({key:'name',title:'Nom'}), ...bilingual({key:'title',title:'Titre professionnel'}),
      ...bilingual({key:'short_bio',title:'Biographie courte'}), ...bilingual({key:'introduction',title:'Présentation détaillée'}, 'textarea'),
      ...bilingual({key:'passion',title:'Passion'}), ...bilingual({key:'objective',title:'Objectif professionnel'}, 'textarea'),
    ],
  },
  projects: {
    endpoint: 'projects', title: 'Projets', singular: 'projet', columns: ['translations.fr.name', 'status', 'completed_on', 'is_featured'],
    fields: [
      { name: 'image_url', label: 'Image principale (URL)', type: 'url' }, { name: 'github_url', label: 'GitHub', type: 'url' },
      { name: 'demo_url', label: 'Démo', type: 'url' }, { name: 'completed_on', label: 'Date de réalisation' },
      { name: 'status', label: 'Publication', type: 'select', options: [['draft','Brouillon'],['published','Publié']] },
      { name: 'is_featured', label: 'Projet mis en avant', type: 'checkbox' }, { name: 'display_order', label: 'Ordre d’affichage', type: 'number', default: 0 },
      ...bilingual({key:'name',title:'Nom'}), ...bilingual({key:'category',title:'Catégorie'}),
      ...bilingual({key:'short_description',title:'Description courte'}, 'textarea'), ...bilingual({key:'description',title:'Description détaillée'}, 'textarea'),
      { name: 'skill_ids', label: 'IDs des compétences (séparés par des virgules)', type: 'list' },
      { name: 'images', label: 'Galerie JSON (URL, texte alternatif et ordre)', type: 'json', default: [] },
    ],
  },
  skills: {
    endpoint: 'skills', title: 'Compétences', singular: 'compétence', columns: ['name', 'category', 'level', 'is_public'],
    fields: [{name:'name',label:'Nom',required:true}, {name:'category',label:'Catégorie',required:true}, {name:'level',label:'Niveau (optionnel)',type:'number'}, {name:'icon',label:'Icône'}, {name:'display_order',label:'Ordre',type:'number',default:0}, {name:'is_public',label:'Visible publiquement',type:'checkbox',default:true}],
  },
  education: {
    endpoint: 'education', title: 'Formation', singular: 'formation', columns: ['institution', 'degree', 'started_on', 'ended_on'],
    fields: [{name:'institution',label:'Établissement',required:true}, {name:'degree',label:'Diplôme',required:true}, {name:'field_of_study',label:'Domaine'}, {name:'started_on',label:'Début'}, {name:'ended_on',label:'Fin'}, {name:'is_current',label:'En cours',type:'checkbox'}, {name:'is_public',label:'Visible publiquement',type:'checkbox',default:true}, ...bilingual({key:'degree',title:'Diplôme'}), ...bilingual({key:'description',title:'Description'},'textarea')],
  },
  experience: {
    endpoint: 'experiences', title: 'Expériences', singular: 'expérience', columns: ['company', 'position', 'started_on', 'status'],
    fields: [{name:'company',label:'Entreprise',required:true}, {name:'position',label:'Poste',required:true}, {name:'experience_type',label:'Type'}, {name:'started_on',label:'Début'}, {name:'ended_on',label:'Fin'}, {name:'is_current',label:'Poste actuel',type:'checkbox'}, {name:'status',label:'Publication',type:'select',options:[['draft','Brouillon'],['published','Publié']]}, ...bilingual({key:'position',title:'Intitulé du poste'}), ...bilingual({key:'description',title:'Missions'},'textarea'), ...bilingual({key:'technologies',title:'Technologies'})],
  },
  certifications: {
    endpoint: 'certifications', title: 'Certifications', singular: 'certification', columns: ['issuer', 'awarded_on', 'expires_on', 'is_public'],
    fields: [{name:'issuer',label:'Organisme',required:true}, {name:'awarded_on',label:'Date d’obtention'}, {name:'expires_on',label:'Expiration'}, {name:'document_url',label:'Document (URL)',type:'url'}, {name:'verification_url',label:'Vérification (URL)',type:'url'}, {name:'is_public',label:'Visible publiquement',type:'checkbox',default:true}, ...bilingual({key:'name',title:'Nom'}), ...bilingual({key:'description',title:'Description'},'textarea')],
  },
  trainings: {
    endpoint: 'trainings', title: 'Formations complémentaires', singular: 'formation', columns: ['provider', 'started_on', 'completed_on', 'is_public'],
    fields: [{name:'provider',label:'Organisme'}, {name:'started_on',label:'Début'}, {name:'completed_on',label:'Fin'}, {name:'is_public',label:'Visible publiquement',type:'checkbox',default:true}, ...bilingual({key:'name',title:'Nom'}), ...bilingual({key:'description',title:'Description'},'textarea')],
  },
  'social-links': {
    endpoint: 'social-links', title: 'Réseaux sociaux', singular: 'lien', columns: ['platform', 'url', 'display_order', 'is_public'],
    fields: [{name:'platform',label:'Plateforme',required:true}, {name:'url',label:'URL',type:'url',required:true}, {name:'display_order',label:'Ordre',type:'number',default:0}, {name:'is_public',label:'Visible publiquement',type:'checkbox',default:true}],
  },
  settings: {
    endpoint: 'settings', title: 'Paramètres du site', singular: 'paramètre', columns: ['key', 'value'],
    fields: [{name:'key',label:'Clé (public.* pour exposer au site)',required:true,help:'Les paramètres publics doivent commencer par public.'}, {name:'value',label:'Valeur JSON',type:'json',default:{}}],
  },
};

export const adminNavigation = [
  {to:'/admin',label:'Vue d’ensemble', icon:'⌂', end:true},
  {to:'/admin/profile',label:'Profil', icon:'◉'},
  {to:'/admin/projects',label:'Projets', icon:'▧'},
  {to:'/admin/skills',label:'Compétences', icon:'✳'},
  {to:'/admin/education',label:'Formation', icon:'⌘'},
  {to:'/admin/experience',label:'Expériences', icon:'↗'},
  {to:'/admin/certifications',label:'Certifications', icon:'◇'},
  {to:'/admin/trainings',label:'Formations complémentaires', icon:'▤'},
  {to:'/admin/messages',label:'Messages', icon:'✉'},
  {to:'/admin/settings',label:'Paramètres', icon:'⚙'},
];
