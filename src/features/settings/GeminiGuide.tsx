import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, ExternalLink, ShieldCheck, HelpCircle } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';

export const GeminiGuide: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-0.5">Gemini API Key Guide</h1>
          <p className="text-xs text-muted-foreground">Get a free API key to unlock receipt scanning features</p>
        </div>
      </div>

      {/* Intro Alert/Card */}
      <Card className="bg-primary/5 border border-primary/20 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <Key className="h-40 w-40 text-primary" />
        </div>
        <CardContent className="p-6 space-y-3">
          <div className="flex gap-3 items-start">
            <Key className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Why do I need a Gemini API Key?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Budget Buddy runs directly on your device to keep your financial data private.
                To scan receipt images and automatically extract item names, stores, and totals,
                the app connects directly to Google's official Gemini AI API using <strong>your own key</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step by Step Guide */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Step-by-Step Instructions</h2>

        <div className="grid grid-cols-1 gap-4">
          {/* Step 1 */}
          <div className="flex gap-4 p-5 bg-card border border-border/80 rounded-2xl relative hover:border-primary/30 transition-all duration-300 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black shrink-0 group-hover:scale-110 transition-transform">
              1
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-bold text-foreground">Go to Google AI Studio</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Google AI Studio is the developers' portal where you can generate API keys for Gemini.
                Gemini API offers a generous <strong>free tier</strong> that costs nothing.
              </p>
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mt-1"
              >
                Open Google AI Studio
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 p-5 bg-card border border-border/80 rounded-2xl relative hover:border-primary/30 transition-all duration-300 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black shrink-0 group-hover:scale-110 transition-transform">
              2
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-bold text-foreground">Sign In with Google</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Log in with your ordinary Google Account. If you don't have one, you can create it for free.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4 p-5 bg-card border border-border/80 rounded-2xl relative hover:border-primary/30 transition-all duration-300 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black shrink-0 group-hover:scale-110 transition-transform">
              3
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-bold text-foreground">Create your API Key</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click on the prominent <strong>"Create API Key"</strong> button. If prompted to choose a project, select 
                <strong> "Create API key in new project"</strong>. This sets up your key with default configurations automatically.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4 p-5 bg-card border border-border/80 rounded-2xl relative hover:border-primary/30 transition-all duration-300 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black shrink-0 group-hover:scale-110 transition-transform">
              4
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-bold text-foreground">Copy the Generated Key</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Once Google generates the API key, copy it to your clipboard. The key will start with the prefix <code>AIzaSy</code>.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4 p-5 bg-card border border-border/80 rounded-2xl relative hover:border-primary/30 transition-all duration-300 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black shrink-0 group-hover:scale-110 transition-transform">
              5
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-bold text-foreground">Paste and Save in Settings</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Go to the Settings page in Budget Buddy, paste your copied key into the <strong>"Gemini API Key"</strong> field, and save.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings')}
                className="h-8 text-xs gap-1.5 mt-1"
              >
                Go to Settings Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Security & FAQ Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Security Info */}
        <Card className="bg-card/75 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
              Is my API Key safe?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yes, absolutely. Your API key is stored locally on your device (or in your private Supabase profile, if signed in).
              The key is never sent to any third-party server other than directly to Google's official Gemini endpoint
              to fulfill OCR scan requests.
            </p>
          </CardContent>
        </Card>

        {/* Pricing Info */}
        <Card className="bg-card/75 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <HelpCircle className="h-4.5 w-4.5 text-primary" />
              Are there any costs?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No. Google AI Studio provides a free tier for developers and personal use.
              It allows up to 15 requests per minute and 1,500 requests per day, which is 
              far beyond what is needed to manage a student budget.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
