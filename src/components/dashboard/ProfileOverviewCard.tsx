import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Briefcase, GraduationCap, ArrowUpRight } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';

export const ProfileOverviewCard: React.FC = () => {
  const { profile } = useApp();
  const navigate = useNavigate();

  if (!profile) {
    return (
      <Card title="Profile Overview">
        <div className="py-6 text-center text-xs text-text-secondary">No data available</div>
      </Card>
    );
  }

  return (
    <Card
      title="Profile Overview"
      subtitle="Current active user profile metadata"
      headerAction={
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/profile')}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          Edit Profile
        </Button>
      }
    >
      <div className="space-y-4">
        {/* User Card Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-12 h-12 rounded-full bg-primary text-white text-base font-bold flex items-center justify-center shadow-sm flex-shrink-0">
            {profile.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-text-primary truncate">{profile.name}</h4>
            <p className="text-xs text-text-secondary truncate">{profile.email}</p>
          </div>
        </div>

        {/* Profile Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2.5 p-2 rounded-button bg-background border border-border">
            <Calendar className="w-4 h-4 text-text-secondary flex-shrink-0" />
            <div>
              <p className="text-[10px] text-text-secondary uppercase">Age / Gender</p>
              <p className="font-semibold text-text-primary">{profile.age} yrs • {profile.gender}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-button bg-background border border-border">
            <GraduationCap className="w-4 h-4 text-text-secondary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-text-secondary uppercase">Education</p>
              <p className="font-semibold text-text-primary truncate">{profile.education}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-button bg-background border border-border sm:col-span-2">
            <Briefcase className="w-4 h-4 text-text-secondary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-text-secondary uppercase">Occupation</p>
              <p className="font-semibold text-text-primary truncate">{profile.occupation}</p>
            </div>
          </div>
        </div>

        {/* Profile Completion Bar */}
        <div className="pt-2">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-text-secondary font-medium">Profile Completion</span>
            <span className="font-bold text-primary">{profile.completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${profile.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
