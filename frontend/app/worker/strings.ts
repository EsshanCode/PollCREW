export type Lang = "en" | "es";

export const SKILL_TEXT: Record<
  string,
  Record<Lang, { title: string; body: string }>
> = {
  check_in: {
    en: {
      title: "Check voters in",
      body: "Find each voter on the list and help them sign in.",
    },
    es: {
      title: "Registrar a los votantes",
      body: "Buscar a cada votante en la lista y ayudarle a firmar.",
    },
  },
  accessibility: {
    en: {
      title: "Help voters with disabilities",
      body: "Give patient, respectful help to anyone who needs it.",
    },
    es: {
      title: "Ayudar a votantes con discapacidades",
      body: "Dar ayuda paciente y respetuosa a quien la necesite.",
    },
  },
  equipment: {
    en: {
      title: "Fix tablets and printers",
      body: "Restart devices and load paper when something stops working.",
    },
    es: {
      title: "Arreglar tabletas e impresoras",
      body: "Reiniciar equipos y poner papel cuando algo deja de funcionar.",
    },
  },
  leadership: {
    en: {
      title: "Lead a team",
      body: "Keep the team on track and make calls during the day.",
    },
    es: {
      title: "Dirigir un equipo",
      body: "Mantener al equipo organizado y tomar decisiones durante el día.",
    },
  },
  spanish: {
    en: {
      title: "Speak Spanish",
      body: "Help voters who prefer Spanish.",
    },
    es: {
      title: "Hablar español",
      body: "Ayudar a votantes que prefieren español.",
    },
  },
};

export const ROLE_TEXT: Record<
  string,
  Record<Lang, { title: string; body: string }>
> = {
  "Check-in": {
    en: {
      title: "Check voters in",
      body: "You will find each voter on the list and help them sign in.",
    },
    es: {
      title: "Registrar a los votantes",
      body: "Buscará a cada votante en la lista y le ayudará a firmar.",
    },
  },
  "Voter support": {
    en: {
      title: "Help voters who need assistance",
      body: "You will help voters with disabilities or other needs, with patience.",
    },
    es: {
      title: "Ayudar a votantes que necesitan apoyo",
      body: "Ayudará con paciencia a votantes con discapacidades u otras necesidades.",
    },
  },
  "Site lead": {
    en: {
      title: "Lead your polling place team",
      body: "You will open the site, keep the team on track, and fix problems.",
    },
    es: {
      title: "Dirigir el equipo del lugar de votación",
      body: "Abrirá el lugar, mantendrá al equipo organizado y resolverá problemas.",
    },
  },
};

const EN = {
  lang: "Español",
  organizer: "Organizer view",
  bigger: "Larger text",
  smaller: "Smaller text",
  back: "Back",
  next: "Continue",
  step: (n: number, total: number) => `Step ${n} of ${total}`,
  appName: "PollCREW for poll workers",
  demoNote:
    "Demo: tap any sample worker. Real workers get a sign-in link by text.",
  whoTitle: "Who are you?",
  county: "Your county",
  searchName: "Search your name",
  start: "Start",
  aboutTitle: "Tell us about your experience",
  aboutHelp:
    "A few sentences about any job or volunteering. Everything counts.",
  aboutExample:
    "Example: “I worked the front desk at a clinic. I helped older patients. I speak Spanish.”",
  aboutLabel: "Your experience",
  findSkills: "Find my skills",
  skip: "Skip and choose myself",
  skillsTitle: "Which of these can you do?",
  skillsHelp: "Tap every card that fits you. You can change this later.",
  youSaid: "You said:",
  selected: "Selected",
  notSelected: "Tap to select",
  dayTitle: "Can you work the whole day?",
  dayHelp:
    "Election Day is Tuesday, November 3. Polling places need workers all day.",
  allDay: "Yes, all day",
  allDayBody: "From 6 AM to 8 PM",
  morning: "Only in the morning",
  morningBody: "From 6 AM to noon",
  trainingTitle: "Have you finished poll worker training?",
  trainingHelp: "Most roles need training. Your county offers it free.",
  yes: "Yes, I finished it",
  no: "Not yet",
  travelTitle: "How far can you travel?",
  travelHelp: "We will only place you at a polling place within this distance.",
  miles: (m: number) => `Up to ${m} miles`,
  reviewTitle: "Check your answers",
  change: "Change",
  skillsLabel: "What you can do",
  noneChosen: "Nothing selected",
  dayLabel: "Hours",
  trainingLabel: "Training",
  travelLabel: "Travel",
  save: "Save my answers",
  saving: "Saving…",
  savedTitle: "Thank you. Your answers are saved.",
  savedBody:
    "Your polling place and job will show up here once the plan is ready.",
  lockedTitle: "Your coordinator has already made the plan",
  lockedBody:
    "To change your answers now, please call your county elections office.",
  dayTitleAssigned: "Your Election Day",
  date: "Tuesday, November 3",
  arrive: (time: string) => `Please arrive by ${time}`,
  where: "Where",
  role: "Your job",
  team: "Your team",
  teamBody: (lead: string, n: number) =>
    lead ? `Led by ${lead} · ${n} people in total` : `${n} people in total`,
  directions: "Get directions",
  cantMake: "I can’t make it",
  backupTitle: "You are a backup worker",
  backupBody:
    "Thank you for being ready. We will contact you if a polling place needs help.",
  confirmTitle: "Are you sure you can’t make it?",
  confirmBody:
    "We will tell your coordinator right away so they can find someone to take your place.",
  confirmYes: "Yes, I can’t make it",
  confirmNo: "No, go back",
  cancelledTitle: "Thank you for letting us know",
  cancelledBody:
    "Your coordinator has been told. You do not need to do anything else.",
  busyTitle: "Please try again in a minute",
  error: "Something went wrong. Please try again.",
  noSession:
    "We can’t reach the PollCREW server right now. Make sure the backend is running, then try again.",
  tryAgain: "Try again",
  loading: "Loading…",
  edit: "Edit my answers",
  done: "Done",
  monthShort: "NOV",
  aiNote:
    "Suggestions come from your own words. Nothing is chosen until you tap it.",
};

