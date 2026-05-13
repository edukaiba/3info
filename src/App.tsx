/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  LogIn, 
  LogOut, 
  Send, 
  Code, 
  Terminal, 
  Database, 
  Cpu, 
  Users, 
  MapPin, 
  Mail, 
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from './lib/utils';

// --- Types & Schemas ---

const contactSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  subject: z.string().min(3, "Assunto é obrigatório"),
  message: z.string().min(10, "Mensagem deve ter pelo menos 10 caracteres"),
});

type ContactFormData = z.infer<typeof contactSchema>;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

// --- Helpers ---

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
        // Sync user to firestore
        const userDoc = doc(db, 'users', currentUser.uid);
        setDoc(userDoc, {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          role: 'student' // Default role
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const onContactSubmit = async (data: ContactFormData) => {
    setContactStatus('loading');
    try {
      await addDoc(collection(db, 'contacts'), {
        ...data,
        createdAt: serverTimestamp(),
      });
      setContactStatus('success');
      reset();
      setTimeout(() => setContactStatus('idle'), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contacts');
      setContactStatus('error');
    }
  };

  const navLinks = [
    { name: 'Início', href: '#home' },
    { name: 'O Curso', href: '#course' },
    { name: 'Destaques', href: '#highlights' },
    { name: 'Contato', href: '#contact' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* --- Navigation --- */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Code size={24} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">EEEP Júlio França</h1>
              <p className="text-xs font-medium uppercase tracking-widest text-blue-600">Informática - 3º Ano</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-600"
              >
                {link.name}
              </a>
            ))}
            {isAuthLoading ? (
              <Loader2 className="animate-spin text-slate-400" size={20} />
            ) : user ? (
              <div className="flex items-center gap-3">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  alt={user.displayName || 'User'} 
                  className="h-8 w-8 rounded-full border border-slate-200 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium transition-all hover:bg-slate-50 active:scale-95"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95"
              >
                <LogIn size={18} />
                Entrar
              </button>
            )}
          </div>

          <button 
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-slate-100 bg-white md:hidden"
            >
              <div className="flex flex-col gap-4 p-4">
                {navLinks.map((link) => (
                  <a 
                    key={link.name} 
                    href={link.href} 
                    className="text-lg font-medium text-slate-900"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                ))}
                {!user && (
                  <button 
                    onClick={handleLogin}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-bold text-white shadow-md"
                  >
                    <LogIn size={20} />
                    Entrar com Google
                  </button>
                )}
                {user && (
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-4 font-bold text-slate-900"
                  >
                    <LogOut size={20} />
                    Sair
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* --- Hero Section --- */}
      <section id="home" className="relative overflow-hidden bg-white pb-16 pt-24 md:pb-32 md:pt-40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,rgba(37,99,235,0.1),transparent_70%)]"></div>
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">
                <Users size={14} />
                <span>Turma 2026 - Concluindo Etapas</span>
              </div>
              <h2 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 md:text-7xl">
                Moldando o Futuro <br /> 
                <span className="text-blue-600">Linha por Linha.</span>
              </h2>
              <p className="mb-10 max-w-lg text-lg leading-relaxed text-slate-600 md:text-xl">
                O 3º ano de Informática da EEEP Júlio França é o ápice da formação técnica, onde teoria e prática se encontram para criar soluções reais.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <a 
                  href="#contact" 
                  className="inline-flex h-14 items-center justify-center rounded-2xl bg-blue-600 px-8 font-bold text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-2xl active:scale-95"
                >
                  Falar com a gente
                </a>
                <a 
                  href="#course" 
                  className="inline-flex h-14 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-8 font-bold text-slate-900 transition-all hover:bg-slate-50 active:scale-95"
                >
                  Conhecer o curso
                </a>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative aspect-square lg:aspect-auto lg:h-[600px]"
            >
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] border-8 border-slate-100 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1000" 
                  alt="Students coding" 
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-blue-600/10 mix-blend-multiply"></div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-6 -left-6 hidden h-32 w-32 rounded-3xl bg-blue-600 p-6 shadow-2xl md:block">
                <Terminal className="h-full w-full text-white" />
              </div>
              <div className="absolute -right-6 top-10 hidden h-24 w-24 rounded-full bg-white p-6 shadow-xl md:block">
                <Database className="h-full w-full text-blue-600" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- Course Tech Section --- */}
      <section id="course" className="bg-slate-50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Pilares do Aprendizado</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 md:text-5xl">O que dominamos no 3º Ano</h3>
          </div>
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Code, title: 'Desenvolvimento Web', desc: 'React, Node.js e tecnologias modernas para interfaces ricas.' },
              { icon: Database, title: 'Banco de Dados', desc: 'Modelagem, SQL e NoSQL para sistemas escaláveis.' },
              { icon: Cpu, title: 'Hardware e Redes', desc: 'Infraestrutura robusta e manutenção de sistemas complexos.' },
              { icon: Terminal, title: 'Lógica e Algoritmos', desc: 'Resolução de problemas desafiadores com eficiência.' },
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-3xl bg-white p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-900/5"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <feature.icon size={28} />
                </div>
                <h4 className="mb-3 text-xl font-bold text-slate-900">{feature.title}</h4>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Highlights Section --- */}
      <section id="highlights" className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-16">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Destaques do Curso</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 md:text-5xl">Projetos & Conquistas</h3>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Sistema de Gestão Escolar",
                desc: "Plataforma completa para controle de notas, frequências e comunicação entre alunos e professores.",
                image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800",
                tag: "Full Stack"
              },
              {
                title: "App de Monitoramento IoT",
                desc: "Solução baseada em sensores para monitorar a temperatura e umidade dos laboratórios de informática.",
                image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
                tag: "Hardware"
              },
              {
                title: "Plataforma de E-learning",
                desc: "Ambiente virtual de aprendizagem com foco em cursos técnicos e simulados preparatórios.",
                image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800",
                tag: "Educação"
              },
              {
                title: "Site da Semana Tecnológica",
                desc: "Portal oficial para inscrição e divulgação dos workshops da Semana de TI da EEEP Júlio França.",
                image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=800",
                tag: "Web Design"
              },
              {
                title: "Protótipo de Rede Segura",
                desc: "Implementação de topologias de rede focadas em segurança cibernética e alta disponibilidade.",
                image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?auto=format&fit=crop&q=80&w=800",
                tag: "Redes"
              },
              {
                title: "Bot de Atendimento IA",
                desc: "Chatbot inteligente para auxiliar novos alunos com informações sobre o curso e a escola.",
                image: "https://images.unsplash.com/photo-1531746790731-6c087fecd05a?auto=format&fit=crop&q=80&w=800",
                tag: "IA"
              }
            ].map((project, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all hover:shadow-2xl hover:shadow-blue-900/10"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute left-6 top-6">
                    <span className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold text-blue-600 backdrop-blur-sm">
                      {project.tag}
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <h4 className="mb-3 text-xl font-bold text-slate-900">{project.title}</h4>
                  <p className="text-slate-600 leading-relaxed text-sm">{project.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Contact Section --- */}
      <section id="contact" className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">Gostou da nossa turma? <br /> <span className="text-blue-600">Mande uma mensagem.</span></h2>
              <p className="mb-12 text-lg text-slate-600">
                Estamos abertos a parcerias, estágios e troca de experiências. Entre em contato com a equipe do 3º ano de Informática.
              </p>
              
              <div className="space-y-6">
                {[
                  { icon: MapPin, text: 'R. Pref. Pedro Reinaldo Galvão, 1 - Bela Vista, Bela Cruz - CE' },
                  { icon: Mail, text: 'informaticajuliofranca@gmail.com' },
                  { icon: Phone, text: '(88) 3663-1234' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-blue-600">
                      <item.icon size={20} />
                    </div>
                    <span className="font-medium text-slate-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative rounded-[2.5rem] bg-slate-50 p-8 md:p-12 lg:p-16"
            >
              <form onSubmit={handleSubmit(onContactSubmit)} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nome Completo</label>
                    <input 
                      {...register('name')}
                      className={cn(
                        "w-full rounded-2xl border-2 border-transparent bg-white px-5 py-4 transition-all focus:border-blue-600 focus:outline-none focus:ring-0",
                        errors.name && "border-red-500"
                      )}
                      placeholder="Seu nome"
                    />
                    {errors.name && <span className="text-xs font-semibold text-red-500">{errors.name.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Seu Melhor Email</label>
                    <input 
                      {...register('email')}
                      className={cn(
                        "w-full rounded-2xl border-2 border-transparent bg-white px-5 py-4 transition-all focus:border-blue-600 focus:outline-none focus:ring-0",
                        errors.email && "border-red-500"
                      )}
                      placeholder="email@exemplo.com"
                    />
                    {errors.email && <span className="text-xs font-semibold text-red-500">{errors.email.message}</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Assunto</label>
                  <input 
                    {...register('subject')}
                    className={cn(
                      "w-full rounded-2xl border-2 border-transparent bg-white px-5 py-4 transition-all focus:border-blue-600 focus:outline-none focus:ring-0",
                      errors.subject && "border-red-500"
                    )}
                    placeholder="Como podemos ajudar?"
                  />
                  {errors.subject && <span className="text-xs font-semibold text-red-500">{errors.subject.message}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mensagem</label>
                  <textarea 
                    {...register('message')}
                    rows={4}
                    className={cn(
                      "w-full resize-none rounded-2xl border-2 border-transparent bg-white px-5 py-4 transition-all focus:border-blue-600 focus:outline-none focus:ring-0",
                      errors.message && "border-red-500"
                    )}
                    placeholder="Sua mensagem detalhada aqui..."
                  />
                  {errors.message && <span className="text-xs font-semibold text-red-500">{errors.message.message}</span>}
                </div>

                <button 
                  disabled={contactStatus === 'loading'}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 font-bold text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 disabled:opacity-70 active:scale-[0.98]"
                >
                  {contactStatus === 'loading' ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Send size={20} />
                      Enviar Mensagem
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {contactStatus === 'success' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700"
                    >
                      <CheckCircle2 size={18} />
                      Mensagem enviada com sucesso!
                    </motion.div>
                  )}
                  {contactStatus === 'error' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700"
                    >
                      <XCircle size={18} />
                      Ocorreu um erro ao enviar. Tente novamente.
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white">
                  <Code size={16} />
                </div>
                <span className="text-lg font-bold">EEEP Júlio França</span>
              </div>
              <p className="text-sm text-slate-500">Desenvolvido com dedicação pelos alunos do 3º ano de Informática.</p>
            </div>
            
            <div className="flex gap-8">
              {['Instagram', 'Facebook', 'LinkedIn', 'YouTube'].map((social) => (
                <a key={social} href="#" className="text-sm font-semibold text-slate-600 hover:text-blue-600">{social}</a>
              ))}
            </div>
          </div>
          
          <div className="mt-12 border-t border-slate-100 pt-8 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
            © {new Date().getFullYear()} EEEP Júlio França - Informática. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
