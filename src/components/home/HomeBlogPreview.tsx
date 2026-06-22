import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { BLOG_POSTS } from "@/data/blogPosts";

export function HomeBlogPreview() {
  const posts = BLOG_POSTS.slice(0, 3);

  return (
    <section className="py-12 border-t bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Blog</p>
            <h2 className="text-xl font-bold text-foreground">Guides & conseils pour Nosy Be</h2>
          </div>
          <Link
            to="/blog"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Tous les articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
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
              <div className="p-5 flex flex-col gap-2 flex-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {post.category}
                </span>
                <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {post.readTime} min
                  </span>
                  <span className="flex items-center gap-1 text-primary font-medium">
                    Lire <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Voir tous les articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
