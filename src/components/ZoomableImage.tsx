import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";

type ZoomableImageProps = {
  src: string;
  alt?: string;
  className?: string; // classes de la miniature
};

export const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt = "Photo", className }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-block"
          aria-label={alt}
        >
          <img
            src={src}
            alt={alt}
            className={cn("h-20 w-20 rounded-md object-cover cursor-zoom-in", className)}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/90">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="relative overflow-auto">
          <img
            src={src}
            alt={alt}
            className="w-full h-auto object-contain rounded-md"
            style={{ maxHeight: "90vh" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};


