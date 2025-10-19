import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface UserBioCardProps {
  name: string;
  email: string;
  role: string;
  organization: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
  bio?: string;
  skills?: string[];
  joinDate?: string;
  onEdit?: () => void;
  onMessage?: () => void;
}

export function UserBioCard({
  name,
  email,
  role,
  organization,
  avatar,
  status = 'offline',
  bio,
  skills = [],
  joinDate,
  onEdit,
  onMessage
}: UserBioCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'offline': return 'Offline';
      default: return 'Offline';
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              {avatar ? (
                <img src={avatar} alt={name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(status)}`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">{name}</h3>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {role}
              </Badge>
              <span className="text-xs text-muted-foreground">{getStatusText(status)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {organization && (
          <div>
            <p className="text-sm font-medium text-foreground">Organization</p>
            <p className="text-sm text-muted-foreground">{organization}</p>
          </div>
        )}
        
        {bio && (
          <div>
            <p className="text-sm font-medium text-foreground">Bio</p>
            <p className="text-sm text-muted-foreground">{bio}</p>
          </div>
        )}
        
        {skills.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Skills</p>
            <div className="flex flex-wrap gap-1">
              {skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {joinDate && (
          <div>
            <p className="text-sm font-medium text-foreground">Member since</p>
            <p className="text-sm text-muted-foreground">{joinDate}</p>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          {onMessage && (
            <Button size="sm" className="flex-1">
              Message
            </Button>
          )}
          {onEdit && (
            <Button size="sm" variant="outline" className="flex-1">
              Edit Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
