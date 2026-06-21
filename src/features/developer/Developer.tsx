import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui';
import { Code2, Globe, Mail, Phone, MapPin, Compass, ExternalLink } from 'lucide-react';

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
    <div className="space-y-6 flex flex-col items-center justify-center min-h-[75vh]">
      {/* Page Title Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight flex items-center justify-center gap-2">
          <Code2 className="h-5.5 w-5.5 text-primary" />
          {t('nav.developer')}
        </h1>
        <p className="text-[11px] text-muted-foreground mt-1">Creator of BudgetBuddy Student</p>
      </div>

      {/* Main Developer Info Card */}
      <Card className="w-full max-w-md bg-card/70 backdrop-blur-md border border-border/60 p-6 flex flex-col items-center shadow-xl relative overflow-hidden">
        
        {/* Watermark Logo Background */}
        <img
          src="/budget-buddy.svg"
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-[0.06] pointer-events-none z-0 select-none transform -rotate-12"
        />

        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Avatar Image with pulse backdrop */}
          <div className="relative mb-5 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-violet-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
            <img
              src="/developer.jpg"
              alt="Joyonto Karmakar"
              className="relative h-28 w-28 rounded-full object-cover border-4 border-card shadow-lg transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>

          {/* Name and Designation */}
          <h2 className="text-lg font-bold tracking-tight">Joyonto Karmakar</h2>
          <p className="text-xs font-semibold text-primary mt-1 uppercase tracking-wider">Full-Stack Web Developer</p>
          
          {/* Meta Stats */}
          <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground font-semibold">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> Chemnitz, Germany
            </span>
            <span className="flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 text-primary shrink-0" /> Bangladesh
            </span>
          </div>

          <hr className="w-full border-border/40 my-4.5" />

          {/* Short Bio */}
          <div className="text-center text-xs leading-relaxed text-muted-foreground/90 space-y-2.5 px-2">
            <p>
              Full-Stack Web Developer with 5+ years of experience building high-performance web applications. Specializing in JavaScript, TypeScript, Vue.js, and React.js.
            </p>
            <p>
              Currently pursuing an MSc in Automotive Software Engineering at Technische Universität Chemnitz, Germany.
            </p>
          </div>

          {/* Call to action (Portfolio website) */}
          <a
            href="https://joyontokarmakar.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-6 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all active:scale-[0.98] group"
          >
            <Globe className="h-4 w-4" />
            Visit Portfolio & CV
            <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          {/* Secondary Compact Quick Contact Links */}
          <div className="flex items-center justify-center gap-2 mt-4.5 w-full">
            <a
              href="mailto:joyonto.karmakar.cse@gmail.com"
              title="Email Joyonto"
              className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/80 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
            </a>

            <a
              href="https://github.com/Joyontokarmakar"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub Profile"
              className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/80 transition-colors text-muted-foreground hover:text-foreground"
            >
              <GithubIcon className="h-4 w-4" />
            </a>

            <a
              href="tel:+491631739855"
              title="Call Phone"
              className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 hover:bg-secondary hover:border-border/80 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
};
