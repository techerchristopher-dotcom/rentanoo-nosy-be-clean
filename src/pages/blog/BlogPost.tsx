import React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Tag } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import { SeoPageShell } from "@/components/seo/SeoPageLayout";
import { getBlogPost, BLOG_POSTS } from "@/data/blogPosts";

function renderInline(text: string, keyBase: string | number): React.ReactNode[] {
  // Découpe le texte en alternant texte brut / liens [label](url) / gras **texte**
  const tokens: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[1] && match[2]) {
      tokens.push(
        <a
          key={`${keyBase}-${idx++}`}
          href={match[2]}
          className="text-primary underline hover:no-underline"
        >
          {match[1]}
        </a>
      );
    } else if (match[3]) {
      tokens.push(<strong key={`${keyBase}-${idx++}`}>{match[3]}</strong>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-lg font-semibold mt-6 mb-2 tracking-tight">{renderInline(line.slice(4), i)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-bold mt-8 mb-3 tracking-tight">{renderInline(line.slice(3), i)}</h2>);
    } else if (line.startsWith("# ")) {
      // H1 ignoré dans le contenu — le titre est déjà affiché via post.title
      // (cas des exports markdown bruts qui répètent le titre en H1)
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={i} className="font-semibold mt-4 mb-1">{line.slice(2, -2)}</p>);
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc pl-5 space-y-1 text-muted-foreground text-sm mb-3">
          {items.map((item, idx) => <li key={idx}>{renderInline(item, `ul-${i}-${idx}`)}</li>)}
        </ul>
      );
      continue;
    } else if (line.startsWith("1. ")) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal pl-5 space-y-1 text-muted-foreground text-sm mb-3">
          {items.map((item, idx) => <li key={idx}>{renderInline(item, `ol-${i}-${idx}`)}</li>)}
        </ol>
      );
      continue;
    } else if (line.startsWith("| ")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!lines[i].includes("---")) {
          rows.push(lines[i].split("|").filter(Boolean).map(c => c.trim()));
        }
        i++;
      }
      elements.push(
        <div key={i} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            {rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? "bg-muted font-semibold" : "border-t"}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-left">{cell}</td>
                ))}
              </tr>
            ))}
          </table>
        </div>
      );
      continue;
    } else if (line.trim()) {
      elements.push(<p key={i} className="text-muted-foreground text-sm leading-relaxed mb-3">{renderInline(line, i)}</p>);
    }
    i++;
  }
  return elements;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPost(slug ?? "");

  if (!post) {
    return (
      <SeoPageShell>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Article introuvable</h1>
          <Button asChild><Link to="/blog">Retour au blog</Link></Button>
        </div>
        <Footer />
      </SeoPageShell>
    );
  }

  const related = BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 2);

  return (
    <SeoPageShell>
      <Seo
        title={post.seoTitle}
        description={post.seoDescription}
        canonical={`https://rentanoo.com/blog/${post.slug}`}
        ogImage={post.image}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.seoDescription,
          datePublished: post.date,
          author: { "@type": "Organization", name: "Rentanoo", url: "https://rentanoo.com" },
          publisher: { "@type": "Organization", name: "Rentanoo", url: "https://rentanoo.com" },
          url: `https://rentanoo.com/blog/${post.slug}`,
        }}
      />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link to="/blog"><ArrowLeft className="h-4 w-4 mr-1" /> Blog</Link>
        </Button>

        <header className="mb-8">
          {post.image && (
            <div className="aspect-[16/9] overflow-hidden rounded-xl mb-6 bg-muted/30">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{post.category}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readTime} min de lecture</span>
            <time dateTime={post.date}>{new Date(post.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</time>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-4">{post.title}</h1>
          <p className="text-muted-foreground text-base leading-relaxed">{post.excerpt}</p>
        </header>

        <article className="prose-custom">
          {renderContent(post.content)}
        </article>

        <div className="mt-12 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
          <p className="font-semibold mb-2">Prêt à explorer Nosy Be ?</p>
          <p className="text-sm text-muted-foreground mb-4">Réservez scooter, moto ou hébergement directement en ligne.</p>
          <Button asChild className="bg-primary text-white">
            <Link to="/#search-results">Voir les annonces disponibles</Link>
          </Button>
        </div>

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-bold text-lg mb-4">Articles liés</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map(r => (
                <Link key={r.slug} to={`/blog/${r.slug}`} className="group p-4 rounded-xl border hover:shadow-md transition-shadow">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">{r.category}</span>
                  <p className="font-semibold text-sm mt-1 group-hover:text-primary transition-colors">{r.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </SeoPageShell>
  );
}
