import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ArrowLeft, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/sections/FooterSection';
import { PublicBlogExcerpt } from '@/types/blog';

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [post, setPost] = useState<PublicBlogExcerpt | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog/${slug}`);
        if (!res.ok) {
          throw new Error('Case study not found');
        }
        const data = await res.json();
        if (isMounted) {
          setPost(data);
          document.title = `${data.domain} Startup Question | Neesh`;
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load post');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPost();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        Loading Case Study...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <h1 className="text-2xl font-bold mb-2">Q&A Case Study Not Found</h1>
        <p className="text-slate-400 text-sm mb-6">This interaction may not be eligible for public display.</p>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> {post.domain} Q&A Case Study
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {post.domain} Hypothesis Validation
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
              <span>Reviewed by <strong className="text-slate-200">{post.explorerDisplayName}</strong></span>
              <span>·</span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="w-3.5 h-3.5 fill-current" /> {post.founderRating} / 5 Rating
              </span>
              <span>·</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Question / Prompt */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-6 space-y-2">
            <div className="text-xs uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Founder Question
            </div>
            <p className="text-slate-200 text-base leading-relaxed whitespace-pre-line">
              {post.question}
            </p>
          </div>

          {/* Pioneer Response */}
          <div className="bg-slate-950/70 border border-emerald-900/40 rounded-2xl p-6 space-y-2">
            <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Pioneer Assessment
            </div>
            <p className="text-slate-200 text-base leading-relaxed whitespace-pre-line">
              {post.response}
            </p>
          </div>

          {/* CTA Footer */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Need feedback on your startup in {post.domain}? Get 3+ Pioneer interactions guaranteed.
            </p>
            <Link
              to="/signup"
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all whitespace-nowrap"
            >
              Post your Spark
            </Link>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
};

export default BlogPost;

