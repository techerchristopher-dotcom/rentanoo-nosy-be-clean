import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Seo } from "@/components/seo/Seo";
import { SeoPageHero, SeoPageShell } from "@/components/seo/SeoPageLayout";
import { BLOG_POSTS } from "@/data/blogPosts";

export default function BlogIndex() {
  return (
    <SeoPageShell>
      <Seo
        title="Blog Rentanoo — Guide voyage Nosy Be, Madagascar"
        description="Conseils pratiques, itinéraires et guides pour préparer votre séjour à Nosy Be. Location scooter, hébergements, plages, activités."
        canonical="https://rentanoo.com/blog"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Blog Rentanoo",
          url: "https://rentanoo.com/blog",
          description: "Guide voyage Nosy Be — conseils, itinéraires et bonnes adresses",
          publisher: { "@type": "Organization", name: "Rentanoo", url: "https://rentanoo.com" },
        }}
      />

      <SeoPageHero
        theme="exchange"
        eyebrow="Blog · Nosy Be, Madagascar"
        title="Guide voyage Nosy Be"
        intro="Conseils pratiques, itinéraires et bonnes adresses pour préparer votre séjour à Nosy Be."
      />

      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {post.image && (
                <div className="aspect-[16/9] overflow-hidden bg-muted/30">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
              <div className="p-5 flex flex-col gap-3 flex-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">{post.category}</span>
                <h2 className="font-bold text-base leading-snug group-hover:text-primary transition-colors">{post.title}</h2>
                <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime} min</span>
                  <span className="flex items-center gap-1 text-primary font-medium">Lire <ArrowRight className="h-3 w-3" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </SeoPageShell>
  );
}
