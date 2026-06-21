import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { Code2, Mail, Phone, MapPin, Globe, ExternalLink, Briefcase, Award, GraduationCap, Compass } from 'lucide-react';

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const Developer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Code2 className="h-6 w-6 text-primary" />
          {t('nav.developer')}
        </h1>
        <p className="text-xs text-muted-foreground">About the creator of BudgetBuddy Student</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <Card className="lg:col-span-1 bg-card/70 backdrop-blur-md border border-border/60 overflow-hidden flex flex-col items-center p-6 text-center">
          <div className="relative mb-4 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-violet-500 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
            <img
              src="/developer.jpg"
              alt="Joyonto Karmakar"
              className="relative h-32 w-32 rounded-full object-cover border-4 border-card shadow-xl transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <h2 className="text-xl font-bold tracking-tight">Joyonto Karmakar</h2>
          <p className="text-xs font-semibold text-primary mt-1 uppercase tracking-wider">Full-Stack Web Developer</p>
          <div className="space-y-1 mt-2 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1.5 justify-center">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> Lives in Chemnitz, Germany
            </p>
            <p className="flex items-center gap-1.5 justify-center">
              <Compass className="h-3.5 w-3.5 text-primary shrink-0" /> Origin: Bangladesh
            </p>
          </div>

          <hr className="w-full border-border/50 my-5" />

          {/* Social Links */}
          <div className="w-full space-y-3">
            <a
              href="https://joyontokarmakar.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 hover:bg-secondary border border-border/30 hover:border-border/80 transition-all text-xs font-semibold group"
            >
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate flex-1 text-left">joyontokarmakar.netlify.app</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
            </a>

            <a
              href="mailto:joyonto.karmakar.cse@gmail.com"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 hover:bg-secondary border border-border/30 hover:border-border/80 transition-all text-xs font-semibold group"
            >
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate flex-1 text-left">joyonto.karmakar.cse@gmail.com</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
            </a>

            <a
              href="https://github.com/Joyontokarmakar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 hover:bg-secondary border border-border/30 hover:border-border/80 transition-all text-xs font-semibold group"
            >
              <GithubIcon className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate flex-1 text-left">github.com/Joyontokarmakar</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
            </a>

            <a
              href="tel:+491631739855"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 hover:bg-secondary border border-border/30 hover:border-border/80 transition-all text-xs font-semibold group"
            >
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate flex-1 text-left">+49 1631 739855</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
            </a>
          </div>
        </Card>

        {/* Bio & Details Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Me */}
          <Card className="bg-card/45 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-muted-foreground" />
                About Me
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm text-muted-foreground leading-relaxed">
              <p>
                I am a **Full-Stack Web Developer** with **5+ years of professional experience** building scalable, high-performance web applications using JavaScript, TypeScript, Vue.js, React.js, and modern front-end frameworks.
              </p>
              <p>
                I have a proven track record of integrating complex REST & GraphQL APIs, optimizing web performance, and deploying production-ready solutions across diverse industries. I enjoy collaborating cross-functionally with designers, backend developers, and QA teams to deliver exceptional digital products on time.
              </p>
              <p>
                Currently, I am pursuing an **MSc in Automotive Software Engineering** at **Technische Universität Chemnitz, Germany**, with a growing specialization in AI/LLM integration and intelligent system development.
              </p>
            </CardContent>
          </Card>

          {/* Work Experience */}
          <Card className="bg-card/45 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-muted-foreground" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative pl-5 border-l-2 border-primary/20 space-y-1">
                <span className="absolute left-[-5px] top-[5px] w-2 h-2 rounded-full bg-primary" />
                <div className="flex justify-between items-start flex-wrap gap-1">
                  <h3 className="font-bold text-foreground text-sm">Web Developer (Full Time)</h3>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Oct 2023 - Feb 2026</span>
                </div>
                <a href="https://therapbd.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold hover:underline">
                  Therap (BD) Ltd.
                </a>
                <p className="text-xs text-muted-foreground mt-1">Built and optimized enterprise-level scalable web applications, integrating APIs and maintaining high-performance codebases.</p>
              </div>

              <div className="relative pl-5 border-l-2 border-primary/20 space-y-1">
                <span className="absolute left-[-5px] top-[5px] w-2 h-2 rounded-full bg-primary" />
                <div className="flex justify-between items-start flex-wrap gap-1">
                  <h3 className="font-bold text-foreground text-sm">Frontend Web Developer (Full Time)</h3>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Feb 2021 - Jun 2023</span>
                </div>
                <a href="http://www.jatri.co" target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold hover:underline">
                  Jatri Services Limited
                </a>
                <p className="text-xs text-muted-foreground mt-1">Engineered dynamic frontend user experiences and local routing libraries using Vue.js, Tailwind CSS, and HTML5.</p>
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="bg-card/45 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <GraduationCap className="h-4.5 w-4.5 text-muted-foreground" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative pl-5 border-l-2 border-primary/20 space-y-1">
                <span className="absolute left-[-5px] top-[5px] w-2 h-2 rounded-full bg-primary" />
                <h3 className="font-bold text-foreground text-sm">Master of Science (MSc) in Automotive Software Engineering</h3>
                <p className="text-xs text-primary font-semibold">Chemnitz University of Technology (Technische Universität Chemnitz)</p>
                <p className="text-xs text-muted-foreground mt-1">Specializing in AI/LLM integrations, automotive system design, and intelligent software development.</p>
              </div>
            </CardContent>
          </Card>

          {/* Professional Skills */}
          <Card className="bg-card/45 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-muted-foreground" />
                Technical Skills & Expertise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  'React JS', 'Vue JS', 'Nuxt JS', 'JavaScript (ES6+)', 'TypeScript',
                  'Tailwind CSS', 'SASS / CSS3', 'HTML5', 'Bootstrap',
                  'REST APIs', 'GraphQL', 'Git / GitHub', 'WordPress / Shopify'
                ].map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold text-xs transition-colors hover:bg-primary/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