const ES: typeof EN = {
  lang: "English",
  organizer: "Vista del coordinador",
  bigger: "Letra más grande",
  smaller: "Letra más pequeña",
  back: "Atrás",
  next: "Continuar",
  step: (n, total) => `Paso ${n} de ${total}`,
  appName: "PollCREW para trabajadores electorales",
  demoNote:
    "Demostración: toque cualquier trabajador. En la versión real, cada persona recibe un enlace por mensaje de texto.",
  whoTitle: "¿Quién es usted?",
  county: "Su condado",
  searchName: "Busque su nombre",
  start: "Empezar",
  aboutTitle: "Cuéntenos sobre su experiencia",
  aboutHelp: "Unas frases sobre cualquier trabajo o voluntariado. Todo cuenta.",
  aboutExample:
    "Ejemplo: “Trabajé en la recepción de una clínica. Ayudé a pacientes mayores. Hablo español.”",
  aboutLabel: "Su experiencia",
  findSkills: "Encontrar mis habilidades",
  skip: "Saltar y elegir yo",
  skillsTitle: "¿Cuáles de estas puede hacer?",
  skillsHelp: "Toque cada tarjeta que le corresponda. Puede cambiarlo después.",
  youSaid: "Usted dijo:",
  selected: "Seleccionado",
  notSelected: "Toque para seleccionar",
  dayTitle: "¿Puede trabajar todo el día?",
  dayHelp:
    "El día de elecciones es el martes 3 de noviembre. Los lugares de votación necesitan personal todo el día.",
  allDay: "Sí, todo el día",
  allDayBody: "De 6 AM a 8 PM",
  morning: "Solo por la mañana",
  morningBody: "De 6 AM a mediodía",
  trainingTitle: "¿Terminó la capacitación para trabajadores electorales?",
  trainingHelp:
    "La mayoría de los puestos la requieren. Su condado la ofrece gratis.",
  yes: "Sí, la terminé",
  no: "Todavía no",
  travelTitle: "¿Qué tan lejos puede viajar?",
  travelHelp:
    "Solo le asignaremos un lugar de votación dentro de esta distancia.",
  miles: (m) => `Hasta ${m} millas`,
  reviewTitle: "Revise sus respuestas",
  change: "Cambiar",
  skillsLabel: "Lo que puede hacer",
  noneChosen: "Nada seleccionado",
  dayLabel: "Horario",
  trainingLabel: "Capacitación",
  travelLabel: "Distancia",
  save: "Guardar mis respuestas",
  saving: "Guardando…",
  savedTitle: "Gracias. Sus respuestas están guardadas.",
  savedBody:
    "Aquí verá su lugar de votación y su puesto cuando el plan esté listo.",
  lockedTitle: "Su coordinador ya preparó el plan",
  lockedBody:
    "Para cambiar sus respuestas ahora, llame a la oficina de elecciones de su condado.",
  dayTitleAssigned: "Su día de elecciones",
  date: "Martes 3 de noviembre",
  arrive: (time) => `Por favor llegue antes de las ${time}`,
  where: "Dónde",
  role: "Su trabajo",
  team: "Su equipo",
  teamBody: (lead, n) =>
    lead
      ? `Dirigido por ${lead} · ${n} personas en total`
      : `${n} personas en total`,
  directions: "Cómo llegar",
  cantMake: "No puedo ir",
  backupTitle: "Usted es trabajador de reserva",
  backupBody:
    "Gracias por estar disponible. Le avisaremos si un lugar de votación necesita ayuda.",
  confirmTitle: "¿Está seguro de que no puede ir?",
  confirmBody:
    "Avisaremos a su coordinador de inmediato para que encuentre a otra persona.",
  confirmYes: "Sí, no puedo ir",
  confirmNo: "No, regresar",
  cancelledTitle: "Gracias por avisarnos",
  cancelledBody: "Su coordinador ya lo sabe. No necesita hacer nada más.",
  busyTitle: "Intente de nuevo en un minuto",
  error: "Algo salió mal. Intente de nuevo.",
  noSession:
    "No podemos conectar con el servidor de PollCREW. Asegúrese de que el servidor esté funcionando e intente de nuevo.",
  tryAgain: "Intentar de nuevo",
  loading: "Cargando…",
  edit: "Editar mis respuestas",
  done: "Listo",
  monthShort: "NOV",
  aiNote:
    "Las sugerencias vienen de sus propias palabras. Nada se elige hasta que usted lo toque.",
};

export const TEXT = { en: EN, es: ES };
