import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  display_name?: string;
  avatar_url?: string;
}

interface UserAvatarProps {
  size?: number;
  showName?: boolean;
  className?: string;
}

export function UserAvatar({ size = 32, showName = false, className = "" }: UserAvatarProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Since no profiles table exists, we'll use auth metadata directly
    if (user) {
      setProfile({
        display_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url
      });
    }
    setLoading(false);
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Skeleton className={`rounded-full`} style={{ width: size, height: size }} />
        {showName && <Skeleton className="h-4 w-28 rounded" />}
      </div>
    );
  }

  // Determine display name priority
  const displayName = 
    profile?.display_name || 
    user.user_metadata?.full_name || 
    user.email || 
    'Utilisateur';

  // Determine avatar URL priority
  const avatarUrl = 
    profile?.avatar_url || 
    user.user_metadata?.avatar_url;

  // Generate initials fallback
  const initials = displayName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Avatar style={{ width: size, height: size }}>
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback className="bg-gradient-lagoon text-white text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showName && (
        <span className="hidden md:inline max-w-[140px] truncate text-sm font-medium">
          {displayName}
        </span>
      )}
    </div>
  );
}