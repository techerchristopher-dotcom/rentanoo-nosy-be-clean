import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

type PhotoUploaderProps = {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  label?: string;
  disabled?: boolean;
};

export function PhotoUploader({
  onUpload,
  accept = "image/*",
  label = "Ajouter une photo",
  disabled,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <Upload className="h-4 w-4 mr-2" />
        {label}
      </Button>
    </div>
  );
}
