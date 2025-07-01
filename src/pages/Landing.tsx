import React from "react";
import { Button } from "@/components/ui/button";
import { AuthForms } from "@/components/auth/AuthForms";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Landing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  React.useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 border-b">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gradient">Shiksha Setu</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20">
          <div className="container max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tighter">
                  Answer Questions with Your Documents & Websites
                </h1>
                <p className="text-xl text-muted-foreground">
                  Upload PDFs and connect websites to create a personalized AI assistant that provides accurate,
                  contextual answers.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="gap-2">
                    <span>Start for Free</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-bounce-horizontal"
                    >
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                <AuthForms />
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A powerful RAG (Retrieval-Augmented Generation) system that connects your documents with
                state-of-the-art AI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="mb-4 bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
                    <path d="M18 14v5"></path>
                    <path d="M18 11v.01"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Upload Documents</h3>
                <p className="text-muted-foreground">
                  Upload your PDFs or add website URLs. Our system will process and index the content.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="mb-4 bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-9 9c0 3.5 3.8 8 9 9 1.1-.3 2.1-.7 3-1.2"></path>
                    <path d="M7 9h.01"></path>
                    <path d="M12 8v.01"></path>
                    <path d="M17 9h.01"></path>
                    <path d="m16 17 3.9 3.9"></path>
                    <path d="M22 22 19 19"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Ask Questions</h3>
                <p className="text-muted-foreground">
                  Ask any question related to your documents. The AI will search for relevant information.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="mb-4 bg-primary/10 w-12 h-12 flex items-center justify-center rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 13h6"></path>
                    <path d="M9 17h3"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Get Answers</h3>
                <p className="text-muted-foreground">
                  Receive accurate answers based on your content, with references to the source documents.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8">
              Sign up now and start getting accurate answers from your documents and websites.
            </p>
            <Button size="lg">Create Your Free Account</Button>
          </div>
        </section>
      </main>

      <footer className="py-6 border-t">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2025 Shiksha Setu. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Terms
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
